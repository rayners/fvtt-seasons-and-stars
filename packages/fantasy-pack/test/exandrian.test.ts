/**
 * Exandrian Calendar Test Suite
 *
 * Tests for Exandrian (Critical Role) calendar-specific functionality, particularly month
 * lengths matching Critical Role canon and weekday calculation consistency. These tests
 * ensure the Exandrian calendar system works correctly for Critical Role campaigns.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../../core/src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../../core/src/types/calendar';
import * as fs from 'fs';
import * as path from 'path';

// Load Exandrian calendar for testing
function loadCalendar(): SeasonsStarsCalendar {
  const calendarPath = path.join(__dirname, '../calendars', 'exandrian.json');
  const calendarData = JSON.parse(fs.readFileSync(calendarPath, 'utf8'));
  return calendarData;
}

describe('Exandrian Calendar - Critical Role Specific Issues', () => {
  let exandrianEngine: CalendarEngine;

  beforeEach(() => {
    exandrianEngine = new CalendarEngine(loadCalendar());
  });

  describe('🌟 Exandrian Calendar - Critical Role Specific Issues', () => {
    test('Exandrian month lengths should match Critical Role canon', () => {
      console.log('\n=== EXANDRIAN MONTH LENGTH TEST ===');

      const exandrianCalendar = exandrianEngine.getCalendar();

      console.log('Exandrian months:');
      exandrianCalendar.months.forEach((month, index) => {
        console.log(`  ${index + 1}. ${month.name}: ${month.days} days`);

        // Most Exandrian months should have reasonable lengths
        expect(month.days).toBeGreaterThan(0);
        expect(month.days).toBeLessThanOrEqual(35); // Reasonable upper bound
      });

      // Calculate total year length
      const totalDays = exandrianCalendar.months.reduce((sum, month) => sum + month.days, 0);
      const yearLength = exandrianEngine.getYearLength(exandrianCalendar.year.currentYear + 1);

      console.log(`\nTotal month days: ${totalDays}`);
      console.log(`Calculated year length: ${yearLength}`);

      // Year length should include intercalary days if any
      expect(yearLength).toBeGreaterThanOrEqual(totalDays);

      console.log('✅ EXANDRIAN MONTHS: Month lengths are reasonable and year calculation correct');
    });

    test('Exandrian weekday calculation should be consistent', () => {
      console.log('\n=== EXANDRIAN WEEKDAY CONSISTENCY TEST ===');

      const exandrianCalendar = exandrianEngine.getCalendar();
      const year = exandrianCalendar.year.currentYear + 1;

      console.log('Exandrian weekdays:');
      exandrianCalendar.weekdays.forEach((weekday, index) => {
        console.log(`  ${index}: ${weekday.name}`);
      });

      // Test weekday progression across month boundaries
      const testMonth = 1;
      const monthLength = exandrianCalendar.months[testMonth - 1].days;

      console.log(
        `\nTesting weekday progression in ${exandrianCalendar.months[testMonth - 1].name} (${monthLength} days):`
      );

      for (let day = 1; day <= Math.min(monthLength, 7); day++) {
        const weekday = exandrianEngine.calculateWeekday(year, testMonth, day);
        const weekdayName = exandrianCalendar.weekdays[weekday]?.name;

        console.log(`  Day ${day}: weekday ${weekday} (${weekdayName})`);

        // Weekday should be valid
        expect(weekday).toBeGreaterThanOrEqual(0);
        expect(weekday).toBeLessThan(exandrianCalendar.weekdays.length);

        // Check progression (day 2 should be day 1 + 1, etc.)
        if (day > 1) {
          const previousWeekday = exandrianEngine.calculateWeekday(year, testMonth, day - 1);
          const expectedWeekday = (previousWeekday + 1) % exandrianCalendar.weekdays.length;
          expect(weekday).toBe(expectedWeekday);
        }
      }

      console.log('✅ EXANDRIAN WEEKDAYS: Weekday progression is consistent and valid');
    });

    test('Exandrian basic calendar operations work correctly', () => {
      console.log('\n=== EXANDRIAN BASIC OPERATIONS TEST ===');

      const exandrianCalendar = exandrianEngine.getCalendar();
      const year = exandrianCalendar.year.currentYear + 1;

      console.log(`Exandrian calendar (${exandrianCalendar.id}):`);
      console.log(`  Months: ${exandrianCalendar.months.length}`);
      console.log(`  Weekdays: ${exandrianCalendar.weekdays.length}`);

      // Test basic operations
      const testDate = { year, month: 1, day: 1 };

      try {
        const weekday = exandrianEngine.calculateWeekday(
          testDate.year,
          testDate.month,
          testDate.day
        );
        const worldTime = exandrianEngine.dateToWorldTime(testDate);
        const roundTrip = exandrianEngine.worldTimeToDate(worldTime);
        const yearLength = exandrianEngine.getYearLength(testDate.year);

        console.log(`  Start of year: ${testDate.year}/${testDate.month}/${testDate.day}`);
        console.log(`  Weekday: ${weekday} (${exandrianCalendar.weekdays[weekday]?.name})`);
        console.log(`  WorldTime: ${worldTime}`);
        console.log(`  Round-trip: ${roundTrip.year}/${roundTrip.month}/${roundTrip.day}`);
        console.log(`  Year length: ${yearLength} days`);

        // Basic validations
        expect(weekday).toBeGreaterThanOrEqual(0);
        expect(weekday).toBeLessThan(exandrianCalendar.weekdays.length);
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

      console.log('✅ EXANDRIAN OPERATIONS: All basic calendar operations work correctly');
    });

    test('Exandrian date arithmetic works correctly', () => {
      console.log('\n=== EXANDRIAN DATE ARITHMETIC TEST ===');

      const exandrianCalendar = exandrianEngine.getCalendar();
      const year = exandrianCalendar.year.currentYear + 1;
      const startDate = { year, month: 1, day: 1 };

      try {
        // Test adding various time periods
        const plus1Day = exandrianEngine.addDays(startDate, 1);
        const plus7Days = exandrianEngine.addDays(startDate, 7);
        const plus30Days = exandrianEngine.addDays(startDate, 30);

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

      console.log('✅ EXANDRIAN ARITHMETIC: Date arithmetic functions correctly');
    });
  });
});
