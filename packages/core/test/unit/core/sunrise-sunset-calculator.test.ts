/**
 * Sunrise/Sunset Calculator Test Suite
 *
 * Consolidated unit tests for the SunriseSunsetCalculator utility class that calculates
 * sunrise and sunset times based on season data with interpolation.
 *
 * This file consolidates tests from:
 * - sunrise-sunset-calculator.test.ts (base calculation tests)
 * - sunrise-sunset-seconds-to-string.test.ts (secondsToTimeString tests)
 * - sunrise-sunset-time-components.test.ts (decimalHoursToTimeComponents tests)
 * - sunrise-sunset-flexible-format.test.ts (flexible time format tests)
 */

import { describe, test, it, expect } from 'vitest';
import { SunriseSunsetCalculator } from '../../../src/core/sunrise-sunset-calculator';
import type { SeasonsStarsCalendar, CalendarDate } from '../../../src/types/calendar';
import type { CalendarEngineInterface } from '../../../src/types/foundry-extensions';

// Test calendar with standard Earth-like configuration and seasons with sunrise/sunset data
const gregorianTestCalendar: SeasonsStarsCalendar = {
  id: 'gregorian-test',
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
  seasons: [
    {
      name: 'Winter',
      startMonth: 12,
      endMonth: 2,
      sunrise: '07:00',
      sunset: '16:45',
    },
    {
      name: 'Spring',
      startMonth: 3,
      endMonth: 5,
      sunrise: '06:30',
      sunset: '17:45',
    },
    {
      name: 'Summer',
      startMonth: 6,
      endMonth: 8,
      sunrise: '05:45',
      sunset: '20:15',
    },
    {
      name: 'Autumn',
      startMonth: 9,
      endMonth: 11,
      sunrise: '06:30',
      sunset: '19:30',
    },
  ],
  time: {
    hoursInDay: 24,
    minutesInHour: 60,
    secondsInMinute: 60,
  },
};

// Test calendar without any sunrise/sunset data
const calendarWithoutSunData: SeasonsStarsCalendar = {
  id: 'no-sun-data',
  year: { epoch: 2000, currentYear: 2024, startDay: 0 },
  leapYear: { rule: 'none' },
  months: [
    { name: 'Month1', abbreviation: 'M1', days: 30 },
    { name: 'Month2', abbreviation: 'M2', days: 30 },
  ],
  weekdays: [{ name: 'Day1' }, { name: 'Day2' }],
  intercalary: [],
  seasons: [
    {
      name: 'Season1',
      startMonth: 1,
      endMonth: 1,
    },
    {
      name: 'Season2',
      startMonth: 2,
      endMonth: 2,
    },
  ],
  time: {
    hoursInDay: 24,
    minutesInHour: 60,
    secondsInMinute: 60,
  },
};

// Test calendar with non-standard day length
const nonStandardDayCalendar: SeasonsStarsCalendar = {
  id: 'non-standard-day',
  year: { epoch: 2000, currentYear: 2024, startDay: 0 },
  leapYear: { rule: 'none' },
  months: [
    { name: 'Month1', abbreviation: 'M1', days: 30 },
    { name: 'Month2', abbreviation: 'M2', days: 30 },
  ],
  weekdays: [{ name: 'Day1' }, { name: 'Day2' }],
  intercalary: [],
  seasons: [
    {
      name: 'Season1',
      startMonth: 1,
      endMonth: 1,
    },
  ],
  time: {
    hoursInDay: 20,
    minutesInHour: 50,
    secondsInMinute: 50,
  },
};

// Create a mock engine for a given calendar
function createMockEngine(calendar: SeasonsStarsCalendar): CalendarEngineInterface {
  return {
    getCalendar: () => calendar,
    calculateWeekday: () => 0,
    getMonthLength: (month: number) => calendar.months?.[month - 1]?.days ?? 30,
    getMonthLengths: () => calendar.months?.map(m => m.days ?? 30) ?? [],
    getYearLength: () =>
      calendar.months?.reduce((sum, month) => sum + (month.days ?? 30), 0) ?? 365,
    isLeapYear: () => false,
    dateToWorldTime: () => 0,
    worldTimeToDate: () => ({ year: 2024, month: 1, day: 1, weekday: 0 }),
    getIntercalaryDaysAfterMonth: () => [],
    getIntercalaryDaysBeforeMonth: () => [],
    addMonths: (date: CalendarDate) => date,
    addYears: (date: CalendarDate) => date,
    getMoonPhaseInfo: () => [],
  };
}

