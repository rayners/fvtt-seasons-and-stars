/**
 * Calendar JSON format validation for Seasons & Stars using JSON schemas
 */

// Schema files will be loaded dynamically from the module

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Lazy-loaded AJV instances to avoid module resolution issues
let ajvInstance: any = null;
let validateCalendar: any = null;
let validateVariants: any = null;
let validateCollection: any = null;

type SourceVerificationOutcome = 'ok' | 'warning' | 'error';

interface SourceVerificationResult {
  outcome: SourceVerificationOutcome;
  message?: string;
}

async function getAjvValidators() {
  if (!ajvInstance) {
    // Dynamic import to handle different AJV versions
    const Ajv = (await import('ajv')).default;
    ajvInstance = new Ajv({ allErrors: true, verbose: true });

    try {
      const addFormats = (await import('ajv-formats')).default;
      addFormats(ajvInstance);
    } catch {
      // ajv-formats is optional
      console.warn('ajv-formats not available, some validations may be limited');
    }

    // Load schemas based on environment
    let calendarSchema, variantsSchema, collectionSchema;

    if (
      typeof window !== 'undefined' &&
      typeof game !== 'undefined' &&
      game.modules?.get('seasons-and-stars')
    ) {
      // Browser environment with FoundryVTT - use module paths
      const moduleId = 'seasons-and-stars';
      const basePath = `modules/${moduleId}/schemas`;

      [calendarSchema, variantsSchema, collectionSchema] = await Promise.all([
        fetch(`${basePath}/calendar-v1.0.0.json`).then(r => r.json()),
        fetch(`${basePath}/calendar-variants-v1.0.0.json`).then(r => r.json()),
        fetch(`${basePath}/calendar-collection-v1.0.0.json`).then(r => r.json()),
      ]);
    } else {
      // Node.js environment or test environment - use filesystem
      const fs = await import('fs');
      const path = await import('path');

      // Find the project root by looking for shared/schemas directory
      let currentDir = process.cwd();
      while (!fs.existsSync(path.join(currentDir, 'shared', 'schemas'))) {
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
          throw new Error('Could not find project root (shared/schemas not found)');
        }
        currentDir = parentDir;
      }

      const schemasDir = path.join(currentDir, 'shared', 'schemas');

      [calendarSchema, variantsSchema, collectionSchema] = await Promise.all([
        JSON.parse(fs.readFileSync(path.join(schemasDir, 'calendar-v1.0.0.json'), 'utf8')),
        JSON.parse(fs.readFileSync(path.join(schemasDir, 'calendar-variants-v1.0.0.json'), 'utf8')),
        JSON.parse(
          fs.readFileSync(path.join(schemasDir, 'calendar-collection-v1.0.0.json'), 'utf8')
        ),
      ]);
    }

    // Compile schemas
    validateCalendar = ajvInstance.compile(calendarSchema);
    validateVariants = ajvInstance.compile(variantsSchema);
    validateCollection = ajvInstance.compile(collectionSchema);
  }

  return { validateCalendar, validateVariants, validateCollection };
}

export class CalendarValidator {
  /**
   * Validate a complete calendar configuration using JSON schema
   */
  static async validate(calendar: any): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Check if input is an object
    if (!calendar || typeof calendar !== 'object') {
      result.errors.push('Calendar must be a valid object');
      result.isValid = false;
      return result;
    }

