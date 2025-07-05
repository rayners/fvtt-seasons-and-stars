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
      expect(result).toBe('2024-1-15'); // Should fallback to basic format
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

    it('should register s&s-day:ordinal helper for ordinal numbers', () => {
      // Arrange - DateFormatter should register helpers on construction

      // Act & Assert
      expect(mockHandlebars.registerHelper).toHaveBeenCalledWith('s&s-day', expect.any(Function));

      // Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const dayHelperCall = helperCalls.find(call => call[0] === 's&s-day');
      const dayHelper = dayHelperCall?.[1];

      expect(dayHelper).toBeDefined();
      expect(dayHelper(15, { hash: { format: 'ordinal' } })).toBe('15th');
      expect(dayHelper(1, { hash: { format: 'ordinal' } })).toBe('1st');
      expect(dayHelper(2, { hash: { format: 'ordinal' } })).toBe('2nd');
      expect(dayHelper(3, { hash: { format: 'ordinal' } })).toBe('3rd');
    });

    it('should register s&s-month:abbr helper for month abbreviations', () => {
      // Arrange
      mockDate.month = 1; // January

      // Act & Assert
      expect(mockHandlebars.registerHelper).toHaveBeenCalledWith('s&s-month', expect.any(Function));

      // Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const monthHelperCall = helperCalls.find(call => call[0] === 's&s-month');
      const monthHelper = monthHelperCall?.[1];

      expect(monthHelper).toBeDefined();
      expect(monthHelper(1, { hash: { format: 'abbr' } })).toBe('Jan');
      expect(monthHelper(2, { hash: { format: 'abbr' } })).toBe('Feb');
      expect(monthHelper(1, { hash: { format: 'name' } })).toBe('January');
    });

    it('should register s&s-weekday:name helper for weekday names', () => {
      // Arrange
      mockDate.weekday = 1; // Monday

      // Act & Assert
      expect(mockHandlebars.registerHelper).toHaveBeenCalledWith(
        's&s-weekday',
        expect.any(Function)
      );

      // Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const weekdayHelperCall = helperCalls.find(call => call[0] === 's&s-weekday');
      const weekdayHelper = weekdayHelperCall?.[1];

      expect(weekdayHelper).toBeDefined();
      expect(weekdayHelper(1, { hash: { format: 'name' } })).toBe('Monday');
      expect(weekdayHelper(0, { hash: { format: 'name' } })).toBe('Sunday');
      expect(weekdayHelper(1, { hash: { format: 'abbr' } })).toBe('Mon');
    });

    it('should register s&s-month:pad helper for zero-padded numbers', () => {
      // Act & Assert
      expect(mockHandlebars.registerHelper).toHaveBeenCalledWith('s&s-month', expect.any(Function));

      // Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const monthHelperCall = helperCalls.find(call => call[0] === 's&s-month');
      const monthHelper = monthHelperCall?.[1];

      expect(monthHelper).toBeDefined();
      expect(monthHelper(1, { hash: { format: 'pad' } })).toBe('01');
      expect(monthHelper(10, { hash: { format: 'pad' } })).toBe('10');
    });

    it('should register s&s-day:pad helper for zero-padded day numbers', () => {
      // Act & Assert
      expect(mockHandlebars.registerHelper).toHaveBeenCalledWith('s&s-day', expect.any(Function));

      // Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const dayHelperCall = helperCalls.find(call => call[0] === 's&s-day');
      const dayHelper = dayHelperCall?.[1];

      expect(dayHelper).toBeDefined();
      expect(dayHelper(5, { hash: { format: 'pad' } })).toBe('05');
      expect(dayHelper(15, { hash: { format: 'pad' } })).toBe('15');
    });

    it('should register s&s-dateFmt helper for embedding named formats', () => {
      // Arrange
      const mockFormats = {
        iso: '{{year}}-{{s&s-month:pad}}-{{s&s-day:pad}}',
        short: '{{s&s-month:abbr}} {{day}}',
      };

      // Act & Assert
      expect(mockHandlebars.registerHelper).toHaveBeenCalledWith(
        's&s-dateFmt',
        expect.any(Function)
      );

      // Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const dateFmtHelperCall = helperCalls.find(call => call[0] === 's&s-dateFmt');
      const dateFmtHelper = dateFmtHelperCall?.[1];

      expect(dateFmtHelper).toBeDefined();
      // This will be tested more thoroughly when format embedding is implemented
    });
  });

  describe('Calendar Schema Integration', () => {
    it('should support dateFormats from calendar schema', () => {
      // Arrange
      const calendarWithFormats: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          iso: '{{year}}-{{s&s-month:pad}}-{{s&s-day:pad}}',
          short: '{{s&s-month:abbr}} {{day}}',
          long: '{{s&s-weekday:name}}, {{s&s-day:ordinal}} {{s&s-month:name}} {{year}}',
          widgets: {
            mini: '{{s&s-month:abbr}} {{day}}',
            main: '{{s&s-weekday:abbr}}, {{s&s-day:ordinal}} {{s&s-month:name}}',
            grid: '{{day}}/{{s&s-month}}/{{year}}',
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
      expect(mockHandlebars.compile).toHaveBeenCalledWith(
        '{{year}}-{{s&s-month:pad}}-{{s&s-day:pad}}'
      );
    });

    it('should support widget-specific formats', () => {
      // Arrange
      const calendarWithFormats: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          widgets: {
            mini: '{{s&s-month:abbr}} {{day}}',
            main: '{{s&s-weekday:abbr}}, {{s&s-day:ordinal}} {{s&s-month:name}}',
            grid: '{{day}}/{{s&s-month}}/{{year}}',
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
      expect(mockHandlebars.compile).toHaveBeenCalledWith('{{s&s-month:abbr}} {{day}}');
    });

    it('should handle missing dateFormats gracefully', () => {
      // Arrange - calendar without dateFormats
      const mockCompiledTemplate = vi.fn().mockReturnValue('2024-1-15');
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Act
      formatter = new DateFormatter(mockCalendar);
      const result = formatter.formatNamed(mockDate, 'nonexistent');

      // Assert - should fallback to basic format
      expect(result).toBe('2024-1-15');
    });

    it('should handle variant formats (format as object)', () => {
      // Arrange
      const calendarWithVariants: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          date: {
            short: '{{s&s-month:abbr}} {{day}}',
            long: '{{s&s-weekday:name}}, {{s&s-day:ordinal}} {{s&s-month:name}} {{year}}',
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
      expect(mockHandlebars.compile).toHaveBeenCalledWith('{{s&s-month:abbr}} {{day}}');
    });
  });

  describe('Format Embedding', () => {
    it('should support embedding named formats with {{s&s-dateFmt:name}}', () => {
      // Arrange
      const calendarWithFormats: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          iso: '{{year}}-{{s&s-month:pad}}-{{s&s-day:pad}}',
          long: 'Today is {{s&s-dateFmt:iso}} ({{s&s-weekday:name}})',
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
        '{{year}}-{{s&s-month:pad}}-{{s&s-day:pad}}'
      );
      expect(mockHandlebars.compile).toHaveBeenCalledWith(
        'Today is 2024-01-15 ({{s&s-weekday:name}})'
      );
    });

    it('should handle nested format embedding', () => {
      // Arrange
      const calendarWithFormats: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          iso: '{{year}}-{{s&s-month:pad}}-{{s&s-day:pad}}',
          short: '{{s&s-dateFmt:iso}}',
          full: 'Date: {{s&s-dateFmt:short}} Time: {{s&s-hour:pad}}:{{s&s-minute:pad}}',
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
          invalid: 'Date: {{s&s-dateFmt:nonexistent}}',
        },
      };

      const mockCompiledTemplate = vi.fn().mockReturnValueOnce('Date: 2024-1-15'); // processed format with fallback embedded
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Act
      formatter = new DateFormatter(calendarWithFormats);
      const result = formatter.formatNamed(mockDate, 'invalid');

      // Assert
      expect(result).toBe('Date: 2024-1-15');
      // Should compile the processed template with fallback embedded
      expect(mockHandlebars.compile).toHaveBeenCalledWith('Date: 2024-1-15');
    });
  });

  describe('Mathematical Helpers', () => {
    beforeEach(() => {
      formatter = new DateFormatter(mockCalendar);
    });

    it('should register s&s-math:add helper for addition calculations', () => {
      // Act & Assert
      expect(mockHandlebars.registerHelper).toHaveBeenCalledWith('s&s-math', expect.any(Function));

      // Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const mathHelperCall = helperCalls.find(call => call[0] === 's&s-math');
      const mathHelper = mathHelperCall?.[1];

      expect(mathHelper).toBeDefined();
      expect(mathHelper(2024, { hash: { op: 'add', value: 100 } })).toBe(2124);
      expect(mathHelper(15, { hash: { op: 'add', value: 1000 } })).toBe(1015);
    });

    it('should register s&s-math:multiply helper for multiplication calculations', () => {
      // Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const mathHelperCall = helperCalls.find(call => call[0] === 's&s-math');
      const mathHelper = mathHelperCall?.[1];

      expect(mathHelper).toBeDefined();
      expect(mathHelper(2024, { hash: { op: 'multiply', value: 10 } })).toBe(20240);
      expect(mathHelper(15, { hash: { op: 'multiply', value: 100 } })).toBe(1500);
    });

    it('should register s&s-math:subtract helper for subtraction calculations', () => {
      // Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const mathHelperCall = helperCalls.find(call => call[0] === 's&s-math');
      const mathHelper = mathHelperCall?.[1];

      expect(mathHelper).toBeDefined();
      expect(mathHelper(2024, { hash: { op: 'subtract', value: 1300 } })).toBe(724);
      expect(mathHelper(365, { hash: { op: 'subtract', value: 15 } })).toBe(350);
    });

    it('should register s&s-stardate helper for stardate calculations', () => {
      // Act & Assert
      expect(mockHandlebars.registerHelper).toHaveBeenCalledWith(
        's&s-stardate',
        expect.any(Function)
      );

      // Test the helper function directly
      const helperCalls = mockHandlebars.registerHelper.mock.calls;
      const stardateHelperCall = helperCalls.find(call => call[0] === 's&s-stardate');
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
          tng: '{{s&s-stardate year prefix="47" baseYear=2024 dayOfYear=15}}',
          tos: '{{s&s-math year op="subtract" value=1300}}.{{day}}',
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
        '{{s&s-stardate year prefix="47" baseYear=2024 dayOfYear=15}}'
      );
    });
  });
});
