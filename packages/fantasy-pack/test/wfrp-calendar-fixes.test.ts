/**
 * Test WFRP calendar fixes for Issue #21
 * Tests the specific bugs that were fixed and verifies correct behavior
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { describe, it, expect, beforeAll } from 'vitest';
import { CalendarEngine } from '../../core/src/core/calendar-engine';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('WFRP Calendar Bug Fixes (Issue #21)', () => {
  let warhammerData: any;
  let engine: CalendarEngine;

  beforeAll(() => {
    // Load the WFRP calendar
    const warhammerPath = resolve(__dirname, '../calendars/warhammer.json');
    warhammerData = JSON.parse(readFileSync(warhammerPath, 'utf8'));
    engine = new CalendarEngine(warhammerData);
  });

  describe('Fix 1: Date Arithmetic (Critical Bug)', () => {
    it('should handle intercalary days without creating invalid dates', () => {
      // Test the specific scenario that was creating day 34 in a 33-day month
      const day33Jahrdrung = { year: 2522, month: 2, day: 33, weekday: 0 };

      // Add 1 day - should go to intercalary day (Mitterfruhl)
      const nextDay = engine.addDays(day33Jahrdrung, 1);

      // Should be intercalary day, not invalid date
      expect(nextDay.intercalary).toBe('Mitterfruhl');
      expect(nextDay.day).toBeLessThanOrEqual(33); // No invalid day numbers

      // Add 2 days - should go to 1st Pflugzeit
      const dayAfterIntercalary = engine.addDays(day33Jahrdrung, 2);

      expect(dayAfterIntercalary.year).toBe(2522);
      expect(dayAfterIntercalary.month).toBe(3); // Pflugzeit
      expect(dayAfterIntercalary.day).toBe(1); // 1st day
      expect(dayAfterIntercalary.intercalary).toBeUndefined(); // Not intercalary
    });

    it('should handle all 6 WFRP intercalary days correctly', () => {
      // Test each intercalary day transition
      const intercalaryTests = [
        { name: 'Hexenstag', afterMonth: 'Vorhexen', month: 12, day: 33 },
        { name: 'Mitterfruhl', afterMonth: 'Jahrdrung', month: 2, day: 33 },
        { name: 'Sonnstill', afterMonth: 'Sommerzeit', month: 5, day: 33 },
        { name: 'Geheimnistag', afterMonth: 'Vorgeheim', month: 6, day: 33 },
        { name: 'Mittherbst', afterMonth: 'Erntezeit', month: 8, day: 33 },
        { name: 'Mondstille', afterMonth: 'Ulriczeit', month: 11, day: 33 },
      ];

      intercalaryTests.forEach((test, index) => {
        const lastDayOfMonth = { year: 2522, month: test.month, day: test.day, weekday: 0 };
        const intercalaryDay = engine.addDays(lastDayOfMonth, 1);

        expect(intercalaryDay.intercalary).toBe(test.name);
        expect(intercalaryDay.day).toBeLessThanOrEqual(test.day); // Valid day range
      });
    });
  });

  describe('Fix 2: Weekday Progression', () => {
    it('should respect countsForWeekdays: false for intercalary days', () => {
      // Test the specific Issue #21 scenario
      const day33Jahrdrung = { year: 2522, month: 2, day: 33, weekday: 0 };
      const weekday33 = engine.calculateWeekday(
        day33Jahrdrung.year,
        day33Jahrdrung.month,
        day33Jahrdrung.day
      );
      const weekdayName33 = warhammerData.weekdays[weekday33]?.name;

      // Navigate to 1st Pflugzeit (after Mitterfruhl intercalary day)
      const firstPflugzeit = { year: 2522, month: 3, day: 1, weekday: 0 };
      const weekdayFirst = engine.calculateWeekday(
        firstPflugzeit.year,
        firstPflugzeit.month,
        firstPflugzeit.day
      );
      const weekdayNameFirst = warhammerData.weekdays[weekdayFirst]?.name;

      // Should advance by exactly 1 weekday (intercalary day doesn't count)
      const expectedWeekday = (weekday33 + 1) % warhammerData.weekdays.length;
      const expectedWeekdayName = warhammerData.weekdays[expectedWeekday]?.name;

      expect(weekdayFirst).toBe(expectedWeekday);
    });

    it('should handle weekday calculations across multiple intercalary days', () => {
      // Test year-long progression with all intercalary days
      const startOfYear = { year: 2522, month: 1, day: 1, weekday: 0 };
      const startWeekday = engine.calculateWeekday(
        startOfYear.year,
        startOfYear.month,
        startOfYear.day
      );

      // Calculate expected weekday progression for a full year
      // WFRP has 396 regular days + 6 intercalary days = 402 total days
      // But only 396 days should count for weekdays (396 / 8 = 49.5 weeks)
      const regularDaysInYear = warhammerData.months.reduce(
        (sum: number, month: any) => sum + month.days,
        0
      );
      const expectedWeekdayAtYearEnd =
        (startWeekday + regularDaysInYear - 1) % warhammerData.weekdays.length;

      const endOfYear = { year: 2522, month: 12, day: 33, weekday: 0 }; // Last day before Hexenstag
      const endWeekday = engine.calculateWeekday(endOfYear.year, endOfYear.month, endOfYear.day);

      expect(endWeekday).toBe(expectedWeekdayAtYearEnd);
    });
  });

  describe('Fix 3: Week Length', () => {
    it('should use 8-day weeks for WFRP calendar', () => {
      const startDate = { year: 2522, month: 3, day: 15, weekday: 0 };
      const startWeekday = engine.calculateWeekday(startDate.year, startDate.month, startDate.day);
      const startWeekdayName = warhammerData.weekdays[startWeekday]?.name;

      // Add exactly 8 days (one WFRP week)
      const oneWeekLater = engine.addDays(startDate, 8);
      const oneWeekWeekday = engine.calculateWeekday(
        oneWeekLater.year,
        oneWeekLater.month,
        oneWeekLater.day
      );
      const oneWeekWeekdayName = warhammerData.weekdays[oneWeekWeekday]?.name;

      // Add 7 days (incorrect week length)
      const sevenDaysLater = engine.addDays(startDate, 7);
      const sevenDaysWeekday = engine.calculateWeekday(
        sevenDaysLater.year,
        sevenDaysLater.month,
        sevenDaysLater.day
      );
      const sevenDaysWeekdayName = warhammerData.weekdays[sevenDaysWeekday]?.name;

      // After 8 days, should return to same weekday
      expect(oneWeekWeekday).toBe(startWeekday);
      // After 7 days, should NOT return to same weekday
      expect(sevenDaysWeekday).not.toBe(startWeekday);
    });

    it('should handle multiple weeks correctly', () => {
      const startDate = { year: 2522, month: 1, day: 10, weekday: 0 };
      const startWeekday = engine.calculateWeekday(startDate.year, startDate.month, startDate.day);

      // Test 2, 3, and 4 weeks
      [2, 3, 4].forEach(weeks => {
        const futureDate = engine.addDays(startDate, weeks * 8);
        const futureWeekday = engine.calculateWeekday(
          futureDate.year,
          futureDate.month,
          futureDate.day
        );
        expect(futureWeekday).toBe(startWeekday);
      });
    });
  });

  describe('Regression Prevention', () => {
    it('should maintain backward compatibility for calendars without countsForWeekdays', () => {
      // Create a test calendar without countsForWeekdays setting
      const testCalendar = {
        ...warhammerData,
        intercalary: warhammerData.intercalary.map((intercalary: any) => {
          const { countsForWeekdays, ...rest } = intercalary;
          return rest; // Remove countsForWeekdays property
        }),
      };

      const testEngine = new CalendarEngine(testCalendar);

      // Should default to counting for weekdays (backward compatible)
      const startDate = { year: 2522, month: 2, day: 33, weekday: 0 };
      const nextMonth = { year: 2522, month: 3, day: 1, weekday: 0 };

      const startWeekday = testEngine.calculateWeekday(
        startDate.year,
        startDate.month,
        startDate.day
      );
      const nextWeekday = testEngine.calculateWeekday(
        nextMonth.year,
        nextMonth.month,
        nextMonth.day
      );

      // Without countsForWeekdays: false, should advance by 2 (old behavior)
      const weekdayDiff =
        (nextWeekday - startWeekday + warhammerData.weekdays.length) %
        warhammerData.weekdays.length;

      expect(weekdayDiff).toBe(2); // Old behavior maintained
    });

    it('should not break existing calendar functionality', () => {
      // Test basic calendar operations still work
      const testDate = { year: 2522, month: 6, day: 15, weekday: 0 };

      // Test adding various time units
      const plusDays = engine.addDays(testDate, 5);
      const plusMonths = engine.addMonths(testDate, 2);
      const plusYears = engine.addYears(testDate, 1);

      // Basic sanity checks
      expect(plusDays.month).toBe(6);
      expect(plusDays.day).toBe(20);
      expect(plusMonths.month).toBe(8);
      expect(plusYears.year).toBe(2523);
    });
  });
});
