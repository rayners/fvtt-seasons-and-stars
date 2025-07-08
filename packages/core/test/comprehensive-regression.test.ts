/**
 * Comprehensive Regression Test for All Calendar Types
 *
 * This test ensures that the WFRP calendar fixes do not break
 * existing functionality for any other calendar types.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import * as fs from 'fs';
import * as path from 'path';

describe('Comprehensive Regression Tests - All Calendar Types', () => {
  const calendarDir = 'calendars';
  const calendarFiles = [
    'dark-sun.json',
    'dnd5e-sword-coast.json',
    'eberron.json',
    'exandrian.json',
    'forbidden-lands.json',
    'forgotten-realms.json',
    'golarion-pf2e.json',
    'gregorian.json',
    'greyhawk.json',
    'starfinder-absalom-station.json',
    'symbaroum.json',
    'traditional-fantasy-epoch.json',
    'traveller-imperial.json',
    'vale-reckoning.json',
    'warhammer.json', // Include WFRP to ensure it still works
  ];

  calendarFiles.forEach(calendarFile => {
    const calendarName = calendarFile.replace('.json', '');

    describe(`${calendarName} Calendar Regression`, () => {
      let engine: CalendarEngine;
      let calendar: any;

      beforeEach(() => {
        const calendarPath = path.join(calendarDir, calendarFile);
        const calendarData = JSON.parse(fs.readFileSync(calendarPath, 'utf8'));
        calendar = calendarData;
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
        intercalaryDays.forEach((intercalary: any, index: number) => {
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

      // WFRP-specific test for Issue #21
      if (calendarName === 'warhammer') {
        it('should handle WFRP intercalary days with countsForWeekdays: false', () => {
          const cal = engine.getCalendar();
          const year = cal.year.currentYear + 1;

          // Test the specific Issue #21 scenario: 33rd Jahrdrung → Mitterfruhl → 1st Pflugzeit
          const jahrdrung33 = { year, month: 2, day: 33, weekday: 0 };
          const weekdayBefore = engine.calculateWeekday(
            jahrdrung33.year,
            jahrdrung33.month,
            jahrdrung33.day
          );

          // Add 2 days to cross Mitterfruhl and reach 1st Pflugzeit
          const pflugzeit1 = engine.addDays(jahrdrung33, 2);
          const weekdayAfter = engine.calculateWeekday(
            pflugzeit1.year,
            pflugzeit1.month,
            pflugzeit1.day
          );

          // Should advance by exactly 1 weekday (skipping Mitterfruhl)
          const expectedWeekday = (weekdayBefore + 1) % cal.weekdays.length;
          expect(weekdayAfter).toBe(expectedWeekday);

          console.log(
            `✅ WFRP Issue #21 Test: ${jahrdrung33.day} Jahrdrung (weekday ${weekdayBefore}) → Mitterfruhl → ${pflugzeit1.day} Pflugzeit (weekday ${weekdayAfter})`
          );
        });
      }

      // Dark Sun-specific test for Issue #69
      if (calendarName === 'dark-sun') {
        it('should ensure all months start on "1 Day" with countsForWeekdays: false', () => {
          const cal = engine.getCalendar();
          const year = cal.year.currentYear + 1;

          // Test that every month starts on weekday 0 ("1 Day")
          for (let month = 1; month <= cal.months.length; month++) {
            const firstDayWeekday = engine.calculateWeekday(year, month, 1);
            expect(firstDayWeekday).toBe(0);
          }

          // Test specifically that intercalary days don't affect month starts
          // Month 5 (Breeze) comes after Cooling Sun intercalary
          const firstDayBreeze = engine.calculateWeekday(year, 5, 1);
          expect(firstDayBreeze).toBe(0);

          // Month 9 (Hoard) comes after Soaring Sun intercalary
          const firstDayHoard = engine.calculateWeekday(year, 9, 1);
          expect(firstDayHoard).toBe(0);

          // Month 1 of next year comes after Highest Sun intercalary
          const firstDayNextYear = engine.calculateWeekday(year + 1, 1, 1);
          expect(firstDayNextYear).toBe(0);

          console.log(
            `✅ Dark Sun Issue #69 Test: All months start on "1 Day" with intercalary countsForWeekdays: false`
          );
        });
      }
    });
  });

  describe('Cross-Calendar Compatibility', () => {
    it('should handle all calendars consistently', () => {
      const allEngines: { [key: string]: CalendarEngine } = {};

      // Load all calendars
      calendarFiles.forEach(calendarFile => {
        const calendarName = calendarFile.replace('.json', '');
        const calendarPath = path.join(calendarDir, calendarFile);
        const calendarData = JSON.parse(fs.readFileSync(calendarPath, 'utf8'));
        allEngines[calendarName] = new CalendarEngine(calendarData);
      });

      // Verify all loaded successfully
      Object.keys(allEngines).forEach(name => {
        expect(allEngines[name]).toBeDefined();
        expect(() => allEngines[name].getCalendar()).not.toThrow();
      });

      console.log(
        `✅ Successfully loaded and tested ${Object.keys(allEngines).length} calendar types`
      );
    });
  });
});
