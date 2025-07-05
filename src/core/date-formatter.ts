/**
 * Date Formatter - Handlebars-based date formatting for Seasons & Stars
 */

import type { CalendarDate } from './calendar-date';
import type { SeasonsStarsCalendar } from '../types/calendar';

export class DateFormatter {
  private calendar: SeasonsStarsCalendar;
  private templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();
  private handlebarsAvailable: boolean;

  constructor(calendar: SeasonsStarsCalendar) {
    this.calendar = calendar;
    this.handlebarsAvailable = this.checkHandlebarsAvailability();

    if (this.handlebarsAvailable) {
      this.registerCustomHelpers();
    }
  }

  /**
   * Check if Handlebars is available (for test environments)
   */
  private checkHandlebarsAvailability(): boolean {
    try {
      return typeof Handlebars !== 'undefined' && typeof Handlebars.compile === 'function';
    } catch {
      return false;
    }
  }

  /**
   * Format a date using a Handlebars template string
   */
  format(date: CalendarDate, template: string): string {
    try {
      // Preprocess template to resolve embedded formats
      const processedTemplate = this.preprocessEmbeddedFormats(date, template);

      // Check cache first for performance
      let compiledTemplate = this.templateCache.get(processedTemplate);

      if (!compiledTemplate) {
        // Use Foundry's global Handlebars to compile template
        compiledTemplate = Handlebars.compile(processedTemplate);
        this.templateCache.set(processedTemplate, compiledTemplate);
      }

      // Prepare context data for template
      const context = this.prepareTemplateContext(date);

      // Execute template with context
      return compiledTemplate(context);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[S&S] Date format template compilation failed:', error);
      // Fallback to basic format
      return this.getBasicFormat(date);
    }
  }

  /**
   * Format a date using a named format from calendar dateFormats
   */
  formatNamed(date: CalendarDate, formatName: string, variant?: string): string {
    const dateFormats = this.calendar.dateFormats;

    if (!dateFormats) {
      return this.getBasicFormat(date);
    }

    const format = dateFormats[formatName];

    if (!format) {
      return this.getBasicFormat(date);
    }

    // Handle format variants (format as object)
    if (typeof format === 'object' && !Array.isArray(format)) {
      if (variant && format[variant]) {
        return this.format(date, format[variant]);
      }

      // If no variant specified, try 'default' or first available
      const defaultFormat = format.default || Object.values(format)[0];
      if (defaultFormat) {
        return this.format(date, defaultFormat);
      }

      return this.getBasicFormat(date);
    }

    // Handle simple string format
    if (typeof format === 'string') {
      return this.format(date, format);
    }

    return this.getBasicFormat(date);
  }

  /**
   * Format a date using widget-specific format from calendar dateFormats
   */
  formatWidget(date: CalendarDate, widgetType: 'mini' | 'main' | 'grid'): string {
    const dateFormats = this.calendar.dateFormats;

    if (!dateFormats?.widgets) {
      return this.getBasicFormat(date);
    }

    const widgetFormat = dateFormats.widgets[widgetType];

    if (!widgetFormat) {
      return this.getBasicFormat(date);
    }

    return this.format(date, widgetFormat);
  }

  /**
   * Preprocess template to resolve embedded format references
   */
  private preprocessEmbeddedFormats(date: CalendarDate, template: string): string {
    // Match {{s&s-dateFmt:formatName}} patterns
    const embeddedFormatRegex = /\{\{\s*s&s-dateFmt\s*:\s*([^}\s]+)\s*\}\}/g;

