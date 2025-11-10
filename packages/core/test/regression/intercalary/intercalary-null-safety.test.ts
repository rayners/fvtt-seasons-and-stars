/**
 * Intercalary Days Null Safety Test Suite
 *
 * Tests the null safety fixes for intercalary day handling when month indices
 * might be out of bounds or when month names are undefined.
 */

import { describe, test, expect } from 'vitest';
import { CalendarEngine } from '../../../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';

describe('Intercalary Days Null Safety', () => {
  test('getIntercalaryDaysAfterMonth handles invalid month index gracefully', () => {
    // Create a minimal calendar with intercalary days
    const testCalendar: SeasonsStarsCalendar = {
      id: 'test-null-safety',
      translations: {
        en: {
          label: 'Test Calendar',
          description: 'Test calendar for null safety',
          setting: 'Test',
        },
      },
      year: {
        epoch: 0,
        currentYear: 2024,
        prefix: '',
        suffix: '',
        startDay: 0,
      },
      leapYear: {
        rule: 'none',
      },
      months: [
        { name: 'Month1', abbreviation: 'M1', days: 30 },
        { name: 'Month2', abbreviation: 'M2', days: 30 },
      ],
      weekdays: [
        { name: 'Day1', abbreviation: 'D1' },
        { name: 'Day2', abbreviation: 'D2' },
      ],
      intercalary: [
        {
          name: 'TestIntercalary',
          after: 'Month1',
          leapYearOnly: false,
          countsForWeekdays: true,
          description: 'Test intercalary day',
        },
      ],
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      },
    };

    const engine = new CalendarEngine(testCalendar);
    // Test valid month index (month 1 = index 0)
    const validResult = engine.getIntercalaryDaysAfterMonth(2024, 1);
    expect(validResult).toHaveLength(1);
    expect(validResult[0].name).toBe('TestIntercalary');
    // Test invalid month index (month 10 would be index 9, but we only have 2 months)
    const invalidResult = engine.getIntercalaryDaysAfterMonth(2024, 10);
    expect(invalidResult).toHaveLength(0); // Should return empty array, not crash
    // Test month index 0 (edge case - would try to access index -1)
    const zeroResult = engine.getIntercalaryDaysAfterMonth(2024, 0);
    expect(zeroResult).toHaveLength(0); // Should return empty array, not crash
  });

  test('dateToWorldTime handles out-of-bounds month gracefully in intercalary calculation', () => {
    // Create a minimal calendar
    const testCalendar: SeasonsStarsCalendar = {
      id: 'test-worldtime-safety',
      translations: {
        en: {
          label: 'Test Calendar',
          description: 'Test calendar for worldTime safety',
          setting: 'Test',
        },
      },
      year: {
        epoch: 0,
        currentYear: 2024,
        prefix: '',
        suffix: '',
        startDay: 0,
      },
      leapYear: {
        rule: 'none',
      },
      months: [{ name: 'Month1', abbreviation: 'M1', days: 30 }],
      weekdays: [{ name: 'Day1', abbreviation: 'D1' }],
      intercalary: [
        {
          name: 'TestIntercalary',
          after: 'NonexistentMonth', // This month doesn't exist
          leapYearOnly: false,
          countsForWeekdays: true,
          description: 'Test intercalary day',
        },
      ],
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      },
    };

    const engine = new CalendarEngine(testCalendar);

    // This should not crash even though the intercalary day references a nonexistent month
    const testDate = { year: 2024, month: 1, day: 15 };

    let worldTime: number;
    expect(() => {
      worldTime = engine.dateToWorldTime(testDate);
    }).not.toThrow();

    // Should produce a valid worldTime value
    expect(worldTime!).toBeGreaterThanOrEqual(0);
  });

  test('addDays handles intercalary calculation with invalid month references', () => {
    // Create calendar with problematic intercalary configuration
    const testCalendar: SeasonsStarsCalendar = {
      id: 'test-adddays-safety',
      translations: {
        en: {
          label: 'Test Calendar',
          description: 'Test calendar for addDays safety',
          setting: 'Test',
        },
      },
      year: {
        epoch: 0,
        currentYear: 2024,
        prefix: '',
        suffix: '',
        startDay: 0,
      },
      leapYear: {
        rule: 'none',
      },
      months: [
        { name: 'Month1', abbreviation: 'M1', days: 30 },
        { name: 'Month2', abbreviation: 'M2', days: 30 },
      ],
      weekdays: [
        { name: 'Day1', abbreviation: 'D1' },
        { name: 'Day2', abbreviation: 'D2' },
      ],
      intercalary: [
        {
          name: 'GoodIntercalary',
          after: 'Month1', // Valid reference
          leapYearOnly: false,
          countsForWeekdays: true,
          description: 'Valid intercalary day',
        },
        {
          name: 'BadIntercalary',
          after: 'NonexistentMonth', // Invalid reference
          leapYearOnly: false,
          countsForWeekdays: true,
          description: 'Invalid intercalary day',
        },
      ],
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      },
    };

    const engine = new CalendarEngine(testCalendar);

    const startDate = { year: 2024, month: 1, day: 15 };

    let resultDate: any;
    expect(() => {
      resultDate = engine.addDays(startDate, 20); // Cross into month 2
    }).not.toThrow();

    // Should produce a valid result date
    expect(resultDate.year).toBe(2024);
    expect(resultDate.month).toBeGreaterThanOrEqual(1);
    expect(resultDate.day).toBeGreaterThanOrEqual(1);
  });

  test('calculateWeekday handles intercalary calculation with invalid month references', () => {
    // Create calendar with problematic intercalary configuration
    const testCalendar: SeasonsStarsCalendar = {
      id: 'test-weekday-safety',
      translations: {
        en: {
          label: 'Test Calendar',
          description: 'Test calendar for weekday safety',
          setting: 'Test',
        },
      },
      year: {
        epoch: 0,
        currentYear: 2024,
        prefix: '',
        suffix: '',
        startDay: 0,
      },
      leapYear: {
        rule: 'none',
      },
      months: [{ name: 'Month1', abbreviation: 'M1', days: 30 }],
      weekdays: [
        { name: 'Day1', abbreviation: 'D1' },
        { name: 'Day2', abbreviation: 'D2' },
      ],
      intercalary: [
        {
          name: 'BadIntercalary',
          after: 'NonexistentMonth', // Invalid reference
          leapYearOnly: false,
          countsForWeekdays: true,
          description: 'Invalid intercalary day',
        },
      ],
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      },
    };

    const engine = new CalendarEngine(testCalendar);

    // This should not crash even with invalid intercalary references
    let weekday: number;
    expect(() => {
      weekday = engine.calculateWeekday(2024, 1, 15);
    }).not.toThrow();

    // Should produce a valid weekday
    expect(weekday!).toBeGreaterThanOrEqual(0);
    expect(weekday!).toBeLessThan(2); // We have 2 weekdays
  });
});
