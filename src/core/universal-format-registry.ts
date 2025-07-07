/**
 * Universal Format Registry - Standardized date formats that work across all calendars
 *
 * Provides fallback formatting when calendars don't define specific formats
 * and enables cross-calendar format compatibility.
 */

import type { SeasonsStarsCalendar } from '../types/calendar';
import { Logger } from './logger';

/**
 * Standard format names available across all calendars
 */
export type UniversalFormatName =
  | 'iso'
  | 'short'
  | 'long'
  | 'numeric'
  | 'compact'
  | 'formal'
  | 'year-only'
  | 'month-day'
  | 'weekday-short'
  | 'time-12h'
  | 'time-24h'
  | 'datetime-short'
  | 'datetime-long';

/**
 * Universal format definition
 */
export interface UniversalFormat {
  /** Template using Handlebars syntax with S&S helpers */
  template: string;
  /** Human-readable description of the format */
  description: string;
  /** Whether this format requires time information */
  requiresTime?: boolean;
  /** Whether this format requires weekday information */
  requiresWeekday?: boolean;
  /** Whether this format works best with specific calendar types */
  preferredFor?: string[];
}

/**
 * Registry of universal date formats
 */
export class UniversalFormatRegistry {
  private static instance: UniversalFormatRegistry | null = null;
  private formats: Map<UniversalFormatName, UniversalFormat> = new Map();
  private calendarFormats: Map<string, Map<string, string>> = new Map();

  private constructor() {
    this.initializeUniversalFormats();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): UniversalFormatRegistry {
    if (!UniversalFormatRegistry.instance) {
      UniversalFormatRegistry.instance = new UniversalFormatRegistry();
    }
    return UniversalFormatRegistry.instance;
  }

  /**
   * Reset the instance for testing
   * @internal
   */
  static resetForTesting(): void {
    UniversalFormatRegistry.instance = null;
  }

  /**
   * Initialize the built-in universal formats
   */
  private initializeUniversalFormats(): void {
    this.formats.set('iso', {
      template: '{{year}}-{{ss-month format="pad"}}-{{ss-day format="pad"}}',
      description: 'ISO 8601 date format (YYYY-MM-DD)',
    });

    this.formats.set('short', {
      template: '{{ss-month format="abbr"}} {{ss-day}}',
      description: 'Short date format (Mon DD)',
    });

    this.formats.set('long', {
      template:
        '{{ss-weekday format="name"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}} {{year}}',
      description: 'Long date format (Weekday, DDth Month YYYY)',
      requiresWeekday: true,
    });

    this.formats.set('numeric', {
      template: '{{ss-month}}/{{ss-day}}/{{year}}',
      description: 'Numeric date format (MM/DD/YYYY)',
    });

    this.formats.set('compact', {
      template: '{{ss-month format="pad"}}{{ss-day format="pad"}}{{year}}',
      description: 'Compact date format (MMDDYYYY)',
    });

    this.formats.set('formal', {
      template: '{{ss-day format="ordinal"}} day of {{ss-month format="name"}}, {{year}}',
      description: 'Formal date format (DDth day of Month, YYYY)',
    });

    this.formats.set('year-only', {
      template: '{{year}}',
      description: 'Year only',
    });

    this.formats.set('month-day', {
      template: '{{ss-month format="name"}} {{ss-day}}',
      description: 'Month and day only (Month DD)',
    });

    this.formats.set('weekday-short', {
      template: '{{ss-weekday format="abbr"}}, {{ss-month format="abbr"}} {{ss-day}}',
      description: 'Short weekday format (Wed, Mon DD)',
      requiresWeekday: true,
    });

    this.formats.set('time-12h', {
      template:
        '{{#if hour}}{{#if minute}}{{ss-hour}}:{{ss-minute format="pad"}}{{else}}{{ss-hour}}:00{{/if}}{{else}}12:00{{/if}} {{#if hour}}{{#if (ss-math hour op="lt" value=12)}}AM{{else}}PM{{/if}}{{else}}AM{{/if}}',
      description: '12-hour time format (HH:MM AM/PM)',
      requiresTime: true,
    });

    this.formats.set('time-24h', {
      template: '{{ss-hour format="pad"}}:{{ss-minute format="pad"}}',
      description: '24-hour time format (HH:MM)',
      requiresTime: true,
    });

    this.formats.set('datetime-short', {
      template:
        '{{ss-month format="abbr"}} {{ss-day}} {{ss-hour format="pad"}}:{{ss-minute format="pad"}}',
      description: 'Short date and time (Mon DD HH:MM)',
      requiresTime: true,
    });

    this.formats.set('datetime-long', {
      template:
        '{{ss-weekday format="name"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}} {{year}} {{ss-hour format="pad"}}:{{ss-minute format="pad"}}',
      description: 'Long date and time (Weekday, DDth Month YYYY HH:MM)',
      requiresTime: true,
      requiresWeekday: true,
    });
  }

