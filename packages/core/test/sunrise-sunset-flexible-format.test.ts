/**
 * Test flexible sunrise/sunset time format support
 * Validates that 1-3 digit hours and minutes work correctly
 */

import { describe, test, expect } from 'vitest';
import { SunriseSunsetCalculator } from '../src/core/sunrise-sunset-calculator';
import type { SeasonsStarsCalendar, CalendarDate } from '../src/types/calendar';
import type { CalendarEngineInterface } from '../src/types/foundry-extensions';

// Mock engine for a calendar with extended time system
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

      expect(result.sunrise).toBe(10.0);
      expect(result.sunset).toBe(25.0);
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

      expect(result.sunrise).toBe(50.5);
      expect(result.sunset).toBe(125.75);
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

      // 6 hours + 100/200 of an hour = 6.5
      expect(result.sunrise).toBe(6.5);
      // 18 hours + 150/200 of an hour = 18.75
      expect(result.sunset).toBe(18.75);
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

      expect(result.sunrise).toBe(6.0);
      expect(result.sunset).toBe(18.5);
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
