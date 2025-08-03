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

import { describe, test } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../src/types/calendar';
import { loadTestCalendar } from './utils/calendar-loader';

// Use the actual Golarion calendar JSON file instead of duplicating definitions
const golarionCalendar: SeasonsStarsCalendar = loadTestCalendar('golarion-pf2e.json');

describe('Leap Year Calculation Regression', () => {
  test('Check year 2700 length calculations', () => {
    const engine = new CalendarEngine(golarionCalendar);

    console.log('\n=== YEAR 2700 LENGTH ANALYSIS ===');

    // @ts-ignore - accessing private method
    const yearLength = engine.getYearLength(2700);
    console.log('getYearLength(2700):', yearLength);

    // @ts-ignore - accessing private method
    const monthLengths = engine.getMonthLengths(2700);
    console.log('getMonthLengths(2700):', monthLengths);

    const totalMonthDays = monthLengths.reduce((sum, days) => sum + days, 0);
    console.log('Sum of month lengths:', totalMonthDays);

    // @ts-ignore - accessing private method
    const isLeapYear = engine.isLeapYear(2700);
    console.log('isLeapYear(2700):', isLeapYear);

    // @ts-ignore - accessing private method
    const intercalaryDays = engine.getIntercalaryDays(2700);
    console.log('getIntercalaryDays(2700):', intercalaryDays);

    // Manual calculation
    const baseMonthDays = golarionCalendar.months.reduce((sum, m) => sum + m.days, 0);
    console.log('Base month days (from calendar def):', baseMonthDays);

    // Check leap year calculation
    const leapYearExtra = isLeapYear ? golarionCalendar.leapYear.extraDays || 1 : 0;
    console.log('Leap year extra days:', leapYearExtra);

    const expectedYearLength = baseMonthDays + leapYearExtra;
    console.log('Expected year length:', expectedYearLength);

    if (yearLength !== expectedYearLength) {
      console.log('❌ MISMATCH: getYearLength vs manual calculation');
    } else {
      console.log('✅ getYearLength matches manual calculation');
    }

    if (yearLength !== totalMonthDays) {
      console.log('❌ MISMATCH: getYearLength vs sum of getMonthLengths');
      console.log('This could cause the bug!');
    } else {
      console.log('✅ getYearLength matches sum of month lengths');
    }
  });

  test('Simulate the exact 365-day scenario', () => {
    const engine = new CalendarEngine(golarionCalendar);

    console.log('\n=== SIMULATING 365-DAY SCENARIO ===');

    // Simulate what happens with 365 days in daysToDate
    let year = 2700;
    let remainingDays = 365;

    // @ts-ignore
    const yearLength = engine.getYearLength(year);
    console.log('Starting year:', year);
    console.log('Starting remainingDays:', remainingDays);
    console.log('Year length:', yearLength);
    console.log('remainingDays >= yearLength?', remainingDays >= yearLength);
    console.log('Should advance to next year?', remainingDays >= yearLength ? 'YES' : 'NO');

    if (remainingDays >= yearLength) {
      remainingDays -= yearLength;
      year++;
      console.log('After year advancement: year =', year, ', remainingDays =', remainingDays);
    }

    // Now check month calculation
    // @ts-ignore
    const monthLengths = engine.getMonthLengths(year);
    console.log('\nMonth lengths for year', year, ':', monthLengths);

    let month = 1;
    let tempRemainingDays = remainingDays;

    for (month = 1; month <= golarionCalendar.months.length; month++) {
      const monthLength = monthLengths[month - 1];
      console.log(
        `Month ${month} (${golarionCalendar.months[month - 1].name}): ${monthLength} days`
      );
      console.log(`  RemainingDays: ${tempRemainingDays}, MonthLength: ${monthLength}`);
      console.log(`  tempRemainingDays < monthLength? ${tempRemainingDays < monthLength}`);

      if (tempRemainingDays < monthLength) {
        console.log(`  Breaking at month ${month}`);
        break;
      }

      tempRemainingDays -= monthLength;
      console.log(`  After subtracting: tempRemainingDays = ${tempRemainingDays}`);
    }

    const day = tempRemainingDays + 1;
    console.log(`\nFinal result: Year ${year}, Month ${month}, Day ${day}`);

    // Test actual method
    // @ts-ignore
    const actualResult = engine.daysToDate(365);
    console.log('Actual daysToDate(365):', actualResult);
  });
});
