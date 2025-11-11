/**
 * Comprehensive Regression Test for Core Calendar Types
 *
 * This test ensures that core calendar functionality remains stable
 * across the gregorian and golarion-pf2e calendars included in the core package.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../../src/core/calendar-engine';
import { loadTestCalendar } from '../utils/calendar-loader';

describe('Comprehensive Regression Tests - Core Calendar Types', () => {
  // Calendar files to test - use loadTestCalendar to find them in multiple packages
  const testCalendars = [
    'golarion-pf2e.json', // From pf2e-pack via loadTestCalendar
    'gregorian.json', // From core calendars via loadTestCalendar
  ];

  testCalendars.forEach(calendarFile => {
    const calendarName = calendarFile.replace('.json', '');

    describe(`${calendarName} Calendar Regression`, () => {
      let engine: CalendarEngine;

      beforeEach(() => {
        const calendarData = loadTestCalendar(calendarFile);
        engine = new CalendarEngine(calendarData);
      });

      it('should load calendar without errors', () => {
        expect(engine).toBeDefined();
        expect(engine.getCalendar()).toBeDefined();
      });

      it('should handle basic date operations', () => {
        const cal = engine.getCalendar();
        const testDate = { year: cal.year.currentYear + 1, month: 1, day: 1, weekday: 0 };

        // Test date conversion round-trip
        const days = engine.dateToDays(testDate);
        expect(days).toBeGreaterThanOrEqual(0);

        const convertedBack = engine.daysToDate(days);
        expect(convertedBack.year).toBe(testDate.year);
        expect(convertedBack.month).toBe(testDate.month);
        expect(convertedBack.day).toBe(testDate.day);
      });

      it('should calculate weekdays correctly', () => {
        const cal = engine.getCalendar();
        const testDate = { year: cal.year.currentYear + 1, month: 1, day: 1, weekday: 0 };
        const weekday = engine.calculateWeekday(testDate.year, testDate.month, testDate.day);

        expect(weekday).toBeGreaterThanOrEqual(0);
        if (cal.weekdays && cal.weekdays.length > 0) {
          expect(weekday).toBeLessThan(cal.weekdays.length);
        }
      });

      it('should advance days correctly', () => {
        const cal = engine.getCalendar();
        const startDate = { year: cal.year.currentYear + 1, month: 1, day: 1, weekday: 0 };
        const advancedDate = engine.addDays(startDate, 5);

        expect(advancedDate).toBeDefined();
        expect(advancedDate.year).toBeGreaterThanOrEqual(startDate.year);

        // Verify the date is valid
        const monthLengths = engine.getMonthLengths(advancedDate.year);
        expect(advancedDate.month).toBeGreaterThanOrEqual(1);
        expect(advancedDate.month).toBeLessThanOrEqual(cal.months.length);
        expect(advancedDate.day).toBeGreaterThanOrEqual(1);
        expect(advancedDate.day).toBeLessThanOrEqual(monthLengths[advancedDate.month - 1]);
      });

      it('should handle month boundaries correctly', () => {
        const cal = engine.getCalendar();

        // Skip test for calendars with only 1 month (like Traveller)
        if (cal.months.length === 1) {
          expect(true).toBe(true); // Mark test as passed
          return;
        }

        // Test last day of first month
        const monthLengths = engine.getMonthLengths(cal.year.currentYear + 1);
        const lastDayOfMonth = {
          year: cal.year.currentYear + 1,
          month: 1,
          day: monthLengths[0],
          weekday: 0,
        };

        const nextDay = engine.addDays(lastDayOfMonth, 1);

        // Check if this calendar has intercalary days after month 1
        const intercalaryAfterMonth1 = cal.intercalary?.some(i => i.after === cal.months[0].name);

        if (intercalaryAfterMonth1) {
          // Calendar has intercalary day after month 1, so +1 day should be intercalary
          expect(nextDay.month).toBe(1);
          expect(nextDay.intercalary).toBeDefined();

          // Test that +2 days reaches month 2
          const dayAfterIntercalary = engine.addDays(lastDayOfMonth, 2);
          expect(dayAfterIntercalary.month).toBe(2);
          expect(dayAfterIntercalary.day).toBe(1);
        } else {
          // No intercalary day, so +1 day should go directly to month 2
          expect(nextDay.month).toBe(2);
          expect(nextDay.day).toBe(1);
        }
      });

      it('should handle year boundaries correctly', () => {
        const cal = engine.getCalendar();
        // Test last day of year
        const year = cal.year.currentYear + 1;
        const monthLengths = engine.getMonthLengths(year);
        const lastMonth = cal.months.length;
        const lastDay = monthLengths[lastMonth - 1];

        const lastDayOfYear = {
          year,
          month: lastMonth,
          day: lastDay,
          weekday: 0,
        };

        const nextDay = engine.addDays(lastDayOfYear, 1);

        // Check if this calendar has intercalary days after the last month
        const lastMonthName = cal.months[lastMonth - 1].name;
        const intercalaryAfterLastMonth = cal.intercalary?.some(i => i.after === lastMonthName);

        if (intercalaryAfterLastMonth) {
          // Calendar has intercalary day(s) after last month, so +1 day should be intercalary
          expect(nextDay.year).toBe(year);
          expect(nextDay.intercalary).toBeDefined();

          // Test that we can eventually reach the next year by adding more days
          // Count how many intercalary days there are after the last month
          const intercalaryDaysAfterLast =
            cal.intercalary
              ?.filter(i => i.after === lastMonthName)
              ?.reduce((sum, i) => sum + (i.days || 1), 0) || 0;

          const nextYearDay = engine.addDays(lastDayOfYear, 1 + intercalaryDaysAfterLast);
          expect(nextYearDay.year).toBe(year + 1);
          expect(nextYearDay.month).toBe(1);
          expect(nextYearDay.day).toBe(1);
        } else {
          // No intercalary day after last month, so +1 day should go directly to next year
          expect(nextDay.year).toBe(year + 1);
          expect(nextDay.month).toBe(1);
          expect(nextDay.day).toBe(1);
        }
      });

      it('should maintain weekday consistency (if calendar has weekdays)', () => {
        const cal = engine.getCalendar();

        // Skip test if calendar doesn't have weekdays
        if (!cal.weekdays || cal.weekdays.length === 0) {
          expect(true).toBe(true); // Pass the test
          return;
        }

        const startDate = { year: cal.year.currentYear + 1, month: 1, day: 1, weekday: 0 };
        const weekLength = cal.weekdays.length;

        // Advance by one full week and verify weekday returns to same value
        const afterWeek = engine.addDays(startDate, weekLength);
        const startWeekday = engine.calculateWeekday(
          startDate.year,
          startDate.month,
          startDate.day
        );
        const afterWeekday = engine.calculateWeekday(
          afterWeek.year,
          afterWeek.month,
          afterWeek.day
        );

        expect(afterWeekday).toBe(startWeekday);
      });

      it('should handle leap years correctly (if calendar has leap year rules)', () => {
        const cal = engine.getCalendar();

        // Skip if no leap year rules
        if (!cal.year?.leap) {
          expect(true).toBe(true); // Pass the test
          return;
        }

        const leapYear = cal.year.currentYear + (cal.year.leap.cycle || 4);
        const isLeap = engine.isLeapYear(leapYear);
        const yearLength = engine.getYearLength(leapYear);

        expect(isLeap).toBeDefined();
        expect(yearLength).toBeGreaterThan(0);
      });

      it('should handle intercalary days without breaking (if calendar has them)', () => {
        const cal = engine.getCalendar();

        // Skip if no intercalary days
        if (!cal.intercalaryDays || cal.intercalaryDays.length === 0) {
          expect(true).toBe(true); // Pass the test
          return;
        }

        const year = cal.year.currentYear + 1;
        const intercalaryDays = engine.getIntercalaryDays(year);

        expect(intercalaryDays).toBeDefined();
        expect(Array.isArray(intercalaryDays)).toBe(true);

        // Test that each intercalary day can be navigated to and from
        intercalaryDays.forEach((intercalary: any) => {
          const beforeIntercalary = {
            year,
            month: intercalary.month,
            day: intercalary.beforeDay || 1,
            weekday: 0,
          };

          // This should not crash or create invalid dates
          const afterAdvancing = engine.addDays(beforeIntercalary, 2);
          expect(afterAdvancing).toBeDefined();
          expect(afterAdvancing.year).toBeGreaterThanOrEqual(year);
        });
      });
    });
  });

  describe('Cross-Calendar Compatibility', () => {
    it('should handle core calendars consistently', () => {
      const allEngines: { [key: string]: CalendarEngine } = {};

      // Load all test calendars
      testCalendars.forEach(calendarFile => {
        const calendarName = calendarFile.replace('.json', '');
        const calendarData = loadTestCalendar(calendarFile);
        allEngines[calendarName] = new CalendarEngine(calendarData);
      });

      // Verify all loaded successfully
      Object.keys(allEngines).forEach(name => {
        expect(allEngines[name]).toBeDefined();
        expect(() => allEngines[name].getCalendar()).not.toThrow();
      });
    });
  });
});
