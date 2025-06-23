/**
 * Intercalary Date Round-Trip Conversion Tests
 *
 * These tests specifically verify that intercalary dates convert correctly
 * through the round-trip: CalendarDate → worldTime → CalendarDate
 *
 * This addresses the bug where setting an intercalary date would result
 * in a regular day 2 of the month instead of the proper intercalary date.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Mock Warhammer calendar with intercalary days
const warhammer: SeasonsStarsCalendar = {
  id: 'warhammer',
  translations: {
    en: {
      label: 'Test Warhammer',
      description: 'Test calendar',
      setting: 'Test',
    },
  },
  year: {
    epoch: 0,
    currentYear: 2522,
    prefix: '',
    suffix: '',
    startDay: 0,
  },
  leapYear: {
    rule: 'none',
  },
  months: [
    { name: 'Nachexen', abbreviation: 'Nac', days: 32, description: 'Test month 1' },
    { name: 'Jahrdrung', abbreviation: 'Jah', days: 33, description: 'Test month 2' },
    { name: 'Pflugzeit', abbreviation: 'Pfl', days: 33, description: 'Test month 3' },
  ],
  weekdays: [
    { name: 'Wellentag', abbreviation: 'We', description: 'Test day 1' },
    { name: 'Aubentag', abbreviation: 'Au', description: 'Test day 2' },
    { name: 'Marktag', abbreviation: 'Ma', description: 'Test day 3' },
    { name: 'Backertag', abbreviation: 'Ba', description: 'Test day 4' },
  ],
  intercalary: [
    {
      name: 'Mitterfruhl',
      after: 'Jahrdrung',
      leapYearOnly: false,
      countsForWeekdays: false,
      description: 'Middle Spring',
    },
  ],
  time: {
    hoursInDay: 24,
    minutesInHour: 60,
    secondsInMinute: 60,
  },
};

describe('Intercalary Date Round-Trip Conversion', () => {
  let engine: CalendarEngine;

  beforeEach(() => {
    engine = new CalendarEngine(warhammer);
  });

  describe('Mitterfruhl Intercalary Day', () => {
    it('should convert intercalary date to worldTime and back correctly', () => {
      const intercalaryDate = {
        year: 2523,
        month: 2, // Jahrdrung
        day: 1, // First day of intercalary period
        weekday: 0,
        intercalary: 'Mitterfruhl',
      };

      // Convert to worldTime
      const worldTime = engine.dateToWorldTime(intercalaryDate);

      // Convert back to date
      const convertedBack = engine.worldTimeToDate(worldTime);

      // Should match exactly - convertedBack is a CalendarDate instance
      expect(convertedBack.year).toBe(2523);
      expect(convertedBack.month).toBe(2);
      expect(convertedBack.day).toBe(1);
      expect(convertedBack.weekday).toBe(0);
      expect(convertedBack.intercalary).toBe('Mitterfruhl');
      expect(convertedBack.time).toEqual({ hour: 0, minute: 0, second: 0 });
    });

    it('should not convert intercalary date to regular day 2', () => {
      const intercalaryDate = {
        year: 2523,
        month: 2,
        day: 1,
        weekday: 0,
        intercalary: 'Mitterfruhl',
      };

      const worldTime = engine.dateToWorldTime(intercalaryDate);
      const convertedBack = engine.worldTimeToDate(worldTime);

      // Should NOT be day 2 of month 2
      expect(convertedBack.day).not.toBe(2);
      expect(convertedBack.intercalary).toBe('Mitterfruhl');
    });

    it('should handle multi-day intercalary periods correctly', () => {
      // Test with a multi-day intercalary period (modify calendar temporarily)
      const multiDayCalendar = {
        ...warhammer,
        intercalary: [
          {
            name: 'Mitterfruhl',
            after: 'Jahrdrung',
            days: 3, // Multi-day intercalary period
            leapYearOnly: false,
            countsForWeekdays: false,
            description: 'Multi-day Middle Spring',
          },
        ],
      };

      const multiEngine = new CalendarEngine(multiDayCalendar);

      // Test day 1 of intercalary period
      const day1 = {
        year: 2523,
        month: 2,
        day: 1,
        weekday: 0,
        intercalary: 'Mitterfruhl',
      };

      const worldTime1 = multiEngine.dateToWorldTime(day1);
      const converted1 = multiEngine.worldTimeToDate(worldTime1);

      // converted1 is a CalendarDate instance
      expect(converted1.year).toBe(2523);
      expect(converted1.month).toBe(2);
      expect(converted1.day).toBe(1);
      expect(converted1.weekday).toBe(0);
      expect(converted1.intercalary).toBe('Mitterfruhl');
      expect(converted1.time).toEqual({ hour: 0, minute: 0, second: 0 });

      // Test day 3 of intercalary period
      const day3 = {
        year: 2523,
        month: 2,
        day: 3,
        weekday: 0,
        intercalary: 'Mitterfruhl',
      };

      const worldTime3 = multiEngine.dateToWorldTime(day3);
      const converted3 = multiEngine.worldTimeToDate(worldTime3);

      // converted3 is a CalendarDate instance
      expect(converted3.year).toBe(2523);
      expect(converted3.month).toBe(2);
      expect(converted3.day).toBe(3);
      expect(converted3.weekday).toBe(0);
      expect(converted3.intercalary).toBe('Mitterfruhl');
      expect(converted3.time).toEqual({ hour: 0, minute: 0, second: 0 });
    });
  });

  describe('Regular Date Conversion (Regression Prevention)', () => {
    it('should still handle regular dates correctly', () => {
      const regularDate = {
        year: 2523,
        month: 2,
        day: 15,
        weekday: 0,
      };

      const worldTime = engine.dateToWorldTime(regularDate);
      const convertedBack = engine.worldTimeToDate(worldTime);

      // convertedBack is a CalendarDate instance
      expect(convertedBack.year).toBe(2523);
      expect(convertedBack.month).toBe(2);
      expect(convertedBack.day).toBe(15);
      expect(convertedBack.weekday).toBe(0);
      expect(convertedBack.time).toEqual({ hour: 0, minute: 0, second: 0 });
    });

    it('should handle last day of month before intercalary correctly', () => {
      const lastDay = {
        year: 2523,
        month: 2,
        day: 33, // Last day of Jahrdrung
        weekday: 0,
      };

      const worldTime = engine.dateToWorldTime(lastDay);
      const convertedBack = engine.worldTimeToDate(worldTime);

      expect(convertedBack.year).toBe(2523);
      expect(convertedBack.month).toBe(2);
      expect(convertedBack.day).toBe(33);
      expect(convertedBack.intercalary).toBeUndefined();
      expect(convertedBack.time).toEqual({ hour: 0, minute: 0, second: 0 });
    });

    it('should handle first day of next month after intercalary correctly', () => {
      const firstDay = {
        year: 2523,
        month: 3,
        day: 1, // First day of Pflugzeit (after Mitterfruhl)
        weekday: 0,
      };

      const worldTime = engine.dateToWorldTime(firstDay);
      const convertedBack = engine.worldTimeToDate(worldTime);

      expect(convertedBack.year).toBe(2523);
      expect(convertedBack.month).toBe(3);
      expect(convertedBack.day).toBe(1);
      expect(convertedBack.intercalary).toBeUndefined();
      expect(convertedBack.time).toEqual({ hour: 0, minute: 0, second: 0 });
    });
  });

  describe('Edge Cases', () => {
    it('should handle intercalary dates with time components', () => {
      const intercalaryWithTime = {
        year: 2523,
        month: 2,
        day: 1,
        weekday: 0,
        intercalary: 'Mitterfruhl',
        time: { hour: 12, minute: 30, second: 45 },
      };

      const worldTime = engine.dateToWorldTime(intercalaryWithTime);
      const convertedBack = engine.worldTimeToDate(worldTime);

      // convertedBack is a CalendarDate instance
      expect(convertedBack.year).toBe(2523);
      expect(convertedBack.month).toBe(2);
      expect(convertedBack.day).toBe(1);
      expect(convertedBack.weekday).toBe(0);
      expect(convertedBack.intercalary).toBe('Mitterfruhl');
      expect(convertedBack.time).toEqual({ hour: 12, minute: 30, second: 45 });
    });
  });
});
