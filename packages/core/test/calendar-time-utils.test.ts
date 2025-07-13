/**
 * Calendar Time Utils Test Suite
 *
 * TDD test suite for CalendarTimeUtils utility functions that replace hardcoded
 * date/time calculations throughout the codebase.
 *
 * Following TDD principles:
 * 1. Write tests with exact expected values (no ranges)
 * 2. Verify tests fail before implementation
 * 3. Implement minimal code to make tests pass
 * 4. Refactor existing code to use utilities
 */

import { describe, test, expect } from 'vitest';
import { CalendarTimeUtils } from '../src/core/calendar-time-utils';
import type { SeasonsStarsCalendar, CalendarDate as ICalendarDate } from '../src/types/calendar';

// Test calendar with standard Earth time system (24/60/60)
const standardCalendar: SeasonsStarsCalendar = {
  id: 'standard-test',
  year: { epoch: 2000, currentYear: 2024, startDay: 0 },
  leapYear: { rule: 'none' },
  months: [
    { name: 'January', abbreviation: 'Jan', days: 31 },
    { name: 'February', abbreviation: 'Feb', days: 28 },
    { name: 'March', abbreviation: 'Mar', days: 31 },
    { name: 'April', abbreviation: 'Apr', days: 30 },
    { name: 'May', abbreviation: 'May', days: 31 },
    { name: 'June', abbreviation: 'Jun', days: 30 },
    { name: 'July', abbreviation: 'Jul', days: 31 },
    { name: 'August', abbreviation: 'Aug', days: 31 },
    { name: 'September', abbreviation: 'Sep', days: 30 },
    { name: 'October', abbreviation: 'Oct', days: 31 },
    { name: 'November', abbreviation: 'Nov', days: 30 },
    { name: 'December', abbreviation: 'Dec', days: 31 },
  ],
  weekdays: [
    { name: 'Sunday' },
    { name: 'Monday' },
    { name: 'Tuesday' },
    { name: 'Wednesday' },
    { name: 'Thursday' },
    { name: 'Friday' },
    { name: 'Saturday' },
  ],
  intercalary: [],
  time: {
    hoursInDay: 24,
    minutesInHour: 60,
    secondsInMinute: 60,
  },
};

// Test calendar with non-standard time system (20/50/50)
const nonStandardCalendar: SeasonsStarsCalendar = {
  id: 'non-standard-test',
  year: { epoch: 1000, currentYear: 1500, startDay: 0 },
  leapYear: { rule: 'none' },
  months: [
    { name: 'First', abbreviation: 'Fir', days: 40 },
    { name: 'Second', abbreviation: 'Sec', days: 40 },
    { name: 'Third', abbreviation: 'Thi', days: 40 },
    { name: 'Fourth', abbreviation: 'Fou', days: 40 },
    { name: 'Fifth', abbreviation: 'Fif', days: 40 },
    { name: 'Sixth', abbreviation: 'Six', days: 40 },
    { name: 'Seventh', abbreviation: 'Sev', days: 40 },
    { name: 'Eighth', abbreviation: 'Eig', days: 40 },
    { name: 'Ninth', abbreviation: 'Nin', days: 40 },
    { name: 'Tenth', abbreviation: 'Ten', days: 45 }, // Different length
  ],
  weekdays: [
    { name: 'First' },
    { name: 'Second' },
    { name: 'Third' },
    { name: 'Fourth' },
    { name: 'Fifth' },
    { name: 'Sixth' },
    { name: 'Seventh' },
    { name: 'Eighth' }, // 8-day week
  ],
  intercalary: [],
  time: {
    hoursInDay: 20, // 20-hour day
    minutesInHour: 50, // 50-minute hour
    secondsInMinute: 50, // 50-second minute
  },
};

