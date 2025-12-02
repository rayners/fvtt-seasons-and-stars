/**
 * Calendar JSON format validation for Seasons & Stars using JSON schemas
 */

// Schema files will be loaded dynamically from the module

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// AJV error interface for typed error handling
interface AjvError {
  keyword: string;
  instancePath: string;
  message?: string;
  params?: Record<string, unknown>;
}

// AJV validator function type
interface AjvValidateFunction {
  (data: unknown): boolean;
  errors?: AjvError[] | null;
}

// AJV instance type (using unknown but with type assertions where needed)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AjvInstance = any;

// Lazy-loaded AJV instances to avoid module resolution issues
let ajvInstance: AjvInstance = null;
let validateCalendar: AjvValidateFunction = null as unknown as AjvValidateFunction;
let validateVariants: AjvValidateFunction = null as unknown as AjvValidateFunction;
let validateCollection: AjvValidateFunction = null as unknown as AjvValidateFunction;

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
  // Valid root-level calendar properties for case-insensitive matching
  private static readonly VALID_ROOT_PROPERTIES = [
    'id',
    'translations',
    'sources',
    'year',
    'months',
    'weekdays',
    'weeks',
    'intercalary',
    'leapYear',
    'time',
    'compatibility',
    'variants',
    'worldTime',
    'seasons',
    'moons',
    'dateFormats',
    'canonicalHours',
    'events',
    'extensions',
    'baseCalendar',
    'name',
    'description',
    'author',
    'version',
  ];

  /**
   * Validate a complete calendar configuration using JSON schema
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      let validator: AjvValidateFunction;
      let schemaType: 'calendar' | 'variants' | 'collection';

      // Type assertion for calendar structure checks
      const cal = calendar as Record<string, unknown>;

      if (cal.baseCalendar && cal.variants) {
        // External variants file
        validator = validators.validateVariants;
        schemaType = 'variants';
      } else if (cal.calendars && Array.isArray(cal.calendars)) {
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
        // Convert AJV errors to our format with enhanced messages
        this.enhanceAjvErrors(validator.errors, calendar, result);
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
   * Enhance AJV errors with helpful suggestions for common mistakes
   */
  private static enhanceAjvErrors(
    ajvErrors: AjvError[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    calendar: any,
    result: ValidationResult
  ): void {
    // Group errors by path to avoid duplicate processing
    const errorsByPath = new Map<string, AjvError[]>();

    for (const error of ajvErrors) {
      const path = error.instancePath || 'root';
      if (!errorsByPath.has(path)) {
        errorsByPath.set(path, []);
      }
      const pathErrors = errorsByPath.get(path);
      if (pathErrors) {
        pathErrors.push(error);
      }
    }

    // Process each path's errors
    for (const [path, errors] of errorsByPath) {
      // Check for additionalProperties errors
      const additionalPropsErrors = errors.filter(e => e.keyword === 'additionalProperties');

      if (additionalPropsErrors.length > 0 && path === 'root') {
        // For root-level additional properties, provide enhanced error message
        const unexpectedProps = this.findUnexpectedProperties(calendar, this.VALID_ROOT_PROPERTIES);

        if (unexpectedProps.length > 0) {
          const enhancedMessage = this.createEnhancedPropertyError(unexpectedProps);
          result.errors.push(enhancedMessage);
        } else {
          // Fallback to original error if we can't find unexpected properties
          result.errors.push(`${path}: must NOT have additional properties`);
        }
      } else if (additionalPropsErrors.length > 0) {
        // For nested paths, try to identify the unexpected properties
        const pathParts = path.split('/').filter(Boolean);
        const targetObject = this.getObjectAtPath(calendar, pathParts);

        if (targetObject && typeof targetObject === 'object') {
          // Try to find valid properties for this nested object
          const validProps = this.getValidPropertiesForPath(path);

          // Only try to identify unexpected properties if we know the valid properties
          // If validProps is empty, we don't know what's valid, so fallback to generic message
          if (validProps.length > 0) {
            const unexpectedProps = this.findUnexpectedProperties(targetObject, validProps);

            if (unexpectedProps.length > 0) {
              result.errors.push(`${path}: Unexpected properties: ${unexpectedProps.join(', ')}`);
            } else {
              result.errors.push(`${path}: must NOT have additional properties`);
            }
          } else {
            // Fallback to generic message when we don't have the valid property list
            result.errors.push(`${path}: must NOT have additional properties`);
          }
        } else {
          result.errors.push(`${path}: must NOT have additional properties`);
        }
      }

      // Add other non-additionalProperties errors
      for (const error of errors) {
        if (error.keyword !== 'additionalProperties') {
          const message = error.message || 'Validation error';
          result.errors.push(`${path}: ${message}`);
        }
      }
    }
  }

  /**
   * Find unexpected properties in an object
   * A property is unexpected if:
   * 1. It doesn't match any valid property exactly (case-sensitive), OR
   * 2. It matches a valid property case-insensitively but not exactly (wrong case)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static findUnexpectedProperties(obj: any, validProps: string[]): string[] {
    if (!obj || typeof obj !== 'object') {
      return [];
    }

    const actualProps = Object.keys(obj);

    return actualProps.filter(prop => {
      // Check for exact match first (case-sensitive)
      if (validProps.includes(prop)) {
        return false; // Property is valid with correct case
      }

      // If no exact match, it's unexpected (whether it's a typo or wrong case)
      return true;
    });
  }

  /**
   * Create enhanced error message for unexpected properties
   */
  private static createEnhancedPropertyError(unexpectedProps: string[]): string {
    const suggestions: string[] = [];

    for (const prop of unexpectedProps) {
      const suggestion = this.suggestCorrectProperty(prop, this.VALID_ROOT_PROPERTIES);
      if (suggestion) {
        suggestions.push(`'${prop}' (did you mean '${suggestion}'?)`);
      } else {
        suggestions.push(`'${prop}'`);
      }
    }

    if (suggestions.length === 1) {
      return `Unexpected property at root: ${suggestions[0]}`;
    } else {
      return `Unexpected properties at root: ${suggestions.join(', ')}`;
    }
  }

  /**
   * Suggest the correct property name based on common mistakes
   */
  private static suggestCorrectProperty(prop: string, validProps: string[]): string | null {
    const propLower = prop.toLowerCase();

    // Check for exact case-insensitive match
    for (const validProp of validProps) {
      if (validProp.toLowerCase() === propLower) {
        return validProp;
      }
    }

    // Check for Levenshtein distance < 3 for typos
    let bestMatch: string | null = null;
    let bestDistance = 3;

    for (const validProp of validProps) {
      const distance = this.levenshteinDistance(propLower, validProp.toLowerCase());
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = validProp;
      }
    }

    return bestMatch;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Get object at a specific path
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static getObjectAtPath(obj: any, pathParts: string[]): any {
    let current = obj;
    for (const part of pathParts) {
      if (current && typeof current === 'object') {
        current = current[part];
      } else {
        return null;
      }
    }
    return current;
  }

  /**
   * Get valid properties for a specific path (used for nested objects)
   */
  private static getValidPropertiesForPath(path: string): string[] {
    // For common nested paths, return known valid properties
    if (path.includes('/translations/')) {
      return ['label', 'description', 'setting', 'yearName'];
    }
    if (path.includes('/year')) {
      return ['epoch', 'currentYear', 'prefix', 'suffix', 'startDay'];
    }
    if (path.includes('/leapYear')) {
      return ['rule', 'interval', 'offset', 'month', 'extraDays'];
    }
    if (path.includes('/time')) {
      return ['hoursInDay', 'minutesInHour', 'secondsInMinute'];
    }
    if (path.includes('/months/')) {
      return ['name', 'length', 'days', 'description', 'abbreviation', 'prefix', 'suffix'];
    }
    if (path.includes('/weekdays/')) {
      return ['name', 'description', 'abbreviation', 'prefix', 'suffix'];
    }
    if (path.includes('/weeks')) {
      return ['type', 'perMonth', 'daysPerWeek', 'remainderHandling', 'namingPattern', 'names'];
    }
    if (path.includes('/weeks/names/')) {
      return ['name', 'abbreviation', 'prefix', 'suffix', 'description', 'translations'];
    }

    // For unknown paths, return empty array (will fall back to generic message)
    return [];
  }

  /**
   * Fallback validation method that doesn't use JSON schemas
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        if (intercalary.before) {
          const monthExists = calendar.months.some((m: any) => m.name === intercalary.before);

          if (!monthExists) {
            result.errors.push(
              `Intercalary day ${index + 1} references non-existent month '${intercalary.before}'`
            );
          }
        }
      });
    }

    // Validate weeks configuration
    if (calendar.weeks && typeof calendar.weeks === 'object') {
      const weekType = calendar.weeks.type || 'month-based';

      // perMonth is required for month-based weeks
      if (weekType === 'month-based' && calendar.weeks.perMonth === undefined) {
        result.errors.push(
          "weeks.perMonth is required when weeks.type is 'month-based' or undefined"
        );
      }

      // perMonth must be positive if specified
      if (calendar.weeks.perMonth !== undefined && calendar.weeks.perMonth <= 0) {
        result.errors.push('weeks.perMonth must be greater than 0');
      }

      // daysPerWeek must be positive if specified
      if (calendar.weeks.daysPerWeek !== undefined && calendar.weeks.daysPerWeek <= 0) {
        result.errors.push('weeks.daysPerWeek must be greater than 0');
      }

      // Validate week names uniqueness
      if (Array.isArray(calendar.weeks.names)) {
        const weekNames = calendar.weeks.names.map(w => w.name).filter(Boolean);
        const uniqueNames = new Set(weekNames);

        if (weekNames.length !== uniqueNames.size) {
          result.errors.push('Week names must be unique');
        }
      }
    }
  }

  /**
   * Validate calendar and provide helpful error messages (synchronous version)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static isValid(calendar: any): boolean {
    return this.validateWithHelp(calendar).isValid;
  }

  /**
   * Get a list of validation errors as strings
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
