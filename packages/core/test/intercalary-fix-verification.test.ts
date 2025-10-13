/**
 * Verification test for the intercalary day fix
 * This test demonstrates that issue #236 is now resolved
 */

import { describe, it, expect } from 'vitest';
import { DateFormatter } from '../src/core/date-formatter';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Simple test calendar with intercalary days
const testCalendar: SeasonsStarsCalendar = {
  id: 'test-intercalary-fix',
  name: 'Test Calendar',
  label: 'Test Calendar',
  months: [
    { name: 'Spring', abbreviation: 'Spr', days: 30 },
    { name: 'Summer', abbreviation: 'Sum', days: 30 },
  ],
  weekdays: [
    { name: 'Monday', abbreviation: 'Mon' },
    { name: 'Tuesday', abbreviation: 'Tue' },
  ],
  intercalary: [
    {
      name: 'Festival Day',
      after: 'Spring',
      days: 1,
      leapYearOnly: false,
      countsForWeekdays: false,
    },
  ],
  yearLength: 365,
  weekLength: 7,
  epoch: { year: 1, month: 1, day: 1 },
  // NO dateFormats - this will trigger the fallback methods we fixed
} as SeasonsStarsCalendar;

describe('Intercalary Day Fix Verification (Issue #236)', () => {
  it('should display intercalary day name in DateFormatter.getBasicFormat()', () => {
    const formatter = new DateFormatter(testCalendar);

    const intercalaryData = {
      year: 2024,
      month: 1, // Summer
      day: 1,
      weekday: undefined,
      intercalary: 'Festival Day',
    };

    // This should now return "Festival Day", not a regular date
    const result = (formatter as any).getBasicFormat(intercalaryData);
    expect(result).toBe('Festival Day');
  });

  it('should display intercalary day name in CalendarDate.toShortString()', () => {
    const intercalaryDate = new CalendarDate(
      {
        year: 2024,
        month: 1,
        day: 1,
        weekday: undefined,
        intercalary: 'Festival Day',
        time: { hour: 12, minute: 0, second: 0 },
      },
      testCalendar
    );

    // This should now return "Festival Day", not a regular date
    const result = intercalaryDate.toShortString();
    expect(result).toBe('Festival Day');
  });

  it('should display intercalary day name in CalendarDate.toLongString()', () => {
    const intercalaryDate = new CalendarDate(
      {
        year: 2024,
        month: 1,
        day: 1,
        weekday: undefined,
        intercalary: 'Festival Day',
        time: { hour: 12, minute: 0, second: 0 },
      },
      testCalendar
    );

    // This should now return "Festival Day" with time
    const result = intercalaryDate.toLongString();
    expect(result).toBe('Festival Day 12:00:00');
  });

  it('should handle regular dates normally (regression test)', () => {
    const regularDate = new CalendarDate(
      {
        year: 2024,
        month: 1, // Spring (1-based indexing)
        day: 15,
        weekday: 1, // Tuesday
        time: { hour: 12, minute: 0, second: 0 },
      },
      testCalendar
    );

    const result = regularDate.toShortString();
    // Should still format regular dates normally (not as intercalary)
    expect(result).toContain('15');
    expect(result).toContain('Spr'); // Abbreviated month name in short format
    expect(result).not.toBe('Festival Day');
  });
});
