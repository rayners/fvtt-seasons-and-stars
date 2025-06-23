/**
 * PF2e Debug Investigation Test Suite
 *
 * This test suite investigates the exact calculations causing the
 * date synchronization mismatch between Seasons & Stars and PF2e World Clock.
 *
 * Issue: PF2e shows "Sunday, 21st of Lamashan, 4712 AR (04:59:30)"
 *        S&S shows "Toilday, 19th Abadius, 4714 AR 12:09:10"
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../src/types/calendar';
import * as fs from 'fs';
import * as path from 'path';

describe('PF2e Debug Investigation', () => {
  let golarionEngine: CalendarEngine;
  let golarionCalendar: SeasonsStarsCalendar;

  beforeEach(() => {
    // Load the actual Golarion calendar
    const calendarPath = path.join('calendars', 'golarion-pf2e.json');
    const calendarData = JSON.parse(fs.readFileSync(calendarPath, 'utf8'));
    golarionCalendar = calendarData;
    golarionEngine = new CalendarEngine(calendarData);
  });

  test('🔍 Debug worldTime=0 calculation (fresh world)', () => {
    console.log('\n=== DEBUGGING WORLDTIME=0 CALCULATION ===');

    const debugInfo = golarionEngine.debugWorldTimeInterpretation(0);

    console.log('Calendar Configuration:');
    console.log(`  ID: ${debugInfo.input.calendarId}`);
    console.log(`  Interpretation: ${debugInfo.input.interpretation}`);
    console.log(`  Epoch Year: ${debugInfo.input.epochYear}`);
    console.log(`  Current Year: ${debugInfo.input.currentYear}`);

    console.log('\nInput:');
    console.log(`  worldTime: ${debugInfo.input.worldTime}`);

    console.log('\nCalculations:');
    console.log(`  Adjusted worldTime: ${debugInfo.calculations.adjustedWorldTime}`);
    console.log(`  Adjustment delta: ${debugInfo.calculations.adjustmentDelta}`);
    console.log(`  Total seconds: ${debugInfo.calculations.totalSeconds}`);
    console.log(`  Seconds per day: ${debugInfo.calculations.secondsPerDay}`);
    console.log(`  Total days: ${debugInfo.calculations.totalDays}`);
    console.log(`  Seconds in day: ${debugInfo.calculations.secondsInDay}`);

    if (debugInfo.calculations.epochCalculation) {
      console.log('\nEpoch Calculation:');
      console.log(`  Year difference: ${debugInfo.calculations.epochCalculation.yearDifference}`);
      console.log(
        `  Total epoch offset: ${debugInfo.calculations.epochCalculation.totalEpochOffsetSeconds} seconds`
      );
      console.log(
        `  Year lengths:`,
        debugInfo.calculations.epochCalculation.yearLengths.slice(0, 5)
      );
    }

    console.log('\nResult:');
    console.log(`  Final date: ${debugInfo.result.formattedDate}`);
    console.log(`  Year: ${debugInfo.result.year} AR`);
    console.log(
      `  Month: ${debugInfo.result.month} (${golarionCalendar.months[debugInfo.result.month - 1]?.name})`
    );
    console.log(`  Day: ${debugInfo.result.day}`);
    console.log(
      `  Weekday: ${debugInfo.result.weekday} (${golarionCalendar.weekdays[debugInfo.result.weekday]?.name})`
    );

    // Expected: Should be around 4725 AR based on calendar config
    expect(debugInfo.result.year).toBeGreaterThan(4720);
    expect(debugInfo.result.year).toBeLessThan(4730);
  });

  test('🔍 Compare S&S vs approximate PF2e calculation', () => {
    console.log('\n=== COMPARING S&S VS PF2E CALCULATION ===');

    const comparison = golarionEngine.compareWithPF2eCalculation(0);

    console.log('Input worldTime:', comparison.worldTime);

    console.log('\nSeasons & Stars Result:');
    console.log(`  ${comparison.seasonsStars.formattedDate} AR`);
    console.log(`  Weekday: ${golarionCalendar.weekdays[comparison.seasonsStars.weekday]?.name}`);

    console.log('\nApproximate PF2e Calculation:');
    console.log(`  ${comparison.approximatePF2e.formattedDate} AR`);

    console.log('\nDifferences:');
    console.log(`  Year difference: ${comparison.differences.yearDiff} years`);
    console.log(`  Month difference: ${comparison.differences.monthDiff} months`);
    console.log(`  Day difference: ${comparison.differences.dayDiff} days`);
    console.log(`  Hour difference: ${comparison.differences.hourDiff} hours`);

    // Log the issue - these should be close but they're likely very different
    if (comparison.differences.yearDiff > 5) {
      console.log('⚠️  WARNING: Large year difference detected!');
      console.log('⚠️  This indicates a fundamental calculation mismatch');
    }
  });

  test('🔍 Test specific worldTime values that might reveal the issue', () => {
    console.log('\n=== TESTING SPECIFIC WORLDTIME VALUES ===');

    // Test several worldTime values to see patterns
    const testValues = [
      0, // Fresh world
      86400, // 1 day
      604800, // 1 week
      2592000, // 30 days
      31536000, // ~1 year
      63072000, // ~2 years
    ];

    testValues.forEach(worldTime => {
      const result = golarionEngine.worldTimeToDate(worldTime);
      const debugInfo = golarionEngine.debugWorldTimeInterpretation(worldTime);

      console.log(`\nworldTime=${worldTime} (${worldTime / 86400} days):`);
      console.log(
        `  Result: ${result.year}/${result.month}/${result.day} ${result.time?.hour}:${result.time?.minute}:${result.time?.second}`
      );
      console.log(`  Adjustment delta: ${debugInfo.calculations.adjustmentDelta}`);

      // Check if results make sense
      expect(result.year).toBeGreaterThan(2700); // Should be after epoch
      expect(result.month).toBeGreaterThanOrEqual(1);
      expect(result.month).toBeLessThanOrEqual(12);
      expect(result.day).toBeGreaterThanOrEqual(1);
      expect(result.day).toBeLessThanOrEqual(31);
    });
  });

  test('🔍 Debug bidirectional conversion accuracy', () => {
    console.log('\n=== TESTING BIDIRECTIONAL CONVERSION ACCURACY ===');

    // Test the exact date from user's bug report: "19th Abadius, 4714 AR"
    const problemDate = {
      year: 4714,
      month: 1, // Abadius
      day: 19,
      weekday: 0, // Will be calculated
      time: { hour: 12, minute: 9, second: 10 },
    };

    console.log('Testing problematic date conversion:');
    console.log(
      `Input: ${problemDate.year}/${problemDate.month}/${problemDate.day} ${problemDate.time.hour}:${problemDate.time.minute}:${problemDate.time.second}`
    );

    // Convert to worldTime
    const worldTime = golarionEngine.dateToWorldTime(problemDate);
    console.log(`Converts to worldTime: ${worldTime}`);

    // Convert back to date
    const roundTripDate = golarionEngine.worldTimeToDate(worldTime);
    console.log(
      `Converts back to: ${roundTripDate.year}/${roundTripDate.month}/${roundTripDate.day} ${roundTripDate.time?.hour}:${roundTripDate.time?.minute}:${roundTripDate.time?.second}`
    );

    // Debug the conversion
    const debugInfo = golarionEngine.debugWorldTimeInterpretation(worldTime);
    console.log(`Adjustment delta during conversion: ${debugInfo.calculations.adjustmentDelta}`);

    // Test round-trip accuracy
    expect(roundTripDate.year).toBe(problemDate.year);
    expect(roundTripDate.month).toBe(problemDate.month);
    expect(roundTripDate.day).toBe(problemDate.day);
    if (roundTripDate.time && problemDate.time) {
      expect(roundTripDate.time.hour).toBe(problemDate.time.hour);
      expect(roundTripDate.time.minute).toBe(problemDate.time.minute);
      expect(roundTripDate.time.second).toBe(problemDate.time.second);
    }
  });

  test('🔍 Analyze epoch offset calculation in detail', () => {
    console.log('\n=== ANALYZING EPOCH OFFSET CALCULATION ===');

    const debugInfo = golarionEngine.debugWorldTimeInterpretation(0);

    if (debugInfo.calculations.epochCalculation) {
      const epochCalc = debugInfo.calculations.epochCalculation;
      console.log(`Year difference: ${epochCalc.yearDifference} years`);
      console.log(`Total epoch offset: ${epochCalc.totalEpochOffsetSeconds} seconds`);
      console.log(`Total epoch offset: ${epochCalc.totalEpochOffsetSeconds / 86400} days`);
      console.log(
        `Total epoch offset: ${epochCalc.totalEpochOffsetSeconds / (86400 * 365.25)} years (approx)`
      );

      // Calculate expected vs actual
      const expectedYears = epochCalc.yearDifference;
      const actualYearOffset = epochCalc.totalEpochOffsetSeconds / (86400 * 365.25);

      console.log(`Expected year offset: ${expectedYears}`);
      console.log(`Calculated year offset: ${actualYearOffset}`);
      console.log(`Difference: ${Math.abs(expectedYears - actualYearOffset)} years`);

      // Show first few year calculations
      console.log('\nFirst 5 year calculations:');
      epochCalc.yearLengths.slice(0, 5).forEach((yearData: any) => {
        console.log(`  Year ${yearData.year}: ${yearData.days} days, ${yearData.seconds} seconds`);
      });

      // This might reveal if leap year calculations are wrong
      expect(Math.abs(expectedYears - actualYearOffset)).toBeLessThan(0.1); // Should be very close
    } else {
      console.log(
        'No epoch calculation found - calendar might be using epoch-based interpretation'
      );
    }
  });

  test('🔍 Test what PF2e World Clock might be expecting', () => {
    console.log('\n=== TESTING PF2E WORLD CLOCK EXPECTATIONS ===');

    // Based on user report: PF2e shows "Sunday, 21st of Lamashan, 4712 AR (04:59:30)"
    // Lamashan is the 10th month, so this is 4712/10/21 04:59:30

    const pf2eExpectedDate = {
      year: 4712,
      month: 10, // Lamashan
      day: 21,
      weekday: 6, // Sunday (if 0-indexed)
      time: { hour: 4, minute: 59, second: 30 },
    };

    console.log('PF2e expected date from user report:');
    console.log(
      `${pf2eExpectedDate.year}/${pf2eExpectedDate.month}/${pf2eExpectedDate.day} ${pf2eExpectedDate.time.hour}:${pf2eExpectedDate.time.minute}:${pf2eExpectedDate.time.second}`
    );
    console.log(`Month: ${golarionCalendar.months[pf2eExpectedDate.month - 1]?.name}`);
    console.log(`Weekday: ${golarionCalendar.weekdays[pf2eExpectedDate.weekday]?.name}`);

    // Convert this date to worldTime to see what PF2e might be using
    const pf2eWorldTime = golarionEngine.dateToWorldTime(pf2eExpectedDate);
    console.log(`This date converts to worldTime: ${pf2eWorldTime}`);

    // Now see what S&S produces for that worldTime
    const ssResult = golarionEngine.worldTimeToDate(pf2eWorldTime);
    console.log(`S&S converts worldTime ${pf2eWorldTime} to:`);
    console.log(
      `${ssResult.year}/${ssResult.month}/${ssResult.day} ${ssResult.time?.hour}:${ssResult.time?.minute}:${ssResult.time?.second}`
    );
    console.log(`Month: ${golarionCalendar.months[ssResult.month - 1]?.name}`);
    console.log(`Weekday: ${golarionCalendar.weekdays[ssResult.weekday]?.name}`);

    // Calculate the differences
    const yearDiff = Math.abs(ssResult.year - pf2eExpectedDate.year);
    const monthDiff = Math.abs(ssResult.month - pf2eExpectedDate.month);
    const dayDiff = Math.abs(ssResult.day - pf2eExpectedDate.day);

    console.log(`\nDifferences when using PF2e's implied worldTime:`);
    console.log(`Year difference: ${yearDiff}`);
    console.log(`Month difference: ${monthDiff}`);
    console.log(`Day difference: ${dayDiff}`);

    if (yearDiff === 0 && monthDiff === 0 && dayDiff === 0) {
      console.log('✅ Perfect match! The issue might be with how worldTime is being read');
    } else {
      console.log('⚠️ Still have differences - fundamental calculation issue');
    }
  });
});
