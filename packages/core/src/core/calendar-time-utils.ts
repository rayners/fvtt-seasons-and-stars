/**
 * Calendar Time Utilities
 *
 * Utility functions for calendar-specific time calculations that replace
 * hardcoded assumptions throughout the codebase.
 *
 * Eliminates hardcoded values like:
 * - 86400 (seconds per day)
 * - 24 * 60 * 60 (seconds per day)
 * - 365 (days per year)
 * - 12 (months per year)
 * - 7 (days per week)
 *
 * These functions work with any calendar system by using the calendar's
 * actual time configuration instead of Earth-based assumptions.
 */

import type {
  SeasonsStarsCalendar,
  CalendarDate as ICalendarDate,
  CalendarDateData,
} from '../types/calendar';

export class CalendarTimeUtils {
  /**
   * Get seconds per day for a calendar
   * Replaces hardcoded 86400 or 24 * 60 * 60
   */
  static getSecondsPerDay(calendar: SeasonsStarsCalendar): number {
    return calendar.time.hoursInDay * calendar.time.minutesInHour * calendar.time.secondsInMinute;
  }

  /**
   * Get seconds per hour for a calendar
   * Replaces hardcoded 3600 or 60 * 60
   */
  static getSecondsPerHour(calendar: SeasonsStarsCalendar): number {
    return calendar.time.minutesInHour * calendar.time.secondsInMinute;
  }

  /**
   * Get days per week for a calendar
   * Replaces hardcoded 7
   */
  static getDaysPerWeek(calendar: SeasonsStarsCalendar): number {
    return calendar.weekdays.length;
  }

  /**
   * Get months per year for a calendar
   * Replaces hardcoded 12
   */
  static getMonthsPerYear(calendar: SeasonsStarsCalendar): number {
    return calendar.months.length;
  }

  /**
   * Convert days to seconds using calendar-specific day length
   * Replaces hardcoded days * 86400
   */
  static daysToSeconds(days: number, calendar: SeasonsStarsCalendar): number {
    return days * this.getSecondsPerDay(calendar);
  }

  /**
   * Convert weeks to days using calendar-specific week length
   * Replaces hardcoded weeks * 7
   */
  static weeksToDays(weeks: number, calendar: SeasonsStarsCalendar): number {
    return weeks * this.getDaysPerWeek(calendar);
  }

  /**
   * Convert hours to seconds using calendar-specific hour length
   * Replaces hardcoded hours * 3600
   */
  static hoursToSeconds(hours: number, calendar: SeasonsStarsCalendar): number {
    return hours * this.getSecondsPerHour(calendar);
  }

  /**
   * Convert weeks to seconds using calendar-specific time units
   * Combines week length and day length calculations
   */
  static weeksToSeconds(weeks: number, calendar: SeasonsStarsCalendar): number {
    const days = this.weeksToDays(weeks, calendar);
    return this.daysToSeconds(days, calendar);
  }

  /**
   * Convert seconds to world time components (days, hours, minutes, seconds)
   * Uses calendar-specific time units for accurate breakdown
   */
  static secondsToWorldTimeUnits(
    totalSeconds: number,
    calendar: SeasonsStarsCalendar
  ): { days: number; hours: number; minutes: number; seconds: number } {
    const secondsPerDay = this.getSecondsPerDay(calendar);
    const secondsPerHour = this.getSecondsPerHour(calendar);
    const secondsPerMinute = calendar.time.secondsInMinute;

    const days = Math.floor(totalSeconds / secondsPerDay);
    let remainingSeconds = totalSeconds % secondsPerDay;

    const hours = Math.floor(remainingSeconds / secondsPerHour);
    remainingSeconds = remainingSeconds % secondsPerHour;

    const minutes = Math.floor(remainingSeconds / secondsPerMinute);
    const seconds = remainingSeconds % secondsPerMinute;

    return { days, hours, minutes, seconds };
  }

  // === DATE COMPARISON UTILITIES ===

  /**
   * Compare two dates chronologically
   * Returns: -1 if dateA < dateB, 0 if equal, 1 if dateA > dateB
   * Replaces repeated date comparison patterns throughout codebase
   */
  static compareDates(dateA: ICalendarDate, dateB: ICalendarDate): number {
    if (dateA.year !== dateB.year) return dateA.year - dateB.year;
    if (dateA.month !== dateB.month) return dateA.month - dateB.month;
    return dateA.day - dateB.day;
  }

