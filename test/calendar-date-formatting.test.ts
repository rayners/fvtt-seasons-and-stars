/**
 * CalendarDate Formatting Tests - Comprehensive coverage for date formatting functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar, CalendarDateData } from '../src/types/calendar';

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

describe('CalendarDate Formatting', () => {
  let mockCalendar: SeasonsStarsCalendar;
  let mockCalendarWithFormats: SeasonsStarsCalendar;

  beforeEach(() => {
    vi.clearAllMocks();

    // Basic calendar without dateFormats
    mockCalendar = {
      id: 'test-calendar',
      name: 'Test Calendar',
      months: [
        { name: 'January', abbreviation: 'Jan', days: 31 },
        { name: 'February', abbreviation: 'Feb', days: 28 },
        { name: 'March', abbreviation: 'Mar', days: 31 },
      ],
      weekdays: [
        { name: 'Sunday', abbreviation: 'Sun' },
        { name: 'Monday', abbreviation: 'Mon' },
        { name: 'Tuesday', abbreviation: 'Tue' },
      ],
      year: { prefix: 'Year ', suffix: ' CE' },
      time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
    } as SeasonsStarsCalendar;

    // Calendar with comprehensive dateFormats
    mockCalendarWithFormats = {
      ...mockCalendar,
      dateFormats: {
        // Basic formats
        short: '{{ss-month format="abbr"}} {{ss-day}}',
        long: '{{ss-weekday format="name"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}} {{year}}',
        iso: '{{year}}-{{ss-month format="pad"}}-{{ss-day format="pad"}}',

        // Widget formats
        widgets: {
          mini: '{{ss-month format="abbr"}} {{ss-day}}',
          main: '{{ss-weekday format="abbr"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}}',
          grid: '{{ss-day}}/{{ss-month}}/{{year}}',
        },

        // Time formats
        time: '{{ss-hour format="pad"}}:{{ss-minute format="pad"}}:{{ss-second format="pad"}}',
        datetime: '{{ss-dateFmt formatName="long"}} {{ss-dateFmt formatName="time"}}',

        // Complex formats with embedding
        formal: 'On {{ss-dateFmt formatName="long"}} at {{ss-dateFmt formatName="time"}}',

        // Variant formats (object style)
        date: {
          short: '{{ss-month format="abbr"}} {{ss-day}}',
          long: '{{ss-weekday format="name"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}} {{year}}',
          default: '{{ss-month format="name"}} {{ss-day}}, {{year}}',
        },

        // Calendar-specific formats
        fantasy: '{{ss-day format="ordinal"}} day of {{ss-month format="name"}}, {{year}}',
      },
    } as SeasonsStarsCalendar;

    // Setup mock template compilation
    const mockCompiledTemplate = vi.fn(data => {
      // Return formatted output based on input data
      if (data.year && data.month && data.day) {
        return `${data.year}-${data.month}-${data.day}`;
      }
      return 'formatted-date';
    });
    mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);
  });

  describe('Basic Format Method', () => {
    it('should format date with template and options', () => {
      // Arrange
      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
        time: { hour: 10, minute: 30, second: 45 },
      };
      const date = new CalendarDate(dateData, mockCalendarWithFormats);

      // Act
      const result = date.format({
        format: 'short',
        includeTime: false,
        includeWeekday: false,
      });

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should format date with includeTime option', () => {
      // Arrange
      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
        time: { hour: 10, minute: 30, second: 45 },
      };
      const date = new CalendarDate(dateData, mockCalendarWithFormats);

      // Act
      const result = date.format({
        includeTime: true,
        format: 'long',
      });

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should format date with numeric format option', () => {
      // Arrange
      const dateData: CalendarDateData = {
        year: 2024,
        month: 2,
        day: 29,
        weekday: 0,
      };
      const date = new CalendarDate(dateData, mockCalendarWithFormats);

      // Act
      const result = date.format({
        format: 'numeric',
        includeYear: true,
        includeWeekday: false,
      });

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle intercalary days', () => {
      // Arrange
      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 1,
        weekday: 0,
        intercalary: 'Leap Day',
      };
      const date = new CalendarDate(dateData, mockCalendar);

      const mockCompiledTemplate = vi.fn().mockReturnValue('Leap Day');
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      // Act
      const result = date.format();

      // Assert
      expect(result).toBe('Leap Day'); // Should return intercalary string directly
      expect(mockHandlebars.compile).toHaveBeenCalledWith('Leap Day'); // buildTemplateFromOptions returns intercalary directly
    });
  });

  describe('String Formatting Methods', () => {
    it('should generate short string format', () => {
      // Arrange
      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
      };
      const date = new CalendarDate(dateData, mockCalendarWithFormats);

      // Act
      const result = date.toShortString();

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should generate short string for calendar without dateFormats', () => {
      // Arrange
      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
      };
      const date = new CalendarDate(dateData, mockCalendar);

      // Act
      const result = date.toShortString();

      // Assert
      expect(result).toBe('15 Jan Year 2024 CE');
    });

    it('should generate long string format', () => {
      // Arrange
      const dateData: CalendarDateData = {
        year: 2024,
        month: 2,
        day: 29,
        weekday: 0,
        time: { hour: 14, minute: 30, second: 0 },
      };
      const date = new CalendarDate(dateData, mockCalendarWithFormats);

      // Act
      const result = date.toLongString();

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should generate long string for calendar without dateFormats', () => {
      // Arrange
      const dateData: CalendarDateData = {
        year: 2024,
        month: 2,
        day: 29,
        weekday: 0,
        time: { hour: 14, minute: 30, second: 0 },
      };
      const date = new CalendarDate(dateData, mockCalendar);

      // Act
      const result = date.toLongString();

      // Assert
      expect(result).toBe('Sunday, 29th February Year 2024 CE 14:30:00');
    });

    it('should generate date string format', () => {
      // Arrange
      const dateData: CalendarDateData = {
        year: 2024,
        month: 3,
        day: 1,
        weekday: 2,
      };
      const date = new CalendarDate(dateData, mockCalendarWithFormats);

      // Act
      const result = date.toDateString();

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should generate date string for calendar without dateFormats', () => {
      // Arrange
      const dateData: CalendarDateData = {
        year: 2024,
        month: 3,
        day: 1,
        weekday: 2,
      };
      const date = new CalendarDate(dateData, mockCalendar);

      // Act
      const result = date.toDateString();

      // Assert
      expect(result).toBe('Tuesday, 1st March Year 2024 CE');
    });

    it('should generate time string format', () => {
      // Arrange
      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
        time: { hour: 9, minute: 5, second: 30 },
      };
      const date = new CalendarDate(dateData, mockCalendarWithFormats);

      // Act
      const result = date.toTimeString();

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle empty time string when no time present', () => {
      // Arrange
      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
      };
      const date = new CalendarDate(dateData, mockCalendar);

      // Act
      const result = date.toTimeString();

      // Assert
      expect(result).toBe('');
    });

    it('should generate time string for calendar without time format', () => {
      // Arrange
      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
        time: { hour: 9, minute: 5, second: 30 },
      };
      const date = new CalendarDate(dateData, mockCalendar);

      // Act
      const result = date.toTimeString();

      // Assert
      expect(result).toBe('09:05:30');
    });
  });

  describe('Format Fallback Handling', () => {
    it('should fallback to basic format when template fails', () => {
      // Arrange
      mockHandlebars.compile.mockImplementation(() => {
        throw new Error('Template compilation failed');
      });

      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
      };
      const date = new CalendarDate(dateData, mockCalendarWithFormats);

      // Act
      const result = date.toShortString();

      // Assert
      expect(result).toBe('Monday, 15th January Year 2024 CE'); // DateFormatter.getBasicFormat() output
    });

    it('should fallback to basic format when long string fails', () => {
      // Arrange
      mockHandlebars.compile.mockImplementation(() => {
        throw new Error('Template compilation failed');
      });

      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
        time: { hour: 10, minute: 30, second: 45 },
      };
      const date = new CalendarDate(dateData, mockCalendarWithFormats);

      // Act
      const result = date.toLongString();

      // Assert
      expect(result).toBe('Monday, 15th January Year 2024 CE'); // DateFormatter.getBasicFormat() output (no time in basic format)
    });

    it('should fallback to basic format when date string fails', () => {
      // Arrange
      mockHandlebars.compile.mockImplementation(() => {
        throw new Error('Template compilation failed');
      });

      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
      };
      const date = new CalendarDate(dateData, mockCalendarWithFormats);

      // Act
      const result = date.toDateString();

      // Assert
      expect(result).toBe('Monday, 15th January Year 2024 CE');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid month index gracefully', () => {
      // Arrange
      const dateData: CalendarDateData = {
        year: 2024,
        month: 99, // Invalid month
        day: 15,
        weekday: 1,
      };
      const date = new CalendarDate(dateData, mockCalendar);

      // Act
      const result = date.toShortString();

      // Assert
      expect(result).toContain('Unknown');
    });

    it('should handle invalid weekday index gracefully', () => {
      // Arrange
      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 99, // Invalid weekday
      };
      const date = new CalendarDate(dateData, mockCalendar);

      // Act
      const result = date.toLongString();

      // Assert
      expect(result).toContain('Unknown');
    });

    it('should handle month without abbreviation', () => {
      // Arrange
      const calendarNoAbbr = {
        ...mockCalendar,
        months: [
          { name: 'January', days: 31 }, // No abbreviation
        ],
      };
      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
      };
      const date = new CalendarDate(dateData, calendarNoAbbr);

      // Act
      const result = date.toShortString();

      // Assert
      expect(result).toContain('Jan'); // Should use first 3 chars of name
    });

    it('should handle weekday without abbreviation', () => {
      // Arrange
      const calendarNoWeekdayAbbr = {
        ...mockCalendar,
        weekdays: [
          { name: 'Monday' }, // No abbreviation
        ],
      };
      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 0,
      };
      const date = new CalendarDate(dateData, calendarNoWeekdayAbbr);

      // Act
      const result = date.toLongString();

      // Assert
      expect(result).toContain('Monday'); // Should use full name
    });
  });

  describe('Calendar Date Utilities', () => {
    it('should clone date with modifications', () => {
      // Arrange
      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
        time: { hour: 10, minute: 30, second: 45 },
      };
      const originalDate = new CalendarDate(dateData, mockCalendar);

      // Act
      const clonedDate = originalDate.clone({
        month: 2,
        day: 29,
      });

      // Assert
      expect(clonedDate.year).toBe(2024);
      expect(clonedDate.month).toBe(2);
      expect(clonedDate.day).toBe(29);
      expect(clonedDate.weekday).toBe(1); // Unchanged
      expect(clonedDate.time?.hour).toBe(10); // Unchanged
    });

    it('should compare dates correctly', () => {
      // Arrange
      const date1Data: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
      };
      const date2Data: CalendarDateData = {
        year: 2024,
        month: 2,
        day: 15,
        weekday: 1,
      };
      const date1 = new CalendarDate(date1Data, mockCalendar);
      const date2 = new CalendarDate(date2Data, mockCalendar);

      // Act & Assert
      expect(date1.compareTo(date2Data)).toBeLessThan(0);
      expect(date2.compareTo(date1Data)).toBeGreaterThan(0);
      expect(date1.compareTo(date1Data)).toBe(0);
    });

    it('should check date equality', () => {
      // Arrange
      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
      };
      const date = new CalendarDate(dateData, mockCalendar);

      // Act & Assert
      expect(date.equals(dateData)).toBe(true);
      expect(date.equals({ ...dateData, day: 16 })).toBe(false);
    });

    it('should check date ordering', () => {
      // Arrange
      const earlyDate: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
      };
      const laterDate: CalendarDateData = {
        year: 2024,
        month: 2,
        day: 15,
        weekday: 1,
      };
      const date = new CalendarDate(earlyDate, mockCalendar);

      // Act & Assert
      expect(date.isBefore(laterDate)).toBe(true);
      expect(date.isAfter(laterDate)).toBe(false);
      expect(date.isBefore(earlyDate)).toBe(false);
      expect(date.isAfter(earlyDate)).toBe(false);
    });

    it('should convert to plain object', () => {
      // Arrange
      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
        time: { hour: 10, minute: 30, second: 45 },
      };
      const date = new CalendarDate(dateData, mockCalendar);

      // Act
      const plainObject = date.toObject();

      // Assert
      expect(plainObject).toEqual(dateData);
      expect(plainObject.time).not.toBe(dateData.time); // Should be a copy
    });

    it('should create date from plain object', () => {
      // Arrange
      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
      };

      // Act
      const date = CalendarDate.fromObject(dateData, mockCalendar);

      // Assert
      expect(date.year).toBe(2024);
      expect(date.month).toBe(1);
      expect(date.day).toBe(15);
      expect(date.weekday).toBe(1);
    });
  });

  describe('Time Comparison Edge Cases', () => {
    it('should compare dates with time differences', () => {
      // Arrange
      const date1Data: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
        time: { hour: 10, minute: 30, second: 45 },
      };
      const date2Data: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
        time: { hour: 11, minute: 30, second: 45 },
      };
      const date = new CalendarDate(date1Data, mockCalendar);

      // Act & Assert
      expect(date.compareTo(date2Data)).toBeLessThan(0);
      expect(date.isBefore(date2Data)).toBe(true);
    });

    it('should compare dates with one having no time', () => {
      // Arrange
      const dateWithTime: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
        time: { hour: 10, minute: 30, second: 45 },
      };
      const dateWithoutTime: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
      };
      const date = new CalendarDate(dateWithTime, mockCalendar);

      // Act & Assert
      expect(date.compareTo(dateWithoutTime)).toBe(0); // Should be equal when one has no time
    });
  });

  describe('Format Name Resolution', () => {
    it('should resolve format names based on options', () => {
      // Arrange
      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
        time: { hour: 10, minute: 30, second: 45 },
      };
      const date = new CalendarDate(dateData, mockCalendarWithFormats);

      // Act - Test different format options
      const shortResult = date.format({ format: 'short' });
      const longResult = date.format({ format: 'long' });
      const numericResult = date.format({ format: 'numeric' });

      // Assert
      expect(shortResult).toBeDefined();
      expect(longResult).toBeDefined();
      expect(numericResult).toBeDefined();
    });

    it('should handle time inclusion in format names', () => {
      // Arrange
      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
        time: { hour: 10, minute: 30, second: 45 },
      };
      const date = new CalendarDate(dateData, mockCalendarWithFormats);

      // Act
      const resultWithTime = date.format({
        format: 'long',
        includeTime: true,
      });

      // Assert
      expect(resultWithTime).toBeDefined();
      expect(typeof resultWithTime).toBe('string');
    });
  });
});
