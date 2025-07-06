/**
 * Day of Year Bounds Checking - TDD test for improved error handling
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

describe('Day of Year Bounds Checking', () => {
  let formatter: DateFormatter;
  let mockCalendar: SeasonsStarsCalendar;

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
      ],
      weekdays: [{ name: 'Sunday', abbreviation: 'Sun' }],
      year: { prefix: '', suffix: '' },
      time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
    } as SeasonsStarsCalendar;

    formatter = new DateFormatter(mockCalendar);
  });

  describe('Invalid Month Bounds Handling', () => {
    it('should return reasonable dayOfYear for negative month values', () => {
      // RED: Current implementation just returns date.day which may not be meaningful
      const invalidDate = {
        year: 2024,
        month: -1, // Invalid negative month
        day: 15,
        weekday: 0,
      } as CalendarDate;

      const template = 'Day {{dayOfYear}} of {{year}}';

      // Mock template to return the dayOfYear value for inspection
      const mockCompiledTemplate = vi.fn(context => `Day ${context.dayOfYear} of ${context.year}`);
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      const result = formatter.format(invalidDate, template);

      // Improved behavior: returns 1 (start of year fallback) for invalid months
      expect(result).toBe('Day 1 of 2024');

      // This is much better than returning the meaningless day value (15)
      // Now invalid months consistently return dayOfYear=1 (start of year)
      expect(mockCompiledTemplate).toHaveBeenCalledWith({
        year: 2024,
        month: -1,
        day: 15,
        weekday: 0,
        hour: undefined,
        minute: undefined,
        second: undefined,
        dayOfYear: 1, // Improved: meaningful fallback value
        _calendarId: 'test-calendar',
      });
    });

    it('should return reasonable dayOfYear for month values exceeding calendar length', () => {
      // RED: Month index beyond calendar bounds
      const invalidDate = {
        year: 2024,
        month: 99, // Way beyond the 3 months in our test calendar
        day: 10,
        weekday: 0,
      } as CalendarDate;

      const template = 'Day {{dayOfYear}} of {{year}}';

      const mockCompiledTemplate = vi.fn(context => `Day ${context.dayOfYear} of ${context.year}`);
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      const result = formatter.format(invalidDate, template);

      // Improved behavior returns 1 (start of year fallback) for invalid months
      expect(result).toBe('Day 1 of 2024');

      // The dayOfYear is now meaningful - consistent fallback to start of year
      expect(mockCompiledTemplate).toHaveBeenCalledWith({
        year: 2024,
        month: 99,
        day: 10,
        weekday: 0,
        hour: undefined,
        minute: undefined,
        second: undefined,
        dayOfYear: 1, // Improved: consistent fallback behavior
        _calendarId: 'test-calendar',
      });
    });

    it('should handle zero month (0-based vs 1-based confusion) gracefully', () => {
      // RED: Month 0 is invalid for 1-based month system
      const invalidDate = {
        year: 2024,
        month: 0, // Should be 1-based, so 0 is invalid
        day: 5,
        weekday: 0,
      } as CalendarDate;

      const template = 'Day {{dayOfYear}} of {{year}}';

      const mockCompiledTemplate = vi.fn(context => `Day ${context.dayOfYear} of ${context.year}`);
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      const result = formatter.format(invalidDate, template);

      expect(result).toBe('Day 1 of 2024');

      // Now handled properly with consistent start-of-year fallback
      expect(mockCompiledTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          dayOfYear: 1, // Improved: consistent handling of invalid month
        })
      );
    });
  });

  describe('Improved Bounds Checking Requirements', () => {
    it('should return meaningful dayOfYear for valid dates', () => {
      // GREEN: This should work correctly
      const validDate = {
        year: 2024,
        month: 2, // February
        day: 10,
        weekday: 0,
      } as CalendarDate;

      const template = 'Day {{dayOfYear}} of {{year}}';

      const mockCompiledTemplate = vi.fn(context => `Day ${context.dayOfYear} of ${context.year}`);
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      formatter.format(validDate, template);

      // Should be 31 (January) + 10 (February 10th) = 41
      expect(mockCompiledTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          dayOfYear: 41,
        })
      );
    });

    it('should return 1 for invalid month to indicate start of year fallback', () => {
      // RED: This test will fail until we improve the bounds checking
      const invalidDate = {
        year: 2024,
        month: -5,
        day: 15,
        weekday: 0,
      } as CalendarDate;

      const template = 'Day {{dayOfYear}} of {{year}}';

      const mockCompiledTemplate = vi.fn(context => `Day ${context.dayOfYear} of ${context.year}`);
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      formatter.format(invalidDate, template);

      // After improvement, should return 1 to indicate start of year fallback
      // instead of the meaningless day value (15)
      expect(mockCompiledTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          dayOfYear: 1, // This will fail until we fix the implementation
        })
      );
    });
  });
});
