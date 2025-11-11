/**
 * Leap Year Calculation Regression Test
 *
 * This test ensures that leap year calculations remain consistent and that
 * the calendar engine correctly handles year/month length calculations.
 *
 * Prevents regression of bugs related to:
 * - getYearLength() vs getMonthLengths() consistency
 * - Leap year boundary calculations
 * - 365-day vs 366-day year scenarios
 */

import { describe, test, expect } from 'vitest';
import { CalendarEngine } from '../../../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';
import { loadTestCalendar } from '../../utils/calendar-loader';

// Use the actual Golarion calendar JSON file instead of duplicating definitions
const golarionCalendar: SeasonsStarsCalendar = loadTestCalendar('golarion-pf2e.json');

describe('Leap Year Calculation Regression', () => {
  test('Check year 2700 length calculations', () => {
    const engine = new CalendarEngine(golarionCalendar);

    const yearLength = engine.getYearLength(2700);

    const monthLengths = engine.getMonthLengths(2700);

    const totalMonthDays = monthLengths.reduce((sum, days) => sum + days, 0);

    const isLeapYear = engine.isLeapYear(2700);

    // Manual calculation
    const baseMonthDays = golarionCalendar.months.reduce((sum, m) => sum + m.days, 0);

    // Check leap year calculation
    const leapYearExtra = isLeapYear ? (golarionCalendar.leapYear.extraDays ?? 1) : 0;

    const expectedYearLength = baseMonthDays + leapYearExtra;

    expect(yearLength).toBe(expectedYearLength);
    expect(yearLength).toBe(totalMonthDays);
  });

  test('Simulate the exact 365-day scenario', () => {
    const engine = new CalendarEngine(golarionCalendar);

    // Simulate what happens with 365 days in daysToDate
    let year = 2700;
    let remainingDays = 365;

    const yearLength = engine.getYearLength(year);

    if (remainingDays >= yearLength) {
      remainingDays -= yearLength;
      year++;
    }

    // Now check month calculation
    const monthLengths = engine.getMonthLengths(year);

    let month = 1;
    let tempRemainingDays = remainingDays;

    for (month = 1; month <= golarionCalendar.months.length; month++) {
      const monthLength = monthLengths[month - 1];

      if (tempRemainingDays < monthLength) {
        break;
      }

      tempRemainingDays -= monthLength;
    }

    const day = tempRemainingDays + 1;

    // Test actual method
    const actualResult = engine.daysToDate(365);
    expect(actualResult.year).toBe(year);
    expect(actualResult.month).toBe(month);
    expect(actualResult.day).toBe(day);
  });
});
