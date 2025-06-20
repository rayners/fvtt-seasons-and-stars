/**
 * Recurring events system for calendar notes
 */

import type { CalendarDate as ICalendarDate } from '../types/calendar';
import type { CalendarEngineInterface } from '../types/external-integrations';
import { CalendarTimeUtils } from './calendar-time-utils';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type WeekdayName =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

export interface RecurringPattern {
  frequency: RecurrenceFrequency;
  interval: number; // Every N days/weeks/months/years
  endDate?: ICalendarDate; // When to stop recurring
  maxOccurrences?: number; // Maximum number of occurrences

  // Weekly recurrence options
  weekdays?: WeekdayName[]; // Which days of the week (for weekly)

  // Monthly recurrence options
  monthDay?: number; // Day of month (1-31, for monthly)
  monthWeek?: number; // Week of month (1-4, for monthly)
  monthWeekday?: WeekdayName; // Day of week in that week

  // Yearly recurrence options
  yearMonth?: number; // Month of year (1-12, for yearly)
  yearDay?: number; // Day of month for yearly

  // Exception dates (skip these occurrences)
  exceptions?: ICalendarDate[];
}

export interface RecurrenceOccurrence {
  date: ICalendarDate;
  isException: boolean;
  index: number; // 0-based occurrence index
}

/**
 * Manages recurring events and generates occurrence dates
 */
export class NoteRecurrence {
  /**
   * Generate all occurrences for a recurring pattern within a date range
   */
  static generateOccurrences(
    startDate: ICalendarDate,
    pattern: RecurringPattern,
    rangeStart: ICalendarDate,
    rangeEnd: ICalendarDate,
    engine: CalendarEngineInterface // Calendar engine for date calculations
  ): RecurrenceOccurrence[] {
    const occurrences: RecurrenceOccurrence[] = [];
    let currentDate = { ...startDate };
    let occurrenceIndex = 0;

    // Safety limit to prevent infinite loops
    const maxIterations = 10000;
    let iterations = 0;

    while (iterations < maxIterations) {
      iterations++;

      // Check if we've exceeded our limits
      if (pattern.endDate && this.isDateAfter(currentDate, pattern.endDate)) {
        break;
      }

      if (pattern.maxOccurrences && occurrenceIndex >= pattern.maxOccurrences) {
        break;
      }

      // Check if current date is within our requested range
      if (this.isDateInRange(currentDate, rangeStart, rangeEnd)) {
        const isException = this.isExceptionDate(currentDate, pattern.exceptions || []);

        occurrences.push({
          date: { ...currentDate },
          isException,
          index: occurrenceIndex,
        });
      }

      // If we're past the range end, stop
      if (this.isDateAfter(currentDate, rangeEnd)) {
        break;
      }

      // Calculate next occurrence date
      currentDate = this.getNextOccurrenceDate(currentDate, pattern, engine);
      occurrenceIndex++;
    }

    return occurrences;
  }

  /**
   * Calculate the next occurrence date based on the recurrence pattern
   */
  private static getNextOccurrenceDate(
    currentDate: ICalendarDate,
    pattern: RecurringPattern,
    engine: CalendarEngineInterface
  ): ICalendarDate {
    switch (pattern.frequency) {
      case 'daily':
        return this.addDays(currentDate, pattern.interval, engine);

      case 'weekly':
        if (pattern.weekdays && pattern.weekdays.length > 0) {
          return this.getNextWeekdayOccurrence(currentDate, pattern, engine);
        } else {
          // Use calendar-specific week length instead of hardcoded 7
          const calendar = engine.getCalendar() as SeasonsStarsCalendar;
          const weekLength = CalendarTimeUtils.getDaysPerWeek(calendar);
          return this.addDays(currentDate, weekLength * pattern.interval, engine);
        }

      case 'monthly':
        return this.getNextMonthlyOccurrence(currentDate, pattern, engine);

      case 'yearly':
        return this.getNextYearlyOccurrence(currentDate, pattern, engine);

      default:
        throw new Error(`Unsupported recurrence frequency: ${pattern.frequency}`);
    }
  }

