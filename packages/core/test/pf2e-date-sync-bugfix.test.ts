/**
 * Tests for PF2e Date/Time Synchronization Bugfix
 *
 * This test file specifically validates the fix for the issue where:
 * - S&S showed "1st Abadius, 4725 AR 00:00:00"
 * - PF2e showed "2nd of Erastus, 4725 AR (06:41:03)"
 *
 * Tests ensure both systems now show identical dates and times.
 *
 * NOTE: These are safe unit tests that don't modify world data.
 * For manual testing, use console commands in a test world.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import { compatibilityManager } from '../src/core/compatibility-manager';
import golarionCalendar from '../calendars/golarion-pf2e.json';

// Mock Foundry globals
const mockFoundryGlobals = () => {
  global.game = {
    system: { id: 'pf2e' },
    time: { worldTime: 0 },
    seasonsStars: {
      manager: {
        getActiveCalendar: () => golarionCalendar,
      },
    },
  } as any;
};

describe('PF2e Date/Time Synchronization Bugfix', () => {
  let engine: CalendarEngine;

  beforeEach(() => {
    mockFoundryGlobals();
    engine = new CalendarEngine(golarionCalendar as any);

    // Clear any existing data providers
    (compatibilityManager as any).dataProviderRegistry.clear();
  });

  describe('Bug Reproduction: Date Mismatch', () => {
    it('reproduces the original bug - different dates without integration', () => {
      // Without PF2e integration, S&S uses pure calendar math
      const worldTime = 0; // Fresh world
      const dateWithoutIntegration = engine.worldTimeToDate(worldTime);

      // S&S would show: "1st Abadius" (month 1, day 1)
      expect(dateWithoutIntegration.month).toBe(1); // Abadius
      expect(dateWithoutIntegration.day).toBe(1);
      expect(dateWithoutIntegration.time.hour).toBe(0);
      expect(dateWithoutIntegration.time.minute).toBe(0);
      expect(dateWithoutIntegration.time.second).toBe(0);
    });

    it('demonstrates the fix - matching dates with PF2e integration', () => {
      // Register PF2e systemBaseDate provider (the fix)
      compatibilityManager.registerDataProvider('pf2e', 'systemBaseDate', () => ({
        year: 4725, // From calendar currentYear
        month: 7, // July -> Erastus
        day: 2, // July 2nd
        hour: 6, // From worldCreatedOn time
        minute: 41, // From worldCreatedOn time
        second: 3, // From worldCreatedOn time
      }));

      const worldTime = 0; // Fresh world
      const worldCreationTimestamp = Math.floor(
        new Date('2025-07-02T06:41:03.473Z').getTime() / 1000
      );

      const dateWithIntegration = engine.worldTimeToDate(worldTime, worldCreationTimestamp);

      // S&S now shows: "2nd Erastus, 6:41:03" (matching PF2e)
      expect(dateWithIntegration.year).toBe(4725);
      expect(dateWithIntegration.month).toBe(7); // Erastus
      expect(dateWithIntegration.day).toBe(2);
      expect(dateWithIntegration.time.hour).toBe(6);
      expect(dateWithIntegration.time.minute).toBe(41);
      expect(dateWithIntegration.time.second).toBe(3);
    });
  });

  describe('Real-world Date Mapping', () => {
    it('correctly maps various real-world dates to Golarion calendar', () => {
      const testCases = [
        // January 1 -> Abadius 1
        { realDate: '2025-01-01T12:00:00.000Z', expectedMonth: 1, expectedDay: 1 },
        // March 15 -> Pharast 15
        { realDate: '2025-03-15T08:30:00.000Z', expectedMonth: 3, expectedDay: 15 },
        // June 24 -> Sarenith 24
        { realDate: '2025-06-24T16:01:06.000Z', expectedMonth: 6, expectedDay: 24 },
        // July 2 -> Erastus 2 (the actual test case)
        { realDate: '2025-07-02T06:41:03.473Z', expectedMonth: 7, expectedDay: 2 },
        // December 31 -> Kuthona 31
        { realDate: '2025-12-31T23:59:59.000Z', expectedMonth: 12, expectedDay: 31 },
      ];

      testCases.forEach(({ realDate, expectedMonth, expectedDay }) => {
        const date = new Date(realDate);

        // Register systemBaseDate for this test case
        compatibilityManager.registerDataProvider('pf2e', 'systemBaseDate', () => ({
          year: 4725,
          month: date.getUTCMonth() + 1,
          day: date.getUTCDate(),
          hour: date.getUTCHours(),
          minute: date.getUTCMinutes(),
          second: date.getUTCSeconds(),
        }));

        const worldTime = 0;
        const timestamp = Math.floor(date.getTime() / 1000);
        const result = engine.worldTimeToDate(worldTime, timestamp);

        expect(result.month).toBe(expectedMonth);
        expect(result.day).toBe(expectedDay);
        expect(result.year).toBe(4725);
      });
    });

    it('preserves time components accurately', () => {
      // Test specific time preservation
      const testTime = '2025-07-02T14:25:37.000Z';
      const date = new Date(testTime);

      compatibilityManager.registerDataProvider('pf2e', 'systemBaseDate', () => ({
        year: 4725,
        month: 7,
        day: 2,
        hour: 14,
        minute: 25,
        second: 37,
      }));

      const worldTime = 0;
      const timestamp = Math.floor(date.getTime() / 1000);
      const result = engine.worldTimeToDate(worldTime, timestamp);

      expect(result.time.hour).toBe(14);
      expect(result.time.minute).toBe(25);
      expect(result.time.second).toBe(37);
    });
  });

  describe('WorldTime Progression', () => {
    it('correctly advances time from PF2e base date', () => {
      // Start with July 2, 2025 06:41:03
      compatibilityManager.registerDataProvider('pf2e', 'systemBaseDate', () => ({
        year: 4725,
        month: 7, // Erastus
        day: 2,
        hour: 6,
        minute: 41,
        second: 3,
      }));

      const worldCreationTimestamp = Math.floor(
        new Date('2025-07-02T06:41:03.473Z').getTime() / 1000
      );

      // Test progression: +1 hour
      const oneHour = 3600;
      const resultAfterOneHour = engine.worldTimeToDate(oneHour, worldCreationTimestamp);

      expect(resultAfterOneHour.month).toBe(7); // Still Erastus
      expect(resultAfterOneHour.day).toBe(2); // Still 2nd
      expect(resultAfterOneHour.time.hour).toBe(7); // Advanced to 7:41:03
      expect(resultAfterOneHour.time.minute).toBe(41);
      expect(resultAfterOneHour.time.second).toBe(3);

      // Test progression: +1 day
      const oneDay = 86400;
      const resultAfterOneDay = engine.worldTimeToDate(oneDay, worldCreationTimestamp);

      expect(resultAfterOneDay.month).toBe(7); // Still Erastus
      expect(resultAfterOneDay.day).toBe(3); // Advanced to 3rd
      expect(resultAfterOneDay.time.hour).toBe(6); // Same time
      expect(resultAfterOneDay.time.minute).toBe(41);
      expect(resultAfterOneDay.time.second).toBe(3);
    });

    it('handles month transitions correctly', () => {
      // Start at end of Erastus (July 31)
      compatibilityManager.registerDataProvider('pf2e', 'systemBaseDate', () => ({
        year: 4725,
        month: 7, // Erastus
        day: 31, // Last day of month
        hour: 23,
        minute: 59,
        second: 59,
      }));

      const worldCreationTimestamp = Math.floor(
        new Date('2025-07-31T23:59:59.000Z').getTime() / 1000
      );

      // Add 1 second -> should roll to Arodus 1st
      const oneSecond = 1;
      const resultAfterOneSecond = engine.worldTimeToDate(oneSecond, worldCreationTimestamp);

      expect(resultAfterOneSecond.month).toBe(8); // Arodus
      expect(resultAfterOneSecond.day).toBe(1); // 1st
      expect(resultAfterOneSecond.time.hour).toBe(0);
      expect(resultAfterOneSecond.time.minute).toBe(0);
      expect(resultAfterOneSecond.time.second).toBe(0);
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('falls back gracefully when systemBaseDate is unavailable', () => {
      // Don't register any system base date provider
      const worldTime = 0;
      const worldCreationTimestamp = Math.floor(
        new Date('2025-07-02T06:41:03.473Z').getTime() / 1000
      );

      const result = engine.worldTimeToDate(worldTime, worldCreationTimestamp);

      // Should fall back to using calendar currentYear
      expect(result.year).toBe(4725); // From calendar.year.currentYear
    });

    it('handles invalid systemBaseDate gracefully', () => {
      // Register provider that returns invalid data
      compatibilityManager.registerDataProvider('pf2e', 'systemBaseDate', () => null);

      const worldTime = 0;
      const worldCreationTimestamp = Math.floor(
        new Date('2025-07-02T06:41:03.473Z').getTime() / 1000
      );

      expect(() => {
        const result = engine.worldTimeToDate(worldTime, worldCreationTimestamp);
        expect(result.year).toBe(4725); // Should still work with fallback
      }).not.toThrow();
    });

    it('works correctly for non-PF2e systems', () => {
      global.game.system.id = 'dnd5e';

      // No systemBaseDate provider for D&D 5e
      const worldTime = 86400; // 1 day

      // Should use normal epoch-based calculation
      const result = engine.worldTimeToDate(worldTime);
      expect(result.year).toBe(2700); // Calendar epoch year
      expect(result.month).toBe(1); // Abadius
      expect(result.day).toBe(2); // 2nd day
    });
  });

  describe('Integration Test: Complete PF2e Workflow', () => {
    it('simulates complete PF2e integration workflow', () => {
      // STEP 1: PF2e system detected, integration initialized
      global.game.system.id = 'pf2e';

      // STEP 2: PF2e provides worldCreatedOn
      const pf2eWorldCreatedOn = '2025-07-02T06:41:03.473Z';
      global.game.pf2e = {
        settings: {
          worldClock: {
            worldCreatedOn: pf2eWorldCreatedOn,
          },
        },
      } as any;

      // STEP 3: PF2e integration calculates systemBaseDate
      const creationDate = new Date(pf2eWorldCreatedOn);
      compatibilityManager.registerDataProvider('pf2e', 'systemBaseDate', () => ({
        year: 4725, // From calendar currentYear
        month: creationDate.getUTCMonth() + 1,
        day: creationDate.getUTCDate(),
        hour: creationDate.getUTCHours(),
        minute: creationDate.getUTCMinutes(),
        second: creationDate.getUTCSeconds(),
      }));

      // STEP 4: S&S calendar engine uses systemBaseDate
      global.game.time.worldTime = 0; // Fresh world
      const worldCreationTimestamp = Math.floor(creationDate.getTime() / 1000);

      const ssResult = engine.worldTimeToDate(0, worldCreationTimestamp);

      // STEP 5: Result should match PF2e exactly
      expect(ssResult.year).toBe(4725);
      expect(ssResult.month).toBe(7); // Erastus (July)
      expect(ssResult.day).toBe(2); // 2nd
      expect(ssResult.time.hour).toBe(6);
      expect(ssResult.time.minute).toBe(41);
      expect(ssResult.time.second).toBe(3);

      // STEP 6: Simulate PF2e calculation to verify match
      const pf2eExpected = {
        year: 4725,
        month: 7, // July -> Erastus
        day: 2,
        hour: 6,
        minute: 41,
        second: 3,
      };

      expect(ssResult.year).toBe(pf2eExpected.year);
      expect(ssResult.month).toBe(pf2eExpected.month);
      expect(ssResult.day).toBe(pf2eExpected.day);
      expect(ssResult.time.hour).toBe(pf2eExpected.hour);
      expect(ssResult.time.minute).toBe(pf2eExpected.minute);
      expect(ssResult.time.second).toBe(pf2eExpected.second);
    });
  });
});
