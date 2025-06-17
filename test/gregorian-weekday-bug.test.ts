/**
 * Test for Gregorian calendar weekday bug (Issue #58)
 * Tests specific real-world dates with known weekdays to verify correct calculation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../src/types/calendar';
import * as fs from 'fs';
import * as path from 'path';

// Load the actual Gregorian calendar definition from the JSON file
function loadGregorianCalendar(): SeasonsStarsCalendar {
  const calendarPath = path.join(__dirname, '../calendars/gregorian.json');
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