describe('SunriseSunsetCalculator', () => {
  describe('Basic Calculation', () => {
    test('should calculate sunrise/sunset for first day of season', () => {
      const date: CalendarDate = { year: 2024, month: 12, day: 1 };
      const engine = createMockEngine(gregorianTestCalendar);
      const result = SunriseSunsetCalculator.calculate(date, gregorianTestCalendar, engine);

      expect(result.sunrise).toBe(25200); // 07:00 = 7 × 3600
      expect(result.sunset).toBe(60300); // 16:45 = 16.75 × 3600
    });

    test('should calculate sunrise/sunset for summer', () => {
      const date: CalendarDate = { year: 2024, month: 6, day: 1 };
      const engine = createMockEngine(gregorianTestCalendar);
      const result = SunriseSunsetCalculator.calculate(date, gregorianTestCalendar, engine);

      expect(result.sunrise).toBe(20700); // 05:45 = 5.75 × 3600
      expect(result.sunset).toBe(72900); // 20:15 = 20.25 × 3600
    });
  });

  describe('Season Interpolation', () => {
    test('should interpolate between seasons', () => {
      // March 15 - halfway through Spring (Mar 1 to Jun 1)
      // Spring starts: sunrise 06:30, sunset 17:45
      // Summer starts: sunrise 05:45, sunset 20:15
      const date: CalendarDate = { year: 2024, month: 4, day: 15 };
      const engine = createMockEngine(gregorianTestCalendar);
      const result = SunriseSunsetCalculator.calculate(date, gregorianTestCalendar, engine);

      // Values should be between Spring and Summer (in seconds)
      expect(result.sunrise).toBeLessThan(23400); // Less than Spring start (6.5 hours)
      expect(result.sunrise).toBeGreaterThan(20700); // Greater than Summer start (5.75 hours)
      expect(result.sunset).toBeGreaterThan(63900); // Greater than Spring start (17.75 hours)
      expect(result.sunset).toBeLessThan(72900); // Less than Summer start (20.25 hours)
    });

    test('should approach next season at end of current season', () => {
      // August 31 - last day of Summer
      const date: CalendarDate = { year: 2024, month: 8, day: 31 };
      const engine = createMockEngine(gregorianTestCalendar);
      const result = SunriseSunsetCalculator.calculate(date, gregorianTestCalendar, engine);

      // Should be close to Autumn values (in seconds)
      // Autumn: sunrise 06:30 (23400s), sunset 19:30 (70200s)
      // Allow for some difference as it's not exactly at Autumn yet (0.5 hours = 1800 seconds)
      expect(Math.abs(result.sunrise - 23400)).toBeLessThan(1800);
      expect(Math.abs(result.sunset - 70200)).toBeLessThan(1800);
    });
  });

  describe('Year-Crossing Seasons', () => {
    test('should handle year-crossing season (Winter)', () => {
      // January 15 - middle of Winter (Dec-Feb)
      const date: CalendarDate = { year: 2024, month: 1, day: 15 };
      const engine = createMockEngine(gregorianTestCalendar);
      const result = SunriseSunsetCalculator.calculate(date, gregorianTestCalendar, engine);

      // Winter starts: sunrise 07:00 (25200s), sunset 16:45 (60300s)
      // Spring starts: sunrise 06:30 (23400s), sunset 17:45 (63900s)
      expect(result.sunrise).toBeGreaterThan(22680); // 6.3 hours
      expect(result.sunrise).toBeLessThan(25200); // 7.0 hours
      expect(result.sunset).toBeGreaterThan(60300); // 16.75 hours
      expect(result.sunset).toBeLessThan(63900); // 17.75 hours
    });

    test('should handle December start of year-crossing Winter', () => {
      // December 1 - first day of Winter
      const date: CalendarDate = { year: 2024, month: 12, day: 1 };
      const engine = createMockEngine(gregorianTestCalendar);
      const result = SunriseSunsetCalculator.calculate(date, gregorianTestCalendar, engine);

      // Should be exactly Winter start values
      expect(result.sunrise).toBe(25200); // 07:00 (7.0 × 3600)
      expect(result.sunset).toBe(60300); // 16:45 (16.75 × 3600)
    });

    test('should handle February end of year-crossing Winter', () => {
      // February 28 - last day of Winter
      const date: CalendarDate = { year: 2024, month: 2, day: 28 };
      const engine = createMockEngine(gregorianTestCalendar);
      const result = SunriseSunsetCalculator.calculate(date, gregorianTestCalendar, engine);

      // Should be very close to Spring values (approaching transition)
      // Spring: sunrise 06:30 (23400s), sunset 17:45 (63900s)
      expect(result.sunrise).toBeCloseTo(23400, -3); // within 1000s
      expect(result.sunset).toBeCloseTo(63900, -3); // within 1000s
    });

    test('should not include November in year-crossing Winter', () => {
      // November 15 - should NOT be in Winter (Dec-Feb), should be in Autumn
      const date: CalendarDate = { year: 2024, month: 11, day: 15 };
      const engine = createMockEngine(gregorianTestCalendar);
      const result = SunriseSunsetCalculator.calculate(date, gregorianTestCalendar, engine);

      // Should be in Autumn (interpolating toward Winter), not using Winter values
      // Autumn start: sunrise 06:30 (23400s), sunset 19:30 (70200s)
      // Winter start: sunrise 07:00 (25200s), sunset 16:45 (60300s)
      // Mid-November should be closer to Winter end than Autumn start
      expect(result.sunrise).toBeGreaterThan(23400); // Greater than Autumn start
      expect(result.sunrise).toBeLessThan(25200); // Less than Winter start
      expect(result.sunset).toBeGreaterThan(60300); // Greater than Winter start
      expect(result.sunset).toBeLessThan(70200); // Less than Autumn start
    });
  });

  describe('Default/Fallback Values', () => {
    test('should use default 50/50 day/night split when no sun data', () => {
      const date: CalendarDate = { year: 2024, month: 1, day: 1 };
      const engine = createMockEngine(calendarWithoutSunData);
      const result = SunriseSunsetCalculator.calculate(date, calendarWithoutSunData, engine);

      // 24-hour day: sunrise at 6:00 (25%), sunset at 18:00 (75%)
      expect(result.sunrise).toBe(21600); // 6.0 × 3600
      expect(result.sunset).toBe(64800); // 18.0 × 3600
    });

    test('should use default with non-standard day length', () => {
      const date: CalendarDate = { year: 2024, month: 1, day: 1 };
      const engine = createMockEngine(nonStandardDayCalendar);
      const result = SunriseSunsetCalculator.calculate(date, nonStandardDayCalendar, engine);

      // 20-hour day: sunrise at 5:00 (25%), sunset at 15:00 (75%)
      // With 50 minutes/hour and 50 seconds/minute
      expect(result.sunrise).toBe(12500); // 5.0 × 50 × 50
      expect(result.sunset).toBe(37500); // 15.0 × 50 × 50
    });

    test('should use Gregorian defaults for matching season names', () => {
      const calendarWithNamedSeasons: SeasonsStarsCalendar = {
        ...calendarWithoutSunData,
        seasons: [
          {
            name: 'Winter',
            startMonth: 1,
            endMonth: 1,
            // No sunrise/sunset specified
          },
        ],
      };

      const date: CalendarDate = { year: 2024, month: 1, day: 1 };
      const engine = createMockEngine(calendarWithNamedSeasons);
      const result = SunriseSunsetCalculator.calculate(date, calendarWithNamedSeasons, engine);

      // Should match Gregorian Winter values
      expect(result.sunrise).toBe(25200); // 07:00 (7.0 × 3600)
      expect(result.sunset).toBe(60300); // 16:45 (16.75 × 3600)
    });
  });

  describe('Time String Conversion', () => {
    test('should convert hours to time string correctly', () => {
      expect(SunriseSunsetCalculator.hoursToTimeString(7.0)).toBe('07:00');
      expect(SunriseSunsetCalculator.hoursToTimeString(16.75)).toBe('16:45');
      expect(SunriseSunsetCalculator.hoursToTimeString(5.75)).toBe('05:45');
      expect(SunriseSunsetCalculator.hoursToTimeString(20.25)).toBe('20:15');
    });

    test('should handle fractional minutes correctly', () => {
      expect(SunriseSunsetCalculator.hoursToTimeString(6.5)).toBe('06:30');
      expect(SunriseSunsetCalculator.hoursToTimeString(12.25)).toBe('12:15');
      expect(SunriseSunsetCalculator.hoursToTimeString(18.833333)).toBe('18:50');
    });

    test('should pad single digit hours with zero', () => {
      expect(SunriseSunsetCalculator.hoursToTimeString(6.0)).toBe('06:00');
      expect(SunriseSunsetCalculator.hoursToTimeString(9.5)).toBe('09:30');
    });
  });

  describe('Edge Cases', () => {
    test('should handle calendar with no seasons', () => {
      const calendarNoSeasons: SeasonsStarsCalendar = {
        ...gregorianTestCalendar,
        seasons: [],
      };

      const date: CalendarDate = { year: 2024, month: 1, day: 1 };
      const engine = createMockEngine(calendarNoSeasons);
      const result = SunriseSunsetCalculator.calculate(date, calendarNoSeasons, engine);

      // Should fall back to default
      expect(result.sunrise).toBe(21600); // 6.0 × 3600
      expect(result.sunset).toBe(64800); // 18.0 × 3600
    });

    test('should handle single season calendar', () => {
      const singleSeasonCalendar: SeasonsStarsCalendar = {
        ...gregorianTestCalendar,
        seasons: [
          {
            name: 'AlwaysSummer',
            startMonth: 1,
            endMonth: 12,
            sunrise: '05:00',
            sunset: '21:00',
          },
        ],
      };

      const date: CalendarDate = { year: 2024, month: 6, day: 15 };
      const engine = createMockEngine(singleSeasonCalendar);
      const result = SunriseSunsetCalculator.calculate(date, singleSeasonCalendar, engine);

      // Should use the season's values without interpolation
      expect(result.sunrise).toBe(18000); // 5.0 × 3600
      expect(result.sunset).toBe(75600); // 21.0 × 3600
    });
  });
});

