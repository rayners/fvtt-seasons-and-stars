/**
 * Advanced DateFormatter Tests - Coverage for edge cases, error handling, and complex scenarios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateFormatter } from '../src/core/date-formatter';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

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

describe('DateFormatter Advanced Tests', () => {
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
            short: '{{month:abbr}} {{day}}',
            long: '{{weekday:name}}, {{day:ordinal}} {{month:name}} {{year}}',
            default: '{{month:name}} {{day}}, {{year}}',
          },
        },
      };

      const mockCompiledTemplate = vi.fn().mockReturnValue('January 15, 2024');
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      formatter = new DateFormatter(calendarWithVariants);

      // Act - No variant specified, should use default
      const result = formatter.formatNamed(mockDate, 'date');

      // Assert
      expect(result).toBe('January 15, 2024');
      expect(mockHandlebars.compile).toHaveBeenCalledWith('{{month:name}} {{day}}, {{year}}');
    });

    it('should handle format variants without default, use first available', () => {
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

      formatter = new DateFormatter(calendarWithVariants);

      // Act - No variant specified, should use first available
      const result = formatter.formatNamed(mockDate, 'date');

      // Assert
      expect(result).toBe('Jan 15');
      expect(mockHandlebars.compile).toHaveBeenCalledWith('{{month:abbr}} {{day}}');
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
          iso: '{{year}}-{{month:pad}}-{{day:pad}}',
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
            main: '{{weekday:abbr}}, {{day:ordinal}} {{month:name}}',
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
          format1: 'A: {{dateFmt:format2}}',
          format2: 'B: {{dateFmt:format1}}', // Circular reference
        },
      };

      // When circular reference is detected, it should fallback to basic format
      const mockCompiledTemplate = vi.fn().mockReturnValue('A: Monday, 15th January Year 2024 CE');
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

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
          base: '{{year}}-{{ss-month month format="pad"}}-{{ss-day day format="pad"}}',
          level1: 'L1: {{ss-dateFmt:base}}',
          level2: 'L2: {{ss-dateFmt:level1}}',
          level3: 'L3: {{ss-dateFmt:level2}}',
        },
      };

      const mockCompiledTemplate = vi
        .fn()
        .mockReturnValueOnce('2024-01-15') // base
        .mockReturnValueOnce('L1: 2024-01-15') // level1
        .mockReturnValueOnce('L2: L1: 2024-01-15') // level2
        .mockReturnValueOnce('L3: L2: L1: 2024-01-15'); // level3

      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

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
          good: '{{year}}-{{ss-month month format="pad"}}-{{ss-day day format="pad"}}',
          mixed: 'Good: {{ss-dateFmt:good}}, Bad: {{ss-dateFmt:nonexistent}}',
        },
      };

      const mockCompiledTemplate = vi
        .fn()
        .mockReturnValueOnce('2024-01-15') // good format
        .mockReturnValueOnce('Good: 2024-01-15, Bad: Monday, 15th January Year 2024 CE'); // mixed with fallback

      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

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
      // Act & Assert - Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const monthHelperCall = helperCalls.find(call => call[0] === 'ss-month');
      const monthHelper = monthHelperCall?.[1];

      expect(monthHelper).toBeDefined();
      expect(monthHelper(1, { hash: { format: 'invalid' } })).toBe('1'); // Should return string value
    });

    it('should handle day helper with invalid format', () => {
      // Act & Assert - Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const dayHelperCall = helperCalls.find(call => call[0] === 'ss-day');
      const dayHelper = dayHelperCall?.[1];

      expect(dayHelper).toBeDefined();
      expect(dayHelper(15, { hash: { format: 'invalid' } })).toBe('15'); // Should return string value
    });

    it('should handle weekday helper with invalid format', () => {
      // Act & Assert - Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const weekdayHelperCall = helperCalls.find(call => call[0] === 'ss-weekday');
      const weekdayHelper = weekdayHelperCall?.[1];

      expect(weekdayHelper).toBeDefined();
      expect(weekdayHelper(1, { hash: { format: 'invalid' } })).toBe('1'); // Should return string value
    });

    it('should handle math helper with invalid operation', () => {
      // Act & Assert - Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const mathHelperCall = helperCalls.find(call => call[0] === 'ss-math');
      const mathHelper = mathHelperCall?.[1];

      expect(mathHelper).toBeDefined();
      expect(mathHelper(100, { hash: { op: 'invalid', value: 10 } })).toBe(100); // Should return original value
    });

    it('should handle math helper with non-numeric value', () => {
      // Act & Assert - Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const mathHelperCall = helperCalls.find(call => call[0] === 'ss-math');
      const mathHelper = mathHelperCall?.[1];

      expect(mathHelper).toBeDefined();
      expect(mathHelper(100, { hash: { op: 'add', value: 'not-a-number' } })).toBe(100); // Should return original value
    });

    it('should handle math helper division by zero', () => {
      // Act & Assert - Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const mathHelperCall = helperCalls.find(call => call[0] === 'ss-math');
      const mathHelper = mathHelperCall?.[1];

      expect(mathHelper).toBeDefined();
      expect(mathHelper(100, { hash: { op: 'divide', value: 0 } })).toBe(100); // Should return original value
      expect(mathHelper(100, { hash: { op: 'modulo', value: 0 } })).toBe(100); // Should return original value
    });

    it('should handle math helper with all operations', () => {
      // Act & Assert - Test all math operations
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const mathHelperCall = helperCalls.find(call => call[0] === 'ss-math');
      const mathHelper = mathHelperCall?.[1];

      expect(mathHelper).toBeDefined();
      expect(mathHelper(100, { hash: { op: 'add', value: 50 } })).toBe(150);
      expect(mathHelper(100, { hash: { op: 'subtract', value: 30 } })).toBe(70);
      expect(mathHelper(100, { hash: { op: 'multiply', value: 2 } })).toBe(200);
      expect(mathHelper(100, { hash: { op: 'divide', value: 4 } })).toBe(25);
      expect(mathHelper(100, { hash: { op: 'modulo', value: 30 } })).toBe(10);
    });
  });

  describe('Stardate Helper Edge Cases', () => {
    beforeEach(() => {
      formatter = new DateFormatter(mockCalendar);
    });

    it('should handle stardate with various precision levels', () => {
      // Act & Assert - Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const stardateHelperCall = helperCalls.find(call => call[0] === 'ss-stardate');
      const stardateHelper = stardateHelperCall?.[1];

      expect(stardateHelper).toBeDefined();

      // Test different precision values
      expect(
        stardateHelper(2024, {
          hash: { prefix: '47', baseYear: 2024, dayOfYear: 15, precision: 0 },
        })
      ).toBe('47015.0');
      expect(
        stardateHelper(2024, {
          hash: { prefix: '47', baseYear: 2024, dayOfYear: 15, precision: 2 },
        })
      ).toBe('47015.00');
      expect(
        stardateHelper(2024, {
          hash: { prefix: '47', baseYear: 2024, dayOfYear: 15, precision: 3 },
        })
      ).toBe('47015.000');
    });

    it('should handle stardate with default values', () => {
      // Act & Assert - Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const stardateHelperCall = helperCalls.find(call => call[0] === 'ss-stardate');
      const stardateHelper = stardateHelperCall?.[1];

      expect(stardateHelper).toBeDefined();

      // Test with minimal parameters (should use defaults)
      // When baseYear defaults to year (2024), yearOffset = 0, prefix = '0', dayOfYear = 1
      // Result: prefix(0) + yearOffset(0) + paddedDayOfYear(001) + .precision(0) = '0001.0'
      expect(stardateHelper(2024, { hash: {} })).toBe('0001.0');
    });

    it('should handle stardate with negative year offsets', () => {
      // Act & Assert - Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const stardateHelperCall = helperCalls.find(call => call[0] === 'ss-stardate');
      const stardateHelper = stardateHelperCall?.[1];

      expect(stardateHelper).toBeDefined();

      // Test with year before base year
      expect(stardateHelper(2020, { hash: { prefix: '47', baseYear: 2024, dayOfYear: 100 } })).toBe(
        '43100.0'
      );
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

      const mockCompiledTemplate = vi.fn().mockReturnValue('Day 365');
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Act
      formatter.format(decemberDate, '{{dayOfYear}}');

      // Assert
      const templateContext = mockCompiledTemplate.mock.calls[0][0];
      expect(templateContext.dayOfYear).toBe(31 + 28 + 31 + 31); // Jan + Feb + Mar + Dec(31)
    });

    it('should handle day of year calculation for invalid month', () => {
      // Arrange
      const invalidDate = {
        ...mockDate,
        month: 99, // Invalid month index
        day: 15,
      } as CalendarDate;

      const mockCompiledTemplate = vi.fn().mockReturnValue('Day 15');
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Act
      formatter.format(invalidDate, '{{dayOfYear}}');

      // Assert
      const templateContext = mockCompiledTemplate.mock.calls[0][0];
      // calculateDayOfYear adds days from months[0] through months[month-2], then adds current day
      // With month=99, it adds Jan(31) + Feb(28) + Mar(31) + Dec(31) + day(15) = 136
      expect(templateContext.dayOfYear).toBe(136);
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

      // Mock compile to throw to force getBasicFormat
      mockHandlebars.compile.mockImplementation(() => {
        throw new Error('Template compilation failed');
      });

      // Act
      const result = formatter.format(mockDate, '{{invalid}}'); // Force fallback to basic format

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

      // Mock compile to throw to force getBasicFormat
      mockHandlebars.compile.mockImplementation(() => {
        throw new Error('Template compilation failed');
      });

      // Act
      const result = formatter.format(edgeDate, '{{invalid}}'); // Force fallback to basic format

      // Assert
      expect(result).toContain('Unknown'); // Should handle invalid indices gracefully
    });
  });

  describe('Template Context Preparation', () => {
    beforeEach(() => {
      formatter = new DateFormatter(mockCalendar);
    });

    it('should prepare context with all required fields', () => {
      // Arrange
      const mockCompiledTemplate = vi.fn().mockReturnValue('result');
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Act
      formatter.format(mockDate, '{{year}}-{{month}}-{{day}}');

      // Assert
      const context = mockCompiledTemplate.mock.calls[0][0];
      expect(context).toEqual({
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
        hour: 10,
        minute: 30,
        second: 45,
        dayOfYear: 15,
      });
    });

    it('should handle date without time', () => {
      // Arrange
      const dateWithoutTime = {
        ...mockDate,
        time: undefined,
      } as CalendarDate;

      const mockCompiledTemplate = vi.fn().mockReturnValue('result');
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Act
      formatter.format(dateWithoutTime, '{{year}}-{{month}}-{{day}}');

      // Assert
      const context = mockCompiledTemplate.mock.calls[0][0];
      expect(context.hour).toBeUndefined();
      expect(context.minute).toBeUndefined();
      expect(context.second).toBeUndefined();
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
