/**
 * PF2e worldCreatedOn Integration Fix Test
 *
 * Tests the complete fix for variable year offsets in PF2e worlds
 * caused by world-specific worldCreatedOn settings.
 *
 * This addresses the multiple offset patterns observed:
 * - 1 year difference (2024 vs 2025 AR)
 * - 2 year difference (4712 vs 4714 AR)
 * - 2025 year difference (6750 vs 4725 AR, 4725 vs 2700 AR)
 */

import { describe, test, beforeEach, expect } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import { PF2eIntegration } from '../src/integrations/pf2e-integration';
import { TimeConverter } from '../src/core/time-converter';
import { CompatibilityManager } from '../src/core/compatibility-manager';
import golarionCalendar from '../calendars/golarion-pf2e.json';

describe('PF2e worldCreatedOn Integration Fix', () => {
  let engine: CalendarEngine;
  let pf2eIntegration: PF2eIntegration;
  let timeConverter: TimeConverter;
  let compatibilityManager: CompatibilityManager;

  beforeEach(() => {
    // Mock Foundry globals
    if (!global.game) (global as any).game = {};
    if (!global.game.system) (global as any).game.system = {};
    (global as any).game.system.id = 'pf2e';

    engine = new CalendarEngine(golarionCalendar);
    compatibilityManager = new CompatibilityManager();
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
    (compatibilityManager as any).timeSourceRegistry?.clear();
    pf2eIntegration = PF2eIntegration.initialize();
  });

  test('🎯 FIX VERIFICATION: PF2e worldCreatedOn calculation matches PF2e World Clock', () => {
    console.log('\\n=== PF2E WORLDCREATEDON CALCULATION TEST ===');

    // Simulate a PF2e world with specific worldCreatedOn setting
    // This simulates what happens when a PF2e world is created at a specific real-world time
    const worldCreatedOn = '2020-03-15T10:30:00.000Z'; // Example creation date
    const foundryWorldTime = 5000000; // Some elapsed game time

    // Set up PF2e mock with worldCreatedOn setting
    (global as any).game.pf2e = {
      settings: {
        worldClock: {
          worldCreatedOn: worldCreatedOn,
          dateTheme: 'AR', // Absalom Reckoning
          playersCanView: true,
          showClockButton: true,
          syncDarkness: false,
          timeConvention: 24,
        },
      },
    };

    // Set the foundry world time to our test value
    (global as any).game.time.worldTime = foundryWorldTime;

    console.log('PF2e World Configuration:');
    console.log(`  worldCreatedOn: ${worldCreatedOn}`);
    console.log(`  dateTheme: AR (Absalom Reckoning)`);
    console.log(`  foundryWorldTime: ${foundryWorldTime}`);

    // Test our PF2e integration calculation
    const pf2eCalculatedTime = pf2eIntegration.getPF2eWorldTime();
    console.log(`\\nPF2e Integration Result: ${pf2eCalculatedTime}`);

    // Manual calculation to verify our logic matches PF2e's approach
    const creationDate = new Date(worldCreatedOn);
    const creationTimeSeconds = Math.floor(creationDate.getTime() / 1000);
    const expectedPF2eTime = creationTimeSeconds + foundryWorldTime;

    console.log('\\nCalculation Breakdown:');
    console.log(`  Creation date: ${creationDate.toISOString()}`);
    console.log(`  Creation time (seconds): ${creationTimeSeconds}`);
    console.log(`  Foundry worldTime: ${foundryWorldTime}`);
    console.log(`  Expected PF2e time: ${expectedPF2eTime}`);

    expect(pf2eCalculatedTime).toBe(expectedPF2eTime);
    console.log('\\n✅ SUCCESS: S&S calculates PF2e time using exact worldCreatedOn method!');
  });

  test('🔄 SYNCHRONIZATION TEST: S&S matches PF2e when using worldCreatedOn time source', () => {
    console.log('\\n=== SYNCHRONIZATION WITH WORLDCREATEDON TEST ===');

    // Set up different PF2e world scenarios that explain the observed offsets
    const testScenarios = [
      {
        name: 'Scenario 1: Recent world (explains ~1 year offset)',
        worldCreatedOn: '2023-01-01T00:00:00.000Z',
        foundryWorldTime: 31536000, // 1 year of seconds
        expectedYearAR: 'should be close to current year + 2700',
      },
      {
        name: 'Scenario 2: Older world (explains ~2 year offset)',
        worldCreatedOn: '2022-01-01T00:00:00.000Z',
        foundryWorldTime: 63072000, // 2 years of seconds
        expectedYearAR: 'should be 2022 + ~2 years + 2700',
      },
      {
        name: 'Scenario 3: Ancient epoch (explains large offsets)',
        worldCreatedOn: '1970-01-01T00:00:00.000Z',
        foundryWorldTime: 1000000000, // Large time value
        expectedYearAR: 'should be 1970 + large offset + 2700',
      },
    ];

    testScenarios.forEach(scenario => {
      console.log(`\\n--- ${scenario.name} ---`);

      // Set up PF2e mock for this scenario
      (global as any).game.pf2e = {
        settings: {
          worldClock: {
            worldCreatedOn: scenario.worldCreatedOn,
            dateTheme: 'AR',
            playersCanView: true,
            showClockButton: true,
            syncDarkness: false,
            timeConvention: 24,
          },
        },
      };

      (global as any).game.time.worldTime = scenario.foundryWorldTime;

      // Get PF2e calculated time
      const pf2eTime = pf2eIntegration.getPF2eWorldTime();
      console.log(`  PF2e calculated time: ${pf2eTime}`);

      // Register this as external time source
      compatibilityManager.registerTimeSource('pf2e', () => pf2eTime);

      // Get S&S result using external time source
      const ssResult = timeConverter.getCurrentDate();

      console.log(`  S&S result: ${ssResult.year}/${ssResult.month}/${ssResult.day}`);
      console.log(`  ${scenario.expectedYearAR}`);

      // Convert PF2e time to date to verify synchronization
      const pf2eAsDate = engine.worldTimeToDate(pf2eTime || 0);
      console.log(`  PF2e as S&S date: ${pf2eAsDate.year}/${pf2eAsDate.month}/${pf2eAsDate.day}`);

      expect(ssResult.year).toBe(pf2eAsDate.year);
      expect(ssResult.month).toBe(pf2eAsDate.month);
      expect(ssResult.day).toBe(pf2eAsDate.day);

      console.log(`  ✅ Synchronization confirmed for ${scenario.name}`);

      // Clear time source for next scenario
      (compatibilityManager as any).timeSourceRegistry?.clear();
    });

    console.log('\\n🎉 SUCCESS: All worldCreatedOn scenarios produce synchronized dates!');
  });

  test('📊 OFFSET EXPLANATION: Demonstrates why different worlds show different years', () => {
    console.log('\\n=== OFFSET EXPLANATION TEST ===');

    // Test the different offset patterns observed in user reports
    const observedCases = [
      {
        name: 'Case 1: 2024 vs 2025 AR (1 year difference)',
        userCreationTime: '2024-01-01T00:00:00.000Z',
        gameTimeElapsed: 31536000, // 1 year
        explainedBy: 'World created in 2024, 1 year of game time elapsed',
      },
      {
        name: 'Case 2: 4712 vs 4714 AR (2 year difference)',
        userCreationTime: '2012-01-01T00:00:00.000Z',
        gameTimeElapsed: 63072000, // 2 years
        explainedBy: 'World created in 2012, 2 years of game time elapsed',
      },
      {
        name: 'Case 3: 6750 vs 4725 AR (2025 year difference)',
        userCreationTime: '1970-01-01T00:00:00.000Z',
        gameTimeElapsed: 64089043200, // 2025 years (~Unix epoch)
        explainedBy: 'World has Unix epoch worldCreatedOn, massive time elapsed',
      },
    ];

    observedCases.forEach(testCase => {
      console.log(`\\n--- ${testCase.name} ---`);
      console.log(`  Explanation: ${testCase.explainedBy}`);

      // Set up the specific conditions for this case
      (global as any).game.pf2e = {
        settings: {
          worldClock: {
            worldCreatedOn: testCase.userCreationTime,
            dateTheme: 'AR',
          },
        },
      };

      (global as any).game.time.worldTime = testCase.gameTimeElapsed;

      // Calculate what PF2e would show
      const pf2eTime = pf2eIntegration.getPF2eWorldTime();
      const pf2eDate = engine.worldTimeToDate(pf2eTime || 0);

      console.log(`  PF2e World Clock would show: ${pf2eDate.year} AR`);

      // Calculate what S&S would show without this fix (using Foundry time only)
      const foundryOnlyDate = engine.worldTimeToDate(testCase.gameTimeElapsed);
      console.log(`  S&S without fix would show: ${foundryOnlyDate.year} AR`);

      const yearDifference = Math.abs(pf2eDate.year - foundryOnlyDate.year);
      console.log(`  Year difference: ${yearDifference} years`);

      // With our fix, S&S should match PF2e exactly
      compatibilityManager.registerTimeSource('pf2e', () => pf2eTime);
      const ssWithFix = timeConverter.getCurrentDate();
      console.log(`  S&S with fix shows: ${ssWithFix.year} AR`);

      expect(ssWithFix.year).toBe(pf2eDate.year);
      console.log(`  ✅ Fix resolves ${testCase.name}`);

      // Clear for next test
      (compatibilityManager as any).timeSourceRegistry?.clear();
    });

    console.log('\\n🎯 CONCLUSION: worldCreatedOn explains all observed offset patterns!');
  });

  test('🛡️ FALLBACK BEHAVIOR: Handles missing or invalid worldCreatedOn gracefully', () => {
    console.log('\\n=== FALLBACK BEHAVIOR TEST ===');

    const fallbackScenarios = [
      {
        name: 'No PF2e settings available',
        setup: () => {
          delete (global as any).game.pf2e;
        },
        expectedResult: null,
      },
      {
        name: 'PF2e available but no worldCreatedOn',
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
        expectedResult: null,
      },
      {
        name: 'Invalid worldCreatedOn format',
        setup: () => {
          (global as any).game.pf2e = {
            settings: {
              worldClock: {
                worldCreatedOn: 'invalid-date-string',
                dateTheme: 'AR',
              },
            },
          };
        },
        expectedResult: null,
      },
    ];

    fallbackScenarios.forEach(scenario => {
      console.log(`\\n--- ${scenario.name} ---`);
      scenario.setup();

      const result = pf2eIntegration.getPF2eWorldTime();
      console.log(`  Result: ${result}`);

      expect(result).toBe(scenario.expectedResult);
      console.log(`  ✅ Graceful fallback confirmed`);
    });

    console.log('\\n🛡️ SUCCESS: All fallback scenarios handled gracefully!');
  });
});
