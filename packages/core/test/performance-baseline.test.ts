/**
 * Performance Baseline Test
 *
 * Ensures WFRP calendar fixes don't degrade performance
 */

import { describe, it, expect } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import * as fs from 'fs';
import * as path from 'path';

describe('Performance Baseline Tests', () => {
  // Test both WFRP (complex) and Gregorian (simple) calendars
  const calendarsToTest = [
    { name: 'warhammer', file: 'warhammer.json', maxTime: 10 }, // More complex with intercalary days
    { name: 'gregorian', file: 'gregorian.json', maxTime: 5 }, // Simpler calendar
  ];

  calendarsToTest.forEach(({ name, file, maxTime }) => {
    describe(`${name} Calendar Performance`, () => {
      let engine: CalendarEngine;

      beforeEach(() => {
        const calendarPath = path.join('calendars', file);
        const calendarData = JSON.parse(fs.readFileSync(calendarPath, 'utf8'));
        engine = new CalendarEngine(calendarData);
      });

      it(`should perform date calculations within ${maxTime}ms`, () => {
        const iterations = 1000;
        const testDate = { year: 2522, month: 1, day: 1, weekday: 0 };

        // Test date-to-days conversion performance
        const startTime = performance.now();
        for (let i = 0; i < iterations; i++) {
          engine.dateToDays(testDate);
        }
        const endTime = performance.now();

        const totalTime = endTime - startTime;
        const avgTime = totalTime / iterations;

        console.log(
          `${name} dateToDays: ${avgTime.toFixed(3)}ms avg, ${totalTime.toFixed(1)}ms total (${iterations} iterations)`
        );
        expect(avgTime).toBeLessThan(maxTime);
      });

      it(`should perform weekday calculations within ${maxTime}ms`, () => {
        const iterations = 1000;

        // Test weekday calculation performance
        const startTime = performance.now();
        for (let i = 0; i < iterations; i++) {
          engine.calculateWeekday(2522, 1, (i % 30) + 1);
        }
        const endTime = performance.now();

        const totalTime = endTime - startTime;
        const avgTime = totalTime / iterations;

        console.log(
          `${name} calculateWeekday: ${avgTime.toFixed(3)}ms avg, ${totalTime.toFixed(1)}ms total (${iterations} iterations)`
        );
        expect(avgTime).toBeLessThan(maxTime);
      });

      it(`should perform addDays operations within ${maxTime}ms`, () => {
        const iterations = 100; // Fewer iterations for more complex operation
        const testDate = { year: 2522, month: 1, day: 1, weekday: 0 };

        // Test addDays performance
        const startTime = performance.now();
        for (let i = 0; i < iterations; i++) {
          engine.addDays(testDate, (i % 30) + 1);
        }
        const endTime = performance.now();

        const totalTime = endTime - startTime;
        const avgTime = totalTime / iterations;

        console.log(
          `${name} addDays: ${avgTime.toFixed(3)}ms avg, ${totalTime.toFixed(1)}ms total (${iterations} iterations)`
        );
        expect(avgTime).toBeLessThan(maxTime);
      });
    });
  });

  // Test that WFRP performance is acceptable compared to simpler calendars
  it('should maintain reasonable performance with intercalary days', () => {
    const wfrpPath = path.join('calendars', 'warhammer.json');
    const wfrpData = JSON.parse(fs.readFileSync(wfrpPath, 'utf8'));
    const wfrpEngine = new CalendarEngine(wfrpData);

    const gregorianPath = path.join('calendars', 'gregorian.json');
    const gregorianData = JSON.parse(fs.readFileSync(gregorianPath, 'utf8'));
    const gregorianEngine = new CalendarEngine(gregorianData);

    const iterations = 1000;

    // Time WFRP calculations
    const wfrpStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      wfrpEngine.calculateWeekday(2522, 1, (i % 30) + 1);
    }
    const wfrpTime = performance.now() - wfrpStart;

    // Time Gregorian calculations
    const gregorianStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      gregorianEngine.calculateWeekday(2522, 1, (i % 30) + 1);
    }
    const gregorianTime = performance.now() - gregorianStart;

    const slowdownFactor = wfrpTime / gregorianTime;

    console.log(
      `WFRP time: ${wfrpTime.toFixed(1)}ms, Gregorian time: ${gregorianTime.toFixed(1)}ms`
    );
    console.log(`WFRP slowdown factor: ${slowdownFactor.toFixed(2)}x`);

    // WFRP should not be more than 4x slower than Gregorian due to intercalary day logic
    expect(slowdownFactor).toBeLessThan(4);
  });
});