    return template.replace(embeddedFormatRegex, (match, formatName) => {
      try {
        // Recursively format the embedded format
        const embeddedResult = this.formatNamedRecursive(date, formatName, new Set());
        return embeddedResult;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`[S&S] Failed to resolve embedded format '${formatName}':`, error);
        // Fallback to basic format for this embedded piece
        return this.getBasicFormat(date);
      }
    });
  }

  /**
   * Format named with circular reference protection
   */
  private formatNamedRecursive(
    date: CalendarDate,
    formatName: string,
    visited: Set<string>
  ): string {
    // Prevent circular references
    if (visited.has(formatName)) {
      // eslint-disable-next-line no-console
      console.warn(`[S&S] Circular reference detected in format '${formatName}'`);
      return this.getBasicFormat(date);
    }

    visited.add(formatName);

    const dateFormats = this.calendar.dateFormats;

    if (!dateFormats) {
      return this.getBasicFormat(date);
    }

    const format = dateFormats[formatName];

    if (!format) {
      return this.getBasicFormat(date);
    }

    // Handle format variants (format as object)
    if (typeof format === 'object' && !Array.isArray(format)) {
      // For recursive calls, use 'default' or first available variant
      const defaultFormat = format.default || Object.values(format)[0];
      if (defaultFormat) {
        return this.formatRecursive(date, defaultFormat, visited);
      }

      return this.getBasicFormat(date);
    }

    // Handle simple string format
    if (typeof format === 'string') {
      return this.formatRecursive(date, format, visited);
    }

    return this.getBasicFormat(date);
  }

  /**
   * Format with circular reference protection
   */
  private formatRecursive(date: CalendarDate, template: string, visited: Set<string>): string {
    try {
      // Preprocess template to resolve embedded formats with visited set
      const processedTemplate = this.preprocessEmbeddedFormatsRecursive(date, template, visited);

      // Check cache first for performance
      let compiledTemplate = this.templateCache.get(processedTemplate);

      if (!compiledTemplate) {
        // Use Foundry's global Handlebars to compile template
        compiledTemplate = Handlebars.compile(processedTemplate);
        this.templateCache.set(processedTemplate, compiledTemplate);
      }

      // Prepare context data for template
      const context = this.prepareTemplateContext(date);

      // Execute template with context
      return compiledTemplate(context);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[S&S] Date format template compilation failed:', error);
      // Fallback to basic format
      return this.getBasicFormat(date);
    }
  }

  /**
   * Preprocess template with visited set for circular reference protection
   */
  private preprocessEmbeddedFormatsRecursive(
    date: CalendarDate,
    template: string,
    visited: Set<string>
  ): string {
    // Match {{s&s-dateFmt:formatName}} patterns
    const embeddedFormatRegex = /\{\{\s*s&s-dateFmt\s*:\s*([^}\s]+)\s*\}\}/g;

    return template.replace(embeddedFormatRegex, (match, formatName) => {
      try {
        // Recursively format the embedded format with visited set
        const embeddedResult = this.formatNamedRecursive(date, formatName, new Set(visited));
        return embeddedResult;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`[S&S] Failed to resolve embedded format '${formatName}':`, error);
        // Fallback to basic format for this embedded piece
        return this.getBasicFormat(date);
      }
    });
  }

  /**
   * Prepare template context with date data
   */
  private prepareTemplateContext(date: CalendarDate): Record<string, unknown> {
    return {
      year: date.year,
      month: date.month,
      day: date.day,
      weekday: date.weekday,
      hour: date.time?.hour,
      minute: date.time?.minute,
      second: date.time?.second,
      dayOfYear: this.calculateDayOfYear(date),
    };
  }

  /**
   * Calculate day of year for stardate and other calculations
   */
  private calculateDayOfYear(date: CalendarDate): number {
    let dayOfYear = 0;

    // Add days from completed months
    for (let i = 0; i < date.month - 1; i++) {
      const month = this.calendar.months[i];
      if (month) {
        dayOfYear += month.days;
      }
    }

    // Add current day
    dayOfYear += date.day;

    return dayOfYear;
  }

  /**
   * Fallback basic format when template compilation fails
   */
  private getBasicFormat(date: CalendarDate): string {
    return `${date.year}-${date.month}-${date.day}`;
  }

  /**
   * Register custom Handlebars helpers for date formatting
   *
   * All helpers are prefixed with 's&s-' to prevent conflicts with other modules:
   * - s&s-day (with :pad, :ordinal formats)
   * - s&s-month (with :pad, :name, :abbr formats)
   * - s&s-weekday (with :name, :abbr formats)
   * - s&s-hour, s&s-minute, s&s-second (with :pad format)
   * - s&s-math (with op and value parameters)
   * - s&s-stardate (for sci-fi calendars)
   * - s&s-dateFmt (for format embedding)
   */
  private registerCustomHelpers(): void {
    // Day helper - supports ordinal and pad formats
    Handlebars.registerHelper(
      's&s-day',
      (value: number, options: { hash?: Record<string, unknown> }) => {
        const format = options.hash?.format;

        switch (format) {
          case 'ordinal':
            return this.addOrdinalSuffix(value);
          case 'pad':
            return value.toString().padStart(2, '0');
          default:
            return value.toString();
        }
      }
    );

    // Month helper - supports name, abbr, and pad formats
    Handlebars.registerHelper(
      's&s-month',
      (value: number, options: { hash?: Record<string, unknown> }) => {
        const format = options.hash?.format;

        switch (format) {
          case 'name':
            return this.getMonthName(value);
          case 'abbr':
            return this.getMonthAbbreviation(value);
          case 'pad':
            return value.toString().padStart(2, '0');
          default:
            return value.toString();
        }
      }
    );

    // Weekday helper - supports name and abbr formats
    Handlebars.registerHelper(
      's&s-weekday',
      (value: number, options: { hash?: Record<string, unknown> }) => {
        const format = options.hash?.format;

        switch (format) {
          case 'name':
            return this.getWeekdayName(value);
          case 'abbr':
            return this.getWeekdayAbbreviation(value);
          default:
            return value.toString();
        }
      }
    );

    // Format embedding helper - allows {{s&s-dateFmt:name}} syntax
    // Note: This helper is mainly for documentation. The actual format embedding
    // is handled by preprocessing in the format() method to avoid circular issues.
    Handlebars.registerHelper(
      's&s-dateFmt',
      (formatName: string, _options: { hash?: Record<string, unknown> }) => {
        // This should not be called in normal operation due to preprocessing
        return `[Unresolved: ${formatName}]`;
      }
    );

    // Mathematical operations helper
    Handlebars.registerHelper(
      's&s-math',
      (value: number, options: { hash?: Record<string, unknown> }) => {
        const operation = options.hash?.op;
        const operand = options.hash?.value;

        if (typeof operand !== 'number') {
          return value;
        }

        switch (operation) {
          case 'add':
            return value + operand;
          case 'subtract':
            return value - operand;
          case 'multiply':
            return value * operand;
          case 'divide':
            return operand !== 0 ? value / operand : value;
          case 'modulo':
            return operand !== 0 ? value % operand : value;
          default:
            return value;
        }
      }
    );

    // Stardate calculation helper for sci-fi calendars
    Handlebars.registerHelper(
      's&s-stardate',
      (year: number, options: { hash?: Record<string, unknown> }) => {
        const prefix = options.hash?.prefix || '0';
        const baseYear = options.hash?.baseYear || year;
        const dayOfYear = options.hash?.dayOfYear || 1;
        const precision = options.hash?.precision || 1;

        // Calculate stardate: prefix + (year - baseYear) + dayOfYear
        // Format: XXYYYY.P where XX is era prefix, YYYY is year offset + day, P is precision
        const yearOffset = year - baseYear;
        const stardatePrefix = parseInt(prefix) + yearOffset;
        const paddedDayOfYear = dayOfYear.toString().padStart(3, '0');

        return `${stardatePrefix}${paddedDayOfYear}.${precision > 0 ? '0'.repeat(precision) : ''}`.replace(
          /\.$/,
          '.0'
        );
      }
    );

    // Hour helper - supports pad format
    Handlebars.registerHelper(
      's&s-hour',
      (value: number, options: { hash?: Record<string, unknown> }) => {
        const format = options.hash?.format;

        switch (format) {
          case 'pad':
            return value.toString().padStart(2, '0');
          default:
            return value.toString();
        }
      }
    );

    // Minute helper - supports pad format
    Handlebars.registerHelper(
      's&s-minute',
      (value: number, options: { hash?: Record<string, unknown> }) => {
        const format = options.hash?.format;

        switch (format) {
          case 'pad':
            return value.toString().padStart(2, '0');
          default:
            return value.toString();
        }
      }
    );

    // Second helper - supports pad format
    Handlebars.registerHelper(
      's&s-second',
      (value: number, options: { hash?: Record<string, unknown> }) => {
        const format = options.hash?.format;

        switch (format) {
          case 'pad':
            return value.toString().padStart(2, '0');
          default:
            return value.toString();
        }
      }
    );
  }

  /**
   * Add ordinal suffix to a number (1st, 2nd, 3rd, etc.)
   */
  private addOrdinalSuffix(day: number): string {
    if (day >= 11 && day <= 13) {
      return `${day}th`;
    }

    const lastDigit = day % 10;
    switch (lastDigit) {
      case 1:
        return `${day}st`;
      case 2:
        return `${day}nd`;
      case 3:
        return `${day}rd`;
      default:
        return `${day}th`;
    }
  }

  /**
   * Get month name from calendar definition
   */
  private getMonthName(monthIndex: number): string {
    const month = this.calendar.months[monthIndex - 1];
    return month?.name || 'Unknown';
  }

  /**
   * Get month abbreviation from calendar definition
   */
  private getMonthAbbreviation(monthIndex: number): string {
    const month = this.calendar.months[monthIndex - 1];
    return month?.abbreviation || month?.name?.substring(0, 3) || 'Unk';
  }

  /**
   * Get weekday name from calendar definition
   */
  private getWeekdayName(weekdayIndex: number): string {
    const weekday = this.calendar.weekdays[weekdayIndex];
    return weekday?.name || 'Unknown';
  }

  /**
   * Get weekday abbreviation from calendar definition
   */
  private getWeekdayAbbreviation(weekdayIndex: number): string {
    const weekday = this.calendar.weekdays[weekdayIndex];
    return weekday?.abbreviation || weekday?.name?.substring(0, 3) || 'Unk';
  }
}
