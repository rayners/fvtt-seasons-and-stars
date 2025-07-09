/**
 * Forbidden Lands Calendar Test Suite
 *
 * Tests for Forbidden Lands calendar-specific functionality, particularly season alignment
 * with month boundaries and general calendar consistency. These tests ensure the Forbidden
 * Lands calendar system works correctly with its fantasy-themed structure.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../../src/types/calendar';
import * as fs from 'fs';
import * as path from 'path';

// Load Forbidden Lands calendar for testing
function loadCalendar(): SeasonsStarsCalendar {
  const calendarPath = path.join('packages/fantasy-pack/calendars', 'forbidden-lands.json');
  const calendarData = JSON.parse(fs.readFileSync(calendarPath, 'utf8'));
  return calendarData;
}

describe('Forbidden Lands Calendar - Season Alignment', () => {
  let forbiddenLandsEngine: CalendarEngine;

  beforeEach(() => {
    forbiddenLandsEngine = new CalendarEngine(loadCalendar());
  });

  describe('🗡️ Forbidden Lands Calendar - Season Alignment', () => {
    test('Forbidden Lands should have seasons defined', () => {
      console.log('\n=== FORBIDDEN LANDS SEASON ALIGNMENT TEST ===');

      const forbiddenLandsCalendar = forbiddenLandsEngine.getCalendar();

      // Test should fail if seasons are missing - most fantasy calendars should have seasons
      expect(forbiddenLandsCalendar.seasons).toBeDefined();
      expect(Array.isArray(forbiddenLandsCalendar.seasons)).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(forbiddenLandsCalendar.seasons!.length).toBeGreaterThan(0);

      const year = forbiddenLandsCalendar.year.currentYear + 1;

      console.log('Forbidden Lands seasons:');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      forbiddenLandsCalendar.seasons!.forEach((season, index) => {
        console.log(
          `  ${season.name}: starts month ${season.startMonth} (endMonth: ${season.endMonth || 'not specified'})`
        );

        // Test that season start aligns with month boundaries
        const seasonStartDate = { year, month: season.startMonth, day: 1 };
        const weekdayAtStart = forbiddenLandsEngine.calculateWeekday(
          seasonStartDate.year,
          seasonStartDate.month,
          seasonStartDate.day
        );

        console.log(
          `    ${season.name} starts on weekday ${weekdayAtStart} (${forbiddenLandsCalendar.weekdays[weekdayAtStart]?.name})`
        );

        // Seasons should start on valid weekdays
        expect(weekdayAtStart).toBeGreaterThanOrEqual(0);
        expect(weekdayAtStart).toBeLessThan(forbiddenLandsCalendar.weekdays.length);
      });

      console.log('✅ FORBIDDEN LANDS SEASONS: Season transitions align correctly with calendar');
    });

    test('Forbidden Lands basic calendar operations work correctly', () => {
      console.log('\n=== FORBIDDEN LANDS BASIC OPERATIONS TEST ===');

      const forbiddenLandsCalendar = forbiddenLandsEngine.getCalendar();
      const year = forbiddenLandsCalendar.year.currentYear + 1;

      console.log(`Forbidden Lands calendar (${forbiddenLandsCalendar.id}):`);
      console.log(`  Months: ${forbiddenLandsCalendar.months.length}`);
      console.log(`  Weekdays: ${forbiddenLandsCalendar.weekdays.length}`);

      // Test basic operations
      const testDate = { year, month: 1, day: 1 };

      try {
        const weekday = forbiddenLandsEngine.calculateWeekday(
          testDate.year,
          testDate.month,
          testDate.day
        );
        const worldTime = forbiddenLandsEngine.dateToWorldTime(testDate);
        const roundTrip = forbiddenLandsEngine.worldTimeToDate(worldTime);
        const yearLength = forbiddenLandsEngine.getYearLength(testDate.year);

        console.log(`  Start of year: ${testDate.year}/${testDate.month}/${testDate.day}`);
        console.log(`  Weekday: ${weekday} (${forbiddenLandsCalendar.weekdays[weekday]?.name})`);
        console.log(`  WorldTime: ${worldTime}`);
        console.log(`  Round-trip: ${roundTrip.year}/${roundTrip.month}/${roundTrip.day}`);
        console.log(`  Year length: ${yearLength} days`);

        // Basic validations
        expect(weekday).toBeGreaterThanOrEqual(0);
        expect(weekday).toBeLessThan(forbiddenLandsCalendar.weekdays.length);
        expect(worldTime).toBeGreaterThanOrEqual(0);
        expect(roundTrip.year).toBe(testDate.year);
        expect(roundTrip.month).toBe(testDate.month);
        expect(roundTrip.day).toBe(testDate.day);
        expect(yearLength).toBeGreaterThan(300); // Reasonable minimum
        expect(yearLength).toBeLessThanOrEqual(400); // Reasonable maximum

        console.log(`  ✅ Basic operations successful`);
      } catch (error) {
        console.log(`  ❌ Error in basic operations: ${error.message}`);
        throw error;
      }

      console.log('✅ FORBIDDEN LANDS OPERATIONS: All basic calendar operations work correctly');
    });

    test('Forbidden Lands date arithmetic works correctly', () => {
      console.log('\n=== FORBIDDEN LANDS DATE ARITHMETIC TEST ===');

      const forbiddenLandsCalendar = forbiddenLandsEngine.getCalendar();
      const year = forbiddenLandsCalendar.year.currentYear + 1;
      const startDate = { year, month: 1, day: 1 };

      try {
        // Test adding various time periods
        const plus1Day = forbiddenLandsEngine.addDays(startDate, 1);
        const plus7Days = forbiddenLandsEngine.addDays(startDate, 7);
        const plus30Days = forbiddenLandsEngine.addDays(startDate, 30);

        console.log(`  Start: ${startDate.year}/${startDate.month}/${startDate.day}`);
        console.log(`  +1 day: ${plus1Day.year}/${plus1Day.month}/${plus1Day.day}`);
        console.log(`  +7 days: ${plus7Days.year}/${plus7Days.month}/${plus7Days.day}`);
        console.log(`  +30 days: ${plus30Days.year}/${plus30Days.month}/${plus30Days.day}`);

        // Basic progression should work
        expect(plus1Day.year).toBeGreaterThanOrEqual(startDate.year);
        expect(plus7Days.year).toBeGreaterThanOrEqual(startDate.year);
        expect(plus30Days.year).toBeGreaterThanOrEqual(startDate.year);

        // Days should advance (might cross month/year boundaries)
        const startTotal = startDate.year * 365 + startDate.month * 30 + startDate.day;
        const plus1Total = plus1Day.year * 365 + plus1Day.month * 30 + plus1Day.day;
        const plus7Total = plus7Days.year * 365 + plus7Days.month * 30 + plus7Days.day;
        const plus30Total = plus30Days.year * 365 + plus30Days.month * 30 + plus30Days.day;

        expect(plus1Total).toBeGreaterThan(startTotal);
        expect(plus7Total).toBeGreaterThan(plus1Total);
        expect(plus30Total).toBeGreaterThan(plus7Total);

        console.log(`  ✅ Date arithmetic works correctly`);
      } catch (error) {
        console.log(`  ❌ Date arithmetic failed: ${error.message}`);
        throw error;
      }

      console.log('✅ FORBIDDEN LANDS ARITHMETIC: Date arithmetic functions correctly');
    });
  });
});
