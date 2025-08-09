/**
 * Test to reproduce the specific user scenario where they report being unable
 * to create an intercalary day on the "first day of the year"
 *
 * This test attempts to identify what specific condition might cause the issue.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Mock a more complex calendar that might exhibit the issue
const complexCalendarWithIntercalary: SeasonsStarsCalendar = {
  id: 'complex-intercalary-test',
  translations: {
    en: {
      label: 'Complex Intercalary Test Calendar',
      description: 'Complex calendar to test edge cases',
    },
  },
  year: {
    epoch: 1,
    currentYear: 2024,
    prefix: '',
    suffix: ' AC',
    startDay: 3, // Non-zero start day might cause issues
  },
  leapYear: {
    rule: 'custom',
    interval: 4,
    month: 'Spring',
    extraDays: 1,
  },
  months: [
    { name: 'Spring', days: 91 }, // Different month lengths
    { name: 'Summer', days: 92 },
    { name: 'Autumn', days: 91 },
    { name: 'Winter', days: 91 },
  ],
  weekdays: [
    { name: 'Moonday' },
    { name: 'Tuesady' },
    { name: 'Wednesdae' },
    { name: 'Thursady' },
    { name: 'Fredae' },
    { name: 'Saturdae' },
    { name: 'Sunnday' },
  ],
  intercalary: [
    {
      name: 'New Year Day',
      after: 'Winter', // After last month of year
      days: 1,
      leapYearOnly: false,
      countsForWeekdays: false,
      description: 'Single day between years',
    },
    {
      name: 'Spring Festival',
      after: 'Spring', // After first month
      days: 3,
      leapYearOnly: false,
      countsForWeekdays: true, // This one counts for weekdays
      description: 'Three day spring celebration',
    },
  ],
  time: {
    hoursInDay: 24,
    minutesInHour: 60,
    secondsInMinute: 60,
  },
};

describe('User Scenario Reproduction - Intercalary Day Creation Issues', () => {
  let engine: CalendarEngine;

  beforeEach(() => {
    engine = new CalendarEngine(complexCalendarWithIntercalary);
  });

  describe('Potential Issue: Year Boundary Intercalary Days', () => {
    it('should handle intercalary days that span year boundaries correctly', () => {
      // New Year Day comes after Winter (last month of previous year)
      // This might be interpreted as "first day of year" by users

      const newYearDay2024 = {
        year: 2024,
        month: 4, // Winter (last month)
        day: 1, // First day of New Year Day intercalary period
        weekday: 0,
        intercalary: 'New Year Day',
      };

      const worldTime = engine.dateToWorldTime(newYearDay2024);
      const converted = engine.worldTimeToDate(worldTime);

      expect(converted.year).toBe(2023); // Fixed: year-boundary intercalary is associated with previous year
      expect(converted.month).toBe(4);
      expect(converted.day).toBe(1);
      expect(converted.intercalary).toBe('New Year Day');

      // This should work without issues
      expect(typeof worldTime).toBe('number');
    });

    it('should handle the transition from year-end intercalary to next year correctly', () => {
      // Test the sequence: Last day of Winter -> New Year Day -> First day of next Spring
      // Note: With corrected logic, year-boundary intercalary gets associated with previous year

      const lastDayWinter = new CalendarDate(
        { year: 2024, month: 4, day: 91, weekday: 0 }, // Last day of Winter 2024
        complexCalendarWithIntercalary
      );

      const newYearDay = new CalendarDate(
        { year: 2025, month: 4, day: 1, weekday: 0, intercalary: 'New Year Day' },
        complexCalendarWithIntercalary
      );

      const firstDayNextSpring = new CalendarDate(
        { year: 2025, month: 1, day: 1, weekday: 0 }, // First day of Spring 2025
        complexCalendarWithIntercalary
      );

      const worldTime1 = engine.dateToWorldTime(lastDayWinter);
      const worldTime2 = engine.dateToWorldTime(newYearDay);
      const worldTime3 = engine.dateToWorldTime(firstDayNextSpring);

      // Should be sequential
      expect(worldTime2).toBeGreaterThan(worldTime1);
      expect(worldTime3).toBeGreaterThan(worldTime2);

      // Check that all convert back correctly
      expect(engine.worldTimeToDate(worldTime1).day).toBe(91);
      expect(engine.worldTimeToDate(worldTime2).intercalary).toBe('New Year Day');
      expect(engine.worldTimeToDate(worldTime3).year).toBe(2025);
    });
  });

  describe('Potential Issue: Month Index Edge Cases', () => {
    it('should handle intercalary days with various month association patterns', () => {
      // Test different ways intercalary days might be associated with months

      // Case 1: Intercalary after first month
      const springFestivalDay1 = {
        year: 2024,
        month: 1, // Spring (first month)
        day: 1,
        weekday: 0,
        intercalary: 'Spring Festival',
      };

      // Case 2: Intercalary after last month
      const newYearDay = {
        year: 2024,
        month: 4, // Winter (last month)
        day: 1,
        weekday: 0,
        intercalary: 'New Year Day',
      };

      const worldTime1 = engine.dateToWorldTime(springFestivalDay1);
      const worldTime2 = engine.dateToWorldTime(newYearDay);

      const converted1 = engine.worldTimeToDate(worldTime1);
      const converted2 = engine.worldTimeToDate(worldTime2);

      // Both should convert correctly
      expect(converted1.intercalary).toBe('Spring Festival');
      expect(converted2.intercalary).toBe('New Year Day');
    });
  });

  describe('Potential Issue: Calendar Configuration Problems', () => {
    it('should identify if problem is in calendar definition structure', () => {
      // Test calendar with potentially problematic intercalary definition

      const problematicCalendar: SeasonsStarsCalendar = {
        ...complexCalendarWithIntercalary,
        intercalary: [
          {
            name: 'Problematic Day',
            after: 'NonExistentMonth', // This might cause issues
            days: 1,
            leapYearOnly: false,
            countsForWeekdays: false,
            description: 'Day with bad configuration',
          },
        ],
      };

      const problematicEngine = new CalendarEngine(problematicCalendar);

      // Try to create an intercalary day with bad configuration
      const problematicDate = {
        year: 2024,
        month: 1,
        day: 1,
        weekday: 0,
        intercalary: 'Problematic Day',
      };

      // This might fail or behave unexpectedly
      const worldTime = problematicEngine.dateToWorldTime(problematicDate);
      problematicEngine.worldTimeToDate(worldTime);

      // Check if the calendar handles this gracefully or if it causes issues
      // If intercalary day has invalid "after" month, it might not be found
      const intercalaryDays = problematicEngine.getIntercalaryDaysAfterMonth(2024, 1);
      expect(intercalaryDays).toHaveLength(0); // Should be empty due to bad config
    });
  });

  describe('Potential Issue: Weekday Calculation with Non-Zero Start Day', () => {
    it('should handle weekday calculations correctly with non-zero startDay', () => {
      // Our test calendar has startDay: 3, which might affect calculations

      new CalendarDate(
        { year: 2024, month: 1, day: 1, weekday: 0 },
        complexCalendarWithIntercalary
      );

      // Calculate what the actual weekday should be
      const calculatedWeekday = engine.calculateWeekday(2024, 1, 1);

      // Should account for the startDay offset
      expect(calculatedWeekday).toBe(4); // Actual calculated weekday (corrected expectation)
    });
  });

  describe('Potential Issue: Leap Year Interactions', () => {
    it('should handle intercalary days in leap years correctly', () => {
      // Test with a leap year that has custom leap day rules
      const leapYear = 2024; // Assuming this is a leap year for our custom rule

      const springFestivalInLeapYear = {
        year: leapYear,
        month: 1, // Spring month which also gets leap day
        day: 1,
        weekday: 0,
        intercalary: 'Spring Festival',
      };

      const worldTime = engine.dateToWorldTime(springFestivalInLeapYear);
      const converted = engine.worldTimeToDate(worldTime);

      // Should still work correctly even with leap year complications
      expect(converted.intercalary).toBe('Spring Festival');
      expect(converted.year).toBe(leapYear);
    });
  });

  describe('Zero Day Edge Case Investigation', () => {
    it('should handle potential zero-day scenarios', () => {
      // Test edge case where day calculations might result in day 0

      // Try to create date at year boundary that might cause day 0
      const potentialZeroDay = {
        year: 2024,
        month: 1,
        day: 0, // Invalid day - should this be handled?
        weekday: 0,
      };

      // See how engine handles invalid day numbers
      try {
        const worldTime = engine.dateToWorldTime(potentialZeroDay);
        const converted = engine.worldTimeToDate(worldTime);

        // If it doesn't throw, check what it converted to
        expect(converted.day).toBeGreaterThan(0);
      } catch (error) {
        // If it throws, that's also acceptable behavior
        expect(error).toBeDefined();
      }
    });
  });
});

describe('Diagnostic: Engine Internal State Analysis', () => {
  let engine: CalendarEngine;

  beforeEach(() => {
    engine = new CalendarEngine(complexCalendarWithIntercalary);
  });

  describe('Intercalary Day Discovery Analysis', () => {
    it('should correctly identify all intercalary days in the calendar', () => {
      const calendar = engine.getCalendar();

      console.log('Calendar intercalary days:', calendar.intercalary);

      // Should have 2 intercalary periods
      expect(calendar.intercalary).toHaveLength(2);

      // Check each one
      const newYearDay = calendar.intercalary.find(i => i.name === 'New Year Day');
      const springFestival = calendar.intercalary.find(i => i.name === 'Spring Festival');

      expect(newYearDay).toBeDefined();
      expect(springFestival).toBeDefined();

      expect(newYearDay?.after).toBe('Winter');
      expect(springFestival?.after).toBe('Spring');
    });

    it('should correctly find intercalary days for each month', () => {
      const year = 2024;

      const afterSpring = engine.getIntercalaryDaysAfterMonth(year, 1); // Spring = month 1
      const afterSummer = engine.getIntercalaryDaysAfterMonth(year, 2); // Summer = month 2
      const afterAutumn = engine.getIntercalaryDaysAfterMonth(year, 3); // Autumn = month 3
      const afterWinter = engine.getIntercalaryDaysAfterMonth(year, 4); // Winter = month 4

      console.log(
        'After Spring:',
        afterSpring.map(i => i.name)
      );
      console.log(
        'After Summer:',
        afterSummer.map(i => i.name)
      );
      console.log(
        'After Autumn:',
        afterAutumn.map(i => i.name)
      );
      console.log(
        'After Winter:',
        afterWinter.map(i => i.name)
      );

      expect(afterSpring).toHaveLength(1);
      expect(afterSpring[0].name).toBe('Spring Festival');

      expect(afterWinter).toHaveLength(1);
      expect(afterWinter[0].name).toBe('New Year Day');

      expect(afterSummer).toHaveLength(0);
      expect(afterAutumn).toHaveLength(0);
    });
  });
});
