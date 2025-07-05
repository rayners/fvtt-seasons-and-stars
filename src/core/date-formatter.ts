/**
 * Date Formatter - Handlebars-based date formatting for Seasons & Stars
 */

import type { CalendarDate } from './calendar-date';
import type { SeasonsStarsCalendar } from '../types/calendar';

export class DateFormatter {
  private calendar: SeasonsStarsCalendar;

  /**
   * Template compilation cache - intentionally unlimited size
   *
   * Design Decision: No cache size limits imposed at runtime
   *
   * Rationale:
   * - Real-world usage: Calendars typically have 10-25 date formats maximum
   * - Session lifecycle: Foundry sessions last 2-4 hours, then browser refresh clears cache
   * - Memory impact: Compiled Handlebars templates are tiny compared to game assets
   * - Prevention strategy: Limit dateFormats at JSON schema level, not runtime cache
   *
   * Previous implementation used complex LRU eviction (65+ lines) to solve a theoretical
   * problem that doesn't occur in practice. Simple Map provides better performance
   * and maintainability for realistic usage patterns.
   */
  private templateCache: Map<string, Function> = new Map();
  private static helpersRegistered: boolean = false;

  constructor(calendar: SeasonsStarsCalendar) {
    this.calendar = calendar;
    // Only register helpers once globally to avoid unnecessary re-registration
    if (!DateFormatter.helpersRegistered) {
      this.registerCustomHelpers();
      DateFormatter.helpersRegistered = true;
    }
  }

  /**
   * Reset helper registration state (for testing purposes)
   * @internal
   */
  static resetHelpersForTesting(): void {
    DateFormatter.helpersRegistered = false;
  }

  /**
   * Format a date using a Handlebars template string
   */
  format(date: CalendarDate, template: string): string {
    // Type safety check at entry point
    if (typeof template !== 'string') {
      console.warn('[S&S] Invalid template type passed to format(), falling back to basic format');
      return this.getBasicFormat(date);
    }

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
    // Type safety check - ensure template is actually a string
    if (typeof template !== 'string') {
      console.warn('[S&S] Invalid template type, falling back to basic format');
      return this.getBasicFormat(date);
    }

    // Match {{ss-dateFmt:formatName}} patterns
    const embeddedFormatRegex = /\{\{\s*ss-dateFmt\s*:\s*([^}\s]+)\s*\}\}/g;

    return template.replace(embeddedFormatRegex, (match, formatName) => {
      try {
        // Recursively format the embedded format
        const embeddedResult = this.formatNamedRecursive(date, formatName, new Set());
        return embeddedResult;
      } catch (error) {
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
    // Match {{ss-dateFmt:formatName}} patterns
    const embeddedFormatRegex = /\{\{\s*ss-dateFmt\s*:\s*([^}\s]+)\s*\}\}/g;

    return template.replace(embeddedFormatRegex, (match, formatName) => {
      try {
        // Recursively format the embedded format with visited set
        const embeddedResult = this.formatNamedRecursive(date, formatName, new Set(visited));
        return embeddedResult;
      } catch (error) {
        console.warn(`[S&S] Failed to resolve embedded format '${formatName}':`, error);
        // Fallback to basic format for this embedded piece
        return this.getBasicFormat(date);
      }
    });
  }

  /**
   * Prepare template context with date data
   */
  private prepareTemplateContext(date: CalendarDate): Record<string, any> {
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
    // Bounds checking for month value
    if (date.month < 1 || date.month > this.calendar.months.length) {
      console.warn(`[S&S] Invalid month value ${date.month}, using start of year fallback`);
      // Return 1 to indicate start of year, which is more meaningful than raw day value
      // This prevents confusing calculations in stardate helpers and other features
      return 1;
    }

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
    // For calendars without dateFormats, return a simple format
    const monthName = this.getMonthName(date.month);
    const weekdayName = this.getWeekdayName(date.weekday);
    const dayOrdinal = this.addOrdinalSuffix(date.day);
    const yearString =
      `${this.calendar.year?.prefix || ''}${date.year}${this.calendar.year?.suffix || ''}`.trim();

    return `${weekdayName}, ${dayOrdinal} ${monthName} ${yearString}`;
  }

  /**
   * Register custom Handlebars helpers for date formatting
   */
  private registerCustomHelpers(): void {
    // Day helper - supports ordinal and pad formats
    Handlebars.registerHelper('ss-day', (value: number, options: any) => {
      const format = options.hash?.format;

      switch (format) {
        case 'ordinal':
          return this.addOrdinalSuffix(value);
        case 'pad':
          return value.toString().padStart(2, '0');
        default:
          return value.toString();
      }
    });

    // Month helper - supports name, abbr, and pad formats
    Handlebars.registerHelper('ss-month', (value: number, options: any) => {
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
    });

    // Weekday helper - supports name and abbr formats
    Handlebars.registerHelper('ss-weekday', (value: number, options: any) => {
      const format = options.hash?.format;

      switch (format) {
        case 'name':
          return this.getWeekdayName(value);
        case 'abbr':
          return this.getWeekdayAbbreviation(value);
        default:
          return value.toString();
      }
    });

    // Format embedding helper - allows {{ss-dateFmt:name}} syntax
    // Note: This helper is mainly for documentation. The actual format embedding
    // is handled by preprocessing in the format() method to avoid circular issues.
    Handlebars.registerHelper('ss-dateFmt', (formatName: string, _options: any) => {
      // This should not be called in normal operation due to preprocessing
      return `[Unresolved: ${formatName}]`;
    });

    // Mathematical operations helper
    Handlebars.registerHelper('ss-math', (value: number, options: any) => {
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
    });

    // Hour helper - supports pad format
    Handlebars.registerHelper('ss-hour', (value: number, options: any) => {
      // If value is not provided explicitly, use context
      let hourValue = value;
      if (value === undefined || value === null) {
        hourValue = options?.data?.root?.hour;
      }

      // Handle still undefined/null values gracefully
      if (hourValue === undefined || hourValue === null) {
        hourValue = 0;
      }

      const format = options.hash?.format;

      switch (format) {
        case 'pad':
          return hourValue.toString().padStart(2, '0');
        default:
          return hourValue.toString();
      }
    });

    // Minute helper - supports pad format
    Handlebars.registerHelper('ss-minute', (value: number, options: any) => {
      // If value is not provided explicitly, use context
      let minuteValue = value;
      if (value === undefined || value === null) {
        minuteValue = options?.data?.root?.minute;
      }

      // Handle still undefined/null values gracefully
      if (minuteValue === undefined || minuteValue === null) {
        minuteValue = 0;
      }

      const format = options.hash?.format;

      switch (format) {
        case 'pad':
          return minuteValue.toString().padStart(2, '0');
        default:
          return minuteValue.toString();
      }
    });

    // Second helper - supports pad format
    Handlebars.registerHelper('ss-second', (value: number, options: any) => {
      // If value is not provided explicitly, use context
      let secondValue = value;
      if (value === undefined || value === null) {
        secondValue = options?.data?.root?.second;
      }

      // Handle still undefined/null values gracefully
      if (secondValue === undefined || secondValue === null) {
        secondValue = 0;
      }

      const format = options.hash?.format;

      switch (format) {
        case 'pad':
          return secondValue.toString().padStart(2, '0');
        default:
          return secondValue.toString();
      }
    });

    // Stardate calculation helper for sci-fi calendars
    Handlebars.registerHelper('ss-stardate', (year: number, options: any) => {
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
    });
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
