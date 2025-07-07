/**
 * Format Converter - Cross-calendar format compatibility
 *
 * Handles conversion of date formats between different calendar systems
 * and provides intelligent format mapping based on calendar capabilities.
 */

import type { SeasonsStarsCalendar } from '../types/calendar';
import type {
  ExtendedFormatOptions,
  FormatResolution,
  FormatCapabilities,
  FormatSuggestion,
  FormatValidation,
  FormatConversionOptions,
} from '../types/universal-formats';
import { UniversalFormatRegistry, type UniversalFormatName } from './universal-format-registry';
import { Logger } from './logger';

/**
 * Format converter for cross-calendar compatibility
 */
export class FormatConverter {
  private static instance: FormatConverter | null = null;
  private registry: UniversalFormatRegistry;
  private calendarCapabilities: Map<string, FormatCapabilities> = new Map();

  private constructor() {
    this.registry = UniversalFormatRegistry.getInstance();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): FormatConverter {
    if (!FormatConverter.instance) {
      FormatConverter.instance = new FormatConverter();
    }
    return FormatConverter.instance;
  }

  /**
   * Reset the instance for testing
   * @internal
   */
  static resetForTesting(): void {
    FormatConverter.instance = null;
  }

  /**
   * Resolve a format for a specific calendar with fallback support
   */
  resolveFormat(calendar: SeasonsStarsCalendar, options: ExtendedFormatOptions): FormatResolution {
    const { formatName, universalFormat, variant, fallback, preferUniversal = false } = options;

    // If preferUniversal is true, try universal format first
    if (preferUniversal && universalFormat) {
      const universalResult = this.tryUniversalFormat(universalFormat);
      if (universalResult) {
        return universalResult;
      }
    }

    // Try calendar-specific format
    if (formatName) {
      const calendarResult = this.tryCalendarFormat(calendar, formatName, variant);
      if (calendarResult) {
        return calendarResult;
      }
    }

    // Try universal format if not tried yet
    if (!preferUniversal && universalFormat) {
      const universalResult = this.tryUniversalFormat(universalFormat);
      if (universalResult) {
        return universalResult;
      }
    }

    // Try fallback universal format
    if (fallback) {
      const fallbackResult = this.tryUniversalFormat(fallback);
      if (fallbackResult) {
        return {
          ...fallbackResult,
          usedFallback: true,
        };
      }
    }

    // Final fallback to 'short' universal format
    const shortFormat = this.tryUniversalFormat('short');
    if (shortFormat) {
      return {
        ...shortFormat,
        usedFallback: true,
      };
    }

    // Ultimate fallback
    return {
      template: '{{ss-month format="abbr"}} {{ss-day}}, {{year}}',
      isUniversal: true,
      resolvedName: 'basic-fallback',
      usedFallback: true,
    };
  }

  /**
   * Try to get a calendar-specific format
   */
  private tryCalendarFormat(
    calendar: SeasonsStarsCalendar,
    formatName: string,
    variant?: string
  ): FormatResolution | null {
    if (!calendar.dateFormats) {
      return null;
    }

    const format = calendar.dateFormats[formatName];
    if (!format) {
      return null;
    }

    let template: string;
    let resolvedName: string;

    if (typeof format === 'string') {
      template = format;
      resolvedName = formatName;
    } else if (typeof format === 'object' && format !== null) {
      if (variant && format[variant]) {
        template = format[variant];
        resolvedName = `${formatName}:${variant}`;
      } else {
        // Try 'default' or first available variant
        const defaultFormat = format.default || Object.values(format)[0];
        if (typeof defaultFormat === 'string') {
          template = defaultFormat;
          resolvedName = formatName;
        } else {
          return null;
        }
      }
    } else {
      return null;
    }

    return {
      template,
      isUniversal: false,
      resolvedName,
      usedFallback: false,
    };
  }

  /**
   * Try to get a universal format
   */
  private tryUniversalFormat(formatName: UniversalFormatName): FormatResolution | null {
    const format = this.registry.getUniversalFormat(formatName);
    if (!format) {
      return null;
    }

    return {
      template: format.template,
      isUniversal: true,
      resolvedName: formatName,
      usedFallback: false,
    };
  }

  /**
   * Analyze calendar capabilities for format compatibility
   */
  analyzeCalendarCapabilities(calendar: SeasonsStarsCalendar): FormatCapabilities {
    // Check if we've already analyzed this calendar
    const cached = this.calendarCapabilities.get(calendar.id);
    if (cached) {
      return cached;
    }

    const supportsTime = calendar.time !== undefined;
    const supportsWeekdays = Boolean(calendar.weekdays && calendar.weekdays.length > 0);
    const supportsMonths = Boolean(calendar.months && calendar.months.length > 0);

    const customFormatCount = calendar.dateFormats ? Object.keys(calendar.dateFormats).length : 0;

    // Get compatible universal formats
    const compatibilityResult = this.registry.validateCalendarCompatibility(calendar);
    const compatibleUniversalFormats = compatibilityResult.compatible;

    const capabilities: FormatCapabilities = {
      supportsTime,
      supportsWeekdays,
      supportsMonths,
      customFormatCount,
      compatibleUniversalFormats,
    };

    // Cache the result
    this.calendarCapabilities.set(calendar.id, capabilities);

    Logger.debug(`Analyzed capabilities for calendar ${calendar.id}:`, capabilities);

    return capabilities;
  }