/**
 * Tests for converting seconds from midnight to time strings for display
 *
 * The calculator returns seconds, but widgets need to display HH:MM format
 */
describe('SunriseSunsetCalculator - secondsToTimeString', () => {
  describe('Standard 24-hour days', () => {
    it('should convert sunrise at 6:00 AM (21600 seconds) to "06:00"', () => {
      const result = SunriseSunsetCalculator.secondsToTimeString(21600);
      expect(result).toBe('06:00');
    });

    it('should convert sunset at 6:00 PM (64800 seconds) to "18:00"', () => {
      const result = SunriseSunsetCalculator.secondsToTimeString(64800);
      expect(result).toBe('18:00');
    });

    it('should convert 5:30 AM (19800 seconds) to "05:30"', () => {
      const result = SunriseSunsetCalculator.secondsToTimeString(19800);
      expect(result).toBe('05:30');
    });

    it('should convert 8:30 PM (73800 seconds) to "20:30"', () => {
      const result = SunriseSunsetCalculator.secondsToTimeString(73800);
      expect(result).toBe('20:30');
    });

    it('should convert midnight (0 seconds) to "00:00"', () => {
      const result = SunriseSunsetCalculator.secondsToTimeString(0);
      expect(result).toBe('00:00');
    });

    it('should convert 7:45 AM (27900 seconds) to "07:45"', () => {
      const result = SunriseSunsetCalculator.secondsToTimeString(27900);
      expect(result).toBe('07:45');
    });
  });

  describe('Non-standard minutesInHour', () => {
    it('should handle 90 minutes per hour correctly', () => {
      const calendar: SeasonsStarsCalendar = {
        id: 'test',
        name: 'Test',
        time: {
          hoursInDay: 24,
          minutesInHour: 90,
          secondsInMinute: 60,
        },
      } as SeasonsStarsCalendar;

      // 6:00 AM with 90-minute hours = 6 × 90 × 60 = 32400 seconds
      const result = SunriseSunsetCalculator.secondsToTimeString(32400, calendar);
      expect(result).toBe('06:00');
    });

    it('should handle 90 minutes per hour with fractional hour', () => {
      const calendar: SeasonsStarsCalendar = {
        id: 'test',
        name: 'Test',
        time: {
          hoursInDay: 24,
          minutesInHour: 90,
          secondsInMinute: 60,
        },
      } as SeasonsStarsCalendar;

      // 6:45 in 90-minute hours = 6 × 5400 + 45 × 60 = 32400 + 2700 = 35100 seconds
      const result = SunriseSunsetCalculator.secondsToTimeString(35100, calendar);
      expect(result).toBe('06:45');
    });
  });

  describe('Non-standard secondsInMinute', () => {
    it('should handle 100 seconds per minute correctly', () => {
      const calendar: SeasonsStarsCalendar = {
        id: 'test',
        name: 'Test',
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 100,
        },
      } as SeasonsStarsCalendar;

      // 6:00 AM with 100-second minutes = 6 × 60 × 100 = 36000 seconds
      const result = SunriseSunsetCalculator.secondsToTimeString(36000, calendar);
      expect(result).toBe('06:00');
    });

    it('should handle 100 seconds per minute with fractional hour', () => {
      const calendar: SeasonsStarsCalendar = {
        id: 'test',
        name: 'Test',
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 100,
        },
      } as SeasonsStarsCalendar;

      // 6:30 with 100-second minutes = 6 × 6000 + 30 × 100 = 36000 + 3000 = 39000 seconds
      const result = SunriseSunsetCalculator.secondsToTimeString(39000, calendar);
      expect(result).toBe('06:30');
    });
  });

  describe('Edge cases', () => {
    it('should pad single-digit hours with zero', () => {
      const result = SunriseSunsetCalculator.secondsToTimeString(10800); // 3:00 AM
      expect(result).toBe('03:00');
    });

    it('should pad single-digit minutes with zero', () => {
      const result = SunriseSunsetCalculator.secondsToTimeString(21780); // 6:03 AM
      expect(result).toBe('06:03');
    });

    it('should handle end of day correctly', () => {
      const result = SunriseSunsetCalculator.secondsToTimeString(86340); // 23:59
      expect(result).toBe('23:59');
    });
  });
});

