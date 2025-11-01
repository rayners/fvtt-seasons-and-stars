/**
 * Foundry VTT Calendar Integration
 *
 * Provides conversion between Seasons & Stars calendar format and Foundry's
 * native calendar system introduced in v13.
 *
 * @see https://foundryvtt.com/api/interfaces/foundry.data.types.CalendarConfig.html
 */

import type { SeasonsStarsCalendar } from '../types/calendar';
import { CalendarLocalization } from './calendar-localization';

/**
 * Foundry CalendarConfig interface matching actual runtime schema
 * @see https://foundryvtt.com/api/classes/foundry.data.CalendarData.html
 */
export interface FoundryCalendarConfig {
  /** The name of the calendar being used */
  name: string;
  /** A text description of the calendar configuration */
  description?: string;
  /** Configuration of years */
  years: {
    /** The year zero epoch */
    yearZero: number;
    /** The first weekday (0-indexed) */
    firstWeekday: number;
    /** Leap year configuration */
    leapYear?: {
      leapStart: number;
      leapInterval: number;
    };
  };
  /** Configuration of months (nullable) */
  months: {
    /** Array of month configurations */
    values: Array<{
      /** Month name */
      name: string;
      /** Month abbreviation */
      abbreviation?: string;
      /** Ordinal number (1-based) */
      ordinal: number;
      /** Number of days in the month */
      days: number;
    }>;
  } | null;
  /** Configuration of days */
  days: {
    /** Array of weekday configurations */
    values: Array<{
      /** Weekday name */
      name: string;
      /** Weekday abbreviation */
      abbreviation?: string;
      /** Ordinal number (1-based) */
      ordinal: number;
    }>;
    /** Total number of days in a year */
    daysPerYear: number;
    /** Hours per day */
    hoursPerDay: number;
    /** Minutes per hour */
    minutesPerHour: number;
    /** Seconds per minute */
    secondsPerMinute: number;
  };
  /** Configuration of seasons (nullable) */
  seasons: {
    /** Array of season configurations */
    values: Array<{
      /** Season name */
      name: string;
      /** Starting month (1-based) */
      startMonth: number;
      /** Starting day (1-based, defaults to 1) */
      startDay?: number;
    }>;
  } | null;
}

/**
 * Convert a Seasons & Stars calendar to Foundry's CalendarConfig format
 *
 * This function is purely functional and testable - it does not modify any global state.
 * The conversion handles:
 * - Year epoch and start day mapping
 * - Month definitions (excluding intercalary months)
 * - Weekday names
 * - Season definitions
 * - Time units
 *
 * @param calendar - The Seasons & Stars calendar to convert
 * @returns A Foundry-compatible CalendarConfig object
 *
 * @example
 * ```typescript
 * const calendar = manager.getActiveCalendar();
 * const foundryConfig = convertToFoundryCalendarConfig(calendar);
 * CONFIG.time.worldCalendarConfig = foundryConfig;
 * ```
 */
export function convertToFoundryCalendarConfig(
  calendar: SeasonsStarsCalendar
): FoundryCalendarConfig {
  // Get localized calendar name and description
  const name = CalendarLocalization.getCalendarLabel(calendar);
  const description =
    CalendarLocalization.getCalendarDescription(calendar) || 'Calendar for world time tracking';

  // Calculate total year length (including intercalary days)
  const monthDays = calendar.months.reduce((sum, month) => sum + month.days, 0);
  const intercalaryDays = calendar.intercalary
    ? calendar.intercalary.reduce((sum, day) => sum + (day.days || 1), 0)
    : 0;
  const yearLength = monthDays + intercalaryDays;

  // Convert months (only include regular months, not intercalary periods)
  const months = calendar.months.map((month, index) => ({
    name: month.name,
    abbreviation: month.abbreviation || month.name.substring(0, 3),
    ordinal: index + 1, // 1-based ordinal
    days: month.days,
  }));

  // Convert weekdays - must be objects with name and ordinal, not just strings
  const weekdays = calendar.weekdays.map((day, index) => ({
    name: day.name,
    abbreviation: day.abbreviation || day.name.substring(0, 3),
    ordinal: index + 1, // 1-based ordinal
  }));

  // Convert seasons if they exist
  const seasons = calendar.seasons
    ? {
        values: calendar.seasons.map(season => ({
          name: season.name,
          startMonth: season.startMonth,
          startDay: season.startDay || 1,
        })),
      }
    : null;

  // Handle leap year configuration if present
  let leapYear: { leapStart: number; leapInterval: number } | undefined;
  if (calendar.leapYear && calendar.leapYear.rule !== 'none') {
    if (calendar.leapYear.rule === 'gregorian') {
      // Gregorian leap year rule: every 4 years
      leapYear = {
        leapStart: calendar.leapYear.offset ?? 0,
        leapInterval: 4,
      };
    } else if (calendar.leapYear.rule === 'custom' && calendar.leapYear.interval) {
      // Custom leap year rule: use specified interval and offset
      leapYear = {
        leapStart: calendar.leapYear.offset ?? 0,
        leapInterval: calendar.leapYear.interval,
      };
    }
  }

  return {
    name,
    description,
    years: {
      yearZero: calendar.year.epoch,
      firstWeekday: calendar.year.startDay,
      leapYear,
    },
    months: months.length > 0 ? { values: months } : null,
    days: {
      values: weekdays,
      daysPerYear: yearLength,
      hoursPerDay: calendar.time.hoursInDay,
      minutesPerHour: calendar.time.minutesInHour,
      secondsPerMinute: calendar.time.secondsInMinute,
    },
    seasons,
  };
}
