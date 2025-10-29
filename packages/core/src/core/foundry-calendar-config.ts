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
 * Foundry CalendarConfig interface based on API documentation
 * @see https://foundryvtt.com/api/interfaces/foundry.data.types.CalendarConfig.html
 */
export interface FoundryCalendarConfig {
  /** The name of the calendar being used */
  name: string;
  /** A text description of the calendar configuration */
  description: string;
  /** Configuration of years */
  years: {
    /** The year zero epoch */
    yearZero: number;
    /** The first weekday (0-indexed) */
    firstWeekday: number;
  };
  /** Configuration of months (nullable) */
  months: {
    /** Array of month configurations */
    months: Array<{
      /** Month name */
      name: string;
      /** Month abbreviation */
      abbreviation: string;
      /** Ordinal number (1-based) */
      ordinal: number;
      /** Number of days in the month */
      days: number;
    }>;
  } | null;
  /** Configuration of days */
  days: {
    /** Array of weekday names */
    weekdays: string[];
    /** Total number of days in a year */
    yearLength: number;
  };
  /** Configuration of seasons (nullable) */
  seasons: {
    /** Array of season configurations */
    seasons: Array<{
      /** Season name */
      name: string;
      /** Starting month (1-based) */
      startMonth: number;
      /** Starting day (1-based, defaults to 1) */
      startDay?: number;
    }>;
  } | null;
  /** Time configuration */
  time?: {
    /** Hours per day */
    hoursInDay: number;
    /** Minutes per hour */
    minutesInHour: number;
    /** Seconds per minute */
    secondsInMinute: number;
  };
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
    ordinal: index + 1,
    days: month.days,
  }));

  // Convert weekdays to simple string array
  const weekdays = calendar.weekdays.map(day => day.name);

  // Convert seasons if they exist
  const seasons = calendar.seasons
    ? {
        seasons: calendar.seasons.map(season => ({
          name: season.name,
          startMonth: season.startMonth,
          startDay: season.startDay || 1,
        })),
      }
    : null;

  return {
    name,
    description,
    years: {
      yearZero: calendar.year.epoch,
      firstWeekday: calendar.year.startDay,
    },
    months: {
      months,
    },
    days: {
      weekdays,
      yearLength,
    },
    seasons,
    time: {
      hoursInDay: calendar.time.hoursInDay,
      minutesInHour: calendar.time.minutesInHour,
      secondsInMinute: calendar.time.secondsInMinute,
    },
  };
}
