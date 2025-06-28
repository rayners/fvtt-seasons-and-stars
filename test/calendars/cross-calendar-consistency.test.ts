/**
 * Cross-Calendar Consistency Test Suite
 *
 * Tests that verify consistent behavior across all fantasy calendars to ensure that
 * calendar-specific features don't break common functionality. These tests help maintain
 * compatibility and consistency across the entire calendar ecosystem.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../../src/types/calendar';
import * as fs from 'fs';
import * as path from 'path';

// Load specific calendars for testing
function loadCalendar(fileName: string): SeasonsStarsCalendar {
  const calendarPath = path.join('calendars', fileName);
  const calendarData = JSON.parse(fs.readFileSync(calendarPath, 'utf8'));
  return calendarData;
}

describe('Cross-Calendar Consistency Tests', () => {
  let wfrpEngine: CalendarEngine;
  let darkSunEngine: CalendarEngine;
  let forbiddenLandsEngine: CalendarEngine;
  let exandrianEngine: CalendarEngine;

  beforeEach(() => {
    wfrpEngine = new CalendarEngine(loadCalendar('warhammer.json'));
    darkSunEngine = new CalendarEngine(loadCalendar('dark-sun.json'));
    forbiddenLandsEngine = new CalendarEngine(loadCalendar('forbidden-lands.json'));
    exandrianEngine = new CalendarEngine(loadCalendar('exandrian.json'));
  });

  describe('📊 Cross-Calendar Consistency Tests', () => {
    test('All fantasy calendars should handle basic date operations consistently', () => {
      console.log('\n=== CROSS-CALENDAR CONSISTENCY TEST ===');

      const engines = [
        { name: 'WFRP', engine: wfrpEngine },
        { name: 'Dark Sun', engine: darkSunEngine },
        { name: 'Forbidden Lands', engine: forbiddenLandsEngine },
        { name: 'Exandrian', engine: exandrianEngine },
      ];

      engines.forEach(({ name, engine }) => {
        console.log(`\n${name} Calendar:`);

        const calendar = engine.getCalendar();
        const year = calendar.year.currentYear + 1;

        // Test basic operations
        const testDate = { year, month: 1, day: 1 };

        try {
          const weekday = engine.calculateWeekday(testDate.year, testDate.month, testDate.day);
          const worldTime = engine.dateToWorldTime(testDate);
          const roundTrip = engine.worldTimeToDate(worldTime);
          const yearLength = engine.getYearLength(testDate.year);

          console.log(`  Start of year: ${testDate.year}/${testDate.month}/${testDate.day}`);
          console.log(`  Weekday: ${weekday} (${calendar.weekdays[weekday]?.name})`);
          console.log(`  WorldTime: ${worldTime}`);
          console.log(`  Round-trip: ${roundTrip.year}/${roundTrip.month}/${roundTrip.day}`);
          console.log(`  Year length: ${yearLength} days`);

          // Basic validations
          expect(weekday).toBeGreaterThanOrEqual(0);
          expect(weekday).toBeLessThan(calendar.weekdays.length);
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
      });

      console.log(
        '\n✅ CROSS-CALENDAR: All fantasy calendars handle basic operations consistently'
      );
    });

    test('Calendar-specific features should not break common functionality', () => {
      console.log('\n=== CALENDAR FEATURE ISOLATION TEST ===');

      const engines = [
        { name: 'WFRP (with intercalary)', engine: wfrpEngine },
        { name: 'Dark Sun (with special weekdays)', engine: darkSunEngine },
        { name: 'Forbidden Lands (with seasons)', engine: forbiddenLandsEngine },
        { name: 'Exandrian (Critical Role)', engine: exandrianEngine },
      ];

      // Test that special features don't break standard date arithmetic
      engines.forEach(({ name, engine }) => {
        console.log(`\n${name}:`);

        const calendar = engine.getCalendar();
        const year = calendar.year.currentYear + 1;
        const startDate = { year, month: 1, day: 1 };

        try {
          // Test adding various time periods
          const plus1Day = engine.addDays(startDate, 1);
          const plus7Days = engine.addDays(startDate, 7);
          const plus30Days = engine.addDays(startDate, 30);

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
      });

      console.log(
        '\n✅ FEATURE ISOLATION: Calendar-specific features do not break common functionality'
      );
    });
  });
});