  /**
   * Get next occurrence for weekly pattern with specific weekdays
   */
  private static getNextWeekdayOccurrence(
    currentDate: ICalendarDate,
    pattern: RecurringPattern,
    engine: CalendarEngineInterface
  ): ICalendarDate {
    if (!pattern.weekdays || pattern.weekdays.length === 0) {
      // Use calendar-specific week length instead of hardcoded 7
      const calendar = engine.getCalendar() as SeasonsStarsCalendar;
      const weekLength = CalendarTimeUtils.getDaysPerWeek(calendar);
      return this.addDays(currentDate, weekLength * pattern.interval, engine);
    }

    const weekdayNumbers = pattern.weekdays.map(day => this.weekdayNameToNumber(day));
    weekdayNumbers.sort((a, b) => a - b);

    const currentWeekday = currentDate.weekday || 0;

    // Find next weekday in current week
    const nextWeekday = weekdayNumbers.find(day => day > currentWeekday);

    if (nextWeekday !== undefined) {
      // Next occurrence is in the same week
      const daysToAdd = nextWeekday - currentWeekday;
      return this.addDays(currentDate, daysToAdd, engine);
    } else {
      // Move to next interval week and use first weekday
      const calendar = engine.getCalendar() as SeasonsStarsCalendar;
      const weekLength = CalendarTimeUtils.getDaysPerWeek(calendar);
      const daysToNextWeek = weekLength - currentWeekday + weekdayNumbers[0];
      const daysToAdd = daysToNextWeek + (pattern.interval - 1) * weekLength;
      return this.addDays(currentDate, daysToAdd, engine);
    }
  }

  /**
   * Get next occurrence for monthly pattern
   */
  private static getNextMonthlyOccurrence(
    currentDate: ICalendarDate,
    pattern: RecurringPattern,
    engine: CalendarEngineInterface
  ): ICalendarDate {
    if (pattern.monthDay) {
      // Specific day of month (e.g., 15th of every month)
      let nextDate = { ...currentDate };

      // Try same month first
      if (currentDate.day < pattern.monthDay) {
        nextDate.day = pattern.monthDay;
        if (this.isValidDate(nextDate, engine)) {
          return nextDate;
        }
      }

      // Move to next interval month
      nextDate = this.addMonths(currentDate, pattern.interval, engine);
      nextDate.day = Math.min(
        pattern.monthDay,
        engine.getMonthLength(nextDate.month, nextDate.year)
      );
      return nextDate;
    } else if (pattern.monthWeek && pattern.monthWeekday) {
      // Specific weekday of specific week (e.g., 2nd Tuesday of every month)
      return this.getNextMonthlyWeekdayOccurrence(currentDate, pattern, engine);
    } else {
      // Default: same day of next interval month
      return this.addMonths(currentDate, pattern.interval, engine);
    }
  }

  /**
   * Get next occurrence for monthly weekday pattern (e.g., 2nd Tuesday)
   */
  private static getNextMonthlyWeekdayOccurrence(
    currentDate: ICalendarDate,
    pattern: RecurringPattern,
    engine: CalendarEngineInterface
  ): ICalendarDate {
    if (!pattern.monthWeek || !pattern.monthWeekday) {
      return this.addMonths(currentDate, pattern.interval, engine);
    }

    const targetWeekday = this.weekdayNameToNumber(pattern.monthWeekday);

    // Try current month first
    const currentMonthDate = this.getNthWeekdayOfMonth(
      currentDate.year,
      currentDate.month,
      pattern.monthWeek,
      targetWeekday,
      engine
    );

    if (currentMonthDate && this.isDateAfter(currentMonthDate, currentDate)) {
      return currentMonthDate;
    }

    // Move to next interval month
    const nextMonth = this.addMonths(currentDate, pattern.interval, engine);
    const nextMonthDate = this.getNthWeekdayOfMonth(
      nextMonth.year,
      nextMonth.month,
      pattern.monthWeek,
      targetWeekday,
      engine
    );

    return nextMonthDate || this.addMonths(currentDate, pattern.interval, engine);
  }