  /**
   * Get a universal format by name
   */
  getUniversalFormat(name: UniversalFormatName): UniversalFormat | null {
    return this.formats.get(name) || null;
  }

  /**
   * Get all available universal format names
   */
  getAvailableFormats(): UniversalFormatName[] {
    return Array.from(this.formats.keys());
  }

  /**
   * Get formats suitable for a specific use case
   */
  getFormatsForUse(options: {
    includeTime?: boolean;
    includeWeekday?: boolean;
    preferCompact?: boolean;
  }): UniversalFormatName[] {
    const { includeTime = false, includeWeekday = true, preferCompact = false } = options;

    return this.getAvailableFormats().filter(name => {
      const format = this.formats.get(name);
      if (!format) return false;

      // Filter by time requirement
      if (!includeTime && format.requiresTime) return false;
      if (includeTime && !format.requiresTime && !name.includes('time')) return false;

      // Filter by weekday requirement
      if (!includeWeekday && format.requiresWeekday) return false;

      // Apply compact preference
      if (preferCompact && !['compact', 'short', 'numeric'].includes(name)) return false;

      return true;
    });
  }

  /**
   * Register or update a universal format
   */
  registerFormat(name: UniversalFormatName, format: UniversalFormat): void {
    this.formats.set(name, format);
    Logger.debug(`Registered universal format: ${name}`);
  }

  /**
   * Index calendar formats for fast lookup
   */
  indexCalendarFormats(calendar: SeasonsStarsCalendar): void {
    if (!calendar.dateFormats) return;

    const formatMap = new Map<string, string>();

    // Index all calendar-specific formats
    for (const [formatName, formatValue] of Object.entries(calendar.dateFormats)) {
      if (formatName === 'widgets') continue; // Skip widget formats for now

      if (typeof formatValue === 'string') {
        formatMap.set(formatName, formatValue);
      } else if (typeof formatValue === 'object' && formatValue !== null) {
        // Handle format variants
        for (const [variantName, variantValue] of Object.entries(formatValue)) {
          if (typeof variantValue === 'string') {
            formatMap.set(`${formatName}:${variantName}`, variantValue);
          }
        }
      }
    }

    this.calendarFormats.set(calendar.id, formatMap);
    Logger.debug(`Indexed ${formatMap.size} formats for calendar: ${calendar.id}`);
  }

  /**
   * Check if a calendar has a specific format
   */
  hasCalendarFormat(calendarId: string, formatName: string): boolean {
    const calendarFormats = this.calendarFormats.get(calendarId);
    return calendarFormats ? calendarFormats.has(formatName) : false;
  }

  /**
   * Get a calendar-specific format template
   */
  getCalendarFormat(calendarId: string, formatName: string): string | null {
    const calendarFormats = this.calendarFormats.get(calendarId);
    return calendarFormats ? calendarFormats.get(formatName) || null : null;
  }

