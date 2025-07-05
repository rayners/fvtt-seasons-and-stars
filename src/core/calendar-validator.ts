/**
 * Calendar JSON format validation for Seasons & Stars
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class CalendarValidator {
  /**
   * Validate a complete calendar configuration
   */
  static validate(calendar: any): ValidationResult {
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

    // Validate required root fields
    this.validateRequiredFields(calendar, result);

    // Validate data types and constraints
    if (result.errors.length === 0) {
      this.validateDataTypes(calendar, result);
      this.validateConstraints(calendar, result);
      this.validateDateFormats(calendar, result);
      this.validateCrossReferences(calendar, result);
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate required fields are present
   */
  private static validateRequiredFields(calendar: any, result: ValidationResult): void {
    // Check if this is an external variant file
    const isExternalVariant = calendar.baseCalendar && calendar.variants;

    let requiredFields: string[];
    if (isExternalVariant) {
      // External variant files need different required fields
      requiredFields = ['id', 'baseCalendar', 'variants'];
    } else {
      // Regular calendar files need the full structure
      requiredFields = ['id', 'translations', 'months', 'weekdays'];
    }

    for (const field of requiredFields) {
      if (!(field in calendar)) {
        result.errors.push(`Missing required field: ${field}`);
      }
    }

    // Check required fields in nested objects (only for regular calendars)
    if (calendar.months) {
      calendar.months.forEach((month: any, index: number) => {
        if (!month.name) {
          result.errors.push(`Month ${index + 1} missing required field: name`);
        }
        if (typeof month.days !== 'number') {
          result.errors.push(`Month ${index + 1} missing required field: days`);
        }
      });
    }

    if (calendar.weekdays) {
      calendar.weekdays.forEach((weekday: any, index: number) => {
        if (!weekday.name) {
          result.errors.push(`Weekday ${index + 1} missing required field: name`);
        }
      });
    }

    // Validate external variant structure
    if (calendar.baseCalendar) {
      if (typeof calendar.baseCalendar !== 'string' || calendar.baseCalendar.trim() === '') {
        result.errors.push('baseCalendar must be a non-empty string');
      }
    }

    if (calendar.variants) {
      if (typeof calendar.variants !== 'object') {
        result.errors.push('Variants must be an object');
      } else {
        const variantKeys = Object.keys(calendar.variants);
        if (variantKeys.length === 0) {
          result.errors.push('Variants object must contain at least one variant');
        }

        // Validate each variant
        for (const [variantId, variant] of Object.entries(calendar.variants)) {
          if (typeof variant !== 'object') {
            result.errors.push(`Variant '${variantId}' must be an object`);
            continue;
          }

          const v = variant as any;
          if (!v.name || typeof v.name !== 'string') {
            result.errors.push(`Variant '${variantId}' missing required field: name`);
          }
        }
      }
    }

    if (calendar.intercalary) {
      calendar.intercalary.forEach((intercalary: any, index: number) => {
        if (!intercalary.name) {
          result.errors.push(`Intercalary day ${index + 1} missing required field: name`);
        }
        if (!intercalary.after) {
          result.errors.push(`Intercalary day ${index + 1} missing required field: after`);
        }
      });
    }
  }

  /**
   * Validate data types
   */
  private static validateDataTypes(calendar: any, result: ValidationResult): void {
    // Check if this is an external variant file
    const isExternalVariant = calendar.baseCalendar && calendar.variants;

    // Validate ID
    if (typeof calendar.id !== 'string') {
      result.errors.push('Calendar ID must be a string');
    }

    // Validate translations structure (optional for external variants)
    if (calendar.translations) {
      if (typeof calendar.translations !== 'object') {
        result.errors.push('Calendar translations must be an object');
      } else {
        // Check that there's at least one translation
        const languages = Object.keys(calendar.translations);
        if (languages.length === 0) {
          result.errors.push('Calendar must have at least one translation');
        }

        // Validate each translation
        for (const [lang, translation] of Object.entries(calendar.translations)) {
          if (typeof translation !== 'object') {
            result.errors.push(`Translation for language '${lang}' must be an object`);
            continue;
          }

          const trans = translation as any;
          if (!trans.label || typeof trans.label !== 'string') {
            result.errors.push(`Translation for language '${lang}' missing required label`);
          }
        }
      }
    } else if (!isExternalVariant) {
      // Regular calendars require translations, external variants don't
      result.errors.push('Calendar must have translations');
    }

    // Validate year configuration
    if (calendar.year) {
      this.validateYearConfig(calendar.year, result);
    }

    // Validate leap year configuration
    if (calendar.leapYear) {
      this.validateLeapYearConfig(calendar.leapYear, result);
    }

    // Validate arrays (skip for external variants since they reference base calendar)
    if (!isExternalVariant) {
      if (!Array.isArray(calendar.months)) {
        result.errors.push('Months must be an array');
      }

      if (!Array.isArray(calendar.weekdays)) {
        result.errors.push('Weekdays must be an array');
      }
    }

    if (calendar.intercalary && !Array.isArray(calendar.intercalary)) {
      result.errors.push('Intercalary days must be an array');
    }

    // Validate time configuration
    if (calendar.time) {
      this.validateTimeConfig(calendar.time, result);
    }

    // Validate moons configuration
    if (calendar.moons) {
      this.validateMoonsConfig(calendar.moons, result);
    }
  }

  /**
   * Validate year configuration
   */
  private static validateYearConfig(year: any, result: ValidationResult): void {
    if (typeof year !== 'object') {
      result.errors.push('Year configuration must be an object');
      return;
    }

    if (year.epoch !== undefined && typeof year.epoch !== 'number') {
      result.errors.push('Year epoch must be a number');
    }

    if (year.currentYear !== undefined && typeof year.currentYear !== 'number') {
      result.errors.push('Year currentYear must be a number');
    }

    if (year.prefix !== undefined && typeof year.prefix !== 'string') {
      result.errors.push('Year prefix must be a string');
    }

    if (year.suffix !== undefined && typeof year.suffix !== 'string') {
      result.errors.push('Year suffix must be a string');
    }

    if (year.startDay !== undefined && typeof year.startDay !== 'number') {
      result.errors.push('Year startDay must be a number');
    }
  }

  /**
   * Validate leap year configuration
   */
  private static validateLeapYearConfig(leapYear: any, result: ValidationResult): void {
    if (typeof leapYear !== 'object') {
      result.errors.push('Leap year configuration must be an object');
      return;
    }

    const validRules = ['none', 'gregorian', 'custom'];
    if (leapYear.rule && !validRules.includes(leapYear.rule)) {
      result.errors.push(`Leap year rule must be one of: ${validRules.join(', ')}`);
    }

    if (leapYear.interval !== undefined && typeof leapYear.interval !== 'number') {
      result.errors.push('Leap year interval must be a number');
    }

    if (leapYear.month !== undefined && typeof leapYear.month !== 'string') {
      result.errors.push('Leap year month must be a string');
    }

    if (leapYear.extraDays !== undefined && typeof leapYear.extraDays !== 'number') {
      result.errors.push('Leap year extraDays must be a number');
    }
  }

  /**
   * Validate time configuration
   */
  private static validateTimeConfig(time: any, result: ValidationResult): void {
    if (typeof time !== 'object') {
      result.errors.push('Time configuration must be an object');
      return;
    }

    if (time.hoursInDay !== undefined && typeof time.hoursInDay !== 'number') {
      result.errors.push('Time hoursInDay must be a number');
    }

    if (time.minutesInHour !== undefined && typeof time.minutesInHour !== 'number') {
      result.errors.push('Time minutesInHour must be a number');
    }

    if (time.secondsInMinute !== undefined && typeof time.secondsInMinute !== 'number') {
      result.errors.push('Time secondsInMinute must be a number');
    }
  }

  /**
   * Validate moons configuration
   */
  private static validateMoonsConfig(moons: any, result: ValidationResult): void {
    if (!Array.isArray(moons)) {
      result.errors.push('Moons configuration must be an array');
      return;
    }

    moons.forEach((moon: any, index: number) => {
      const moonIndex = index + 1;

      // Validate required fields
      if (!moon.name || typeof moon.name !== 'string') {
        result.errors.push(`Moon ${moonIndex} missing required field: name`);
      }

      if (typeof moon.cycleLength !== 'number') {
        result.errors.push(`Moon ${moonIndex} missing required field: cycleLength`);
      } else if (moon.cycleLength <= 0) {
        result.errors.push(`Moon ${moonIndex} cycleLength must be positive`);
      }

      if (!moon.firstNewMoon || typeof moon.firstNewMoon !== 'object') {
        result.errors.push(`Moon ${moonIndex} missing required field: firstNewMoon`);
      } else {
        // Validate firstNewMoon structure
        const firstNewMoon = moon.firstNewMoon;
        if (typeof firstNewMoon.year !== 'number') {
          result.errors.push(`Moon ${moonIndex} firstNewMoon.year must be a number`);
        }
        if (typeof firstNewMoon.month !== 'number') {
          result.errors.push(`Moon ${moonIndex} firstNewMoon.month must be a number`);
        }
        if (typeof firstNewMoon.day !== 'number') {
          result.errors.push(`Moon ${moonIndex} firstNewMoon.day must be a number`);
        }
      }

      if (!Array.isArray(moon.phases)) {
        result.errors.push(`Moon ${moonIndex} missing required field: phases`);
      } else {
        // Validate phases array
        if (moon.phases.length === 0) {
          result.errors.push(`Moon ${moonIndex} must have at least one phase`);
        }

        let totalPhaseLength = 0;
        moon.phases.forEach((phase: any, phaseIndex: number) => {
          const phaseRef = `Moon ${moonIndex} phase ${phaseIndex + 1}`;

          if (!phase.name || typeof phase.name !== 'string') {
            result.errors.push(`${phaseRef} missing required field: name`);
          }

          if (typeof phase.length !== 'number') {
            result.errors.push(`${phaseRef} missing required field: length`);
          } else if (phase.length <= 0) {
            result.errors.push(`${phaseRef} length must be positive`);
          } else {
            totalPhaseLength += phase.length;
          }

          if (typeof phase.singleDay !== 'boolean') {
            result.errors.push(`${phaseRef} missing required field: singleDay`);
          }

          if (!phase.icon || typeof phase.icon !== 'string') {
            result.errors.push(`${phaseRef} missing required field: icon`);
          }
        });

        // Validate that phase lengths sum to cycle length
        if (
          typeof moon.cycleLength === 'number' &&
          Math.abs(totalPhaseLength - moon.cycleLength) > 0.001
        ) {
          result.errors.push(
            `Moon ${moonIndex} phase lengths (${totalPhaseLength}) don't equal cycle length (${moon.cycleLength})`
          );
        }
      }

      // Validate optional color field (hex format)
      if (moon.color !== undefined) {
        if (typeof moon.color !== 'string') {
          result.errors.push(`Moon ${moonIndex} color must be a string`);
        } else if (!/^#[0-9A-Fa-f]{6}$/.test(moon.color)) {
          result.errors.push(`Moon ${moonIndex} color must be a valid hex color (e.g., "#ffffff")`);
        }
      }
    });
  }

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

    // Log for debugging/monitoring
    if (totalFormatCount > 0) {
      result.warnings.push(`Calendar defines ${totalFormatCount} date formats`);
    }
  }

  /**
   * Validate data constraints and ranges
   */
  private static validateConstraints(calendar: any, result: ValidationResult): void {
    // Check if this is an external variant file
    const isExternalVariant = calendar.baseCalendar && calendar.variants;

    // Validate ID format
    if (calendar.id && !/^[a-zA-Z0-9_-]+$/.test(calendar.id)) {
      result.errors.push(
        'Calendar ID must contain only alphanumeric characters, hyphens, and underscores'
      );
    }

    // Validate months (skip for external variants)
    if (!isExternalVariant && Array.isArray(calendar.months)) {
      if (calendar.months.length === 0) {
        result.errors.push('Calendar must have at least one month');
      }

      calendar.months.forEach((month: any, index: number) => {
        if (typeof month.days === 'number') {
          if (month.days < 1 || month.days > 366) {
            result.errors.push(`Month ${index + 1} days must be between 1 and 366`);
          }
        }
      });
    }

    // Validate weekdays (skip for external variants)
    if (!isExternalVariant && Array.isArray(calendar.weekdays)) {
      if (calendar.weekdays.length === 0) {
        result.errors.push('Calendar must have at least one weekday');
      }
    }

    // Validate year constraints
    if (calendar.year?.startDay !== undefined && Array.isArray(calendar.weekdays)) {
      if (calendar.year.startDay < 0 || calendar.year.startDay >= calendar.weekdays.length) {
        result.errors.push(`Year startDay must be between 0 and ${calendar.weekdays.length - 1}`);
      }
    }

    // Validate time constraints
    if (calendar.time) {
      if (calendar.time.hoursInDay !== undefined && calendar.time.hoursInDay < 1) {
        result.errors.push('Time hoursInDay must be at least 1');
      }

      if (calendar.time.minutesInHour !== undefined && calendar.time.minutesInHour < 1) {
        result.errors.push('Time minutesInHour must be at least 1');
      }

      if (calendar.time.secondsInMinute !== undefined && calendar.time.secondsInMinute < 1) {
        result.errors.push('Time secondsInMinute must be at least 1');
      }
    }

    // Validate leap year constraints
    if (calendar.leapYear?.rule === 'custom' && calendar.leapYear?.interval !== undefined) {
      if (calendar.leapYear.interval < 1) {
        result.errors.push('Leap year interval must be at least 1');
      }
    }
  }

  /**
   * Validate cross-references between fields
   */
  private static validateCrossReferences(calendar: any, result: ValidationResult): void {
    // Check if this is an external variant file
    const isExternalVariant = calendar.baseCalendar && calendar.variants;

    // Check for unique month names (skip for external variants)
    if (!isExternalVariant && Array.isArray(calendar.months)) {
      const monthNames = calendar.months.map((m: any) => m.name).filter(Boolean);
      const uniqueNames = new Set(monthNames);

      if (monthNames.length !== uniqueNames.size) {
        result.errors.push('Month names must be unique');
      }
    }

    // Check for unique weekday names (skip for external variants)
    if (!isExternalVariant && Array.isArray(calendar.weekdays)) {
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
   * Validate calendar and provide helpful error messages
   */
  static validateWithHelp(calendar: any): ValidationResult {
    const result = this.validate(calendar);

    // Add helpful warnings for common issues
    if (calendar.year?.epoch === undefined) {
      result.warnings.push('Year epoch not specified, defaulting to 0');
    }

    if (calendar.year?.currentYear === undefined) {
      result.warnings.push('Current year not specified, defaulting to 1');
    }

    if (!calendar.time) {
      result.warnings.push('Time configuration not specified, using 24-hour day');
    }

    if (!calendar.leapYear) {
      result.warnings.push('Leap year configuration not specified, no leap years will occur');
    }

    // Check for commonly forgotten fields
    if (Array.isArray(calendar.months)) {
      calendar.months.forEach((month: any, index: number) => {
        if (!month.abbreviation) {
          result.warnings.push(`Month ${index + 1} (${month.name}) has no abbreviation`);
        }
      });
    }

    return result;
  }

  /**
   * Quick validation for just checking if calendar is loadable
   */
  static isValid(calendar: any): boolean {
    return this.validate(calendar).isValid;
  }

  /**
   * Get a list of validation errors as strings
   */
  static getErrors(calendar: any): string[] {
    return this.validate(calendar).errors;
  }
}
