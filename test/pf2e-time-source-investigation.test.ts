/**
 * Critical PF2e Time Source Investigation
 *
 * This test investigates the exact cause of the date mismatch between
 * Seasons & Stars and PF2e World Clock:
 * - S&S: "Starday, 1st Pharast, 4725 AR"
 * - PF2e: "Wealday, 6th of Arodus, 4725 AR"
 *
 * Root causes to investigate:
 * 1. Time source reading from PF2e
 * 2. Real-time-based interpretation with massive epoch offset
 * 3. Missing synchronization between systems
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import { TimeConverter } from '../src/core/time-converter';
import { compatibilityManager } from '../src/core/compatibility-manager';
import { PF2eIntegration } from '../src/integrations/pf2e-integration';
import type { SeasonsStarsCalendar } from '../src/types/calendar';
import * as fs from 'fs';
import * as path from 'path';

describe('PF2e Time Source Investigation', () => {
  let golarionCalendar: SeasonsStarsCalendar;
  let engine: CalendarEngine;
  let timeConverter: TimeConverter;
  let pf2eIntegration: PF2eIntegration;

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
        get: vi.fn().mockReturnValue('golarion-pf2e'),
      },
    };

    // Reset PF2e integration
    (PF2eIntegration as any).instance = null;
    pf2eIntegration = PF2eIntegration.initialize();
  });

  test('🔍 Investigate real-time interpretation impact', () => {
    console.log('\n=== REAL-TIME INTERPRETATION INVESTIGATION ===');

    // Test worldTime=0 with current calendar config
    const resultWithRealTime = engine.worldTimeToDate(0);

    console.log('Current Configuration:');
    console.log(`  Calendar ID: ${golarionCalendar.id}`);
    console.log(`  Interpretation: ${golarionCalendar.worldTime?.interpretation}`);
    console.log(`  Epoch Year: ${golarionCalendar.worldTime?.epochYear}`);
    console.log(`  Current Year: ${golarionCalendar.worldTime?.currentYear}`);

    console.log('\nResult with real-time interpretation (worldTime=0):');
    console.log(`  Date: ${resultWithRealTime.formattedLong}`);
    console.log(`  Year: ${resultWithRealTime.year}`);
    console.log(
      `  Month: ${resultWithRealTime.month} (${golarionCalendar.months[resultWithRealTime.month - 1]?.name})`
    );
    console.log(`  Day: ${resultWithRealTime.day}`);

    // Temporarily modify calendar to use epoch-based interpretation
    const modifiedCalendar = {
      ...golarionCalendar,
      worldTime: {
        ...golarionCalendar.worldTime,
        interpretation: 'epoch-based' as const,
      },
    };
    const epochEngine = new CalendarEngine(modifiedCalendar);
    const resultWithEpochBased = epochEngine.worldTimeToDate(0);

    console.log('\nResult with epoch-based interpretation (worldTime=0):');
    console.log(`  Date: ${resultWithEpochBased.formattedLong}`);
    console.log(`  Year: ${resultWithEpochBased.year}`);
    console.log(
      `  Month: ${resultWithEpochBased.month} (${golarionCalendar.months[resultWithEpochBased.month - 1]?.name})`
    );
    console.log(`  Day: ${resultWithEpochBased.day}`);

    const yearDifference = resultWithRealTime.year - resultWithEpochBased.year;
    console.log(`\nInterpretation Impact:`);
    console.log(`  Year difference: ${yearDifference} years`);
    console.log(`  This means real-time interpretation adds ${yearDifference} years to dates`);

    // The dramatic difference comes from real-time interpretation
    expect(yearDifference).toBeGreaterThan(2000);
    expect(resultWithRealTime.year).toBe(4725);
    expect(resultWithEpochBased.year).toBe(2700);
  });

  test('🔍 Test PF2e time source detection and reading', () => {
    console.log('\n=== PF2E TIME SOURCE DETECTION ===');

    // Simulate different PF2e time sources
    const mockTimeScenarios = [
      {
        name: 'No PF2e time source',
        setup: () => {
          delete (global as any).game.pf2e;
          delete (global as any).game.worldClock;
        },
        expectedTime: null,
      },
      {
        name: 'PF2e worldClock available',
        setup: () => {
          (global as any).game.pf2e = {
            settings: {
              worldClock: {
                worldCreatedOn: '2020-01-01T00:00:00.000Z', // Test creation date
                dateTheme: 'AR',
              },
            },
          };
          (global as any).game.time = { worldTime: 50000000 }; // Test elapsed time
        },
        expectedTime: 1627836800, // Unix timestamp (1577836800) + elapsed time (50000000)
      },
      {
        name: 'PF2e worldClock without worldCreatedOn',
        setup: () => {
          (global as any).game.pf2e = {
            settings: {
              worldClock: {
                dateTheme: 'AR',
                // worldCreatedOn is missing
              },
            },
          };
        },
        expectedTime: null, // Should return null when worldCreatedOn is missing
      },
    ];

    mockTimeScenarios.forEach(scenario => {
      console.log(`\nTesting: ${scenario.name}`);
      scenario.setup();

      const pf2eTime = pf2eIntegration.getPF2eWorldTime();
      console.log(`  PF2e integration result: ${pf2eTime}`);

      expect(pf2eTime).toBe(scenario.expectedTime);
    });

    // Test compatibility manager registration
    console.log('\nTesting compatibility manager time source:');
    const compatTime = compatibilityManager.getExternalTimeSource('pf2e');
    console.log(`  Compatibility manager result: ${compatTime}`);

    // Should be null because time source function isn't registered yet
    expect(compatTime).toBe(null);
  });

  test('🔍 Test user-reported date scenarios', () => {
    console.log('\n=== USER-REPORTED DATE SCENARIOS ===');

    // User reports S&S shows "1st Pharast, 4725 AR" (month 3)
    // User reports PF2e shows "6th of Arodus, 4725 AR" (month 8)

    console.log('Analyzing user-reported S&S date: "1st Pharast, 4725 AR"');
    const ssDate = {
      year: 4725,
      month: 3, // Pharast
      day: 1,
      weekday: 5, // Starday
      time: { hour: 0, minute: 0, second: 0 },
    };

    // Convert this to worldTime to see what S&S is using
    const ssWorldTime = engine.dateToWorldTime(ssDate);
    console.log(`  S&S implied worldTime: ${ssWorldTime}`);

    console.log('\nAnalyzing user-reported PF2e date: "6th of Arodus, 4725 AR"');
    const pf2eDate = {
      year: 4725,
      month: 8, // Arodus
      day: 6,
      weekday: 2, // Wealday
      time: { hour: 0, minute: 0, second: 0 },
    };

    const pf2eWorldTime = engine.dateToWorldTime(pf2eDate);
    console.log(`  PF2e implied worldTime: ${pf2eWorldTime}`);

    const worldTimeDifference = pf2eWorldTime - ssWorldTime;
    console.log(`\nWorldTime difference: ${worldTimeDifference} seconds`);
    console.log(`  That's ${worldTimeDifference / 86400} days`);
    console.log(`  Or about ${(worldTimeDifference / 86400 / 30).toFixed(1)} months`);

    // The key insight: they're using different worldTime values entirely
    expect(Math.abs(worldTimeDifference)).toBeGreaterThan(86400 * 30); // At least 30 days different
  });

  test('🔍 Simulate actual PF2e World Clock behavior', () => {
    console.log('\n=== SIMULATING PF2E WORLD CLOCK BEHAVIOR ===');

    // Based on user report, let's assume PF2e World Clock is using Foundry's worldTime
    // but interpreting it without the real-time offset

    const foundryWorldTime = 50000000; // Some example worldTime
    (global as any).game.time.worldTime = foundryWorldTime;

    console.log(`Testing with Foundry worldTime: ${foundryWorldTime}`);

    // What S&S currently shows (with real-time interpretation)
    const ssResult = engine.worldTimeToDate(foundryWorldTime);
    console.log('\nS&S result (with real-time interpretation):');
    console.log(`  ${ssResult.formattedLong}`);
    console.log(`  Year: ${ssResult.year}`);
    console.log(
      `  Month: ${ssResult.month} (${golarionCalendar.months[ssResult.month - 1]?.name})`
    );

    // What PF2e might show (without real-time interpretation)
    const modifiedCalendar = {
      ...golarionCalendar,
      worldTime: {
        ...golarionCalendar.worldTime,
        interpretation: 'epoch-based' as const,
      },
    };
    const epochEngine = new CalendarEngine(modifiedCalendar);
    const pf2eSimulated = epochEngine.worldTimeToDate(foundryWorldTime);
    console.log('\nSimulated PF2e result (epoch-based):');
    console.log(`  ${pf2eSimulated.formattedLong}`);
    console.log(`  Year: ${pf2eSimulated.year}`);
    console.log(
      `  Month: ${pf2eSimulated.month} (${golarionCalendar.months[pf2eSimulated.month - 1]?.name})`
    );

    const yearGap = ssResult.year - pf2eSimulated.year;
    console.log(`\nYear gap: ${yearGap} years`);
    console.log('This confirms that the interpretation difference is the root cause');

    expect(yearGap).toBe(2025); // 4725 - 2700 = 2025 years
  });

  test('🔍 Test time converter with different time sources', () => {
    console.log('\n=== TIME CONVERTER WITH DIFFERENT SOURCES ===');

    // Test 1: Using Foundry worldTime only
    console.log('Test 1: Foundry worldTime only');
    (global as any).game.time.worldTime = 10000000;
    const foundryResult = timeConverter.getCurrentDate();
    console.log(`  Result: ${foundryResult.formattedLong}`);
    console.log(`  Year: ${foundryResult.year}`);

    // Test 2: Register external PF2e time source
    console.log('\nTest 2: With external PF2e time source');
    compatibilityManager.registerTimeSource('pf2e', () => 20000000);
    const externalResult = timeConverter.getCurrentDate();
    console.log(`  Result: ${externalResult.formattedLong}`);
    console.log(`  Year: ${externalResult.year}`);

    // The time converter should use external source when available
    console.log(`\nVerifying different years: ${foundryResult.year} vs ${externalResult.year}`);
    expect(foundryResult.year).not.toBe(externalResult.year);
  });

  test('🎯 SOLUTION TEST: Verify PF2e time synchronization fix', () => {
    console.log('\n=== SOLUTION VERIFICATION: PF2E TIME SYNC FIX ===');

    // Simulate the user's scenario where PF2e World Clock shows different date
    // PF2e shows: "Wealday, 6th of Arodus, 4725 AR"
    // S&S should show the same when using PF2e time source

    // Step 1: Calculate what worldTime PF2e might be using for "6th of Arodus, 4725 AR"
    const pf2eExpectedDate = {
      year: 4725,
      month: 8, // Arodus
      day: 6,
      weekday: 2, // Wealday
      time: { hour: 0, minute: 0, second: 0 },
    };

    // Create an epoch-based engine to simulate PF2e's calculation approach
    const epochBasedCalendar = {
      ...golarionCalendar,
      worldTime: {
        ...golarionCalendar.worldTime,
        interpretation: 'epoch-based' as const,
      },
    };
    const epochEngine = new CalendarEngine(epochBasedCalendar);
    const pf2eImpliedWorldTime = epochEngine.dateToWorldTime(pf2eExpectedDate);

    console.log('PF2e expected date: "Wealday, 6th of Arodus, 4725 AR"');
    console.log(`PF2e implied worldTime: ${pf2eImpliedWorldTime}`);

    // Step 2: Set up S&S to use this external time source
    console.log('\nSetting up S&S with PF2e time source...');

    // Reset any existing time sources
    compatibilityManager.registerTimeSource('pf2e', () => pf2eImpliedWorldTime);

    // Step 3: Get S&S result using external time source
    const ssResult = timeConverter.getCurrentDate();

    console.log('\nS&S result with PF2e time source:');
    console.log(`  Date: ${ssResult.formattedLong}`);
    console.log(`  Year: ${ssResult.year}`);
    console.log(
      `  Month: ${ssResult.month} (${golarionCalendar.months[ssResult.month - 1]?.name})`
    );
    console.log(`  Day: ${ssResult.day}`);
    console.log(`  Weekday: ${golarionCalendar.weekdays[ssResult.weekday]?.name}`);

    // Step 4: Verify synchronization
    console.log('\nSynchronization check:');
    console.log(`  Expected: Wealday, 6th of Arodus, 4725 AR`);
    console.log(
      `  S&S shows: ${golarionCalendar.weekdays[ssResult.weekday]?.name}, ${ssResult.day}th of ${golarionCalendar.months[ssResult.month - 1]?.name}, ${ssResult.year} AR`
    );

    // With external time source and disabled real-time interpretation,
    // S&S should show the same date as PF2e
    expect(ssResult.year).toBe(pf2eExpectedDate.year);
    expect(ssResult.month).toBe(pf2eExpectedDate.month);
    expect(ssResult.day).toBe(pf2eExpectedDate.day);
    expect(ssResult.weekday).toBe(pf2eExpectedDate.weekday);

    console.log('\n✅ SUCCESS: S&S now shows identical date to PF2e World Clock!');
  });
});
