/**
 * Forbidden Lands Calendar Test Suite
 *
 * Tests for Forbidden Lands calendar-specific functionality, particularly season alignment
 * with month boundaries and general calendar consistency. These tests ensure the Forbidden
 * Lands calendar system works correctly with its fantasy-themed structure.
 */

/* eslint-disable @typescript-eslint/no-unused-vars, no-useless-catch */

import { describe, test, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../../core/src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../../core/src/types/calendar';
import * as fs from 'fs';
import * as path from 'path';

// Load Forbidden Lands calendar for testing
function loadCalendar(): SeasonsStarsCalendar {
  const calendarPath = path.join(__dirname, '../calendars', 'forbidden-lands.json');
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
      const forbiddenLandsCalendar = forbiddenLandsEngine.getCalendar();

      // Test should fail if seasons are missing - most fantasy calendars should have seasons
      expect(forbiddenLandsCalendar.seasons).toBeDefined();
      expect(Array.isArray(forbiddenLandsCalendar.seasons)).toBe(true);

      expect(forbiddenLandsCalendar.seasons!.length).toBeGreaterThan(0);

      const year = forbiddenLandsCalendar.year.currentYear + 1;

      forbiddenLandsCalendar.seasons!.forEach((season, index) => {
        // Test that season start aligns with month boundaries
        const seasonStartDate = { year, month: season.startMonth, day: 1 };
        const weekdayAtStart = forbiddenLandsEngine.calculateWeekday(
          seasonStartDate.year,
          seasonStartDate.month,
          seasonStartDate.day
        );

        // Seasons should start on valid weekdays
        expect(weekdayAtStart).toBeGreaterThanOrEqual(0);
        expect(weekdayAtStart).toBeLessThan(forbiddenLandsCalendar.weekdays.length);
      });
    });

    test('Forbidden Lands basic calendar operations work correctly', () => {
      const forbiddenLandsCalendar = forbiddenLandsEngine.getCalendar();
      const year = forbiddenLandsCalendar.year.currentYear + 1;

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

        // Basic validations
        expect(weekday).toBeGreaterThanOrEqual(0);
        expect(weekday).toBeLessThan(forbiddenLandsCalendar.weekdays.length);
        expect(worldTime).toBeGreaterThanOrEqual(0);
        expect(roundTrip.year).toBe(testDate.year);
        expect(roundTrip.month).toBe(testDate.month);
        expect(roundTrip.day).toBe(testDate.day);
        expect(yearLength).toBeGreaterThan(300); // Reasonable minimum
        expect(yearLength).toBeLessThanOrEqual(400); // Reasonable maximum
      } catch (error) {
        throw error;
      }
    });

    test('Forbidden Lands date arithmetic works correctly', () => {
      const forbiddenLandsCalendar = forbiddenLandsEngine.getCalendar();
      const year = forbiddenLandsCalendar.year.currentYear + 1;
      const startDate = { year, month: 1, day: 1 };

      try {
        // Test adding various time periods
        const plus1Day = forbiddenLandsEngine.addDays(startDate, 1);
        const plus7Days = forbiddenLandsEngine.addDays(startDate, 7);
        const plus30Days = forbiddenLandsEngine.addDays(startDate, 30);

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
      } catch (error) {
        throw error;
      }
    });
  });
});
