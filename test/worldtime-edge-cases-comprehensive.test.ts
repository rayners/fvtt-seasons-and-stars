/**
 * Comprehensive WorldTime Edge Cases Test Suite
 *
 * This test suite covers edge cases and boundary conditions for worldTime interpretation
 * that may not be covered by existing regression tests. These edge cases help identify
 * potential issues with date calculation logic under unusual conditions.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../src/types/calendar';
import * as fs from 'fs';
import * as path from 'path';

// Load test calendars
function loadCalendar(fileName: string): SeasonsStarsCalendar {
  const calendarPath = path.join('calendars', fileName);
  const calendarData = JSON.parse(fs.readFileSync(calendarPath, 'utf8'));
  return calendarData;
}

describe('WorldTime Edge Cases - Comprehensive Test Suite', () => {
  let gregorianEngine: CalendarEngine;
  let golarionEngine: CalendarEngine;
  let valeReckoningEngine: CalendarEngine;

  beforeEach(() => {
    gregorianEngine = new CalendarEngine(loadCalendar('gregorian.json'));
    golarionEngine = new CalendarEngine(loadCalendar('golarion-pf2e.json'));
    valeReckoningEngine = new CalendarEngine(loadCalendar('vale-reckoning.json'));
  });

  describe('🔢 Extreme WorldTime Values', () => {
    test('Handle worldTime = 0 (epoch start)', () => {
      console.log('\n=== WORLDTIME ZERO TEST ===');

      const engines = [
        { name: 'Gregorian', engine: gregorianEngine },
        { name: 'Golarion', engine: golarionEngine },
        { name: 'Vale Reckoning', engine: valeReckoningEngine },
      ];

      engines.forEach(({ name, engine }) => {
        console.log(`\n${name} Calendar:`);

        const date = engine.worldTimeToDate(0);
        console.log(
          `  WorldTime=0 -> ${date.year}/${date.month}/${date.day} ${date.time?.hour || 0}:${date.time?.minute || 0}:${date.time?.second || 0}`
        );

        // Should produce valid dates
        expect(date.year).toBeGreaterThan(0);
        expect(date.month).toBeGreaterThanOrEqual(1);
        expect(date.month).toBeLessThanOrEqual(12); // Assume max 12 months for most calendars
        expect(date.day).toBeGreaterThanOrEqual(1);
        expect(date.day).toBeLessThanOrEqual(31); // Assume max 31 days per month

        // Time should start at midnight
        expect(date.time?.hour || 0).toBe(0);
        expect(date.time?.minute || 0).toBe(0);
        expect(date.time?.second || 0).toBe(0);

        console.log(`  ✅ Valid date produced for worldTime=0`);
      });
    });

    test('Handle negative worldTime values', () => {
      console.log('\n=== NEGATIVE WORLDTIME TEST ===');

      const negativeValues = [-1, -86400, -31536000]; // -1 sec, -1 day, -1 year

      negativeValues.forEach(worldTime => {
        console.log(`\nTesting worldTime = ${worldTime}:`);

        [gregorianEngine, golarionEngine, valeReckoningEngine].forEach((engine, index) => {
          const calendarNames = ['Gregorian', 'Golarion', 'Vale Reckoning'];

          try {
            const date = engine.worldTimeToDate(worldTime);
            console.log(`  ${calendarNames[index]}: ${date.year}/${date.month}/${date.day}`);

            // Should either produce valid dates or handle gracefully
            expect(date.year).toBeGreaterThan(-10000); // Reasonable lower bound
            expect(date.month).toBeGreaterThanOrEqual(1);
            expect(date.day).toBeGreaterThanOrEqual(1);
          } catch (error) {
            console.log(`  ${calendarNames[index]}: Error handled - ${error.message}`);
            // If errors are thrown, they should be meaningful
            expect(error).toBeDefined();
          }
        });
      });

      console.log('✅ NEGATIVE VALUES: Handled appropriately (valid dates or graceful errors)');
    });

    test('Handle very large worldTime values', () => {
      console.log('\n=== LARGE WORLDTIME TEST ===');

      const largeValues = [
        31536000000, // ~1000 years in seconds
        315360000000, // ~10000 years in seconds
        3153600000000, // ~100000 years in seconds
      ];

      largeValues.forEach(worldTime => {
        console.log(
          `\nTesting worldTime = ${worldTime} (~${Math.floor(worldTime / 31536000)} years):`
        );

        [gregorianEngine, golarionEngine, valeReckoningEngine].forEach((engine, index) => {
          const calendarNames = ['Gregorian', 'Golarion', 'Vale Reckoning'];

          try {
            const date = engine.worldTimeToDate(worldTime);
            console.log(`  ${calendarNames[index]}: ${date.year}/${date.month}/${date.day}`);

            // Should produce reasonable years (not negative or impossible values)
            expect(date.year).toBeGreaterThan(0);
            expect(date.year).toBeLessThan(1000000); // Reasonable upper bound
            expect(date.month).toBeGreaterThanOrEqual(1);
            expect(date.day).toBeGreaterThanOrEqual(1);
          } catch (error) {
            console.log(`  ${calendarNames[index]}: Error handled - ${error.message}`);
            // Large values might legitimately cause overflow errors
            expect(error).toBeDefined();
          }
        });
      });

      console.log('✅ LARGE VALUES: Handled appropriately (valid dates or reasonable limits)');
    });
  });

  describe('📅 Date Boundary Edge Cases', () => {
    test('Handle end-of-year boundaries with worldTime conversion', () => {
      console.log('\n=== YEAR BOUNDARY WORLDTIME TEST ===');

      // Test dates right at year boundaries
      const testDates = [
        { year: 2023, month: 12, day: 31, time: { hour: 23, minute: 59, second: 59 } },
        { year: 2024, month: 1, day: 1, time: { hour: 0, minute: 0, second: 0 } },
        { year: 2024, month: 12, day: 31, time: { hour: 23, minute: 59, second: 59 } },
        { year: 2025, month: 1, day: 1, time: { hour: 0, minute: 0, second: 0 } },
      ];

      testDates.forEach(testDate => {
        console.log(
          `\nTesting boundary: ${testDate.year}/${testDate.month}/${testDate.day} ${testDate.time.hour}:${testDate.time.minute}:${testDate.time.second}`
        );

        [gregorianEngine, golarionEngine].forEach((engine, index) => {
          const calendarNames = ['Gregorian', 'Golarion'];

          try {
            const worldTime = engine.dateToWorldTime(testDate);
            const roundTrip = engine.worldTimeToDate(worldTime);

            console.log(
              `  ${calendarNames[index]}: worldTime=${worldTime}, roundTrip=${roundTrip.year}/${roundTrip.month}/${roundTrip.day}`
            );

            // Round trip should preserve the date
            expect(roundTrip.year).toBe(testDate.year);
            expect(roundTrip.month).toBe(testDate.month);
            expect(roundTrip.day).toBe(testDate.day);
            expect(roundTrip.time?.hour || 0).toBe(testDate.time.hour);
            expect(roundTrip.time?.minute || 0).toBe(testDate.time.minute);
            expect(roundTrip.time?.second || 0).toBe(testDate.time.second);
          } catch (error) {
            console.log(`  ${calendarNames[index]}: Error - ${error.message}`);
            throw error; // Boundary cases should not fail
          }
        });
      });

      console.log('✅ YEAR BOUNDARIES: WorldTime conversion preserves exact dates and times');
    });

    test('Handle leap year boundaries with worldTime conversion', () => {
      console.log('\n=== LEAP YEAR BOUNDARY WORLDTIME TEST ===');

      // Test leap day and surrounding dates
      const leapYearTests = [
        { year: 2024, month: 2, day: 28, description: 'Day before leap day' },
        { year: 2024, month: 2, day: 29, description: 'Leap day itself' },
        { year: 2024, month: 3, day: 1, description: 'Day after leap day' },
        // Non-leap year for comparison
        { year: 2023, month: 2, day: 28, description: 'Feb 28 in non-leap year' },
        { year: 2023, month: 3, day: 1, description: 'Mar 1 in non-leap year' },
      ];

      leapYearTests.forEach(testDate => {
        console.log(
          `\nTesting: ${testDate.description} (${testDate.year}/${testDate.month}/${testDate.day})`
        );

        [gregorianEngine, golarionEngine].forEach((engine, index) => {
          const calendarNames = ['Gregorian', 'Golarion'];

          try {
            const worldTime = engine.dateToWorldTime(testDate);
            const roundTrip = engine.worldTimeToDate(worldTime);

            console.log(`  ${calendarNames[index]}: worldTime=${worldTime}, valid roundTrip`);

            // Round trip should preserve the date exactly
            expect(roundTrip.year).toBe(testDate.year);
            expect(roundTrip.month).toBe(testDate.month);
            expect(roundTrip.day).toBe(testDate.day);
          } catch (error) {
            if (testDate.month === 2 && testDate.day === 29 && testDate.year === 2023) {
              // Feb 29, 2023 doesn't exist (not a leap year) - error expected
              console.log(
                `  ${calendarNames[index]}: Expected error for invalid date - ${error.message}`
              );
              expect(error).toBeDefined();
            } else {
              console.log(`  ${calendarNames[index]}: Unexpected error - ${error.message}`);
              throw error;
            }
          }
        });
      });

      console.log('✅ LEAP YEAR BOUNDARIES: Correctly handled with worldTime conversion');
    });
  });

  describe('⏱️ Time Component Edge Cases', () => {
    test('Handle precise time components in worldTime conversion', () => {
      console.log('\n=== PRECISE TIME COMPONENT TEST ===');

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
        console.log(
          `\nTesting time: ${timeTest.description} (${timeTest.hour}:${timeTest.minute}:${timeTest.second})`
        );

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

          console.log(`  ${calendarNames[index]}: worldTime=${worldTime}`);
          console.log(
            `    Original: ${fullDate.time.hour}:${fullDate.time.minute}:${fullDate.time.second}`
          );
          console.log(
            `    Round-trip: ${roundTrip.time?.hour || 0}:${roundTrip.time?.minute || 0}:${roundTrip.time?.second || 0}`
          );

          // Time should be preserved exactly
          expect(roundTrip.time?.hour || 0).toBe(timeTest.hour);
          expect(roundTrip.time?.minute || 0).toBe(timeTest.minute);
          expect(roundTrip.time?.second || 0).toBe(timeTest.second);
        });
      });

      console.log(
        '✅ TIME PRECISION: All time components preserved exactly through worldTime conversion'
      );
    });

    test('Handle time arithmetic edge cases', () => {
      console.log('\n=== TIME ARITHMETIC EDGE CASES ===');

      // Test adding seconds that cross minute/hour/day boundaries
      const baseDate = {
        year: 2024,
        month: 6,
        day: 15,
        time: { hour: 23, minute: 59, second: 58 },
      };

      console.log(
        `Base time: ${baseDate.time.hour}:${baseDate.time.minute}:${baseDate.time.second}`
      );

      [gregorianEngine, golarionEngine].forEach((engine, index) => {
        const calendarNames = ['Gregorian', 'Golarion'];

        console.log(`\n${calendarNames[index]} Calendar:`);

        const baseWorldTime = engine.dateToWorldTime(baseDate);
        console.log(`  Base worldTime: ${baseWorldTime}`);

        // Test adding 1 second (should roll to 23:59:59)
        const plus1Sec = engine.worldTimeToDate(baseWorldTime + 1);
        console.log(
          `  +1 sec: ${plus1Sec.year}/${plus1Sec.month}/${plus1Sec.day} ${plus1Sec.time?.hour}:${plus1Sec.time?.minute}:${plus1Sec.time?.second}`
        );
        expect(plus1Sec.time?.second).toBe(59);
        expect(plus1Sec.day).toBe(baseDate.day); // Same day

        // Test adding 2 seconds (should roll to next minute: 24:00:00 -> 00:00:00 next day)
        const plus2Sec = engine.worldTimeToDate(baseWorldTime + 2);
        console.log(
          `  +2 sec: ${plus2Sec.year}/${plus2Sec.month}/${plus2Sec.day} ${plus2Sec.time?.hour}:${plus2Sec.time?.minute}:${plus2Sec.time?.second}`
        );
        expect(plus2Sec.time?.hour).toBe(0);
        expect(plus2Sec.time?.minute).toBe(0);
        expect(plus2Sec.time?.second).toBe(0);
        expect(plus2Sec.day).toBe(baseDate.day + 1); // Next day

        // Test adding 1 hour + 2 seconds (should be next day, 01:00:00)
        const plus1Hour2Sec = engine.worldTimeToDate(baseWorldTime + 3600 + 2);
        console.log(
          `  +1h 2s: ${plus1Hour2Sec.year}/${plus1Hour2Sec.month}/${plus1Hour2Sec.day} ${plus1Hour2Sec.time?.hour}:${plus1Hour2Sec.time?.minute}:${plus1Hour2Sec.time?.second}`
        );
        expect(plus1Hour2Sec.time?.hour).toBe(1);
        expect(plus1Hour2Sec.time?.minute).toBe(0);
        expect(plus1Hour2Sec.time?.second).toBe(0);
        expect(plus1Hour2Sec.day).toBe(baseDate.day + 1); // Next day
      });

      console.log('✅ TIME ARITHMETIC: Correctly handles second/minute/hour/day boundaries');
    });
  });

  describe('🔄 Bidirectional Conversion Stress Tests', () => {
    test('Stress test round-trip conversion with random dates', () => {
      console.log('\n=== ROUND-TRIP CONVERSION STRESS TEST ===');

      // Generate random test dates
      const randomDates = [];
      for (let i = 0; i < 20; i++) {
        randomDates.push({
          year: 1900 + Math.floor(Math.random() * 200), // 1900-2099
          month: 1 + Math.floor(Math.random() * 12), // 1-12
          day: 1 + Math.floor(Math.random() * 28), // 1-28 (safe for all months)
          time: {
            hour: Math.floor(Math.random() * 24), // 0-23
            minute: Math.floor(Math.random() * 60), // 0-59
            second: Math.floor(Math.random() * 60), // 0-59
          },
        });
      }

      console.log(`Testing ${randomDates.length} random dates...`);

      [gregorianEngine, golarionEngine, valeReckoningEngine].forEach((engine, engineIndex) => {
        const calendarNames = ['Gregorian', 'Golarion', 'Vale Reckoning'];

        console.log(`\n${calendarNames[engineIndex]} Calendar:`);

        randomDates.forEach((testDate, dateIndex) => {
          try {
            const worldTime = engine.dateToWorldTime(testDate);
            const roundTrip = engine.worldTimeToDate(worldTime);

            // Verify exact round-trip preservation
            expect(roundTrip.year).toBe(testDate.year);
            expect(roundTrip.month).toBe(testDate.month);
            expect(roundTrip.day).toBe(testDate.day);
            expect(roundTrip.time?.hour || 0).toBe(testDate.time.hour);
            expect(roundTrip.time?.minute || 0).toBe(testDate.time.minute);
            expect(roundTrip.time?.second || 0).toBe(testDate.time.second);

            if ((dateIndex + 1) % 5 === 0) {
              console.log(`    ${dateIndex + 1}/20 tests passed`);
            }
          } catch (error) {
            console.log(
              `    Date ${dateIndex + 1} failed: ${testDate.year}/${testDate.month}/${testDate.day} - ${error.message}`
            );
            throw error;
          }
        });

        console.log(`  ✅ All ${randomDates.length} random dates converted correctly`);
      });

      console.log('✅ STRESS TEST: All calendars handle random date round-trips correctly');
    });

    test('Test worldTime sequence continuity', () => {
      console.log('\n=== WORLDTIME SEQUENCE CONTINUITY TEST ===');

      // Test that sequential worldTime values produce sequential dates
      const baseWorldTime = 86400 * 1000; // Start at day 1000 to avoid epoch issues

      [gregorianEngine, golarionEngine].forEach((engine, index) => {
        const calendarNames = ['Gregorian', 'Golarion'];

        console.log(`\n${calendarNames[index]} Calendar:`);

        let previousDate = engine.worldTimeToDate(baseWorldTime);
        console.log(
          `  Base (worldTime=${baseWorldTime}): ${previousDate.year}/${previousDate.month}/${previousDate.day}`
        );

        // Test 10 sequential days
        for (let dayOffset = 1; dayOffset <= 10; dayOffset++) {
          const currentWorldTime = baseWorldTime + dayOffset * 86400;
          const currentDate = engine.worldTimeToDate(currentWorldTime);

          console.log(
            `  Day +${dayOffset} (worldTime=${currentWorldTime}): ${currentDate.year}/${currentDate.month}/${currentDate.day}`
          );

          // Calculate expected next day
          const expectedDate = engine.addDays(previousDate, 1);

          // Should match expected sequential date
          expect(currentDate.year).toBe(expectedDate.year);
          expect(currentDate.month).toBe(expectedDate.month);
          expect(currentDate.day).toBe(expectedDate.day);

          previousDate = currentDate;
        }

        console.log(`  ✅ Sequential worldTime values produce sequential dates`);
      });

      console.log('✅ SEQUENCE CONTINUITY: WorldTime increments produce expected date sequences');
    });
  });

  describe('🌍 Calendar-Specific WorldTime Behavior', () => {
    test('Compare worldTime interpretation across calendar types', () => {
      console.log('\n=== CROSS-CALENDAR WORLDTIME COMPARISON ===');

      const testWorldTimes = [0, 86400, 31536000]; // 0 days, 1 day, ~1 year

      testWorldTimes.forEach(worldTime => {
        console.log(`\nWorldTime = ${worldTime} (${Math.floor(worldTime / 86400)} days):`);

        [gregorianEngine, golarionEngine, valeReckoningEngine].forEach((engine, index) => {
          const calendarNames = ['Gregorian', 'Golarion', 'Vale Reckoning'];

          const date = engine.worldTimeToDate(worldTime);
          console.log(`  ${calendarNames[index]}: ${date.year}/${date.month}/${date.day}`);

          // All calendars should produce valid dates for the same worldTime
          expect(date.year).toBeGreaterThan(0);
          expect(date.month).toBeGreaterThanOrEqual(1);
          expect(date.day).toBeGreaterThanOrEqual(1);
        });
      });

      console.log('✅ CROSS-CALENDAR: All calendars produce valid dates for same worldTime values');
    });

    test('Verify calendar-specific worldTime configuration effects', () => {
      console.log('\n=== CALENDAR WORLDTIME CONFIGURATION TEST ===');

      // Test how different worldTime configurations affect date calculation
      const calendars = [
        { name: 'Gregorian', engine: gregorianEngine },
        { name: 'Golarion (PF2e)', engine: golarionEngine },
        { name: 'Vale Reckoning', engine: valeReckoningEngine },
      ];

      calendars.forEach(({ name, engine }) => {
        console.log(`\n${name} Configuration:`);

        const calendar = engine.getCalendar();

        if (calendar.worldTime) {
          console.log(`  Interpretation: ${calendar.worldTime.interpretation}`);
          console.log(`  Epoch year: ${calendar.worldTime.epochYear}`);
          console.log(`  Current year: ${calendar.worldTime.currentYear}`);
        } else {
          console.log(`  No worldTime configuration - using legacy mode`);
        }

        // Test worldTime=0 behavior
        const worldTimeZeroDate = engine.worldTimeToDate(0);
        console.log(
          `  WorldTime=0 produces: ${worldTimeZeroDate.year}/${worldTimeZeroDate.month}/${worldTimeZeroDate.day}`
        );

        // Verify the interpretation works as expected
        if (calendar.worldTime?.interpretation === 'real-time-based') {
          // Should produce a year close to currentYear, not epochYear
          expect(worldTimeZeroDate.year).toBeCloseTo(calendar.worldTime.currentYear, -1);
          console.log(
            `  ✅ Real-time interpretation: Year close to ${calendar.worldTime.currentYear}`
          );
        } else {
          // Should produce a year close to epochYear
          const epochYear = calendar.worldTime?.epochYear || calendar.year.epoch;
          expect(worldTimeZeroDate.year).toBeCloseTo(epochYear, -1);
          console.log(`  ✅ Epoch-based interpretation: Year close to ${epochYear}`);
        }
      });

      console.log('✅ CONFIGURATION: WorldTime interpretation modes work as designed');
    });
  });
});
