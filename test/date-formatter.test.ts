/**
 * Date Formatter Tests - TDD implementation for Handlebars-based date formatting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateFormatter } from '../src/core/date-formatter';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar, CalendarDateFormats } from '../src/types/calendar';

// Use REAL Handlebars for date formatter testing (following star-trek test pattern)
import Handlebars from 'handlebars';
global.Handlebars = Handlebars;

describe('DateFormatter', () => {
  let formatter: DateFormatter;
  let mockCalendar: SeasonsStarsCalendar;
  let mockDate: CalendarDate;

  beforeEach(() => {
    vi.clearAllMocks();
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

      // Act
      formatter = new DateFormatter(mockCalendar);
      const result = formatter.format(mockDate, template);

      // Assert
      expect(result).toBe(expectedOutput);
    });

    it('should handle template compilation errors gracefully', () => {
      // Arrange
      const template = '{{invalid syntax';

      // Act
      formatter = new DateFormatter(mockCalendar);
      const result = formatter.format(mockDate, template);

      // Assert
      expect(result).toBe('Monday, 15th January 2024'); // Should fallback to basic format
    });

    it('should cache compiled templates for performance', () => {
      // Arrange
      const template = '{{year}}-{{month}}-{{day}}';

      // Act
      formatter = new DateFormatter(mockCalendar);
      const result1 = formatter.format(mockDate, template);
      const result2 = formatter.format(mockDate, template); // Second call should use cache

      // Assert - both results should be the same, demonstrating caching works
      expect(result1).toBe('2024-1-15');
      expect(result2).toBe('2024-1-15');
    });
  });

  describe('Custom Handlebars Helpers', () => {
    beforeEach(() => {
      formatter = new DateFormatter(mockCalendar);
    });

    it('should render day with ordinal formatting', () => {
      // Act & Assert - Test through actual template rendering
      const result15 = formatter.format(mockDate, '{{ss-day format="ordinal"}}');
      expect(result15).toBe('15th');

      // Test different ordinal cases
      const date1st = { ...mockDate, day: 1 };
      const result1 = formatter.format(date1st, '{{ss-day format="ordinal"}}');
      expect(result1).toBe('1st');

      const date2nd = { ...mockDate, day: 2 };
      const result2 = formatter.format(date2nd, '{{ss-day format="ordinal"}}');
      expect(result2).toBe('2nd');

      const date3rd = { ...mockDate, day: 3 };
      const result3 = formatter.format(date3rd, '{{ss-day format="ordinal"}}');
      expect(result3).toBe('3rd');
    });

    it('should render month with abbreviation and name formatting', () => {
      // Test month abbreviations
      const resultJanAbbr = formatter.format(mockDate, '{{ss-month format="abbr"}}');
      expect(resultJanAbbr).toBe('Jan');

      const resultJanName = formatter.format(mockDate, '{{ss-month format="name"}}');
      expect(resultJanName).toBe('January');

      // Test February
      const febDate = { ...mockDate, month: 2 };
      const resultFebAbbr = formatter.format(febDate, '{{ss-month format="abbr"}}');
      expect(resultFebAbbr).toBe('Feb');
    });

    it('should render weekday names and abbreviations', () => {
      // Test weekday name formatting through actual template rendering
      mockDate.weekday = 1; // Monday
      formatter = new DateFormatter(mockCalendar);

      const resultName = formatter.format(mockDate, '{{ss-weekday format="name"}}');
      expect(resultName).toBe('Monday');

      const resultAbbr = formatter.format(mockDate, '{{ss-weekday format="abbr"}}');
      expect(resultAbbr).toBe('Mon');

      // Test different weekday
      const sundayDate = { ...mockDate, weekday: 0 };
      const sundayResult = formatter.format(sundayDate, '{{ss-weekday format="name"}}');
      expect(sundayResult).toBe('Sunday');
    });

    it('should render month with padding formatting', () => {
      // Test month padding through actual template rendering
      formatter = new DateFormatter(mockCalendar);

      const result = formatter.format(mockDate, '{{ss-month format="pad"}}');
      expect(result).toBe('01');

      // Test double-digit month
      const mockDate10 = { ...mockDate, month: 10 };
      const result10 = formatter.format(mockDate10, '{{ss-month format="pad"}}');
      expect(result10).toBe('10');
    });

    it('should render day with padding formatting', () => {
      // Test day padding through actual template rendering
      formatter = new DateFormatter(mockCalendar);

      const result = formatter.format(mockDate, '{{ss-day format="pad"}}');
      expect(result).toBe('15');

      // Test single-digit day
      const mockDate5 = { ...mockDate, day: 5 };
      const result5 = formatter.format(mockDate5, '{{ss-day format="pad"}}');
      expect(result5).toBe('05');
    });

    it('should handle unresolved format embedding gracefully', () => {
      // Test dateFmt helper through actual template rendering
      formatter = new DateFormatter(mockCalendar);

      const result = formatter.format(mockDate, '{{ss-dateFmt "test-format"}}');
      // Should fall back to basic format when format doesn't exist
      expect(result).toContain('Monday');
      expect(result).toContain('15th');
      expect(result).toContain('January');
      expect(result).toContain('2024');
    });
  });

  describe('Calendar Schema Integration', () => {
    it('should support dateFormats from calendar schema', () => {
      // Arrange
      const calendarWithFormats: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          iso: '{{year}}-{{ss-month format="pad"}}-{{ss-day format="pad"}}',
          short: '{{ss-month format="abbr"}} {{day}}',
          long: '{{ss-weekday format="name"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}} {{year}}',
          widgets: {
            mini: '{{ss-month format="abbr"}} {{day}}',
            main: '{{ss-weekday format="abbr"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}}',
            grid: '{{day}}/{{month}}/{{year}}',
          },
        },
      };

      // Act
      formatter = new DateFormatter(calendarWithFormats);
      const result = formatter.formatNamed(mockDate, 'iso');

      // Assert
      expect(result).toBe('2024-01-15');
    });

    it('should support widget-specific formats', () => {
      // Arrange
      const calendarWithFormats: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          widgets: {
            mini: '{{ss-month format="abbr"}} {{day}}',
            main: '{{ss-weekday format="abbr"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}}',
            grid: '{{day}}/{{month}}/{{year}}',
          },
        },
      };

      // Act
      formatter = new DateFormatter(calendarWithFormats);
      const result = formatter.formatWidget(mockDate, 'mini');

      // Assert
      expect(result).toBe('Jan 15');
    });

    it('should handle missing dateFormats gracefully', () => {
      // Arrange - calendar without dateFormats
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
            short: '{{ss-month format="abbr"}} {{day}}',
            long: '{{ss-weekday format="name"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}} {{year}}',
          },
        },
      };

      // Act
      formatter = new DateFormatter(calendarWithVariants);
      const result = formatter.formatNamed(mockDate, 'date', 'short');

      // Assert
      expect(result).toBe('Jan 15');
    });
  });

  describe('Format Embedding', () => {
    it('should support embedding named formats with {{ss-dateFmt "name"}}', () => {
      // Arrange
      const calendarWithFormats: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          iso: '{{year}}-{{ss-month format="pad"}}-{{ss-day format="pad"}}',
          long: 'Today is {{ss-dateFmt "iso"}} ({{ss-weekday format="name"}})',
        },
      };

      // Act
      formatter = new DateFormatter(calendarWithFormats);
      const result = formatter.formatNamed(mockDate, 'long');

      // Assert
      expect(result).toBe('Today is 2024-01-15 (Monday)');
    });

    it('should handle nested format embedding', () => {
      // Arrange
      const calendarWithFormats: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          iso: '{{year}}-{{ss-month format="pad"}}-{{ss-day format="pad"}}',
          short: '{{ss-dateFmt "iso"}}',
          full: 'Date: {{ss-dateFmt "short"}} Time: {{ss-hour format="pad"}}:{{ss-minute format="pad"}}',
        },
      };

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
          invalid: 'Date: {{ss-dateFmt "nonexistent"}}',
        },
      };

      // Act
      formatter = new DateFormatter(calendarWithFormats);
      const result = formatter.formatNamed(mockDate, 'invalid');

      // Assert - should fall back to basic format when embedded format doesn't exist
      expect(result).toContain('Date:');
      expect(result).toContain('Monday');
      expect(result).toContain('15th');
      expect(result).toContain('January');
      expect(result).toContain('2024');
    });
  });

  describe('Mathematical Helpers', () => {
    beforeEach(() => {
      formatter = new DateFormatter(mockCalendar);
    });

    it('should render math:add helper for addition calculations', () => {
      // Test math helper through actual template rendering
      const result1 = formatter.format(mockDate, '{{ss-math year op="add" value=100}}');
      expect(result1).toBe('2124');

      const result2 = formatter.format(mockDate, '{{ss-math day op="add" value=1000}}');
      expect(result2).toBe('1015');
    });

    it('should render math:multiply helper for multiplication calculations', () => {
      // Test math helper through actual template rendering
      const result1 = formatter.format(mockDate, '{{ss-math year op="multiply" value=10}}');
      expect(result1).toBe('20240');

      const result2 = formatter.format(mockDate, '{{ss-math day op="multiply" value=100}}');
      expect(result2).toBe('1500');
    });

    it('should render math:subtract helper for subtraction calculations', () => {
      // Test math helper through actual template rendering
      const result1 = formatter.format(mockDate, '{{ss-math year op="subtract" value=1300}}');
      expect(result1).toBe('724');

      // Create mock date with day 365 for this test
      const mockDateWithDay365 = { ...mockDate, day: 365 };
      const result2 = formatter.format(
        mockDateWithDay365,
        '{{ss-math day op="subtract" value=15}}'
      );
      expect(result2).toBe('350');
    });

    it('should render stardate helper for stardate calculations', () => {
      // Test stardate helper through actual template rendering
      // TNG-era calculation: prefix + ((year - baseYear) * 1000) + dayOfYear
      const result1 = formatter.format(
        mockDate,
        '{{ss-stardate year prefix="47" baseYear=2024 dayOfYear=15}}'
      );
      expect(result1).toBe('47015.0');

      // Test with different year (2025)
      const mockDate2025 = { ...mockDate, year: 2025 };
      const result2 = formatter.format(
        mockDate2025,
        '{{ss-stardate year prefix="48" baseYear=2024 dayOfYear=100}}'
      );
      expect(result2).toBe('49100.0');
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

      // Act
      formatter = new DateFormatter(calendarWithStardate);
      const result = formatter.formatNamed(mockDate, 'tng');

      // Assert
      expect(result).toBe('47015.0');
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

      // Test actual dayOfYear calculation functionality

      // Act & Assert - Should not crash and should handle gracefully
      expect(() => {
        const result1 = formatter.formatNamed(dateWithZeroMonth, 'dayOfYearTest');
        expect(result1).toBe('1'); // With improved bounds checking, returns 1 (start of year fallback)
      }).not.toThrow();

      expect(() => {
        const result2 = formatter.formatNamed(dateWithNegativeMonth, 'dayOfYearTest');
        expect(result2).toBe('1'); // With improved bounds checking, returns 1 (start of year fallback)
      }).not.toThrow();

      expect(() => {
        const result3 = formatter.formatNamed(dateWithOversizedMonth, 'dayOfYearTest');
        expect(result3).toBe('1'); // With improved bounds checking, returns 1 (start of year fallback)
      }).not.toThrow();
    });

    it('should cache compiled templates without size limits', () => {
      // Arrange
      formatter = new DateFormatter(mockCalendar);

      // Act - Add templates to verify caching behavior
      // In real usage, calendars have ~10-25 formats, far below memory concerns
      const results = [];
      for (let i = 0; i <= 50; i++) {
        const uniqueTemplate = `{{year}}-{{month}}-{{day}}-${i}`;
        const result = formatter.format(mockDate, uniqueTemplate);
        results.push(result);
      }

      // Assert - Templates should compile and return expected results
      expect(results[0]).toBe('2024-1-15-0');
      expect(results[50]).toBe('2024-1-15-50');

      // Test that repeated calls work consistently
      const repeatedResult = formatter.format(mockDate, '{{year}}-{{month}}-{{day}}-0');
      expect(repeatedResult).toBe('2024-1-15-0');
    });

    it('should handle large numbers of templates gracefully', () => {
      // Arrange - Test that simple cache works with many templates
      formatter = new DateFormatter(mockCalendar);

      // Act - Use many templates (still far below real memory concerns)
      expect(() => {
        for (let i = 0; i < 200; i++) {
          const template = `Template number ${i}: {{year}}-{{month}}-{{day}}`;
          const result = formatter.format(mockDate, template);
          expect(result).toBe(`Template number ${i}: 2024-1-15`);
        }
      }).not.toThrow();

      // Assert - Should complete without errors and produce expected results
      const finalResult = formatter.format(
        mockDate,
        'Template number 199: {{year}}-{{month}}-{{day}}'
      );
      expect(finalResult).toBe('Template number 199: 2024-1-15');
    });
  });
});
