/**
 * Negative Leap Days Regression Test with Existing Calendars
 *
 * This test ensures that the negative leap day feature works correctly
 * with modifications to existing calendar definitions.
 */

import { describe, test, expect } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../src/types/calendar';
import { loadTestCalendar } from './utils/calendar-loader';

describe('Negative Leap Days with Existing Calendars', () => {
  test('Gregorian calendar modified with negative leap days', () => {
    // Load the standard Gregorian calendar
    const gregorianBase: SeasonsStarsCalendar = loadTestCalendar('gregorian.json');

    // Modify it to remove a day instead of adding one
    const modifiedGregorian = {
      ...gregorianBase,
      leapYear: {
        ...gregorianBase.leapYear,
        extraDays: -1, // Remove a day in leap years instead of adding
      },
    };

    const engine = new CalendarEngine(modifiedGregorian);

    // 2024 is a leap year
    expect(engine.isLeapYear(2024)).toBe(true);

    const monthLengths2024 = engine.getMonthLengths(2024);
    // February normally has 28 days, minus 1 for negative leap = 27
    expect(monthLengths2024[1]).toBe(27);

    const yearLength2024 = engine.getYearLength(2024);
    // Normal year is 365, removing 1 day = 364
    expect(yearLength2024).toBe(364);

    // 2023 is not a leap year
    expect(engine.isLeapYear(2023)).toBe(false);

    const monthLengths2023 = engine.getMonthLengths(2023);
    expect(monthLengths2023[1]).toBe(28); // February has normal 28 days

    const yearLength2023 = engine.getYearLength(2023);
    expect(yearLength2023).toBe(365); // Normal year length
  });

  test('Custom calendar with extreme negative adjustment', () => {
    // Create a calendar where a month only has 2 days
    const extremeCalendar: SeasonsStarsCalendar = {
      id: 'extreme-test',
      translations: {},
      year: {
        epoch: 1,
        currentYear: 2000,
        prefix: '',
        suffix: '',
        startDay: 1,
      },
      leapYear: {
        rule: 'custom',
        interval: 5,
        month: 'Tiny',
        extraDays: -5, // Try to remove 5 days from a 2-day month
      },
      months: [
        { name: 'Normal', days: 30 },
        { name: 'Tiny', days: 2 }, // Only 2 days!
      ],
      weekdays: [{ name: 'Day1' }, { name: 'Day2' }],
      intercalary: [],
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      },
    };

    const engine = new CalendarEngine(extremeCalendar);

    // 2000 is a leap year (divisible by 5)
    expect(engine.isLeapYear(2000)).toBe(true);

    const monthLengths = engine.getMonthLengths(2000);
    // Should be clamped to minimum of 1 day
    expect(monthLengths[1]).toBe(1);

    const yearLength = engine.getYearLength(2000);
    expect(yearLength).toBe(31); // 30 + 1 (clamped)
  });
});
