/**
 * Test for "before" intercalary day functionality
 *
 * This test validates the new "before" intercalary day feature that allows
 * intercalary days to be positioned before a month rather than after.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../../../src/core/calendar-engine';
import { CalendarDate } from '../../../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';

// Test calendar with both "before" and "after" intercalary days
const testCalendarWithBefore: SeasonsStarsCalendar = {
  id: 'test-before-intercalary',
  translations: {
    en: {
      label: 'Test Before Intercalary',
      description: 'Test calendar with before and after intercalary days',
    },
  },
  year: {
    epoch: 1000,
    currentYear: 1025,
    prefix: 'Year ',
    suffix: '',
    startDay: 0,
  },
  leapYear: {
    rule: 'none',
  },
  months: [
    { name: 'Spring', days: 30 },
    { name: 'Summer', days: 31 },
    { name: 'Autumn', days: 30 },
    { name: 'Winter', days: 31 },
  ],
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
      name: 'New Year Day',
      before: 'Spring', // Before the FIRST month - true "first day of year"
      days: 1,
      leapYearOnly: false,
      countsForWeekdays: false,
      description: 'The true first day of the new year, before Spring begins',
    },
    {
      name: 'Mid-Spring Festival',
      after: 'Spring', // After first month for comparison
      days: 2,
      leapYearOnly: false,
      countsForWeekdays: false,
      description: 'Festival after Spring ends',
    },
    {
      name: 'Pre-Summer Preparation',
      before: 'Summer', // Before second month
      days: 1,
      leapYearOnly: false,
      countsForWeekdays: true,
      description: 'Preparation day before Summer begins',
    },
  ],
  time: {
    hoursInDay: 24,
    minutesInHour: 60,
    secondsInMinute: 60,
  },
};

describe('Before Intercalary Day Functionality', () => {
  let engine: CalendarEngine;

  beforeEach(() => {
    engine = new CalendarEngine(testCalendarWithBefore);
  });

  describe('New Year Day - Before First Month', () => {
    it('should correctly create intercalary date before first month', () => {
      // New Year Day comes BEFORE Spring (month 1)
      const newYearDay = new CalendarDate(
        {
          year: 1025,
          month: 1, // Associated with Spring (the month it comes before)
          day: 1, // First day of intercalary period
          weekday: 0,
          intercalary: 'New Year Day',
        },
        testCalendarWithBefore
      );

      expect(newYearDay.year).toBe(1025);
      expect(newYearDay.month).toBe(1);
      expect(newYearDay.day).toBe(1);
      expect(newYearDay.intercalary).toBe('New Year Day');
    });

    it('should convert New Year Day to world time and back correctly', () => {
      const intercalaryDate = {
        year: 1025,
        month: 1, // Spring
        day: 1,
        weekday: 0,
        intercalary: 'New Year Day',
      };

      const worldTime = engine.dateToWorldTime(intercalaryDate);
      const converted = engine.worldTimeToDate(worldTime);

      expect(converted.year).toBe(1025);
      expect(converted.month).toBe(1);
      expect(converted.day).toBe(1);
      expect(converted.intercalary).toBe('New Year Day');
    });

    it('should correctly sequence dates around New Year Day (before first month)', () => {
      // Sequence should be:
      // 1. Last day of Winter 1024 (previous year)
      // 2. New Year Day 1025 (before Spring)
      // 3. First day of Spring 1025

      const lastDayPreviousYear = new CalendarDate(
        { year: 1024, month: 4, day: 31, weekday: 0 }, // Last day of Winter 1024
        testCalendarWithBefore
      );

      const newYearDay = new CalendarDate(
        { year: 1025, month: 1, day: 1, weekday: 0, intercalary: 'New Year Day' },
        testCalendarWithBefore
      );

      const firstDaySpring = new CalendarDate(
        { year: 1025, month: 1, day: 1, weekday: 0 }, // First day of Spring 1025
        testCalendarWithBefore
      );

      const worldTime1 = engine.dateToWorldTime(lastDayPreviousYear);
      const worldTime2 = engine.dateToWorldTime(newYearDay);
      const worldTime3 = engine.dateToWorldTime(firstDaySpring);

      // Should be properly sequenced
      expect(worldTime2).toBeGreaterThan(worldTime1);
      expect(worldTime3).toBeGreaterThan(worldTime2);

      // Time differences should be exactly 1 day each
      const dayInSeconds = 24 * 60 * 60;
      expect(worldTime2 - worldTime1).toBe(dayInSeconds);
      expect(worldTime3 - worldTime2).toBe(dayInSeconds);
    });
  });

  describe('Pre-Summer Preparation - Before Middle Month', () => {
    it('should correctly handle intercalary day before a middle month', () => {
      const preSummerDay = new CalendarDate(
        {
          year: 1025,
          month: 2, // Associated with Summer (the month it comes before)
          day: 1,
          weekday: 0,
          intercalary: 'Pre-Summer Preparation',
        },
        testCalendarWithBefore
      );

      expect(preSummerDay.year).toBe(1025);
      expect(preSummerDay.month).toBe(2);
      expect(preSummerDay.day).toBe(1);
      expect(preSummerDay.intercalary).toBe('Pre-Summer Preparation');
    });

    it('should correctly sequence before-middle-month intercalary', () => {
      // Sequence should be:
      // 1. Mid-Spring Festival (after Spring)
      // 2. Pre-Summer Preparation (before Summer)
      // 3. First day of Summer

      const midSpringFestival = new CalendarDate(
        { year: 1025, month: 1, day: 1, weekday: 0, intercalary: 'Mid-Spring Festival' },
        testCalendarWithBefore
      );

      const preSummerPrep = new CalendarDate(
        { year: 1025, month: 2, day: 1, weekday: 0, intercalary: 'Pre-Summer Preparation' },
        testCalendarWithBefore
      );

      const firstDaySummer = new CalendarDate(
        { year: 1025, month: 2, day: 1, weekday: 0 }, // First day of Summer
        testCalendarWithBefore
      );

      const worldTime1 = engine.dateToWorldTime(midSpringFestival);
      const worldTime2 = engine.dateToWorldTime(preSummerPrep);
      const worldTime3 = engine.dateToWorldTime(firstDaySummer);

      // Should be properly sequenced
      expect(worldTime2).toBeGreaterThan(worldTime1);
      expect(worldTime3).toBeGreaterThan(worldTime2);
    });
  });

  describe('Mixed Before and After Intercalary Days', () => {
    it('should correctly handle calendar with both before and after intercalary days', () => {
      // Test the full sequence of events in year 1025:
      // 1. New Year Day (before Spring)
      // 2. Spring month (30 days)
      // 3. Mid-Spring Festival (after Spring, 2 days)
      // 4. Pre-Summer Preparation (before Summer, 1 day)
      // 5. Summer month starts

      const dates = [
        { year: 1025, month: 1, day: 1, intercalary: 'New Year Day' },
        { year: 1025, month: 1, day: 1 }, // First day of Spring
        { year: 1025, month: 1, day: 30 }, // Last day of Spring
        { year: 1025, month: 1, day: 1, intercalary: 'Mid-Spring Festival' },
        { year: 1025, month: 1, day: 2, intercalary: 'Mid-Spring Festival' },
        { year: 1025, month: 2, day: 1, intercalary: 'Pre-Summer Preparation' },
        { year: 1025, month: 2, day: 1 }, // First day of Summer
      ];

      const worldTimes = dates.map(dateData => {
        const worldTime = engine.dateToWorldTime(dateData);
        const converted = engine.worldTimeToDate(worldTime);

        // Verify round-trip conversion
        expect(converted.year).toBe(dateData.year);
        expect(converted.month).toBe(dateData.month);
        expect(converted.day).toBe(dateData.day);
        if (dateData.intercalary) {
          expect(converted.intercalary).toBe(dateData.intercalary);
        }

        return worldTime;
      });

      // Verify all dates are in sequence
      for (let i = 1; i < worldTimes.length; i++) {
        expect(worldTimes[i]).toBeGreaterThan(worldTimes[i - 1]);
      }
    });
  });

  describe('Engine Helper Methods', () => {
    it('should correctly identify intercalary days before specific months', () => {
      // Before Spring (month 1)
      const beforeSpring = engine.getIntercalaryDaysBeforeMonth(1025, 1);
      expect(beforeSpring).toHaveLength(1);
      expect(beforeSpring[0].name).toBe('New Year Day');

      // Before Summer (month 2)
      const beforeSummer = engine.getIntercalaryDaysBeforeMonth(1025, 2);
      expect(beforeSummer).toHaveLength(1);
      expect(beforeSummer[0].name).toBe('Pre-Summer Preparation');

      // Before Autumn (month 3) - should be empty
      const beforeAutumn = engine.getIntercalaryDaysBeforeMonth(1025, 3);
      expect(beforeAutumn).toHaveLength(0);
    });

    it('should still correctly identify intercalary days after specific months', () => {
      // After Spring (month 1)
      const afterSpring = engine.getIntercalaryDaysAfterMonth(1025, 1);
      expect(afterSpring).toHaveLength(1);
      expect(afterSpring[0].name).toBe('Mid-Spring Festival');

      // After Summer (month 2) - should be empty
      const afterSummer = engine.getIntercalaryDaysAfterMonth(1025, 2);
      expect(afterSummer).toHaveLength(0);
    });
  });

  describe('Weekday Calculation with Before Intercalary', () => {
    it('should correctly calculate weekdays with before intercalary days', () => {
      // New Year Day is before Spring and doesn't count for weekdays
      const newYearDay = new CalendarDate(
        { year: 1025, month: 1, day: 1, weekday: 0, intercalary: 'New Year Day' },
        testCalendarWithBefore
      );

      // Pre-Summer Preparation is before Summer and DOES count for weekdays
      const preSummerPrep = new CalendarDate(
        { year: 1025, month: 2, day: 1, weekday: 0, intercalary: 'Pre-Summer Preparation' },
        testCalendarWithBefore
      );

      // Both should have calculated weekdays
      expect(typeof newYearDay.weekday).toBe('number');
      expect(typeof preSummerPrep.weekday).toBe('number');
    });
  });
});

describe('Real-World Example: French Revolutionary Style with Before', () => {
  // Enhanced French Revolutionary calendar with "before" New Year days
  const enhancedFrenchRevolutionary: SeasonsStarsCalendar = {
    id: 'enhanced-french-revolutionary',
    translations: {
      en: {
        label: 'Enhanced French Revolutionary Calendar',
        description: 'French Revolutionary calendar with true new year start',
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
        name: 'Republican New Year',
        before: 'Month1', // True "first day of year" - before first month
        days: 1,
        leapYearOnly: false,
        countsForWeekdays: false,
        description: 'The true first day of the Republican year',
      },
      {
        name: 'Complementary Days',
        after: 'Month12', // Traditional year-end days
        days: 5,
        leapYearOnly: false,
        countsForWeekdays: false,
        description: 'Five complementary days at year end',
      },
    ],
    time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
  };

  it('should correctly handle both before and after year-boundary intercalary days', () => {
    const engine = new CalendarEngine(enhancedFrenchRevolutionary);

    // Test the year boundary sequence:
    // 1. Last day of Month12, Year 1799
    // 2. Complementary Days (after Month12, Year 1799)
    // 3. Republican New Year (before Month1, Year 1800)
    // 4. First day of Month1, Year 1800

    const lastDayYear = new CalendarDate(
      { year: 1799, month: 12, day: 30, weekday: 0 },
      enhancedFrenchRevolutionary
    );

    const complementaryDay = new CalendarDate(
      { year: 1800, month: 12, day: 1, weekday: 0, intercalary: 'Complementary Days' },
      enhancedFrenchRevolutionary
    );

    const republicanNewYear = new CalendarDate(
      { year: 1800, month: 1, day: 1, weekday: 0, intercalary: 'Republican New Year' },
      enhancedFrenchRevolutionary
    );

    const firstDayNewYear = new CalendarDate(
      { year: 1800, month: 1, day: 1, weekday: 0 },
      enhancedFrenchRevolutionary
    );

    const worldTime1 = engine.dateToWorldTime(lastDayYear);
    const worldTime2 = engine.dateToWorldTime(complementaryDay);
    const worldTime3 = engine.dateToWorldTime(republicanNewYear);
    const worldTime4 = engine.dateToWorldTime(firstDayNewYear);

    // Should all be in sequence
    expect(worldTime2).toBeGreaterThan(worldTime1);
    expect(worldTime3).toBeGreaterThan(worldTime2);
    expect(worldTime4).toBeGreaterThan(worldTime3);

    // Republican New Year should truly be the "first day" of 1800
    expect(republicanNewYear.year).toBe(1800);
    expect(republicanNewYear.intercalary).toBe('Republican New Year');
  });
});
