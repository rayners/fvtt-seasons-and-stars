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
  const calendarPath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'fantasy-pack',
    'calendars',
    fileName
  );
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
      const engines = [
        { name: 'WFRP', engine: wfrpEngine },
        { name: 'Dark Sun', engine: darkSunEngine },
        { name: 'Forbidden Lands', engine: forbiddenLandsEngine },
        { name: 'Exandrian', engine: exandrianEngine },
      ];

      engines.forEach(({ engine }) => {
        const calendar = engine.getCalendar();
        const year = calendar.year.currentYear + 1;

        // Test basic operations
        const testDate = { year, month: 1, day: 1 };

        const weekday = engine.calculateWeekday(testDate.year, testDate.month, testDate.day);
        const worldTime = engine.dateToWorldTime(testDate);
        const roundTrip = engine.worldTimeToDate(worldTime);
        const yearLength = engine.getYearLength(testDate.year);

        // Basic validations
        expect(weekday).toBeGreaterThanOrEqual(0);
        expect(weekday).toBeLessThan(calendar.weekdays.length);
        expect(worldTime).toBeGreaterThanOrEqual(0);
        expect(roundTrip.year).toBe(testDate.year);
        expect(roundTrip.month).toBe(testDate.month);
        expect(roundTrip.day).toBe(testDate.day);
        expect(yearLength).toBeGreaterThan(300); // Reasonable minimum
        expect(yearLength).toBeLessThanOrEqual(400); // Reasonable maximum
      });
    });

    test('Calendar-specific features should not break common functionality', () => {
      const engines = [
        { name: 'WFRP (with intercalary)', engine: wfrpEngine },
        { name: 'Dark Sun (with special weekdays)', engine: darkSunEngine },
        { name: 'Forbidden Lands (with seasons)', engine: forbiddenLandsEngine },
        { name: 'Exandrian (Critical Role)', engine: exandrianEngine },
      ];

      // Test that special features don't break standard date arithmetic
      engines.forEach(({ engine }) => {
        const calendar = engine.getCalendar();
        const year = calendar.year.currentYear + 1;
        const startDate = { year, month: 1, day: 1 };

        // Test adding various time periods
        const plus1Day = engine.addDays(startDate, 1);
        const plus7Days = engine.addDays(startDate, 7);
        const plus30Days = engine.addDays(startDate, 30);

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
      });
    });
  });
});
