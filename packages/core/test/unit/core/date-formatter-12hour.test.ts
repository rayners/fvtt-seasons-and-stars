/**
 * Date Formatter 12-Hour Clock Tests
 *
 * Tests for 12-hour clock display functionality including am/pm notation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateFormatter } from '../../../src/core/date-formatter';
import { CalendarDate } from '../../../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';

// Use REAL Handlebars for date formatter testing
import Handlebars from 'handlebars';
global.Handlebars = Handlebars;

describe('DateFormatter - 12-Hour Clock Support', () => {
  let formatter: DateFormatter;
  let mockCalendar: SeasonsStarsCalendar;
  let mockDate: CalendarDate;

  beforeEach(() => {
    vi.clearAllMocks();
    DateFormatter.resetHelpersForTesting();

    mockCalendar = {
      id: 'test-calendar',
      name: 'Test Calendar',
      months: [{ name: 'January', abbreviation: 'Jan', days: 31 }],
      weekdays: [{ name: 'Monday', abbreviation: 'Mon' }],
      year: { prefix: '', suffix: '' },
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      },
    } as SeasonsStarsCalendar;

    mockDate = {
      year: 2024,
      month: 1,
      day: 15,
      weekday: 1,
      time: { hour: 14, minute: 30, second: 0 },
    } as CalendarDate;
  });

  describe('ss-hour helper with 12hour format', () => {
    it('should convert 24-hour time to 12-hour format', () => {
      formatter = new DateFormatter(mockCalendar);

      // Test afternoon (14:00 → 2)
      const result14 = formatter.format(mockDate, '{{ss-hour format="12hour"}}');
      expect(result14).toBe('2');

      // Test midnight (00:00 → 12)
      const midnight = { ...mockDate, time: { hour: 0, minute: 0, second: 0 } };
      const result00 = formatter.format(midnight, '{{ss-hour format="12hour"}}');
      expect(result00).toBe('12');

      // Test noon (12:00 → 12)
      const noon = { ...mockDate, time: { hour: 12, minute: 0, second: 0 } };
      const result12 = formatter.format(noon, '{{ss-hour format="12hour"}}');
      expect(result12).toBe('12');

      // Test 1 AM (01:00 → 1)
      const oneAM = { ...mockDate, time: { hour: 1, minute: 0, second: 0 } };
      const result01 = formatter.format(oneAM, '{{ss-hour format="12hour"}}');
      expect(result01).toBe('1');

      // Test 11 PM (23:00 → 11)
      const elevenPM = { ...mockDate, time: { hour: 23, minute: 0, second: 0 } };
      const result23 = formatter.format(elevenPM, '{{ss-hour format="12hour"}}');
      expect(result23).toBe('11');
    });

    it('should support padded 12-hour format', () => {
      formatter = new DateFormatter(mockCalendar);

      // Test with padding (2 → 02)
      const result = formatter.format(mockDate, '{{ss-hour format="12hour-pad"}}');
      expect(result).toBe('02');

      // Test midnight with padding (12 → 12)
      const midnight = { ...mockDate, time: { hour: 0, minute: 0, second: 0 } };
      const resultMidnight = formatter.format(midnight, '{{ss-hour format="12hour-pad"}}');
      expect(resultMidnight).toBe('12');
    });
  });

  describe('ss-hour helper with ampm format', () => {
    it('should display AM/PM using calendar-defined notation', () => {
      const calendarWithAmPm: SeasonsStarsCalendar = {
        ...mockCalendar,
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 60,
          amPmNotation: {
            am: 'AM',
            pm: 'PM',
          },
        },
      };

      formatter = new DateFormatter(calendarWithAmPm);

      // Test PM (14:00 → PM)
      const resultPM = formatter.format(mockDate, '{{ss-hour format="ampm"}}');
      expect(resultPM).toBe('PM');

      // Test AM (08:00 → AM)
      const morning = { ...mockDate, time: { hour: 8, minute: 0, second: 0 } };
      const resultAM = formatter.format(morning, '{{ss-hour format="ampm"}}');
      expect(resultAM).toBe('AM');

      // Test midnight (00:00 → AM)
      const midnight = { ...mockDate, time: { hour: 0, minute: 0, second: 0 } };
      const resultMidnight = formatter.format(midnight, '{{ss-hour format="ampm"}}');
      expect(resultMidnight).toBe('AM');

      // Test noon (12:00 → PM)
      const noon = { ...mockDate, time: { hour: 12, minute: 0, second: 0 } };
      const resultNoon = formatter.format(noon, '{{ss-hour format="ampm"}}');
      expect(resultNoon).toBe('PM');
    });

    it('should use default AM/PM when calendar has no amPmNotation', () => {
      formatter = new DateFormatter(mockCalendar);

      // Should use default AM/PM
      const resultPM = formatter.format(mockDate, '{{ss-hour format="ampm"}}');
      expect(resultPM).toBe('PM');

      const morning = { ...mockDate, time: { hour: 8, minute: 0, second: 0 } };
      const resultAM = formatter.format(morning, '{{ss-hour format="ampm"}}');
      expect(resultAM).toBe('AM');
    });

    it('should support custom am/pm notation via helper parameters', () => {
      formatter = new DateFormatter(mockCalendar);

      // Test custom lowercase notation
      const resultPM = formatter.format(mockDate, '{{ss-hour format="ampm" am="a.m." pm="p.m."}}');
      expect(resultPM).toBe('p.m.');

      const morning = { ...mockDate, time: { hour: 8, minute: 0, second: 0 } };
      const resultAM = formatter.format(morning, '{{ss-hour format="ampm" am="a.m." pm="p.m."}}');
      expect(resultAM).toBe('a.m.');
    });

    it('should support localized am/pm notation', () => {
      const calendarWithLocalizedAmPm: SeasonsStarsCalendar = {
        ...mockCalendar,
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 60,
          amPmNotation: {
            am: '午前',
            pm: '午後',
          },
        },
      };

      formatter = new DateFormatter(calendarWithLocalizedAmPm);

      const resultPM = formatter.format(mockDate, '{{ss-hour format="ampm"}}');
      expect(resultPM).toBe('午後');

      const morning = { ...mockDate, time: { hour: 8, minute: 0, second: 0 } };
      const resultAM = formatter.format(morning, '{{ss-hour format="ampm"}}');
      expect(resultAM).toBe('午前');
    });
  });

  describe('Complete 12-hour time formats', () => {
    it('should format complete 12-hour time with AM/PM', () => {
      const calendarWithAmPm: SeasonsStarsCalendar = {
        ...mockCalendar,
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 60,
          amPmNotation: {
            am: 'AM',
            pm: 'PM',
          },
        },
      };

      formatter = new DateFormatter(calendarWithAmPm);

      // Test 2:30 PM
      const result = formatter.format(
        mockDate,
        '{{ss-hour format="12hour"}}:{{ss-minute format="pad"}} {{ss-hour format="ampm"}}'
      );
      expect(result).toBe('2:30 PM');

      // Test 8:00 AM
      const morning = { ...mockDate, time: { hour: 8, minute: 0, second: 0 } };
      const resultMorning = formatter.format(
        morning,
        '{{ss-hour format="12hour"}}:{{ss-minute format="pad"}} {{ss-hour format="ampm"}}'
      );
      expect(resultMorning).toBe('8:00 AM');

      // Test 12:00 PM (noon)
      const noon = { ...mockDate, time: { hour: 12, minute: 0, second: 0 } };
      const resultNoon = formatter.format(
        noon,
        '{{ss-hour format="12hour"}}:{{ss-minute format="pad"}} {{ss-hour format="ampm"}}'
      );
      expect(resultNoon).toBe('12:00 PM');

      // Test 12:00 AM (midnight)
      const midnight = { ...mockDate, time: { hour: 0, minute: 0, second: 0 } };
      const resultMidnight = formatter.format(
        midnight,
        '{{ss-hour format="12hour"}}:{{ss-minute format="pad"}} {{ss-hour format="ampm"}}'
      );
      expect(resultMidnight).toBe('12:00 AM');
    });

    it('should format 12-hour time with padded hour', () => {
      const calendarWithAmPm: SeasonsStarsCalendar = {
        ...mockCalendar,
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 60,
          amPmNotation: {
            am: 'AM',
            pm: 'PM',
          },
        },
      };

      formatter = new DateFormatter(calendarWithAmPm);

      // Test 02:30 PM (padded)
      const result = formatter.format(
        mockDate,
        '{{ss-hour format="12hour-pad"}}:{{ss-minute format="pad"}} {{ss-hour format="ampm"}}'
      );
      expect(result).toBe('02:30 PM');
    });

    it('should work with custom am/pm override in complete formats', () => {
      formatter = new DateFormatter(mockCalendar);

      const result = formatter.format(
        mockDate,
        '{{ss-hour format="12hour"}}:{{ss-minute format="pad"}} {{ss-hour format="ampm" am="a.m." pm="p.m."}}'
      );
      expect(result).toBe('2:30 p.m.');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined or null hour gracefully', () => {
      const dateWithoutTime = {
        ...mockDate,
        time: undefined,
      } as CalendarDate;

      formatter = new DateFormatter(mockCalendar);

      // Should default to 0 (midnight) which converts to 12 AM
      const result = formatter.format(dateWithoutTime, '{{ss-hour format="12hour"}}');
      expect(result).toBe('12');

      const resultAmPm = formatter.format(dateWithoutTime, '{{ss-hour format="ampm"}}');
      expect(resultAmPm).toBe('AM');
    });

    it('should handle hours >= 24 gracefully', () => {
      const invalidDate = { ...mockDate, time: { hour: 25, minute: 0, second: 0 } };
      formatter = new DateFormatter(mockCalendar);

      // Should handle modulo operation (25 % 12 after conversion)
      const result = formatter.format(invalidDate, '{{ss-hour format="12hour"}}');
      expect(result).toBe('1'); // 25 % 24 = 1, 1 in 12-hour = 1 AM
    });

    it('should handle negative hours gracefully', () => {
      const invalidDate = { ...mockDate, time: { hour: -1, minute: 0, second: 0 } };
      formatter = new DateFormatter(mockCalendar);

      // Should handle negative values literally (no normalization)
      // Negative hours are invalid input, so we just pass through the calculation
      const result = formatter.format(invalidDate, '{{ss-hour format="12hour"}}');
      // -1 % 12 = -1 in JavaScript, which is treated as -1
      // Since it's not 0, it doesn't get converted to 12
      expect(result).toBe('-1');
    });
  });

  describe('Calendar dateFormats integration', () => {
    it('should support 12-hour formats in calendar dateFormats', () => {
      const calendarWith12HourFormats: SeasonsStarsCalendar = {
        ...mockCalendar,
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 60,
          amPmNotation: {
            am: 'AM',
            pm: 'PM',
          },
        },
        dateFormats: {
          time12:
            '{{ss-hour format="12hour"}}:{{ss-minute format="pad"}} {{ss-hour format="ampm"}}',
          datetime12:
            '{{ss-month format="abbr"}} {{day}}, {{year}} {{ss-hour format="12hour"}}:{{ss-minute format="pad"}} {{ss-hour format="ampm"}}',
        },
      };

      formatter = new DateFormatter(calendarWith12HourFormats);

      const time = formatter.formatNamed(mockDate, 'time12');
      expect(time).toBe('2:30 PM');

      const datetime = formatter.formatNamed(mockDate, 'datetime12');
      expect(datetime).toBe('Jan 15, 2024 2:30 PM');
    });
  });
});
