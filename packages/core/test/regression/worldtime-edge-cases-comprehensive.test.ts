/**
 * Comprehensive WorldTime Edge Cases Test Suite
 *
 * This test suite covers edge cases and boundary conditions for worldTime interpretation
 * that may not be covered by existing regression tests. These edge cases help identify
 * potential issues with date calculation logic under unusual conditions.
 */

/* eslint-disable @typescript-eslint/no-unused-vars, no-empty, no-useless-catch */

import { describe, test, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../../../src/core/calendar-engine';
import { loadTestCalendar } from './utils/calendar-loader';

describe('WorldTime Edge Cases - Comprehensive Test Suite', () => {
  let gregorianEngine: CalendarEngine;
  let golarionEngine: CalendarEngine;
  let valeReckoningEngine: CalendarEngine;

  beforeEach(() => {
    gregorianEngine = new CalendarEngine(loadTestCalendar('gregorian.json'));
    golarionEngine = new CalendarEngine(loadTestCalendar('golarion-pf2e.json'));
    valeReckoningEngine = new CalendarEngine(loadTestCalendar('vale-reckoning.json'));
  });

  describe('🔢 Extreme WorldTime Values', () => {
    test('Handle worldTime = 0 for Gregorian calendar', () => {
      const date = gregorianEngine.worldTimeToDate(0);

      expect(date.year).toBe(0);
      expect(date.month).toBe(1);
      expect(date.day).toBe(1);

      // Time should start at midnight
      expect(date.time?.hour || 0).toBe(0);
      expect(date.time?.minute || 0).toBe(0);
      expect(date.time?.second || 0).toBe(0);
    });

    test('Handle worldTime = 0 for Golarion calendar', () => {
      const date = golarionEngine.worldTimeToDate(0);

      expect(date.year).toBe(2700);
      expect(date.month).toBe(1);
      expect(date.day).toBe(1);

      // Time should start at midnight
      expect(date.time?.hour || 0).toBe(0);
      expect(date.time?.minute || 0).toBe(0);
      expect(date.time?.second || 0).toBe(0);
    });

    test('Handle worldTime = 0 for Vale Reckoning calendar', () => {
      const date = valeReckoningEngine.worldTimeToDate(0);

      expect(date.year).toBe(0);
      expect(date.month).toBe(1);
      expect(date.day).toBe(1);

      // Time should start at midnight
      expect(date.time?.hour || 0).toBe(0);
      expect(date.time?.minute || 0).toBe(0);
      expect(date.time?.second || 0).toBe(0);
    });

    test('Handle negative worldTime values', () => {
      const negativeValues = [-1, -86400, -31536000]; // -1 sec, -1 day, -1 year

      negativeValues.forEach(worldTime => {
        [gregorianEngine, golarionEngine, valeReckoningEngine].forEach(engine => {
          const date = engine.worldTimeToDate(worldTime);

          // Should either produce valid dates or handle gracefully
          expect(date.year).toBeGreaterThanOrEqual(-10000); // Reasonable lower bound
          expect(date.month).toBeGreaterThanOrEqual(1);
          expect(date.day).toBeGreaterThanOrEqual(1);
        });
      });
    });

    test('Handle very large worldTime values', () => {
      const largeValues = [
        31536000000, // ~1000 years in seconds
        315360000000, // ~10000 years in seconds
        3153600000000, // ~100000 years in seconds
      ];

      largeValues.forEach(worldTime => {
        [gregorianEngine, golarionEngine, valeReckoningEngine].forEach(engine => {
          const date = engine.worldTimeToDate(worldTime);

          // Should produce reasonable years (not negative or impossible values)
          expect(date.year).toBeGreaterThan(0);
          expect(date.year).toBeLessThan(1000000); // Reasonable upper bound
          expect(date.month).toBeGreaterThanOrEqual(1);
          expect(date.day).toBeGreaterThanOrEqual(1);
        });
      });
    });
  });

  describe('📅 Date Boundary Edge Cases', () => {
    test('Handle end-of-year boundaries with worldTime conversion', () => {
      // Test dates right at year boundaries
      const testDates = [
        { year: 2023, month: 12, day: 31, time: { hour: 23, minute: 59, second: 59 } },
        { year: 2024, month: 1, day: 1, time: { hour: 0, minute: 0, second: 0 } },
        { year: 2024, month: 12, day: 31, time: { hour: 23, minute: 59, second: 59 } },
        { year: 2025, month: 1, day: 1, time: { hour: 0, minute: 0, second: 0 } },
      ];

      testDates.forEach(testDate => {
        [gregorianEngine, golarionEngine].forEach((engine, index) => {
          const calendarNames = ['Gregorian', 'Golarion'];

          try {
            const worldTime = engine.dateToWorldTime(testDate);
            const roundTrip = engine.worldTimeToDate(worldTime);

            // Round trip should preserve the date
            expect(roundTrip.year).toBe(testDate.year);
            expect(roundTrip.month).toBe(testDate.month);
            expect(roundTrip.day).toBe(testDate.day);
            expect(roundTrip.time?.hour || 0).toBe(testDate.time.hour);
            expect(roundTrip.time?.minute || 0).toBe(testDate.time.minute);
            expect(roundTrip.time?.second || 0).toBe(testDate.time.second);
          } catch (error) {
            throw error; // Boundary cases should not fail
          }
        });
      });
    });

    test('Handle leap year boundaries with worldTime conversion', () => {
      // Test leap day and surrounding dates
      const leapYearTests = [
        { year: 4724, month: 2, day: 28, description: 'Day before leap day' },
        { year: 4724, month: 2, day: 29, description: 'Leap day itself' },
        { year: 4724, month: 3, day: 1, description: 'Day after leap day' },
        // Non-leap year for comparison
        { year: 4723, month: 2, day: 28, description: 'Feb 28 in non-leap year' },
        { year: 4723, month: 3, day: 1, description: 'Mar 1 in non-leap year' },
      ];

      leapYearTests.forEach(testDate => {
        [gregorianEngine, golarionEngine].forEach((engine, index) => {
          const calendarNames = ['Gregorian', 'Golarion'];

          try {
            const worldTime = engine.dateToWorldTime(testDate);
            const roundTrip = engine.worldTimeToDate(worldTime);

            // Round trip should preserve the date exactly
            expect(roundTrip.year).toBe(testDate.year);
            expect(roundTrip.month).toBe(testDate.month);
            expect(roundTrip.day).toBe(testDate.day);
          } catch (error) {
            if (testDate.month === 2 && testDate.day === 29 && testDate.year === 4723) {
              // Feb 29, 2023 doesn't exist (not a leap year) - error expected
              expect(error).toBeDefined();
            } else {
              throw error;
            }
          }
        });
      });
    });
  });

  describe('⏱️ Time Component Edge Cases', () => {
    test('Handle precise time components in worldTime conversion', () => {
      // Test various time combinations that might cause precision issues
      const timeTests = [
        { hour: 0, minute: 0, second: 0, description: 'Midnight' },
        { hour: 12, minute: 0, second: 0, description: 'Noon' },
        { hour: 23, minute: 59, second: 59, description: 'End of day' },
        { hour: 6, minute: 30, second: 45, description: 'Random time' },
        { hour: 12, minute: 34, second: 56, description: 'Sequential digits' },
        { hour: 1, minute: 1, second: 1, description: 'All ones' },
        { hour: 13, minute: 37, second: 42, description: 'Afternoon time' },
      ];

      const testDate = { year: 2024, month: 6, day: 15 }; // Middle of year, safe date

      timeTests.forEach(timeTest => {
        const fullDate = {
          ...testDate,
          time: {
            hour: timeTest.hour,
            minute: timeTest.minute,
            second: timeTest.second,
          },
        };

        [gregorianEngine, golarionEngine].forEach((engine, index) => {
          const calendarNames = ['Gregorian', 'Golarion'];

          const worldTime = engine.dateToWorldTime(fullDate);
          const roundTrip = engine.worldTimeToDate(worldTime);

          // Time should be preserved exactly
          expect(roundTrip.time?.hour || 0).toBe(timeTest.hour);
          expect(roundTrip.time?.minute || 0).toBe(timeTest.minute);
          expect(roundTrip.time?.second || 0).toBe(timeTest.second);
        });
      });
    });

    test('Handle time arithmetic edge cases', () => {
      // Test adding seconds that cross minute/hour/day boundaries
      const baseDate = {
        year: 2024,
        month: 6,
        day: 15,
        time: { hour: 23, minute: 59, second: 58 },
      };

      [gregorianEngine, golarionEngine].forEach((engine, index) => {
        const calendarNames = ['Gregorian', 'Golarion'];

        const baseWorldTime = engine.dateToWorldTime(baseDate);

        // Test adding 1 second (should roll to 23:59:59)
        const plus1Sec = engine.worldTimeToDate(baseWorldTime + 1);
        expect(plus1Sec.time?.second).toBe(59);
        expect(plus1Sec.day).toBe(baseDate.day); // Same day

        // Test adding 2 seconds (should roll to next minute: 24:00:00 -> 00:00:00 next day)
        const plus2Sec = engine.worldTimeToDate(baseWorldTime + 2);
        expect(plus2Sec.time?.hour).toBe(0);
        expect(plus2Sec.time?.minute).toBe(0);
        expect(plus2Sec.time?.second).toBe(0);
        expect(plus2Sec.day).toBe(baseDate.day + 1); // Next day

        // Test adding 1 hour + 2 seconds (should be next day, 01:00:00)
        const plus1Hour2Sec = engine.worldTimeToDate(baseWorldTime + 3600 + 2);
        expect(plus1Hour2Sec.time?.hour).toBe(1);
        expect(plus1Hour2Sec.time?.minute).toBe(0);
        expect(plus1Hour2Sec.time?.second).toBe(0);
        expect(plus1Hour2Sec.day).toBe(baseDate.day + 1); // Next day
      });
    });
  });

  describe('🔄 Bidirectional Conversion Stress Tests', () => {
    test('Gregorian round-trip conversion with known dates', () => {
      const testDates = [
        { year: 2024, month: 1, day: 1, time: { hour: 0, minute: 0, second: 0 } },
        { year: 2024, month: 6, day: 15, time: { hour: 12, minute: 30, second: 45 } },
        { year: 2024, month: 12, day: 31, time: { hour: 23, minute: 59, second: 59 } },
        { year: 1, month: 1, day: 1, time: { hour: 0, minute: 0, second: 0 } },
        { year: 2000, month: 2, day: 29, time: { hour: 6, minute: 15, second: 30 } }, // Leap year
      ];

      testDates.forEach((testDate, index) => {
        const worldTime = gregorianEngine.dateToWorldTime(testDate);
        const roundTrip = gregorianEngine.worldTimeToDate(worldTime);

        expect(roundTrip.year).toBe(testDate.year);
        expect(roundTrip.month).toBe(testDate.month);
        expect(roundTrip.day).toBe(testDate.day);
        expect(roundTrip.time?.hour || 0).toBe(testDate.time.hour);
        expect(roundTrip.time?.minute || 0).toBe(testDate.time.minute);
        expect(roundTrip.time?.second || 0).toBe(testDate.time.second);
      });
    });

    test('Golarion round-trip conversion with known dates', () => {
      const testDates = [
        { year: 2700, month: 1, day: 1, time: { hour: 0, minute: 0, second: 0 } }, // Epoch
        { year: 4712, month: 10, day: 21, time: { hour: 5, minute: 0, second: 6 } }, // Issue #66 date
        { year: 4725, month: 6, day: 15, time: { hour: 12, minute: 0, second: 0 } }, // Current year
        { year: 3000, month: 1, day: 1, time: { hour: 18, minute: 45, second: 30 } },
      ];

      testDates.forEach((testDate, index) => {
        const worldTime = golarionEngine.dateToWorldTime(testDate);
        const roundTrip = golarionEngine.worldTimeToDate(worldTime);

        expect(roundTrip.year).toBe(testDate.year);
        expect(roundTrip.month).toBe(testDate.month);
        expect(roundTrip.day).toBe(testDate.day);
        expect(roundTrip.time?.hour || 0).toBe(testDate.time.hour);
        expect(roundTrip.time?.minute || 0).toBe(testDate.time.minute);
        expect(roundTrip.time?.second || 0).toBe(testDate.time.second);
      });
    });

    test('Vale Reckoning round-trip conversion with known dates', () => {
      const testDates = [
        { year: 0, month: 1, day: 1, time: { hour: 0, minute: 0, second: 0 } }, // Epoch
        { year: 1542, month: 4, day: 15, time: { hour: 12, minute: 0, second: 0 } }, // Current year
        { year: 1000, month: 6, day: 30, time: { hour: 18, minute: 30, second: 45 } },
        { year: 500, month: 2, day: 10, time: { hour: 6, minute: 15, second: 20 } },
      ];

      testDates.forEach((testDate, index) => {
        const worldTime = valeReckoningEngine.dateToWorldTime(testDate);
        const roundTrip = valeReckoningEngine.worldTimeToDate(worldTime);

        expect(roundTrip.year).toBe(testDate.year);
        expect(roundTrip.month).toBe(testDate.month);
        expect(roundTrip.day).toBe(testDate.day);
        expect(roundTrip.time?.hour || 0).toBe(testDate.time.hour);
        expect(roundTrip.time?.minute || 0).toBe(testDate.time.minute);
        expect(roundTrip.time?.second || 0).toBe(testDate.time.second);
      });
    });

    test('Test worldTime sequence continuity', () => {
      // Test that sequential worldTime values produce sequential dates
      const baseWorldTime = 86400 * 1000; // Start at day 1000 to avoid epoch issues

      [gregorianEngine, golarionEngine].forEach((engine, index) => {
        const calendarNames = ['Gregorian', 'Golarion'];

        let previousDate = engine.worldTimeToDate(baseWorldTime);

        // Test 10 sequential days
        for (let dayOffset = 1; dayOffset <= 10; dayOffset++) {
          const currentWorldTime = baseWorldTime + dayOffset * 86400;
          const currentDate = engine.worldTimeToDate(currentWorldTime);

          // Calculate expected next day
          const expectedDate = engine.addDays(previousDate, 1);

          // Should match expected sequential date
          expect(currentDate.year).toBe(expectedDate.year);
          expect(currentDate.month).toBe(expectedDate.month);
          expect(currentDate.day).toBe(expectedDate.day);

          previousDate = currentDate;
        }
      });
    });
  });

  describe('🌍 Calendar-Specific WorldTime Behavior', () => {
    test('Compare worldTime interpretation across calendar types', () => {
      const testWorldTimes = [0, 86400, 31536000]; // 0 days, 1 day, ~1 year

      testWorldTimes.forEach(worldTime => {
        [gregorianEngine, golarionEngine, valeReckoningEngine].forEach((engine, index) => {
          const calendarNames = ['Gregorian', 'Golarion', 'Vale Reckoning'];

          const date = engine.worldTimeToDate(worldTime);

          // All calendars should produce valid dates for the same worldTime
          expect(date.year).toBeGreaterThanOrEqual(0);
          expect(date.month).toBeGreaterThanOrEqual(1);
          expect(date.day).toBeGreaterThanOrEqual(1);
        });
      });
    });

    test('Verify calendar-specific worldTime configuration effects', () => {
      // Test how different worldTime configurations affect date calculation
      const calendars = [
        { name: 'Gregorian', engine: gregorianEngine },
        { name: 'Golarion (PF2e)', engine: golarionEngine },
        { name: 'Vale Reckoning', engine: valeReckoningEngine },
      ];

      calendars.forEach(({ name, engine }) => {
        const calendar = engine.getCalendar();

        if (calendar.worldTime) {
        } else {
        }

        // Test worldTime=0 behavior
        const worldTimeZeroDate = engine.worldTimeToDate(0);

        // Verify the interpretation works as expected
        if (calendar.worldTime?.interpretation === 'real-time-based') {
          // Should produce a year close to currentYear, not epochYear
          expect(worldTimeZeroDate.year).toBeCloseTo(calendar.worldTime.currentYear, -1);
        } else {
          // Should produce a year close to epochYear
          const epochYear = calendar.worldTime?.epochYear || calendar.year.epoch;
          expect(worldTimeZeroDate.year).toBeCloseTo(epochYear, -1);
        }
      });
    });
  });
});