  /**
   * Get next occurrence for yearly pattern
   */
  private static getNextYearlyOccurrence(
    currentDate: ICalendarDate,
    pattern: RecurringPattern,
    engine: CalendarEngineInterface
  ): ICalendarDate {
    const targetMonth = pattern.yearMonth || currentDate.month;
    const targetDay = pattern.yearDay || currentDate.day;

    // Try current year first
    if (
      currentDate.month < targetMonth ||
      (currentDate.month === targetMonth && currentDate.day < targetDay)
    ) {
      const thisYearDate: ICalendarDate = {
        year: currentDate.year,
        month: targetMonth,
        day: targetDay,
        weekday: engine.calculateWeekday(currentDate.year, targetMonth, targetDay),
        time: currentDate.time,
      };

      if (this.isValidDate(thisYearDate, engine)) {
        return thisYearDate;
      }
    }

    // Move to next interval year
    const nextYear = currentDate.year + pattern.interval;
    const maxDay = engine.getMonthLength(targetMonth, nextYear);

    return {
      year: nextYear,
      month: targetMonth,
      day: Math.min(targetDay, maxDay),
      weekday: engine.calculateWeekday(nextYear, targetMonth, Math.min(targetDay, maxDay)),
      time: currentDate.time,
    };
  }

  /**
   * Add days to a date using the calendar engine
   */
  private static addDays(
    date: ICalendarDate,
    days: number,
    engine: CalendarEngineInterface
  ): ICalendarDate {
    // Convert to world time, add days, convert back
    const worldTime = engine.dateToWorldTime(date);
    // Use calendar-specific day length instead of hardcoded 24 * 60 * 60
    const calendar = engine.getCalendar();
    const dayInSeconds = CalendarTimeUtils.getSecondsPerDay(calendar);
    const newWorldTime = worldTime + days * dayInSeconds;
    return engine.worldTimeToDate(newWorldTime);
  }

  /**
   * Add months to a date using the calendar engine
   */
  private static addMonths(
    date: ICalendarDate,
    months: number,
    engine: CalendarEngineInterface
  ): ICalendarDate {
    let newYear = date.year;
    let newMonth = date.month + months;

    // Handle year overflow/underflow using calendar-specific month count
    const calendar = engine.getCalendar();
    const monthsPerYear = CalendarTimeUtils.getMonthsPerYear(calendar);
    while (newMonth > monthsPerYear) {
      newMonth -= monthsPerYear;
      newYear++;
    }
    while (newMonth < 1) {
      newMonth += monthsPerYear;
      newYear--;
    }

    // Handle day overflow (e.g., Jan 31 + 1 month should be Feb 28/29)
    const maxDay = engine.getMonthLength(newMonth, newYear);
    const newDay = Math.min(date.day, maxDay);

    return {
      year: newYear,
      month: newMonth,
      day: newDay,
      weekday: engine.calculateWeekday(newYear, newMonth, newDay),
      time: date.time,
    };
  }

  /**
   * Get the Nth occurrence of a weekday in a month
   */
  private static getNthWeekdayOfMonth(
    year: number,
    month: number,
    week: number,
    weekday: number,
    engine: CalendarEngineInterface
  ): ICalendarDate | null {
    // Find first occurrence of weekday in month
    let day = 1;
    let foundWeekday = engine.calculateWeekday(year, month, day);

    const calendar = engine.getCalendar();
    const weekLength = CalendarTimeUtils.getDaysPerWeek(calendar);

    while (foundWeekday !== weekday && day <= weekLength) {
      day++;
      if (day <= engine.getMonthLength(month, year)) {
        foundWeekday = engine.calculateWeekday(year, month, day);
      } else {
        return null; // Weekday doesn't exist in this month
      }
    }

    // Add weeks to get to the Nth occurrence
    const targetDay = day + (week - 1) * weekLength;

    if (targetDay > engine.getMonthLength(month, year)) {
      return null; // Nth occurrence doesn't exist
    }

    return {
      year,
      month,
      day: targetDay,
      weekday: engine.calculateWeekday(year, month, targetDay),
      time: { hour: 0, minute: 0, second: 0 },
    };
  }