  /**
   * Get format template with fallback to universal format
   */
  getFormatWithFallback(
    calendarId: string,
    formatName: string,
    universalFallback?: UniversalFormatName
  ): string | null {
    // First try calendar-specific format
    const calendarFormat = this.getCalendarFormat(calendarId, formatName);
    if (calendarFormat) {
      return calendarFormat;
    }

    // Try universal format with same name
    const universalFormat = this.formats.get(formatName as UniversalFormatName);
    if (universalFormat) {
      return universalFormat.template;
    }

    // Try explicit universal fallback
    if (universalFallback) {
      const fallbackFormat = this.formats.get(universalFallback);
      if (fallbackFormat) {
        return fallbackFormat.template;
      }
    }

    return null;
  }

  /**
   * Generate format suggestions for a calendar based on its capabilities
   */
  getSuggestedFormats(calendar: SeasonsStarsCalendar): {
    formatName: UniversalFormatName;
    template: string;
    reason: string;
  }[] {
    const suggestions: {
      formatName: UniversalFormatName;
      template: string;
      reason: string;
    }[] = [];

    const hasTime = calendar.time !== undefined;
    const hasWeekdays = calendar.weekdays && calendar.weekdays.length > 0;
    const hasMonths = calendar.months && calendar.months.length > 0;

    // Always suggest basic formats
    const shortFormat = this.formats.get('short');
    if (shortFormat) {
      suggestions.push({
        formatName: 'short',
        template: shortFormat.template,
        reason: 'Compact format suitable for UI elements',
      });
    }

    const isoFormat = this.formats.get('iso');
    if (isoFormat) {
      suggestions.push({
        formatName: 'iso',
        template: isoFormat.template,
        reason: 'Standardized format for data exchange',
      });
    }

    if (hasWeekdays) {
      const longFormat = this.formats.get('long');
      if (longFormat) {
        suggestions.push({
          formatName: 'long',
          template: longFormat.template,
          reason: 'Full format including weekday information',
        });
      }
    }

    if (hasTime) {
      const datetimeFormat = this.formats.get('datetime-short');
      if (datetimeFormat) {
        suggestions.push({
          formatName: 'datetime-short',
          template: datetimeFormat.template,
          reason: 'Date and time for detailed display',
        });
      }
    }

    if (hasMonths && calendar.months.length <= 12) {
      const formalFormat = this.formats.get('formal');
      if (formalFormat) {
        suggestions.push({
          formatName: 'formal',
          template: formalFormat.template,
          reason: 'Formal format for ceremonial use',
        });
      }
    }

    return suggestions;
  }

  /**
   * Validate calendar compatibility with universal formats
   */
  validateCalendarCompatibility(calendar: SeasonsStarsCalendar): {
    compatible: UniversalFormatName[];
    incompatible: { format: UniversalFormatName; reason: string }[];
  } {
    const compatible: UniversalFormatName[] = [];
    const incompatible: { format: UniversalFormatName; reason: string }[] = [];

    const hasTime = calendar.time !== undefined;
    const hasWeekdays = calendar.weekdays && calendar.weekdays.length > 0;
    const hasMonths = calendar.months && calendar.months.length > 0;

    for (const [formatName, format] of this.formats.entries()) {
      if (format.requiresTime && !hasTime) {
        incompatible.push({
          format: formatName,
          reason: 'Calendar does not define time system',
        });
        continue;
      }

      if (format.requiresWeekday && !hasWeekdays) {
        incompatible.push({
          format: formatName,
          reason: 'Calendar does not define weekdays',
        });
        continue;
      }

      if (!hasMonths && formatName !== 'year-only') {
        incompatible.push({
          format: formatName,
          reason: 'Calendar does not define months',
        });
        continue;
      }

      compatible.push(formatName);
    }

    return { compatible, incompatible };
  }

  /**
   * Get format statistics for debugging
   */
  getStatistics(): {
    universalFormats: number;
    indexedCalendars: number;
    totalCalendarFormats: number;
  } {
    let totalCalendarFormats = 0;
    for (const formatMap of this.calendarFormats.values()) {
      totalCalendarFormats += formatMap.size;
    }

    return {
      universalFormats: this.formats.size,
      indexedCalendars: this.calendarFormats.size,
      totalCalendarFormats,
    };
  }
}
