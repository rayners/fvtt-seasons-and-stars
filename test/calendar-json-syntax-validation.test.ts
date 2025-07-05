/**
 * Calendar JSON Syntax Validation - TDD test for single quote syntax issues
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateFormatter } from '../src/core/date-formatter';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Mock Handlebars to simulate real compilation behavior
const mockHandlebars = {
  compile: vi.fn(),
  registerHelper: vi.fn(),
};

// Ensure global Handlebars is available
global.Handlebars = mockHandlebars;

describe('Calendar JSON Syntax Validation', () => {
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
      weekdays: [
        { name: 'Sunday', abbreviation: 'Sun' },
        { name: 'Monday', abbreviation: 'Mon' },
      ],
      year: { prefix: '', suffix: '' },
      time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
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

  describe('Single Quote Syntax Detection', () => {
    it('should fail when calendar JSON contains single quotes in helper syntax', () => {
      // RED: This test should fail because single quotes cause Handlebars parse errors
      const invalidSingleQuoteTemplate =
        "{{ss-hour format='pad'}}:{{ss-minute format='pad'}}:{{ss-second format='pad'}} UTC";

      // Mock Handlebars to throw parse error on single quotes (realistic behavior)
      mockHandlebars.compile.mockImplementation((template: string) => {
        if (template.includes("format='")) {
          throw new Error("Parse error on line 1: Expecting 'STRING', got 'INVALID'");
        }
        return vi.fn().mockReturnValue('14:30:45 UTC');
      });

      // This should handle the error gracefully but we want to detect it in tests
      const result = formatter.format(mockDate, invalidSingleQuoteTemplate);

      // Should fall back to basic format when template compilation fails
      expect(result).toContain('Sunday'); // Basic format includes weekday
      expect(result).toContain('15th'); // Basic format includes ordinal
      expect(result).toContain('January'); // Basic format includes month name
      expect(result).toContain('2024'); // Basic format includes year

      // Verify that compilation was attempted and failed
      expect(mockHandlebars.compile).toHaveBeenCalledWith(invalidSingleQuoteTemplate);
    });

    it('should succeed when using correct double quote syntax', () => {
      // GREEN: This should work with proper double quotes
      const validDoubleQuoteTemplate =
        '{{ss-hour format="pad"}}:{{ss-minute format="pad"}}:{{ss-second format="pad"}} UTC';

      // Mock successful compilation with double quotes
      const mockCompiledTemplate = vi.fn().mockReturnValue('14:30:45 UTC');
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      const result = formatter.format(mockDate, validDoubleQuoteTemplate);

      expect(result).toBe('14:30:45 UTC');
      expect(mockHandlebars.compile).toHaveBeenCalledWith(validDoubleQuoteTemplate);
      expect(mockCompiledTemplate).toHaveBeenCalledWith({
        year: 2024,
        month: 1,
        day: 15,
        weekday: 0,
        hour: 14,
        minute: 30,
        second: 45,
        dayOfYear: 15,
      });
    });
  });

  describe('Real Calendar File Validation', () => {
    it('should detect single quote syntax in Star Trek calendar time format', () => {
      // RED: This simulates the actual problematic syntax from gregorian-star-trek-variants.json
      const calendarWithSingleQuotes: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          // This is the actual problematic format from the calendar file
          time: "{{ss-hour format='pad'}}:{{ss-minute format='pad'}}:{{ss-second format='pad'}} UTC",
        },
      };

      // Mock realistic Handlebars behavior - fail on single quotes
      mockHandlebars.compile.mockImplementation((template: string) => {
        if (template.includes("format='")) {
          throw new Error(
            "Parse error on line 1: Expecting 'STRING', got 'INVALID' - Invalid quote syntax"
          );
        }
        return vi.fn().mockReturnValue('fallback result');
      });

      const formatterWithBadCalendar = new DateFormatter(calendarWithSingleQuotes);
      const result = formatterWithBadCalendar.formatNamed(mockDate, 'time');

      // Should fall back to basic format due to syntax error
      expect(result).toContain('Sunday, 15th January 2024'); // Basic format fallback
      expect(mockHandlebars.compile).toHaveBeenCalled();
    });
  });
});
