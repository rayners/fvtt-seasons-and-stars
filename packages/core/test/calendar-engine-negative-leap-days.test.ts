/**
 * Negative Leap Days Test
 *
 * This test ensures that the calendar engine correctly handles leap years
 * that remove days from months (negative leap day adjustments).
 *
 * Tests scenarios where:
 * - A leap year removes days instead of adding them
 * - Month lengths are adjusted correctly (but never below 1)
 * - Year length calculations account for negative adjustments
 */

import { describe, test, expect } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

describe('Negative Leap Days', () => {
  test('Leap year removes one day from February', () => {
    const calendar: SeasonsStarsCalendar = {
      id: 'test-negative-leap',
      translations: {},
      year: {
        epoch: 1,
        currentYear: 2024,
        prefix: '',
        suffix: ' CE',
        startDay: 1,
      },
      leapYear: {
        rule: 'custom',
        interval: 4,
        month: 'February',
        extraDays: -1, // Remove one day
      },
      months: [
        { name: 'January', days: 31 },
        { name: 'February', days: 29 }, // Normally 29, becomes 28 in leap years
        { name: 'March', days: 31 },
      ],
      weekdays: [
        { name: 'Monday' },
        { name: 'Tuesday' },
        { name: 'Wednesday' },
        { name: 'Thursday' },
        { name: 'Friday' },
        { name: 'Saturday' },
        { name: 'Sunday' },
      ],
      intercalary: [],
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      },
    };

    const engine = new CalendarEngine(calendar);

    // 2024 is a leap year (divisible by 4)
    expect(engine.isLeapYear(2024)).toBe(true);

    const monthLengths2024 = engine.getMonthLengths(2024);
    expect(monthLengths2024[1]).toBe(28); // February has 1 day removed

    const yearLength2024 = engine.getYearLength(2024);
    expect(yearLength2024).toBe(31 + 28 + 31); // 90 days total

    // 2025 is not a leap year
    expect(engine.isLeapYear(2025)).toBe(false);

    const monthLengths2025 = engine.getMonthLengths(2025);
    expect(monthLengths2025[1]).toBe(29); // February has normal length

    const yearLength2025 = engine.getYearLength(2025);
    expect(yearLength2025).toBe(31 + 29 + 31); // 91 days total
  });

  test('Leap year removes multiple days', () => {
    const calendar: SeasonsStarsCalendar = {
      id: 'test-multi-negative-leap',
      translations: {},
      year: {
        epoch: 1,
        currentYear: 2024,
        prefix: '',
        suffix: ' CE',
        startDay: 1,
      },
      leapYear: {
        rule: 'custom',
        interval: 10,
        month: 'December',
        extraDays: -3, // Remove three days
      },
      months: [
        { name: 'January', days: 30 },
        { name: 'December', days: 30 },
      ],
      weekdays: [
        { name: 'Monday' },
        { name: 'Tuesday' },
        { name: 'Wednesday' },
        { name: 'Thursday' },
        { name: 'Friday' },
      ],
      intercalary: [],
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      },
    };

    const engine = new CalendarEngine(calendar);

    // 2030 is a leap year (divisible by 10)
    expect(engine.isLeapYear(2030)).toBe(true);

    const monthLengths2030 = engine.getMonthLengths(2030);
    expect(monthLengths2030[1]).toBe(27); // December loses 3 days

    const yearLength2030 = engine.getYearLength(2030);
    expect(yearLength2030).toBe(30 + 27); // 57 days total
  });

  test('Month length never goes below 1', () => {
    const calendar: SeasonsStarsCalendar = {
      id: 'test-extreme-negative',
      translations: {},
      year: {
        epoch: 1,
        currentYear: 2024,
        prefix: '',
        suffix: ' CE',
        startDay: 1,
      },
      leapYear: {
        rule: 'custom',
        interval: 4,
        month: 'Short',
        extraDays: -10, // Try to remove more days than the month has
      },
      months: [
        { name: 'Normal', days: 30 },
        { name: 'Short', days: 5 }, // Only 5 days
      ],
      weekdays: [
        { name: 'Day1' },
        { name: 'Day2' },
      ],
      intercalary: [],
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      },
    };

    const engine = new CalendarEngine(calendar);

    // 2024 is a leap year
    expect(engine.isLeapYear(2024)).toBe(true);

    const monthLengths = engine.getMonthLengths(2024);
    expect(monthLengths[1]).toBe(1); // Should be clamped to 1, not negative

    const yearLength = engine.getYearLength(2024);
    expect(yearLength).toBe(30 + 1); // 31 days total
  });

  test('Gregorian rule with negative days', () => {
    const calendar: SeasonsStarsCalendar = {
      id: 'test-gregorian-negative',
      translations: {},
      year: {
        epoch: 1,
        currentYear: 2000,
        prefix: '',
        suffix: ' CE',
        startDay: 1,
      },
      leapYear: {
        rule: 'gregorian',
        month: 'February',
        extraDays: -2, // Remove two days in leap years
      },
      months: [
        { name: 'January', days: 31 },
        { name: 'February', days: 30 }, // Normally 30, becomes 28 in leap years
        { name: 'March', days: 31 },
      ],
      weekdays: [
        { name: 'Monday' },
        { name: 'Tuesday' },
        { name: 'Wednesday' },
        { name: 'Thursday' },
        { name: 'Friday' },
        { name: 'Saturday' },
        { name: 'Sunday' },
      ],
      intercalary: [],
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      },
    };

    const engine = new CalendarEngine(calendar);

    // 2000 is a leap year (divisible by 400)
    expect(engine.isLeapYear(2000)).toBe(true);
    const monthLengths2000 = engine.getMonthLengths(2000);
    expect(monthLengths2000[1]).toBe(28); // February loses 2 days

    // 1900 is NOT a leap year (divisible by 100 but not 400)
    expect(engine.isLeapYear(1900)).toBe(false);
    const monthLengths1900 = engine.getMonthLengths(1900);
    expect(monthLengths1900[1]).toBe(30); // February keeps normal length

    // 2004 is a leap year (divisible by 4, not by 100)
    expect(engine.isLeapYear(2004)).toBe(true);
    const monthLengths2004 = engine.getMonthLengths(2004);
    expect(monthLengths2004[1]).toBe(28); // February loses 2 days
  });
});