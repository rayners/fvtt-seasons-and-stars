/**
 * Date Formatter Tests - TDD implementation for Handlebars-based date formatting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateFormatter } from '../src/core/date-formatter';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar, CalendarDateFormats } from '../src/types/calendar';

// Mock Handlebars for testing
const mockHandlebars = {
  compile: vi.fn(),
  registerHelper: vi.fn(),
};

// Mock global Handlebars
vi.mock('handlebars', () => ({
  default: mockHandlebars,
}));

// Ensure global Handlebars is available (mimicking Foundry)
global.Handlebars = mockHandlebars;

describe('DateFormatter', () => {
  let formatter: DateFormatter;
  let mockCalendar: SeasonsStarsCalendar;
  let mockDate: CalendarDate;

  beforeEach(() => {
    vi.clearAllMocks();

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
      year: { prefix: '', suffix: '' },
      time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
    } as SeasonsStarsCalendar;

    mockDate = {
      year: 2024,
      month: 1,
      day: 15,
      weekday: 1,
      time: { hour: 10, minute: 30, second: 45 },
    } as CalendarDate;
  });

  describe('Basic Template Compilation', () => {
    it('should compile a simple date format template', () => {
      // Arrange
      const template = '{{year}}-{{month}}-{{day}}';
      const expectedOutput = '2024-1-15';
      const mockCompiledTemplate = vi.fn().mockReturnValue(expectedOutput);
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Act
      formatter = new DateFormatter(mockCalendar);
      const result = formatter.format(mockDate, template);

      // Assert
      expect(mockHandlebars.compile).toHaveBeenCalledWith(template);
      expect(mockCompiledTemplate).toHaveBeenCalledWith({
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
        hour: 10,
        minute: 30,
        second: 45,
        dayOfYear: 15,
      });
      expect(result).toBe(expectedOutput);
    });

    it('should handle template compilation errors gracefully', () => {
      // Arrange
      const template = '{{invalid syntax';
      mockHandlebars.compile.mockImplementation(() => {
        throw new Error('Template compilation failed');
      });

      // Act
      formatter = new DateFormatter(mockCalendar);
      const result = formatter.format(mockDate, template);

      // Assert
      expect(result).toBe('Monday, 15th January 2024'); // Should fallback to basic format
    });

    it('should cache compiled templates for performance', () => {
      // Arrange
      const template = '{{year}}-{{month}}-{{day}}';
      const mockCompiledTemplate = vi.fn().mockReturnValue('2024-1-15');
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Act
      formatter = new DateFormatter(mockCalendar);
      formatter.format(mockDate, template);
      formatter.format(mockDate, template); // Second call should use cache

      // Assert
      expect(mockHandlebars.compile).toHaveBeenCalledTimes(1); // Only called once due to caching
    });
  });

  describe('Custom Handlebars Helpers', () => {
    beforeEach(() => {
      formatter = new DateFormatter(mockCalendar);
    });

    it('should register day:ordinal helper for ordinal numbers', () => {
      // Arrange - DateFormatter should register helpers on construction

      // Act & Assert
      expect(mockHandlebars.registerHelper).toHaveBeenCalledWith('ss-day', expect.any(Function));

      // Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const dayHelperCall = helperCalls.find(call => call[0] === 'ss-day');
      const dayHelper = dayHelperCall?.[1];

      expect(dayHelper).toBeDefined();
      expect(dayHelper(15, { hash: { format: 'ordinal' } })).toBe('15th');
      expect(dayHelper(1, { hash: { format: 'ordinal' } })).toBe('1st');
      expect(dayHelper(2, { hash: { format: 'ordinal' } })).toBe('2nd');
      expect(dayHelper(3, { hash: { format: 'ordinal' } })).toBe('3rd');
    });

    it('should register month:abbr helper for month abbreviations', () => {
      // Arrange
      mockDate.month = 1; // January

      // Act & Assert
      expect(mockHandlebars.registerHelper).toHaveBeenCalledWith('ss-month', expect.any(Function));

      // Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const monthHelperCall = helperCalls.find(call => call[0] === 'ss-month');
      const monthHelper = monthHelperCall?.[1];

      expect(monthHelper).toBeDefined();
      expect(monthHelper(1, { hash: { format: 'abbr' } })).toBe('Jan');
      expect(monthHelper(2, { hash: { format: 'abbr' } })).toBe('Feb');
      expect(monthHelper(1, { hash: { format: 'name' } })).toBe('January');
    });

    it('should register weekday:name helper for weekday names', () => {
      // Arrange
      mockDate.weekday = 1; // Monday

      // Act & Assert
      expect(mockHandlebars.registerHelper).toHaveBeenCalledWith(
        'ss-weekday',
        expect.any(Function)
      );

      // Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const weekdayHelperCall = helperCalls.find(call => call[0] === 'ss-weekday');
      const weekdayHelper = weekdayHelperCall?.[1];

      expect(weekdayHelper).toBeDefined();
      expect(weekdayHelper(1, { hash: { format: 'name' } })).toBe('Monday');
      expect(weekdayHelper(0, { hash: { format: 'name' } })).toBe('Sunday');
      expect(weekdayHelper(1, { hash: { format: 'abbr' } })).toBe('Mon');
    });

    it('should register month:pad helper for zero-padded numbers', () => {
      // Act & Assert
      expect(mockHandlebars.registerHelper).toHaveBeenCalledWith('ss-month', expect.any(Function));

      // Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const monthHelperCall = helperCalls.find(call => call[0] === 'ss-month');
      const monthHelper = monthHelperCall?.[1];

      expect(monthHelper).toBeDefined();
      expect(monthHelper(1, { hash: { format: 'pad' } })).toBe('01');
      expect(monthHelper(10, { hash: { format: 'pad' } })).toBe('10');
    });

    it('should register day:pad helper for zero-padded day numbers', () => {
      // Act & Assert
      expect(mockHandlebars.registerHelper).toHaveBeenCalledWith('ss-day', expect.any(Function));

      // Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const dayHelperCall = helperCalls.find(call => call[0] === 'ss-day');
      const dayHelper = dayHelperCall?.[1];

      expect(dayHelper).toBeDefined();
      expect(dayHelper(5, { hash: { format: 'pad' } })).toBe('05');
      expect(dayHelper(15, { hash: { format: 'pad' } })).toBe('15');
    });

    it('should register dateFmt helper for embedding named formats', () => {
      // Act & Assert
      expect(mockHandlebars.registerHelper).toHaveBeenCalledWith(
        'ss-dateFmt',
        expect.any(Function)
      );

      // Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const dateFmtHelperCall = helperCalls.find(call => call[0] === 'ss-dateFmt');
      const dateFmtHelper = dateFmtHelperCall?.[1];

      expect(dateFmtHelper).toBeDefined();

      // Test the helper returns placeholder for unresolved formats
      expect(dateFmtHelper('test-format', {})).toBe('[Unresolved: test-format]');
    });
  });

  describe('Calendar Schema Integration', () => {
    it('should support dateFormats from calendar schema', () => {
      // Arrange
      const calendarWithFormats: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          iso: '{{year}}-{{month:pad}}-{{day:pad}}',
          short: '{{month:abbr}} {{day}}',
          long: '{{weekday:name}}, {{day:ordinal}} {{month:name}} {{year}}',
          widgets: {
            mini: '{{month:abbr}} {{day}}',
            main: '{{weekday:abbr}}, {{day:ordinal}} {{month:name}}',
            grid: '{{day}}/{{month}}/{{year}}',
          },
        },
      };

      const mockCompiledTemplate = vi.fn().mockReturnValue('2024-01-15');
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Act
      formatter = new DateFormatter(calendarWithFormats);
      const result = formatter.formatNamed(mockDate, 'iso');

      // Assert
      expect(result).toBe('2024-01-15');
      expect(mockHandlebars.compile).toHaveBeenCalledWith('{{year}}-{{month:pad}}-{{day:pad}}');
    });

    it('should support widget-specific formats', () => {
      // Arrange
      const calendarWithFormats: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          widgets: {
            mini: '{{month:abbr}} {{day}}',
            main: '{{weekday:abbr}}, {{day:ordinal}} {{month:name}}',
            grid: '{{day}}/{{month}}/{{year}}',
          },
        },
      };

      const mockCompiledTemplate = vi.fn().mockReturnValue('Jan 15');
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Act
      formatter = new DateFormatter(calendarWithFormats);
      const result = formatter.formatWidget(mockDate, 'mini');

      // Assert
      expect(result).toBe('Jan 15');
      expect(mockHandlebars.compile).toHaveBeenCalledWith('{{month:abbr}} {{day}}');
    });

    it('should handle missing dateFormats gracefully', () => {
      // Arrange - calendar without dateFormats
      const mockCompiledTemplate = vi.fn().mockReturnValue('2024-1-15');
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Act
      formatter = new DateFormatter(mockCalendar);
      const result = formatter.formatNamed(mockDate, 'nonexistent');

      // Assert - should fallback to basic format
      expect(result).toBe('Monday, 15th January 2024');
    });

    it('should handle variant formats (format as object)', () => {
      // Arrange
      const calendarWithVariants: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          date: {
            short: '{{month:abbr}} {{day}}',
            long: '{{weekday:name}}, {{day:ordinal}} {{month:name}} {{year}}',
          },
        },
      };

      const mockCompiledTemplate = vi.fn().mockReturnValue('Jan 15');
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Act
      formatter = new DateFormatter(calendarWithVariants);
      const result = formatter.formatNamed(mockDate, 'date', 'short');

      // Assert
      expect(result).toBe('Jan 15');
      expect(mockHandlebars.compile).toHaveBeenCalledWith('{{month:abbr}} {{day}}');
    });
  });

  describe('Format Embedding', () => {
    it('should support embedding named formats with {{dateFmt:name}}', () => {
      // Arrange
      const calendarWithFormats: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          iso: '{{year}}-{{ss-month:pad}}-{{ss-day:pad}}',
          long: 'Today is {{ss-dateFmt:iso}} ({{ss-weekday:name}})',
        },
      };

      // Mock the embedded format call
      const mockCompiledTemplate = vi
        .fn()
        .mockReturnValueOnce('2024-01-15') // First call for 'iso' format
        .mockReturnValueOnce('Today is 2024-01-15 (Monday)'); // Second call for processed 'long' format
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Act
      formatter = new DateFormatter(calendarWithFormats);
      const result = formatter.formatNamed(mockDate, 'long');

      // Assert
      expect(result).toBe('Today is 2024-01-15 (Monday)');
      // Should compile the embedded format first, then the processed template
      expect(mockHandlebars.compile).toHaveBeenCalledWith(
        '{{year}}-{{ss-month:pad}}-{{ss-day:pad}}'
      );
      expect(mockHandlebars.compile).toHaveBeenCalledWith(
        'Today is 2024-01-15 ({{ss-weekday:name}})'
      );
    });

    it('should handle nested format embedding', () => {
      // Arrange
      const calendarWithFormats: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          iso: '{{year}}-{{ss-month:pad}}-{{ss-day:pad}}',
          short: '{{ss-dateFmt:iso}}',
          full: 'Date: {{ss-dateFmt:short}} Time: {{hour:pad}}:{{minute:pad}}',
        },
      };

      const mockCompiledTemplate = vi
        .fn()
        .mockReturnValueOnce('2024-01-15') // iso format
        .mockReturnValueOnce('2024-01-15') // short format (using iso)
        .mockReturnValueOnce('Date: 2024-01-15 Time: 10:30'); // full format
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Act
      formatter = new DateFormatter(calendarWithFormats);
      const result = formatter.formatNamed(mockDate, 'full');

      // Assert
      expect(result).toBe('Date: 2024-01-15 Time: 10:30');
    });

    it('should handle missing embedded formats gracefully', () => {
      // Arrange
      const calendarWithFormats: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          invalid: 'Date: {{ss-dateFmt:nonexistent}}',
        },
      };

      const mockCompiledTemplate = vi.fn().mockReturnValueOnce('Date: Monday, 15th January 2024'); // processed format with fallback embedded
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Act
      formatter = new DateFormatter(calendarWithFormats);
      const result = formatter.formatNamed(mockDate, 'invalid');

      // Assert
      expect(result).toBe('Date: Monday, 15th January 2024');
      // Should compile the processed template with fallback embedded
      expect(mockHandlebars.compile).toHaveBeenCalledWith('Date: Monday, 15th January 2024');
    });
  });

  describe('Mathematical Helpers', () => {
    beforeEach(() => {
      formatter = new DateFormatter(mockCalendar);
    });

    it('should register math:add helper for addition calculations', () => {
      // Act & Assert
      expect(mockHandlebars.registerHelper).toHaveBeenCalledWith('ss-math', expect.any(Function));

      // Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const mathHelperCall = helperCalls.find(call => call[0] === 'ss-math');
      const mathHelper = mathHelperCall?.[1];

      expect(mathHelper).toBeDefined();
      expect(mathHelper(2024, { hash: { op: 'add', value: 100 } })).toBe(2124);
      expect(mathHelper(15, { hash: { op: 'add', value: 1000 } })).toBe(1015);
    });

    it('should register math:multiply helper for multiplication calculations', () => {
      // Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const mathHelperCall = helperCalls.find(call => call[0] === 'ss-math');
      const mathHelper = mathHelperCall?.[1];

      expect(mathHelper).toBeDefined();
      expect(mathHelper(2024, { hash: { op: 'multiply', value: 10 } })).toBe(20240);
      expect(mathHelper(15, { hash: { op: 'multiply', value: 100 } })).toBe(1500);
    });

    it('should register math:subtract helper for subtraction calculations', () => {
      // Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const mathHelperCall = helperCalls.find(call => call[0] === 'ss-math');
      const mathHelper = mathHelperCall?.[1];

      expect(mathHelper).toBeDefined();
      expect(mathHelper(2024, { hash: { op: 'subtract', value: 1300 } })).toBe(724);
      expect(mathHelper(365, { hash: { op: 'subtract', value: 15 } })).toBe(350);
    });

    it('should register stardate helper for stardate calculations', () => {
      // Act & Assert
      expect(mockHandlebars.registerHelper).toHaveBeenCalledWith(
        'ss-stardate',
        expect.any(Function)
      );

      // Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const stardateHelperCall = helperCalls.find(call => call[0] === 'ss-stardate');
      const stardateHelper = stardateHelperCall?.[1];

      expect(stardateHelper).toBeDefined();
      // TNG-era calculation: prefix + ((year - baseYear) * 1000) + dayOfYear
      expect(stardateHelper(2024, { hash: { prefix: '47', baseYear: 2024, dayOfYear: 15 } })).toBe(
        '47015.0'
      );
      expect(stardateHelper(2025, { hash: { prefix: '48', baseYear: 2024, dayOfYear: 100 } })).toBe(
        '49100.0'
      );
    });

    it('should support stardate calculations in calendar templates', () => {
      // Arrange
      const calendarWithStardate: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          tng: '{{ss-stardate year prefix="47" baseYear=2024 dayOfYear=15}}',
          tos: '{{ss-math year op="subtract" value=1300}}.{{ss-day}}',
        },
      };

      const mockCompiledTemplate = vi.fn().mockReturnValue('47015.0');
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Act
      formatter = new DateFormatter(calendarWithStardate);
      const result = formatter.formatNamed(mockDate, 'tng');

      // Assert
      expect(result).toBe('47015.0');
      expect(mockHandlebars.compile).toHaveBeenCalledWith(
        '{{ss-stardate year prefix="47" baseYear=2024 dayOfYear=15}}'
      );
    });
  });

  describe('Type Safety Edge Cases', () => {
    it('should handle non-string template values gracefully', () => {
      // Arrange - Create calendar with malformed dateFormat containing non-string value
      const calendarWithMalformedFormat = {
        ...mockCalendar,
        dateFormats: {
          malformed: {
            variant1: 123, // This is a number, not a string!
            variant2: null, // This is null!
            variant3: undefined, // This is undefined!
            variant4: { nested: 'object' }, // This is an object!
          },
        },
      };

      formatter = new DateFormatter(calendarWithMalformedFormat);

      // Act & Assert - Should not throw TypeError and should fallback gracefully
      expect(() => {
        const result1 = formatter.formatNamed(mockDate, 'malformed', 'variant1');
        expect(result1).toBe('Monday, 15th January 2024'); // Should fallback to basic format
      }).not.toThrow();

      expect(() => {
        const result2 = formatter.formatNamed(mockDate, 'malformed', 'variant2');
        expect(result2).toBe('Monday, 15th January 2024'); // Should fallback to basic format
      }).not.toThrow();

      expect(() => {
        const result3 = formatter.formatNamed(mockDate, 'malformed', 'variant3');
        expect(result3).toBe('Monday, 15th January 2024'); // Should fallback to basic format
      }).not.toThrow();

      expect(() => {
        const result4 = formatter.formatNamed(mockDate, 'malformed', 'variant4');
        expect(result4).toBe('Monday, 15th January 2024'); // Should fallback to basic format
      }).not.toThrow();
    });

    it('should handle non-string format value when no variant specified', () => {
      // Arrange - Calendar with non-string as first format value
      const calendarWithMalformedFormat = {
        ...mockCalendar,
        dateFormats: {
          malformed: {
            first: 42, // Number as first value
            second: 'valid {{year}}-{{month}}-{{day}}',
          },
        },
      };

      formatter = new DateFormatter(calendarWithMalformedFormat);

      // Act & Assert - Should not crash when Object.values()[0] returns number
      expect(() => {
        const result = formatter.formatNamed(mockDate, 'malformed'); // No variant specified
        expect(result).toBe('Monday, 15th January 2024'); // Should fallback to basic format
      }).not.toThrow();
    });

    it('should handle invalid month values in calculateDayOfYear gracefully', () => {
      // Arrange - Calendar with date containing invalid month values
      const calendarForBoundsTest = {
        ...mockCalendar,
        dateFormats: {
          dayOfYearTest: '{{dayOfYear}}',
        },
      };

      formatter = new DateFormatter(calendarForBoundsTest);

      // Test with month = 0 (invalid, should be 1-based)
      const dateWithZeroMonth = {
        ...mockDate,
        month: 0,
      };

      // Test with negative month
      const dateWithNegativeMonth = {
        ...mockDate,
        month: -1,
      };

      // Test with month greater than calendar months length
      const dateWithOversizedMonth = {
        ...mockDate,
        month: 15, // Calendar only has 2 months
      };

      // Mock compiled template to return the dayOfYear value
      const mockCompiledTemplate = vi.fn(context => context.dayOfYear.toString());
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Act & Assert - Should not crash and should handle gracefully
      expect(() => {
        const result1 = formatter.formatNamed(dateWithZeroMonth, 'dayOfYearTest');
        expect(result1).toBe('15'); // Should be day value when month is invalid
      }).not.toThrow();

      expect(() => {
        const result2 = formatter.formatNamed(dateWithNegativeMonth, 'dayOfYearTest');
        expect(result2).toBe('15'); // Should be day value when month is invalid
      }).not.toThrow();

      expect(() => {
        const result3 = formatter.formatNamed(dateWithOversizedMonth, 'dayOfYearTest');
        expect(result3).toBe('15'); // Should be day value when month is invalid
      }).not.toThrow();
    });

    it('should cache compiled templates without size limits', () => {
      // Arrange
      formatter = new DateFormatter(mockCalendar);

      // Mock compiled template that just returns the template as-is for this test
      const mockCompiledTemplate = vi.fn(context => 'test-result');
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Act - Add templates to verify caching behavior
      // In real usage, calendars have ~10-25 formats, far below memory concerns
      for (let i = 0; i <= 50; i++) {
        const uniqueTemplate = `{{year}}-{{month}}-{{day}}-${i}`;
        formatter.format(mockDate, uniqueTemplate);
      }

      // Assert - Simple cache behavior: each unique template compiled once
      const totalCompileCalls = mockHandlebars.compile.mock.calls.length;

      // With simple cache, each unique template compiles exactly once
      expect(totalCompileCalls).toBe(51); // 0 through 50 = 51 templates

      // Test that repeated calls use cache
      formatter.format(mockDate, '{{year}}-{{month}}-{{day}}-0');
      expect(mockHandlebars.compile.mock.calls.length).toBe(51); // No additional compile
    });

    it('should handle large numbers of templates gracefully', () => {
      // Arrange - Test that simple cache works with many templates
      formatter = new DateFormatter(mockCalendar);
      const mockCompiledTemplate = vi.fn(context => 'cached-result');
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Act - Use many templates (still far below real memory concerns)
      expect(() => {
        for (let i = 0; i < 200; i++) {
          const template = `Template number ${i}: {{year}}-{{month}}-{{day}}`;
          const result = formatter.format(mockDate, template);
          expect(result).toBe('cached-result');
        }
      }).not.toThrow();

      // Assert - Should complete without errors, each template compiled once
      expect(mockHandlebars.compile).toHaveBeenCalledTimes(200);
    });
  });
});
