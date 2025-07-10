/**
 * Advanced DateFormatter Tests - Coverage for edge cases, error handling, and complex scenarios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateFormatter } from '../src/core/date-formatter';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Use REAL Handlebars for date formatter testing (following star-trek test pattern)
import Handlebars from 'handlebars';
global.Handlebars = Handlebars;

describe('DateFormatter Advanced Tests', () => {
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
      // When circular reference is detected in format2, it gets replaced with basic format
      // So format1 becomes 'A: Monday, 15th January Year 2024 CE'
      expect(result).toBe('A: Monday, 15th January Year 2024 CE');
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
});
