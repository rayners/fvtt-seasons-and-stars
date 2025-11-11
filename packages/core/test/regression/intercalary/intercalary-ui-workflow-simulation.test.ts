/**
 * Simulate the UI workflow for creating intercalary days
 *
 * This test simulates what happens when a user interacts with the calendar
 * grid widget to create or navigate to an intercalary day, particularly
 * focusing on the "first day of year" scenario.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../../../src/core/calendar-engine';
import { CalendarDate } from '../../../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';

// Simulate a realistic fantasy calendar that might have intercalary days
// similar to what a user might create
const userLikeCalendar: SeasonsStarsCalendar = {
  id: 'user-fantasy-calendar',
  translations: {
    en: {
      label: 'User Fantasy Calendar',
      description: 'A typical fantasy calendar with intercalary days',
    },
  },
  year: {
    epoch: 0,
    currentYear: 1024,
    prefix: '',
    suffix: ' AR', // After Reckoning
    startDay: 0,
  },
  leapYear: {
    rule: 'none', // Simple, no leap years
  },
  months: [
    { name: 'Snowmelt', days: 30 },
    { name: 'Greening', days: 31 },
    { name: 'Growing', days: 30 },
    { name: 'Ripening', days: 31 },
    { name: 'Harvest', days: 30 },
    { name: 'Falling', days: 31 },
    { name: 'Frost', days: 30 },
    { name: 'Deepwinter', days: 31 },
  ],
  weekdays: [
    { name: 'Moonday' },
    { name: 'Tirsday' },
    { name: 'Wodensday' },
    { name: 'Thorsday' },
    { name: 'Freyday' },
    { name: 'Satursday' },
    { name: 'Sunnyday' },
  ],
  intercalary: [
    {
      name: 'Midwinter Night',
      after: 'Deepwinter', // After last month = "start of new year"
      days: 1,
      leapYearOnly: false,
      countsForWeekdays: false,
      description: 'The long night between years',
    },
    {
      name: 'Spring Awakening',
      after: 'Snowmelt', // After first month
      days: 1,
      leapYearOnly: false,
      countsForWeekdays: false,
      description: 'Day of spring celebration',
    },
  ],
  time: {
    hoursInDay: 24,
    minutesInHour: 60,
    secondsInMinute: 60,
  },
};

describe('UI Workflow Simulation - Intercalary Day Creation', () => {
  let engine: CalendarEngine;

  beforeEach(() => {
    engine = new CalendarEngine(userLikeCalendar);
  });

  describe('User Scenario: "First Day of Year" Intercalary Day', () => {
    it('should handle user attempting to create "New Year" intercalary day', () => {
      // User scenario: User wants to create an intercalary day at the "start of the year"
      // In their mind, this is the "first day of the year"
      // But technically it comes after the last month of the previous year

      // This is what the user conceptually wants: "First day of year 1025"
      const userIntendedDate = {
        year: 1025, // New year
        month: 8, // But it's associated with Deepwinter (last month)
        day: 1, // First day of the intercalary period
        weekday: 0,
        intercalary: 'Midwinter Night',
      };

      // This should work correctly
      const worldTime = engine.dateToWorldTime(userIntendedDate);
      const converted = engine.worldTimeToDate(worldTime);

      expect(converted.year).toBe(1024); // Fixed: year-boundary intercalary is associated with previous year
      expect(converted.month).toBe(8); // Associated with Deepwinter
      expect(converted.day).toBe(1);
      expect(converted.intercalary).toBe('Midwinter Night');
    });

    it('should properly sequence year-boundary intercalary days', () => {
      // Sequence should be:
      // 1. Last day of Deepwinter 1024
      // 2. Midwinter Night 1025 (intercalary - conceptually "first day" of new year)
      // 3. First day of Snowmelt 1025

      const lastDayDeepwinter = new CalendarDate(
        { year: 1024, month: 8, day: 31, weekday: 0 },
        userLikeCalendar
      );

      const midwinterNight = new CalendarDate(
        { year: 1025, month: 8, day: 1, weekday: 0, intercalary: 'Midwinter Night' },
        userLikeCalendar
      );

      const firstDaySnowmelt = new CalendarDate(
        { year: 1025, month: 1, day: 1, weekday: 0 },
        userLikeCalendar
      );

      const worldTime1 = engine.dateToWorldTime(lastDayDeepwinter);
      const worldTime2 = engine.dateToWorldTime(midwinterNight);
      const worldTime3 = engine.dateToWorldTime(firstDaySnowmelt);

      // Should be properly sequenced
      expect(worldTime2).toBeGreaterThan(worldTime1);
      expect(worldTime3).toBeGreaterThan(worldTime2);

      // Time differences should be exactly 1 day each
      const dayInSeconds = 24 * 60 * 60;
      expect(worldTime2 - worldTime1).toBe(dayInSeconds);
      expect(worldTime3 - worldTime2).toBe(dayInSeconds);
    });
  });

  describe('User Scenario: Calendar Navigation to Intercalary Days', () => {
    it('should allow navigation to intercalary days in any month', () => {
      // User navigating to view month with intercalary days

      const year = 1024;

      // Get intercalary days for first month (Snowmelt)
      const intercalaryAfterSnowmelt = engine.getIntercalaryDaysAfterMonth(year, 1);
      expect(intercalaryAfterSnowmelt).toHaveLength(1);
      expect(intercalaryAfterSnowmelt[0].name).toBe('Spring Awakening');

      // Get intercalary days for last month (Deepwinter)
      const intercalaryAfterDeepwinter = engine.getIntercalaryDaysAfterMonth(year, 8);
      expect(intercalaryAfterDeepwinter).toHaveLength(1);
      expect(intercalaryAfterDeepwinter[0].name).toBe('Midwinter Night');
    });

    it('should correctly render calendar days including intercalary days', () => {
      // Simulate what the CalendarGridWidget does when rendering a month
      const year = 1024;
      const month = 1; // Snowmelt (first month)

      // Get regular month length
      const monthLength = engine.getMonthLength(month, year);
      expect(monthLength).toBe(30); // Snowmelt has 30 days

      // Get intercalary days after this month
      const intercalaryDays = engine.getIntercalaryDaysAfterMonth(year, month);
      expect(intercalaryDays).toHaveLength(1);

      // The widget should be able to create calendar date objects for the intercalary day
      const intercalaryDate = {
        year: year,
        month: month, // Associated with Snowmelt
        day: 1, // First day of Spring Awakening
        weekday: 0,
        intercalary: intercalaryDays[0].name,
      };

      const calendarDate = new CalendarDate(intercalaryDate, userLikeCalendar);
      expect(calendarDate.intercalary).toBe('Spring Awakening');
    });
  });

  describe('Edge Case Analysis: Potential User Confusion Points', () => {
    it('should distinguish between regular day 1 and intercalary day 1', () => {
      // This might be where user confusion arises:
      // Regular day 1 vs intercalary day 1 in the same month context

      const regularDay1 = new CalendarDate(
        { year: 1024, month: 1, day: 1, weekday: 0 }, // Regular first day of Snowmelt
        userLikeCalendar
      );

      const intercalaryDay1 = new CalendarDate(
        { year: 1024, month: 1, day: 1, weekday: 0, intercalary: 'Spring Awakening' },
        userLikeCalendar
      );

      // These should have different world times
      const worldTime1 = engine.dateToWorldTime(regularDay1);
      const worldTime2 = engine.dateToWorldTime(intercalaryDay1);

      expect(worldTime1).not.toBe(worldTime2);

      // The intercalary day should come AFTER the regular month
      // So intercalary "day 1" comes after regular "day 30" of the same month
      expect(worldTime2).toBeGreaterThan(worldTime1);
    });

    it('should handle year rollover scenarios correctly', () => {
      // Test the year boundary scenario that might cause user confusion

      // Year 1024, month 8 (Deepwinter), day 31 (last day of year)
      const lastDayOfYear = new CalendarDate(
        { year: 1024, month: 8, day: 31, weekday: 0 },
        userLikeCalendar
      );

      // Year 1025, month 8, day 1, intercalary "Midwinter Night"
      // This is conceptually the "first day of year 1025" from user perspective
      const firstDayOfNewYear = new CalendarDate(
        { year: 1025, month: 8, day: 1, weekday: 0, intercalary: 'Midwinter Night' },
        userLikeCalendar
      );

      // Year 1025, month 1 (Snowmelt), day 1 (first regular day of new year)
      const firstRegularDayOfNewYear = new CalendarDate(
        { year: 1025, month: 1, day: 1, weekday: 0 },
        userLikeCalendar
      );

      const wt1 = engine.dateToWorldTime(lastDayOfYear);
      const wt2 = engine.dateToWorldTime(firstDayOfNewYear);
      const wt3 = engine.dateToWorldTime(firstRegularDayOfNewYear);

      // Proper sequence: last day 1024 -> Midwinter Night -> first day 1025
      expect(wt2).toBeGreaterThan(wt1);
      expect(wt3).toBeGreaterThan(wt2);

      // All should round-trip correctly
      expect(engine.worldTimeToDate(wt1).year).toBe(1024);
      expect(engine.worldTimeToDate(wt2).intercalary).toBe('Midwinter Night');
      expect(engine.worldTimeToDate(wt3).year).toBe(1025);
      expect(engine.worldTimeToDate(wt3).month).toBe(1);
    });
  });

  describe('Calendar Validation: User Calendar Configuration Issues', () => {
    it('should identify potential user calendar configuration problems', () => {
      // Test common user mistakes in calendar configuration

      const problematicCalendar: SeasonsStarsCalendar = {
        ...userLikeCalendar,
        intercalary: [
          {
            name: 'Invalid Day',
            after: 'NonExistentMonth', // User typo in month name
            days: 1,
            leapYearOnly: false,
            countsForWeekdays: false,
            description: 'This will not work',
          },
          {
            name: 'Valid Day',
            after: 'Snowmelt', // This should work
            days: 1,
            leapYearOnly: false,
            countsForWeekdays: false,
            description: 'This should work fine',
          },
        ],
      };

      const problematicEngine = new CalendarEngine(problematicCalendar);

      // The intercalary day with invalid "after" month shouldn't be found
      const intercalaryAfterSnowmelt = problematicEngine.getIntercalaryDaysAfterMonth(1024, 1);
      expect(intercalaryAfterSnowmelt).toHaveLength(1);
      expect(intercalaryAfterSnowmelt[0].name).toBe('Valid Day');

      // The invalid one shouldn't be found for any month
      for (let month = 1; month <= 8; month++) {
        const intercalaryDays = problematicEngine.getIntercalaryDaysAfterMonth(1024, month);
        const hasInvalidDay = intercalaryDays.some(day => day.name === 'Invalid Day');
        expect(hasInvalidDay).toBe(false);
      }
    });
  });
});

describe('Real User Report Simulation', () => {
  let engine: CalendarEngine;

  beforeEach(() => {
    engine = new CalendarEngine(userLikeCalendar);
  });

  describe('Exact User Scenario: "Unable to create intercalary day on first day of year"', () => {
    it('should successfully create what user considers "first day of year" intercalary', () => {
      // Based on user report, they want to create an intercalary day on the "first day of the year"
      // This could mean several things:

      // Interpretation 1: Intercalary day that comes conceptually at the start of the year
      // (after the last month of previous year)
      const startOfYearIntercalary = {
        year: 1025,
        month: 8, // Associated with Deepwinter (last month)
        day: 1,
        weekday: 0,
        intercalary: 'Midwinter Night',
      };

      const worldTime1 = engine.dateToWorldTime(startOfYearIntercalary);
      const converted1 = engine.worldTimeToDate(worldTime1);

      expect(converted1.intercalary).toBe('Midwinter Night');
      expect(converted1.year).toBe(1024); // Fixed: year-boundary intercalary is associated with previous year

      // Interpretation 2: Intercalary day after the first month of the year
      const afterFirstMonthIntercalary = {
        year: 1025,
        month: 1, // Associated with Snowmelt (first month)
        day: 1,
        weekday: 0,
        intercalary: 'Spring Awakening',
      };

      const worldTime2 = engine.dateToWorldTime(afterFirstMonthIntercalary);
      const converted2 = engine.worldTimeToDate(worldTime2);

      expect(converted2.intercalary).toBe('Spring Awakening');
      expect(converted2.year).toBe(1025);

      // Both interpretations should work correctly
    });

    it('should identify if the issue is with specific calendar configurations', () => {
      // Test if certain calendar configurations might cause the reported issue

      // Test with minimal calendar (might reveal edge cases)
      const minimalCalendar: SeasonsStarsCalendar = {
        id: 'minimal',
        translations: { en: { label: 'Minimal' } },
        year: { epoch: 1, currentYear: 2, prefix: '', suffix: '', startDay: 0 },
        leapYear: { rule: 'none' },
        months: [
          { name: 'OnlyMonth', days: 1 }, // Only 1 day in the only month
        ],
        weekdays: [{ name: 'OnlyDay' }],
        intercalary: [
          {
            name: 'YearEnd',
            after: 'OnlyMonth',
            days: 1,
            leapYearOnly: false,
            countsForWeekdays: false,
            description: 'End of minimal year',
          },
        ],
        time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
      };

      const minimalEngine = new CalendarEngine(minimalCalendar);

      // Try to create intercalary day in this extreme case
      const extremeCase = {
        year: 2,
        month: 1,
        day: 1,
        weekday: 0,
        intercalary: 'YearEnd',
      };

      const worldTime = minimalEngine.dateToWorldTime(extremeCase);
      const converted = minimalEngine.worldTimeToDate(worldTime);

      // Should still work even in extreme case
      expect(converted.intercalary).toBe('YearEnd');
      expect(converted.year).toBe(1); // Fixed: year-boundary intercalary is associated with previous year
    });
  });
});
