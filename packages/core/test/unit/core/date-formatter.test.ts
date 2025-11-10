/**
 * Date Formatter Tests - Comprehensive unit tests for Handlebars-based date formatting
 *
 * Consolidated from:
 * - date-formatter.test.ts (basic functionality)
 * - date-formatter-advanced.test.ts (advanced features and edge cases)
 * - date-formatter-edge-cases.test.ts (critical edge cases)
 * - date-formatter-bounds-check.test.ts (array bounds validation)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateFormatter } from '../../../src/core/date-formatter';
import { CalendarDate } from '../../../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';

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
        { name: 'March', abbreviation: 'Mar', days: 31 },
        { name: 'December', abbreviation: 'Dec', days: 31 },
      ],
      weekdays: [
        { name: 'Sunday', abbreviation: 'Sun' },
        { name: 'Monday', abbreviation: 'Mon' },
        { name: 'Tuesday', abbreviation: 'Tue' },
        { name: 'Wednesday', abbreviation: 'Wed' },
        { name: 'Thursday', abbreviation: 'Thu' },
        { name: 'Friday', abbreviation: 'Fri' },
        { name: 'Saturday', abbreviation: 'Sat' },
      ],
      year: { prefix: 'Year ', suffix: ' CE' },
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
      expect(result).toBe('Monday, 15th January Year 2024 CE'); // Should fallback to basic format
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

    it('should render week within month for Roshar-style calendars', () => {
      // Test week calculations with calendar's weekdays (7 weekdays = 7 days per week)
      formatter = new DateFormatter(mockCalendar);

      // Day 15 with 7-day weeks should be week 3
      const result7Day = formatter.format(mockDate, '{{ss-week}}');
      expect(result7Day).toBe('3');

      // Test with 5-day week override (Roshar style)
      const result5Day = formatter.format(mockDate, '{{ss-week daysPerWeek=5}}');
      expect(result5Day).toBe('3'); // Day 15 with 5-day weeks: days 11-15 are week 3

      // Test padding format
      const resultPadded = formatter.format(mockDate, '{{ss-week format="pad"}}');
      expect(resultPadded).toBe('03');

      // Test edge cases with 5-day week override
      const day1Date = { ...mockDate, day: 1 };
      const resultDay1 = formatter.format(day1Date, '{{ss-week daysPerWeek=5}}');
      expect(resultDay1).toBe('1'); // Day 1 is always week 1

      const day5Date = { ...mockDate, day: 5 };
      const resultDay5 = formatter.format(day5Date, '{{ss-week daysPerWeek=5}}');
      expect(resultDay5).toBe('1'); // Days 1-5 are week 1

      const day6Date = { ...mockDate, day: 6 };
      const resultDay6 = formatter.format(day6Date, '{{ss-week daysPerWeek=5}}');
      expect(resultDay6).toBe('2'); // Day 6 starts week 2
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
      expect(result).toBe('Monday, 15th January Year 2024 CE');
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

    it('should handle math helper with all operations', () => {
      // Test all math operations through template rendering
      // Use a fixed value of 100 for consistent testing
      const testDate = { ...mockDate, day: 100 };

      const add = formatter.format(testDate, '{{ss-math day op="add" value=50}}');
      expect(add).toBe('150');

      const subtract = formatter.format(testDate, '{{ss-math day op="subtract" value=30}}');
      expect(subtract).toBe('70');

      const multiply = formatter.format(testDate, '{{ss-math day op="multiply" value=2}}');
      expect(multiply).toBe('200');

      const divide = formatter.format(testDate, '{{ss-math day op="divide" value=4}}');
      expect(divide).toBe('25');

      const modulo = formatter.format(testDate, '{{ss-math day op="modulo" value=30}}');
      expect(modulo).toBe('10');
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

  describe('Named Format Variants', () => {
    beforeEach(() => {
      formatter = new DateFormatter(mockCalendar);
    });

    it('should handle format variants with default fallback', () => {
      // Arrange
      const calendarWithVariants: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          date: {
            short: '{{ss-month format="abbr"}} {{day}}',
            long: '{{ss-weekday format="name"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}} {{year}}',
            default: '{{ss-month format="name"}} {{day}}, {{year}}',
          },
        },
      };

      formatter = new DateFormatter(calendarWithVariants);

      // Act - No variant specified, should use default
      const result = formatter.formatNamed(mockDate, 'date');

      // Assert
      expect(result).toBe('January 15, 2024');
    });

    it('should handle format variants without default, use first available', () => {
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

      formatter = new DateFormatter(calendarWithVariants);

      // Act - No variant specified, should use first available
      const result = formatter.formatNamed(mockDate, 'date');

      // Assert
      expect(result).toBe('Jan 15');
    });

    it('should handle format variants with empty object', () => {
      // Arrange
      const calendarWithEmptyVariants: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          date: {},
        },
      };

      formatter = new DateFormatter(calendarWithEmptyVariants);

      // Act
      const result = formatter.formatNamed(mockDate, 'date');

      // Assert
      expect(result).toBe('Monday, 15th January Year 2024 CE'); // Should fallback to basic format
    });

    it('should handle array format gracefully', () => {
      // Arrange
      const calendarWithArrayFormat: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          date: ['{{month:abbr}}', '{{day}}'] as any, // Array format (unsupported)
        },
      };

      formatter = new DateFormatter(calendarWithArrayFormat);

      // Act
      const result = formatter.formatNamed(mockDate, 'date');

      // Assert
      expect(result).toBe('Monday, 15th January Year 2024 CE'); // Should fallback to basic format
    });
  });

  describe('Widget Format Edge Cases', () => {
    beforeEach(() => {
      formatter = new DateFormatter(mockCalendar);
    });

    it('should handle missing widgets object', () => {
      // Arrange
      const calendarWithoutWidgets: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          iso: '{{year}}-{{ss-month format="pad"}}-{{ss-day format="pad"}}',
        },
      };

      formatter = new DateFormatter(calendarWithoutWidgets);

      // Act
      const result = formatter.formatWidget(mockDate, 'mini');

      // Assert
      expect(result).toBe('Monday, 15th January Year 2024 CE'); // Should fallback to basic format
    });

    it('should handle missing specific widget format', () => {
      // Arrange
      const calendarWithPartialWidgets: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          widgets: {
            main: '{{ss-weekday format="abbr"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}}',
            // mini format missing
          },
        },
      };

      formatter = new DateFormatter(calendarWithPartialWidgets);

      // Act
      const result = formatter.formatWidget(mockDate, 'mini');

      // Assert
      expect(result).toBe('Monday, 15th January Year 2024 CE'); // Should fallback to basic format
    });
  });

  describe('Recursive Format Handling', () => {
    beforeEach(() => {
      formatter = new DateFormatter(mockCalendar);
    });

    it('should handle circular references in format embedding', () => {
      // Arrange
      const calendarWithCircularRefs: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          format1: 'A: {{ss-dateFmt "format2"}}',
          format2: 'B: {{ss-dateFmt "format1"}}', // Circular reference
        },
      };

      formatter = new DateFormatter(calendarWithCircularRefs);

      // Act
      const result = formatter.formatNamed(mockDate, 'format1');

      // Assert
      // When circular reference is detected for format1 within format2, that specific call returns basic format
      // So format2 becomes 'B: Monday, 15th January Year 2024 CE' and format1 becomes 'A: B: Monday, 15th January Year 2024 CE'
      expect(result).toBe('A: B: Monday, 15th January Year 2024 CE');
    });

    it('should handle deeply nested format embedding', () => {
      // Arrange
      const calendarWithDeepNesting: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          base: '{{year}}-{{ss-month format="pad"}}-{{ss-day format="pad"}}',
          level1: 'L1: {{ss-dateFmt "base"}}',
          level2: 'L2: {{ss-dateFmt "level1"}}',
          level3: 'L3: {{ss-dateFmt "level2"}}',
        },
      };

      formatter = new DateFormatter(calendarWithDeepNesting);

      // Act
      const result = formatter.formatNamed(mockDate, 'level3');

      // Assert
      expect(result).toBe('L3: L2: L1: 2024-01-15');
    });

    it('should handle mixed successful and failed embedded formats', () => {
      // Arrange
      const calendarWithMixedFormats: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          good: '{{year}}-{{ss-month format="pad"}}-{{ss-day format="pad"}}',
          mixed: 'Good: {{ss-dateFmt "good"}}, Bad: {{ss-dateFmt "nonexistent"}}',
        },
      };

      formatter = new DateFormatter(calendarWithMixedFormats);

      // Act
      const result = formatter.formatNamed(mockDate, 'mixed');

      // Assert
      expect(result).toBe('Good: 2024-01-15, Bad: Monday, 15th January Year 2024 CE');
    });
  });

  describe('Helper Error Handling', () => {
    beforeEach(() => {
      formatter = new DateFormatter(mockCalendar);
    });

    it('should handle month helper with invalid format', () => {
      // Test helper with invalid format through template rendering
      const result = formatter.format(mockDate, '{{ss-month format="invalid"}}');
      expect(result).toBe('1'); // Should return string value
    });

    it('should handle day helper with invalid format', () => {
      // Test helper with invalid format through template rendering
      const result = formatter.format(mockDate, '{{ss-day format="invalid"}}');
      expect(result).toBe('15'); // Should return string value
    });

    it('should handle weekday helper with invalid format', () => {
      // Test helper with invalid format through template rendering
      const result = formatter.format(mockDate, '{{ss-weekday format="invalid"}}');
      expect(result).toBe('1'); // Should return string value
    });

    it('should handle math helper with invalid operation', () => {
      // Test helper with invalid operation through template rendering
      const result = formatter.format(mockDate, '{{ss-math year op="invalid" value=10}}');
      expect(result).toBe('2024'); // Should return original value
    });

    it('should handle math helper with non-numeric value', () => {
      // Test helper with non-numeric value through template rendering
      const result = formatter.format(mockDate, '{{ss-math year op="add" value="not-a-number"}}');
      expect(result).toBe('2024'); // Should return original value
    });

    it('should handle math helper division by zero', () => {
      // Test helper division by zero through template rendering
      const result1 = formatter.format(mockDate, '{{ss-math year op="divide" value=0}}');
      expect(result1).toBe('2024'); // Should return original value

      const result2 = formatter.format(mockDate, '{{ss-math year op="modulo" value=0}}');
      expect(result2).toBe('2024'); // Should return original value
    });
  });

  describe('Stardate Helper Edge Cases', () => {
    beforeEach(() => {
      formatter = new DateFormatter(mockCalendar);
    });

    it('should handle stardate with various precision levels', () => {
      // Test different precision values through template rendering
      const result0 = formatter.format(
        mockDate,
        '{{ss-stardate year prefix="47" baseYear=2024 dayOfYear=15 precision=0}}'
      );
      expect(result0).toBe('47015.0');

      const result2 = formatter.format(
        mockDate,
        '{{ss-stardate year prefix="47" baseYear=2024 dayOfYear=15 precision=2}}'
      );
      expect(result2).toBe('47015.00');

      const result3 = formatter.format(
        mockDate,
        '{{ss-stardate year prefix="47" baseYear=2024 dayOfYear=15 precision=3}}'
      );
      expect(result3).toBe('47015.000');
    });

    it('should handle stardate with default values', () => {
      // Test with minimal parameters (should use defaults) through template rendering
      // When baseYear defaults to year (2024), yearOffset = 0, prefix = '0', dayOfYear = 1
      // Result: prefix(0) + yearOffset(0) + paddedDayOfYear(001) + .precision(0) = '0001.0'
      const result = formatter.format(mockDate, '{{ss-stardate year}}');
      expect(result).toBe('0001.0');
    });

    it('should handle stardate with negative year offsets', () => {
      // Test with year before base year through template rendering
      const testDate = { ...mockDate, year: 2020 };
      const result = formatter.format(
        testDate,
        '{{ss-stardate year prefix="47" baseYear=2024 dayOfYear=100}}'
      );
      expect(result).toBe('43100.0');
    });
  });

  describe('Day of Year Calculation Edge Cases', () => {
    beforeEach(() => {
      formatter = new DateFormatter(mockCalendar);
    });

    it('should handle day of year calculation for December', () => {
      // Arrange
      const decemberDate = {
        ...mockDate,
        month: 4, // December (index 3 in our test calendar)
        day: 31,
      } as CalendarDate;

      // Act
      const result = formatter.format(decemberDate, 'Day {{dayOfYear}}');

      // Assert
      const expectedDayOfYear = 31 + 28 + 31 + 31; // Jan + Feb + Mar + Dec(31)
      expect(result).toBe(`Day ${expectedDayOfYear}`);
    });

    it('should handle day of year calculation for invalid month', () => {
      // Arrange
      const invalidDate = {
        ...mockDate,
        month: 99, // Invalid month index
        day: 15,
      } as CalendarDate;

      // Act
      const result = formatter.format(invalidDate, 'Day {{dayOfYear}}');

      // Assert
      // With improved bounds checking, invalid month (99) now returns 1 (start of year fallback)
      // This is the correct behavior - much better than returning undefined or NaN
      expect(result).toBe('Day 1');
    });
  });

  describe('Basic Format Edge Cases', () => {
    beforeEach(() => {
      formatter = new DateFormatter(mockCalendar);
    });

    it('should handle calendar without year prefix/suffix', () => {
      // Arrange
      const calendarNoYear: SeasonsStarsCalendar = {
        ...mockCalendar,
        year: undefined as any,
      };

      formatter = new DateFormatter(calendarNoYear);

      // Act - Use invalid template to force fallback to basic format
      const result = formatter.format(mockDate, '{{invalid}}');

      // Assert
      expect(result).toBe('Monday, 15th January 2024'); // Should not have prefix/suffix
    });

    it('should handle month/weekday lookups with edge indices', () => {
      // Arrange
      const edgeDate = {
        ...mockDate,
        month: 0, // Invalid month (0-based but we expect 1-based)
        weekday: -1, // Invalid weekday
      } as CalendarDate;

      // Act - Use invalid template to force fallback to basic format
      const result = formatter.format(edgeDate, '{{invalid}}');

      // Assert
      expect(result).toContain('Unknown'); // Should handle invalid indices gracefully
    });
  });

  describe('Template Context Preparation', () => {
    beforeEach(() => {
      formatter = new DateFormatter(mockCalendar);
    });

    it('should prepare context with all required fields', () => {
      // Act - Test that context is prepared correctly by using all fields
      const result = formatter.format(
        mockDate,
        '{{year}}-{{month}}-{{day}}-{{weekday}}-{{hour}}-{{minute}}-{{second}}-{{dayOfYear}}'
      );

      // Assert - Verify all fields are available and correct
      expect(result).toBe('2024-1-15-1-10-30-45-15');
    });

    it('should handle date without time', () => {
      // Arrange
      const dateWithoutTime = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
      } as CalendarDate;

      // Act - Test that missing time fields are handled gracefully
      const result = formatter.format(
        dateWithoutTime,
        '{{year}}-{{month}}-{{day}}-{{hour}}-{{minute}}-{{second}}'
      );

      // Assert - Missing time fields should be undefined (rendered as empty)
      expect(result).toBe('2024-1-15---');
    });
  });

  describe('Format Validation', () => {
    beforeEach(() => {
      formatter = new DateFormatter(mockCalendar);
    });

    it('should handle null/undefined format names', () => {
      // Act
      const result1 = formatter.formatNamed(mockDate, null as any);
      const result2 = formatter.formatNamed(mockDate, undefined as any);

      // Assert
      expect(result1).toBe('Monday, 15th January Year 2024 CE');
      expect(result2).toBe('Monday, 15th January Year 2024 CE');
    });

    it('should handle empty format names', () => {
      // Act
      const result = formatter.formatNamed(mockDate, '');

      // Assert
      expect(result).toBe('Monday, 15th January Year 2024 CE');
    });

    it('should handle null/undefined widget types', () => {
      // Act
      const result1 = formatter.formatWidget(mockDate, null as any);
      const result2 = formatter.formatWidget(mockDate, undefined as any);

      // Assert
      expect(result1).toBe('Monday, 15th January Year 2024 CE');
      expect(result2).toBe('Monday, 15th January Year 2024 CE');
    });
  });

  describe('Helper Syntax Edge Cases', () => {
    it('should handle single-quote format parameters gracefully', () => {
      formatter = new DateFormatter(mockCalendar);
      // Test actual Handlebars compilation error with unclosed quote
      const invalidSyntax = "{{ss-hour format='pad}}:{{ss-minute format='pad'}}";
      const result = formatter.format(mockDate, invalidSyntax);

      // Should fall back to basic format due to compilation error
      expect(result).toContain('2024');
      expect(result).toContain('1');
      expect(result).toContain('15');
    });

    it('should validate ss-stardate helper parameters', () => {
      formatter = new DateFormatter(mockCalendar);
      // Test complex stardate format with invalid syntax (unclosed quote)
      const complexStardateFormat =
        "{{ss-stardate year prefix='47 baseYear=2370 dayOfYear=dayOfYear precision=1}}";

      const result = formatter.format(mockDate, complexStardateFormat);

      // Should fall back to basic format when compilation fails due to syntax error
      expect(result).toContain('2024');
    });

    it('should detect and handle malformed helper syntax in calendar files', () => {
      formatter = new DateFormatter(mockCalendar);
      // Test malformed syntax with unclosed quote
      const malformedTimeFormat =
        "{{ss-hour format='pad}}:{{ss-minute format='pad'}}:{{ss-second format='pad'}} UTC";

      const result = formatter.format(mockDate, malformedTimeFormat);

      // Should fall back to basic format due to syntax error
      expect(result).toContain('2024');
    });
  });

  describe('Array Bounds Validation', () => {
    beforeEach(() => {
      // Use simple 2-month calendar for bounds testing
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
      formatter = new DateFormatter(mockCalendar);
    });

    it('should handle invalid month indices gracefully', () => {
      // Test invalid month index bounds checking
      const invalidDate = {
        ...mockDate,
        month: 99, // Invalid month index
      } as CalendarDate;

      // Access the calculateDayOfYear method indirectly through format
      const templateWithDayOfYear = 'Day {{dayOfYear}} of {{year}}';

      // This should not throw an error, but should handle the invalid month gracefully
      expect(() => {
        formatter.format(invalidDate, templateWithDayOfYear);
      }).not.toThrow();
    });

    it('should handle negative month indices gracefully', () => {
      // Test negative month index bounds checking
      const invalidDate = {
        ...mockDate,
        month: -1, // Invalid negative month index
      } as CalendarDate;

      const templateWithDayOfYear = 'Day {{dayOfYear}} of {{year}}';

      // This should not throw an error, but should handle the invalid month gracefully
      expect(() => {
        formatter.format(invalidDate, templateWithDayOfYear);
      }).not.toThrow();
    });

    it('should handle month index of zero gracefully', () => {
      // Test zero month index bounds checking (0-based vs 1-based confusion)
      const invalidDate = {
        ...mockDate,
        month: 0, // Invalid month index (should be 1-based)
      } as CalendarDate;

      const templateWithDayOfYear = 'Day {{dayOfYear}} of {{year}}';

      // This should not throw an error, but should handle the invalid month gracefully
      expect(() => {
        formatter.format(invalidDate, templateWithDayOfYear);
      }).not.toThrow();
    });

    it('should handle out of bounds month for calculateDayOfYear', () => {
      // Create a date with month index that's out of bounds for our 2-month calendar
      const outOfBoundsDate = {
        year: 2024,
        month: 5, // This is out of bounds for a 2-month calendar
        day: 15,
        weekday: 1,
        time: { hour: 14, minute: 30, second: 45 },
      } as CalendarDate;

      // Create a template that will trigger calculateDayOfYear
      const templateNeedingDayOfYear = 'Day {{dayOfYear}} of {{year}}';

      // This call will trigger prepareTemplateContext which calls calculateDayOfYear
      const result = formatter.format(outOfBoundsDate, templateNeedingDayOfYear);

      // Extract the dayOfYear from the result
      const match = result.match(/Day (\d+) of/);
      const dayOfYear = match ? parseInt(match[1]) : NaN;

      // The dayOfYear should be a valid number, not NaN or undefined
      expect(dayOfYear).toBeDefined();
      expect(typeof dayOfYear).toBe('number');
      expect(Number.isNaN(dayOfYear)).toBe(false);
    });

    it('should handle negative month in calculateDayOfYear', () => {
      const negativeMonthDate = {
        year: 2024,
        month: -1, // Negative month
        day: 15,
        weekday: 1,
        time: { hour: 14, minute: 30, second: 45 },
      } as CalendarDate;

      const templateNeedingDayOfYear = 'Day {{dayOfYear}} of {{year}}';
      const result = formatter.format(negativeMonthDate, templateNeedingDayOfYear);

      // Extract the dayOfYear from the result
      const match = result.match(/Day (\d+) of/);
      const dayOfYear = match ? parseInt(match[1]) : NaN;

      expect(dayOfYear).toBeDefined();
      expect(typeof dayOfYear).toBe('number');
      expect(Number.isNaN(dayOfYear)).toBe(false);
      expect(dayOfYear).toBeGreaterThan(0); // Should be positive
    });

    it('should handle zero month in calculateDayOfYear', () => {
      const zeroMonthDate = {
        year: 2024,
        month: 0, // Zero month (should be 1-based)
        day: 15,
        weekday: 1,
        time: { hour: 14, minute: 30, second: 45 },
      } as CalendarDate;

      const templateNeedingDayOfYear = 'Day {{dayOfYear}} of {{year}}';
      const result = formatter.format(zeroMonthDate, templateNeedingDayOfYear);

      // Extract the dayOfYear from the result
      const match = result.match(/Day (\d+) of/);
      const dayOfYear = match ? parseInt(match[1]) : NaN;

      expect(dayOfYear).toBeDefined();
      expect(typeof dayOfYear).toBe('number');
      expect(Number.isNaN(dayOfYear)).toBe(false);
      expect(dayOfYear).toBeGreaterThan(0); // Should be positive
    });

    it('should handle invalid month values in calculateDayOfYear gracefully', () => {
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

      // Act & Assert - Should not crash and should handle gracefully
      expect(() => {
        const result1 = formatter.format(dateWithZeroMonth, 'Day {{dayOfYear}}');
        expect(result1).toBe('Day 1'); // With improved bounds checking, returns 1 (start of year fallback)
      }).not.toThrow();

      expect(() => {
        const result2 = formatter.format(dateWithNegativeMonth, 'Day {{dayOfYear}}');
        expect(result2).toBe('Day 1'); // With improved bounds checking, returns 1 (start of year fallback)
      }).not.toThrow();

      expect(() => {
        const result3 = formatter.format(dateWithOversizedMonth, 'Day {{dayOfYear}}');
        expect(result3).toBe('Day 1'); // With improved bounds checking, returns 1 (start of year fallback)
      }).not.toThrow();
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
        expect(result1).toBe('Monday, 15th January Year 2024 CE'); // Should fallback to basic format
      }).not.toThrow();

      expect(() => {
        const result2 = formatter.formatNamed(mockDate, 'malformed', 'variant2');
        expect(result2).toBe('Monday, 15th January Year 2024 CE'); // Should fallback to basic format
      }).not.toThrow();

      expect(() => {
        const result3 = formatter.formatNamed(mockDate, 'malformed', 'variant3');
        expect(result3).toBe('Monday, 15th January Year 2024 CE'); // Should fallback to basic format
      }).not.toThrow();

      expect(() => {
        const result4 = formatter.formatNamed(mockDate, 'malformed', 'variant4');
        expect(result4).toBe('Monday, 15th January Year 2024 CE'); // Should fallback to basic format
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
        expect(result).toBe('Monday, 15th January Year 2024 CE'); // Should fallback to basic format
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
