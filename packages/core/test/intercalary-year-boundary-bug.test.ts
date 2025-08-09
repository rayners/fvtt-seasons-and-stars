/**
 * Focused test to investigate the year boundary bug with intercalary days
 *
 * This test isolates the specific issue where intercalary days that come
 * after the last month of a year are not properly sequenced at year boundaries.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Minimal calendar to isolate the year boundary issue
const simpleBugTestCalendar: SeasonsStarsCalendar = {
  id: 'bug-test-calendar',
  translations: {
    en: {
      label: 'Bug Test Calendar',
      description: 'Minimal calendar for isolating year boundary bug',
    },
  },
  year: {
    epoch: 1000,
    currentYear: 1001,
    prefix: '',
    suffix: '',
    startDay: 0,
  },
  leapYear: {
    rule: 'none',
  },
  months: [
    { name: 'FirstMonth', days: 10 },
    { name: 'LastMonth', days: 10 },
  ],
  weekdays: [{ name: 'Day1' }, { name: 'Day2' }],
  intercalary: [
    {
      name: 'YearBoundary',
      after: 'LastMonth', // After last month = between years
      days: 1,
      leapYearOnly: false,
      countsForWeekdays: false,
      description: 'Day between years',
    },
  ],
  time: {
    hoursInDay: 24,
    minutesInHour: 60,
    secondsInMinute: 60,
  },
};

describe('Year Boundary Intercalary Day Bug Investigation', () => {
  let engine: CalendarEngine;

  beforeEach(() => {
    engine = new CalendarEngine(simpleBugTestCalendar);
  });

  describe('Date Sequence Analysis', () => {
    it('should correctly sequence dates around year boundary', () => {
      const year = 1001;

      // Create the sequence of dates that should be consecutive
      const lastDayOfYear = new CalendarDate(
        { year: year, month: 2, day: 10, weekday: 0 }, // Last day of LastMonth
        simpleBugTestCalendar
      );

      const yearBoundaryDay = new CalendarDate(
        { year: year + 1, month: 2, day: 1, weekday: 0, intercalary: 'YearBoundary' },
        simpleBugTestCalendar
      );

      const firstDayOfNextYear = new CalendarDate(
        { year: year + 1, month: 1, day: 1, weekday: 0 }, // First day of FirstMonth next year
        simpleBugTestCalendar
      );

      // Convert to world times
      const wt1 = engine.dateToWorldTime(lastDayOfYear);
      const wt2 = engine.dateToWorldTime(yearBoundaryDay);
      const wt3 = engine.dateToWorldTime(firstDayOfNextYear);

      console.log('Last day of year:', year, 'world time:', wt1);
      console.log('Year boundary day:', year + 1, 'world time:', wt2);
      console.log('First day of next year:', year + 1, 'world time:', wt3);

      // This should be the proper sequence
      expect(wt2).toBeGreaterThan(wt1); // Year boundary should come after last day
      expect(wt3).toBeGreaterThan(wt2); // First day of next year should come after boundary

      // Check time differences - should be exactly 1 day each
      const dayInSeconds = 24 * 60 * 60;
      expect(wt2 - wt1).toBe(dayInSeconds);
      expect(wt3 - wt2).toBe(dayInSeconds);
    });
  });

  describe('Year Association Investigation', () => {
    it('should clarify which year the intercalary day belongs to', () => {
      // The question is: should YearBoundary intercalary day be associated with:
      // Option A: The ending year (1001) - month 2, after LastMonth
      // Option B: The starting year (1002) - month 2, after LastMonth of previous year

      const year = 1001;

      // Test Option A: Intercalary day belongs to the ending year
      const optionA = {
        year: year, // Same year as the month it comes after
        month: 2, // LastMonth
        day: 1,
        weekday: 0,
        intercalary: 'YearBoundary',
      };

      // Test Option B: Intercalary day belongs to the next year
      const optionB = {
        year: year + 1, // Next year
        month: 2, // LastMonth (of previous year)
        day: 1,
        weekday: 0,
        intercalary: 'YearBoundary',
      };

      const worldTimeA = engine.dateToWorldTime(optionA);
      const worldTimeB = engine.dateToWorldTime(optionB);

      console.log('Option A (same year) world time:', worldTimeA);
      console.log('Option B (next year) world time:', worldTimeB);

      // Convert back to see which interpretation the engine uses
      const convertedA = engine.worldTimeToDate(worldTimeA);
      const convertedB = engine.worldTimeToDate(worldTimeB);

      console.log(
        'Option A converts back to:',
        convertedA.year,
        convertedA.month,
        convertedA.day,
        convertedA.intercalary
      );
      console.log(
        'Option B converts back to:',
        convertedB.year,
        convertedB.month,
        convertedB.day,
        convertedB.intercalary
      );

      // The correct interpretation should round-trip properly
      if (convertedA.intercalary === 'YearBoundary') {
        console.log('Engine prefers Option A (same year association)');
      } else if (convertedB.intercalary === 'YearBoundary') {
        console.log('Engine prefers Option B (next year association)');
      }
    });
  });

  describe('Calendar Engine Internal Logic Analysis', () => {
    it('should trace through daysToDate logic for year boundary intercalary', () => {
      // Let's manually calculate what should happen step by step

      const year = 1001;

      // Calculate total days for key dates
      const lastDayOfYear = new CalendarDate(
        { year: year, month: 2, day: 10, weekday: 0 },
        simpleBugTestCalendar
      );

      const firstDayOfNextYear = new CalendarDate(
        { year: year + 1, month: 1, day: 1, weekday: 0 },
        simpleBugTestCalendar
      );

      // Get total days since epoch for these dates
      const totalDaysLastDay = engine.dateToWorldTime(lastDayOfYear) / (24 * 60 * 60);
      const totalDaysFirstDay = engine.dateToWorldTime(firstDayOfNextYear) / (24 * 60 * 60);

      console.log('Total days for last day of year:', totalDaysLastDay);
      console.log('Total days for first day of next year:', totalDaysFirstDay);
      console.log('Difference:', totalDaysFirstDay - totalDaysLastDay);

      // The difference should account for the intercalary day
      expect(totalDaysFirstDay - totalDaysLastDay).toBe(2); // 1 day + 1 intercalary day
    });
  });

  describe('Potential Root Cause Analysis', () => {
    it('should check if dateToDays handles year boundaries correctly for intercalary days', () => {
      // Test if the issue is in dateToDays method for year-spanning intercalary days

      const intercalaryDayEndYear = {
        year: 1001, // Same as the year of LastMonth
        month: 2, // LastMonth
        day: 1,
        weekday: 0,
        intercalary: 'YearBoundary',
      };

      const intercalaryDayNextYear = {
        year: 1002, // Next year after LastMonth
        month: 2, // Still associated with LastMonth
        day: 1,
        weekday: 0,
        intercalary: 'YearBoundary',
      };

      // Both interpretations should be tested
      const worldTime1 = engine.dateToWorldTime(intercalaryDayEndYear);
      const worldTime2 = engine.dateToWorldTime(intercalaryDayNextYear);

      // See which one round-trips correctly
      const converted1 = engine.worldTimeToDate(worldTime1);
      const converted2 = engine.worldTimeToDate(worldTime2);

      console.log('End year interpretation round-trip:', {
        original: intercalaryDayEndYear,
        converted: {
          year: converted1.year,
          month: converted1.month,
          day: converted1.day,
          intercalary: converted1.intercalary,
        },
        matches:
          converted1.year === intercalaryDayEndYear.year &&
          converted1.month === intercalaryDayEndYear.month &&
          converted1.intercalary === 'YearBoundary',
      });

      console.log('Next year interpretation round-trip:', {
        original: intercalaryDayNextYear,
        converted: {
          year: converted2.year,
          month: converted2.month,
          day: converted2.day,
          intercalary: converted2.intercalary,
        },
        matches:
          converted2.year === intercalaryDayNextYear.year &&
          converted2.month === intercalaryDayNextYear.month &&
          converted2.intercalary === 'YearBoundary',
      });
    });
  });
});

describe('Bug Reproduction - Real User Scenario', () => {
  it('should demonstrate the exact problem user reported', () => {
    // Based on the user saying they can't create intercalary day on "first day of year"
    // The issue might be that when they try to create an intercalary day that conceptually
    // represents the "first day of the new year", it doesn't work as expected

    const engine = new CalendarEngine(simpleBugTestCalendar);

    // User tries to create "first day of year" intercalary day
    // This would naturally be after the last month of the previous year
    const userIntent = {
      year: 1002, // New year
      month: 2, // But associated with LastMonth (of previous year)
      day: 1, // "First day" of the intercalary period
      weekday: 0,
      intercalary: 'YearBoundary',
    };

    try {
      const worldTime = engine.dateToWorldTime(userIntent);
      const converted = engine.worldTimeToDate(worldTime);

      console.log('User intent conversion result:', {
        input: userIntent,
        worldTime: worldTime,
        output: {
          year: converted.year,
          month: converted.month,
          day: converted.day,
          intercalary: converted.intercalary,
        },
        success: converted.intercalary === 'YearBoundary',
      });

      // If this fails, it explains why user can't create the intercalary day
      expect(converted.intercalary).toBe('YearBoundary');
    } catch (error) {
      console.log('User intent failed with error:', error);
      // If this throws, that could be the problem the user is experiencing
      throw error;
    }
  });
});
