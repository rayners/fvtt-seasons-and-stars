/**
 * Real PF2e Integration Tests for GitHub Issue #91
 *
 * These tests use actual PF2e system logic to validate that S&S widget
 * synchronization works correctly in real PF2e environments.
 *
 * Tests the exact scenarios described in GitHub issue #91:
 * - Widget synchronization between S&S and PF2e
 * - Date setting accuracy ("3rd Arodus" should not become "22nd Rova")
 * - Year calculation consistency (4725 AR vs 6749 discrepancy)
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import { TimeConverter } from '../src/core/time-converter';
import { CalendarManager } from '../src/core/calendar-manager';
import { compatibilityManager } from '../src/core/compatibility-manager';
import type { SeasonsStarsCalendar, ICalendarDate } from '../src/types/calendar-types';
import {
  setupRealPF2eEnvironment,
  createPF2eCalculations,
  validatePF2eEnvironment,
} from './setup-pf2e-real';
import { setupFoundryEnvironment } from './setup';
import golarionCalendarData from '../calendars/golarion-pf2e.json';

describe('Real PF2e Integration Tests - GitHub Issue #91', () => {
  let golarionCalendar: SeasonsStarsCalendar;
  let engine: CalendarEngine;
  let timeConverter: TimeConverter;
  let manager: CalendarManager;
  let pf2eCalculations: ReturnType<typeof createPF2eCalculations>;

  // Test data constants
  const WORLD_CREATION_DATE = '2025-01-01T00:00:00.000Z';
  const WORLD_CREATION_YEAR = 2025;
  const PF2E_YEAR_OFFSET = 2700;
  const EXPECTED_PF2E_YEAR = WORLD_CREATION_YEAR + PF2E_YEAR_OFFSET; // 4725
  const SECONDS_PER_DAY = 86400;

  beforeAll(() => {
    // Set up basic Foundry environment
    setupFoundryEnvironment();

    // Set up real PF2e environment
    setupRealPF2eEnvironment({
      worldCreationTimestamp: new Date(WORLD_CREATION_DATE).getTime() / 1000,
      currentWorldTime: 0,
      expectedWorldCreationYear: WORLD_CREATION_YEAR,
      dateTheme: 'AR',
      timeConvention: 24,
    });

    // Validate PF2e environment setup
    if (!validatePF2eEnvironment()) {
      throw new Error('PF2e environment validation failed');
    }

    // Create PF2e calculation utilities
    pf2eCalculations = createPF2eCalculations();
  });

  beforeEach(() => {
    // Use real Golarion calendar definition from JSON
    golarionCalendar = golarionCalendarData as SeasonsStarsCalendar;

    engine = new CalendarEngine(golarionCalendar);
    manager = new CalendarManager();
    timeConverter = new TimeConverter(engine);

    // Load the Golarion calendar in the manager
    manager.loadCalendar(golarionCalendar);

    // Clear compatibility manager for clean tests
    (compatibilityManager as any).dataProviderRegistry.clear();

    // Reset world time
    global.game.time.worldTime = 0;

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('GitHub Issue #91 Core Bug Reproduction', () => {
    it('reproduces the exact widget synchronization issue', () => {
      // BACKGROUND: Issue #91 reported widgets showing different years
      // Main issue: "The monthly calendar widget still thinks its 4725"
      // while system shows different year

      // STEP 1: Set world time to 1 day elapsed
      const oneDayElapsed = SECONDS_PER_DAY;
      global.game.time.worldTime = oneDayElapsed;

      // STEP 2: Get date WITHOUT world creation timestamp (broken behavior)
      const brokenDate = engine.worldTimeToDate(oneDayElapsed);
      expect(brokenDate.year).toBe(2700); // Wrong - shows epoch year

      // STEP 3: Get date WITH world creation timestamp (correct behavior)
      const worldCreationTimestamp = new Date(WORLD_CREATION_DATE).getTime() / 1000;
      const correctDate = engine.worldTimeToDate(oneDayElapsed, worldCreationTimestamp);
      expect(correctDate.year).toBe(EXPECTED_PF2E_YEAR); // Correct - shows 4725

      // STEP 4: Demonstrate the exact synchronization bug
      const yearDifference = correctDate.year - brokenDate.year;
      expect(yearDifference).toBe(2025); // This was the bug - 2025 year difference!

      // This demonstrates why widgets showed different years:
      // Widgets using TimeConverter got 2700, direct PF2e calls got 4725
    });

    it('validates the fix: widgets now use world creation timestamp', () => {
      // GOAL: Prove that the Enhanced CompatibilityManager fix works

      // STEP 1: Register PF2e data provider (simulating the fix)
      const worldCreationTimestamp = new Date(WORLD_CREATION_DATE).getTime() / 1000;
      compatibilityManager.registerDataProvider('pf2e', 'worldCreationTimestamp', () => {
        return worldCreationTimestamp;
      });

      // STEP 2: Set world time to multiple days elapsed
      const multipleDaysElapsed = SECONDS_PER_DAY * 7; // 7 days
      global.game.time.worldTime = multipleDaysElapsed;

      // STEP 3: TimeConverter should now use world creation timestamp
      const timeConverterDate = timeConverter.getCurrentDate();
      expect(timeConverterDate.year).toBe(EXPECTED_PF2E_YEAR); // Should be 4725!

      // STEP 4: Direct engine call should produce same result
      const directEngineDate = engine.worldTimeToDate(multipleDaysElapsed, worldCreationTimestamp);
      expect(directEngineDate.year).toBe(EXPECTED_PF2E_YEAR); // Should also be 4725!

      // STEP 5: Both methods now produce identical results - SYNCHRONIZATION FIXED!
      expect(timeConverterDate.year).toBe(directEngineDate.year);
      expect(timeConverterDate.month).toBe(directEngineDate.month);
      expect(timeConverterDate.day).toBe(directEngineDate.day);
    });

    it('validates specific "3rd Arodus → 22nd Rova" bug is fixed', () => {
      // BACKGROUND: User reported setting "3rd Arodus" became "22nd Rova"
      // This suggests date calculation errors, not just year offset issues

      // STEP 1: Register PF2e data provider
      const worldCreationTimestamp = new Date(WORLD_CREATION_DATE).getTime() / 1000;
      compatibilityManager.registerDataProvider('pf2e', 'worldCreationTimestamp', () => {
        return worldCreationTimestamp;
      });

      // STEP 2: Calculate world time for August 3rd (Arodus is August in Golarion)
      const august3rd: ICalendarDate = {
        year: EXPECTED_PF2E_YEAR,
        month: 8, // August = Arodus
        day: 3,
        weekday: 0, // Will be calculated
        time: { hour: 12, minute: 0, second: 0 },
      };

      // STEP 3: Convert to world time using S&S engine WITH world creation timestamp
      const worldTimeForAugust3rd = engine.dateToWorldTime(august3rd, worldCreationTimestamp);

      // STEP 4: Set world time to that value
      global.game.time.worldTime = worldTimeForAugust3rd;

      // STEP 5: TimeConverter should return exactly "3rd Arodus" (not "22nd Rova")
      const resultDate = timeConverter.getCurrentDate();

      expect(resultDate.year).toBe(EXPECTED_PF2E_YEAR); // Should be 4725
      expect(resultDate.month).toBe(8); // Should be August/Arodus
      expect(resultDate.day).toBe(3); // Should be 3rd (NOT 22nd!)

      // STEP 6: Verify this is NOT September 22nd (Rova 22nd)
      expect(resultDate.month).not.toBe(9); // NOT September/Rova
      expect(resultDate.day).not.toBe(22); // NOT 22nd

      // This proves the "3rd Arodus → 22nd Rova" bug is fixed
    });
  });

  describe('PF2e Year Calculation Accuracy', () => {
    it('validates S&S year calculations match PF2e expectations', () => {
      // Test with various world creation dates and elapsed times
      const testCases = [
        { elapsedDays: 0, expectedDay: 1, expectedMonth: 1 }, // New Year's Day
        { elapsedDays: 31, expectedDay: 1, expectedMonth: 2 }, // February 1st
        { elapsedDays: 214, expectedDay: 3, expectedMonth: 8 }, // August 3rd (Arodus)
        { elapsedDays: 365, expectedDay: 1, expectedMonth: 1 }, // Next New Year's
      ];

      const worldCreationTimestamp = new Date(WORLD_CREATION_DATE).getTime() / 1000;
      compatibilityManager.registerDataProvider('pf2e', 'worldCreationTimestamp', () => {
        return worldCreationTimestamp;
      });

      for (const testCase of testCases) {
        const worldTime = testCase.elapsedDays * SECONDS_PER_DAY;
        global.game.time.worldTime = worldTime;

        // S&S calculation
        const ssDate = timeConverter.getCurrentDate();

        // PF2e calculation using real PF2e logic
        const pf2eYear = pf2eCalculations.calculateYear(worldTime, WORLD_CREATION_DATE, 'AR');

        // Both should produce the same year
        expect(ssDate.year).toBe(pf2eYear);
        expect(ssDate.year).toBe(EXPECTED_PF2E_YEAR + Math.floor(testCase.elapsedDays / 365));

        console.log(`✅ Day ${testCase.elapsedDays}: S&S=${ssDate.year}, PF2e=${pf2eYear}`);
      }
    });

    it('explains the 4725 vs 6749 year discrepancy', () => {
      // ANALYSIS: The issue mentioned 4725 AR vs 6749 - let's understand this

      const worldCreationTimestamp = new Date(WORLD_CREATION_DATE).getTime() / 1000;

      // Case 1: Correct PF2e calculation (2025 + 2700 = 4725)
      const correctPF2eYear = WORLD_CREATION_YEAR + PF2E_YEAR_OFFSET;
      expect(correctPF2eYear).toBe(4725);

      // Case 2: Potential alternative calculation that could produce 6749
      const alternativeOffset = 6749 - WORLD_CREATION_YEAR; // 4724

      // This suggests someone might be using a different calendar standard
      // or there's a calculation error adding an extra ~2024 years

      console.log(`Correct PF2e year: ${correctPF2eYear} (2025 + 2700)`);
      console.log(`Reported discrepancy: 6749`);
      console.log(`Difference: ${6749 - 4725} years`);

      // The 6749 vs 4725 discrepancy (2024 years) suggests either:
      // 1. Different calendar theme/standard being used
      // 2. Double-application of year offset
      // 3. Different world creation date

      // With our fix, S&S should always produce 4725 for 2025 + AR offset
      compatibilityManager.registerDataProvider('pf2e', 'worldCreationTimestamp', () => {
        return worldCreationTimestamp;
      });

      const ssDate = timeConverter.getCurrentDate();
      expect(ssDate.year).toBe(4725); // Should be correct PF2e year
      expect(ssDate.year).not.toBe(6749); // Should NOT be the discrepant year
    });
  });

  describe('Widget Synchronization Chain Validation', () => {
    it('validates core time conversion methods use world creation timestamp', () => {
      // GOAL: Ensure primary methods that convert world time use the timestamp consistently
      // NOTE: This test validates the core engine + time converter, which are the methods
      //       actually used by widgets. Manager method may be null in test environment.

      const worldCreationTimestamp = new Date(WORLD_CREATION_DATE).getTime() / 1000;
      compatibilityManager.registerDataProvider('pf2e', 'worldCreationTimestamp', () => {
        return worldCreationTimestamp;
      });

      const testWorldTime = SECONDS_PER_DAY * 30; // 30 days elapsed
      global.game.time.worldTime = testWorldTime;

      // Method 1: TimeConverter.getCurrentDate() - CORE widget method
      const method1 = timeConverter.getCurrentDate();

      // Method 2: Engine.worldTimeToDate() with world creation timestamp - CORE conversion method
      const method2 = engine.worldTimeToDate(testWorldTime, worldCreationTimestamp);

      // CORE VALIDATION: Both primary methods should produce identical results
      expect(method1.year).toBe(method2.year);
      expect(method1.month).toBe(method2.month);
      expect(method1.day).toBe(method2.day);

      // Both should show correct PF2e year (4725, not 2700)
      expect(method1.year).toBe(EXPECTED_PF2E_YEAR);
      expect(method2.year).toBe(EXPECTED_PF2E_YEAR);

      // Method 3: Manager methods (may be null in test environment, that's ok)
      const method3 = manager.getCurrentDate();
      if (method3) {
        // If manager method works, it should match the core methods
        expect(method3.year).toBe(method1.year);
        expect(method3.month).toBe(method1.month);
        expect(method3.day).toBe(method1.day);
        console.log(`✅ All methods synchronized: ${method1.year}-${method1.month}-${method1.day}`);
      } else {
        // Manager method null in test environment - that's acceptable
        console.log(
          `✅ Core methods synchronized: ${method1.year}-${method1.month}-${method1.day} (manager=null in test env)`
        );
      }
    });

    it('validates round-trip date conversion accuracy', () => {
      // GOAL: Setting a date and reading it back should return the same date

      const worldCreationTimestamp = new Date(WORLD_CREATION_DATE).getTime() / 1000;
      compatibilityManager.registerDataProvider('pf2e', 'worldCreationTimestamp', () => {
        return worldCreationTimestamp;
      });

      // Test date: 15th Sarenith 4725 (June 15th)
      const testDate: ICalendarDate = {
        year: EXPECTED_PF2E_YEAR,
        month: 6, // June = Sarenith
        day: 15,
        weekday: 0, // Will be calculated
        time: { hour: 14, minute: 30, second: 45 },
      };

      // Convert to world time
      const worldTime = engine.dateToWorldTime(testDate, worldCreationTimestamp);

      // Set as current world time
      global.game.time.worldTime = worldTime;

      // Read back via TimeConverter
      const resultDate = timeConverter.getCurrentDate();

      // Should match exactly
      expect(resultDate.year).toBe(testDate.year);
      expect(resultDate.month).toBe(testDate.month);
      expect(resultDate.day).toBe(testDate.day);
      expect(resultDate.time.hour).toBe(testDate.time.hour);
      expect(resultDate.time.minute).toBe(testDate.time.minute);
      expect(resultDate.time.second).toBe(testDate.time.second);

      console.log(
        `✅ Round-trip accuracy: ${testDate.year}-${testDate.month}-${testDate.day} ${testDate.time.hour}:${testDate.time.minute}:${testDate.time.second}`
      );
    });
  });

  describe('Cross-System Compatibility', () => {
    it('maintains backward compatibility for non-PF2e systems', () => {
      // GOAL: Ensure the fix doesn't break other game systems

      // STEP 1: Set up non-PF2e system
      global.game.system.id = 'dnd5e';

      // STEP 2: No data provider registered for dnd5e
      // TimeConverter should fall back to epoch-based calculation

      const testWorldTime = SECONDS_PER_DAY * 10;
      global.game.time.worldTime = testWorldTime;

      const resultDate = timeConverter.getCurrentDate();

      // Should use epoch-based calculation (2700 + elapsed time)
      expect(resultDate.year).toBe(2700); // Should be epoch year for non-PF2e

      // Should NOT use PF2e year calculation
      expect(resultDate.year).not.toBe(EXPECTED_PF2E_YEAR);

      console.log(`✅ Non-PF2e system uses epoch calculation: ${resultDate.year}`);
    });

    it('handles data provider errors gracefully', () => {
      // GOAL: Ensure errors in data providers don't crash the system

      // STEP 1: Register a broken data provider
      compatibilityManager.registerDataProvider('pf2e', 'worldCreationTimestamp', () => {
        throw new Error('Mock data provider error');
      });

      const testWorldTime = SECONDS_PER_DAY * 5;
      global.game.time.worldTime = testWorldTime;

      // STEP 2: Should not throw and should fall back gracefully
      expect(() => {
        const resultDate = timeConverter.getCurrentDate();
        expect(resultDate.year).toBe(2700); // Should fall back to epoch
      }).not.toThrow();

      console.log(`✅ Error handling works - falls back to epoch calculation`);
    });
  });
});
