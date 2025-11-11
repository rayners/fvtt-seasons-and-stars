/**
 * Year Calculation Behavior Tests
 *
 * These tests define the EXPECTED behavior for S&S year calculations
 * based on the GitHub issues and PF2e integration requirements.
 *
 * Test-Driven Development approach:
 * 1. Define expected behaviors through tests
 * 2. Run tests to see current failures
 * 3. Implement minimal fixes to make tests pass
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../../src/core/calendar-engine';
import { compatibilityManager } from '../../src/core/compatibility-manager';
import type { SeasonsStarsCalendar } from '../../src/types/calendar';
import { loadTestCalendar } from '../utils/calendar-loader';
import { setupRealPF2eEnvironment } from '../../../pf2e-pack/test/setup-pf2e';

describe('Year Calculation Behavior', () => {
  let golarionCalendar: SeasonsStarsCalendar;
  let engine: CalendarEngine;

  beforeEach(() => {
    // Set up PF2e environment for these tests
    setupRealPF2eEnvironment({
      worldCreationTimestamp: Math.floor(new Date('2025-01-01T00:00:00.000Z').getTime() / 1000),
      currentWorldTime: 0,
      expectedWorldCreationYear: 2025,
      dateTheme: 'AR',
    });

    // Set up compatibility manager with PF2e system base date provider
    // This will be dynamically updated by tests that need different base dates
    compatibilityManager.registerDataProvider('pf2e', 'systemBaseDate', () => {
      // Default to 2025 creation year (4725 AR)
      const creationDate = new Date(
        global.game?.pf2e?.settings?.worldClock?.worldCreatedOn || '2025-01-01T00:00:00.000Z'
      );
      const creationYear = creationDate.getUTCFullYear();

      return {
        year: creationYear + 2700, // PF2e AR calculation
        month: creationDate.getUTCMonth() + 1, // 1-based
        day: creationDate.getUTCDate(),
        hour: creationDate.getUTCHours(),
        minute: creationDate.getUTCMinutes(),
        second: creationDate.getUTCSeconds(),
      };
    });

    // Use the actual Golarion calendar JSON file instead of duplicating definitions
    golarionCalendar = loadTestCalendar('golarion-pf2e.json');

    engine = new CalendarEngine(golarionCalendar);
  });

  describe('Epoch-based Year Calculations', () => {
    it('should calculate year 4725 for a world created in 2025 with standard elapsed time', () => {
      // EXPECTED BEHAVIOR based on GitHub issue:
      // PF2e shows 4725 AR for same date that S&S shows 6749
      // This suggests S&S should show 4725, not 6749

      // Simulate a world created on January 1, 2025 (typical new world)
      // World creation date: 2025-01-01 00:00:00 UTC
      const worldCreationTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;

      // Simulate some elapsed game time (e.g., a few days into the campaign)
      const elapsedGameTime = 86400 * 5; // 5 days in seconds
      const currentWorldTime = elapsedGameTime;

      // Expected: S&S should calculate the same year that PF2e would show
      // PF2e calculation: worldCreatedOn.year (2025) + yearOffset (2700) = 4725
      const expectedDate = engine.worldTimeToDate(currentWorldTime, worldCreationTimestamp);

      expect(expectedDate.year).toBe(4725);
    });

    it('should handle worldTime=0 correctly relative to world creation date', () => {
      // At worldTime=0, the date should be based on world creation date + epoch
      const worldCreationTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;
      const date = engine.worldTimeToDate(0, worldCreationTimestamp);

      // Should be world creation year (2025) + epoch (2700) = 4725
      expect(date.year).toBe(4725);
      expect(date.month).toBe(1);
      expect(date.day).toBe(1);
    });

    it('should advance years correctly from world creation baseline', () => {
      const worldCreationTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;

      // Test advancing by exactly one year
      const oneYearInSeconds = 365 * 24 * 60 * 60; // Assuming 365-day year
      const dateAfterOneYear = engine.worldTimeToDate(oneYearInSeconds, worldCreationTimestamp);

      expect(dateAfterOneYear.year).toBe(4726); // 4725 + 1 year
    });
  });

  describe('PF2e Integration Compatibility', () => {
    it('should match PF2e AR theme year calculation method', () => {
      // EXPECTED BEHAVIOR: S&S should produce same result as PF2e's calculation
      // PF2e method: worldCreatedOn.year + CONFIG.PF2E.worldClock.AR.yearOffset

      // Simulate PF2e's calculation
      const worldCreatedOn = new Date('2025-01-01T00:00:00.000Z');
      const pf2eAROffset = 2700; // CONFIG.PF2E.worldClock.AR.yearOffset
      const expectedPF2eYear = worldCreatedOn.getUTCFullYear() + pf2eAROffset; // 2025 + 2700 = 4725

      // S&S should produce the same result
      const worldCreationTimestamp = worldCreatedOn.getTime() / 1000;
      const ssDate = engine.worldTimeToDate(0, worldCreationTimestamp);

      expect(ssDate.year).toBe(expectedPF2eYear);
      expect(ssDate.year).toBe(4725);
    });

    it('should handle different world creation years consistently', () => {
      // Test with different world creation years to ensure formula is consistent
      const testCases = [
        { creationYear: 2024, expectedYear: 4724 }, // 2024 + 2700
        { creationYear: 2025, expectedYear: 4725 }, // 2025 + 2700
        { creationYear: 2026, expectedYear: 4726 }, // 2026 + 2700
      ];

      testCases.forEach(({ creationYear, expectedYear }) => {
        const worldCreationTimestamp =
          new Date(`${creationYear}-01-01T00:00:00.000Z`).getTime() / 1000;

        // Update PF2e environment for this specific test case
        global.game.pf2e.settings.worldClock.worldCreatedOn = `${creationYear}-01-01T00:00:00.000Z`;

        const date = engine.worldTimeToDate(0, worldCreationTimestamp);

        expect(date.year).toBe(expectedYear);
      });
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle missing world creation timestamp gracefully', () => {
      // When no world creation timestamp is provided, should fall back to reasonable default
      const date = engine.worldTimeToDate(0);

      // Should not throw error and should return a valid date
      expect(date).toBeDefined();
      expect(typeof date.year).toBe('number');
      expect(date.year).toBeGreaterThan(0);
    });

    it('should handle very large worldTime values', () => {
      const worldCreationTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;
      // Use correct worldTime for 100 actual calendar years (including 25 leap days)
      const largeWorldTime = 36525 * 24 * 60 * 60; // 100 calendar years in seconds (365.25 days avg)

      const date = engine.worldTimeToDate(largeWorldTime, worldCreationTimestamp);

      expect(date.year).toBe(4825); // 4725 + 100 years
    });

    it('should handle negative worldTime values', () => {
      const worldCreationTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;
      const negativeWorldTime = -365 * 24 * 60 * 60; // -1 year in seconds

      const date = engine.worldTimeToDate(negativeWorldTime, worldCreationTimestamp);

      expect(date.year).toBe(4724); // 4725 - 1 year
    });
  });

  describe('Round-trip Date Conversion', () => {
    it('should convert date to worldTime and back to same date', () => {
      const worldCreationTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;
      const originalDate: ICalendarDate = { year: 4725, month: 6, day: 15 };

      // Convert to worldTime
      const worldTime = engine.dateToWorldTime(originalDate, worldCreationTimestamp);

      // Convert back to date
      const convertedDate = engine.worldTimeToDate(worldTime, worldCreationTimestamp);

      expect(convertedDate.year).toBe(originalDate.year);
      expect(convertedDate.month).toBe(originalDate.month);
      expect(convertedDate.day).toBe(originalDate.day);
    });
  });
});

describe('Current Implementation Issues (Failing Tests)', () => {
  // These tests document the CURRENT failing behavior
  // They should FAIL until we fix the implementation

  let golarionCalendar: SeasonsStarsCalendar;
  let engine: CalendarEngine;

  beforeEach(() => {
    // Use the actual Golarion calendar JSON file instead of duplicating definitions
    golarionCalendar = loadTestCalendar('golarion-pf2e.json');

    engine = new CalendarEngine(golarionCalendar);
  });

  it('currently fails: shows 6749 instead of 4725 for GitHub issue scenario', () => {
    // This test documents the CURRENT broken behavior
    // It should FAIL until we implement the fix

    const worldCreationTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;
    const currentDate = engine.worldTimeToDate(0, worldCreationTimestamp);

    // This will likely fail because current implementation probably shows 6749
    // When fixed, this test should pass
    expect(currentDate.year).not.toBe(6749); // Should not be the broken value
    expect(currentDate.year).toBe(4725); // Should be the correct value
  });
});
