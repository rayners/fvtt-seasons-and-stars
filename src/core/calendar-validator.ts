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
      this.validateCrossReferences(calendar, result);
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate required fields are present
   */
  private static validateRequiredFields(calendar: any, result: ValidationResult): void {
    const requiredFields = ['id', 'translations', 'months', 'weekdays'];

    for (const field of requiredFields) {
      if (!(field in calendar)) {
        result.errors.push(`Missing required field: ${field}`);
      }
    }

    // Check required fields in nested objects
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
    // Validate ID
    if (typeof calendar.id !== 'string') {
      result.errors.push('Calendar ID must be a string');
    }

    // Validate translations structure
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
    }

    // Validate year configuration
    if (calendar.year) {
      this.validateYearConfig(calendar.year, result);
    }

    // Validate leap year configuration
    if (calendar.leapYear) {
      this.validateLeapYearConfig(calendar.leapYear, result);
    }

    // Validate arrays
    if (!Array.isArray(calendar.months)) {
      result.errors.push('Months must be an array');
    }

    if (!Array.isArray(calendar.weekdays)) {
      result.errors.push('Weekdays must be an array');
    }

    if (calendar.intercalary && !Array.isArray(calendar.intercalary)) {
      result.errors.push('Intercalary days must be an array');
    }

    // Validate time configuration
    if (calendar.time) {
      this.validateTimeConfig(calendar.time, result);
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
   * Validate data constraints and ranges
   */
  private static validateConstraints(calendar: any, result: ValidationResult): void {
    // Validate ID format
    if (calendar.id && !/^[a-zA-Z0-9_-]+$/.test(calendar.id)) {
      result.errors.push(
        'Calendar ID must contain only alphanumeric characters, hyphens, and underscores'
      );
    }

    // Validate months
    if (Array.isArray(calendar.months)) {
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

    // Validate weekdays
    if (Array.isArray(calendar.weekdays)) {
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
