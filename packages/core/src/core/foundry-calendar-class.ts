/**
 * Foundry VTT Calendar Class Implementation
 *
 * Implements CalendarData for Foundry v13+ calendar system.
 * This class extends CalendarData to integrate Seasons & Stars calendar engine
 * with Foundry's native time system, allowing other modules to use standard
 * Foundry APIs to interact with S&S calendars.
 *
 * @see https://foundryvtt.com/api/classes/foundry.data.CalendarData.html
 */

import type { CalendarManager } from './calendar-manager';
import type { CalendarDate } from './calendar-date';
import type { SeasonsStarsCalendar } from '../types/calendar';
import { Logger } from './logger';

/**
 * Time components interface for CalendarData
 */
interface TimeComponents {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  second?: number;
  [key: string]: number | string | undefined;
}

/**
 * Extended time components for Seasons & Stars calendars
 * Includes standard time units plus optional intercalary day tracking
 */
export interface SeasonsStarsTimeComponents extends TimeComponents {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  intercalary?: string; // Name of intercalary period if applicable
}

// Get the base CalendarData class from Foundry at runtime
// Use getter function to safely access foundry.data.CalendarData when available
function getBaseCalendarData() {
  // At module load time, foundry global should be available
  // Type assertion needed because foundry.data is added at runtime
  const foundryAny = foundry as any;
  if (typeof foundry !== 'undefined' && foundryAny.data?.CalendarData) {
    return foundryAny.data.CalendarData;
  }
  // Fallback to empty class if foundry isn't available yet
  // This should never happen in normal Foundry operation
  return class {};
}

const BaseCalendarData = getBaseCalendarData();

// Type definition for CalendarData (compile-time only)
type CalendarDataType<Components extends TimeComponents = TimeComponents> = {
  new (
    data?: object,
    options?: any
  ): {
    timeToComponents(time?: number): Components;
    componentsToTime(components: Partial<Components>): number;
    add(time: number, components: Partial<Components>): number;
    difference(time1: number, time2: number): Partial<Components>;
    format(time: number, options?: any): string;
  };
};

/**
 * Seasons & Stars Calendar implementation extending Foundry's CalendarData
 *
 * This class provides full integration with Foundry's time system by:
 * - Converting between world time (seconds) and calendar components
 * - Supporting time arithmetic (add, subtract, difference)
 * - Formatting dates according to calendar rules
 * - Handling leap years and intercalary days
 *
 * @example
 * ```typescript
 * // Foundry automatically instantiates this when set in CONFIG
 * CONFIG.time.worldCalendarClass = SeasonsStarsFoundryCalendar;
 * CONFIG.time.worldCalendarConfig = calendarConfig;
 *
 * // Then other modules can use:
 * const components = game.time.calendar.timeToComponents(game.time.worldTime);
 * const formatted = game.time.calendar.format(game.time.worldTime);
 * ```
 */
export class SeasonsStarsFoundryCalendar extends (BaseCalendarData as CalendarDataType<SeasonsStarsTimeComponents>) {
  private manager: CalendarManager | null = null;

  /**
   * Create a new Seasons & Stars calendar instance
   *
   * @param data - Calendar configuration data (from CONFIG.time.worldCalendarConfig)
   * @param options - Construction options
   */
  constructor(data?: object, options?: any) {
    super(data, options);
    Logger.debug('SeasonsStarsFoundryCalendar instantiated');

    // Try to get the manager from the global API
    // This allows Foundry to instantiate this class and it will automatically
    // find the manager without needing manual setup
    if (typeof game !== 'undefined' && game.seasonsStars?.manager) {
      this.manager = game.seasonsStars.manager as CalendarManager;
      Logger.debug('Calendar manager auto-discovered from game.seasonsStars.manager');
    }
  }

  /**
   * Set the calendar manager reference
   * Called after the manager is fully initialized
   *
   * @param manager - The initialized calendar manager
   */
  setManager(manager: CalendarManager): void {
    this.manager = manager;
    Logger.debug('Calendar manager set on Foundry calendar class');
  }

  /**
   * Get the active calendar definition
   *
   * @returns The active calendar or null if not initialized
   */
  private getActiveCalendar(): SeasonsStarsCalendar | null {
    if (!this.manager) {
      return null;
    }
    return this.manager.getActiveCalendar();
  }

  /**
   * Convert world time (seconds since epoch) to calendar components
   *
   * @param time - World time in seconds (defaults to 0)
   * @returns Calendar components (year, month, day, hour, minute, second, intercalary)
   */
  timeToComponents(time: number = 0): SeasonsStarsTimeComponents {
    if (!this.manager) {
      // Manager not ready yet - return default components silently
      // This is normal during Foundry's early initialization
      return this.getDefaultComponents();
    }

    const engine = this.manager.getActiveEngine();
    if (!engine) {
      // Engine not ready yet - return default components silently
      // Calendar will be properly initialized after calendars are loaded
      return this.getDefaultComponents();
    }

    const date = engine.worldTimeToDate(time);

    return {
      year: date.year,
      month: date.month,
      day: date.day,
      hour: date.time?.hour ?? 0,
      minute: date.time?.minute ?? 0,
      second: date.time?.second ?? 0,
      intercalary: date.intercalary,
    };
  }