  /**
   * Get format suggestions for a calendar
   */
  getFormatSuggestions(calendar: SeasonsStarsCalendar): FormatSuggestion[] {
    const capabilities = this.analyzeCalendarCapabilities(calendar);
    const suggestions = this.registry.getSuggestedFormats(calendar);

    // Add priority based on calendar capabilities
    return suggestions
      .map(suggestion => {
        let priority = 5; // Base priority

        // Increase priority for formats that match calendar capabilities
        const format = this.registry.getUniversalFormat(suggestion.formatName);
        if (format) {
          if (format.requiresTime && capabilities.supportsTime) priority += 2;
          if (format.requiresWeekday && capabilities.supportsWeekdays) priority += 2;
          if (!format.requiresTime && !capabilities.supportsTime) priority += 1;
          if (!format.requiresWeekday && !capabilities.supportsWeekdays) priority += 1;
        }

        // Increase priority for essential formats
        if (['short', 'long', 'iso'].includes(suggestion.formatName)) priority += 3;

        return {
          ...suggestion,
          description: format?.description || suggestion.reason,
          priority,
        };
      })
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Validate a format against a calendar
   */
  validateFormat(calendar: SeasonsStarsCalendar, formatName: string): FormatValidation {
    const warnings: string[] = [];
    const missingFeatures: string[] = [];

    // Check if it's a universal format
    const universalFormat = this.registry.getUniversalFormat(formatName as UniversalFormatName);

    if (universalFormat) {
      // Validate universal format against calendar capabilities
      const capabilities = this.analyzeCalendarCapabilities(calendar);

      if (universalFormat.requiresTime && !capabilities.supportsTime) {
        missingFeatures.push('time system');
      }

      if (universalFormat.requiresWeekday && !capabilities.supportsWeekdays) {
        missingFeatures.push('weekday definitions');
      }

      if (!capabilities.supportsMonths && formatName !== 'year-only') {
        missingFeatures.push('month definitions');
      }

      // Add warnings for suboptimal usage
      if (universalFormat.requiresTime && capabilities.supportsTime) {
        if (!calendar.time?.hoursInDay) {
          warnings.push('Calendar time system may not support hour formatting');
        }
      }

      return {
        isValid: missingFeatures.length === 0,
        error:
          missingFeatures.length > 0 ? `Format requires: ${missingFeatures.join(', ')}` : undefined,
        warnings,
        missingFeatures,
      };
    }

    // Check if it's a calendar-specific format
    if (calendar.dateFormats && calendar.dateFormats[formatName]) {
      // Calendar has this format defined
      return {
        isValid: true,
        warnings: [],
        missingFeatures: [],
      };
    }

    // Format not found
    return {
      isValid: false,
      error: `Format '${formatName}' not found in calendar or universal registry`,
      warnings: [],
      missingFeatures: ['format definition'],
    };
  }

  /**
   * Convert a format from one calendar to another
   */
  convertFormat(options: FormatConversionOptions): {
    success: boolean;
    targetFormat?: string;
    sourceFormat: string;
    error?: string;
    approximations?: string[];
  } {
    const { sourceCalendar, targetCalendar } = options;

    // This is a simplified implementation
    // In a full implementation, this would analyze the semantic meaning
    // of formats and find equivalent representations

    Logger.debug(`Converting format from ${sourceCalendar} to ${targetCalendar}`);

    // For now, suggest using universal formats for cross-calendar compatibility
    const universalFormats = this.registry.getAvailableFormats();
    const compatibleFormats = universalFormats.filter(_formatName => {
      // Check if both calendars can use this format
      // This would require analyzing both calendars' capabilities
      return true; // Simplified for now
    });

    if (compatibleFormats.length > 0) {
      return {
        success: true,
        targetFormat: compatibleFormats[0],
        sourceFormat: 'unknown',
        approximations: ['Using universal format for cross-calendar compatibility'],
      };
    }

    return {
      success: false,
      sourceFormat: 'unknown',
      error: 'No compatible format found for cross-calendar conversion',
    };
  }

  /**
   * Get optimal format for a specific use case
   */
  getOptimalFormat(
    calendar: SeasonsStarsCalendar,
    useCase: 'ui-compact' | 'ui-full' | 'data-exchange' | 'user-display'
  ): FormatResolution {
    const capabilities = this.analyzeCalendarCapabilities(calendar);

    let universalFormat: UniversalFormatName;

    switch (useCase) {
      case 'ui-compact':
        universalFormat = 'short';
        break;
      case 'ui-full':
        universalFormat = capabilities.supportsWeekdays ? 'long' : 'formal';
        break;
      case 'data-exchange':
        universalFormat = 'iso';
        break;
      case 'user-display':
        universalFormat = capabilities.supportsWeekdays ? 'long' : 'short';
        break;
      default:
        universalFormat = 'short';
    }

    return this.resolveFormat(calendar, { universalFormat });
  }

  /**
   * Clear calendar capabilities cache
   */
  clearCapabilitiesCache(): void {
    this.calendarCapabilities.clear();
    Logger.debug('Cleared calendar capabilities cache');
  }

  /**
   * Get conversion statistics
   */
  getStatistics(): {
    cachedCapabilities: number;
    availableUniversalFormats: number;
    registryStats: ReturnType<UniversalFormatRegistry['getStatistics']>;
  } {
    return {
      cachedCapabilities: this.calendarCapabilities.size,
      availableUniversalFormats: this.registry.getAvailableFormats().length,
      registryStats: this.registry.getStatistics(),
    };
  }
}
