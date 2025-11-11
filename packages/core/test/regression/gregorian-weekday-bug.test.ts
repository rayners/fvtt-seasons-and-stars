/**
 * Test for Gregorian calendar weekday bug (Issue #58)
 * Tests specific real-world dates with known weekdays to verify correct calculation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../../src/types/calendar';
import * as fs from 'fs';
import * as path from 'path';

// Load the actual Gregorian calendar definition from the JSON file
function loadGregorianCalendar(): SeasonsStarsCalendar {
  const calendarPath = path.join(__dirname, '..', '..', 'calendars', 'gregorian.json');
  const calendarData = fs.readFileSync(calendarPath, 'utf8');
  return JSON.parse(calendarData) as SeasonsStarsCalendar;
}

const gregorianCalendar = loadGregorianCalendar();

describe('Gregorian Calendar Weekday Calculation Bug Fix', () => {
  let engine: CalendarEngine;

  beforeEach(() => {
    engine = new CalendarEngine(gregorianCalendar);
  });

  describe('Known Real-World Dates', () => {
    it('should correctly calculate weekday for January 1, 2024 (Monday)', () => {
      // January 1, 2024 was a Monday
      const weekdayIndex = engine.calculateWeekday(2024, 1, 1);
      const weekdayName = gregorianCalendar.weekdays[weekdayIndex].name;

      expect(weekdayIndex).toBe(1); // Monday is index 1 in the weekdays array
      expect(weekdayName).toBe('Monday');
    });

    it('should correctly calculate weekday for December 25, 2024 (Wednesday)', () => {
      // December 25, 2024 is a Wednesday
      const weekdayIndex = engine.calculateWeekday(2024, 12, 25);
      const weekdayName = gregorianCalendar.weekdays[weekdayIndex].name;

      expect(weekdayIndex).toBe(3); // Wednesday is index 3 in the weekdays array
      expect(weekdayName).toBe('Wednesday');
    });

    it('should correctly calculate weekday for June 17, 2025 (Tuesday)', () => {
      // June 17, 2025 is a Tuesday
      const weekdayIndex = engine.calculateWeekday(2025, 6, 17);
      const weekdayName = gregorianCalendar.weekdays[weekdayIndex].name;

      expect(weekdayIndex).toBe(2); // Tuesday is index 2 in the weekdays array
      expect(weekdayName).toBe('Tuesday');
    });

    it('should correctly calculate weekday for February 29, 2024 (Thursday)', () => {
      // February 29, 2024 is a Thursday (leap year test)
      const weekdayIndex = engine.calculateWeekday(2024, 2, 29);
      const weekdayName = gregorianCalendar.weekdays[weekdayIndex].name;

      expect(weekdayIndex).toBe(4); // Thursday is index 4 in the weekdays array
      expect(weekdayName).toBe('Thursday');
    });

    it('should correctly calculate weekday for January 1, 2000 (Saturday)', () => {
      // January 1, 2000 was a Saturday (Y2K reference date)
      const weekdayIndex = engine.calculateWeekday(2000, 1, 1);
      const weekdayName = gregorianCalendar.weekdays[weekdayIndex].name;

      expect(weekdayIndex).toBe(6); // Saturday is index 6 in the weekdays array
      expect(weekdayName).toBe('Saturday');
    });

    it('should correctly calculate weekday for January 1, 1900 (Monday)', () => {
      // January 1, 1900 was a Monday (not a leap year - century test)
      const weekdayIndex = engine.calculateWeekday(1900, 1, 1);
      const weekdayName = gregorianCalendar.weekdays[weekdayIndex].name;

      expect(weekdayIndex).toBe(1); // Monday is index 1 in the weekdays array
      expect(weekdayName).toBe('Monday');
    });
  });

  describe('Extended Real-World Date Testing', () => {
    // Test cases based on known dates that users are likely to encounter
    const realWorldTestCases = [
      // Recent past dates
      {
        year: 2023,
        month: 1,
        day: 1,
        expectedWeekday: 'Sunday',
        description: 'New Years Day 2023',
      },
      {
        year: 2023,
        month: 7,
        day: 4,
        expectedWeekday: 'Tuesday',
        description: 'Independence Day 2023',
      },
      { year: 2023, month: 12, day: 25, expectedWeekday: 'Monday', description: 'Christmas 2023' },
      {
        year: 2023,
        month: 12,
        day: 31,
        expectedWeekday: 'Sunday',
        description: 'New Years Eve 2023',
      },

      // Current year dates (2024)
      {
        year: 2024,
        month: 3,
        day: 17,
        expectedWeekday: 'Sunday',
        description: 'St. Patricks Day 2024',
      },
      { year: 2024, month: 4, day: 1, expectedWeekday: 'Monday', description: 'April Fools 2024' },
      {
        year: 2024,
        month: 7,
        day: 4,
        expectedWeekday: 'Thursday',
        description: 'Independence Day 2024',
      },
      {
        year: 2024,
        month: 10,
        day: 31,
        expectedWeekday: 'Thursday',
        description: 'Halloween 2024',
      },
      {
        year: 2024,
        month: 11,
        day: 28,
        expectedWeekday: 'Thursday',
        description: 'Thanksgiving 2024',
      },

      // Future dates (2025-2026)
      {
        year: 2025,
        month: 1,
        day: 1,
        expectedWeekday: 'Wednesday',
        description: 'New Years Day 2025',
      },
      {
        year: 2025,
        month: 7,
        day: 4,
        expectedWeekday: 'Friday',
        description: 'Independence Day 2025',
      },
      {
        year: 2025,
        month: 12,
        day: 25,
        expectedWeekday: 'Thursday',
        description: 'Christmas 2025',
      },
      {
        year: 2026,
        month: 1,
        day: 1,
        expectedWeekday: 'Thursday',
        description: 'New Years Day 2026',
      },

      // Historical dates
      {
        year: 1969,
        month: 7,
        day: 20,
        expectedWeekday: 'Sunday',
        description: 'Moon Landing 1969',
      },
      {
        year: 1989,
        month: 11,
        day: 9,
        expectedWeekday: 'Thursday',
        description: 'Berlin Wall Falls 1989',
      },
      {
        year: 2001,
        month: 9,
        day: 11,
        expectedWeekday: 'Tuesday',
        description: 'September 11, 2001',
      },

      // Leap year edge cases
      { year: 2020, month: 2, day: 29, expectedWeekday: 'Saturday', description: 'Leap Day 2020' },
      { year: 2028, month: 2, day: 29, expectedWeekday: 'Tuesday', description: 'Leap Day 2028' },

      // Century boundary tests
      {
        year: 1800,
        month: 1,
        day: 1,
        expectedWeekday: 'Wednesday',
        description: 'Start of 19th Century',
      },
      {
        year: 2100,
        month: 1,
        day: 1,
        expectedWeekday: 'Friday',
        description: 'Start of 22nd Century (not leap year)',
      },
    ];

    realWorldTestCases.forEach(testCase => {
      it(`should correctly calculate weekday for ${testCase.description}`, () => {
        const weekdayIndex = engine.calculateWeekday(testCase.year, testCase.month, testCase.day);
        const weekdayName = gregorianCalendar.weekdays[weekdayIndex].name;
        const expectedIndex = gregorianCalendar.weekdays.findIndex(
          w => w.name === testCase.expectedWeekday
        );

        expect(weekdayIndex).toBe(expectedIndex);
        expect(weekdayName).toBe(testCase.expectedWeekday);
      });
    });
  });

  describe('Edge Case Testing', () => {
    it('should handle month boundaries correctly', () => {
      // Test end of February in leap year vs non-leap year
      const feb28_2023 = engine.calculateWeekday(2023, 2, 28); // Tuesday
      const mar1_2023 = engine.calculateWeekday(2023, 3, 1); // Wednesday (next day)

      const feb28_2024 = engine.calculateWeekday(2024, 2, 28); // Wednesday
      const feb29_2024 = engine.calculateWeekday(2024, 2, 29); // Thursday (leap day)
      const mar1_2024 = engine.calculateWeekday(2024, 3, 1); // Friday (day after leap day)

      // Verify weekday progression
      expect((feb28_2023 + 1) % 7).toBe(mar1_2023); // Non-leap year: direct progression
      expect((feb28_2024 + 1) % 7).toBe(feb29_2024); // Leap year: Feb 28 -> Feb 29
      expect((feb29_2024 + 1) % 7).toBe(mar1_2024); // Leap year: progression after leap day
    });

    it('should handle year boundaries correctly', () => {
      // Test Dec 31 -> Jan 1 transitions for multiple years
      const yearTransitions = [
        { year: 2023, dec31: 0, jan1: 1 }, // Sunday -> Monday
        { year: 2024, dec31: 2, jan1: 3 }, // Tuesday -> Wednesday
        { year: 2025, dec31: 3, jan1: 4 }, // Wednesday -> Thursday
      ];

      yearTransitions.forEach(transition => {
        const dec31 = engine.calculateWeekday(transition.year, 12, 31);
        const jan1 = engine.calculateWeekday(transition.year + 1, 1, 1);

        expect(dec31).toBe(transition.dec31);
        expect(jan1).toBe(transition.jan1);
        expect((dec31 + 1) % 7).toBe(jan1); // Should be consecutive weekdays
      });
    });

    it('should handle century leap year rules correctly', () => {
      // Test century years: divisible by 100 but not 400 are NOT leap years
      const centuryTests = [
        { year: 1700, isLeap: false, description: 'Not divisible by 400' },
        { year: 1800, isLeap: false, description: 'Not divisible by 400' },
        { year: 1900, isLeap: false, description: 'Not divisible by 400' },
        { year: 2000, isLeap: true, description: 'Divisible by 400' },
        { year: 2100, isLeap: false, description: 'Not divisible by 400' },
        { year: 2400, isLeap: true, description: 'Divisible by 400' },
      ];

      centuryTests.forEach(test => {
        const isLeap = engine.isLeapYear(test.year);
        const yearLength = engine.getYearLength(test.year);
        const expectedLength = test.isLeap ? 366 : 365;

        expect(isLeap).toBe(test.isLeap);
        expect(yearLength).toBe(expectedLength);

        // Test Feb 28 -> Mar 1 transition for century years
        const feb28 = engine.calculateWeekday(test.year, 2, 28);
        const mar1 = engine.calculateWeekday(test.year, 3, 1);

        if (test.isLeap) {
          // Leap year: Feb 28 -> Feb 29 -> Mar 1 (should skip by 2)
          expect((feb28 + 2) % 7).toBe(mar1);
        } else {
          // Non-leap year: Feb 28 -> Mar 1 (should skip by 1)
          expect((feb28 + 1) % 7).toBe(mar1);
        }
      });
    });
  });

  describe('Calendar Integration', () => {
    it('should return consistent weekday through worldTimeToDate conversion', () => {
      // Test that weekday calculation is consistent when going through world time conversion
      const testDate = { year: 2024, month: 6, day: 17, weekday: 0 };
      const worldTime = engine.dateToWorldTime(testDate);
      const convertedDate = engine.worldTimeToDate(worldTime);

      expect(convertedDate.weekday).toBe(engine.calculateWeekday(2024, 6, 17));
    });
  });
});
