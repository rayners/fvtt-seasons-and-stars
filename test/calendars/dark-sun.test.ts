/**
 * Dark Sun Calendar Test Suite
 *
 * Tests for Dark Sun calendar-specific date alignment issues, particularly month start
 * alignment with the special "1 Day" through "6 Day" weekday system. These tests ensure
 * all months start on "1 Day" (weekday 0) regardless of intercalary days.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../../src/types/calendar';
import * as fs from 'fs';
import * as path from 'path';

// Load Dark Sun calendar for testing
function loadCalendar(): SeasonsStarsCalendar {
  const calendarPath = path.join('calendars', 'dark-sun.json');
  const calendarData = JSON.parse(fs.readFileSync(calendarPath, 'utf8'));
  return calendarData;
}

describe('Dark Sun Calendar - Month Start Alignment', () => {
  let darkSunEngine: CalendarEngine;

  beforeEach(() => {
    darkSunEngine = new CalendarEngine(loadCalendar());
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
});
