/**
 * Predefined Formats Tests - Comprehensive coverage for calendar dateFormats usage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarDate } from '../src/core/calendar-date';
import { DateFormatter } from '../src/core/date-formatter';
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

describe('Predefined Formats Usage', () => {
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
      ],
      weekdays: [
        { name: 'Sunday', abbreviation: 'Sun' },
        { name: 'Monday', abbreviation: 'Mon' },
        { name: 'Tuesday', abbreviation: 'Tue' },
      ],
      year: { prefix: 'Year ', suffix: ' CE' },
      time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
      dateFormats: {
        // Basic formats that should match CalendarDate options
        short: '{{month:abbr}} {{day}}',
        long: '{{weekday:name}}, {{day:ordinal}} {{month:name}} {{year}}',
        numeric: '{{month}}/{{day}}/{{year}}',

        // Time-related formats
        shortTime: '{{month:abbr}} {{day}} {{hour:pad}}:{{minute:pad}}',
        longTime:
          '{{weekday:name}}, {{day:ordinal}} {{month:name}} {{year}} {{hour:pad}}:{{minute:pad}}:{{second:pad}}',
        datetime: '{{month:name}} {{day}}, {{year}} at {{hour:pad}}:{{minute:pad}}',
        timestamp: '{{year}}-{{month:pad}}-{{day:pad}} {{hour:pad}}:{{minute:pad}}:{{second:pad}}',

        // Widget formats
        widgets: {
          mini: '{{month:abbr}} {{day}}',
          main: '{{weekday:abbr}}, {{day:ordinal}} {{month:name}}',
          grid: '{{day}}/{{month}}',
        },

        // Complex scenarios
        detailed: '{{weekday:name}}, the {{day:ordinal}} day of {{month:name}}, {{year}}',
        brief: '{{month:abbr}} {{day}}/{{year}}',

        // Format variants (object style)
        date: {
          short: '{{month:abbr}} {{day}}',
          long: '{{weekday:name}}, {{day:ordinal}} {{month:name}} {{year}}',
          iso: '{{year}}-{{month:pad}}-{{day:pad}}',
          default: '{{month:name}} {{day}}, {{year}}',
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

    // Setup realistic mock template compilation
    const mockCompiledTemplate = vi.fn().mockImplementation(context => {
      // Simulate basic template output based on context
      return `${context.year}-${context.month}-${context.day}`;
    });
    mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);
  });

  describe('CalendarDate Format Options to Predefined Format Mapping', () => {
    it('should use predefined "short" format for short option', () => {
      // Act
      mockDate.format({ format: 'short' });

      // Assert
      expect(mockHandlebars.compile).toHaveBeenCalledWith('{{month:abbr}} {{day}}');
    });

    it('should use predefined "long" format for long option', () => {
      // Act
      mockDate.format({ format: 'long' });

      // Assert
      expect(mockHandlebars.compile).toHaveBeenCalledWith(
        '{{weekday:name}}, {{day:ordinal}} {{month:name}} {{year}}'
      );
    });

    it('should use predefined "numeric" format for numeric option', () => {
      // Act
      mockDate.format({ format: 'numeric' });

      // Assert
      expect(mockHandlebars.compile).toHaveBeenCalledWith('{{month}}/{{day}}/{{year}}');
    });

    it('should prioritize time-inclusive formats when includeTime is true', () => {
      // Act
      mockDate.format({ format: 'short', includeTime: true });

      // Assert - Should find shortTime format first
      expect(mockHandlebars.compile).toHaveBeenCalledWith(
        '{{month:abbr}} {{day}} {{hour:pad}}:{{minute:pad}}'
      );
    });

    it('should use datetime format when includeTime is true and no specific time format exists', () => {
      // Act
      mockDate.format({ format: 'long', includeTime: true });

      // Assert - Should find longTime format
      expect(mockHandlebars.compile).toHaveBeenCalledWith(
        '{{weekday:name}}, {{day:ordinal}} {{month:name}} {{year}} {{hour:pad}}:{{minute:pad}}:{{second:pad}}'
      );
    });

    it('should use timestamp format when includeTime is true and format is numeric', () => {
      // Act
      mockDate.format({ format: 'numeric', includeTime: true });

      // Assert - Should find timestamp format
      expect(mockHandlebars.compile).toHaveBeenCalledWith(
        '{{year}}-{{month:pad}}-{{day:pad}} {{hour:pad}}:{{minute:pad}}:{{second:pad}}'
      );
    });
  });

  describe('Widget Formats Usage', () => {
    it('should use widget mini format for toShortString', () => {
      // Act
      mockDate.toShortString();

      // Assert
      expect(mockHandlebars.compile).toHaveBeenCalledWith('{{month:abbr}} {{day}}');
    });

    it('should use widget main format for toLongString', () => {
      // Act
      mockDate.toLongString();

      // Assert
      expect(mockHandlebars.compile).toHaveBeenCalledWith(
        '{{weekday:abbr}}, {{day:ordinal}} {{month:name}}'
      );
    });

    it('should use DateFormatter.formatWidget method correctly', () => {
      // Arrange
      const formatter = new DateFormatter(mockCalendar);

      // Act
      formatter.formatWidget(mockDate, 'mini');
      formatter.formatWidget(mockDate, 'main');
      formatter.formatWidget(mockDate, 'grid');

      // Assert
      expect(mockHandlebars.compile).toHaveBeenCalledWith('{{month:abbr}} {{day}}'); // mini
      expect(mockHandlebars.compile).toHaveBeenCalledWith(
        '{{weekday:abbr}}, {{day:ordinal}} {{month:name}}'
      ); // main
      expect(mockHandlebars.compile).toHaveBeenCalledWith('{{day}}/{{month}}'); // grid
    });
  });

  describe('Named Format Resolution', () => {
    it('should resolve format names directly from calendar dateFormats', () => {
      // Arrange
      const formatter = new DateFormatter(mockCalendar);

      // Act
      formatter.formatNamed(mockDate, 'detailed');
      formatter.formatNamed(mockDate, 'brief');

      // Assert
      expect(mockHandlebars.compile).toHaveBeenCalledWith(
        '{{weekday:name}}, the {{day:ordinal}} day of {{month:name}}, {{year}}'
      );
      expect(mockHandlebars.compile).toHaveBeenCalledWith('{{month:abbr}} {{day}}/{{year}}');
    });

    it('should handle variant formats with specific variant names', () => {
      // Arrange
      const formatter = new DateFormatter(mockCalendar);

      // Act
      formatter.formatNamed(mockDate, 'date', 'short');
      formatter.formatNamed(mockDate, 'date', 'long');
      formatter.formatNamed(mockDate, 'date', 'iso');

      // Assert
      expect(mockHandlebars.compile).toHaveBeenCalledWith('{{month:abbr}} {{day}}'); // date.short
      expect(mockHandlebars.compile).toHaveBeenCalledWith(
        '{{weekday:name}}, {{day:ordinal}} {{month:name}} {{year}}'
      ); // date.long
      expect(mockHandlebars.compile).toHaveBeenCalledWith('{{year}}-{{month:pad}}-{{day:pad}}'); // date.iso
    });

    it('should use default variant when no variant specified', () => {
      // Arrange
      const formatter = new DateFormatter(mockCalendar);

      // Act
      formatter.formatNamed(mockDate, 'date'); // No variant specified

      // Assert
      expect(mockHandlebars.compile).toHaveBeenCalledWith('{{month:name}} {{day}}, {{year}}'); // date.default
    });
  });

  describe('Format Name Detection from Options', () => {
    it('should detect multiple possible format names and prioritize correctly', () => {
      // Arrange
      const calendarWithMultipleFormats: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          short: '{{month:abbr}} {{day}}',
          brief: '{{month:abbr}} {{day}}/{{year}}', // Alternative short format
          shortTime: '{{month:abbr}} {{day}} {{hour:pad}}:{{minute:pad}}',
          long: '{{weekday:name}}, {{day:ordinal}} {{month:name}} {{year}}',
          full: '{{weekday:name}}, the {{day:ordinal}} day of {{month:name}}, {{year}}', // Alternative long format
          detailed:
            '{{weekday:name}}, {{day:ordinal}} {{month:name}} {{year}} {{hour:pad}}:{{minute:pad}}', // Alternative long time
        },
      };

      const dateWithFormats = new CalendarDate(mockDate.toObject(), calendarWithMultipleFormats);

      // Act - Test that it finds the most appropriate format
      dateWithFormats.format({ format: 'short' }); // Should use 'short', not 'brief'
      dateWithFormats.format({ format: 'short', includeTime: true }); // Should use 'shortTime'
      dateWithFormats.format({ format: 'long' }); // Should use 'long', not 'full' or 'detailed'

      // Assert
      expect(mockHandlebars.compile).toHaveBeenCalledWith('{{month:abbr}} {{day}}'); // short
      expect(mockHandlebars.compile).toHaveBeenCalledWith(
        '{{month:abbr}} {{day}} {{hour:pad}}:{{minute:pad}}'
      ); // shortTime
      expect(mockHandlebars.compile).toHaveBeenCalledWith(
        '{{weekday:name}}, {{day:ordinal}} {{month:name}} {{year}}'
      ); // long
    });

    it('should handle alternative format name patterns', () => {
      // Arrange
      const calendarWithAlternativeNames: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          brief: '{{month:abbr}} {{day}}', // Alternative to 'short'
          detailed: '{{weekday:name}}, {{day:ordinal}} {{month:name}} {{year}}', // Alternative to 'long'
          number: '{{month}}/{{day}}/{{year}}', // Alternative to 'numeric'
        },
      };

      const dateWithAltFormats = new CalendarDate(
        mockDate.toObject(),
        calendarWithAlternativeNames
      );

      // Act
      dateWithAltFormats.format({ format: 'short' }); // Should find 'brief'
      dateWithAltFormats.format({ format: 'long' }); // Should find 'detailed'
      dateWithAltFormats.format({ format: 'numeric' }); // Should find 'number'

      // Assert
      expect(mockHandlebars.compile).toHaveBeenCalledWith('{{month:abbr}} {{day}}'); // brief
      expect(mockHandlebars.compile).toHaveBeenCalledWith(
        '{{weekday:name}}, {{day:ordinal}} {{month:name}} {{year}}'
      ); // detailed
      expect(mockHandlebars.compile).toHaveBeenCalledWith('{{month}}/{{day}}/{{year}}'); // number
    });
  });

  describe('Fallback Behavior', () => {
    it('should fallback to template building when no predefined format exists', () => {
      // Arrange
      const calendarWithoutFormats: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          // Only has formats that don't match the requested options
          custom: '{{month:name}} {{year}}',
        },
      };

      const dateWithoutFormats = new CalendarDate(mockDate.toObject(), calendarWithoutFormats);

      // Act
      dateWithoutFormats.format({ format: 'short' }); // No 'short' format exists

      // Assert - Should build template from options instead of using predefined format
      const templateCall = mockHandlebars.compile.mock.calls[0];
      expect(templateCall[0]).toContain('{{weekday:name}}'); // Built template includes weekday by default
      expect(templateCall[0]).toContain('{{month:abbr}}'); // Short format uses abbreviations
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
      expect(mockHandlebars.compile).not.toHaveBeenCalled();
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
      dateWithTime.format({ includeTime: true, format: 'long' });

      // Assert
      expect(mockHandlebars.compile).toHaveBeenCalledWith(
        '{{weekday:name}}, {{day:ordinal}} {{month:name}} {{year}} {{hour:pad}}:{{minute:pad}}:{{second:pad}}'
      );
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

      // Act
      dateWithoutTime.format({ includeTime: true, format: 'short' });

      // Assert - Should still try to find time format but template won't have time data
      expect(mockHandlebars.compile).toHaveBeenCalledWith(
        '{{month:abbr}} {{day}} {{hour:pad}}:{{minute:pad}}'
      );
    });
  });

  describe('Format Priority and Resolution', () => {
    it('should prioritize exact format matches over partial matches', () => {
      // Arrange
      const calendarWithPriority: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          short: '{{month:abbr}} {{day}}', // Exact match
          shortFormat: '{{month:abbr}} {{day}}/{{year}}', // Partial match
          brief: '{{month}} {{day}}', // Alternative match
        },
      };

      const dateWithPriority = new CalendarDate(mockDate.toObject(), calendarWithPriority);

      // Act
      dateWithPriority.format({ format: 'short' });

      // Assert - Should use exact match 'short', not 'shortFormat' or 'brief'
      expect(mockHandlebars.compile).toHaveBeenCalledWith('{{month:abbr}} {{day}}');
    });

    it('should handle multiple time format possibilities correctly', () => {
      // Arrange
      const calendarWithTimeFormats: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          short: '{{month:abbr}} {{day}}',
          shortTime: '{{month:abbr}} {{day}} {{hour:pad}}:{{minute:pad}}', // Preferred time format
          datetime: '{{month:abbr}} {{day}} at {{hour:pad}}:{{minute:pad}}', // Alternative time format
          timestamp:
            '{{year}}-{{month:pad}}-{{day:pad}} {{hour:pad}}:{{minute:pad}}:{{second:pad}}', // Generic time format
        },
      };

      const dateWithTimeFormats = new CalendarDate(mockDate.toObject(), calendarWithTimeFormats);

      // Act
      dateWithTimeFormats.format({ format: 'short', includeTime: true });

      // Assert - Should prioritize 'shortTime' over 'datetime' or 'timestamp'
      expect(mockHandlebars.compile).toHaveBeenCalledWith(
        '{{month:abbr}} {{day}} {{hour:pad}}:{{minute:pad}}'
      );
    });
  });
});
