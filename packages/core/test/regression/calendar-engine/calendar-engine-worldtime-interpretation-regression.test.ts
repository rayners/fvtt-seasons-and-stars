/**
 * WorldTime Interpretation Regression Test Suite
 *
 * This test suite prevents regression of the universal worldTime interpretation solution
 * that fixes GitHub Issue #20 - PF2e Calendar Date Mismatch.
 *
 * CRITICAL: These tests ensure the calendar engine never returns to the broken state
 * where calendars were stuck at epoch regardless of worldTime values.
 *
 * Tests both epoch-based and real-time-based calendar interpretation modes and
 * verifies PF2e compatibility remains within acceptable bounds (<10 year difference).
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../../../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';
import { loadTestCalendar } from './utils/calendar-loader';

// Use the actual Golarion calendar JSON file as base instead of duplicating definitions
const baseGolarionCalendar: SeasonsStarsCalendar = loadTestCalendar('golarion-pf2e.json');

// Create test calendar variants based on the imported Golarion calendar
// Test calendar with epoch-based interpretation (traditional fantasy)
const epochBasedCalendar: SeasonsStarsCalendar = {
  ...baseGolarionCalendar,
  id: 'test-epoch-based',
  worldTime: {
    interpretation: 'epoch-based',
    epochYear: 2700,
    currentYear: 4710,
  },
  year: {
    ...baseGolarionCalendar.year,
    currentYear: 4710,
  },
};

// Test calendar with real-time-based interpretation (PF2e compatible)
const realTimeBasedCalendar: SeasonsStarsCalendar = {
  ...baseGolarionCalendar,
  id: 'test-real-time-based',
  worldTime: {
    interpretation: 'real-time-based',
    epochYear: 2700,
    currentYear: 4725,
  },
  year: {
    ...baseGolarionCalendar.year,
    currentYear: 4725,
  },
};

// Calendar without worldTime configuration (backward compatibility)
const legacyCalendar: SeasonsStarsCalendar = {
  ...baseGolarionCalendar,
  id: 'test-legacy',
  worldTime: undefined, // Remove worldTime to test legacy behavior
  year: {
    ...baseGolarionCalendar.year,
    currentYear: 4710,
  },
};

describe('WorldTime Interpretation Regression Tests', () => {
  let epochEngine: CalendarEngine;
  let realTimeEngine: CalendarEngine;
  let legacyEngine: CalendarEngine;

  beforeEach(() => {
    epochEngine = new CalendarEngine(epochBasedCalendar);
    realTimeEngine = new CalendarEngine(realTimeBasedCalendar);
    legacyEngine = new CalendarEngine(legacyCalendar);
  });

  test('✅ Epoch-based interpretation works correctly (traditional fantasy)', () => {
    // For epoch-based calendars, worldTime=0 should mean calendar epoch year
    const epochResult = epochEngine.worldTimeToDate(0);

    // One day later should advance
    const oneDayResult = epochEngine.worldTimeToDate(86400);

    // One year later - use 366 days for leap year 2700
    const oneYearResult = epochEngine.worldTimeToDate(31622400); // 366 days * 24 * 60 * 60

    // Verify epoch behavior
    expect(epochResult.year).toBe(2700);
    expect(epochResult.month).toBe(1);
    expect(epochResult.day).toBe(1);

    // Verify time advancement works
    expect(oneDayResult.day).toBe(2); // Next day
    expect(oneYearResult.year).toBe(2701); // Next year (after 366 days in leap year)
  });

  test('✅ Real-time-based interpretation works correctly (PF2e compatible)', () => {
    // For real-time-based calendars, worldTime=0 should mean currentYear
    const worldCreation = realTimeEngine.worldTimeToDate(0);

    // One day later
    const oneDayLater = realTimeEngine.worldTimeToDate(86400);

    // One year later
    const oneYearLater = realTimeEngine.worldTimeToDate(31536000);

    // Verify real-time behavior - should start near currentYear
    expect(worldCreation.year).toBeGreaterThanOrEqual(4724); // Near currentYear
    expect(worldCreation.year).toBeLessThanOrEqual(4725);

    // Verify time advancement works - handle month/year boundaries
    const worldCreationTotalDays =
      worldCreation.year * 365 + worldCreation.month * 30 + worldCreation.day;
    const oneDayLaterTotalDays = oneDayLater.year * 365 + oneDayLater.month * 30 + oneDayLater.day;
    expect(oneDayLaterTotalDays).toBeGreaterThan(worldCreationTotalDays); // Should advance overall
    expect(oneYearLater.year).toBeGreaterThan(worldCreation.year); // Should advance year
  });

  test('✅ PF2e compatibility achieved (year difference <10)', () => {
    // Simulate PF2e calculation (simplified)
    const currentYear = 2025; // Simulated current year
    const pf2eYear = currentYear + 2700; // PF2e calculation: real year + 2700 offset

    // S&S calculation with real-time-based calendar
    const ssDate = realTimeEngine.worldTimeToDate(0);

    // Calculate difference
    const yearDifference = Math.abs(pf2eYear - ssDate.year);

    // Verify compatibility achieved
    expect(yearDifference).toBeLessThan(10); // Should be close, not 2000+ years apart
  });

  test('✅ Backward compatibility preserved (legacy calendars default to epoch-based)', () => {
    // Legacy calendar (no worldTime config) should behave like epoch-based
    const legacyResult = legacyEngine.worldTimeToDate(0);
    const epochResult = epochEngine.worldTimeToDate(0);

    // Should produce same results
    expect(legacyResult.year).toBe(epochResult.year);
    expect(legacyResult.month).toBe(epochResult.month);
    expect(legacyResult.day).toBe(epochResult.day);
  });

  test('✅ Bidirectional conversion works correctly', () => {
    // Test epoch-based round-trip
    const epochTestDate = { year: 2701, month: 6, day: 15 };
    const epochWorldTime = epochEngine.dateToWorldTime(epochTestDate);
    const epochRoundTrip = epochEngine.worldTimeToDate(epochWorldTime);

    expect(epochRoundTrip.year).toBe(epochTestDate.year);
    expect(epochRoundTrip.month).toBe(epochTestDate.month);
    expect(epochRoundTrip.day).toBe(epochTestDate.day);

    // Test real-time-based round-trip
    const realTimeTestDate = { year: 4725, month: 6, day: 15 };
    const realTimeWorldTime = realTimeEngine.dateToWorldTime(realTimeTestDate);
    const realTimeRoundTrip = realTimeEngine.worldTimeToDate(realTimeWorldTime);

    expect(realTimeRoundTrip.year).toBe(realTimeTestDate.year);
    expect(realTimeRoundTrip.month).toBe(realTimeTestDate.month);
    expect(realTimeRoundTrip.day).toBe(realTimeTestDate.day);
  });

  test('✅ Universal solution works across interpretation modes', () => {
    // Test that both interpretations advance time correctly
    const testWorldTime = 86400 * 10; // 10 days

    const epochResult = epochEngine.worldTimeToDate(testWorldTime);
    const realTimeResult = realTimeEngine.worldTimeToDate(testWorldTime);

    // Both should advance 10 days from their respective starting points
    const epochStart = epochEngine.worldTimeToDate(0);
    const realTimeStart = realTimeEngine.worldTimeToDate(0);

    // Verify both engines advance time correctly - handle month/year boundaries
    const epochStartTotal = epochStart.year * 365 + epochStart.month * 30 + epochStart.day;
    const epochResultTotal = epochResult.year * 365 + epochResult.month * 30 + epochResult.day;
    const realTimeStartTotal =
      realTimeStart.year * 365 + realTimeStart.month * 30 + realTimeStart.day;
    const realTimeResultTotal =
      realTimeResult.year * 365 + realTimeResult.month * 30 + realTimeResult.day;

    expect(epochResultTotal).toBeGreaterThan(epochStartTotal);
    expect(realTimeResultTotal).toBeGreaterThan(realTimeStartTotal);

    // Years should be very different (epoch starts at 2700, real-time starts at ~4725)
    expect(Math.abs(epochResult.year - realTimeResult.year)).toBeGreaterThan(1000);
  });

  test('🐛 REGRESSION TEST: GitHub Issue #66 - Exact Pathfinder Time Calculation', () => {
    // Exact Pathfinder calendar configuration from the bug report
    const pathfinderCalendar: SeasonsStarsCalendar = {
      id: 'golarion-pf2e',
      worldTime: {
        interpretation: 'real-time-based',
        epochYear: 2700,
        currentYear: 4725,
      },
      year: {
        epoch: 2700,
        currentYear: 4725,
        startDay: 6,
      },
      leapYear: {
        rule: 'custom',
        interval: 4,
        month: 'Calistril',
        extraDays: 1,
      },
      months: [
        { name: 'Abadius', abbreviation: 'Aba', days: 31 },
        { name: 'Calistril', abbreviation: 'Cal', days: 28 },
        { name: 'Pharast', abbreviation: 'Pha', days: 31 },
        { name: 'Gozran', abbreviation: 'Goz', days: 30 },
        { name: 'Desnus', abbreviation: 'Des', days: 31 },
        { name: 'Sarenith', abbreviation: 'Sar', days: 30 },
        { name: 'Erastus', abbreviation: 'Era', days: 31 },
        { name: 'Arodus', abbreviation: 'Aro', days: 31 },
        { name: 'Rova', abbreviation: 'Rov', days: 30 },
        { name: 'Lamashan', abbreviation: 'Lam', days: 31 },
        { name: 'Neth', abbreviation: 'Net', days: 30 },
        { name: 'Kuthona', abbreviation: 'Kut', days: 31 },
      ],
      weekdays: [
        { name: 'Moonday', abbreviation: 'Mo' },
        { name: 'Toilday', abbreviation: 'To' },
        { name: 'Wealday', abbreviation: 'We' },
        { name: 'Oathday', abbreviation: 'Oa' },
        { name: 'Fireday', abbreviation: 'Fi' },
        { name: 'Starday', abbreviation: 'St' },
        { name: 'Sunday', abbreviation: 'Su' },
      ],
      intercalary: [],
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      },
    };

    const pathfinderEngine = new CalendarEngine(pathfinderCalendar);

    // Test Case 1: worldTime = 0 (fresh world)
    const result1 = pathfinderEngine.worldTimeToDate(0);

    // For real-time-based calendar with currentYear 4725, worldTime=0 should map to start of year 4725
    expect(result1.year).toBe(4725);
    expect(result1.month).toBe(1);
    expect(result1.day).toBe(1);
    expect(result1.time?.hour).toBe(0);
    expect(result1.time?.minute).toBe(0);
    expect(result1.time?.second).toBe(0);

    // Test Case 2: worldTime = 86400 (1 day)
    const result2 = pathfinderEngine.worldTimeToDate(86400);

    // 1 day after start of year 4725 should be 2nd day of first month
    expect(result2.year).toBe(4725);
    expect(result2.month).toBe(1);
    expect(result2.day).toBe(2);
    expect(result2.time?.hour).toBe(0);
    expect(result2.time?.minute).toBe(0);
    expect(result2.time?.second).toBe(0);

    // Test Case 3: worldTime = 37423 (10:23:43 on day 1)
    const result3 = pathfinderEngine.worldTimeToDate(37423);

    // Should be 10:23:43 on the first day of year 4725
    expect(result3.year).toBe(4725);
    expect(result3.month).toBe(1);
    expect(result3.day).toBe(1);
    expect(result3.time?.hour).toBe(10);
    expect(result3.time?.minute).toBe(23);
    expect(result3.time?.second).toBe(43);
  });

  test('🐛 REGRESSION TEST: Bidirectional Conversion Exactness', () => {
    const pathfinderCalendar: SeasonsStarsCalendar = {
      id: 'golarion-pf2e-test',
      worldTime: {
        interpretation: 'real-time-based',
        epochYear: 2700,
        currentYear: 4725,
      },
      year: {
        epoch: 2700,
        currentYear: 4725,
        startDay: 6,
      },
      leapYear: {
        rule: 'custom',
        interval: 4,
        month: 'Calistril',
        extraDays: 1,
      },
      months: [
        { name: 'Abadius', abbreviation: 'Aba', days: 31 },
        { name: 'Calistril', abbreviation: 'Cal', days: 28 },
        { name: 'Pharast', abbreviation: 'Pha', days: 31 },
        { name: 'Gozran', abbreviation: 'Goz', days: 30 },
        { name: 'Desnus', abbreviation: 'Des', days: 31 },
        { name: 'Sarenith', abbreviation: 'Sar', days: 30 },
        { name: 'Erastus', abbreviation: 'Era', days: 31 },
        { name: 'Arodus', abbreviation: 'Aro', days: 31 },
        { name: 'Rova', abbreviation: 'Rov', days: 30 },
        { name: 'Lamashan', abbreviation: 'Lam', days: 31 },
        { name: 'Neth', abbreviation: 'Net', days: 30 },
        { name: 'Kuthona', abbreviation: 'Kut', days: 31 },
      ],
      weekdays: [
        { name: 'Moonday', abbreviation: 'Mo' },
        { name: 'Toilday', abbreviation: 'To' },
        { name: 'Wealday', abbreviation: 'We' },
        { name: 'Oathday', abbreviation: 'Oa' },
        { name: 'Fireday', abbreviation: 'Fi' },
        { name: 'Starday', abbreviation: 'St' },
        { name: 'Sunday', abbreviation: 'Su' },
      ],
      intercalary: [],
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      },
    };

    const pathfinderEngine = new CalendarEngine(pathfinderCalendar);

    // Test exact date from the bug report: 19th of Desnus, 2024 AR (10:23:00)
    const testDate = {
      year: 2024,
      month: 5, // Desnus is 5th month
      day: 19,
      weekday: 0, // Will be calculated
      time: {
        hour: 10,
        minute: 23,
        second: 0,
      },
    };

    // Convert date to worldTime
    const worldTime = pathfinderEngine.dateToWorldTime(testDate);

    // Convert back to date
    const roundTripDate = pathfinderEngine.worldTimeToDate(worldTime);

    // Should be exactly the same
    expect(roundTripDate.year).toBe(testDate.year);
    expect(roundTripDate.month).toBe(testDate.month);
    expect(roundTripDate.day).toBe(testDate.day);
    expect(roundTripDate.time?.hour).toBe(testDate.time.hour);
    expect(roundTripDate.time?.minute).toBe(testDate.time.minute);
    expect(roundTripDate.time?.second).toBe(testDate.time.second);
  });

  test('🐛 REGRESSION TEST: Original GitHub Issue #20 Bug is Fixed', () => {
    // Test the exact scenario that was broken before our fix
    // Use the actual Golarion calendar (real-time-based) as it would be used in PF2e

    // Simulate the exact conditions from the bug report
    const worldTime = 0; // Fresh world creation
    const pf2eExpectedYear = 2025 + 2700; // 4725 AR (PF2e calculation method)

    const ssDate = realTimeEngine.worldTimeToDate(worldTime);

    // Before the fix: S&S would return 2700 AR (epoch) regardless of worldTime
    // After the fix: S&S should return a year close to PF2e's calculation (within 10 years)

    // CRITICAL: This test would have FAILED before our Phase 2 fix
    // The original bug was: ssDate.year === 2700 (always epoch)
    // Our fix ensures: ssDate.year ≈ pf2eExpectedYear (close to PF2e calculation)

    const yearDifference = Math.abs(pf2eExpectedYear - ssDate.year);

    // Verify the original bug is fixed
    expect(ssDate.year).not.toBe(2700); // Should NOT be stuck at epoch anymore
    expect(yearDifference).toBeLessThan(10); // Should be close to PF2e calculation
    expect(ssDate.year).toBeGreaterThan(4700); // Should be in reasonable modern Golarion timeframe

    // Additional verification: Test that time actually advances (core issue)
    const oneDayLater = realTimeEngine.worldTimeToDate(86400);
    const oneWeekLater = realTimeEngine.worldTimeToDate(86400 * 7);

    // Core bug verification: Calendar should advance time, not stay frozen
    const startTotal = ssDate.year * 365 + ssDate.month * 30 + ssDate.day;
    const dayTotal = oneDayLater.year * 365 + oneDayLater.month * 30 + oneDayLater.day;
    const weekTotal = oneWeekLater.year * 365 + oneWeekLater.month * 30 + oneWeekLater.day;

    expect(dayTotal).toBeGreaterThan(startTotal); // Time must advance
    expect(weekTotal).toBeGreaterThan(dayTotal); // Time must continue advancing
  });
});