/**
 * Sunrise/Sunset Time Components Test Suite
 *
 * Tests for the decimalHoursToTimeComponents helper method that converts
 * decimal hours to hour/minute components for use in setDate operations.
 *
 * This test suite ensures the extraction of duplicate minute conversion logic
 * maintains existing behavior.
 */
describe('SunriseSunsetCalculator - Time Components Conversion', () => {
  describe('decimalHoursToTimeComponents - Standard 60-minute Hours', () => {
    test('should convert whole hours correctly', () => {
      const result = SunriseSunsetCalculator.decimalHoursToTimeComponents(6.0);
      expect(result.hour).toBe(6);
      expect(result.minute).toBe(0);
    });

    test('should convert 30-minute intervals correctly', () => {
      const result = SunriseSunsetCalculator.decimalHoursToTimeComponents(6.5);
      expect(result.hour).toBe(6);
      expect(result.minute).toBe(30);
    });

    test('should convert 15-minute intervals correctly', () => {
      const result1 = SunriseSunsetCalculator.decimalHoursToTimeComponents(16.75);
      expect(result1.hour).toBe(16);
      expect(result1.minute).toBe(45);

      const result2 = SunriseSunsetCalculator.decimalHoursToTimeComponents(20.25);
      expect(result2.hour).toBe(20);
      expect(result2.minute).toBe(15);
    });

    test('should round fractional minutes correctly', () => {
      // 6.5 hours = 6:30
      const result1 = SunriseSunsetCalculator.decimalHoursToTimeComponents(6.5);
      expect(result1.hour).toBe(6);
      expect(result1.minute).toBe(30);

      // 18.833333 hours ≈ 18:50
      const result2 = SunriseSunsetCalculator.decimalHoursToTimeComponents(18.833333);
      expect(result2.hour).toBe(18);
      expect(result2.minute).toBe(50);
    });

    test('should handle sunrise times from real calendar data', () => {
      // Winter sunrise: 7:00
      const winter = SunriseSunsetCalculator.decimalHoursToTimeComponents(7.0);
      expect(winter.hour).toBe(7);
      expect(winter.minute).toBe(0);

      // Spring sunrise: 6:30
      const spring = SunriseSunsetCalculator.decimalHoursToTimeComponents(6.5);
      expect(spring.hour).toBe(6);
      expect(spring.minute).toBe(30);

      // Summer sunrise: 5:45
      const summer = SunriseSunsetCalculator.decimalHoursToTimeComponents(5.75);
      expect(summer.hour).toBe(5);
      expect(summer.minute).toBe(45);
    });

    test('should handle sunset times from real calendar data', () => {
      // Winter sunset: 16:45
      const winter = SunriseSunsetCalculator.decimalHoursToTimeComponents(16.75);
      expect(winter.hour).toBe(16);
      expect(winter.minute).toBe(45);

      // Summer sunset: 20:15
      const summer = SunriseSunsetCalculator.decimalHoursToTimeComponents(20.25);
      expect(summer.hour).toBe(20);
      expect(summer.minute).toBe(15);
    });

    test('should handle edge case where rounding produces 60 minutes', () => {
      // 6.9999 should round to 7:00, not 6:60
      const result = SunriseSunsetCalculator.decimalHoursToTimeComponents(6.9999);
      expect(result.hour).toBe(7);
      expect(result.minute).toBe(0);
    });

    test('should handle midnight (0:00)', () => {
      const result = SunriseSunsetCalculator.decimalHoursToTimeComponents(0.0);
      expect(result.hour).toBe(0);
      expect(result.minute).toBe(0);
    });

    test('should handle values close to midnight', () => {
      // 23:45
      const result = SunriseSunsetCalculator.decimalHoursToTimeComponents(23.75);
      expect(result.hour).toBe(23);
      expect(result.minute).toBe(45);
    });
  });

  describe('decimalHoursToTimeComponents - Custom Minutes Per Hour', () => {
    const calendar90Min: SeasonsStarsCalendar = {
      id: 'custom-90',
      year: { epoch: 0, currentYear: 1, startDay: 0 },
      leapYear: { rule: 'none' },
      months: [{ name: 'Month1', abbreviation: 'M1', days: 30 }],
      weekdays: [{ name: 'Day1' }],
      intercalary: [],
      time: {
        hoursInDay: 24,
        minutesInHour: 90,
        secondsInMinute: 60,
      },
    };

    const calendar100Min: SeasonsStarsCalendar = {
      id: 'custom-100',
      year: { epoch: 0, currentYear: 1, startDay: 0 },
      leapYear: { rule: 'none' },
      months: [{ name: 'Month1', abbreviation: 'M1', days: 30 }],
      weekdays: [{ name: 'Day1' }],
      intercalary: [],
      time: {
        hoursInDay: 24,
        minutesInHour: 100,
        secondsInMinute: 60,
      },
    };

    test('should handle 90 minutes per hour', () => {
      // 6.5 hours = 6 hours + 0.5 * 90 minutes = 6:45
      const result = SunriseSunsetCalculator.decimalHoursToTimeComponents(6.5, calendar90Min);
      expect(result.hour).toBe(6);
      expect(result.minute).toBe(45);
    });

    test('should handle 100 minutes per hour', () => {
      // 6.5 hours = 6 hours + 0.5 * 100 minutes = 6:50
      const result = SunriseSunsetCalculator.decimalHoursToTimeComponents(6.5, calendar100Min);
      expect(result.hour).toBe(6);
      expect(result.minute).toBe(50);
    });

    test('should round to nearest minute in custom calendar', () => {
      // 6.333 hours with 90 min/hour = 6 + (0.333 * 90) = 6:30 (rounded from 29.97)
      const result = SunriseSunsetCalculator.decimalHoursToTimeComponents(6.333, calendar90Min);
      expect(result.hour).toBe(6);
      expect(result.minute).toBe(30);
    });

    test('should handle edge case where rounding produces minutesInHour', () => {
      // Create a case where rounding would produce exactly minutesInHour
      // 6.9999 with 90 min/hour should become 7:00, not 6:90
      const result = SunriseSunsetCalculator.decimalHoursToTimeComponents(6.9999, calendar90Min);
      expect(result.hour).toBe(7);
      expect(result.minute).toBe(0);
    });
  });

  describe('decimalHoursToTimeComponents - Fallback to 60 Minutes', () => {
    const calendarNoTime: SeasonsStarsCalendar = {
      id: 'no-time',
      year: { epoch: 0, currentYear: 1, startDay: 0 },
      leapYear: { rule: 'none' },
      months: [{ name: 'Month1', abbreviation: 'M1', days: 30 }],
      weekdays: [{ name: 'Day1' }],
      intercalary: [],
      // No time property at all
    };

    test('should default to 60 minutes per hour when calendar has no time config', () => {
      const result = SunriseSunsetCalculator.decimalHoursToTimeComponents(6.5, calendarNoTime);
      expect(result.hour).toBe(6);
      expect(result.minute).toBe(30);
    });

    test('should default to 60 minutes per hour when calendar is undefined', () => {
      const result = SunriseSunsetCalculator.decimalHoursToTimeComponents(6.5);
      expect(result.hour).toBe(6);
      expect(result.minute).toBe(30);
    });
  });

  describe('Integration with Existing hoursToTimeString', () => {
    test('should produce same hour/minute as hoursToTimeString for standard calendars', () => {
      const testCases = [
        { decimal: 6.0, expected: '06:00' },
        { decimal: 6.5, expected: '06:30' },
        { decimal: 16.75, expected: '16:45' },
        { decimal: 20.25, expected: '20:15' },
        { decimal: 18.833333, expected: '18:50' },
      ];

      testCases.forEach(({ decimal, expected }) => {
        const components = SunriseSunsetCalculator.decimalHoursToTimeComponents(decimal);
        const timeString = SunriseSunsetCalculator.hoursToTimeString(decimal);

        expect(timeString).toBe(expected);
        expect(
          `${components.hour.toString().padStart(2, '0')}:${components.minute.toString().padStart(2, '0')}`
        ).toBe(expected);
      });
    });
  });

  describe('Consistency with Widget Implementation', () => {
    test('should match the existing widget calculation logic', () => {
      // This replicates the exact logic from calendar-widget.ts:480-482
      const sunriseSunset = { sunrise: 6.5, sunset: 18.75 };
      const calendar = undefined; // Using default 60 minutes

      // Old approach (what widgets currently do)
      const sunriseHoursOld = Math.floor(sunriseSunset.sunrise);
      const minutesInHour = 60;
      const sunriseMinutesOld = Math.round(
        (sunriseSunset.sunrise - sunriseHoursOld) * minutesInHour
      );

      // New approach (using helper)
      const resultNew = SunriseSunsetCalculator.decimalHoursToTimeComponents(
        sunriseSunset.sunrise,
        calendar
      );

      expect(resultNew.hour).toBe(sunriseHoursOld);
      expect(resultNew.minute).toBe(sunriseMinutesOld);
    });

    test('should match widget calculation for sunset', () => {
      const sunriseSunset = { sunrise: 6.5, sunset: 18.75 };
      const calendar = undefined;

      // Old approach
      const sunsetHoursOld = Math.floor(sunriseSunset.sunset);
      const minutesInHour = 60;
      const sunsetMinutesOld = Math.round((sunriseSunset.sunset - sunsetHoursOld) * minutesInHour);

      // New approach
      const resultNew = SunriseSunsetCalculator.decimalHoursToTimeComponents(
        sunriseSunset.sunset,
        calendar
      );

      expect(resultNew.hour).toBe(sunsetHoursOld);
      expect(resultNew.minute).toBe(sunsetMinutesOld);
    });
  });
});

