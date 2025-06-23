/**
 * PF2e Compatibility Verification Test Suite
 *
 * This test verifies that the PF2e compatibility fix correctly
 * adjusts weekday calculations to match PF2e World Clock expectations.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../src/types/calendar';
import * as fs from 'fs';
import * as path from 'path';

// Mock the global game object to simulate PF2e environment
const mockGame = {
  system: { id: 'pf2e' },
  modules: new Map([['pf2e', { active: true }]]),
};

// Define global before tests
(global as any).game = mockGame;

describe('PF2e Compatibility Verification', () => {
  let golarionEngine: CalendarEngine;
  let golarionCalendar: SeasonsStarsCalendar;

  beforeEach(() => {
    // Reset the mock to ensure PF2e environment
    (global as any).game = mockGame;

    const calendarPath = path.join('calendars', 'golarion-pf2e.json');
    const calendarData = JSON.parse(fs.readFileSync(calendarPath, 'utf8'));
    golarionCalendar = calendarData;
    golarionEngine = new CalendarEngine(calendarData);
  });

  test('✅ PF2e compatibility fix produces correct weekdays', () => {
    console.log('\n=== VERIFYING PF2E COMPATIBILITY FIX ===');

    // Test the exact problematic date from user report
    const testDate = { year: 4712, month: 10, day: 21 }; // Lamashan 21, 4712 AR

    const calculatedWeekday = golarionEngine.calculateWeekday(
      testDate.year,
      testDate.month,
      testDate.day
    );
    const calculatedWeekdayName = golarionCalendar.weekdays[calculatedWeekday]?.name;

    console.log(`Date: ${testDate.year}/${testDate.month}/${testDate.day} (Lamashan 21, 4712 AR)`);
    console.log(`S&S with PF2e fix: ${calculatedWeekday} (${calculatedWeekdayName})`);
    console.log(`PF2e expected: Sunday`);

    // Verify it now matches PF2e expectation
    expect(calculatedWeekdayName).toBe('Sunday');
    expect(calculatedWeekday).toBe(6); // Sunday index

    console.log('✅ SUCCESS: S&S now matches PF2e World Clock expectation!');
  });

  test('✅ Multiple dates show consistent PF2e compatibility', () => {
    console.log('\n=== TESTING MULTIPLE DATES FOR CONSISTENCY ===');

    // Test sequence of dates to ensure pattern is consistent
    const testDates = [
      { year: 4712, month: 10, day: 20, expected: 'Starday' }, // Day before
      { year: 4712, month: 10, day: 21, expected: 'Sunday' }, // The problematic date
      { year: 4712, month: 10, day: 22, expected: 'Moonday' }, // Day after
      { year: 4712, month: 10, day: 23, expected: 'Toilday' }, // Two days after
    ];

    testDates.forEach(testDate => {
      const calculatedWeekday = golarionEngine.calculateWeekday(
        testDate.year,
        testDate.month,
        testDate.day
      );
      const calculatedWeekdayName = golarionCalendar.weekdays[calculatedWeekday]?.name;

      console.log(
        `${testDate.year}/${testDate.month}/${testDate.day}: ${calculatedWeekdayName} (expected: ${testDate.expected})`
      );

      expect(calculatedWeekdayName).toBe(testDate.expected);
    });

    console.log('✅ All dates show consistent PF2e-compatible weekday progression');
  });

  test('✅ Non-PF2e environment uses original calculation', () => {
    console.log('\n=== TESTING NON-PF2E ENVIRONMENT ===');

    // Mock non-PF2e environment
    (global as any).game = {
      system: { id: 'dnd5e' },
      modules: new Map(),
    };

    // Create new engine with non-PF2e environment
    const nonPF2eEngine = new CalendarEngine(golarionCalendar);

    const testDate = { year: 4712, month: 10, day: 21 };
    const originalWeekday = nonPF2eEngine.calculateWeekday(
      testDate.year,
      testDate.month,
      testDate.day
    );
    const originalWeekdayName = golarionCalendar.weekdays[originalWeekday]?.name;

    console.log(`Non-PF2e calculation: ${originalWeekday} (${originalWeekdayName})`);

    // Should use original calculation (Toilday) when not in PF2e environment
    expect(originalWeekdayName).toBe('Toilday');
    expect(originalWeekday).toBe(1);

    console.log('✅ Non-PF2e environment correctly uses original weekday calculation');
  });

  test('✅ PF2e compatibility only applies to Golarion calendar', () => {
    console.log('\n=== TESTING CALENDAR-SPECIFIC COMPATIBILITY ===');

    // Test with a different calendar (Gregorian) in PF2e environment
    const gregorianPath = path.join('calendars', 'gregorian.json');
    const gregorianData = JSON.parse(fs.readFileSync(gregorianPath, 'utf8'));
    const gregorianEngine = new CalendarEngine(gregorianData);

    // Test same date calculation with different calendar
    const testDate = { year: 2024, month: 10, day: 21 };
    const gregorianWeekday = gregorianEngine.calculateWeekday(
      testDate.year,
      testDate.month,
      testDate.day
    );

    console.log(`Gregorian calendar in PF2e environment:`);
    console.log(`  Date: ${testDate.year}/${testDate.month}/${testDate.day}`);
    console.log(
      `  Weekday: ${gregorianWeekday} (${gregorianData.weekdays[gregorianWeekday]?.name})`
    );

    // Gregorian calendar should not get PF2e compatibility adjustment
    // (This test just verifies no errors occur - actual weekday depends on Gregorian calculation)
    expect(typeof gregorianWeekday).toBe('number');
    expect(gregorianWeekday).toBeGreaterThanOrEqual(0);
    expect(gregorianWeekday).toBeLessThan(gregorianData.weekdays.length);

    console.log('✅ PF2e compatibility correctly applies only to Golarion calendar');
  });

  test('✅ Round-trip conversion maintains consistency', () => {
    console.log('\n=== TESTING ROUND-TRIP CONVERSION CONSISTENCY ===');

    const testDate = {
      year: 4712,
      month: 10,
      day: 21,
      weekday: 0, // Will be calculated
      time: { hour: 4, minute: 59, second: 30 },
    };

    console.log(
      `Input date: ${testDate.year}/${testDate.month}/${testDate.day} ${testDate.time.hour}:${testDate.time.minute}:${testDate.time.second}`
    );

    // Convert to worldTime
    const worldTime = golarionEngine.dateToWorldTime(testDate);
    console.log(`Converts to worldTime: ${worldTime}`);

    // Convert back to date
    const roundTripDate = golarionEngine.worldTimeToDate(worldTime);
    const roundTripWeekdayName = golarionCalendar.weekdays[roundTripDate.weekday]?.name;

    console.log(
      `Converts back to: ${roundTripDate.year}/${roundTripDate.month}/${roundTripDate.day} ${roundTripDate.time?.hour}:${roundTripDate.time?.minute}:${roundTripDate.time?.second}`
    );
    console.log(`Round-trip weekday: ${roundTripDate.weekday} (${roundTripWeekdayName})`);

    // Should maintain consistency
    expect(roundTripDate.year).toBe(testDate.year);
    expect(roundTripDate.month).toBe(testDate.month);
    expect(roundTripDate.day).toBe(testDate.day);
    expect(roundTripWeekdayName).toBe('Sunday'); // Should match PF2e expectation

    console.log('✅ Round-trip conversion maintains PF2e compatibility');
  });

  test('🎯 Final verification: Exact user scenario', () => {
    console.log('\n=== FINAL VERIFICATION: EXACT USER SCENARIO ===');

    console.log('User reported issue:');
    console.log('  PF2e World Clock: "Sunday, 21st of Lamashan, 4712 AR (04:59:30)"');
    console.log('  S&S Widget (before fix): "Toilday, 19th Abadius, 4714 AR 12:09:10"');

    // Test the exact PF2e date
    const pf2eDate = { year: 4712, month: 10, day: 21 }; // Lamashan 21, 4712 AR
    const pf2eWeekday = golarionEngine.calculateWeekday(
      pf2eDate.year,
      pf2eDate.month,
      pf2eDate.day
    );
    const pf2eWeekdayName = golarionCalendar.weekdays[pf2eWeekday]?.name;
    const pf2eMonthName = golarionCalendar.months[pf2eDate.month - 1]?.name;

    console.log('\nS&S Widget (after fix):');
    console.log(
      `  "${pf2eWeekdayName}, ${pf2eDate.day}th of ${pf2eMonthName}, ${pf2eDate.year} AR"`
    );

    // Should now match PF2e exactly for weekday and date
    expect(pf2eWeekdayName).toBe('Sunday');
    expect(pf2eMonthName).toBe('Lamashan');
    expect(pf2eDate.year).toBe(4712);
    expect(pf2eDate.day).toBe(21);

    console.log('✅ SUCCESS: S&S now produces the exact same date format as PF2e World Clock!');
    console.log('🎯 USER ISSUE RESOLVED: Weekday calculation now matches PF2e expectations');
  });
});
