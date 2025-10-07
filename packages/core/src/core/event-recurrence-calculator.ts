/**
 * Event Recurrence Calculator
 *
 * Calculates when recurring events occur based on their recurrence rules.
 * Handles fixed date, ordinal (Nth weekday), and interval recurrence types.
 */

import type {
  SeasonsStarsCalendar,
  RecurrenceRule,
  FixedDateRecurrence,
  OrdinalRecurrence,
  IntervalRecurrence,
} from '../types/calendar';

/**
 * Result of calculating an event occurrence for a specific year
 */
export interface OccurrenceResult {
  month: number;
  day: number;
}

/**
 * Calculates when recurring events occur based on recurrence rules
 */
export class EventRecurrenceCalculator {
  constructor(private calendar: SeasonsStarsCalendar) {}

  /**
   * Calculate if and when an event occurs in a specific year
   *
   * @param recurrence The recurrence rule
   * @param year The year to check
   * @returns The month and day if the event occurs, null if it doesn't
   */
  calculateOccurrence(recurrence: RecurrenceRule, year: number): OccurrenceResult | null {
    switch (recurrence.type) {
      case 'fixed':
        return this.calculateFixedDate(recurrence, year);
      case 'ordinal':
        return this.calculateOrdinal(recurrence, year);
      case 'interval':
        return this.calculateInterval(recurrence, year);
      default:
        return null;
    }
  }

  /**
   * Calculate fixed date recurrence
   */
  private calculateFixedDate(
    recurrence: FixedDateRecurrence,
    year: number
  ): OccurrenceResult | null {
    const monthIndex = recurrence.month - 1;
    if (monthIndex < 0 || monthIndex >= this.calendar.months.length) {
      return null;
    }

    const monthDays = this.getMonthDays(monthIndex, year);

    // Check if the day exists in this month
    if (recurrence.day <= monthDays) {
      return { month: recurrence.month, day: recurrence.day };
    }

    // Day doesn't exist, handle based on ifDayNotExists option
    if (!recurrence.ifDayNotExists) {
      return null; // Skip by default
    }

    switch (recurrence.ifDayNotExists) {
      case 'lastDay':
        return { month: recurrence.month, day: monthDays };

      case 'beforeDay':
        return { month: recurrence.month, day: monthDays };

      case 'afterDay': {
        // Move to first day of next month
        const nextMonth =
          recurrence.month === this.calendar.months.length ? 1 : recurrence.month + 1;
        return { month: nextMonth, day: 1 };
      }

      default:
        return null;
    }
  }

  /**
   * Calculate ordinal recurrence (Nth weekday of month)
   */
  private calculateOrdinal(recurrence: OrdinalRecurrence, year: number): OccurrenceResult | null {
    // Calendar must have weekdays for ordinal recurrence
    if (!this.calendar.weekdays || this.calendar.weekdays.length === 0) {
      return null;
    }

    const monthIndex = recurrence.month - 1;
    if (monthIndex < 0 || monthIndex >= this.calendar.months.length) {
      return null;
    }

    const monthDays = this.getMonthDays(monthIndex, year);
    const occurrences: number[] = [];

    // Find all days in the month that match the target weekday
    for (let day = 1; day <= monthDays; day++) {
      const weekdayIndex = this.getWeekdayForDate(year, recurrence.month, day);
      if (weekdayIndex === recurrence.weekday) {
        occurrences.push(day);
      }
    }

    if (occurrences.length === 0) {
      return null;
    }

    // Handle last occurrence (-1)
    if (recurrence.occurrence === -1) {
      return {
        month: recurrence.month,
        day: occurrences[occurrences.length - 1],
      };
    }

    // Handle 1st, 2nd, 3rd, 4th occurrence
    const index = recurrence.occurrence - 1;
    if (index < 0 || index >= occurrences.length) {
      return null;
    }

    return { month: recurrence.month, day: occurrences[index] };
  }

  /**
   * Calculate interval recurrence (every N years)
   */
  private calculateInterval(recurrence: IntervalRecurrence, year: number): OccurrenceResult | null {
    // Check if this year matches the interval
    const yearsSinceAnchor = year - recurrence.anchorYear;
    if (yearsSinceAnchor % recurrence.intervalYears !== 0) {
      return null; // Not an occurrence year
    }

    // Use same logic as fixed date for the actual date
    const fixedRecurrence: FixedDateRecurrence = {
      type: 'fixed',
      month: recurrence.month,
      day: recurrence.day,
      ifDayNotExists: recurrence.ifDayNotExists,
    };

    return this.calculateFixedDate(fixedRecurrence, year);
  }

  /**
   * Get the number of days in a month for a given year
   */
  private getMonthDays(monthIndex: number, year: number): number {
    const month = this.calendar.months[monthIndex];
    let days = month.days;

    // Handle leap year adjustments
    if (
      this.calendar.leapYear.rule !== 'none' &&
      this.calendar.leapYear.month === month.name &&
      this.isLeapYear(year)
    ) {
      days += this.calendar.leapYear.extraDays || 0;
    }

    return days;
  }

  /**
   * Check if a year is a leap year according to calendar rules
   */
  private isLeapYear(year: number): boolean {
    if (this.calendar.leapYear.rule === 'none') {
      return false;
    }

    if (this.calendar.leapYear.rule === 'gregorian') {
      // Gregorian leap year: divisible by 4, except centuries unless divisible by 400
      return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    if (this.calendar.leapYear.rule === 'custom') {
      const interval = this.calendar.leapYear.interval || 4;
      const offset = this.calendar.leapYear.offset || 0;
      return (year - offset) % interval === 0;
    }

    return false;
  }

  /**
   * Get the weekday index for a specific date
   *
   * This is a simplified calculation that assumes the calendar's startDay
   * and epoch work together to determine weekdays. For more complex calendars,
   * this would need to use the full calendar engine's weekday calculation.
   */
  private getWeekdayForDate(year: number, month: number, day: number): number {
    // Calculate total days since epoch
    const epochYear = this.calendar.year.epoch;
    let totalDays = 0;

    // Add days for complete years
    for (let y = epochYear; y < year; y++) {
      totalDays += this.getYearDays(y);
    }

    // Add days for complete months in current year
    for (let m = 0; m < month - 1; m++) {
      totalDays += this.getMonthDays(m, year);
    }

    // Add days in current month
    totalDays += day - 1;

    // Calculate weekday
    const weekdayCount = this.calendar.weekdays.length;
    const startDay = this.calendar.year.startDay || 0;
    return (startDay + totalDays) % weekdayCount;
  }

  /**
   * Get the total days in a year
   */
  private getYearDays(year: number): number {
    let total = 0;
    for (let m = 0; m < this.calendar.months.length; m++) {
      total += this.getMonthDays(m, year);
    }
    return total;
  }
}
