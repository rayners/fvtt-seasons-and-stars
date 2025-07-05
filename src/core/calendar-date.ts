/**
 * Calendar date representation and formatting for Seasons & Stars
 */

import type {
  CalendarDate as ICalendarDate,
  CalendarDateData,
  SeasonsStarsCalendar,
  DateFormatOptions,
} from '../types/calendar';
import { CalendarTimeUtils } from './calendar-time-utils';
import { DateFormatter } from './date-formatter';

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
  private formatter: DateFormatter;

  constructor(data: CalendarDateData, calendar: SeasonsStarsCalendar) {
    this.year = data.year;
    this.month = data.month;
    this.day = data.day;
    this.weekday = data.weekday;
    this.intercalary = data.intercalary;
    this.time = data.time;
    this.calendar = calendar;
    this.formatter = new DateFormatter(calendar);
  }

  /**
   * Format the date for display using the new template-based system
   */
  format(options: DateFormatOptions = {}): string {
    // Try to use calendar's dateFormats first
    const dateFormats = this.calendar.dateFormats;

    // Check for predefined formats in calendar
    if (dateFormats) {
      const formatName = this.getFormatNameFromOptions(options);
      if (formatName && dateFormats[formatName]) {
        return this.formatter.formatNamed(this, formatName);
      }
    }

    // Fallback to building a template based on options
    const template = this.buildTemplateFromOptions(options);
    return this.formatter.format(this, template);
  }

  /**
   * Get a format name from calendar dateFormats based on options
   */
  private getFormatNameFromOptions(options: DateFormatOptions): string | null {
    const { includeTime, format } = options;

    // Look for common format names based on options
    const possibleNames: string[] = [];

    if (format === 'short') {
      possibleNames.push('short', 'brief');
    } else if (format === 'long') {
      possibleNames.push('long', 'full', 'detailed');
    } else if (format === 'numeric') {
      possibleNames.push('numeric', 'iso', 'number');
    }

    if (includeTime) {
      possibleNames.unshift(...possibleNames.map((name: string) => `${name}Time`));
      possibleNames.unshift('datetime', 'timestamp');
    }

    // Check if any of these formats exist in calendar
    const dateFormats = this.calendar.dateFormats;
    if (dateFormats) {
      for (const name of possibleNames) {
        if (dateFormats[name]) {
          return name;
        }
      }
    }

    return null;
  }

  /**
   * Build a template string based on DateFormatOptions
   */
  private buildTemplateFromOptions(options: DateFormatOptions): string {
    const {
      includeTime = false,
      includeWeekday = true,
      includeYear = true,
      format = 'long',
    } = options;

    const parts: string[] = [];

    // Handle intercalary days
    if (this.intercalary) {
      return this.intercalary;
    }

    // Add weekday if requested
    if (includeWeekday) {
      if (format === 'short') {
        parts.push('{{weekday:abbr}}');
      } else {
        parts.push('{{weekday:name}}');
      }
    }

    // Add day and month
    if (format === 'numeric') {
      parts.push('{{month}}/{{day}}');
    } else if (format === 'short') {
      parts.push('{{day}} {{month:abbr}}');
    } else {
      parts.push('{{day:ordinal}} {{month:name}}');
    }

    // Add year if requested
    if (includeYear) {
      parts.push('{{year}}');
    }

    // Add time if requested
    if (includeTime && this.time) {
      parts.push('{{hour:pad}}:{{minute:pad}}:{{second:pad}}');
    }

    return parts.join(', ');
  }

  /**
   * Get a short format string (for UI display) - tries widget.mini format first
   */
  toShortString(): string {
    // Try widget.mini format first
    const dateFormats = this.calendar.dateFormats;
    if (dateFormats?.widgets?.mini) {
      return this.formatter.formatWidget(this, 'mini');
    }

    // Fallback to options-based format
    return this.format({
      includeTime: false,
      includeWeekday: false,
      format: 'short',
    });
  }

  /**
   * Get a full format string (for detailed display) - tries widget.main format first
   */
  toLongString(): string {
    // Try widget.main format first
    const dateFormats = this.calendar.dateFormats;
    if (dateFormats?.widgets?.main) {
      return this.formatter.formatWidget(this, 'main');
    }

    // Fallback to options-based format
    return this.format({
      includeTime: true,
      includeWeekday: true,
      includeYear: true,
      format: 'long',
    });
  }

  /**
   * Get just the date portion (no time) - prefers named formats
   */
  toDateString(): string {
    // Try named 'date' format first
    const dateFormats = this.calendar.dateFormats;
    if (dateFormats?.date) {
      return this.formatter.formatNamed(this, 'date');
    }

    // Fallback to options-based format
    return this.format({
      includeTime: false,
      includeWeekday: true,
      includeYear: true,
      format: 'long',
    });
  }

  /**
   * Get just the time portion - prefers named time format
   */
  toTimeString(): string {
    if (!this.time) return '';

    // Try named 'time' format first
    const dateFormats = this.calendar.dateFormats;
    if (dateFormats?.time) {
      return this.formatter.formatNamed(this, 'time');
    }

    // Fallback to template-based time format
    return this.formatter.format(this, '{{hour:pad}}:{{minute:pad}}:{{second:pad}}');
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
  clone(modifications: Partial<CalendarDateData> = {}): CalendarDate {
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
  compareTo(other: CalendarDateData): number {
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
  equals(other: CalendarDateData): boolean {
    return this.compareTo(other) === 0;
  }

  /**
   * Check if this date is before another date
   */
  isBefore(other: CalendarDateData): boolean {
    return this.compareTo(other) < 0;
  }

  /**
   * Check if this date is after another date
   */
  isAfter(other: CalendarDateData): boolean {
    return this.compareTo(other) > 0;
  }

  /**
   * Get a plain object representation
   */
  toObject(): CalendarDateData {
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
  static fromObject(data: CalendarDateData, calendar: SeasonsStarsCalendar): CalendarDate {
    return new CalendarDate(data, calendar);
  }
}
