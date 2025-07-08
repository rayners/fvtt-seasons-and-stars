/**
 * Universal Format System Tests
 * Tests the universal format registry, format converter, and integration with DateFormatter
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  UniversalFormatRegistry,
  type UniversalFormatName,
} from '../src/core/universal-format-registry';
import { FormatConverter } from '../src/core/format-converter';
import { DateFormatter } from '../src/core/date-formatter';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Mock Logger
vi.mock('../src/core/logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Handlebars global
const mockHandlebars = {
  compile: vi.fn((template: string) => {
    return vi.fn(() => template); // Simple mock that returns the template
  }),
  registerHelper: vi.fn(),
};

(globalThis as any).Handlebars = mockHandlebars;

describe('UniversalFormatRegistry', () => {
  let registry: UniversalFormatRegistry;

  beforeEach(() => {
    UniversalFormatRegistry.resetForTesting();
    registry = UniversalFormatRegistry.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = UniversalFormatRegistry.getInstance();
      const instance2 = UniversalFormatRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should reset for testing', () => {
      const instance1 = UniversalFormatRegistry.getInstance();
      UniversalFormatRegistry.resetForTesting();
      const instance2 = UniversalFormatRegistry.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Universal Formats', () => {
    it('should provide built-in universal formats', () => {
      const availableFormats = registry.getAvailableFormats();
      expect(availableFormats).toContain('iso');
      expect(availableFormats).toContain('short');
      expect(availableFormats).toContain('long');
      expect(availableFormats).toContain('numeric');
    });

    it('should return format details', () => {
      const isoFormat = registry.getUniversalFormat('iso');
      expect(isoFormat).toBeDefined();
      expect(isoFormat?.template).toBe(
        '{{year}}-{{ss-month format="pad"}}-{{ss-day format="pad"}}'
      );
      expect(isoFormat?.description).toContain('ISO 8601');
    });

    it('should return null for non-existent formats', () => {
      const nonExistent = registry.getUniversalFormat('non-existent' as UniversalFormatName);
      expect(nonExistent).toBeNull();
    });

    it('should allow registering new formats', () => {
      registry.registerFormat('custom' as UniversalFormatName, {
        template: '{{day}}-{{month}}-{{year}}',
        description: 'Custom format',
      });

      const customFormat = registry.getUniversalFormat('custom' as UniversalFormatName);
      expect(customFormat).toBeDefined();
      expect(customFormat?.template).toBe('{{day}}-{{month}}-{{year}}');
    });
  });

  describe('Format Filtering', () => {
    it('should filter formats by time requirement', () => {
      const timeFormats = registry.getFormatsForUse({ includeTime: true });
      expect(timeFormats).toContain('time-24h');
      expect(timeFormats).toContain('datetime-short');
      expect(timeFormats).not.toContain('short');
    });

    it('should filter formats by weekday requirement', () => {
      const noWeekdayFormats = registry.getFormatsForUse({ includeWeekday: false });
      expect(noWeekdayFormats).not.toContain('long');
      expect(noWeekdayFormats).toContain('short');
    });

    it('should filter formats for compact use', () => {
      const compactFormats = registry.getFormatsForUse({ preferCompact: true });
      expect(compactFormats).toContain('compact');
      expect(compactFormats).toContain('short');
      expect(compactFormats).not.toContain('long');
    });
  });

  describe('Calendar Format Indexing', () => {
    it('should index calendar formats', () => {
      const mockCalendar: SeasonsStarsCalendar = {
        id: 'test-calendar',
        name: 'Test Calendar',
        months: [],
        weekdays: [],
        year: { epoch: 0, currentYear: 2024, prefix: '', suffix: '', startDay: 0 },
        dateFormats: {
          custom: 'Custom {{day}} format',
          variant: {
            default: 'Default variant',
            alternative: 'Alternative variant',
          },
        },
      };

      registry.indexCalendarFormats(mockCalendar);

      expect(registry.hasCalendarFormat('test-calendar', 'custom')).toBe(true);
      expect(registry.hasCalendarFormat('test-calendar', 'variant:default')).toBe(true);
      expect(registry.hasCalendarFormat('test-calendar', 'variant:alternative')).toBe(true);
      expect(registry.hasCalendarFormat('test-calendar', 'non-existent')).toBe(false);
    });

    it('should retrieve calendar format templates', () => {
      const mockCalendar: SeasonsStarsCalendar = {
        id: 'test-calendar',
        name: 'Test Calendar',
        months: [],
        weekdays: [],
        year: { epoch: 0, currentYear: 2024, prefix: '', suffix: '', startDay: 0 },
        dateFormats: {
          custom: 'Custom {{day}} format',
        },
      };

      registry.indexCalendarFormats(mockCalendar);

      const template = registry.getCalendarFormat('test-calendar', 'custom');
      expect(template).toBe('Custom {{day}} format');
    });

    it('should provide format with fallback', () => {
      const mockCalendar: SeasonsStarsCalendar = {
        id: 'test-calendar',
        name: 'Test Calendar',
        months: [],
        weekdays: [],
        year: { epoch: 0, currentYear: 2024, prefix: '', suffix: '', startDay: 0 },
        dateFormats: {
          custom: 'Custom {{day}} format',
        },
      };

      registry.indexCalendarFormats(mockCalendar);

      // Should return calendar-specific format
      const calendarFormat = registry.getFormatWithFallback('test-calendar', 'custom');
      expect(calendarFormat).toBe('Custom {{day}} format');

      // Should return universal format
      const universalFormat = registry.getFormatWithFallback('test-calendar', 'short');
      expect(universalFormat).toBe('{{ss-month format="abbr"}} {{ss-day}}');

      // Should return fallback universal format
      const fallbackFormat = registry.getFormatWithFallback('test-calendar', 'non-existent', 'iso');
      expect(fallbackFormat).toBe('{{year}}-{{ss-month format="pad"}}-{{ss-day format="pad"}}');
    });
  });

  describe('Calendar Compatibility', () => {
    it('should validate calendar compatibility', () => {
      const mockCalendar: SeasonsStarsCalendar = {
        id: 'test-calendar',
        name: 'Test Calendar',
        months: [{ name: 'Month1', abbreviation: 'M1', days: 30 }],
        weekdays: [{ name: 'Day1', abbreviation: 'D1' }],
        year: { epoch: 0, currentYear: 2024, prefix: '', suffix: '', startDay: 0 },
        time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
      };

      const compatibility = registry.validateCalendarCompatibility(mockCalendar);

      expect(compatibility.compatible).toContain('iso');
      expect(compatibility.compatible).toContain('short');
      expect(compatibility.compatible).toContain('long');
      expect(compatibility.compatible).toContain('time-24h');
      expect(compatibility.incompatible).toHaveLength(0);
    });

    it('should identify incompatible formats', () => {
      const mockCalendar: SeasonsStarsCalendar = {
        id: 'minimal-calendar',
        name: 'Minimal Calendar',
        months: [],
        weekdays: [],
        year: { epoch: 0, currentYear: 2024, prefix: '', suffix: '', startDay: 0 },
      };

      const compatibility = registry.validateCalendarCompatibility(mockCalendar);

      expect(compatibility.compatible).toContain('year-only');
      expect(compatibility.incompatible.some(inc => inc.format === 'time-24h')).toBe(true);
      expect(compatibility.incompatible.some(inc => inc.format === 'long')).toBe(true);
    });
  });

  describe('Format Suggestions', () => {
    it('should provide format suggestions', () => {
      const mockCalendar: SeasonsStarsCalendar = {
        id: 'test-calendar',
        name: 'Test Calendar',
        months: [{ name: 'Month1', abbreviation: 'M1', days: 30 }],
        weekdays: [{ name: 'Day1', abbreviation: 'D1' }],
        year: { epoch: 0, currentYear: 2024, prefix: '', suffix: '', startDay: 0 },
      };

      const suggestions = registry.getSuggestedFormats(mockCalendar);

      expect(suggestions).toHaveLength(4);
      expect(suggestions[0].formatName).toBe('short');
      expect(suggestions[1].formatName).toBe('iso');
      expect(suggestions[2].formatName).toBe('long');
      expect(suggestions[3].formatName).toBe('formal');
    });
  });
});

describe('FormatConverter', () => {
  let converter: FormatConverter;
  let mockCalendar: SeasonsStarsCalendar;

  beforeEach(() => {
    FormatConverter.resetForTesting();
    UniversalFormatRegistry.resetForTesting();
    converter = FormatConverter.getInstance();

    mockCalendar = {
      id: 'test-calendar',
      name: 'Test Calendar',
      months: [{ name: 'Month1', abbreviation: 'M1', days: 30 }],
      weekdays: [{ name: 'Day1', abbreviation: 'D1' }],
      year: { epoch: 0, currentYear: 2024, prefix: '', suffix: '', startDay: 0 },
      dateFormats: {
        custom: 'Custom {{day}} format',
        variant: {
          default: 'Default variant',
          alternative: 'Alternative variant',
        },
      },
    };
  });

  describe('Format Resolution', () => {
    it('should resolve calendar-specific formats', () => {
      const resolution = converter.resolveFormat(mockCalendar, {
        formatName: 'custom',
      });

      expect(resolution.template).toBe('Custom {{day}} format');
      expect(resolution.isUniversal).toBe(false);
      expect(resolution.resolvedName).toBe('custom');
      expect(resolution.usedFallback).toBe(false);
    });

    it('should resolve universal formats', () => {
      const resolution = converter.resolveFormat(mockCalendar, {
        universalFormat: 'short',
      });

      expect(resolution.template).toBe('{{ss-month format="abbr"}} {{ss-day}}');
      expect(resolution.isUniversal).toBe(true);
      expect(resolution.resolvedName).toBe('short');
      expect(resolution.usedFallback).toBe(false);
    });

    it('should use fallback when primary format not found', () => {
      const resolution = converter.resolveFormat(mockCalendar, {
        formatName: 'non-existent',
        fallback: 'iso',
      });

      expect(resolution.template).toBe(
        '{{year}}-{{ss-month format="pad"}}-{{ss-day format="pad"}}'
      );
      expect(resolution.isUniversal).toBe(true);
      expect(resolution.resolvedName).toBe('iso');
      expect(resolution.usedFallback).toBe(true);
    });

    it('should prefer universal formats when requested', () => {
      const resolution = converter.resolveFormat(mockCalendar, {
        formatName: 'custom',
        universalFormat: 'short',
        preferUniversal: true,
      });

      expect(resolution.template).toBe('{{ss-month format="abbr"}} {{ss-day}}');
      expect(resolution.isUniversal).toBe(true);
      expect(resolution.resolvedName).toBe('short');
    });
  });

  describe('Calendar Capabilities Analysis', () => {
    it('should analyze calendar capabilities', () => {
      const capabilities = converter.analyzeCalendarCapabilities(mockCalendar);

      expect(capabilities.supportsTime).toBe(false);
      expect(capabilities.supportsWeekdays).toBe(true);
      expect(capabilities.supportsMonths).toBe(true);
      expect(capabilities.customFormatCount).toBe(2);
      expect(capabilities.compatibleUniversalFormats).toContain('short');
      expect(capabilities.compatibleUniversalFormats).toContain('long');
    });

    it('should cache capabilities analysis', () => {
      const capabilities1 = converter.analyzeCalendarCapabilities(mockCalendar);
      const capabilities2 = converter.analyzeCalendarCapabilities(mockCalendar);

      expect(capabilities1).toBe(capabilities2); // Same object reference = cached
    });
  });

  describe('Optimal Format Selection', () => {
    it('should select optimal format for UI compact use', () => {
      const resolution = converter.getOptimalFormat(mockCalendar, 'ui-compact');
      expect(resolution.resolvedName).toBe('short');
    });

    it('should select optimal format for data exchange', () => {
      const resolution = converter.getOptimalFormat(mockCalendar, 'data-exchange');
      expect(resolution.resolvedName).toBe('iso');
    });

    it('should select optimal format for full UI display', () => {
      const resolution = converter.getOptimalFormat(mockCalendar, 'ui-full');
      expect(resolution.resolvedName).toBe('long'); // Calendar has weekdays
    });
  });

  describe('Format Validation', () => {
    it('should validate compatible universal formats', () => {
      const validation = converter.validateFormat(mockCalendar, 'short');
      expect(validation.isValid).toBe(true);
      expect(validation.missingFeatures).toHaveLength(0);
    });

    it('should identify missing features for incompatible formats', () => {
      const validation = converter.validateFormat(mockCalendar, 'time-24h');
      expect(validation.isValid).toBe(false);
      expect(validation.missingFeatures).toContain('time system');
    });

    it('should validate calendar-specific formats', () => {
      const validation = converter.validateFormat(mockCalendar, 'custom');
      expect(validation.isValid).toBe(true);
      expect(validation.missingFeatures).toHaveLength(0);
    });
  });
});

describe('DateFormatter Universal Format Integration', () => {
  let formatter: DateFormatter;
  let mockCalendar: SeasonsStarsCalendar;
  let mockDate: CalendarDate;

  beforeEach(() => {
    UniversalFormatRegistry.resetForTesting();
    FormatConverter.resetForTesting();
    DateFormatter.resetHelpersForTesting();

    mockCalendar = {
      id: 'test-calendar',
      name: 'Test Calendar',
      months: [
        { name: 'January', abbreviation: 'Jan', days: 31 },
        { name: 'February', abbreviation: 'Feb', days: 28 },
      ],
      weekdays: [
        { name: 'Sunday', abbreviation: 'Sun' },
        { name: 'Monday', abbreviation: 'Mon' },
      ],
      year: { epoch: 0, currentYear: 2024, prefix: '', suffix: '', startDay: 0 },
      dateFormats: {
        custom: 'Custom {{day}} format',
      },
    };

    formatter = new DateFormatter(mockCalendar);

    mockDate = new CalendarDate(
      {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
      },
      mockCalendar
    );
  });

  describe('Universal Format Methods', () => {
    it('should format using universal format', () => {
      const result = formatter.formatUniversal(mockDate, 'short');
      expect(result).toContain('{{ss-month format="abbr"}} {{ss-day}}');
    });

    it('should format using extended options', () => {
      const result = formatter.formatExtended(mockDate, {
        universalFormat: 'iso',
        preferUniversal: true,
      });
      expect(result).toContain('{{year}}-{{ss-month format="pad"}}-{{ss-day format="pad"}}');
    });

    it('should format for specific use case', () => {
      const result = formatter.formatForUse(mockDate, 'data-exchange');
      expect(result).toContain('{{year}}-{{ss-month format="pad"}}-{{ss-day format="pad"}}');
    });
  });

  describe('Format Availability', () => {
    it('should check calendar format availability', () => {
      expect(formatter.hasFormat('custom')).toBe(true);
      expect(formatter.hasFormat('non-existent')).toBe(false);
    });

    it('should check universal format availability', () => {
      expect(formatter.hasFormat('short')).toBe(true);
      expect(formatter.hasFormat('time-24h')).toBe(false); // Calendar has no time system
    });
  });

  describe('Format Suggestions', () => {
    it('should provide format suggestions', () => {
      const suggestions = formatter.getFormatSuggestions();
      expect(suggestions).toHaveLength(4);

      const formatNames = suggestions.map(s => s.formatName);
      expect(formatNames).toContain('short');
      expect(formatNames).toContain('iso');
      expect(formatNames).toContain('long');
      expect(formatNames).toContain('formal');

      expect(suggestions[0].priority).toBeGreaterThan(0);
      expect(suggestions.every(s => s.description)).toBe(true);
    });
  });

  describe('Calendar Capabilities', () => {
    it('should return calendar capabilities', () => {
      const capabilities = formatter.getCapabilities();
      expect(capabilities.supportsTime).toBe(false);
      expect(capabilities.supportsWeekdays).toBe(true);
      expect(capabilities.supportsMonths).toBe(true);
      expect(capabilities.customFormatCount).toBe(1);
    });
  });
});

describe('Integration Tests', () => {
  it('should work end-to-end with all components', () => {
    UniversalFormatRegistry.resetForTesting();
    FormatConverter.resetForTesting();
    DateFormatter.resetHelpersForTesting();

    const registry = UniversalFormatRegistry.getInstance();
    const converter = FormatConverter.getInstance();

    const mockCalendar: SeasonsStarsCalendar = {
      id: 'integration-test',
      name: 'Integration Test Calendar',
      months: [{ name: 'TestMonth', abbreviation: 'TM', days: 30 }],
      weekdays: [{ name: 'TestDay', abbreviation: 'TD' }],
      year: { epoch: 0, currentYear: 2024, prefix: '', suffix: '', startDay: 0 },
    };

    const formatter = new DateFormatter(mockCalendar);
    const mockDate = new CalendarDate(
      {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 0,
      },
      mockCalendar
    );

    // Test registry integration
    expect(registry.getAvailableFormats()).toContain('short');

    // Test converter integration
    const resolution = converter.resolveFormat(mockCalendar, { universalFormat: 'short' });
    expect(resolution.isUniversal).toBe(true);

    // Test formatter integration
    const result = formatter.formatUniversal(mockDate, 'short');
    expect(result).toBeDefined();

    // Test capabilities
    const capabilities = formatter.getCapabilities();
    expect(capabilities.compatibleUniversalFormats).toContain('short');
  });
});
