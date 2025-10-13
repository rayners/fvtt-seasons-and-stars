/**
 * Validation utilities for API parameter checking
 */

// Validation utilities for API parameter checking

export class ValidationUtils {
  /**
   * Validate calendar ID parameter
   */
  static validateCalendarId(calendarId?: string): void {
    if (calendarId !== undefined && (typeof calendarId !== 'string' || calendarId.trim() === '')) {
      throw new Error('Calendar ID must be a non-empty string');
    }
  }

  /**
   * Validate finite number parameter
   */
  static validateFiniteNumber(value: unknown, paramName: string): void {
    if (typeof value !== 'number' || !isFinite(value)) {
      throw new Error(`${paramName} must be a finite number`);
    }
  }

  /**
   * Validate calendar date object
   */
  static validateCalendarDate(date: unknown, paramName: string): void {
    if (!date || typeof date !== 'object') {
      throw new Error(`${paramName} must be a calendar date object`);
    }

    const dateObj = date as Record<string, unknown>;
    if (
      typeof dateObj.year !== 'number' ||
      typeof dateObj.month !== 'number' ||
      typeof dateObj.day !== 'number'
    ) {
      throw new Error(`${paramName} must have numeric year, month, and day properties`);
    }
  }

  /**
   * Validate string parameter
   */
  static validateString(value: unknown, paramName: string, allowEmpty = true): void {
    if (typeof value !== 'string') {
      throw new Error(`${paramName} must be a string`);
    }

    if (!allowEmpty && value.trim() === '') {
      throw new Error(`${paramName} cannot be empty`);
    }
  }
}