  /**
   * Check if two dates are equal (ignores weekday and time)
   * Replaces repeated date equality checks
   */
  static isDateEqual(dateA: ICalendarDate, dateB: ICalendarDate): boolean {
    return this.compareDates(dateA, dateB) === 0;
  }

  /**
   * Check if dateA is before dateB chronologically
   * Replaces repeated date ordering checks
   */
  static isDateBefore(dateA: ICalendarDate, dateB: ICalendarDate): boolean {
    return this.compareDates(dateA, dateB) < 0;
  }

  /**
   * Check if dateA is after dateB chronologically
   * Replaces repeated date ordering checks
   */
  static isDateAfter(dateA: ICalendarDate, dateB: ICalendarDate): boolean {
    return this.compareDates(dateA, dateB) > 0;
  }

  // === DATE ARITHMETIC UTILITIES ===

  /**
   * Normalize month values with year overflow/underflow handling
   * Replaces repeated month normalization patterns
   */
  static normalizeMonth(
    month: number,
    year: number,
    calendar: SeasonsStarsCalendar
  ): { month: number; year: number } {
    const monthsPerYear = this.getMonthsPerYear(calendar);
    let normalizedMonth = month;
    let normalizedYear = year;

    // Handle month overflow
    while (normalizedMonth > monthsPerYear) {
      normalizedMonth -= monthsPerYear;
      normalizedYear++;
    }

    // Handle month underflow
    while (normalizedMonth < 1) {
      normalizedMonth += monthsPerYear;
      normalizedYear--;
    }

    return { month: normalizedMonth, year: normalizedYear };
  }

  /**
   * Add months to a date with proper year overflow and day clamping
   * Replaces repeated month arithmetic patterns
   */
  static addMonthsToDate(
    date: ICalendarDate,
    months: number,
    calendar: SeasonsStarsCalendar
  ): CalendarDateData {
    // Calculate new month and year
    const { month: newMonth, year: newYear } = this.normalizeMonth(
      date.month + months,
      date.year,
      calendar
    );

    // Handle day overflow (e.g., Jan 31 + 1 month = Feb 28/29)
    const maxDayInNewMonth = calendar.months[newMonth - 1]?.days || 30; // Fallback to 30
    const clampedDay = Math.min(date.day, maxDayInNewMonth);

    return {
      year: newYear,
      month: newMonth,
      day: clampedDay,
      weekday: date.weekday, // Preserve weekday (would need calendar engine for accurate calculation)
      time: date.time,
    };
  }

  /**
   * Normalize weekday values using calendar-specific week length
   * Replaces repeated weekday normalization patterns
   */
  static normalizeWeekday(weekday: number, calendar: SeasonsStarsCalendar): number {
    const weekLength = this.getDaysPerWeek(calendar);
    let normalized = weekday % weekLength;

    // Handle negative weekdays
    if (normalized < 0) {
      normalized += weekLength;
    }

    return normalized;
  }

  // === FORMATTING UTILITIES ===

  /**
   * Add ordinal suffix to numbers (1st, 2nd, 3rd, 4th, etc.)
   * Replaces repeated ordinal formatting patterns
   */
  static addOrdinalSuffix(num: number): string {
    const lastDigit = num % 10;
    const lastTwoDigits = num % 100;

    // Special cases for 11th, 12th, 13th (always 'th')
    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      return `${num}th`;
    }

    // Regular ordinal rules
    switch (lastDigit) {
      case 1:
        return `${num}st`;
      case 2:
        return `${num}nd`;
      case 3:
        return `${num}rd`;
      default:
        return `${num}th`;
    }
  }

  /**
   * Format time component with zero-padding
   * Replaces repeated time formatting patterns
   */
  static formatTimeComponent(value: number, padLength: number = 2): string {
    return value.toString().padStart(padLength, '0');
  }

  // === CALENDAR-SPECIFIC YEAR OPERATIONS ===

  /**
   * Calculate approximate year length by summing month days
   * Replaces hardcoded 365 day assumptions
   */
  static getApproximateYearLength(calendar: SeasonsStarsCalendar): number {
    return calendar.months.reduce((sum, month) => sum + month.days, 0);
  }
}