// Test calendar with extreme values
const extremeCalendar: SeasonsStarsCalendar = {
  id: 'extreme-test',
  year: { epoch: 0, currentYear: 100, startDay: 0 },
  leapYear: { rule: 'none' },
  months: [{ name: 'Only', abbreviation: 'Onl', days: 100 }],
  weekdays: [{ name: 'Single' }],
  intercalary: [],
  time: {
    hoursInDay: 1,
    minutesInHour: 1,
    secondsInMinute: 1,
  },
};

describe('CalendarTimeUtils', () => {
  describe('getSecondsPerDay', () => {
    test('should calculate exact seconds per day for standard calendar (24*60*60)', () => {
      const result = CalendarTimeUtils.getSecondsPerDay(standardCalendar);
      expect(result).toBe(86400); // 24 * 60 * 60 = 86400
    });

    test('should calculate exact seconds per day for non-standard calendar (20*50*50)', () => {
      const result = CalendarTimeUtils.getSecondsPerDay(nonStandardCalendar);
      expect(result).toBe(50000); // 20 * 50 * 50 = 50000
    });

    test('should calculate exact seconds per day for extreme calendar (1*1*1)', () => {
      const result = CalendarTimeUtils.getSecondsPerDay(extremeCalendar);
      expect(result).toBe(1); // 1 * 1 * 1 = 1
    });
  });

  describe('getSecondsPerHour', () => {
    test('should calculate exact seconds per hour for standard calendar (60*60)', () => {
      const result = CalendarTimeUtils.getSecondsPerHour(standardCalendar);
      expect(result).toBe(3600); // 60 * 60 = 3600
    });

    test('should calculate exact seconds per hour for non-standard calendar (50*50)', () => {
      const result = CalendarTimeUtils.getSecondsPerHour(nonStandardCalendar);
      expect(result).toBe(2500); // 50 * 50 = 2500
    });

    test('should calculate exact seconds per hour for extreme calendar (1*1)', () => {
      const result = CalendarTimeUtils.getSecondsPerHour(extremeCalendar);
      expect(result).toBe(1); // 1 * 1 = 1
    });
  });

  describe('getDaysPerWeek', () => {
    test('should return exact days per week for standard calendar (7 days)', () => {
      const result = CalendarTimeUtils.getDaysPerWeek(standardCalendar);
      expect(result).toBe(7); // Standard 7-day week
    });

    test('should return exact days per week for non-standard calendar (8 days)', () => {
      const result = CalendarTimeUtils.getDaysPerWeek(nonStandardCalendar);
      expect(result).toBe(8); // 8-day week
    });

    test('should return exact days per week for extreme calendar (1 day)', () => {
      const result = CalendarTimeUtils.getDaysPerWeek(extremeCalendar);
      expect(result).toBe(1); // Single-day week
    });
  });

  describe('getMonthsPerYear', () => {
    test('should return exact months per year for standard calendar (12 months)', () => {
      const result = CalendarTimeUtils.getMonthsPerYear(standardCalendar);
      expect(result).toBe(12); // Standard 12-month year
    });

    test('should return exact months per year for non-standard calendar (10 months)', () => {
      const result = CalendarTimeUtils.getMonthsPerYear(nonStandardCalendar);
      expect(result).toBe(10); // 10-month year
    });

    test('should return exact months per year for extreme calendar (1 month)', () => {
      const result = CalendarTimeUtils.getMonthsPerYear(extremeCalendar);
      expect(result).toBe(1); // Single-month year
    });
  });

  describe('daysToSeconds', () => {
    test('should convert exact days to seconds for standard calendar', () => {
      // 1 day = 86400 seconds
      expect(CalendarTimeUtils.daysToSeconds(1, standardCalendar)).toBe(86400);
      // 5 days = 432000 seconds
      expect(CalendarTimeUtils.daysToSeconds(5, standardCalendar)).toBe(432000);
      // 0 days = 0 seconds
      expect(CalendarTimeUtils.daysToSeconds(0, standardCalendar)).toBe(0);
    });

    test('should convert exact days to seconds for non-standard calendar', () => {
      // 1 day = 50000 seconds (20*50*50)
      expect(CalendarTimeUtils.daysToSeconds(1, nonStandardCalendar)).toBe(50000);
      // 3 days = 150000 seconds
      expect(CalendarTimeUtils.daysToSeconds(3, nonStandardCalendar)).toBe(150000);
      // 10 days = 500000 seconds
      expect(CalendarTimeUtils.daysToSeconds(10, nonStandardCalendar)).toBe(500000);
    });

    test('should convert exact days to seconds for extreme calendar', () => {
      // 1 day = 1 second (1*1*1)
      expect(CalendarTimeUtils.daysToSeconds(1, extremeCalendar)).toBe(1);
      // 100 days = 100 seconds
      expect(CalendarTimeUtils.daysToSeconds(100, extremeCalendar)).toBe(100);
    });
  });

  describe('weeksToDays', () => {
    test('should convert exact weeks to days for standard calendar', () => {
      // 1 week = 7 days
      expect(CalendarTimeUtils.weeksToDays(1, standardCalendar)).toBe(7);
      // 4 weeks = 28 days
      expect(CalendarTimeUtils.weeksToDays(4, standardCalendar)).toBe(28);
      // 0 weeks = 0 days
      expect(CalendarTimeUtils.weeksToDays(0, standardCalendar)).toBe(0);
    });

    test('should convert exact weeks to days for non-standard calendar', () => {
      // 1 week = 8 days
      expect(CalendarTimeUtils.weeksToDays(1, nonStandardCalendar)).toBe(8);
      // 5 weeks = 40 days
      expect(CalendarTimeUtils.weeksToDays(5, nonStandardCalendar)).toBe(40);
      // 12 weeks = 96 days
      expect(CalendarTimeUtils.weeksToDays(12, nonStandardCalendar)).toBe(96);
    });

    test('should convert exact weeks to days for extreme calendar', () => {
      // 1 week = 1 day
      expect(CalendarTimeUtils.weeksToDays(1, extremeCalendar)).toBe(1);
      // 50 weeks = 50 days
      expect(CalendarTimeUtils.weeksToDays(50, extremeCalendar)).toBe(50);
    });
  });

  describe('hoursToSeconds', () => {
    test('should convert exact hours to seconds for standard calendar', () => {
      // 1 hour = 3600 seconds (60*60)
      expect(CalendarTimeUtils.hoursToSeconds(1, standardCalendar)).toBe(3600);
      // 8 hours = 28800 seconds
      expect(CalendarTimeUtils.hoursToSeconds(8, standardCalendar)).toBe(28800);
      // 24 hours = 86400 seconds (1 day)
      expect(CalendarTimeUtils.hoursToSeconds(24, standardCalendar)).toBe(86400);
    });

    test('should convert exact hours to seconds for non-standard calendar', () => {
      // 1 hour = 2500 seconds (50*50)
      expect(CalendarTimeUtils.hoursToSeconds(1, nonStandardCalendar)).toBe(2500);
      // 10 hours = 25000 seconds
      expect(CalendarTimeUtils.hoursToSeconds(10, nonStandardCalendar)).toBe(25000);
      // 20 hours = 50000 seconds (1 day)
      expect(CalendarTimeUtils.hoursToSeconds(20, nonStandardCalendar)).toBe(50000);
    });

    test('should convert exact hours to seconds for extreme calendar', () => {
      // 1 hour = 1 second (1*1)
      expect(CalendarTimeUtils.hoursToSeconds(1, extremeCalendar)).toBe(1);
    });
  });

  describe('weeksToSeconds', () => {
    test('should convert exact weeks to seconds for standard calendar', () => {
      // 1 week = 7 days = 604800 seconds (7 * 86400)
      expect(CalendarTimeUtils.weeksToSeconds(1, standardCalendar)).toBe(604800);
      // 2 weeks = 1209600 seconds
      expect(CalendarTimeUtils.weeksToSeconds(2, standardCalendar)).toBe(1209600);
    });

    test('should convert exact weeks to seconds for non-standard calendar', () => {
      // 1 week = 8 days = 400000 seconds (8 * 50000)
      expect(CalendarTimeUtils.weeksToSeconds(1, nonStandardCalendar)).toBe(400000);
      // 3 weeks = 1200000 seconds
      expect(CalendarTimeUtils.weeksToSeconds(3, nonStandardCalendar)).toBe(1200000);
    });

    test('should convert exact weeks to seconds for extreme calendar', () => {
      // 1 week = 1 day = 1 second
      expect(CalendarTimeUtils.weeksToSeconds(1, extremeCalendar)).toBe(1);
      // 10 weeks = 10 seconds
      expect(CalendarTimeUtils.weeksToSeconds(10, extremeCalendar)).toBe(10);
    });
  });

  describe('secondsToWorldTimeUnits', () => {
    test('should convert exact seconds to time components for standard calendar', () => {
      // 90061 seconds = 1 day, 1 hour, 1 minute, 1 second
      const result = CalendarTimeUtils.secondsToWorldTimeUnits(90061, standardCalendar);
      expect(result.days).toBe(1);
      expect(result.hours).toBe(1);
      expect(result.minutes).toBe(1);
      expect(result.seconds).toBe(1);
    });

    test('should convert exact seconds to time components for non-standard calendar', () => {
      // 52551 seconds = 1 day, 1 hour, 1 minute, 1 second (in 20/50/50 system)
      // 1 day = 50000, 1 hour = 2500, 1 minute = 50, 1 second = 1
      // Total: 50000 + 2500 + 50 + 1 = 52551
      const result = CalendarTimeUtils.secondsToWorldTimeUnits(52551, nonStandardCalendar);
      expect(result.days).toBe(1);
      expect(result.hours).toBe(1);
      expect(result.minutes).toBe(1);
      expect(result.seconds).toBe(1);
    });

    test('should convert exact seconds to time components for extreme calendar', () => {
      // 4 seconds = 4 days, 0 hours, 0 minutes, 0 seconds
      const result = CalendarTimeUtils.secondsToWorldTimeUnits(4, extremeCalendar);
      expect(result.days).toBe(4);
      expect(result.hours).toBe(0);
      expect(result.minutes).toBe(0);
      expect(result.seconds).toBe(0);
    });

    test('should handle zero seconds correctly', () => {
      const result = CalendarTimeUtils.secondsToWorldTimeUnits(0, standardCalendar);
      expect(result.days).toBe(0);
      expect(result.hours).toBe(0);
      expect(result.minutes).toBe(0);
      expect(result.seconds).toBe(0);
    });

    test('should handle exactly one day correctly for standard calendar', () => {
      const result = CalendarTimeUtils.secondsToWorldTimeUnits(86400, standardCalendar);
      expect(result.days).toBe(1);
      expect(result.hours).toBe(0);
      expect(result.minutes).toBe(0);
      expect(result.seconds).toBe(0);
    });
  });

  describe('Date Comparison Utilities', () => {
    test('should compare dates correctly with compareDates()', () => {
      const date1: ICalendarDate = { year: 2024, month: 6, day: 15, weekday: 0 };
      const date2: ICalendarDate = { year: 2024, month: 6, day: 16, weekday: 1 };
      const date3: ICalendarDate = { year: 2024, month: 7, day: 15, weekday: 0 };
      const date4: ICalendarDate = { year: 2025, month: 6, day: 15, weekday: 0 };
      const dateEqual: ICalendarDate = { year: 2024, month: 6, day: 15, weekday: 2 }; // Different weekday, should still be equal for date comparison

      // Same date comparison
      expect(CalendarTimeUtils.compareDates(date1, dateEqual)).toBe(0);

      // Day comparison (same year/month)
      expect(CalendarTimeUtils.compareDates(date1, date2)).toBe(-1); // date1 < date2
      expect(CalendarTimeUtils.compareDates(date2, date1)).toBe(1); // date2 > date1

      // Month comparison (same year)
      expect(CalendarTimeUtils.compareDates(date1, date3)).toBe(-1); // date1 < date3
      expect(CalendarTimeUtils.compareDates(date3, date1)).toBe(1); // date3 > date1

      // Year comparison
      expect(CalendarTimeUtils.compareDates(date1, date4)).toBe(-1); // date1 < date4
      expect(CalendarTimeUtils.compareDates(date4, date1)).toBe(1); // date4 > date1
    });

    test('should check date equality with isDateEqual()', () => {
      const date1: ICalendarDate = { year: 2024, month: 6, day: 15, weekday: 0 };
      const date2: ICalendarDate = { year: 2024, month: 6, day: 15, weekday: 5 }; // Different weekday
      const date3: ICalendarDate = { year: 2024, month: 6, day: 16, weekday: 0 };

      // Same date (weekday difference should not matter)
      expect(CalendarTimeUtils.isDateEqual(date1, date2)).toBe(true);

      // Different dates
      expect(CalendarTimeUtils.isDateEqual(date1, date3)).toBe(false);
    });

    test('should check date ordering with isDateBefore() and isDateAfter()', () => {
      const earlier: ICalendarDate = { year: 2024, month: 6, day: 15, weekday: 0 };
      const later: ICalendarDate = { year: 2024, month: 6, day: 16, weekday: 1 };
      const same: ICalendarDate = { year: 2024, month: 6, day: 15, weekday: 3 };

      // Before checks
      expect(CalendarTimeUtils.isDateBefore(earlier, later)).toBe(true);
      expect(CalendarTimeUtils.isDateBefore(later, earlier)).toBe(false);
      expect(CalendarTimeUtils.isDateBefore(earlier, same)).toBe(false); // Same date

      // After checks
      expect(CalendarTimeUtils.isDateAfter(later, earlier)).toBe(true);
      expect(CalendarTimeUtils.isDateAfter(earlier, later)).toBe(false);
      expect(CalendarTimeUtils.isDateAfter(earlier, same)).toBe(false); // Same date
    });
  });

  describe('Date Arithmetic Utilities', () => {
    test('should normalize month overflow and underflow with normalizeMonth()', () => {
      // Standard calendar (12 months)
      // Month overflow
      expect(CalendarTimeUtils.normalizeMonth(13, 2024, standardCalendar)).toEqual({
        month: 1,
        year: 2025,
      });
      expect(CalendarTimeUtils.normalizeMonth(25, 2024, standardCalendar)).toEqual({
        month: 1,
        year: 2026,
      });

      // Month underflow
      expect(CalendarTimeUtils.normalizeMonth(0, 2024, standardCalendar)).toEqual({
        month: 12,
        year: 2023,
      });
      expect(CalendarTimeUtils.normalizeMonth(-11, 2024, standardCalendar)).toEqual({
        month: 1,
        year: 2023,
      });

      // Normal months
      expect(CalendarTimeUtils.normalizeMonth(6, 2024, standardCalendar)).toEqual({
        month: 6,
        year: 2024,
      });

      // Non-standard calendar (10 months)
      expect(CalendarTimeUtils.normalizeMonth(11, 1500, nonStandardCalendar)).toEqual({
        month: 1,
        year: 1501,
      });
      expect(CalendarTimeUtils.normalizeMonth(0, 1500, nonStandardCalendar)).toEqual({
        month: 10,
        year: 1499,
      });
    });

    test('should add months to dates with addMonthsToDate()', () => {
      const baseDate: ICalendarDate = { year: 2024, month: 6, day: 15, weekday: 0 };

      // Add positive months (standard calendar)
      const plus2Months = CalendarTimeUtils.addMonthsToDate(baseDate, 2, standardCalendar);
      expect(plus2Months.year).toBe(2024);
      expect(plus2Months.month).toBe(8);
      expect(plus2Months.day).toBe(15);

      // Add months with year overflow
      const plus8Months = CalendarTimeUtils.addMonthsToDate(baseDate, 8, standardCalendar);
      expect(plus8Months.year).toBe(2025);
      expect(plus8Months.month).toBe(2);
      expect(plus8Months.day).toBe(15);

      // Subtract months
      const minus3Months = CalendarTimeUtils.addMonthsToDate(baseDate, -3, standardCalendar);
      expect(minus3Months.year).toBe(2024);
      expect(minus3Months.month).toBe(3);
      expect(minus3Months.day).toBe(15);

      // Subtract months with year underflow
      const minus8Months = CalendarTimeUtils.addMonthsToDate(baseDate, -8, standardCalendar);
      expect(minus8Months.year).toBe(2023);
      expect(minus8Months.month).toBe(10);
      expect(minus8Months.day).toBe(15);

      // Day overflow handling (31st to February = 28th)
      const jan31: ICalendarDate = { year: 2024, month: 1, day: 31, weekday: 0 };
      const feb = CalendarTimeUtils.addMonthsToDate(jan31, 1, standardCalendar);
      expect(feb.year).toBe(2024);
      expect(feb.month).toBe(2);
      expect(feb.day).toBe(28); // February has 28 days, so 31st becomes 28th
    });

    test('should normalize weekday values with normalizeWeekday()', () => {
      // Standard 7-day week
      expect(CalendarTimeUtils.normalizeWeekday(7, standardCalendar)).toBe(0); // 7 → 0
      expect(CalendarTimeUtils.normalizeWeekday(8, standardCalendar)).toBe(1); // 8 → 1
      expect(CalendarTimeUtils.normalizeWeekday(-1, standardCalendar)).toBe(6); // -1 → 6
      expect(CalendarTimeUtils.normalizeWeekday(-8, standardCalendar)).toBe(6); // -8 → 6
      expect(CalendarTimeUtils.normalizeWeekday(3, standardCalendar)).toBe(3); // 3 → 3 (no change)

      // Non-standard 8-day week
      expect(CalendarTimeUtils.normalizeWeekday(8, nonStandardCalendar)).toBe(0); // 8 → 0
      expect(CalendarTimeUtils.normalizeWeekday(16, nonStandardCalendar)).toBe(0); // 16 → 0
      expect(CalendarTimeUtils.normalizeWeekday(-1, nonStandardCalendar)).toBe(7); // -1 → 7
      expect(CalendarTimeUtils.normalizeWeekday(5, nonStandardCalendar)).toBe(5); // 5 → 5 (no change)
    });
  });

  describe('Formatting Utilities', () => {
    test('should add ordinal suffixes correctly with addOrdinalSuffix()', () => {
      // Basic ordinals
      expect(CalendarTimeUtils.addOrdinalSuffix(1)).toBe('1st');
      expect(CalendarTimeUtils.addOrdinalSuffix(2)).toBe('2nd');
      expect(CalendarTimeUtils.addOrdinalSuffix(3)).toBe('3rd');
      expect(CalendarTimeUtils.addOrdinalSuffix(4)).toBe('4th');
      expect(CalendarTimeUtils.addOrdinalSuffix(5)).toBe('5th');

      // Teen exceptions (11th, 12th, 13th always use 'th')
      expect(CalendarTimeUtils.addOrdinalSuffix(11)).toBe('11th');
      expect(CalendarTimeUtils.addOrdinalSuffix(12)).toBe('12th');
      expect(CalendarTimeUtils.addOrdinalSuffix(13)).toBe('13th');

      // Higher numbers following same pattern
      expect(CalendarTimeUtils.addOrdinalSuffix(21)).toBe('21st');
      expect(CalendarTimeUtils.addOrdinalSuffix(22)).toBe('22nd');
      expect(CalendarTimeUtils.addOrdinalSuffix(23)).toBe('23rd');
      expect(CalendarTimeUtils.addOrdinalSuffix(24)).toBe('24th');

      // Teen pattern in higher numbers
      expect(CalendarTimeUtils.addOrdinalSuffix(111)).toBe('111th');
      expect(CalendarTimeUtils.addOrdinalSuffix(112)).toBe('112th');
      expect(CalendarTimeUtils.addOrdinalSuffix(113)).toBe('113th');

      // Large numbers
      expect(CalendarTimeUtils.addOrdinalSuffix(101)).toBe('101st');
      expect(CalendarTimeUtils.addOrdinalSuffix(102)).toBe('102nd');
      expect(CalendarTimeUtils.addOrdinalSuffix(103)).toBe('103rd');
    });

    test('should format time components with formatTimeComponent()', () => {
      // Default padding (2 digits)
      expect(CalendarTimeUtils.formatTimeComponent(5)).toBe('05');
      expect(CalendarTimeUtils.formatTimeComponent(10)).toBe('10');
      expect(CalendarTimeUtils.formatTimeComponent(123)).toBe('123'); // No truncation

      // Custom padding
      expect(CalendarTimeUtils.formatTimeComponent(5, 3)).toBe('005');
      expect(CalendarTimeUtils.formatTimeComponent(12, 4)).toBe('0012');
      expect(CalendarTimeUtils.formatTimeComponent(1234, 2)).toBe('1234'); // No truncation

      // Zero values
      expect(CalendarTimeUtils.formatTimeComponent(0)).toBe('00');
      expect(CalendarTimeUtils.formatTimeComponent(0, 4)).toBe('0000');
    });
  });

  describe('Calendar-Specific Year Operations', () => {
    test('should calculate approximate year length with getApproximateYearLength()', () => {
      // Standard calendar: sum of all month days
      const standardLength = CalendarTimeUtils.getApproximateYearLength(standardCalendar);
      expect(standardLength).toBe(365); // 31+28+31+30+31+30+31+31+30+31+30+31 = 365

      // Non-standard calendar: 9 months of 40 days + 1 month of 45 days
      const nonStandardLength = CalendarTimeUtils.getApproximateYearLength(nonStandardCalendar);
      expect(nonStandardLength).toBe(405); // 9*40 + 45 = 360 + 45 = 405

      // Extreme calendar: 1 month of 100 days
      const extremeLength = CalendarTimeUtils.getApproximateYearLength(extremeCalendar);
      expect(extremeLength).toBe(100);
    });
  });

  describe('Edge Cases and Validation', () => {
    test('should handle negative values correctly', () => {
      // Functions should handle negative inputs gracefully
      expect(CalendarTimeUtils.daysToSeconds(-1, standardCalendar)).toBe(-86400);
      expect(CalendarTimeUtils.weeksToDays(-2, standardCalendar)).toBe(-14);
      expect(CalendarTimeUtils.hoursToSeconds(-5, standardCalendar)).toBe(-18000);
    });

    test('should handle fractional values correctly', () => {
      // 0.5 days = 43200 seconds (half day)
      expect(CalendarTimeUtils.daysToSeconds(0.5, standardCalendar)).toBe(43200);
      // 2.5 weeks = 17.5 days = 17.5 * 7 = 122.5 days (fractional weeks)
      expect(CalendarTimeUtils.weeksToDays(2.5, standardCalendar)).toBe(17.5);
    });

    test('should maintain precision with large numbers', () => {
      // Large values should not lose precision
      const largeDays = 1000000;
      const expectedSeconds = largeDays * 86400; // 86,400,000,000
      expect(CalendarTimeUtils.daysToSeconds(largeDays, standardCalendar)).toBe(expectedSeconds);
    });
  });
});
