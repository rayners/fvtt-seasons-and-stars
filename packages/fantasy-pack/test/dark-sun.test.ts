/**
 * Dark Sun Calendar Test Suite
 *
 * Tests for Dark Sun calendar-specific date alignment issues, particularly month start
 * alignment with the special "1 Day" through "6 Day" weekday system. These tests ensure
 * all months start on "1 Day" (weekday 0) regardless of intercalary days.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { describe, test, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../../core/src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../../core/src/types/calendar';
import * as fs from 'fs';
import * as path from 'path';

// Load Dark Sun calendar for testing
function loadCalendar(): SeasonsStarsCalendar {
  const calendarPath = path.join(__dirname, '../calendars', 'dark-sun.json');
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
      const darkSunCalendar = darkSunEngine.getCalendar();
      const year = darkSunCalendar.year.currentYear + 1;
      darkSunCalendar.weekdays.forEach((weekday, index) => {});

      // Test that every month starts on weekday 0 ("1 Day")
      for (let month = 1; month <= darkSunCalendar.months.length; month++) {
        const firstDayWeekday = darkSunEngine.calculateWeekday(year, month, 1);
        const monthName = darkSunCalendar.months[month - 1].name;

        // All months should start on "1 Day" (weekday 0)
        expect(firstDayWeekday).toBe(0);
      }
    });

    test('Dark Sun intercalary days should not affect month start alignment', () => {
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

        const firstDayWeekday = darkSunEngine.calculateWeekday(testYear, testMonth, 1);

        // Should still be "1 Day" despite intercalary days
        expect(firstDayWeekday).toBe(0);
      });
    });

    test('Dark Sun intercalary days should have countsForWeekdays: false', () => {
      const darkSunCalendar = darkSunEngine.getCalendar();
      darkSunCalendar.intercalary?.forEach((intercalaryDay, index) => {
        // All Dark Sun intercalary days should have countsForWeekdays: false
        // This is what enables all months to start on "1 Day"
        expect(intercalaryDay.countsForWeekdays).toBe(false);
      });
    });
  });
});
