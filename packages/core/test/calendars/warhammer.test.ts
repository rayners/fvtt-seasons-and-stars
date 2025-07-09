/**
 * Warhammer Fantasy Roleplay Calendar Test Suite
 *
 * Tests for WFRP-specific date alignment issues, particularly intercalary day handling
 * and weekday progression bugs. These tests ensure the WFRP calendar system works
 * correctly with its unique 8-day week and intercalary day configurations.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../../src/types/calendar';
import * as fs from 'fs';
import * as path from 'path';

// Load WFRP calendar for testing
function loadCalendar(): SeasonsStarsCalendar {
  const calendarPath = path.join('packages/fantasy-pack/calendars', 'warhammer.json');
  const calendarData = JSON.parse(fs.readFileSync(calendarPath, 'utf8'));
  return calendarData;
}

describe('Warhammer Fantasy Roleplay Calendar - Date Alignment Issues', () => {
  let wfrpEngine: CalendarEngine;

  beforeEach(() => {
    wfrpEngine = new CalendarEngine(loadCalendar());
  });

  describe('🛡️ WFRP Intercalary Day Issues', () => {
    test('WFRP intercalary days should not advance weekday when countsForWeekdays: false', () => {
      console.log('\n=== WFRP INTERCALARY WEEKDAY TEST ===');

      const wfrpCalendar = wfrpEngine.getCalendar();
      const year = wfrpCalendar.year.currentYear + 1;

      console.log('WFRP Calendar intercalary days:');
      wfrpCalendar.intercalary?.forEach((intercalaryDay, index) => {
        console.log(
          `  ${index + 1}. ${intercalaryDay.name} (after ${intercalaryDay.after}, countsForWeekdays: ${intercalaryDay.countsForWeekdays})`
        );
      });

      // Test the specific scenario from Issue #21: 33rd Jahrdrung → Mitterfruhl → 1st Pflugzeit
      console.log('\nTesting Issue #21 scenario:');

      const jahrdrung33 = { year, month: 2, day: 33 }; // Last day of Jahrdrung
      const pflugzeit1 = { year, month: 3, day: 1 }; // First day of Pflugzeit

      const weekdayBeforeIntercalary = wfrpEngine.calculateWeekday(
        jahrdrung33.year,
        jahrdrung33.month,
        jahrdrung33.day
      );

      const weekdayAfterIntercalary = wfrpEngine.calculateWeekday(
        pflugzeit1.year,
        pflugzeit1.month,
        pflugzeit1.day
      );

      console.log(
        `33rd Jahrdrung (${jahrdrung33.year}/${jahrdrung33.month}/${jahrdrung33.day}): weekday ${weekdayBeforeIntercalary}`
      );
      console.log(
        `1st Pflugzeit (${pflugzeit1.year}/${pflugzeit1.month}/${pflugzeit1.day}): weekday ${weekdayAfterIntercalary}`
      );

      // Since Mitterfruhl has countsForWeekdays: false, the weekday should advance by exactly 1
      const expectedWeekdayAfter = (weekdayBeforeIntercalary + 1) % wfrpCalendar.weekdays.length;

      console.log(`Expected weekday after: ${expectedWeekdayAfter}`);
      console.log(`Actual weekday after: ${weekdayAfterIntercalary}`);

      if (weekdayAfterIntercalary === expectedWeekdayAfter) {
        console.log('✅ CORRECT: Intercalary day does not advance weekday');
      } else {
        const actualAdvancement =
          (weekdayAfterIntercalary - weekdayBeforeIntercalary + wfrpCalendar.weekdays.length) %
          wfrpCalendar.weekdays.length;
        console.log(`❌ INCORRECT: Weekday advanced by ${actualAdvancement} instead of 1`);
      }

      expect(weekdayAfterIntercalary).toBe(expectedWeekdayAfter);
    });

    test('WFRP all intercalary days should respect countsForWeekdays setting', () => {
      console.log('\n=== WFRP ALL INTERCALARY DAYS TEST ===');

      const wfrpCalendar = wfrpEngine.getCalendar();
      const year = wfrpCalendar.year.currentYear + 1;

      // Test each intercalary day in the WFRP calendar
      wfrpCalendar.intercalary?.forEach((intercalaryDay, index) => {
        console.log(
          `\nTesting ${intercalaryDay.name} (countsForWeekdays: ${intercalaryDay.countsForWeekdays}):`
        );

        // Find the month that this intercalary day comes after
        const afterMonthIndex = wfrpCalendar.months.findIndex(
          month => month.name === intercalaryDay.after
        );
        const beforeMonthIndex = afterMonthIndex + 1;

        if (afterMonthIndex >= 0 && beforeMonthIndex < wfrpCalendar.months.length) {
          const afterMonth = wfrpCalendar.months[afterMonthIndex];
          const beforeMonth = wfrpCalendar.months[beforeMonthIndex];

          // Last day of the month before intercalary
          const lastDayOfAfterMonth = { year, month: afterMonthIndex + 1, day: afterMonth.days };
          // First day of the month after intercalary
          const firstDayOfBeforeMonth = { year, month: beforeMonthIndex + 1, day: 1 };

          const weekdayBefore = wfrpEngine.calculateWeekday(
            lastDayOfAfterMonth.year,
            lastDayOfAfterMonth.month,
            lastDayOfAfterMonth.day
          );

          const weekdayAfter = wfrpEngine.calculateWeekday(
            firstDayOfBeforeMonth.year,
            firstDayOfBeforeMonth.month,
            firstDayOfBeforeMonth.day
          );

          console.log(`  Last day of ${afterMonth.name}: weekday ${weekdayBefore}`);
          console.log(`  First day of ${beforeMonth.name}: weekday ${weekdayAfter}`);

          // Calculate expected weekday advancement
          let expectedAdvancement = 1; // Normal day advancement
          if (intercalaryDay.countsForWeekdays !== false) {
            expectedAdvancement += intercalaryDay.days || 1; // Add intercalary days
          }

          const expectedWeekdayAfter =
            (weekdayBefore + expectedAdvancement) % wfrpCalendar.weekdays.length;

          console.log(
            `  Expected advancement: ${expectedAdvancement} (intercalary ${intercalaryDay.countsForWeekdays !== false ? 'counts' : 'does not count'})`
          );
          console.log(`  Expected weekday: ${expectedWeekdayAfter}, Actual: ${weekdayAfter}`);

          expect(weekdayAfter).toBe(expectedWeekdayAfter);
          console.log(`  ✅ ${intercalaryDay.name} weekday handling correct`);
        } else {
          console.log(`  ⚠️  Cannot test ${intercalaryDay.name} - month mapping issue`);
        }
      });

      console.log(
        '\n✅ WFRP INTERCALARY DAYS: All intercalary days respect countsForWeekdays setting'
      );
    });

    test('WFRP year length calculation includes all intercalary days', () => {
      console.log('\n=== WFRP YEAR LENGTH TEST ===');

      const wfrpCalendar = wfrpEngine.getCalendar();
      const year = wfrpCalendar.year.currentYear + 1;

      // Calculate expected year length
      let expectedLength = 0;

      // Add all month days
      wfrpCalendar.months.forEach(month => {
        expectedLength += month.days;
        console.log(`${month.name}: ${month.days} days`);
      });

      // Add all intercalary days
      let totalIntercalaryDays = 0;
      wfrpCalendar.intercalary?.forEach(intercalaryDay => {
        const days = intercalaryDay.days || 1;
        totalIntercalaryDays += days;
        console.log(`${intercalaryDay.name}: ${days} intercalary day(s)`);
      });

      expectedLength += totalIntercalaryDays;

      const actualLength = wfrpEngine.getYearLength(year);

      console.log(`\nExpected year length: ${expectedLength} days`);
      console.log(`Actual year length: ${actualLength} days`);
      console.log(`Total intercalary days: ${totalIntercalaryDays}`);

      expect(actualLength).toBe(expectedLength);
      console.log('✅ WFRP YEAR LENGTH: Correctly includes all regular and intercalary days');
    });
  });
});