/**
 * Test solar anchors functionality
 * Validates that solar anchors (solstices, equinoxes, custom dates) work
 * as keyframes for sunrise/sunset interpolation
 */
describe('SunriseSunsetCalculator - Solar Anchors', () => {
  // Calendar with only solar anchors (no seasons)
  const solarAnchorOnlyCalendar: SeasonsStarsCalendar = {
    id: 'solar-anchor-only',
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
    weekdays: [{ name: 'Day1' }],
    intercalary: [],
    solarAnchors: [
      {
        id: 'winter-solstice',
        label: 'Winter Solstice',
        type: 'solstice',
        subtype: 'winter',
        month: 12,
        day: 21,
        sunrise: '07:30',
        sunset: '16:30',
      },
      {
        id: 'vernal-equinox',
        label: 'Vernal Equinox',
        type: 'equinox',
        subtype: 'vernal',
        month: 3,
        day: 20,
        sunrise: '06:00',
        sunset: '18:00',
      },
      {
        id: 'summer-solstice',
        label: 'Summer Solstice',
        type: 'solstice',
        subtype: 'summer',
        month: 6,
        day: 21,
        sunrise: '05:30',
        sunset: '20:30',
      },
      {
        id: 'autumnal-equinox',
        label: 'Autumnal Equinox',
        type: 'equinox',
        subtype: 'autumnal',
        month: 9,
        day: 22,
        sunrise: '06:00',
        sunset: '18:00',
      },
    ],
    time: {
      hoursInDay: 24,
      minutesInHour: 60,
      secondsInMinute: 60,
    },
  };

  // Calendar with both seasons and solar anchors
  const hybridCalendar: SeasonsStarsCalendar = {
    id: 'hybrid-calendar',
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
    weekdays: [{ name: 'Day1' }],
    intercalary: [],
    seasons: [
      {
        name: 'Spring',
        startMonth: 3,
        endMonth: 5,
        sunrise: '06:30',
        sunset: '17:45',
      },
    ],
    solarAnchors: [
      {
        id: 'summer-solstice',
        label: 'Summer Solstice',
        type: 'solstice',
        subtype: 'summer',
        month: 6,
        day: 21,
        sunrise: '05:30',
        sunset: '20:30',
      },
    ],
    time: {
      hoursInDay: 24,
      minutesInHour: 60,
      secondsInMinute: 60,
    },
  };

  describe('Solar Anchors Only', () => {
    test('should use solar anchor values on exact anchor date', () => {
      // Test on the summer solstice date
      const date: CalendarDate = { year: 2024, month: 6, day: 21 };
      const engine = createMockEngine(solarAnchorOnlyCalendar);
      const result = SunriseSunsetCalculator.calculate(date, solarAnchorOnlyCalendar, engine);

      // Summer solstice: sunrise 05:30 (5.5 hours), sunset 20:30 (20.5 hours)
      expect(result.sunrise).toBe(19800); // 5.5 × 3600
      expect(result.sunset).toBe(73800); // 20.5 × 3600
    });

    test('should interpolate between adjacent solar anchors', () => {
      // April 20 is roughly halfway between vernal equinox (Mar 20) and summer solstice (Jun 21)
      // That's about 31 days into a 93-day period (roughly 1/3 through)
      const date: CalendarDate = { year: 2024, month: 4, day: 20 };
      const engine = createMockEngine(solarAnchorOnlyCalendar);
      const result = SunriseSunsetCalculator.calculate(date, solarAnchorOnlyCalendar, engine);

      // Vernal equinox: sunrise 06:00 (21600s), sunset 18:00 (64800s)
      // Summer solstice: sunrise 05:30 (19800s), sunset 20:30 (73800s)
      // Should be interpolated between these values
      expect(result.sunrise).toBeLessThan(21600); // Earlier than equinox
      expect(result.sunrise).toBeGreaterThan(19800); // Later than solstice
      expect(result.sunset).toBeGreaterThan(64800); // Later than equinox
      expect(result.sunset).toBeLessThan(73800); // Earlier than solstice
    });

    test('should handle year wrap-around interpolation', () => {
      // January 20 is between winter solstice (Dec 21) and vernal equinox (Mar 20)
      const date: CalendarDate = { year: 2024, month: 1, day: 20 };
      const engine = createMockEngine(solarAnchorOnlyCalendar);
      const result = SunriseSunsetCalculator.calculate(date, solarAnchorOnlyCalendar, engine);

      // Winter solstice: sunrise 07:30 (27000s), sunset 16:30 (59400s)
      // Vernal equinox: sunrise 06:00 (21600s), sunset 18:00 (64800s)
      // Should be interpolated between these values
      expect(result.sunrise).toBeLessThan(27000); // Earlier than winter solstice
      expect(result.sunrise).toBeGreaterThan(21600); // Later than equinox
      expect(result.sunset).toBeGreaterThan(59400); // Later than winter solstice
      expect(result.sunset).toBeLessThan(64800); // Earlier than equinox
    });
  });

  describe('Hybrid Calendars (Seasons + Solar Anchors)', () => {
    test('should combine season and solar anchor keyframes', () => {
      // Test on a date between the season start (Mar 1) and solar anchor (Jun 21)
      const date: CalendarDate = { year: 2024, month: 5, day: 1 };
      const engine = createMockEngine(hybridCalendar);
      const result = SunriseSunsetCalculator.calculate(date, hybridCalendar, engine);

      // Spring season: sunrise 06:30 (23400s), sunset 17:45 (63900s)
      // Summer solstice: sunrise 05:30 (19800s), sunset 20:30 (73800s)
      // May 1 should be interpolated between these
      expect(result.sunrise).toBeLessThan(23400); // Earlier than spring
      expect(result.sunrise).toBeGreaterThan(19800); // Later than summer solstice
      expect(result.sunset).toBeGreaterThan(63900); // Later than spring
      expect(result.sunset).toBeLessThan(73800); // Earlier than summer solstice
    });
  });

  describe('Solar Anchors Without Times', () => {
    test('should ignore anchors without sunrise/sunset', () => {
      const calendarWithEmptyAnchor: SeasonsStarsCalendar = {
        ...solarAnchorOnlyCalendar,
        solarAnchors: [
          {
            id: 'empty-anchor',
            label: 'Empty Anchor',
            type: 'other',
            month: 5,
            day: 1,
            // No sunrise or sunset defined
          },
        ],
      };

      const date: CalendarDate = { year: 2024, month: 5, day: 1 };
      const engine = createMockEngine(calendarWithEmptyAnchor);
      const result = SunriseSunsetCalculator.calculate(date, calendarWithEmptyAnchor, engine);

      // Should fall back to default 50/50 split
      expect(result.sunrise).toBe(21600); // 6.0 × 3600
      expect(result.sunset).toBe(64800); // 18.0 × 3600
    });

    test('should ignore anchors with only sunrise defined', () => {
      const calendarWithPartialAnchor: SeasonsStarsCalendar = {
        ...solarAnchorOnlyCalendar,
        solarAnchors: [
          {
            id: 'partial-anchor',
            label: 'Partial Anchor',
            type: 'other',
            month: 5,
            day: 1,
            sunrise: '06:00',
            // sunset missing
          },
        ],
      };

      const date: CalendarDate = { year: 2024, month: 5, day: 1 };
      const engine = createMockEngine(calendarWithPartialAnchor);
      const result = SunriseSunsetCalculator.calculate(date, calendarWithPartialAnchor, engine);

      // Should fall back to default 50/50 split
      expect(result.sunrise).toBe(21600); // 6.0 × 3600
      expect(result.sunset).toBe(64800); // 18.0 × 3600
    });

    test('should ignore anchors with only sunset defined', () => {
      const calendarWithPartialAnchor: SeasonsStarsCalendar = {
        ...solarAnchorOnlyCalendar,
        solarAnchors: [
          {
            id: 'partial-anchor',
            label: 'Partial Anchor',
            type: 'other',
            month: 5,
            day: 1,
            // sunrise missing
            sunset: '18:00',
          },
        ],
      };

      const date: CalendarDate = { year: 2024, month: 5, day: 1 };
      const engine = createMockEngine(calendarWithPartialAnchor);
      const result = SunriseSunsetCalculator.calculate(date, calendarWithPartialAnchor, engine);

      // Should fall back to default 50/50 split
      expect(result.sunrise).toBe(21600); // 6.0 × 3600
      expect(result.sunset).toBe(64800); // 18.0 × 3600
    });
  });

  describe('Single Solar Anchor', () => {
    test('should use single anchor value for all dates', () => {
      const singleAnchorCalendar: SeasonsStarsCalendar = {
        ...solarAnchorOnlyCalendar,
        solarAnchors: [
          {
            id: 'only-anchor',
            label: 'Only Anchor',
            type: 'other',
            month: 6,
            day: 1,
            sunrise: '06:00',
            sunset: '20:00',
          },
        ],
      };

      const date: CalendarDate = { year: 2024, month: 1, day: 15 };
      const engine = createMockEngine(singleAnchorCalendar);
      const result = SunriseSunsetCalculator.calculate(date, singleAnchorCalendar, engine);

      // With only one keyframe, interpolation returns the same value
      expect(result.sunrise).toBe(21600); // 6.0 × 3600
      expect(result.sunset).toBe(72000); // 20.0 × 3600
    });
  });
});

