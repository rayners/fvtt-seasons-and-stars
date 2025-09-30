/**
 * API wrapper to consolidate repetitive validation and error handling patterns
 * Reduces boilerplate in module.ts API methods
 */

import { Logger } from './logger';

export type APIValidator = (params: unknown) => void;
export type APIImplementation<T> = () => Promise<T> | T;

/**
 * Standardized API method wrapper
 */
export class APIWrapper {
  /**
   * Wrap an API method with standardized logging, validation, and error handling
   */
  static async wrapAPIMethod<T>(
    methodName: string,
    params: unknown,
    validator: APIValidator,
    implementation: APIImplementation<T>
  ): Promise<T> {
    try {
      Logger.api(methodName, params);

      // Validate parameters
      validator(params);

      // Execute implementation
      const result = await implementation();

      Logger.api(methodName, params, result === undefined ? 'success' : result);
      return result;
    } catch (error) {
      Logger.error(
        `Failed to ${methodName}`,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Common validation helpers
   */
  static validateNumber(value: unknown, name: string): asserts value is number {
    if (typeof value !== 'number' || !isFinite(value)) {
      throw new Error(`${name} must be a finite number`);
    }
  }

  static validateString(value: unknown, name: string, allowEmpty = false): asserts value is string {
    if (typeof value !== 'string') {
      throw new Error(`${name} must be a string`);
    }
    if (!allowEmpty && value.trim() === '') {
      throw new Error(`${name} must not be empty`);
    }
  }

  static validateOptionalString(value: unknown, name: string): asserts value is string | undefined {
    if (value !== undefined && typeof value !== 'string') {
      throw new Error(`${name} must be a string if provided`);
    }
  }

  /**
   * Validate calendar ID with common pattern
   */
  static validateCalendarId(calendarId?: string): void {
    if (calendarId !== undefined) {
      this.validateString(calendarId, 'Calendar ID');
      // For now, calendar-specific operations are not implemented
      if (calendarId) {
        throw new Error('Calendar-specific operations not yet implemented');
      }
    }
  }

  /**
   * Validate calendar date object
   */
  static validateCalendarDate(date: unknown, name: string = 'Date'): void {
    if (!date || typeof date !== 'object') {
      throw new Error(`${name} must be a valid calendar date object`);
    }

    const dateObj = date as Record<string, unknown>;
    if (
      typeof dateObj.year !== 'number' ||
      typeof dateObj.month !== 'number' ||
      typeof dateObj.day !== 'number'
    ) {
      throw new Error(`${name} must have valid year, month, and day numbers`);
    }
  }
}
