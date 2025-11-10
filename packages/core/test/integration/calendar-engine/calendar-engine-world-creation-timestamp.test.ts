/**
 * Calendar Engine World Creation Timestamp Tests
 *
 * Tests for the new world creation timestamp functionality that enables
 * widget synchronization with PF2e-style year calculations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../../../src/core/calendar-engine';
import { CalendarDate } from '../../../src/core/calendar-date';
import { compatibilityManager } from '../../../src/core/compatibility-manager';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar-types';
import { loadTestCalendar } from '../../../utils/calendar-loader';
import { setupRealPF2eEnvironment } from '../../pf2e-pack/test/setup-pf2e';

// Use the actual Golarion calendar JSON file instead of duplicating definitions
const golarionCalendar: SeasonsStarsCalendar = loadTestCalendar('golarion-pf2e.json');

describe('CalendarEngine - World Creation Timestamp Support', () => {
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
    compatibilityManager.registerDataProvider('pf2e', 'systemBaseDate', () => ({
      year: 4725, // PF2e AR year for 2025 creation
      month: 1, // January -> Abadius
      day: 1, // 1st
      hour: 0,
      minute: 0,
      second: 0,
    }));

    engine = new CalendarEngine(golarionCalendar);
  });

  describe('Basic World Creation Timestamp Functionality', () => {
    it('should support optional world creation timestamp in worldTimeToDate', () => {
      const worldCreationTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;

      // worldTime=0 with world creation timestamp should give 2025 + 2700 = 4725
      const result = engine.worldTimeToDate(0, worldCreationTimestamp);

      expect(result.year).toBe(4725);
      expect(result.month).toBe(1);
      expect(result.day).toBe(1);
    });

    it('should maintain backward compatibility when no timestamp provided', () => {
      // worldTime=0 without timestamp should give raw epoch year
      const result = engine.worldTimeToDate(0);

      expect(result.year).toBe(2700); // Raw epoch
      expect(result.month).toBe(1);
      expect(result.day).toBe(1);
    });

    it('should support optional world creation timestamp in dateToWorldTime', () => {
      const worldCreationTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;

      // Date in year 4725 should convert back to worldTime=0 when using world creation timestamp
      const date = new CalendarDate(
        {
          year: 4725,
          month: 1,
          day: 1,
          weekday: 0,
        },
        golarionCalendar
      );

      const worldTime = engine.dateToWorldTime(date, worldCreationTimestamp);
      expect(worldTime).toBe(0);
    });
  });

  describe('PF2e-Style Year Calculation Logic', () => {
    it('should calculate correct years for different world creation dates', () => {
      const testCases = [
        { creationYear: 2024, expectedYear: 4724 }, // 2024 + 2700
        { creationYear: 2025, expectedYear: 4725 }, // 2025 + 2700
        { creationYear: 2026, expectedYear: 4726 }, // 2026 + 2700
        { creationYear: 2000, expectedYear: 4700 }, // 2000 + 2700
      ];

      testCases.forEach(({ creationYear, expectedYear }) => {
        const timestamp = new Date(`${creationYear}-01-01T00:00:00.000Z`).getTime() / 1000;
        const result = engine.worldTimeToDate(0, timestamp);

        expect(result.year).toBe(expectedYear);
        expect(result.month).toBe(1);
        expect(result.day).toBe(1);
      });
    });

    it('should handle UTC date extraction correctly', () => {
      // Test that getUTCFullYear is used (avoiding timezone issues)
      const testDates = [
        '2025-01-01T00:00:00.000Z', // UTC midnight
        '2025-01-01T23:59:59.999Z', // UTC end of day
        '2025-12-31T00:00:00.000Z', // UTC end of year start
        '2025-12-31T23:59:59.999Z', // UTC end of year end
      ];

      testDates.forEach(dateString => {
        const timestamp = new Date(dateString).getTime() / 1000;
        const result = engine.worldTimeToDate(0, timestamp);

        // All should give 2025 + 2700 = 4725 regardless of time of day
        expect(result.year).toBe(4725);
      });
    });
  });

  describe('Time Advancement with World Creation Timestamps', () => {
    it('should handle positive time advancement correctly', () => {
      const worldCreationTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;

      // Test various worldTime values with exact expected results
      const testCases = [
        { worldTime: 0, expectedYear: 4725, expectedMonth: 1, expectedDay: 1 },
        { worldTime: 86400, expectedYear: 4725, expectedMonth: 1, expectedDay: 2 }, // +1 day
        { worldTime: 86400 * 31, expectedYear: 4725, expectedMonth: 2, expectedDay: 1 }, // +31 days (Feb 1)
        { worldTime: 86400 * 365, expectedYear: 4726, expectedMonth: 1, expectedDay: 1 }, // +365 days = Jan 1 next year
      ];

      testCases.forEach(({ worldTime, expectedYear, expectedMonth, expectedDay }) => {
        const result = engine.worldTimeToDate(worldTime, worldCreationTimestamp);

        expect(result.year).toBe(expectedYear);
        expect(result.month).toBe(expectedMonth);
        expect(result.day).toBe(expectedDay);
      });
    });

    it('should handle negative time advancement correctly', () => {
      const worldCreationTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;

      // Test negative worldTime values (going backwards from world creation)
      const testCases = [
        { worldTime: -86400, expectedYear: 4724, expectedMonth: 12, expectedDay: 31 }, // -1 day
        { worldTime: -86400 * 31, expectedYear: 4724, expectedMonth: 12, expectedDay: 1 }, // -31 days (approx)
      ];

      testCases.forEach(({ worldTime, expectedYear, expectedMonth, expectedDay }) => {
        const result = engine.worldTimeToDate(worldTime, worldCreationTimestamp);

        expect(result.year).toBe(expectedYear);
        expect(result.month).toBe(expectedMonth);
        expect(result.day).toBe(expectedDay);
      });
    });

    it('should use proper calendar year lengths for multi-year advancement', () => {
      const worldCreationTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;

      // Calculate exact seconds for 2 full calendar years
      const year1Length = engine.getYearLength(4725); // 2025 + 2700
      const year2Length = engine.getYearLength(4726); // 2026 + 2700
      const twoYearsInSeconds = (year1Length + year2Length) * 24 * 60 * 60;

      const result = engine.worldTimeToDate(twoYearsInSeconds, worldCreationTimestamp);

      expect(result.year).toBe(4727); // Base year + 2 years
      expect(result.month).toBe(1);
      expect(result.day).toBe(1);
    });
  });

  describe('Round-trip Conversion with World Creation Timestamps', () => {
    it('should maintain round-trip accuracy for epoch dates', () => {
      const worldCreationTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;

      const testDates = [
        { year: 4725, month: 1, day: 1 }, // World creation date - ✅ works
        { year: 4725, month: 6, day: 15 }, // Mid-year - ✅ works
        { year: 4726, month: 1, day: 1 }, // Next year - ✅ works
        { year: 4724, month: 12, day: 31 }, // Previous year - ✅ works
      ];

      testDates.forEach(dateData => {
        const originalDate = new CalendarDate(dateData, golarionCalendar);

        // Convert to worldTime with timestamp
        const worldTime = engine.dateToWorldTime(originalDate, worldCreationTimestamp);

        // Convert back to date with timestamp
        const convertedDate = engine.worldTimeToDate(worldTime, worldCreationTimestamp);

        expect(convertedDate.year).toBe(dateData.year);
        expect(convertedDate.month).toBe(dateData.month);
        expect(convertedDate.day).toBe(dateData.day);
      });
    });

    it('should handle edge case where round-trip has known issue', () => {
      const worldCreationTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;

      // This case has a known mismatch: Year 4725, Month 12, Day 31 -> Year 4726, Month 12, Day 31
      const originalDate = new CalendarDate(
        { year: 4725, month: 12, day: 31, weekday: 0 },
        golarionCalendar
      );
      const worldTime = engine.dateToWorldTime(originalDate, worldCreationTimestamp);
      const convertedDate = engine.worldTimeToDate(worldTime, worldCreationTimestamp);

      // Document the actual behavior - converting from the last day of a year should round-trip correctly
      expect(convertedDate.year).toBe(4725); // Same year
      expect(convertedDate.month).toBe(12);
      expect(convertedDate.day).toBe(31);
    });

    it('should handle time components correctly with world creation timestamps', () => {
      const worldCreationTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;

      const dateWithTime = new CalendarDate(
        {
          year: 4725,
          month: 6,
          day: 15,
          weekday: 0,
          time: { hour: 14, minute: 30, second: 45 },
        },
        golarionCalendar
      );

      // Round-trip conversion
      const worldTime = engine.dateToWorldTime(dateWithTime, worldCreationTimestamp);
      const converted = engine.worldTimeToDate(worldTime, worldCreationTimestamp);

      expect(converted.year).toBe(4725);
      expect(converted.month).toBe(6);
      expect(converted.day).toBe(15);
      expect(converted.time?.hour).toBe(14);
      expect(converted.time?.minute).toBe(30);
      expect(converted.time?.second).toBe(45);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid world creation timestamps gracefully', () => {
      const invalidTimestamps = [NaN, Infinity, -Infinity];

      invalidTimestamps.forEach(invalidTimestamp => {
        // Should not throw error, but actual behavior is NaN year
        const result = engine.worldTimeToDate(0, invalidTimestamp);
        expect(result.year).toBeNaN(); // Current behavior: returns NaN
        expect(result.month).toBe(1); // Month and day are still valid
        expect(result.day).toBe(1);
      });
    });

    it('should handle very large world creation timestamps', () => {
      // Year 3000 creation date
      const futureTimestamp = new Date('3000-01-01T00:00:00.000Z').getTime() / 1000;

      const result = engine.worldTimeToDate(0, futureTimestamp);
      expect(result.year).toBe(5700); // 3000 + 2700
    });

    it('should handle very old world creation timestamps', () => {
      // Year 1000 creation date
      const ancientTimestamp = new Date('1000-01-01T00:00:00.000Z').getTime() / 1000;

      const result = engine.worldTimeToDate(0, ancientTimestamp);
      expect(result.year).toBe(3700); // 1000 + 2700
    });

    it('should handle zero epoch calendars correctly', () => {
      const zeroEpochCalendar = {
        ...golarionCalendar,
        year: { epoch: 0, suffix: '' },
      };

      const zeroEngine = new CalendarEngine(zeroEpochCalendar);
      const worldCreationTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;

      const result = zeroEngine.worldTimeToDate(0, worldCreationTimestamp);
      expect(result.year).toBe(2025); // 2025 + 0 = 2025
    });
  });

  describe('Leap Year Handling with World Creation Timestamps', () => {
    it('should handle leap year calculations correctly with world creation timestamps', () => {
      // Use a leap year for world creation
      const leapYearTimestamp = new Date('2024-01-01T00:00:00.000Z').getTime() / 1000;

      // Test February 29th in the leap year
      const febLeapDay = new CalendarDate(
        {
          year: 4724, // 2024 + 2700
          month: 2, // February
          day: 29, // Leap day
          weekday: 0,
        },
        golarionCalendar
      );

      // Round-trip conversion
      const worldTime = engine.dateToWorldTime(febLeapDay, leapYearTimestamp);
      const converted = engine.worldTimeToDate(worldTime, leapYearTimestamp);

      expect(converted.year).toBe(4724);
      expect(converted.month).toBe(2);
      expect(converted.day).toBe(29);
    });
  });
});
