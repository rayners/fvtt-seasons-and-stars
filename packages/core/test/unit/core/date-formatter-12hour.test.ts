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

  describe('Non-24-Hour Calendars', () => {
    it('should handle 20-hour days correctly', () => {
      const calendar20Hour: SeasonsStarsCalendar = {
        ...mockCalendar,
        time: {
          hoursInDay: 20,
          minutesInHour: 60,
          secondsInMinute: 60,
          amPmNotation: {
            am: 'AM',
            pm: 'PM',
          },
        },
      };

      formatter = new DateFormatter(calendar20Hour);

      // Hour 0 - start of day (midnight equivalent) → should be 10 AM (first half)
      const midnight = { ...mockDate, time: { hour: 0, minute: 0, second: 0 } };
      expect(formatter.format(midnight, '{{ss-hour format="12hour"}}')).toBe('10');
      expect(formatter.format(midnight, '{{ss-hour format="ampm"}}')).toBe('AM');

      // Hour 5 - 25% through day → should be 5 AM (before midday)
      const hour5 = { ...mockDate, time: { hour: 5, minute: 0, second: 0 } };
      expect(formatter.format(hour5, '{{ss-hour format="12hour"}}')).toBe('5');
      expect(formatter.format(hour5, '{{ss-hour format="ampm"}}')).toBe('AM');

      // Hour 9 - just before midday → should be 9 AM (last hour before noon)
      const hour9 = { ...mockDate, time: { hour: 9, minute: 0, second: 0 } };
      expect(formatter.format(hour9, '{{ss-hour format="12hour"}}')).toBe('9');
      expect(formatter.format(hour9, '{{ss-hour format="ampm"}}')).toBe('AM');

      // Hour 10 - midday (50% through 20-hour day) → should be 10 PM (second half starts)
      const midday = { ...mockDate, time: { hour: 10, minute: 0, second: 0 } };
      expect(formatter.format(midday, '{{ss-hour format="12hour"}}')).toBe('10');
      expect(formatter.format(midday, '{{ss-hour format="ampm"}}')).toBe('PM');

      // Hour 14 - 70% through day → should be 4 PM (second half)
      const hour14 = { ...mockDate, time: { hour: 14, minute: 0, second: 0 } };
      expect(formatter.format(hour14, '{{ss-hour format="12hour"}}')).toBe('4');
      expect(formatter.format(hour14, '{{ss-hour format="ampm"}}')).toBe('PM');

      // Hour 19 - last hour of day → should be 9 PM
      const hour19 = { ...mockDate, time: { hour: 19, minute: 0, second: 0 } };
      expect(formatter.format(hour19, '{{ss-hour format="12hour"}}')).toBe('9');
      expect(formatter.format(hour19, '{{ss-hour format="ampm"}}')).toBe('PM');
    });

    it('should handle 30-hour days correctly', () => {
      const calendar30Hour: SeasonsStarsCalendar = {
        ...mockCalendar,
        time: {
          hoursInDay: 30,
          minutesInHour: 60,
          secondsInMinute: 60,
          amPmNotation: {
            am: 'AM',
            pm: 'PM',
          },
        },
      };

      formatter = new DateFormatter(calendar30Hour);

      // Hour 0 - start of day → should be 15 AM (using 15 as "half")
      const midnight = { ...mockDate, time: { hour: 0, minute: 0, second: 0 } };
      expect(formatter.format(midnight, '{{ss-hour format="12hour"}}')).toBe('15');
      expect(formatter.format(midnight, '{{ss-hour format="ampm"}}')).toBe('AM');

      // Hour 7 - 7/30 through day → should be 7 AM
      const hour7 = { ...mockDate, time: { hour: 7, minute: 0, second: 0 } };
      expect(formatter.format(hour7, '{{ss-hour format="12hour"}}')).toBe('7');
      expect(formatter.format(hour7, '{{ss-hour format="ampm"}}')).toBe('AM');

      // Hour 14 - just before midday → should be 14 AM
      const hour14 = { ...mockDate, time: { hour: 14, minute: 0, second: 0 } };
      expect(formatter.format(hour14, '{{ss-hour format="12hour"}}')).toBe('14');
      expect(formatter.format(hour14, '{{ss-hour format="ampm"}}')).toBe('AM');

      // Hour 15 - midday (50% through 30-hour day) → should be 15 PM
      const midday = { ...mockDate, time: { hour: 15, minute: 0, second: 0 } };
      expect(formatter.format(midday, '{{ss-hour format="12hour"}}')).toBe('15');
      expect(formatter.format(midday, '{{ss-hour format="ampm"}}')).toBe('PM');

      // Hour 22 - 22/30 through day → should be 7 PM
      const hour22 = { ...mockDate, time: { hour: 22, minute: 0, second: 0 } };
      expect(formatter.format(hour22, '{{ss-hour format="12hour"}}')).toBe('7');
      expect(formatter.format(hour22, '{{ss-hour format="ampm"}}')).toBe('PM');

      // Hour 29 - last hour of day → should be 14 PM
      const hour29 = { ...mockDate, time: { hour: 29, minute: 0, second: 0 } };
      expect(formatter.format(hour29, '{{ss-hour format="12hour"}}')).toBe('14');
      expect(formatter.format(hour29, '{{ss-hour format="ampm"}}')).toBe('PM');
    });

    it('should handle 18-hour days correctly', () => {
      const calendar18Hour: SeasonsStarsCalendar = {
        ...mockCalendar,
        time: {
          hoursInDay: 18,
          minutesInHour: 60,
          secondsInMinute: 60,
          amPmNotation: {
            am: 'AM',
            pm: 'PM',
          },
        },
      };

      formatter = new DateFormatter(calendar18Hour);

      // Hour 0 - start of day → should be 9 AM
      const midnight = { ...mockDate, time: { hour: 0, minute: 0, second: 0 } };
      expect(formatter.format(midnight, '{{ss-hour format="12hour"}}')).toBe('9');
      expect(formatter.format(midnight, '{{ss-hour format="ampm"}}')).toBe('AM');

      // Hour 4 - before midday → should be 4 AM
      const hour4 = { ...mockDate, time: { hour: 4, minute: 0, second: 0 } };
      expect(formatter.format(hour4, '{{ss-hour format="12hour"}}')).toBe('4');
      expect(formatter.format(hour4, '{{ss-hour format="ampm"}}')).toBe('AM');

      // Hour 9 - midday (50% through 18-hour day) → should be 9 PM
      const midday = { ...mockDate, time: { hour: 9, minute: 0, second: 0 } };
      expect(formatter.format(midday, '{{ss-hour format="12hour"}}')).toBe('9');
      expect(formatter.format(midday, '{{ss-hour format="ampm"}}')).toBe('PM');

      // Hour 13 - after midday → should be 4 PM (13 % 9 = 4)
      const hour13 = { ...mockDate, time: { hour: 13, minute: 0, second: 0 } };
      expect(formatter.format(hour13, '{{ss-hour format="12hour"}}')).toBe('4');
      expect(formatter.format(hour13, '{{ss-hour format="ampm"}}')).toBe('PM');

      // Hour 17 - last hour of day → should be 8 PM (17 % 9 = 8)
      const hour17 = { ...mockDate, time: { hour: 17, minute: 0, second: 0 } };
      expect(formatter.format(hour17, '{{ss-hour format="12hour"}}')).toBe('8');
      expect(formatter.format(hour17, '{{ss-hour format="ampm"}}')).toBe('PM');
    });

    it('should handle 36-hour days correctly', () => {
      const calendar36Hour: SeasonsStarsCalendar = {
        ...mockCalendar,
        time: {
          hoursInDay: 36,
          minutesInHour: 60,
          secondsInMinute: 60,
          amPmNotation: {
            am: 'AM',
            pm: 'PM',
          },
        },
      };

      formatter = new DateFormatter(calendar36Hour);

      // Hour 0 - start of day → should be 18 AM (36/2 = 18 hours per half)
      const midnight = { ...mockDate, time: { hour: 0, minute: 0, second: 0 } };
      expect(formatter.format(midnight, '{{ss-hour format="12hour"}}')).toBe('18');
      expect(formatter.format(midnight, '{{ss-hour format="ampm"}}')).toBe('AM');

      // Hour 12 - 12/36 through day → should be 12 AM (12 % 18 = 12)
      const hour12 = { ...mockDate, time: { hour: 12, minute: 0, second: 0 } };
      expect(formatter.format(hour12, '{{ss-hour format="12hour"}}')).toBe('12');
      expect(formatter.format(hour12, '{{ss-hour format="ampm"}}')).toBe('AM');

      // Hour 18 - midday (50% through 36-hour day) → should be 18 PM
      const midday = { ...mockDate, time: { hour: 18, minute: 0, second: 0 } };
      expect(formatter.format(midday, '{{ss-hour format="12hour"}}')).toBe('18');
      expect(formatter.format(midday, '{{ss-hour format="ampm"}}')).toBe('PM');

      // Hour 30 - 30/36 through day → should be 12 PM (30 % 18 = 12)
      const hour30 = { ...mockDate, time: { hour: 30, minute: 0, second: 0 } };
      expect(formatter.format(hour30, '{{ss-hour format="12hour"}}')).toBe('12');
      expect(formatter.format(hour30, '{{ss-hour format="ampm"}}')).toBe('PM');
    });

    it('should handle complete 12-hour time format with non-24-hour days', () => {
      const calendar20Hour: SeasonsStarsCalendar = {
        ...mockCalendar,
        time: {
          hoursInDay: 20,
          minutesInHour: 60,
          secondsInMinute: 60,
          amPmNotation: {
            am: 'AM',
            pm: 'PM',
          },
        },
      };

      formatter = new DateFormatter(calendar20Hour);

      // Hour 5:30 in a 20-hour day (before midday at hour 10)
      const morning = { ...mockDate, time: { hour: 5, minute: 30, second: 0 } };
      const resultMorning = formatter.format(
        morning,
        '{{ss-hour format="12hour"}}:{{ss-minute format="pad"}} {{ss-hour format="ampm"}}'
      );
      expect(resultMorning).toBe('5:30 AM');

      // Hour 14:45 in a 20-hour day (after midday at hour 10)
      const afternoon = { ...mockDate, time: { hour: 14, minute: 45, second: 0 } };
      const resultAfternoon = formatter.format(
        afternoon,
        '{{ss-hour format="12hour"}}:{{ss-minute format="pad"}} {{ss-hour format="ampm"}}'
      );
      expect(resultAfternoon).toBe('4:45 PM');
    });

    it('should fallback to 24-hour logic when hoursInDay is undefined', () => {
      const calendarWithoutHours: SeasonsStarsCalendar = {
        ...mockCalendar,
        time: {
          hoursInDay: undefined as any,
          minutesInHour: 60,
          secondsInMinute: 60,
          amPmNotation: {
            am: 'AM',
            pm: 'PM',
          },
        },
      };

      formatter = new DateFormatter(calendarWithoutHours);

      // Should fallback to standard 24-hour logic
      const afternoon = { ...mockDate, time: { hour: 14, minute: 30, second: 0 } };
      expect(formatter.format(afternoon, '{{ss-hour format="12hour"}}')).toBe('2');
      expect(formatter.format(afternoon, '{{ss-hour format="ampm"}}')).toBe('PM');
    });
  });

  describe('ss-time-display helper with 12-hour preference setting', () => {
    let mockGame: any;

    beforeEach(() => {
      // Mock game.settings for preference testing
      mockGame = {
        settings: {
          get: vi.fn((module: string, setting: string) => {
            if (module === 'seasons-and-stars' && setting === 'prefer12HourFormat') {
              return false; // Default to 24-hour format
            }
            return undefined;
          }),
        },
      };
      (global as any).game = mockGame;
    });

    it('should display 24-hour format when preference is disabled', () => {
      const calendarWithAmPm: SeasonsStarsCalendar = {
        ...mockCalendar,
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 60,
          amPmNotation: { am: 'AM', pm: 'PM' },
        },
      };

      formatter = new DateFormatter(calendarWithAmPm);

      const afternoon = { ...mockDate, time: { hour: 14, minute: 30, second: 0 } };
      const result = formatter.format(afternoon, '{{ss-time-display mode="exact"}}');
      expect(result).toBe('14:30');
    });

    it('should display 12-hour format when preference is enabled and calendar supports it', () => {
      // Enable 12-hour preference
      mockGame.settings.get = vi.fn((module: string, setting: string) => {
        if (module === 'seasons-and-stars' && setting === 'prefer12HourFormat') {
          return true;
        }
        return undefined;
      });

      const calendarWithAmPm: SeasonsStarsCalendar = {
        ...mockCalendar,
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 60,
          amPmNotation: { am: 'AM', pm: 'PM' },
        },
      };

      formatter = new DateFormatter(calendarWithAmPm);

      const afternoon = { ...mockDate, time: { hour: 14, minute: 30, second: 0 } };
      const result = formatter.format(afternoon, '{{ss-time-display mode="exact"}}');
      expect(result).toBe('2:30 PM');

      const morning = { ...mockDate, time: { hour: 9, minute: 15, second: 0 } };
      const resultMorning = formatter.format(morning, '{{ss-time-display mode="exact"}}');
      expect(resultMorning).toBe('9:15 AM');

      const midnight = { ...mockDate, time: { hour: 0, minute: 0, second: 0 } };
      const resultMidnight = formatter.format(midnight, '{{ss-time-display mode="exact"}}');
      expect(resultMidnight).toBe('12:00 AM');

      const noon = { ...mockDate, time: { hour: 12, minute: 0, second: 0 } };
      const resultNoon = formatter.format(noon, '{{ss-time-display mode="exact"}}');
      expect(resultNoon).toBe('12:00 PM');
    });

    it('should fall back to 24-hour format when calendar does not support am/pm notation', () => {
      // Enable 12-hour preference
      mockGame.settings.get = vi.fn((module: string, setting: string) => {
        if (module === 'seasons-and-stars' && setting === 'prefer12HourFormat') {
          return true;
        }
        return undefined;
      });

      // Calendar without amPmNotation
      formatter = new DateFormatter(mockCalendar);

      const afternoon = { ...mockDate, time: { hour: 14, minute: 30, second: 0 } };
      const result = formatter.format(afternoon, '{{ss-time-display mode="exact"}}');
      expect(result).toBe('14:30');
    });

    it('should work with non-24-hour days when 12-hour format is enabled', () => {
      // Enable 12-hour preference
      mockGame.settings.get = vi.fn((module: string, setting: string) => {
        if (module === 'seasons-and-stars' && setting === 'prefer12HourFormat') {
          return true;
        }
        return undefined;
      });

      const calendar20Hour: SeasonsStarsCalendar = {
        ...mockCalendar,
        time: {
          hoursInDay: 20,
          minutesInHour: 60,
          secondsInMinute: 60,
          amPmNotation: { am: 'AM', pm: 'PM' },
        },
      };

      formatter = new DateFormatter(calendar20Hour);

      // Hour 5 in 20-hour day (before midday at 10)
      const morning = { ...mockDate, time: { hour: 5, minute: 30, second: 0 } };
      const resultMorning = formatter.format(morning, '{{ss-time-display mode="exact"}}');
      expect(resultMorning).toBe('5:30 AM');

      // Hour 15 in 20-hour day (after midday at 10)
      const afternoon = { ...mockDate, time: { hour: 15, minute: 45, second: 0 } };
      const resultAfternoon = formatter.format(afternoon, '{{ss-time-display mode="exact"}}');
      expect(resultAfternoon).toBe('5:45 PM');

      // Hour 0 (midnight equivalent, displays as 10 AM)
      const midnight = { ...mockDate, time: { hour: 0, minute: 0, second: 0 } };
      const resultMidnight = formatter.format(midnight, '{{ss-time-display mode="exact"}}');
      expect(resultMidnight).toBe('10:00 AM');

      // Hour 10 (midday in 20-hour system, displays as 10 PM)
      const midday = { ...mockDate, time: { hour: 10, minute: 0, second: 0 } };
      const resultMidday = formatter.format(midday, '{{ss-time-display mode="exact"}}');
      expect(resultMidday).toBe('10:00 PM');
    });

    it('should prefer canonical hours over 12-hour format when mode is canonical-or-exact', () => {
      // Enable 12-hour preference
      mockGame.settings.get = vi.fn((module: string, setting: string) => {
        if (module === 'seasons-and-stars' && setting === 'prefer12HourFormat') {
          return true;
        }
        return undefined;
      });

      const calendarWithCanonical: SeasonsStarsCalendar = {
        ...mockCalendar,
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 60,
          amPmNotation: { am: 'AM', pm: 'PM' },
        },
        canonicalHours: [
          {
            name: 'Noon',
            startHour: 12,
            startMinute: 0,
            endHour: 13,
            endMinute: 0,
          },
        ],
      };

      formatter = new DateFormatter(calendarWithCanonical);

      // Should display canonical hour name, not 12-hour format
      const noon = { ...mockDate, time: { hour: 12, minute: 0, second: 0 } };
      const result = formatter.format(noon, '{{ss-time-display mode="canonical-or-exact"}}');
      expect(result).toBe('Noon');

      // Should use 12-hour format when no canonical hour matches
      const afternoon = { ...mockDate, time: { hour: 14, minute: 30, second: 0 } };
      const resultAfternoon = formatter.format(
        afternoon,
        '{{ss-time-display mode="canonical-or-exact"}}'
      );
      expect(resultAfternoon).toBe('2:30 PM');
    });
  });
});