  /**
   * Convert calendar components to world time (seconds since epoch)
   *
   * @param components - Calendar components (partial allowed)
   * @returns World time in seconds
   */
  componentsToTime(components: Partial<SeasonsStarsTimeComponents>): number {
    if (!this.manager) {
      Logger.warn('Calendar manager not initialized for componentsToTime');
      return 0;
    }

    const engine = this.manager.getActiveEngine();
    if (!engine) {
      Logger.warn('No active calendar engine for componentsToTime');
      return 0;
    }

    const calendar = this.getActiveCalendar();
    if (!calendar) {
      return 0;
    }

    // Create a CalendarDate from components
    const dateData = {
      year: components.year ?? 0,
      month: components.month ?? 1,
      day: components.day ?? 1,
      weekday: 0, // Will be calculated by engine
      intercalary: components.intercalary,
      time: {
        hour: components.hour ?? 0,
        minute: components.minute ?? 0,
        second: components.second ?? 0,
      },
    };

    // Use the engine to convert to world time
    return engine.dateToWorldTime(dateData as CalendarDate);
  }

  /**
   * Add time to a starting point
   *
   * @param time - Starting time in seconds
   * @param components - Time components to add (can be negative)
   * @returns Resulting time in seconds
   */
  add(time: number, components: Partial<SeasonsStarsTimeComponents>): number {
    // Calculate delta in seconds for each component
    const calendar = this.getActiveCalendar();
    if (!calendar) {
      return time;
    }

    // Calculate seconds for each time component
    const seconds = components.second ?? 0;
    const minutes = (components.minute ?? 0) * calendar.time.secondsInMinute;
    const hours =
      (components.hour ?? 0) * calendar.time.minutesInHour * calendar.time.secondsInMinute;
    const days =
      (components.day ?? 0) *
      calendar.time.hoursInDay *
      calendar.time.minutesInHour *
      calendar.time.secondsInMinute;

    // For months and years, we need to convert through the engine
    // since month/year lengths vary
    let monthYearSeconds = 0;
    if (components.month || components.year) {
      // Create a date at epoch and add the month/year components
      const baseDate = this.timeToComponents(0);
      const targetDate = {
        year: baseDate.year + (components.year ?? 0),
        month: baseDate.month + (components.month ?? 0),
        day: baseDate.day,
      };
      const targetSeconds = this.componentsToTime(targetDate);
      monthYearSeconds = targetSeconds;
    }

    const deltaSeconds = seconds + minutes + hours + days + monthYearSeconds;

    // Add the times and return
    return time + deltaSeconds;
  }

  /**
   * Calculate the difference between two times
   *
   * @param endTime - End time (seconds or components)
   * @param startTime - Start time (seconds or components), defaults to epoch
   * @returns Difference as calendar components
   */
  difference(
    endTime: number | Partial<SeasonsStarsTimeComponents>,
    startTime?: number | Partial<SeasonsStarsTimeComponents>
  ): SeasonsStarsTimeComponents {
    // Convert inputs to seconds
    const endSeconds = typeof endTime === 'number' ? endTime : this.componentsToTime(endTime);

    const startSeconds =
      startTime === undefined
        ? 0
        : typeof startTime === 'number'
          ? startTime
          : this.componentsToTime(startTime);

    // Calculate difference
    const diffSeconds = endSeconds - startSeconds;

    // Convert to components
    return this.timeToComponents(diffSeconds);
  }

  /**
   * Format a time value as a string
   *
   * @param time - Time to format (seconds or components), defaults to current time
   * @param formatter - Format name (not currently used, uses S&S formatter)
   * @param options - Formatting options
   * @returns Formatted string
   */
  format(
    time?: number | Partial<SeasonsStarsTimeComponents>,
    _formatter?: string,
    _options?: any
  ): string {
    if (!this.manager) {
      return 'Calendar not initialized';
    }

    // Convert to seconds if components
    const timeSeconds =
      time === undefined
        ? typeof game !== 'undefined' && game.time
          ? game.time.worldTime
          : 0
        : typeof time === 'number'
          ? time
          : this.componentsToTime(time);

    const engine = this.manager.getActiveEngine();
    if (!engine) {
      return 'No active calendar';
    }

    const date = engine.worldTimeToDate(timeSeconds);

    // Use S&S date formatter
    return date.toDateString();
  }

  /**
   * Check if a year is a leap year
   *
   * @param year - Year to check
   * @returns True if leap year
   */
  isLeapYear(year: number): boolean {
    if (!this.manager) {
      return false;
    }

    const engine = this.manager.getActiveEngine();
    if (!engine) {
      return false;
    }

    return engine.isLeapYear(year);
  }

  /**
   * Count leap years before a given year
   *
   * @param year - Year to count up to (exclusive)
   * @returns Number of leap years
   */
  countLeapYears(year: number): number {
    if (!this.manager) {
      return 0;
    }

    const engine = this.manager.getActiveEngine();
    const calendar = this.getActiveCalendar();
    if (!engine || !calendar) {
      return 0;
    }

    let count = 0;
    const startYear = calendar.year.epoch;

    for (let y = startYear; y < year; y++) {
      if (engine.isLeapYear(y)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Get default components when manager is not available
   *
   * @returns Default zero-based components
   */
  private getDefaultComponents(): SeasonsStarsTimeComponents {
    return {
      year: 0,
      month: 1,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
    };
  }
}

/**
 * Get the global Foundry calendar instance
 *
 * @returns The global calendar instance or null if not available
 */
export function getFoundryCalendar(): SeasonsStarsFoundryCalendar | null {
  if (typeof CONFIG === 'undefined' || !CONFIG.time) {
    return null;
  }

  if (CONFIG.time.calendar instanceof SeasonsStarsFoundryCalendar) {
    return CONFIG.time.calendar;
  }

  return null;
}
