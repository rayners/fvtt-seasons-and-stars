/**
 * Roshar Calendar Tests - Verify Stormlight Archive calendar formatting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateFormatter } from '../../core/src/core/date-formatter';
import { CalendarDate } from '../../core/src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../../core/src/types/calendar';
import rosharCalendarData from '../calendars/roshar.json';

// Use REAL Handlebars for testing
import Handlebars from 'handlebars';
global.Handlebars = Handlebars;

describe('Roshar Calendar', () => {
  let rosharCalendar: SeasonsStarsCalendar;
  let formatter: DateFormatter;

  beforeEach(() => {
    vi.clearAllMocks();
    DateFormatter.resetHelpersForTesting();

    // Load the actual Roshar calendar definition
    rosharCalendar = rosharCalendarData as SeasonsStarsCalendar;
    formatter = new DateFormatter(rosharCalendar);
  });

  describe('Calendar Structure', () => {
    it('should have 10 months of 50 days each', () => {
      expect(rosharCalendar.months).toHaveLength(10);

      rosharCalendar.months.forEach(month => {
        expect(month.days).toBe(50);
      });
    });

    it('should have 5-day weeks', () => {
      expect(rosharCalendar.weekdays).toHaveLength(5);
    });

    it('should have The Weeping as intercalary period', () => {
      expect(rosharCalendar.intercalary).toHaveLength(1);
      expect(rosharCalendar.intercalary[0].name).toBe('The Weeping');
      expect(rosharCalendar.intercalary[0].days).toBe(28);
    });
  });

  describe('Year.Month.Week.Day Format', () => {
    it('should format date as Year.Month.Week.Day for early month days', () => {
      // Day 3 of Jesnan (month 1) should be 1173.1.1.3 (week 1, day 3)
      const date = {
        year: 1173,
        month: 1,
        day: 3,
        weekday: 2, // Third day of week (0-indexed)
        time: { hour: 10, minute: 50, second: 25 },
      } as CalendarDate;

      const result = formatter.format(
        date,
        '{{year}}.{{month}}.{{ss-week}}.{{ss-math day op="modulo" value=5}}'
      );
      expect(result).toBe('1173.1.1.3');
    });

    it('should format date correctly for mid-month days', () => {
      // Day 23 of Palah (month 5) should be 1173.5.5.3 (week 5, day 3 of week)
      const date = {
        year: 1173,
        month: 5,
        day: 23,
        weekday: 2, // Third day of week
        time: { hour: 15, minute: 75, second: 50 },
      } as CalendarDate;

      const result = formatter.format(
        date,
        '{{year}}.{{month}}.{{ss-week}}.{{ss-math day op="modulo" value=5}}'
      );
      expect(result).toBe('1173.5.5.3');
    });

    it('should handle week boundaries correctly', () => {
      // Day 5 should be week 1, day 0 (last day of week)
      const day5 = {
        year: 1173,
        month: 1,
        day: 5,
        weekday: 4,
      } as CalendarDate;

      const result5 = formatter.format(
        day5,
        '{{year}}.{{month}}.{{ss-week}}.{{ss-math day op="modulo" value=5}}'
      );
      expect(result5).toBe('1173.1.1.0');

      // Day 6 should be week 2, day 1 (first day of next week)
      const day6 = {
        year: 1173,
        month: 1,
        day: 6,
        weekday: 0,
      } as CalendarDate;

      const result6 = formatter.format(
        day6,
        '{{year}}.{{month}}.{{ss-week}}.{{ss-math day op="modulo" value=5}}'
      );
      expect(result6).toBe('1173.1.2.1');
    });

    it('should handle end of month correctly', () => {
      // Day 50 of Ishev (month 10) should be 1173.10.10.0 (week 10, last day)
      const date = {
        year: 1173,
        month: 10,
        day: 50,
        weekday: 4,
        time: { hour: 19, minute: 99, second: 99 },
      } as CalendarDate;

      const result = formatter.format(
        date,
        '{{year}}.{{month}}.{{ss-week}}.{{ss-math day op="modulo" value=5}}'
      );
      expect(result).toBe('1173.10.10.0');
    });
  });

  describe('Roshar Date Formats', () => {
    it('should support the roshar-simple format', () => {
      const date = {
        year: 1173,
        month: 3,
        day: 17,
        weekday: 1,
      } as CalendarDate;

      const result = formatter.formatNamed(date, 'roshar-simple');
      expect(result).toBe('1173.3.4.2'); // Day 17 = week 4, day 2 of week
    });

    it('should support the vorin format', () => {
      const date = {
        year: 1173,
        month: 2,
        day: 12,
        weekday: 1,
      } as CalendarDate;

      const result = formatter.formatNamed(date, 'vorin');
      expect(result).toBe('12th day of 3rd week, Nanan, 1173');
    });

    it('should support traditional long format', () => {
      const date = {
        year: 1173,
        month: 1,
        day: 1,
        weekday: 0,
      } as CalendarDate;

      const result = formatter.formatNamed(date, 'long');
      expect(result).toBe('Jesdes, 1st Jesnan 1173');
    });
  });

  describe('Week Helper Integration', () => {
    it('should automatically use 5-day weeks from calendar definition', () => {
      const date = {
        year: 1173,
        month: 1,
        day: 27,
        weekday: 1,
      } as CalendarDate;

      // Should be week 6 (days 26-30 are week 6)
      const weekResult = formatter.format(date, '{{ss-week}}');
      expect(weekResult).toBe('6');
    });

    it('should support week padding format', () => {
      const date = {
        year: 1173,
        month: 1,
        day: 7,
        weekday: 1,
      } as CalendarDate;

      // Should be week 2, padded
      const weekResult = formatter.format(date, '{{ss-week format="pad"}}');
      expect(weekResult).toBe('02');
    });
  });

  describe('Intercalary Period - The Weeping', () => {
    it('should have The Weeping configured correctly', () => {
      const weeping = rosharCalendar.intercalary[0];

      expect(weeping.name).toBe('The Weeping');
      expect(weeping.days).toBe(28);
      expect(weeping.after).toBe('Ishev');
      expect(weeping.description).toContain('four-week period of constant rain');
      expect(weeping.description).toContain('Lightday');
    });
  });

  describe('Month and Weekday Names', () => {
    it('should have correct Vorin month names', () => {
      const expectedMonths = [
        'Jesnan',
        'Nanan',
        'Chach',
        'Vev',
        'Palah',
        'Shash',
        'Betab',
        'Kak',
        'Tanat',
        'Ishev',
      ];

      rosharCalendar.months.forEach((month, index) => {
        expect(month.name).toBe(expectedMonths[index]);
      });
    });

    it('should have correct Vorin weekday names', () => {
      const expectedWeekdays = ['Jesdes', 'Nandes', 'Chachel', 'Vevod', 'Palah'];

      rosharCalendar.weekdays.forEach((weekday, index) => {
        expect(weekday.name).toBe(expectedWeekdays[index]);
      });
    });
  });

  describe('Roshar Time System', () => {
    it('should use 20-hour days with 100-minute hours', () => {
      expect(rosharCalendar.time.hoursInDay).toBe(20);
      expect(rosharCalendar.time.minutesInHour).toBe(100);
      expect(rosharCalendar.time.secondsInMinute).toBe(100);
    });

    it('should format time correctly', () => {
      const date = {
        year: 1173,
        month: 1,
        day: 1,
        weekday: 0,
        time: { hour: 5, minute: 42, second: 78 },
      } as CalendarDate;

      const result = formatter.formatNamed(date, 'time');
      expect(result).toBe('05:42');
    });
  });
});