    try {
      // Get validators
      const validators = await getAjvValidators();

      // Determine schema type based on structure
      let validator: any;
      let schemaType: 'calendar' | 'variants' | 'collection';

      if (calendar.baseCalendar && calendar.variants) {
        // External variants file
        validator = validators.validateVariants;
        schemaType = 'variants';
      } else if (calendar.calendars && Array.isArray(calendar.calendars)) {
        // Collection index file
        validator = validators.validateCollection;
        schemaType = 'collection';
      } else {
        // Regular calendar file
        validator = validators.validateCalendar;
        schemaType = 'calendar';
      }

      // Run JSON schema validation
      const isValid = validator(calendar);

      if (!isValid && validator.errors) {
        // Convert AJV errors to our format
        for (const error of validator.errors) {
          const path = error.instancePath ? error.instancePath : 'root';
          const message = error.message || 'Validation error';
          result.errors.push(`${path}: ${message}`);
        }
      }

      // Add additional custom validations for calendar files
      if (schemaType === 'calendar') {
        await this.validateCalendarSpecific(calendar, result);
      } else if (schemaType === 'variants') {
        await this.validateVariantsSpecific(calendar, result);
      }

      // Add warnings for date formats
      this.validateDateFormats(calendar, result);

      result.isValid = result.errors.length === 0;
      return result;
    } catch (error) {
      // Fallback to non-schema validation if AJV fails
      console.warn('Schema validation failed, falling back to legacy validation:', error);
      const legacyResult = this.validateLegacy(calendar);
      await this.validateSourceUrls(calendar, legacyResult);
      legacyResult.isValid = legacyResult.errors.length === 0;
      return legacyResult;
    }
  }

  /**
   * Fallback validation method that doesn't use JSON schemas
   */
  private static validateLegacy(calendar: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Basic structural validation
    if (!calendar.id || typeof calendar.id !== 'string') {
      result.errors.push('Calendar must have a valid id string');
    }

    if (calendar.baseCalendar && calendar.variants) {
      // Variants file validation
      if (typeof calendar.baseCalendar !== 'string') {
        result.errors.push('baseCalendar must be a string');
      }
      if (!calendar.variants || typeof calendar.variants !== 'object') {
        result.errors.push('variants must be an object');
      }
    } else {
      // Regular calendar validation
      if (!calendar.translations || typeof calendar.translations !== 'object') {
        result.errors.push('Calendar must have translations object');
      }
      if (!Array.isArray(calendar.months)) {
        result.errors.push('Calendar must have months array');
      }
      if (!Array.isArray(calendar.weekdays)) {
        result.errors.push('Calendar must have weekdays array');
      }
    }

    this.validateDateFormats(calendar, result);
    this.validateCrossReferences(calendar, result);

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Additional calendar-specific validations not covered by JSON schema
   */
  private static async validateCalendarSpecific(
    calendar: any,
    result: ValidationResult
  ): Promise<void> {
    // Cross-reference validations for calendar files
    this.validateCrossReferences(calendar, result);
    await this.validateSourceUrls(calendar, result);
  }

  /**
   * Additional variants-specific validations not covered by JSON schema
   */
  private static async validateVariantsSpecific(
    _calendar: any,
    _result: ValidationResult
  ): Promise<void> {
    // Add any variants-specific cross-reference validations here
    // Currently, the JSON schema handles most validation
  }

  // Note: Most validation is now handled by JSON schemas above

  /**
   * Validate date formats and enforce reasonable limits
   *
   * Design Decision: Limit date formats to prevent memory issues
   *
   * Rationale:
   * - Real-world calendars use 10-25 date formats maximum
   * - Template cache in DateFormatter has no runtime limits for performance
   * - Better to prevent excessive formats at source than manage complex cache eviction
   * - Foundry sessions last 2-4 hours then browser refresh clears cache anyway
   */
  private static validateDateFormats(calendar: any, result: ValidationResult): void {
    if (!calendar.dateFormats || typeof calendar.dateFormats !== 'object') {
      return; // dateFormats is optional
    }

    const dateFormats = calendar.dateFormats;
    let totalFormatCount = 0;
    const maxFormats = 100; // Generous limit - real calendars use ~25 max

    // Count top-level formats
    for (const [key, value] of Object.entries(dateFormats)) {
      if (key === 'widgets') {
        // Handle widgets separately
        if (typeof value === 'object' && value !== null) {
          const widgetCount = Object.keys(value).length;
          totalFormatCount += widgetCount;

          if (widgetCount > 20) {
            result.warnings.push(
              `Widget formats (${widgetCount}) should be limited for performance (recommended max: 20)`
            );
          }
        }
      } else if (typeof value === 'string') {
        // Simple format
        totalFormatCount += 1;
      } else if (typeof value === 'object' && value !== null) {
        // Variant format object
        const variantCount = Object.keys(value).length;
        totalFormatCount += variantCount;

        if (variantCount > 30) {
          result.warnings.push(
            `Format variants for '${key}' (${variantCount}) should be limited for performance (recommended max: 30)`
          );
        }
      }
    }

    // Check total count
    if (totalFormatCount > maxFormats) {
      result.warnings.push(
        `Total date formats (${totalFormatCount}) exceeds recommended limit (${maxFormats}). ` +
          `Consider reducing formats to prevent potential memory issues. ` +
          `Real-world calendars typically use 10-25 formats.`
      );
    } else if (totalFormatCount > 50) {
      result.warnings.push(
        `High number of date formats (${totalFormatCount}). ` +
          `Consider if all formats are necessary for optimal performance.`
      );
    }

    // Log for debugging/monitoring - only warn for excessive format counts
    if (totalFormatCount > 100) {
      result.warnings.push(
        `Calendar defines ${totalFormatCount} date formats (consider reducing for performance)`
      );
    }
  }

  // Note: Constraints are now validated by JSON schemas

  /**
   * Validate cross-references between fields
   */
  private static validateCrossReferences(calendar: any, result: ValidationResult): void {
    // Check for unique month names
    if (Array.isArray(calendar.months)) {
      const monthNames = calendar.months.map((m: any) => m.name).filter(Boolean);
      const uniqueNames = new Set(monthNames);

      if (monthNames.length !== uniqueNames.size) {
        result.errors.push('Month names must be unique');
      }
    }

    // Check for unique weekday names
    if (Array.isArray(calendar.weekdays)) {
      const weekdayNames = calendar.weekdays.map((w: any) => w.name).filter(Boolean);
      const uniqueNames = new Set(weekdayNames);

      if (weekdayNames.length !== uniqueNames.size) {
        result.errors.push('Weekday names must be unique');
      }
    }

    // Validate leap year month reference
    if (calendar.leapYear?.month && Array.isArray(calendar.months)) {
      const monthExists = calendar.months.some((m: any) => m.name === calendar.leapYear.month);

      if (!monthExists) {
        result.errors.push(
          `Leap year month '${calendar.leapYear.month}' does not exist in months list`
        );
      } else if (calendar.leapYear.extraDays !== undefined) {
        // Validate that negative leap days don't reduce month below 1 day
        const targetMonth = calendar.months.find((m: any) => m.name === calendar.leapYear.month);
        if (targetMonth && calendar.leapYear.extraDays < 0) {
          const adjustedDays = targetMonth.days + calendar.leapYear.extraDays;
          if (adjustedDays < 1) {
            result.warnings.push(
              `Leap year adjustment of ${calendar.leapYear.extraDays} days would reduce '${
                calendar.leapYear.month
              }' to ${adjustedDays} days (will be clamped to 1 day minimum)`
            );
          }
        }
      }
    }

    // Validate intercalary day references
    if (Array.isArray(calendar.intercalary) && Array.isArray(calendar.months)) {
      calendar.intercalary.forEach((intercalary: any, index: number) => {
        if (intercalary.after) {
          const monthExists = calendar.months.some((m: any) => m.name === intercalary.after);

          if (!monthExists) {
            result.errors.push(
              `Intercalary day ${index + 1} references non-existent month '${intercalary.after}'`
            );
          }
        }
      });
    }
  }

  /**
   * Validate calendar and provide helpful error messages (synchronous version)
   */
  static validateWithHelp(calendar: any): ValidationResult {
    // Use legacy validation for synchronous operation
    const result = this.validateLegacy(calendar);

    // Only warn for potential problems, not normal configurations
    // These are optional fields with sensible defaults and shouldn't trigger warnings

    // Only warn for critical missing fields that could cause functionality issues
    // Month abbreviations are optional and have automatic fallbacks

    return result;
  }

  /**
   * Quick validation for just checking if calendar is loadable
   */
  static isValid(calendar: any): boolean {
    return this.validateWithHelp(calendar).isValid;
  }

  /**
   * Get a list of validation errors as strings
   */
  static getErrors(calendar: any): string[] {
    return this.validateWithHelp(calendar).errors;
  }

  private static shouldVerifySources(): boolean {
    const envOverride =
      typeof process !== 'undefined' ? process.env?.SEASONS_AND_STARS_VALIDATE_SOURCES : undefined;

    if (envOverride === 'true') {
      return true;
    }

    if (envOverride === 'false') {
      return false;
    }

    if (typeof window !== 'undefined') {
      return false;
    }

    return typeof process !== 'undefined' && typeof process.versions?.node === 'string';
  }

  private static async validateSourceUrls(calendar: any, result: ValidationResult): Promise<void> {
    if (!this.shouldVerifySources()) {
      return;
    }

    if (!Array.isArray(calendar.sources) || calendar.sources.length === 0) {
      return;
    }

    const urlSources = calendar.sources
      .map((source: any, index: number) => ({ source, index }))
      .filter(
        (entry): entry is { source: string; index: number } => typeof entry.source === 'string'
      );

    if (urlSources.length === 0) {
      return;
    }

    const failures: { index: number; url: string; message: string }[] = [];
    const warningsToRecord: { index: number; url: string; message: string }[] = [];

    for (const { source, index } of urlSources) {
      const verification = await this.verifySourceUrl(source);

      if (verification.outcome === 'error') {
        const message = verification.message || 'Unknown error verifying URL';
        failures.push({ index, url: source, message });
      } else if (verification.outcome === 'warning' && verification.message) {
        warningsToRecord.push({ index, url: source, message: verification.message });
      }
    }

    failures.forEach(failure => {
      result.errors.push(
        `sources[${failure.index}]: Unable to verify URL '${failure.url}' (${failure.message})`
      );
    });

    warningsToRecord.forEach(warning => {
      result.warnings.push(
        `sources[${warning.index}]: Unable to confirm URL '${warning.url}' (${warning.message})`
      );
    });
  }

  private static async verifySourceUrl(url: string): Promise<SourceVerificationResult> {
    const requestInit: RequestInit = {
      method: 'HEAD',
      redirect: 'follow',
    };

    const signal = this.createTimeoutSignal(10000);
    if (signal) {
      requestInit.signal = signal;
    }

    try {
      const response = await fetch(url, requestInit);

      if (response.status >= 200 && response.status < 400) {
        return { outcome: 'ok' };
      }

      if (response.status === 405 || response.status === 501) {
        return { outcome: 'warning', message: `HTTP status ${response.status}` };
      }

      return { outcome: 'error', message: `HTTP status ${response.status}` };
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return { outcome: 'warning', message: 'request timed out' };
      }
      return { outcome: 'warning', message: error?.message || 'network error' };
    }
  }

  private static createTimeoutSignal(timeoutMs: number): AbortSignal | undefined {
    if (typeof AbortController === 'undefined') {
      return undefined;
    }

    if (typeof AbortSignal !== 'undefined' && typeof (AbortSignal as any).timeout === 'function') {
      return (AbortSignal as any).timeout(timeoutMs);
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
    if (typeof (timeoutHandle as any).unref === 'function') {
      (timeoutHandle as any).unref();
    }
    return controller.signal;
  }
}
