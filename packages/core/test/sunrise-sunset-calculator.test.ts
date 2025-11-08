/**
 * Sunrise/Sunset Calculator Test Suite
 *
 * Tests for the SunriseSunsetCalculator utility class that calculates sunrise
 * and sunset times based on season data with interpolation.
 */

import { describe, test, expect } from 'vitest';
import { SunriseSunsetCalculator } from '../src/core/sunrise-sunset-calculator';
import type { SeasonsStarsCalendar, CalendarDate } from '../src/types/calendar';
import type { CalendarEngineInterface } from '../src/types/foundry-extensions';

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

      expect(result.sunrise).toBe(7.0); // 07:00
      expect(result.sunset).toBe(16.75); // 16:45
    });

    test('should calculate sunrise/sunset for summer', () => {
      const date: CalendarDate = { year: 2024, month: 6, day: 1 };
      const engine = createMockEngine(gregorianTestCalendar);
      const result = SunriseSunsetCalculator.calculate(date, gregorianTestCalendar, engine);

      expect(result.sunrise).toBe(5.75); // 05:45
      expect(result.sunset).toBe(20.25); // 20:15
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

      // Values should be between Spring and Summer
      expect(result.sunrise).toBeLessThan(6.5); // Less than Spring start
      expect(result.sunrise).toBeGreaterThan(5.75); // Greater than Summer start
      expect(result.sunset).toBeGreaterThan(17.75); // Greater than Spring start
      expect(result.sunset).toBeLessThan(20.25); // Less than Summer start
    });

    test('should approach next season at end of current season', () => {
      // August 31 - last day of Summer
      const date: CalendarDate = { year: 2024, month: 8, day: 31 };
      const engine = createMockEngine(gregorianTestCalendar);
      const result = SunriseSunsetCalculator.calculate(date, gregorianTestCalendar, engine);

      // Should be close to Autumn values
      // Autumn: sunrise 06:30, sunset 19:30
      // Allow for some difference as it's not exactly at Autumn yet
      expect(Math.abs(result.sunrise - 6.5)).toBeLessThan(0.5);
      expect(Math.abs(result.sunset - 19.5)).toBeLessThan(0.5);
    });
  });

  describe('Year-Crossing Seasons', () => {
    test('should handle year-crossing season (Winter)', () => {
      // January 15 - middle of Winter (Dec-Feb)
      const date: CalendarDate = { year: 2024, month: 1, day: 15 };
      const engine = createMockEngine(gregorianTestCalendar);
      const result = SunriseSunsetCalculator.calculate(date, gregorianTestCalendar, engine);

      // Winter starts: sunrise 07:00, sunset 16:45
      // Spring starts: sunrise 06:30, sunset 17:45
      expect(result.sunrise).toBeGreaterThan(6.3);
      expect(result.sunrise).toBeLessThan(7.0);
      expect(result.sunset).toBeGreaterThan(16.75);
      expect(result.sunset).toBeLessThan(17.75);
    });
  });

  describe('Default/Fallback Values', () => {
    test('should use default 50/50 day/night split when no sun data', () => {
      const date: CalendarDate = { year: 2024, month: 1, day: 1 };
      const engine = createMockEngine(calendarWithoutSunData);
      const result = SunriseSunsetCalculator.calculate(date, calendarWithoutSunData, engine);

      // 24-hour day: sunrise at 6:00 (25%), sunset at 18:00 (75%)
      expect(result.sunrise).toBe(6.0);
      expect(result.sunset).toBe(18.0);
    });

    test('should use default with non-standard day length', () => {
      const date: CalendarDate = { year: 2024, month: 1, day: 1 };
      const engine = createMockEngine(nonStandardDayCalendar);
      const result = SunriseSunsetCalculator.calculate(date, nonStandardDayCalendar, engine);

      // 20-hour day: sunrise at 5:00 (25%), sunset at 15:00 (75%)
      expect(result.sunrise).toBe(5.0);
      expect(result.sunset).toBe(15.0);
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
      expect(result.sunrise).toBe(7.0); // 07:00
      expect(result.sunset).toBe(16.75); // 16:45
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
      expect(result.sunrise).toBe(6.0);
      expect(result.sunset).toBe(18.0);
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
      expect(result.sunrise).toBe(5.0);
      expect(result.sunset).toBe(21.0);
    });
  });
});
