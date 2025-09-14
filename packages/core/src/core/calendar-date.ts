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
import { Logger } from './logger';

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
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid calendar date data provided');
      }
      if (!calendar || typeof calendar !== 'object') {
        throw new Error('Invalid calendar provided');
      }

      this.year = data.year;
      this.month = data.month;
      this.day = data.day;
      this.weekday = data.weekday;
      this.intercalary = data.intercalary;
      this.time = data.time;
      this.calendar = calendar;
      this.formatter = new DateFormatter(calendar);
    } catch (error) {
      Logger.debug('Error creating CalendarDate:', error);
      throw error;
    }
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
      // Add specific time variants first (e.g., shortTime, longTime)
      const timeVariants = possibleNames.map(name => `${name}Time`);
      // Add generic time formats last
      possibleNames.unshift(...timeVariants, 'datetime', 'timestamp');
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
        parts.push('{{ss-weekday format="abbr"}}');
      } else {
        parts.push('{{ss-weekday format="name"}}');
      }
    }

    // Add day and month
    if (format === 'numeric') {
      parts.push('{{ss-month}}/{{ss-day}}');
    } else if (format === 'short') {
      parts.push('{{ss-day}} {{ss-month format="abbr"}}');
    } else {
      parts.push('{{ss-day format="ordinal"}} {{ss-month format="name"}}');
    }

    // Add year if requested
    if (includeYear) {
      parts.push('{{year}}');
    }

    // Add time if requested
    if (includeTime && this.time) {
      parts.push('{{ss-hour format="pad"}}:{{ss-minute format="pad"}}:{{ss-second format="pad"}}');
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

    // Fallback to basic string formatting for calendars without dateFormats
    if (!dateFormats) {
      return `${this.day} ${this.getMonthName('short')} ${this.getYearString()}`;
    }

    // Try options-based format but fall back to basic if it fails
    try {
      return this.format({
        includeTime: false,
        includeWeekday: false,
        format: 'short',
      });
    } catch (error) {
      Logger.debug('Error formatting short date string:', error);
      return `${this.day} ${this.getMonthName('short')} ${this.getYearString()}`;
    }
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

    // Fallback to basic string formatting for calendars without dateFormats
    if (!dateFormats) {
      const weekdayName = this.getWeekdayName('long');
      const monthName = this.getMonthName('long');
      const dayOrdinal = this.getDayString('long');
      const yearString = this.getYearString();
      const timeString = this.time ? ` ${this.getTimeString()}` : '';
      return `${weekdayName}, ${dayOrdinal} ${monthName} ${yearString}${timeString}`;
    }

    // Try options-based format but fall back to basic if it fails
    try {
      return this.format({
        includeTime: true,
        includeWeekday: true,
        includeYear: true,
        format: 'long',
      });
    } catch (error) {
      Logger.debug('Error formatting long date string:', error);
      const weekdayName = this.getWeekdayName('long');
      const monthName = this.getMonthName('long');
      const dayOrdinal = this.getDayString('long');
      const yearString = this.getYearString();
      const timeString = this.time ? ` ${this.getTimeString()}` : '';
      return `${weekdayName}, ${dayOrdinal} ${monthName} ${yearString}${timeString}`;
    }
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

    // Fallback to basic string formatting for calendars without dateFormats
    if (!dateFormats) {
      const weekdayName = this.getWeekdayName('long');
      const monthName = this.getMonthName('long');
      const dayOrdinal = this.getDayString('long');
      const yearString = this.getYearString();
      return `${weekdayName}, ${dayOrdinal} ${monthName} ${yearString}`;
    }

    // Try options-based format but fall back to basic if it fails
    try {
      return this.format({
        includeTime: false,
        includeWeekday: true,
        includeYear: true,
        format: 'long',
      });
    } catch (error) {
      Logger.debug('Error formatting date string:', error);
      const weekdayName = this.getWeekdayName('long');
      const monthName = this.getMonthName('long');
      const dayOrdinal = this.getDayString('long');
      const yearString = this.getYearString();
      return `${weekdayName}, ${dayOrdinal} ${monthName} ${yearString}`;
    }
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

    // Fallback to basic string formatting for calendars without dateFormats
    if (!dateFormats) {
      return this.getTimeString();
    }

    // Fallback to template-based time format
    return this.formatter.format(
      this,
      '{{ss-hour format="pad"}}:{{ss-minute format="pad"}}:{{ss-second format="pad"}}'
    );
  }

  /**
   * Get the weekday name
   */
  private getWeekdayName(format: 'short' | 'long' | 'numeric'): string {
    try {
      const weekday = this.calendar.weekdays?.[this.weekday];
      if (!weekday) {
        Logger.debug(`Invalid weekday index: ${this.weekday}`);
        return 'Unknown';
      }

      if (format === 'short' && weekday.abbreviation) {
        return weekday.abbreviation;
      }

      return weekday.name || 'Unknown';
    } catch (error) {
      Logger.debug('Error getting weekday name:', error);
      return 'Unknown';
    }
  }

  /**
   * Get the month name
   */
  private getMonthName(format: 'short' | 'long' | 'numeric'): string {
    try {
      const month = this.calendar.months?.[this.month - 1];
      if (!month) {
        Logger.debug(`Invalid month index: ${this.month}`);
        return 'Unknown';
      }

      if (format === 'short' && month.abbreviation) {
        return month.abbreviation;
      }

      return month.name || 'Unknown';
    } catch (error) {
      Logger.debug('Error getting month name:', error);
      return 'Unknown';
    }
  }

  /**
   * Get the day string with appropriate suffix
   */
  private getDayString(format: 'short' | 'long' | 'numeric'): string {
    try {
      if (typeof this.day !== 'number' || this.day < 1) {
        Logger.debug(`Invalid day value: ${this.day}`);
        return '1';
      }

      if (format === 'numeric') {
        return this.day.toString();
      }

      // Add ordinal suffix for long format
      if (format === 'long') {
        return this.addOrdinalSuffix(this.day);
      }

      return this.day.toString();
    } catch (error) {
      Logger.debug('Error formatting day string:', error);
      return '1';
    }
  }

  /**
   * Get the year string with prefix/suffix
   */
  private getYearString(): string {
    try {
      if (typeof this.year !== 'number') {
        Logger.debug(`Invalid year value: ${this.year}`);
        return '1';
      }

      const { prefix = '', suffix = '' } = this.calendar.year || {};
      return `${prefix}${this.year}${suffix}`.trim();
    } catch (error) {
      Logger.debug('Error formatting year string:', error);
      return this.year?.toString() || '1';
    }
  }

  /**
   * Get the time string
   */
  private getTimeString(): string {
    try {
      if (!this.time) return '';

      const { hour, minute, second } = this.time;

      // Validate time components
      if (typeof hour !== 'number' || typeof minute !== 'number' || typeof second !== 'number') {
        Logger.debug('Invalid time components:', { hour, minute, second });
        return '00:00:00';
      }

      // Use 24-hour format by default
      const hourStr = CalendarTimeUtils.formatTimeComponent(hour);
      const minuteStr = CalendarTimeUtils.formatTimeComponent(minute);
      const secondStr = CalendarTimeUtils.formatTimeComponent(second);

      return `${hourStr}:${minuteStr}:${secondStr}`;
    } catch (error) {
      Logger.debug('Error formatting time string:', error);
      return '00:00:00';
    }
  }

  /**
   * Add ordinal suffix to a number (1st, 2nd, 3rd, etc.)
   */
  private addOrdinalSuffix(num: number): string {
    try {
      if (typeof num !== 'number' || num < 1) {
        Logger.debug(`Invalid number for ordinal suffix: ${num}`);
        return '1st';
      }
      return CalendarTimeUtils.addOrdinalSuffix(num);
    } catch (error) {
      Logger.debug('Error adding ordinal suffix:', error);
      return `${num || 1}th`;
    }
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
    try {
      if (!other || typeof other !== 'object') {
        Logger.debug('Invalid date data provided for comparison:', other);
        return 0;
      }

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
    } catch (error) {
      Logger.debug('Error comparing dates:', error);
      return 0;
    }
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
