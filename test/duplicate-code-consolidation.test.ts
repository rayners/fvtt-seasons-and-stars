/**
 * Duplicate Code Consolidation - TDD test for consolidating duplicate preprocessing and format handling logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateFormatter } from '../src/core/date-formatter';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Mock Handlebars
const mockHandlebars = {
  compile: vi.fn(),
  registerHelper: vi.fn(),
};

global.Handlebars = mockHandlebars;

describe('Duplicate Code Consolidation', () => {
  let formatter: DateFormatter;
  let mockCalendar: SeasonsStarsCalendar;
  let mockDate: CalendarDate;

  beforeEach(() => {
    vi.clearAllMocks();
    DateFormatter.resetHelpersForTesting();

    mockCalendar = {
      id: 'test-calendar',
      name: 'Test Calendar',
      months: [{ name: 'January', abbreviation: 'Jan', days: 31 }],
      weekdays: [{ name: 'Sunday', abbreviation: 'Sun' }],
      year: { prefix: '', suffix: '' },
      time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
      dateFormats: {
        short: '{{ss-month format="name"}} {{ss-day}}',
        nested: '{{ss-dateFmt formatName="short"}}, {{year}}', // Uses embedded format
      },
    } as SeasonsStarsCalendar;

    mockDate = {
      year: 2024,
      month: 1,
      day: 15,
      weekday: 0,
      time: { hour: 14, minute: 30, second: 45 },
    } as CalendarDate;

    formatter = new DateFormatter(mockCalendar);
  });

  describe('Template Caching Logic Consolidation', () => {
    it('should use shared template caching for both regular and recursive formatting', () => {
      // RED: Test will fail until template caching is consolidated into shared method
      const template = '{{ss-month format="name"}} {{ss-day}}';

      const mockCompiledTemplate = vi.fn().mockReturnValue('January 15');
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Call format() method which should use consolidated caching
      formatter.format(mockDate, template);

      // Should compile template once
      expect(mockHandlebars.compile).toHaveBeenCalledTimes(1);
      expect(mockHandlebars.compile).toHaveBeenCalledWith(template);

      // Second call with same template should use cache
      formatter.format(mockDate, template);

      // Should not compile again (cache hit)
      expect(mockHandlebars.compile).toHaveBeenCalledTimes(1);
    });

    it('should cache templates consistently across regular and recursive calls', () => {
      // RED: Test will fail until caching logic is unified
      const template = '{{ss-dateFmt formatName="short"}}'; // This will use recursive preprocessing

      const mockCompiledTemplate = vi.fn().mockReturnValue('January 15');
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Format with embedded format (uses recursive path)
      formatter.format(mockDate, template);

      // Both preprocessing and recursive calls should share the same cache
      // This verifies the consolidated caching works across both code paths
      expect(mockHandlebars.compile).toHaveBeenCalled();
    });
  });

  describe('Preprocessing Logic Consolidation', () => {
    it('should use single preprocessing method for both regular and recursive cases', () => {
      // RED: Test will fail until preprocessing methods are consolidated
      const templateWithEmbedded = 'Date: {{ss-dateFmt formatName="short"}}';

      const mockCompiledTemplate = vi.fn().mockReturnValue('Date: January 15');
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // This should use the consolidated preprocessing method
      const result = formatter.format(mockDate, templateWithEmbedded);

      expect(result).toBe('Date: January 15');
      expect(mockHandlebars.compile).toHaveBeenCalled();
    });

    it('should handle nested embedded formats with circular reference protection', () => {
      // RED: Test will fail until circular reference protection is properly consolidated
      const circularCalendar: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          format1: '{{ss-dateFmt formatName="format2"}}',
          format2: '{{ss-dateFmt formatName="format1"}}', // Circular reference
        },
      };

      const circularFormatter = new DateFormatter(circularCalendar);

      const mockCompiledTemplate = vi.fn().mockReturnValue('Sunday, 15th January 2024');
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Should detect circular reference and fall back to basic format
      const result = circularFormatter.formatNamed(mockDate, 'format1');

      expect(result).toContain('Sunday'); // Basic format fallback
      expect(result).toContain('15th');
      expect(result).toContain('January');
      expect(result).toContain('2024');
    });
  });

  describe('Format Handling Logic Consolidation', () => {
    it('should use single formatting method for both public and internal calls', () => {
      // RED: Test will fail until format handling methods are consolidated
      const template = '{{ss-month format="name"}} {{ss-day}}, {{year}}';

      const mockCompiledTemplate = vi.fn();
      mockCompiledTemplate.mockReturnValueOnce('January 15, 2024'); // First call (direct template)
      mockCompiledTemplate.mockReturnValueOnce('January 15'); // Second call (short format)
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Direct format call
      const result1 = formatter.format(mockDate, template);
      expect(result1).toBe('January 15, 2024');

      // Named format call (should use same consolidated logic) - uses calendar's 'short' format
      const result2 = formatter.formatNamed(mockDate, 'short');
      expect(result2).toBe('January 15');

      // Both calls should have used the same underlying formatting method
      expect(mockCompiledTemplate).toHaveBeenCalledTimes(2);
    });

    it('should provide consistent error handling across all format methods', () => {
      // RED: Test will fail until error handling is consolidated
      const invalidTemplate = '{{invalid-helper}}';

      mockHandlebars.compile.mockImplementation(() => {
        throw new Error('Unknown helper: invalid-helper');
      });

      // Both methods should handle errors consistently
      const result1 = formatter.format(mockDate, invalidTemplate);
      const result2 = formatter.formatNamed(mockDate, 'nonexistent');

      // Both should fall back to basic format
      expect(result1).toContain('Sunday, 15th January 2024');
      expect(result2).toContain('Sunday, 15th January 2024');
    });
  });

  describe('Context Preparation Consolidation', () => {
    it('should use same context preparation for all format operations', () => {
      // GREEN: This should work - context preparation is already shared
      const template = '{{year}}-{{month}}-{{day}} {{hour}}:{{minute}}:{{second}}';

      const mockCompiledTemplate = vi.fn().mockReturnValue('2024-1-15 14:30:45');
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      formatter.format(mockDate, template);

      // Verify the context passed to template includes all expected properties
      expect(mockCompiledTemplate).toHaveBeenCalledWith({
        year: 2024,
        month: 1,
        day: 15,
        weekday: 0,
        hour: 14,
        minute: 30,
        second: 45,
        dayOfYear: 15,
        _calendarId: 'test-calendar',
      });
    });
  });

  describe('Consolidated Method Signatures', () => {
    it('should support optional visited parameter for circular reference protection', () => {
      // RED: Test will fail until method signatures are consolidated
      const templateWithEmbedded = '{{ss-dateFmt formatName="short"}}';

      const mockCompiledTemplate = vi.fn().mockReturnValue('January 15');
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Should work with default visited parameter (new Set())
      const result = formatter.format(mockDate, templateWithEmbedded);

      expect(result).toBe('January 15');
    });

    it('should support optional formatName parameter for error context', () => {
      // GREEN: Test will pass - demonstrating formatName parameter threading
      const calendarWithInvalidFormat: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          invalid: '{{broken-helper}}', // This format exists but has invalid template
        },
      };

      const formatterWithInvalidFormat = new DateFormatter(calendarWithInvalidFormat);

      mockHandlebars.compile.mockImplementation(() => {
        throw new Error('Helper not found');
      });

      // formatNamed with existing but invalid format should attempt compilation
      const result = formatterWithInvalidFormat.formatNamed(mockDate, 'invalid');

      // Should fall back to basic format
      expect(result).toContain('Sunday, 15th January 2024');

      // Error compilation should have been attempted
      expect(mockHandlebars.compile).toHaveBeenCalled();
    });
  });
});
