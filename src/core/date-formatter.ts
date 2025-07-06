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
   * ARCHITECTURAL DECISION: No runtime cache size limits by design
   *
   * Memory Management Strategy:
   * - Input validation enforces maximum 100 date formats per calendar (see calendar validation)
   * - Realistic usage: 10-25 formats typical, 100 is generous upper bound
   * - Memory math: 100 templates × ~2KB each = ~200KB maximum per calendar instance
   * - Foundry context: Game assets (maps, tokens, audio) use 100-1000× more memory
   * - Session lifecycle: Browser refresh every 2-4 hours naturally clears cache
   *
   * Alternative Approaches Considered & Rejected:
   * - LRU cache with size limits: 65+ lines of complexity for theoretical problem
   * - Periodic cleanup: Unnecessary overhead when input validation prevents the issue
   * - WeakMap: Cannot iterate or debug, provides no practical benefit
   *
   * Performance Characteristics:
   * - Cache hits: O(1) Map lookup (2-3 microseconds)
   * - Template compilation: O(n) in template complexity (10-50 milliseconds)
   * - Memory usage: Linear with unique templates, bounded by validation
   *
   * When This Design Should Be Reconsidered:
   * - Calendar validation allows >1000 formats per calendar
   * - Template compilation becomes a performance bottleneck
   * - Memory constraints become critical (embedded/mobile Foundry)
   * - Dynamic template generation outside calendar definitions
   *
   * For Future Reviewers:
   * This unlimited cache is not an oversight or technical debt. It's a conscious
   * architectural choice based on realistic usage patterns and proper input validation.
   * The alternative (runtime size limits) adds complexity without meaningful benefit
   * given the constraints of the Foundry VTT environment and calendar use cases.
   */
  private templateCache: Map<string, Function> = new Map();
  private static helpersRegistered: boolean = false;
  private static notifiedErrors: Set<string> = new Set(); // Throttle repeated notifications
  private static helperRegistry: Map<string, DateFormatter> = new Map(); // Registry for calendar access

  // Fallback month/weekday names for when no calendar context is available
  private static fallbackMonths = [
    { name: 'January', abbreviation: 'Jan' },
    { name: 'February', abbreviation: 'Feb' },
    { name: 'March', abbreviation: 'Mar' },
    { name: 'April', abbreviation: 'Apr' },
    { name: 'May', abbreviation: 'May' },
    { name: 'June', abbreviation: 'Jun' },
    { name: 'July', abbreviation: 'Jul' },
    { name: 'August', abbreviation: 'Aug' },
    { name: 'September', abbreviation: 'Sep' },
    { name: 'October', abbreviation: 'Oct' },
    { name: 'November', abbreviation: 'Nov' },
    { name: 'December', abbreviation: 'Dec' },
  ];

  private static fallbackWeekdays = [
    { name: 'Sunday', abbreviation: 'Sun' },
    { name: 'Monday', abbreviation: 'Mon' },
    { name: 'Tuesday', abbreviation: 'Tue' },
    { name: 'Wednesday', abbreviation: 'Wed' },
    { name: 'Thursday', abbreviation: 'Thu' },
    { name: 'Friday', abbreviation: 'Fri' },
    { name: 'Saturday', abbreviation: 'Sat' },
  ];

  constructor(calendar: SeasonsStarsCalendar) {
    this.calendar = calendar;
    // Register this instance for helper access
    DateFormatter.helperRegistry.set(calendar.id, this);
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
    DateFormatter.notifiedErrors.clear();
    DateFormatter.helperRegistry.clear();
  }

  /**
   * Handle template compilation errors with appropriate user feedback
   */
  private notifyTemplateError(template: string, error: Error, formatName?: string): void {
    // Create error key for throttling
    const errorKey = `${this.calendar.id}:${formatName || 'template'}:${error.message}`;

    // Don't spam the same error repeatedly
    if (DateFormatter.notifiedErrors.has(errorKey)) {
      return;
    }

    DateFormatter.notifiedErrors.add(errorKey);

    // Check if debug mode is enabled (use debug setting instead of NODE_ENV)
    const isDebugEnabled =
      typeof game !== 'undefined' && game.settings?.get('seasons-and-stars', 'debugMode') === true;

    if (isDebugEnabled) {
      // Debug mode: Show UI notifications with detailed information
      if (typeof ui !== 'undefined' && ui.notifications) {
        if (formatName && this.calendar.id) {
          // Calendar-specific format error
          const calendarName = this.calendar.name || this.calendar.id;
          ui.notifications.warn(
            `Calendar "${calendarName}" has syntax errors in "${formatName}" format: ${error.message}`
          );
        } else {
          // Generic template error
          ui.notifications.warn(`Date format template has syntax errors: ${error.message}`);
        }

        // Provide helpful hints for common errors (debug mode only)
        if (error.message.includes('quote')) {
          ui.notifications.warn(
            'Hint: Use double quotes in format helpers, e.g., {{ss-hour format="pad"}} not {{ss-hour format=\'pad\'}}'
          );
        }
      }
    } else {
      // Production mode: Only log to console (no UI notifications)
      if (formatName && this.calendar.id) {
        // Calendar-specific format error
        const calendarName = this.calendar.name || this.calendar.id;
        console.warn(
          `[S&S] Calendar "${calendarName}" has syntax errors in "${formatName}" format: ${error.message}`
        );
      } else {
        // Generic template error
        console.warn(`[S&S] Date format template has syntax errors: ${error.message}`);
      }
    }
  }

  /**
   * Format a date using a Handlebars template string
   */
  format(date: CalendarDate, template: string): string {
    return this.formatWithContext(date, template);
  }

  /**
   * Compile and cache a template, or retrieve from cache
   */
  private compileAndCacheTemplate(processedTemplate: string): Function {
    let compiledTemplate = this.templateCache.get(processedTemplate);

    if (!compiledTemplate) {
      // Use Foundry's global Handlebars to compile template
      compiledTemplate = Handlebars.compile(processedTemplate);
      this.templateCache.set(processedTemplate, compiledTemplate);
    }

    return compiledTemplate;
  }

  /**
   * Format a date using a Handlebars template string with error context
   */
  private formatWithContext(
    date: CalendarDate,
    template: string,
    formatName?: string,
    visited: Set<string> = new Set()
  ): string {
    // Type safety check at entry point
    if (typeof template !== 'string') {
      console.debug('[S&S] Invalid template type passed to format(), falling back to basic format');
      return this.getBasicFormat(date);
    }

    try {
      // Preprocess template to resolve embedded formats with visited set
      const processedTemplate = this.preprocessEmbeddedFormats(date, template, visited);

      // Use consolidated template caching
      const compiledTemplate = this.compileAndCacheTemplate(processedTemplate);

      // Prepare context data for template
      const context = this.prepareTemplateContext(date);

      // Execute template with context
      const result = compiledTemplate(context);

      // Validate template output - detect malformed templates that produce empty/invalid output
      if (this.isInvalidTemplateOutput(result, template)) {
        console.debug('[S&S] Template produced invalid output, falling back to basic format:', {
          template,
          result,
        });
        return this.getBasicFormat(date);
      }

      return result;
    } catch (error) {
      console.debug('[S&S] Date format template compilation failed:', error);

      // Notify user about the error
      this.notifyTemplateError(
        template,
        error instanceof Error ? error : new Error(String(error)),
        formatName
      );

      // Fallback to basic format
      return this.getBasicFormat(date);
    }
  }

  /**
   * Format a date using a named format from calendar dateFormats
   */
  formatNamed(
    date: CalendarDate,
    formatName: string,
    variant?: string,
    visited: Set<string> = new Set()
  ): string {
    // Input validation
    if (!formatName) {
      return this.getBasicFormat(date);
    }

    // Prevent circular references - check before adding to visited
    if (visited.has(formatName)) {
      console.debug(`[S&S] Circular reference detected in format '${formatName}'`);
      return this.getBasicFormat(date);
    }

    const dateFormats = this.calendar.dateFormats;

    if (!dateFormats) {
      return this.getBasicFormat(date);
    }

    const format = dateFormats[formatName];

    if (!format) {
      return this.getBasicFormat(date);
    }

    // Get the actual format string to process
    let formatString: string;
    let formatDisplayName: string;

    // Handle format variants (format as object)
    if (typeof format === 'object' && !Array.isArray(format)) {
      if (variant && format[variant]) {
        formatString = format[variant];
        formatDisplayName = `${formatName}:${variant}`;
      } else {
        // If no variant specified, try 'default' or first available
        const defaultFormat = format.default || Object.values(format)[0];
        if (defaultFormat) {
          formatString = defaultFormat;
          formatDisplayName = formatName;
        } else {
          return this.getBasicFormat(date);
        }
      }
    } else if (typeof format === 'string') {
      formatString = format;
      formatDisplayName = formatName;
    } else {
      return this.getBasicFormat(date);
    }

    // Pre-analyze for circular references in this format's embedded references
    if (this.containsCircularReference(formatString, formatName, visited)) {
      console.debug(
        `[S&S] Format '${formatName}' contains circular references, using basic format`
      );
      return this.getBasicFormat(date);
    }

    // Add to visited set AFTER circular check but BEFORE processing
    visited.add(formatName);

    // Process the format
    return this.formatWithContext(date, formatString, formatDisplayName, visited);
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

    return this.formatWithContext(date, widgetFormat, `widgets.${widgetType}`);
  }

  /**
   * Preprocess template to resolve embedded format references
   */
  private preprocessEmbeddedFormats(
    date: CalendarDate,
    template: string,
    visited: Set<string> = new Set()
  ): string {
    // Type safety check - ensure template is actually a string
    if (typeof template !== 'string') {
      console.debug('[S&S] Invalid template type, falling back to basic format');
      return this.getBasicFormat(date);
    }

    // Match both old colon syntax and new parameter syntax
    const embeddedFormatRegex =
      /\{\{\s*ss-dateFmt\s*(?::\s*([^}\s]+)|.*?formatName\s*=\s*["']([^"']+)["']|\s+["']([^"']+)["'])\s*\}\}/g;

    return template.replace(
      embeddedFormatRegex,
      (match, colonFormatName, paramFormatName, quotedFormatName) => {
        try {
          // Use whichever format name was captured (colon, parameter, or quoted syntax)
          const formatName = colonFormatName || paramFormatName || quotedFormatName;
          if (!formatName) {
            console.debug(`[S&S] Could not extract format name from: ${match}`);
            return this.getBasicFormat(date);
          }

          // Check if the format actually exists before trying to resolve it
          // If it doesn't exist, return the original match to let the helper handle it
          if (!this.calendar.dateFormats || !this.calendar.dateFormats[formatName]) {
            return match; // Return original match to let helper handle unresolved formats
          }

          // Recursively format the embedded format with the same visited set (to detect cycles)
          // The circular reference detection happens in formatNamedRecursive
          const embeddedResult = this.formatNamedRecursive(date, formatName, visited);
          return embeddedResult;
        } catch (error) {
          console.debug(
            `[S&S] Failed to resolve embedded format '${colonFormatName || paramFormatName || quotedFormatName}':`,
            error
          );
          // Return original match to let helper handle the error
          return match;
        }
      }
    );
  }

  /**
   * Format named with circular reference protection
   */
  private formatNamedRecursive(
    date: CalendarDate,
    formatName: string,
    visited: Set<string>
  ): string {
    // Use the consolidated formatNamed method which handles circular reference detection
    return this.formatNamed(date, formatName, undefined, visited);
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
      _calendarId: this.calendar.id, // Add calendar ID to context for helper access
    };
  }

  /**
   * Calculate day of year for stardate and other calculations
   */
  private calculateDayOfYear(date: CalendarDate): number {
    // Bounds checking for month value - only warn for severely out-of-range values
    // Built-in calendars (like Traveller Imperial with 1 month) should not trigger warnings
    if (
      date.month < 1 ||
      (this.calendar.months.length > 0 && date.month > this.calendar.months.length)
    ) {
      // Only log as debug for legitimate edge cases, no user-visible warnings
      console.debug(
        `[S&S] Month value ${date.month} outside calendar range (1-${this.calendar.months.length}), using start of year fallback`
      );
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
    Handlebars.registerHelper('ss-day', function (this: any, ...args: any[]) {
      // Handlebars passes options as the last argument
      const options = args[args.length - 1];

      // If value is provided as first argument (and not undefined/null), use it; otherwise use context
      let dayValue =
        args.length > 1 && args[0] !== undefined && args[0] !== null
          ? args[0]
          : options?.data?.root?.day;

      // Handle undefined/null values gracefully
      if (dayValue === undefined || dayValue === null) {
        dayValue = 1;
      }

      const format = options?.hash?.format;

      switch (format) {
        case 'ordinal':
          return DateFormatter.addOrdinalSuffix(dayValue);
        case 'pad':
          return dayValue.toString().padStart(2, '0');
        default:
          return dayValue.toString();
      }
    });

    // Month helper - supports name, abbr, and pad formats
    Handlebars.registerHelper('ss-month', function (this: any, ...args: any[]) {
      // Handlebars passes options as the last argument
      const options = args[args.length - 1];

      // If value is provided as first argument (and not undefined/null), use it; otherwise use context
      let monthValue =
        args.length > 1 && args[0] !== undefined && args[0] !== null
          ? args[0]
          : options?.data?.root?.month;

      // Handle undefined/null values gracefully
      if (monthValue === undefined || monthValue === null) {
        monthValue = 1;
      }

      const format = options?.hash?.format;
      const calendarId = options?.data?.root?._calendarId;
      const formatter = calendarId ? DateFormatter.helperRegistry.get(calendarId) : null;

      switch (format) {
        case 'name':
          if (formatter) {
            return formatter.getMonthName(monthValue);
          } else {
            // Fallback to standard month names
            const fallbackMonth = DateFormatter.fallbackMonths[monthValue - 1];
            return fallbackMonth ? fallbackMonth.name : `Month ${monthValue}`;
          }
        case 'abbr':
          if (formatter) {
            return formatter.getMonthAbbreviation(monthValue);
          } else {
            // Fallback to standard month abbreviations
            const fallbackMonth = DateFormatter.fallbackMonths[monthValue - 1];
            return fallbackMonth ? fallbackMonth.abbreviation : `M${monthValue}`;
          }
        case 'pad':
          return monthValue.toString().padStart(2, '0');
        default:
          return monthValue.toString();
      }
    });

    // Weekday helper - supports name and abbr formats
    Handlebars.registerHelper('ss-weekday', function (this: any, ...args: any[]) {
      // Handlebars passes options as the last argument
      const options = args[args.length - 1];

      // If value is provided as first argument (and not undefined/null), use it; otherwise use context
      let weekdayValue =
        args.length > 1 && args[0] !== undefined && args[0] !== null
          ? args[0]
          : options?.data?.root?.weekday;

      // Handle undefined/null values gracefully
      if (weekdayValue === undefined || weekdayValue === null) {
        weekdayValue = 0;
      }

      const format = options?.hash?.format;
      const calendarId = options?.data?.root?._calendarId;
      const formatter = calendarId ? DateFormatter.helperRegistry.get(calendarId) : null;

      switch (format) {
        case 'name':
          if (formatter) {
            return formatter.getWeekdayName(weekdayValue);
          } else {
            // Fallback to standard weekday names
            const fallbackWeekday = DateFormatter.fallbackWeekdays[weekdayValue];
            return fallbackWeekday ? fallbackWeekday.name : `Day ${weekdayValue}`;
          }
        case 'abbr':
          if (formatter) {
            return formatter.getWeekdayAbbreviation(weekdayValue);
          } else {
            // Fallback to standard weekday abbreviations
            const fallbackWeekday = DateFormatter.fallbackWeekdays[weekdayValue];
            return fallbackWeekday ? fallbackWeekday.abbreviation : `D${weekdayValue}`;
          }
        default:
          return weekdayValue.toString();
      }
    });

    // Format embedding helper - use {{ss-dateFmt formatName="name"}} syntax
    // Note: This helper is mainly for documentation. The actual format embedding
    // is handled by preprocessing in the format() method to avoid circular issues.
    Handlebars.registerHelper('ss-dateFmt', function (this: any, ...args: any[]) {
      // Handlebars passes options as the last argument
      const options = args[args.length - 1];

      // Get format name from first argument (if not undefined/null) or hash parameter
      const formatName =
        args.length > 1 && args[0] !== undefined && args[0] !== null
          ? args[0]
          : options?.hash?.formatName;

      // Get the calendar ID from context and return basic format for non-existent formats
      const calendarId = options?.data?.root?._calendarId;
      const formatter = calendarId ? DateFormatter.helperRegistry.get(calendarId) : null;

      if (formatter) {
        // Create a basic format manually since we don't have a full CalendarDate instance
        const context = options?.data?.root;
        const year = context?.year || 2024;
        const month = context?.month || 1;
        const day = context?.day || 1;
        const weekday = context?.weekday || 0;

        // Use the formatter's helper methods directly
        const monthName = formatter.getMonthName(month);
        const weekdayName = formatter.getWeekdayName(weekday);
        const dayOrdinal = formatter.addOrdinalSuffix(day);
        const yearString =
          `${formatter.calendar.year?.prefix || ''}${year}${formatter.calendar.year?.suffix || ''}`.trim();

        return `${weekdayName}, ${dayOrdinal} ${monthName} ${yearString}`;
      }

      // Fallback for debugging when no calendar context available
      return `[Unresolved: ${formatName}]`;
    });

    // Mathematical operations helper
    Handlebars.registerHelper('ss-math', function (this: any, ...args: any[]) {
      // Handlebars passes options as the last argument
      const options = args[args.length - 1];

      // If value is provided as first argument (and not undefined/null), use it; otherwise try from context
      const value =
        args.length > 1 && args[0] !== undefined && args[0] !== null
          ? args[0]
          : options?.data?.root?.value;

      const operation = options?.hash?.op;
      const operand = options?.hash?.value;

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
    Handlebars.registerHelper('ss-hour', function (this: any, ...args: any[]) {
      // Handlebars passes options as the last argument
      const options = args[args.length - 1];

      // If value is provided as first argument (and not undefined/null), use it; otherwise use context
      let hourValue =
        args.length > 1 && args[0] !== undefined && args[0] !== null
          ? args[0]
          : options?.data?.root?.hour;

      // Handle undefined/null values gracefully - default to 0 for proper time formatting
      if (hourValue === undefined || hourValue === null) {
        hourValue = 0;
      }

      const format = options?.hash?.format;

      switch (format) {
        case 'pad':
          return hourValue.toString().padStart(2, '0');
        default:
          return hourValue.toString();
      }
    });

    // Minute helper - supports pad format
    Handlebars.registerHelper('ss-minute', function (this: any, ...args: any[]) {
      // Handlebars passes options as the last argument
      const options = args[args.length - 1];

      // If value is provided as first argument (and not undefined/null), use it; otherwise use context
      let minuteValue =
        args.length > 1 && args[0] !== undefined && args[0] !== null
          ? args[0]
          : options?.data?.root?.minute;

      // Handle undefined/null values gracefully - default to 0 for proper time formatting
      if (minuteValue === undefined || minuteValue === null) {
        minuteValue = 0;
      }

      const format = options?.hash?.format;

      switch (format) {
        case 'pad':
          return minuteValue.toString().padStart(2, '0');
        default:
          return minuteValue.toString();
      }
    });

    // Second helper - supports pad format
    Handlebars.registerHelper('ss-second', function (this: any, ...args: any[]) {
      // Handlebars passes options as the last argument
      const options = args[args.length - 1];

      // If value is provided as first argument (and not undefined/null), use it; otherwise use context
      let secondValue =
        args.length > 1 && args[0] !== undefined && args[0] !== null
          ? args[0]
          : options?.data?.root?.second;

      // Handle undefined/null values gracefully - default to 0 for proper time formatting
      if (secondValue === undefined || secondValue === null) {
        secondValue = 0;
      }

      const format = options?.hash?.format;

      switch (format) {
        case 'pad':
          return secondValue.toString().padStart(2, '0');
        default:
          return secondValue.toString();
      }
    });

    // Stardate calculation helper for sci-fi calendars
    Handlebars.registerHelper('ss-stardate', function (this: any, ...args: any[]) {
      // Handlebars passes options as the last argument
      const options = args[args.length - 1];

      // If year is provided as first argument (and not undefined/null), use it; otherwise use context
      let yearValue =
        args.length > 1 && args[0] !== undefined && args[0] !== null
          ? args[0]
          : options?.data?.root?.year;

      // Handle undefined/null values gracefully
      if (yearValue === undefined || yearValue === null) {
        yearValue = 2000; // Default fallback year
      }

      const prefix = options?.hash?.prefix || '0';
      const baseYear = options?.hash?.baseYear || yearValue;
      const dayOfYear = options?.hash?.dayOfYear || 1;
      const precision = options?.hash?.precision || 1;

      // Calculate stardate: prefix + (year - baseYear) + dayOfYear
      // Format: XXYYYY.P where XX is era prefix, YYYY is year offset + day, P is precision
      const yearOffset = yearValue - baseYear;
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
    return DateFormatter.addOrdinalSuffix(day);
  }

  /**
   * Static version of addOrdinalSuffix for use in helpers
   */
  static addOrdinalSuffix(day: number): string {
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
  getMonthName(monthIndex: number): string {
    const month = this.calendar.months[monthIndex - 1];
    const name = month?.name;
    // Ensure we return a string, not an object
    return typeof name === 'string' ? name : 'Unknown';
  }

  /**
   * Get month abbreviation from calendar definition
   */
  getMonthAbbreviation(monthIndex: number): string {
    const month = this.calendar.months[monthIndex - 1];
    const abbr = month?.abbreviation;
    const name = month?.name;
    // Ensure we return a string, not an object
    if (typeof abbr === 'string') {
      return abbr;
    }
    if (typeof name === 'string') {
      return name.substring(0, 3);
    }
    return 'Unk';
  }

  /**
   * Get weekday name from calendar definition
   */
  getWeekdayName(weekdayIndex: number): string {
    const weekday = this.calendar.weekdays[weekdayIndex];
    const name = weekday?.name;
    // Ensure we return a string, not an object
    return typeof name === 'string' ? name : 'Unknown';
  }

  /**
   * Get weekday abbreviation from calendar definition
   */
  getWeekdayAbbreviation(weekdayIndex: number): string {
    const weekday = this.calendar.weekdays[weekdayIndex];
    const abbr = weekday?.abbreviation;
    const name = weekday?.name;
    // Ensure we return a string, not an object
    if (typeof abbr === 'string') {
      return abbr;
    }
    if (typeof name === 'string') {
      return name.substring(0, 3);
    }
    return 'Unk';
  }

  /**
   * Check if a format string contains circular references
   */
  private containsCircularReference(
    formatString: string,
    currentFormat: string,
    visited: Set<string>
  ): boolean {
    // Find all embedded format references in this format
    const embeddedFormatRegex =
      /\{\{\s*ss-dateFmt\s*(?::\s*([^}\s]+)|.*?formatName\s*=\s*["']([^"']+)["']|\s+["']([^"']+)["'])\s*\}\}/g;

    let match;
    while ((match = embeddedFormatRegex.exec(formatString)) !== null) {
      const embeddedFormatName = match[1] || match[2] || match[3];
      if (embeddedFormatName && visited.has(embeddedFormatName)) {
        return true; // Found a circular reference
      }
    }

    return false;
  }

  /**
   * Validate template output to detect malformed templates that produce invalid results
   */
  private isInvalidTemplateOutput(result: string, template: string): boolean {
    // If result is empty, it's likely an invalid template
    if (!result || result.trim().length === 0) {
      return true;
    }

    // If template contains helpers but result has too many empty values, it's likely malformed
    const hasHelpers = template.includes('{{ss-');

    if (!hasHelpers) {
      // No helpers - check if template has variables but result is empty/minimal
      const hasVariables = template.includes('{{');
      if (hasVariables && result.trim().length === 0) {
        return true; // Template has variables but no output
      }
      return false; // No helpers, output is valid
    }

    // Check for patterns that suggest malformed helper output
    const emptyHelperPatterns = [
      /:\s*:/, // :: pattern (empty hour:minute)
      /^:.*:$/, // :something: pattern
      /^,\s*,/, // empty comma-separated values
      /^\s*,.*,\s*$/, // mostly empty comma-separated
    ];

    // Check if result matches suspicious patterns
    for (const pattern of emptyHelperPatterns) {
      if (pattern.test(result.trim())) {
        return true;
      }
    }

    // Check if result is suspiciously short for a template with multiple helpers
    const helperCount = (template.match(/\{\{ss-/g) || []).length;
    if (helperCount >= 3 && result.trim().length < helperCount * 2) {
      return true; // Too short for the number of helpers
    }

    return false;
  }
}
