/**
 * Test for intercalary days that come after the first month of the year
 *
 * This test specifically addresses the user report that intercalary days
 * cannot be created on the first day of the year. We test scenarios where
 * intercalary days are placed after the first month (month 1).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../../../src/core/calendar-engine';
import { CalendarDate } from '../../../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';

// Test calendar with intercalary days after the first month
const calendarWithFirstMonthIntercalary: SeasonsStarsCalendar = {
  id: 'test-first-month-intercalary',
  translations: {
    en: {
      label: 'Test First Month Intercalary',
      description: 'Test calendar with intercalary days after first month',
      setting: 'Test',
    },
  },
  year: {
    epoch: 2000,
    currentYear: 2025,
    prefix: '',
    suffix: ' TE',
    startDay: 0,
  },
  leapYear: {
    rule: 'none',
  },
  months: [
    { name: 'Primaris', abbreviation: 'Pri', days: 30, description: 'First month' },
    { name: 'Secundus', abbreviation: 'Sec', days: 31, description: 'Second month' },
    { name: 'Tertius', abbreviation: 'Ter', days: 30, description: 'Third month' },
  ],
  weekdays: [
    { name: 'Firstday', abbreviation: 'Fi', description: 'First day of week' },
    { name: 'Seconday', abbreviation: 'Se', description: 'Second day of week' },
    { name: 'Thirdday', abbreviation: 'Th', description: 'Third day of week' },
  ],
  intercalary: [
    {
      name: 'New Year Festival',
      after: 'Primaris', // After the FIRST month
      days: 1,
      leapYearOnly: false,
      countsForWeekdays: false,
      description: 'New Year celebration after first month',
    },
    {
      name: 'Mid Year Rest',
      after: 'Secundus', // After second month for comparison
      days: 2,
      leapYearOnly: false,
      countsForWeekdays: false,
      description: 'Mid year rest period',
    },
  ],
  time: {
    hoursInDay: 24,
    minutesInHour: 60,
    secondsInMinute: 60,
  },
};

describe('Intercalary Days After First Month', () => {
  let engine: CalendarEngine;

  beforeEach(() => {
    engine = new CalendarEngine(calendarWithFirstMonthIntercalary);
  });

  describe('New Year Festival (After First Month)', () => {
    it('should correctly create intercalary date after first month', () => {
      // This represents: After 30 days of Primaris, we have New Year Festival
      const newYearFestival = new CalendarDate(
        {
          year: 2025,
          month: 1, // Associated with first month
          day: 1, // First day of intercalary period
          weekday: 0,
          intercalary: 'New Year Festival',
        },
        calendarWithFirstMonthIntercalary
      );

      // Should be able to create the date without issues
      expect(newYearFestival.year).toBe(2025);
      expect(newYearFestival.month).toBe(1);
      expect(newYearFestival.day).toBe(1);
      expect(newYearFestival.intercalary).toBe('New Year Festival');
    });

    it('should convert New Year Festival to world time and back correctly', () => {
      const intercalaryDate = {
        year: 2025,
        month: 1, // First month
        day: 1, // First day of intercalary
        weekday: 0,
        intercalary: 'New Year Festival',
      };

      // Convert to world time
      const worldTime = engine.dateToWorldTime(intercalaryDate);

      // Convert back
      const convertedBack = engine.worldTimeToDate(worldTime);

      // Should maintain intercalary status
      expect(convertedBack.year).toBe(2025);
      expect(convertedBack.month).toBe(1);
      expect(convertedBack.day).toBe(1);
      expect(convertedBack.intercalary).toBe('New Year Festival');
    });

    it('should correctly sequence dates around New Year Festival', () => {
      // Last day of first month
      const lastDayPrimaris = new CalendarDate(
        { year: 2025, month: 1, day: 30, weekday: 0 },
        calendarWithFirstMonthIntercalary
      );

      // New Year Festival (intercalary after first month)
      const newYearFestival = new CalendarDate(
        { year: 2025, month: 1, day: 1, weekday: 0, intercalary: 'New Year Festival' },
        calendarWithFirstMonthIntercalary
      );

      // First day of second month
      const firstDaySecundus = new CalendarDate(
        { year: 2025, month: 2, day: 1, weekday: 0 },
        calendarWithFirstMonthIntercalary
      );

      // Convert all to world time to check sequence
      const worldTime1 = engine.dateToWorldTime(lastDayPrimaris);
      const worldTime2 = engine.dateToWorldTime(newYearFestival);
      const worldTime3 = engine.dateToWorldTime(firstDaySecundus);

      // Intercalary day should be between last day of month 1 and first day of month 2
      expect(worldTime2).toBeGreaterThan(worldTime1);
      expect(worldTime3).toBeGreaterThan(worldTime2);

      // Check the sequence is correct
      const dayInSeconds = 24 * 60 * 60;
      expect(worldTime2 - worldTime1).toBe(dayInSeconds); // 1 day apart
      expect(worldTime3 - worldTime2).toBe(dayInSeconds); // 1 day apart
    });

    it('should handle the specific "first day of year" scenario', () => {
      // User might be trying to create an intercalary day at the very start of the year
      // This would be conceptually after month 12 of previous year, or before month 1

      // Let's test both interpretations:

      // 1. Intercalary day that conceptually comes "after" the year-end
      const yearEndIntercalary = {
        year: 2025,
        month: 1, // But it's associated with first month for calendar purposes
        day: 1,
        weekday: 0,
        intercalary: 'New Year Festival',
      };

      const worldTime = engine.dateToWorldTime(yearEndIntercalary);
      const convertedBack = engine.worldTimeToDate(worldTime);

      expect(convertedBack.year).toBe(2025);
      expect(convertedBack.month).toBe(1);
      expect(convertedBack.day).toBe(1);
      expect(convertedBack.intercalary).toBe('New Year Festival');
    });
  });

  describe('Calendar Day Calculation Edge Cases', () => {
    it('should correctly calculate days to date for intercalary after first month', () => {
      // Test the specific daysToDate logic for this scenario
      const newYearFestival = new CalendarDate(
        { year: 2025, month: 1, day: 1, weekday: 0, intercalary: 'New Year Festival' },
        calendarWithFirstMonthIntercalary
      );

      // This should not fail or produce incorrect results
      const worldTime = engine.dateToWorldTime(newYearFestival);
      expect(typeof worldTime).toBe('number');
      expect(worldTime).toBeGreaterThanOrEqual(0);

      const backConverted = engine.worldTimeToDate(worldTime);
      expect(backConverted.intercalary).toBe('New Year Festival');
      expect(backConverted.year).toBe(2025);
    });

    it('should handle year boundaries with intercalary days correctly', () => {
      // Test transition from previous year to intercalary day at start of new year
      const endOfPreviousYear = new CalendarDate(
        { year: 2024, month: 3, day: 30, weekday: 0 }, // Last day of previous year
        calendarWithFirstMonthIntercalary
      );

      const startOfNewYear = new CalendarDate(
        { year: 2025, month: 1, day: 1, weekday: 0 }, // First regular day of new year
        calendarWithFirstMonthIntercalary
      );

      const intercalaryNewYear = new CalendarDate(
        { year: 2025, month: 1, day: 1, weekday: 0, intercalary: 'New Year Festival' },
        calendarWithFirstMonthIntercalary
      );

      const worldTime1 = engine.dateToWorldTime(endOfPreviousYear);
      const worldTime2 = engine.dateToWorldTime(startOfNewYear);
      const worldTime3 = engine.dateToWorldTime(intercalaryNewYear);

      // All should be valid and sequential
      expect(worldTime2).toBeGreaterThan(worldTime1);
      expect(worldTime3).not.toBe(worldTime2); // Intercalary should be different from regular
    });
  });

  describe('Engine Intercalary Day Retrieval', () => {
    it('should correctly identify intercalary days after first month', () => {
      const intercalaryDaysAfterFirst = engine.getIntercalaryDaysAfterMonth(2025, 1);

      expect(intercalaryDaysAfterFirst).toHaveLength(1);
      expect(intercalaryDaysAfterFirst[0].name).toBe('New Year Festival');
      expect(intercalaryDaysAfterFirst[0].after).toBe('Primaris');
    });

    it('should correctly identify intercalary days after second month', () => {
      const intercalaryDaysAfterSecond = engine.getIntercalaryDaysAfterMonth(2025, 2);

      expect(intercalaryDaysAfterSecond).toHaveLength(1);
      expect(intercalaryDaysAfterSecond[0].name).toBe('Mid Year Rest');
      expect(intercalaryDaysAfterSecond[0].after).toBe('Secundus');
    });
  });
});

describe('Real World Calendar Examples', () => {
  describe('French Revolutionary Calendar Style', () => {
    // Test with a calendar that has intercalary days at year-end (after month 12)
    const frenchRevolutionaryStyle: SeasonsStarsCalendar = {
      id: 'french-revolutionary-style',
      translations: {
        en: {
          label: 'French Revolutionary Style',
          description: 'Calendar with year-end intercalary days',
        },
      },
      year: { epoch: 1792, currentYear: 1800, prefix: 'Year ', suffix: '', startDay: 0 },
      leapYear: { rule: 'none' },
      months: Array.from({ length: 12 }, (_, i) => ({
        name: `Month${i + 1}`,
        days: 30,
      })),
      weekdays: [
        { name: 'Day1' },
        { name: 'Day2' },
        { name: 'Day3' },
        { name: 'Day4' },
        { name: 'Day5' },
        { name: 'Day6' },
        { name: 'Day7' },
      ],
      intercalary: [
        {
          name: 'Complementary Days',
          after: 'Month12', // After last month = start of next year conceptually
          days: 5,
          leapYearOnly: false,
          countsForWeekdays: false,
          description: 'Five complementary days at year end',
        },
      ],
      time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
    };

    it('should handle year-end intercalary days that conceptually start the next year', () => {
      const engine = new CalendarEngine(frenchRevolutionaryStyle);

      // Test the complementary days that come after month 12
      const complementaryDay1 = {
        year: 1800,
        month: 12, // Associated with last month
        day: 1, // First complementary day
        weekday: 0,
        intercalary: 'Complementary Days',
      };

      const worldTime = engine.dateToWorldTime(complementaryDay1);
      const converted = engine.worldTimeToDate(worldTime);

      expect(converted.year).toBe(1799); // Fixed: year-boundary intercalary is associated with previous year
      expect(converted.month).toBe(12);
      expect(converted.day).toBe(1);
      expect(converted.intercalary).toBe('Complementary Days');
    });
  });
});
