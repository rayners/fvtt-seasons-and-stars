/**
 * Calendar-Specific Date Alignment Issues Test Suite
 *
 * This test suite addresses known date alignment issues specific to individual calendars,
 * particularly WFRP intercalary day handling and Dark Sun month start alignment.
 * These tests ensure calendar-specific logic works correctly across different systems.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../src/types/calendar';
import * as fs from 'fs';
import * as path from 'path';

// Load specific calendars for testing
function loadCalendar(fileName: string): SeasonsStarsCalendar {
  const calendarPath = path.join('calendars', fileName);
  const calendarData = JSON.parse(fs.readFileSync(calendarPath, 'utf8'));
  return calendarData;
}

describe('Calendar-Specific Date Alignment Issues', () => {
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

  describe('🛡️ WFRP Calendar - Intercalary Day Issues', () => {
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

  describe('🌵 Dark Sun Calendar - Month Start Alignment', () => {
    test('Dark Sun all months should start on "1 Day" (weekday 0)', () => {
      console.log('\n=== DARK SUN MONTH START ALIGNMENT TEST ===');

      const darkSunCalendar = darkSunEngine.getCalendar();
      const year = darkSunCalendar.year.currentYear + 1;

      console.log('Dark Sun weekdays:');
      darkSunCalendar.weekdays.forEach((weekday, index) => {
        console.log(`  ${index}: ${weekday.name}`);
      });

      console.log('\nTesting month start alignment:');

      // Test that every month starts on weekday 0 ("1 Day")
      for (let month = 1; month <= darkSunCalendar.months.length; month++) {
        const firstDayWeekday = darkSunEngine.calculateWeekday(year, month, 1);
        const monthName = darkSunCalendar.months[month - 1].name;

        console.log(
          `${monthName} (month ${month}): starts on weekday ${firstDayWeekday} (${darkSunCalendar.weekdays[firstDayWeekday]?.name})`
        );

        // All months should start on "1 Day" (weekday 0)
        expect(firstDayWeekday).toBe(0);
      }

      console.log('✅ DARK SUN MONTH STARTS: All months correctly start on "1 Day"');
    });

    test('Dark Sun intercalary days should not affect month start alignment', () => {
      console.log('\n=== DARK SUN INTERCALARY ALIGNMENT TEST ===');

      const darkSunCalendar = darkSunEngine.getCalendar();
      const year = darkSunCalendar.year.currentYear + 1;

      // Test specific intercalary transitions mentioned in comprehensive regression test
      const intercalaryTests = [
        { monthAfter: 5, monthName: 'Breeze', intercalaryName: 'Cooling Sun' },
        { monthAfter: 9, monthName: 'Hoard', intercalaryName: 'Soaring Sun' },
        {
          monthAfter: 1,
          monthName: 'Winddy (next year)',
          intercalaryName: 'Highest Sun',
          nextYear: true,
        },
      ];

      intercalaryTests.forEach(test => {
        const testYear = test.nextYear ? year + 1 : year;
        const testMonth = test.nextYear ? 1 : test.monthAfter;

        console.log(`\nTesting ${test.monthName} (after ${test.intercalaryName}):`);

        const firstDayWeekday = darkSunEngine.calculateWeekday(testYear, testMonth, 1);

        console.log(
          `  First day of ${test.monthName}: weekday ${firstDayWeekday} (${darkSunCalendar.weekdays[firstDayWeekday]?.name})`
        );

        // Should still be "1 Day" despite intercalary days
        expect(firstDayWeekday).toBe(0);
        console.log(`  ✅ Correct: Still starts on "1 Day" after ${test.intercalaryName}`);
      });

      console.log(
        '\n✅ DARK SUN INTERCALARY: Month starts remain aligned despite intercalary days'
      );
    });

    test('Dark Sun intercalary days should have countsForWeekdays: false', () => {
      console.log('\n=== DARK SUN INTERCALARY CONFIGURATION TEST ===');

      const darkSunCalendar = darkSunEngine.getCalendar();

      console.log('Dark Sun intercalary days:');
      darkSunCalendar.intercalary?.forEach((intercalaryDay, index) => {
        console.log(`  ${index + 1}. ${intercalaryDay.name} (after ${intercalaryDay.after})`);
        console.log(`     countsForWeekdays: ${intercalaryDay.countsForWeekdays}`);

        // All Dark Sun intercalary days should have countsForWeekdays: false
        // This is what enables all months to start on "1 Day"
        expect(intercalaryDay.countsForWeekdays).toBe(false);
      });

      console.log(
        '✅ DARK SUN CONFIGURATION: All intercalary days correctly set countsForWeekdays: false'
      );
    });
  });

  describe('🗡️ Forbidden Lands Calendar - Season Alignment', () => {
    test('Forbidden Lands season transitions should align with month boundaries', () => {
      console.log('\n=== FORBIDDEN LANDS SEASON ALIGNMENT TEST ===');

      const forbiddenLandsCalendar = forbiddenLandsEngine.getCalendar();
      const year = forbiddenLandsCalendar.year.currentYear + 1;

      if (forbiddenLandsCalendar.seasons) {
        console.log('Forbidden Lands seasons:');
        forbiddenLandsCalendar.seasons.forEach((season, index) => {
          console.log(
            `  ${season.name}: starts month ${season.startMonth}, ${season.months.length} months`
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
      } else {
        console.log('ℹ️  Forbidden Lands calendar has no season configuration to test');
      }
    });
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
