/**
 * Calendar date representation and formatting for Seasons & Stars
 */

import type {
  CalendarDate as ICalendarDate,
  SeasonsStarsCalendar,
  DateFormatOptions,
} from '../types/calendar';
import { CalendarLocalization } from './calendar-localization';
import { CalendarTimeUtils } from './calendar-time-utils';

export class CalendarDate implements ICalendarDate {
  year: number;
  month: number;
  day: number;
  weekday: number;
  intercalary?: string;
  time?: {
    hour: number;
    minute: number;
    second: number;
  };

  private calendar: SeasonsStarsCalendar;

  constructor(data: ICalendarDate, calendar: SeasonsStarsCalendar) {
    this.year = data.year;
    this.month = data.month;
    this.day = data.day;
    this.weekday = data.weekday;
    this.intercalary = data.intercalary;
    this.time = data.time;
    this.calendar = calendar;
  }

  /**
   * Format the date for display
   */
  format(options: DateFormatOptions = {}): string {
    const {
      includeTime = false,
      includeWeekday = true,
      includeYear = true,
      format = 'long',
    } = options;

    const parts: string[] = [];

    // Add weekday if requested and not an intercalary day
    if (includeWeekday && !this.intercalary) {
      const weekdayName = this.getWeekdayName(format);
      parts.push(weekdayName);
    }

    // Handle intercalary days
    if (this.intercalary) {
      parts.push(this.intercalary);
    } else {
      // Regular date formatting
      const dayStr = this.getDayString(format);
      const monthStr = this.getMonthName(format);

      if (format === 'numeric') {
        parts.push(`${this.month}/${this.day}`);
      } else {
        parts.push(`${dayStr} ${monthStr}`);
      }
    }

    // Add year if requested
    if (includeYear) {
      const yearStr = this.getYearString();
      parts.push(yearStr);
    }

    // Add time if requested
    if (includeTime && this.time) {
      const timeStr = this.getTimeString();
      parts.push(timeStr);
    }

    return parts.join(', ');
  }

  /**
   * Get a short format string (for UI display)
   */
  toShortString(): string {
    return this.format({
      includeTime: false,
      includeWeekday: false,
      format: 'short',
    });
  }

  /**
   * Get a full format string (for detailed display)
   */
  toLongString(): string {
    return this.format({
      includeTime: true,
      includeWeekday: true,
      includeYear: true,
      format: 'long',
    });
  }

  /**
   * Get just the date portion (no time)
   */
  toDateString(): string {
    return this.format({
      includeTime: false,
      includeWeekday: true,
      includeYear: true,
      format: 'long',
    });
  }

  /**
   * Get just the time portion
   */
  toTimeString(): string {
    if (!this.time) return '';
    return this.getTimeString();
  }

  /**
   * Get the weekday name
   */
  private getWeekdayName(format: 'short' | 'long' | 'numeric'): string {
    const weekday = this.calendar.weekdays[this.weekday];
    if (!weekday) return 'Unknown';

    if (format === 'short' && weekday.abbreviation) {
      return weekday.abbreviation;
    }

    return weekday.name;
  }

  /**
   * Get the month name
   */
  private getMonthName(format: 'short' | 'long' | 'numeric'): string {
    const month = this.calendar.months[this.month - 1];
    if (!month) return 'Unknown';

    if (format === 'short' && month.abbreviation) {
      return month.abbreviation;
    }

    return month.name;
  }

  /**
   * Get the day string with appropriate suffix
   */
  private getDayString(format: 'short' | 'long' | 'numeric'): string {
    if (format === 'numeric') {
      return this.day.toString();
    }

    // Add ordinal suffix for long format
    if (format === 'long') {
      return this.addOrdinalSuffix(this.day);
    }

    return this.day.toString();
  }

  /**
   * Get the year string with prefix/suffix
   */
  private getYearString(): string {
    const { prefix, suffix } = this.calendar.year;
    return `${prefix}${this.year}${suffix}`.trim();
  }

  /**
   * Get the time string
   */
  private getTimeString(): string {
    if (!this.time) return '';

    const { hour, minute, second } = this.time;

    // Use 24-hour format by default
    const hourStr = CalendarTimeUtils.formatTimeComponent(hour);
    const minuteStr = CalendarTimeUtils.formatTimeComponent(minute);
    const secondStr = CalendarTimeUtils.formatTimeComponent(second);

    return `${hourStr}:${minuteStr}:${secondStr}`;
  }

  /**
   * Add ordinal suffix to a number (1st, 2nd, 3rd, etc.)
   */
  private addOrdinalSuffix(num: number): string {
    return CalendarTimeUtils.addOrdinalSuffix(num);
  }

  /**
   * Clone this date with optional modifications
   */
  clone(modifications: Partial<ICalendarDate> = {}): CalendarDate {
    return new CalendarDate(
      {
        year: modifications.year ?? this.year,
        month: modifications.month ?? this.month,
        day: modifications.day ?? this.day,
        weekday: modifications.weekday ?? this.weekday,
        intercalary: modifications.intercalary ?? this.intercalary,
        time: modifications.time ?? (this.time ? { ...this.time } : undefined),
      },
      this.calendar
    );
  }

  /**
   * Compare this date with another date
   */
  compareTo(other: ICalendarDate): number {
    if (this.year !== other.year) return this.year - other.year;
    if (this.month !== other.month) return this.month - other.month;
    if (this.day !== other.day) return this.day - other.day;

    // Compare time if both have it
    if (this.time && other.time) {
      if (this.time.hour !== other.time.hour) return this.time.hour - other.time.hour;
      if (this.time.minute !== other.time.minute) return this.time.minute - other.time.minute;
      if (this.time.second !== other.time.second) return this.time.second - other.time.second;
    }

    return 0;
  }

  /**
   * Check if this date is equal to another date
   */
  equals(other: ICalendarDate): boolean {
    return this.compareTo(other) === 0;
  }

  /**
   * Check if this date is before another date
   */
  isBefore(other: ICalendarDate): boolean {
    return this.compareTo(other) < 0;
  }

  /**
   * Check if this date is after another date
   */
  isAfter(other: ICalendarDate): boolean {
    return this.compareTo(other) > 0;
  }

  /**
   * Get a plain object representation
   */
  toObject(): ICalendarDate {
    return {
      year: this.year,
      month: this.month,
      day: this.day,
      weekday: this.weekday,
      intercalary: this.intercalary,
      time: this.time ? { ...this.time } : undefined,
    };
  }

  /**
   * Create a CalendarDate from a plain object
   */
  static fromObject(data: ICalendarDate, calendar: SeasonsStarsCalendar): CalendarDate {
    return new CalendarDate(data, calendar);
  }
}
