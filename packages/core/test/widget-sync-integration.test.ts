/**
 * Widget Synchronization Integration Tests
 *
 * Tests for the GitHub #91 comment issue where widgets show different years
 * after date changes. This tests the integration between time converter
 * and widgets when world creation timestamps are involved.
 *
 * Updated for Enhanced CompatibilityManager Data Registry pattern.
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import { TimeConverter } from '../src/core/time-converter';
import { compatibilityManager } from '../src/core/compatibility-manager';
import type { SeasonsStarsCalendar } from '../src/types/calendar-types';
import { setupPF2eEnvironment } from './setup';
import golarionCalendarData from '../calendars/golarion-pf2e.json';

describe('Widget Synchronization Integration', () => {
  let golarionCalendar: SeasonsStarsCalendar;
  let engine: CalendarEngine;
  let timeConverter: TimeConverter;

  beforeAll(() => {
    // Set up PF2e environment using enhanced foundry-test-utils
    setupPF2eEnvironment({
      worldCreationTimestamp: new Date('2025-01-01T00:00:00.000Z').getTime() / 1000,
      currentWorldTime: 0,
      expectedWorldCreationYear: 2025,
    });

    // Add other needed globals for the test
    global.game.user = { isGM: true };
  });

  beforeEach(() => {
    // Use the actual Golarion calendar JSON file instead of duplicating definitions
    golarionCalendar = golarionCalendarData as SeasonsStarsCalendar;

    engine = new CalendarEngine(golarionCalendar);
    timeConverter = new TimeConverter(engine);

    // Clear compatibility manager data providers for clean tests
    (compatibilityManager as any).dataProviderRegistry.clear();

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('GitHub Issue #91 Comment Bug - Widget Year Mismatch', () => {
    it('should reproduce the widget synchronization issue', () => {
      // This test reproduces the exact issue from the GitHub comment:
      // "The montly calender section isnt tied properly into the main time clock somehow"

      // STEP 1: Get world creation timestamp from PF2e settings (simulating PF2e environment)
      const worldCreationTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;

      // STEP 2: Direct calendar engine call (what should happen)
      const correctDate = engine.worldTimeToDate(0, worldCreationTimestamp);
      expect(correctDate.year).toBe(4725); // Should be 2025 + 2700 = 4725

      // STEP 3: Time converter call (what widgets actually get)
      // This simulates what happens when widgets update via seasons-stars:dateChanged hook
      global.game.time.worldTime = 0;

      // Time converter calls engine without world creation timestamp
      const timeConverterDate = engine.worldTimeToDate(0); // Missing worldCreationTimestamp!

      // PROBLEM: Time converter gives different result than direct call
      expect(timeConverterDate.year).toBe(2700); // Wrong! Shows epoch year instead of PF2e year

      // This demonstrates the bug: widgets get 2700 while direct calls get 4725
      const yearDifference = correctDate.year - timeConverterDate.year;
      expect(yearDifference).toBe(2025); // 2025 year difference = the bug!
    });

    it('should verify that widget sync fix works with Enhanced CompatibilityManager Data Registry', () => {
      // This test verifies that the new data provider pattern enables proper PF2e integration

      const WORLD_CREATION_DATE = '2025-01-01T00:00:00.000Z';
      const WORLD_CREATION_YEAR = 2025;
      const CALENDAR_EPOCH = 2700;
      const EXPECTED_PF2E_YEAR = WORLD_CREATION_YEAR + CALENDAR_EPOCH; // 4725
      const SECONDS_PER_DAY = 86400;
      const ONE_DAY_ELAPSED = SECONDS_PER_DAY;

      // Set up PF2e environment
      global.game.system = { id: 'pf2e' };
      global.game.pf2e = {
        settings: {
          worldClock: {
            worldCreatedOn: WORLD_CREATION_DATE,
          },
        },
      };
      global.game.time = { worldTime: ONE_DAY_ELAPSED };

      // Register data provider (simulating what PF2e integration would do)
      const worldCreationTimestamp = new Date(WORLD_CREATION_DATE).getTime() / 1000;
      compatibilityManager.registerDataProvider('pf2e', 'worldCreationTimestamp', () => {
        return worldCreationTimestamp;
      });

      // With data provider registered, time converter should get world creation timestamp and return PF2e year
      const currentDate = timeConverter.getCurrentDate();
      expect(currentDate.year).toBe(EXPECTED_PF2E_YEAR); // 4725 with working data provider!

      // Verify this matches what the engine produces with world creation timestamp
      const correctDate = engine.worldTimeToDate(ONE_DAY_ELAPSED, worldCreationTimestamp);
      expect(correctDate.year).toBe(EXPECTED_PF2E_YEAR); // 4725 - what widgets should get

      // The fix now works end-to-end: currentDate.year equals correctDate.year
      expect(currentDate.year).toBe(correctDate.year); // Both should be 4725!
    });

    it('should show the fix requires time converter to use world creation timestamp', () => {
      // This test shows what the fix should look like

      const worldCreationTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;

      // Current broken behavior: time converter doesn't use world creation timestamp
      const brokenResult = engine.worldTimeToDate(0);
      expect(brokenResult.year).toBe(2700);

      // Fixed behavior: time converter should use world creation timestamp in PF2e environments
      const fixedResult = engine.worldTimeToDate(0, worldCreationTimestamp);
      expect(fixedResult.year).toBe(4725);

      // The fix: time converter needs to detect PF2e environment and use world creation timestamp
      // This would require modifying time converter to:
      // 1. Detect PF2e system
      // 2. Get world creation timestamp from PF2e settings
      // 3. Pass it to engine.worldTimeToDate()
    });
  });

  describe('Enhanced CompatibilityManager Data Registry Integration', () => {
    it('should use data provider when system has registered provider', () => {
      // Test that time converter properly queries data providers

      // Set up PF2e environment
      global.game.system = { id: 'pf2e' };

      // Register data provider with world creation timestamp
      const worldCreationTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;
      compatibilityManager.registerDataProvider('pf2e', 'worldCreationTimestamp', () => {
        return worldCreationTimestamp;
      });

      // Test that using data provider gives correct results
      const result = timeConverter.getCurrentDate();
      expect(result.year).toBe(4725); // PF2e compatible year (2025 + 2700)
    });

    it('should fall back to epoch-based calculation when no data provider registered', () => {
      // Test backward compatibility for systems without data providers

      // Mock non-PF2e environment
      global.game.system = { id: 'dnd5e' };

      // No data provider registered for dnd5e
      const result = timeConverter.getCurrentDate();
      expect(result.year).toBe(2700); // Should use epoch-based calculation

      // This ensures we don't break existing non-PF2e installations
    });

    it('should handle data provider errors gracefully', () => {
      // Test that errors in data providers don't crash time converter

      global.game.system = { id: 'pf2e' };

      // Register data provider that throws an error
      compatibilityManager.registerDataProvider('pf2e', 'worldCreationTimestamp', () => {
        throw new Error('Mock provider error');
      });

      // Should not throw and should fall back to epoch calculation
      expect(() => {
        const result = timeConverter.getCurrentDate();
        expect(result.year).toBe(2700); // Should fall back to epoch
      }).not.toThrow();
    });
  });
});
