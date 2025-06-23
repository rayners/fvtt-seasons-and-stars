/**
 * PF2e Date Synchronization Fix Test
 *
 * This test verifies the fix for the critical PF2e date mismatch issue where:
 * - Seasons & Stars showed: "Starday, 1st Pharast, 4725 AR"
 * - PF2e World Clock showed: "Wealday, 6th of Arodus, 4725 AR"
 *
 * The fix disables real-time interpretation when external time sources are active,
 * allowing S&S to synchronize with PF2e's time calculations.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import { TimeConverter } from '../src/core/time-converter';
import { compatibilityManager } from '../src/core/compatibility-manager';
import type { SeasonsStarsCalendar } from '../src/types/calendar';
import * as fs from 'fs';
import * as path from 'path';

describe('PF2e Date Synchronization Fix', () => {
  let golarionCalendar: SeasonsStarsCalendar;
  let engine: CalendarEngine;
  let timeConverter: TimeConverter;

  beforeEach(() => {
    // Load Golarion calendar
    const calendarPath = path.join('calendars', 'golarion-pf2e.json');
    golarionCalendar = JSON.parse(fs.readFileSync(calendarPath, 'utf8'));
    engine = new CalendarEngine(golarionCalendar);
    timeConverter = new TimeConverter(engine);

    // Set up PF2e environment
    (global as any).game = {
      system: { id: 'pf2e' },
      time: { worldTime: 0 },
      user: { isGM: false },
      settings: {
        get: () => 'golarion-pf2e',
      },
    };

    // Clear any external time sources from previous tests
    // Access the private timeSourceRegistry to clear it
    (compatibilityManager as any).timeSourceRegistry.clear();
  });

  test('🎯 FIX VERIFICATION: External time source disables real-time interpretation', () => {
    console.log('\n=== FIX VERIFICATION: REAL-TIME INTERPRETATION CONTROL ===');

    const testWorldTime = 50000000; // Some test worldTime value

    // Test 1: Without external time source (real-time interpretation active)
    console.log('Test 1: Without external time source (real-time interpretation active)');
    const withoutExternal = engine.worldTimeToDate(testWorldTime);
    console.log(
      `  Result: ${withoutExternal.year}/${withoutExternal.month}/${withoutExternal.day}`
    );
    console.log(`  Year: ${withoutExternal.year} (real-time interpretation adds ~2025 years)`);

    // Test 2: With external time source (real-time interpretation disabled)
    console.log('\nTest 2: With external time source (real-time interpretation disabled)');
    compatibilityManager.registerTimeSource('pf2e', () => testWorldTime);
    const withExternal = engine.worldTimeToDate(testWorldTime);
    console.log(`  Result: ${withExternal.year}/${withExternal.month}/${withExternal.day}`);
    console.log(`  Year: ${withExternal.year} (real-time interpretation disabled)`);

    // The key fix: years should be dramatically different
    const yearDifference = withoutExternal.year - withExternal.year;
    console.log(`\nYear difference: ${yearDifference} years`);
    console.log('This confirms that external time sources disable real-time interpretation');

    expect(yearDifference).toBeGreaterThan(2000); // Should be around 2025 years
  });

  test('🔧 SYNCHRONIZATION TEST: S&S matches PF2e when using external time', () => {
    console.log('\n=== SYNCHRONIZATION TEST: S&S ↔ PF2e MATCHING ===');

    // Simulate the exact scenario from user report
    // User reported PF2e shows: "Wealday, 6th of Arodus, 4725 AR"
    const pf2eReportedDate = {
      year: 4725,
      month: 8, // Arodus
      day: 6,
      weekday: 2, // Wealday (0-indexed)
      time: { hour: 0, minute: 0, second: 0 },
    };

    console.log('User-reported PF2e date: "Wealday, 6th of Arodus, 4725 AR"');
    console.log(
      `  Parsed as: ${pf2eReportedDate.year}/${pf2eReportedDate.month}/${pf2eReportedDate.day}`
    );

    // Step 1: Calculate what worldTime PF2e must be using for this date
    // We need to use epoch-based interpretation to simulate PF2e's calculation
    const epochBasedCalendar = {
      ...golarionCalendar,
      worldTime: {
        ...golarionCalendar.worldTime,
        interpretation: 'epoch-based' as const,
      },
    };
    const epochEngine = new CalendarEngine(epochBasedCalendar);
    const pf2eWorldTime = epochEngine.dateToWorldTime(pf2eReportedDate);

    console.log(`\nPF2e implied worldTime: ${pf2eWorldTime}`);
    console.log('(calculated using epoch-based interpretation to simulate PF2e behavior)');

    // Step 2: Set up S&S to use this as an external time source
    console.log('\nSetting up S&S with PF2e external time source...');
    compatibilityManager.registerTimeSource('pf2e', () => pf2eWorldTime);

    // Step 3: Get S&S result
    const ssResult = timeConverter.getCurrentDate();

    console.log('\nS&S result with external PF2e time:');
    console.log(`  Date: ${ssResult.year}/${ssResult.month}/${ssResult.day}`);
    console.log(`  Month: ${golarionCalendar.months[ssResult.month - 1]?.name}`);
    console.log(`  Weekday: ${golarionCalendar.weekdays[ssResult.weekday]?.name}`);
    console.log(
      `  Formatted: "${golarionCalendar.weekdays[ssResult.weekday]?.name}, ${ssResult.day}th of ${golarionCalendar.months[ssResult.month - 1]?.name}, ${ssResult.year} AR"`
    );

    console.log('\nComparison:');
    console.log(`  PF2e shows:  "Wealday, 6th of Arodus, 4725 AR"`);
    console.log(
      `  S&S shows:   "${golarionCalendar.weekdays[ssResult.weekday]?.name}, ${ssResult.day}th of ${golarionCalendar.months[ssResult.month - 1]?.name}, ${ssResult.year} AR"`
    );

    // Verify exact synchronization
    expect(ssResult.year).toBe(pf2eReportedDate.year);
    expect(ssResult.month).toBe(pf2eReportedDate.month);
    expect(ssResult.day).toBe(pf2eReportedDate.day);
    expect(ssResult.weekday).toBe(pf2eReportedDate.weekday);

    console.log('\n✅ SUCCESS: Seasons & Stars now shows identical date to PF2e World Clock!');
  });

  test('📊 BEFORE/AFTER COMPARISON: Demonstrating the fix impact', () => {
    console.log('\n=== BEFORE/AFTER COMPARISON ===');

    const testWorldTime = 63072000; // 2 years worth of seconds

    // Create fresh engines to avoid cross-test contamination
    const beforeEngine = new CalendarEngine(golarionCalendar);

    // BEFORE: S&S with real-time interpretation (old behavior)
    console.log('BEFORE (old behavior): S&S with real-time interpretation');
    const beforeResult = beforeEngine.worldTimeToDate(testWorldTime);
    console.log(`  S&S showed: ${beforeResult.year}/${beforeResult.month}/${beforeResult.day}`);
    console.log(`  Year: ${beforeResult.year} AR`);

    // Simulate what PF2e would show for the same worldTime
    const epochBasedCalendar = {
      ...golarionCalendar,
      worldTime: {
        ...golarionCalendar.worldTime,
        interpretation: 'epoch-based' as const,
      },
    };
    const epochEngine = new CalendarEngine(epochBasedCalendar);
    const pf2eSimulated = epochEngine.worldTimeToDate(testWorldTime);
    console.log(`  PF2e showed: ${pf2eSimulated.year}/${pf2eSimulated.month}/${pf2eSimulated.day}`);
    console.log(`  Year: ${pf2eSimulated.year} AR`);

    const beforeGap = Math.abs(beforeResult.year - pf2eSimulated.year);
    console.log(`  ❌ Year gap: ${beforeGap} years (PROBLEM!)`);

    // AFTER: S&S with external time source (new behavior)
    console.log('\nAFTER (fixed behavior): S&S with external time source');

    // Create a fresh compatibility manager setup for this test
    const afterEngine = new CalendarEngine(golarionCalendar);
    compatibilityManager.registerTimeSource('pf2e', () => testWorldTime);
    const afterResult = afterEngine.worldTimeToDate(testWorldTime);
    console.log(`  S&S shows: ${afterResult.year}/${afterResult.month}/${afterResult.day}`);
    console.log(`  Year: ${afterResult.year} AR`);
    console.log(`  PF2e shows: ${pf2eSimulated.year}/${pf2eSimulated.month}/${pf2eSimulated.day}`);
    console.log(`  Year: ${pf2eSimulated.year} AR`);

    const afterGap = Math.abs(afterResult.year - pf2eSimulated.year);
    console.log(`  ✅ Year gap: ${afterGap} years (FIXED!)`);

    // Verify the fix
    expect(beforeGap).toBeGreaterThan(2000); // Large gap before fix
    expect(afterGap).toBe(0); // No gap after fix
    expect(afterResult.year).toBe(pf2eSimulated.year);
    expect(afterResult.month).toBe(pf2eSimulated.month);
    expect(afterResult.day).toBe(pf2eSimulated.day);

    console.log(
      `\n🎯 FIX IMPACT: Reduced date mismatch from ${beforeGap} years to ${afterGap} years!`
    );
  });
});
