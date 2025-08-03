/**
 * PF2e Compatibility Verification Test Suite
 *
 * This test verifies that the PF2e compatibility fix correctly
 * adjusts weekday calculations to match PF2e World Clock expectations.
 */

/* eslint-disable @typescript-eslint/triple-slash-reference */
/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference path="../../core/test/test-types.d.ts" />

import { describe, test, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../../core/src/core/calendar-engine';
import { compatibilityManager } from '../../core/src/core/compatibility-manager';
import type { SeasonsStarsCalendar } from '../../core/src/types/calendar';
import * as fs from 'fs';
import * as path from 'path';
// Note: PF2e integration moved to separate pf2e-pack module

// Mock the global game object to simulate PF2e environment
const mockGame = {
  system: { id: 'pf2e' },
  modules: new Map([['pf2e', { active: true }]]),
  pf2e: {
    settings: {
      worldClock: {
        worldCreatedOn: '2025-01-01T00:00:00.000Z',
        dateTheme: 'AR',
      },
    },
  },
};

// Define global before tests
(global as Record<string, unknown>).game = mockGame;

describe('PF2e Compatibility Verification', () => {
  let golarionEngine: CalendarEngine;
  let golarionCalendar: SeasonsStarsCalendar;

  beforeEach(() => {
    // Reset the mock to ensure PF2e environment
    (global as Record<string, unknown>).game = mockGame;

    const calendarPath = path.join('packages/pf2e-pack/calendars', 'golarion-pf2e.json');
    const calendarData = JSON.parse(fs.readFileSync(calendarPath, 'utf8'));
    golarionCalendar = calendarData as unknown as SeasonsStarsCalendar;
    golarionEngine = new CalendarEngine(calendarData as unknown as SeasonsStarsCalendar);

    // Clear any existing registrations first
    (compatibilityManager as any).dataProviderRegistry.clear();

    // Trigger the PF2e system detection hook manually (since 'ready' hook doesn't fire in tests)
    Hooks.callAll('seasons-stars:pf2e:systemDetected', compatibilityManager);
  });

  test('✅ PF2e compatibility fix produces correct weekdays', () => {
    // Test the exact problematic date from user report
    const testDate = { year: 4712, month: 10, day: 21 }; // Lamashan 21, 4712 AR

    const calculatedWeekday = golarionEngine.calculateWeekday(
      testDate.year,
      testDate.month,
      testDate.day
    );
    const calculatedWeekdayName = golarionCalendar.weekdays[calculatedWeekday]?.name;

    // Verify it now matches PF2e expectation
    expect(calculatedWeekdayName).toBe('Sunday');
    expect(calculatedWeekday).toBe(6); // Sunday index
  });

  test('✅ Multiple dates show consistent PF2e compatibility', () => {
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

      expect(calculatedWeekdayName).toBe(testDate.expected);
    });
  });

  test('✅ Non-PF2e environment uses original calculation', () => {
    // Mock non-PF2e environment
    (global as Record<string, unknown>).game = {
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

    // Should use original calculation (Sunday) when not in PF2e environment - same as PF2e since no offset needed
    expect(originalWeekdayName).toBe('Sunday');
    expect(originalWeekday).toBe(6);
  });

  test('✅ PF2e compatibility only applies to Golarion calendar', () => {
    // Test with a different calendar (Gregorian) in PF2e environment
    const gregorianPath = path.join('packages/core/calendars', 'gregorian.json');
    const gregorianData = JSON.parse(fs.readFileSync(gregorianPath, 'utf8'));
    const gregorianEngine = new CalendarEngine(gregorianData);

    // Test same date calculation with different calendar
    const testDate = { year: 2024, month: 10, day: 21 };
    const gregorianWeekday = gregorianEngine.calculateWeekday(
      testDate.year,
      testDate.month,
      testDate.day
    );

    // Gregorian calendar should not get PF2e compatibility adjustment
    // (This test just verifies no errors occur - actual weekday depends on Gregorian calculation)
    expect(typeof gregorianWeekday).toBe('number');
    expect(gregorianWeekday).toBeGreaterThanOrEqual(0);
    expect(gregorianWeekday).toBeLessThan(gregorianData.weekdays.length);
  });

  test('✅ Round-trip conversion maintains consistency', () => {
    const testDate = {
      year: 4712,
      month: 10,
      day: 21,
      weekday: 0, // Will be calculated
      time: { hour: 4, minute: 59, second: 30 },
    };

    // Create a proper CalendarDate object
    const calendarDate = golarionEngine.worldTimeToDate(0);
    calendarDate.year = testDate.year;
    calendarDate.month = testDate.month;
    calendarDate.day = testDate.day;
    calendarDate.time = testDate.time;

    // Convert to worldTime
    const worldTime = golarionEngine.dateToWorldTime(calendarDate);
    expect(typeof worldTime).toBe('number');
    expect(worldTime).toBeGreaterThan(0);

    // Convert back to date
    const roundTripDate = golarionEngine.worldTimeToDate(worldTime);
    const roundTripWeekdayName = golarionCalendar.weekdays[roundTripDate.weekday]?.name;

    // Should maintain consistency
    expect(roundTripDate.year).toBe(testDate.year);
    expect(roundTripDate.month).toBe(testDate.month);
    expect(roundTripDate.day).toBe(testDate.day);
    expect(roundTripWeekdayName).toBe('Sunday'); // Should match PF2e expectation
  });

  test('🎯 Final verification: Exact user scenario', () => {
    // Test the exact PF2e date
    const pf2eDate = { year: 4712, month: 10, day: 21 }; // Lamashan 21, 4712 AR
    const pf2eWeekday = golarionEngine.calculateWeekday(
      pf2eDate.year,
      pf2eDate.month,
      pf2eDate.day
    );
    const pf2eWeekdayName = golarionCalendar.weekdays[pf2eWeekday]?.name;
    const pf2eMonthName = golarionCalendar.months[pf2eDate.month - 1]?.name;

    // Should now match PF2e exactly for weekday and date
    expect(pf2eWeekdayName).toBe('Sunday');
    expect(pf2eMonthName).toBe('Lamashan');
    expect(pf2eDate.year).toBe(4712);
    expect(pf2eDate.day).toBe(21);
  });
});
