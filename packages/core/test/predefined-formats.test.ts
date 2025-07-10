/**
 * Predefined Formats Tests - Comprehensive coverage for calendar dateFormats usage
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Handlebars from 'handlebars';
import { CalendarDate } from '../src/core/calendar-date';
import { DateFormatter } from '../src/core/date-formatter';
import type { SeasonsStarsCalendar, CalendarDateData } from '../src/types/calendar';

// Use REAL Handlebars for predefined formats testing
global.Handlebars = Handlebars;

describe('Predefined Formats Usage', () => {
  let mockCalendar: SeasonsStarsCalendar;
  let mockDate: CalendarDate;

  beforeEach(() => {
    // Reset Handlebars helpers before each test
    DateFormatter.resetHelpersForTesting();

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
      dateFormats: {
        // Basic formats using correct helper parameter syntax
        short: '{{ss-month format="abbr"}} {{ss-day}}',
        long: '{{ss-weekday format="name"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}} {{year}}',
        numeric: '{{ss-month}}/{{ss-day}}/{{year}}',

        // Time-related formats
        shortTime:
          '{{ss-month format="abbr"}} {{ss-day}} {{ss-hour format="pad"}}:{{ss-minute format="pad"}}',
        longTime:
          '{{ss-weekday format="name"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}} {{year}} {{ss-hour format="pad"}}:{{ss-minute format="pad"}}:{{ss-second format="pad"}}',
        datetime:
          '{{ss-month format="name"}} {{ss-day}}, {{year}} at {{ss-hour format="pad"}}:{{ss-minute format="pad"}}',
        timestamp:
          '{{year}}-{{ss-month format="pad"}}-{{ss-day format="pad"}} {{ss-hour format="pad"}}:{{ss-minute format="pad"}}:{{ss-second format="pad"}}',

        // Widget formats
        widgets: {
          mini: '{{ss-month format="abbr"}} {{ss-day}}',
          main: '{{ss-weekday format="abbr"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}}',
          grid: '{{ss-day}}/{{ss-month}}',
        },

        // Complex scenarios
        detailed:
          '{{ss-weekday format="name"}}, the {{ss-day format="ordinal"}} day of {{ss-month format="name"}}, {{year}}',
        brief: '{{ss-month format="abbr"}} {{ss-day}}/{{year}}',

        // Format variants (object style)
        date: {
          short: '{{ss-month format="abbr"}} {{ss-day}}',
          long: '{{ss-weekday format="name"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}} {{year}}',
          iso: '{{year}}-{{ss-month format="pad"}}-{{ss-day format="pad"}}',
          default: '{{ss-month format="name"}} {{ss-day}}, {{year}}',
        },
      },
    } as SeasonsStarsCalendar;

    const dateData: CalendarDateData = {
      year: 2024,
      month: 1,
      day: 15,
      weekday: 1,
      time: { hour: 10, minute: 30, second: 45 },
    };
    mockDate = new CalendarDate(dateData, mockCalendar);
  });

  describe('CalendarDate Format Options to Predefined Format Mapping', () => {
    it('should use predefined "short" format for short option', () => {
      // Act - this should find and use the 'short' format from dateFormats
      const result = mockDate.format({ format: 'short' });

      // Assert - should produce the expected short format output
      expect(result).toBe('Jan 15');
    });

    it('should use predefined "long" format for long option', () => {
      // Act - this should find and use the 'long' format from dateFormats
      const result = mockDate.format({ format: 'long' });

      // Assert - should produce the expected long format output
      expect(result).toBe('Monday, 15th January 2024');
    });

    it('should use predefined "numeric" format for numeric option', () => {
      // Act - this should find and use the 'numeric' format from dateFormats
      const result = mockDate.format({ format: 'numeric' });

      // Assert - should produce the expected numeric format output
      expect(result).toBe('1/15/2024');
    });

    it('should prioritize time-inclusive formats when includeTime is true', () => {
      // Act - should find shortTime format when includeTime is true
      const result = mockDate.format({ format: 'short', includeTime: true });

      // Assert - should use shortTime format and include the time
      expect(result).toBe('Jan 15 10:30');
    });

    it('should use datetime format when includeTime is true and no specific time format exists', () => {
      // Act - should find longTime format when includeTime is true
      const result = mockDate.format({ format: 'long', includeTime: true });

      // Assert - should use longTime format and include full time
      expect(result).toBe('Monday, 15th January 2024 10:30:45');
    });

    it('should use datetime format when includeTime is true and format is numeric', () => {
      // Act - should find datetime format when no numericTime exists
      const result = mockDate.format({ format: 'numeric', includeTime: true });

      // Assert - should use datetime format as fallback
      expect(result).toBe('January 15, 2024 at 10:30');
    });
  });

  describe('Widget Formats Usage', () => {
    it('should use widget mini format for toShortString', () => {
      // Act - toShortString should use widgets.mini format
      const result = mockDate.toShortString();

      // Assert - should produce mini widget format output
      expect(result).toBe('Jan 15');
    });

    it('should use widget main format for toLongString', () => {
      // Act - toLongString should use widgets.main format
      const result = mockDate.toLongString();

      // Assert - should produce main widget format output
      expect(result).toBe('Mon, 15th January');
    });

    it('should use DateFormatter.formatWidget method correctly', () => {
      // Arrange
      const formatter = new DateFormatter(mockCalendar);

      // Act
      const miniResult = formatter.formatWidget(mockDate, 'mini');
      const mainResult = formatter.formatWidget(mockDate, 'main');
      const gridResult = formatter.formatWidget(mockDate, 'grid');

      // Assert - should produce expected widget format outputs
      expect(miniResult).toBe('Jan 15'); // mini
      expect(mainResult).toBe('Mon, 15th January'); // main
      expect(gridResult).toBe('15/1'); // grid
    });
  });

  describe('Named Format Resolution', () => {
    it('should resolve format names directly from calendar dateFormats', () => {
      // Arrange
      const formatter = new DateFormatter(mockCalendar);

      // Act
      const detailedResult = formatter.formatNamed(mockDate, 'detailed');
      const briefResult = formatter.formatNamed(mockDate, 'brief');

      // Assert - should use the named formats from dateFormats
      expect(detailedResult).toBe('Monday, the 15th day of January, 2024');
      expect(briefResult).toBe('Jan 15/2024');
    });

    it('should handle variant formats with specific variant names', () => {
      // Arrange
      const formatter = new DateFormatter(mockCalendar);

      // Act
      const shortResult = formatter.formatNamed(mockDate, 'date', 'short');
      const longResult = formatter.formatNamed(mockDate, 'date', 'long');
      const isoResult = formatter.formatNamed(mockDate, 'date', 'iso');

      // Assert - should use the specific variants from date object
      expect(shortResult).toBe('Jan 15'); // date.short
      expect(longResult).toBe('Monday, 15th January 2024'); // date.long
      expect(isoResult).toBe('2024-01-15'); // date.iso
    });

    it('should use default variant when no variant specified', () => {
      // Arrange
      const formatter = new DateFormatter(mockCalendar);

      // Act
      const result = formatter.formatNamed(mockDate, 'date'); // No variant specified

      // Assert - should use date.default variant
      expect(result).toBe('January 15, 2024'); // date.default
    });
  });

  describe('Format Name Detection from Options', () => {
    it('should detect multiple possible format names and prioritize correctly', () => {
      // Arrange
      const calendarWithMultipleFormats: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          short: '{{ss-month format="abbr"}} {{ss-day}}',
          brief: '{{ss-month format="abbr"}} {{ss-day}}/{{year}}', // Alternative short format
          shortTime:
            '{{ss-month format="abbr"}} {{ss-day}} {{ss-hour format="pad"}}:{{ss-minute format="pad"}}',
          long: '{{ss-weekday format="name"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}} {{year}}',
          full: '{{ss-weekday format="name"}}, the {{ss-day format="ordinal"}} day of {{ss-month format="name"}}, {{year}}', // Alternative long format
          detailed:
            '{{ss-weekday format="name"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}} {{year}} {{ss-hour format="pad"}}:{{ss-minute format="pad"}}', // Alternative long time
        },
      };

      const dateWithFormats = new CalendarDate(mockDate.toObject(), calendarWithMultipleFormats);

      // Act - Test that it finds the most appropriate format
      const shortResult = dateWithFormats.format({ format: 'short' }); // Should use 'short', not 'brief'
      const shortTimeResult = dateWithFormats.format({ format: 'short', includeTime: true }); // Should use 'shortTime'
      const longResult = dateWithFormats.format({ format: 'long' }); // Should use 'long', not 'full' or 'detailed'

      // Assert - should prioritize exact matches and time-specific formats
      expect(shortResult).toBe('Jan 15'); // short
      expect(shortTimeResult).toBe('Jan 15 10:30'); // shortTime
      expect(longResult).toBe('Monday, 15th January 2024'); // long
    });

    it('should handle alternative format name patterns', () => {
      // Arrange
      const calendarWithAlternativeNames: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          brief: '{{ss-month format="abbr"}} {{ss-day}}', // Alternative to 'short'
          detailed:
            '{{ss-weekday format="name"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}} {{year}}', // Alternative to 'long'
          number: '{{ss-month}}/{{ss-day}}/{{year}}', // Alternative to 'numeric'
        },
      };

      const dateWithAltFormats = new CalendarDate(
        mockDate.toObject(),
        calendarWithAlternativeNames
      );

      // Act
      const shortResult = dateWithAltFormats.format({ format: 'short' }); // Should find 'brief'
      const longResult = dateWithAltFormats.format({ format: 'long' }); // Should find 'detailed'
      const numericResult = dateWithAltFormats.format({ format: 'numeric' }); // Should find 'number'

      // Assert - should find alternative format names
      expect(shortResult).toBe('Jan 15'); // brief
      expect(longResult).toBe('Monday, 15th January 2024'); // detailed
      expect(numericResult).toBe('1/15/2024'); // number
    });
  });

  describe('Fallback Behavior', () => {
    it('should fallback to template building when no predefined format exists', () => {
      // Arrange
      const calendarWithoutFormats: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          // Only has formats that don't match the requested options
          custom: '{{ss-month format="name"}} {{year}}',
        },
      };

      const dateWithoutFormats = new CalendarDate(mockDate.toObject(), calendarWithoutFormats);

      // Act - should fall back to programmatically built template
      const result = dateWithoutFormats.format({ format: 'short' }); // No 'short' format exists

      // Assert - should produce some reasonable format as fallback
      expect(result).toContain('15'); // Should include day
      expect(result).toContain('2024'); // Should include year
      expect(typeof result).toBe('string'); // Should produce a string result
      expect(result.length).toBeGreaterThan(0); // Should not be empty
    });

    it('should fallback to basic string formatting when dateFormats is undefined', () => {
      // Arrange
      const calendarWithoutDateFormats: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: undefined,
      };

      const dateWithoutDateFormats = new CalendarDate(
        mockDate.toObject(),
        calendarWithoutDateFormats
      );

      // Act
      const result = dateWithoutDateFormats.toShortString();

      // Assert - Should use basic string formatting, not template system
      expect(result).toBe('15 Jan Year 2024 CE');
    });
  });

  describe('Complex Format Scenarios', () => {
    it('should handle formats with time components correctly', () => {
      // Arrange
      const dateWithTime = new CalendarDate(
        {
          year: 2024,
          month: 2,
          day: 29,
          weekday: 0,
          time: { hour: 14, minute: 5, second: 0 },
        },
        mockCalendar
      );

      // Act
      const result = dateWithTime.format({ includeTime: true, format: 'long' });

      // Assert - should use longTime format with time components
      expect(result).toBe('Sunday, 29th February 2024 14:05:00');
    });

    it('should handle date without time correctly', () => {
      // Arrange
      const dateWithoutTime = new CalendarDate(
        {
          year: 2024,
          month: 3,
          day: 1,
          weekday: 2,
        },
        mockCalendar
      );

      // Act - should try to use time format but default to 00:00 for missing time
      const result = dateWithoutTime.format({ includeTime: true, format: 'short' });

      // Assert - should still find shortTime format but use default time values
      expect(result).toBe('Mar 1 00:00');
    });
  });

  describe('Format Priority and Resolution', () => {
    it('should prioritize exact format matches over partial matches', () => {
      // Arrange
      const calendarWithPriority: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          short: '{{ss-month format="abbr"}} {{ss-day}}', // Exact match
          shortFormat: '{{ss-month format="abbr"}} {{ss-day}}/{{year}}', // Partial match
          brief: '{{ss-month}} {{ss-day}}', // Alternative match
        },
      };

      const dateWithPriority = new CalendarDate(mockDate.toObject(), calendarWithPriority);

      // Act
      const result = dateWithPriority.format({ format: 'short' });

      // Assert - Should use exact match 'short', not 'shortFormat' or 'brief'
      expect(result).toBe('Jan 15');
    });

    it('should handle multiple time format possibilities correctly', () => {
      // Arrange
      const calendarWithTimeFormats: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          short: '{{ss-month format="abbr"}} {{ss-day}}',
          shortTime:
            '{{ss-month format="abbr"}} {{ss-day}} {{ss-hour format="pad"}}:{{ss-minute format="pad"}}', // Preferred time format
          datetime:
            '{{ss-month format="abbr"}} {{ss-day}} at {{ss-hour format="pad"}}:{{ss-minute format="pad"}}', // Alternative time format
          timestamp:
            '{{year}}-{{ss-month format="pad"}}-{{ss-day format="pad"}} {{ss-hour format="pad"}}:{{ss-minute format="pad"}}:{{ss-second format="pad"}}', // Generic time format
        },
      };

      const dateWithTimeFormats = new CalendarDate(mockDate.toObject(), calendarWithTimeFormats);

      // Act
      const result = dateWithTimeFormats.format({ format: 'short', includeTime: true });

      // Assert - Should prioritize 'shortTime' over 'datetime' or 'timestamp'
      expect(result).toBe('Jan 15 10:30');
    });
  });
});