/**
 * Test flexible sunrise/sunset time format support
 * Validates that 1-3 digit hours and minutes work correctly
 */
describe('SunriseSunsetCalculator - Flexible Time Format', () => {
  describe('Extended hour calendars (30+ hour days)', () => {
    test('should handle 2-digit hours correctly', () => {
      const calendar: SeasonsStarsCalendar = {
        id: 'extended-day',
        year: { epoch: 2000, currentYear: 2024, startDay: 0 },
        leapYear: { rule: 'none' },
        months: [{ name: 'Month1', abbreviation: 'M1', days: 30 }],
        weekdays: [{ name: 'Day1' }],
        intercalary: [],
        seasons: [
          {
            name: 'Season1',
            startMonth: 1,
            endMonth: 1,
            sunrise: '10:00',
            sunset: '25:00', // 25th hour
          },
        ],
        time: {
          hoursInDay: 30,
          minutesInHour: 60,
          secondsInMinute: 60,
        },
      };

      const date: CalendarDate = { year: 2024, month: 1, day: 1 };
      const engine = createMockEngine(calendar);
      const result = SunriseSunsetCalculator.calculate(date, calendar, engine);

      expect(result.sunrise).toBe(36000); // 10.0 × 60 × 60
      expect(result.sunset).toBe(90000); // 25.0 × 60 × 60
    });

    test('should handle 3-digit hours correctly', () => {
      const calendar: SeasonsStarsCalendar = {
        id: 'very-long-day',
        year: { epoch: 2000, currentYear: 2024, startDay: 0 },
        leapYear: { rule: 'none' },
        months: [{ name: 'Month1', abbreviation: 'M1', days: 30 }],
        weekdays: [{ name: 'Day1' }],
        intercalary: [],
        seasons: [
          {
            name: 'Season1',
            startMonth: 1,
            endMonth: 1,
            sunrise: '50:30',
            sunset: '125:45', // 125th hour
          },
        ],
        time: {
          hoursInDay: 150,
          minutesInHour: 60,
          secondsInMinute: 60,
        },
      };

      const date: CalendarDate = { year: 2024, month: 1, day: 1 };
      const engine = createMockEngine(calendar);
      const result = SunriseSunsetCalculator.calculate(date, calendar, engine);

      expect(result.sunrise).toBe(181800); // 50.5 × 60 × 60
      expect(result.sunset).toBe(452700); // 125.75 × 60 × 60
    });
  });

  describe('Extended minute calendars', () => {
    test('should handle 3-digit minutes with custom minutesInHour', () => {
      const calendar: SeasonsStarsCalendar = {
        id: 'extended-minutes',
        year: { epoch: 2000, currentYear: 2024, startDay: 0 },
        leapYear: { rule: 'none' },
        months: [{ name: 'Month1', abbreviation: 'M1', days: 30 }],
        weekdays: [{ name: 'Day1' }],
        intercalary: [],
        seasons: [
          {
            name: 'Season1',
            startMonth: 1,
            endMonth: 1,
            sunrise: '6:100', // 100 minutes in a 200-minute hour system
            sunset: '18:150',
          },
        ],
        time: {
          hoursInDay: 24,
          minutesInHour: 200, // 200 minutes per hour
          secondsInMinute: 60,
        },
      };

      const date: CalendarDate = { year: 2024, month: 1, day: 1 };
      const engine = createMockEngine(calendar);
      const result = SunriseSunsetCalculator.calculate(date, calendar, engine);

      // 6 hours + 100/200 of an hour = 6.5 → 6.5 × 200 × 60 = 78000
      expect(result.sunrise).toBe(78000);
      // 18 hours + 150/200 of an hour = 18.75 → 18.75 × 200 × 60 = 225000
      expect(result.sunset).toBe(225000);
    });
  });

  describe('Single digit format', () => {
    test('should handle single digit hours and minutes', () => {
      const calendar: SeasonsStarsCalendar = {
        id: 'single-digit',
        year: { epoch: 2000, currentYear: 2024, startDay: 0 },
        leapYear: { rule: 'none' },
        months: [{ name: 'Month1', abbreviation: 'M1', days: 30 }],
        weekdays: [{ name: 'Day1' }],
        intercalary: [],
        seasons: [
          {
            name: 'Season1',
            startMonth: 1,
            endMonth: 1,
            sunrise: '6:0',
            sunset: '18:30',
          },
        ],
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 60,
        },
      };

      const date: CalendarDate = { year: 2024, month: 1, day: 1 };
      const engine = createMockEngine(calendar);
      const result = SunriseSunsetCalculator.calculate(date, calendar, engine);

      expect(result.sunrise).toBe(21600); // 6.0 × 60 × 60
      expect(result.sunset).toBe(66600); // 18.5 × 60 × 60
    });
  });

  describe('hoursToTimeString with extended formats', () => {
    test('should format 3-digit hours correctly', () => {
      const calendar: SeasonsStarsCalendar = {
        id: 'test',
        year: { epoch: 2000, currentYear: 2024, startDay: 0 },
        leapYear: { rule: 'none' },
        months: [],
        weekdays: [],
        intercalary: [],
        time: {
          hoursInDay: 150,
          minutesInHour: 60,
          secondsInMinute: 60,
        },
      };

      const result = SunriseSunsetCalculator.hoursToTimeString(125.75, calendar);
      expect(result).toBe('125:45');
    });

    test('should format 3-digit minutes correctly with custom minutesInHour', () => {
      const calendar: SeasonsStarsCalendar = {
        id: 'test',
        year: { epoch: 2000, currentYear: 2024, startDay: 0 },
        leapYear: { rule: 'none' },
        months: [],
        weekdays: [],
        intercalary: [],
        time: {
          hoursInDay: 24,
          minutesInHour: 200,
          secondsInMinute: 60,
        },
      };

      // 6.5 hours = 6 hours + 100 minutes (in 200-minute system)
      const result = SunriseSunsetCalculator.hoursToTimeString(6.5, calendar);
      expect(result).toBe('06:100');
    });
  });
});
