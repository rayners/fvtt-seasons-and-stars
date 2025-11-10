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

    it('should have no intercalary periods (The Weeping and Midpeace are not extra days)', () => {
      expect(rosharCalendar.intercalary).toHaveLength(0);
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

  describe('Calendar Year Length', () => {
    it('should have exactly 500 days per year', () => {
      const totalDays = rosharCalendar.months.reduce((sum, month) => sum + month.days, 0);
      expect(totalDays).toBe(500);
    });

    it('should have correct week structure (10 weeks per month)', () => {
      rosharCalendar.months.forEach(month => {
        const weeksPerMonth = month.days / rosharCalendar.weekdays.length;
        expect(weeksPerMonth).toBe(10);
      });
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
    it('should use 20-hour days with 50-minute hours', () => {
      expect(rosharCalendar.time.hoursInDay).toBe(20);
      expect(rosharCalendar.time.minutesInHour).toBe(50);
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

  describe('Special Period Seasons', () => {
    it('should have The Weeping as a season', () => {
      expect(rosharCalendar.seasons).toBeDefined();
      const weeping = rosharCalendar.seasons?.find(s => s.name === 'The Weeping');
      expect(weeping).toBeDefined();
      expect(weeping?.name).toBe('The Weeping');
    });

    it('should have The Weeping occur at end of year (month 10)', () => {
      const weeping = rosharCalendar.seasons?.find(s => s.name === 'The Weeping');
      expect(weeping?.startMonth).toBe(10); // Ishev
      expect(weeping?.endMonth).toBe(10); // Ishev
    });

    it('should have Midpeace as a season', () => {
      const midpeace = rosharCalendar.seasons?.find(s => s.name === 'Midpeace');
      expect(midpeace).toBeDefined();
      expect(midpeace?.name).toBe('Midpeace');
    });

    it('should have Midpeace occur at mid-year (months 5-6)', () => {
      const midpeace = rosharCalendar.seasons?.find(s => s.name === 'Midpeace');
      expect(midpeace?.startMonth).toBe(5); // Palah
      expect(midpeace?.endMonth).toBe(6); // Shash
    });

    it('should have both seasons with appropriate icons', () => {
      const weeping = rosharCalendar.seasons?.find(s => s.name === 'The Weeping');
      const midpeace = rosharCalendar.seasons?.find(s => s.name === 'Midpeace');
      expect(weeping?.icon).toBe('cloud-rain');
      expect(midpeace?.icon).toBe('dove');
    });

    it('should have The Weeping spanning exactly 20 days (Ishev 31-50)', () => {
      const weeping = rosharCalendar.seasons?.find(s => s.name === 'The Weeping');
      expect(weeping?.startDay).toBe(31);
      expect(weeping?.endDay).toBe(50);
    });

    it('should have Midpeace spanning exactly 20 days (Palah 41-50 through Shash 1-10)', () => {
      const midpeace = rosharCalendar.seasons?.find(s => s.name === 'Midpeace');
      expect(midpeace?.startDay).toBe(41);
      expect(midpeace?.endDay).toBe(10);
    });

    it('should have The Weeping lasting exactly 20 days (4 Rosharan weeks)', () => {
      const weeping = rosharCalendar.seasons?.find(s => s.name === 'The Weeping');
      expect(weeping).toBeDefined();

      // The Weeping: Ishev 31-50 = 20 days
      const startDay = weeping?.startDay ?? 1;
      const endDay = weeping?.endDay ?? 50;
      const durationInDays = endDay - startDay + 1;

      expect(durationInDays).toBe(20); // 4 weeks × 5 days/week
    });

    it('should have Midpeace lasting exactly 20 days (4 Rosharan weeks)', () => {
      const midpeace = rosharCalendar.seasons?.find(s => s.name === 'Midpeace');
      expect(midpeace).toBeDefined();

      // Midpeace spans two months: Palah 41-50 (10 days) + Shash 1-10 (10 days) = 20 days
      const palahDays = 50 - (midpeace?.startDay ?? 41) + 1; // Days 41-50 in Palah
      const shashDays = midpeace?.endDay ?? 10; // Days 1-10 in Shash
      const totalDays = palahDays + shashDays;

      expect(totalDays).toBe(20); // 4 weeks × 5 days/week
    });

    it('should have total year length of 500 days', () => {
      // This verifies that seasons don't add extra days to the year
      const totalDays = rosharCalendar.months.reduce((sum, month) => sum + month.days, 0);
      const intercalaryDays =
        rosharCalendar.intercalary?.reduce((sum, period) => sum + period.days, 0) ?? 0;
      const yearLength = totalDays + intercalaryDays;

      expect(yearLength).toBe(500); // 10 months × 50 days/month
    });
  });
});