  /**
   * Convert weekday name to number (0 = Sunday, 6 = Saturday)
   */
  private static weekdayNameToNumber(weekday: WeekdayName): number {
    const mapping: Record<WeekdayName, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    return mapping[weekday] || 0;
  }

  /**
   * Check if a date is within a range (inclusive)
   */
  private static isDateInRange(
    date: ICalendarDate,
    start: ICalendarDate,
    end: ICalendarDate
  ): boolean {
    return (
      !CalendarTimeUtils.isDateBefore(date, start) && !CalendarTimeUtils.isDateAfter(date, end)
    );
  }

  /**
   * Check if date A is before date B
   */
  private static isDateBefore(dateA: ICalendarDate, dateB: ICalendarDate): boolean {
    return CalendarTimeUtils.isDateBefore(dateA, dateB);
  }

  /**
   * Check if date A is after date B
   */
  private static isDateAfter(dateA: ICalendarDate, dateB: ICalendarDate): boolean {
    return CalendarTimeUtils.isDateAfter(dateA, dateB);
  }

  /**
   * Check if a date is an exception (should be skipped)
   */
  private static isExceptionDate(date: ICalendarDate, exceptions: ICalendarDate[]): boolean {
    return exceptions.some(exception => CalendarTimeUtils.isDateEqual(date, exception));
  }

  /**
   * Validate that a date is valid for the calendar
   */
  private static isValidDate(date: ICalendarDate, engine: CalendarEngineInterface): boolean {
    try {
      const monthLength = engine.getMonthLength(date.month, date.year);
      return date.day >= 1 && date.day <= monthLength;
    } catch {
      return false;
    }
  }

  /**
   * Create a simple recurring pattern
   */
  static createSimplePattern(
    frequency: RecurrenceFrequency,
    interval: number = 1,
    options: Partial<RecurringPattern> = {}
  ): RecurringPattern {
    return {
      frequency,
      interval,
      ...options,
    };
  }

  /**
   * Create a weekly pattern for specific days
   */
  static createWeeklyPattern(
    weekdays: WeekdayName[],
    interval: number = 1,
    options: Partial<RecurringPattern> = {}
  ): RecurringPattern {
    return {
      frequency: 'weekly',
      interval,
      weekdays,
      ...options,
    };
  }

  /**
   * Create a monthly pattern for a specific day
   */
  static createMonthlyDayPattern(
    dayOfMonth: number,
    interval: number = 1,
    options: Partial<RecurringPattern> = {}
  ): RecurringPattern {
    return {
      frequency: 'monthly',
      interval,
      monthDay: dayOfMonth,
      ...options,
    };
  }

  /**
   * Create a monthly pattern for a specific weekday of a specific week
   */
  static createMonthlyWeekdayPattern(
    week: number,
    weekday: WeekdayName,
    interval: number = 1,
    options: Partial<RecurringPattern> = {}
  ): RecurringPattern {
    return {
      frequency: 'monthly',
      interval,
      monthWeek: week,
      monthWeekday: weekday,
      ...options,
    };
  }

  /**
   * Create a yearly pattern
   */
  static createYearlyPattern(
    month: number,
    day: number,
    interval: number = 1,
    options: Partial<RecurringPattern> = {}
  ): RecurringPattern {
    return {
      frequency: 'yearly',
      interval,
      yearMonth: month,
      yearDay: day,
      ...options,
    };
  }
}
