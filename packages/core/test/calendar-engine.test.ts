/**
 * Tests for CalendarEngine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import { CalendarValidator } from '../src/core/calendar-validator';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Mock Gregorian calendar for testing
const gregorianCalendar: SeasonsStarsCalendar = {
  id: 'test-gregorian',
  translations: {
    en: {
      label: 'Test Gregorian',
      description: 'Test calendar',
      setting: 'Test',
    },
  },
  year: {
    epoch: 2024,
    currentYear: 2024,
    prefix: '',
    suffix: ' CE',
    startDay: 1, // Monday
  },
  leapYear: {
    rule: 'gregorian',
    month: 'February',
    extraDays: 1,
  },
  months: [
    { name: 'January', days: 31 },
    { name: 'February', days: 28 },
    { name: 'March', days: 31 },
    { name: 'April', days: 30 },
    { name: 'May', days: 31 },
    { name: 'June', days: 30 },
    { name: 'July', days: 31 },
    { name: 'August', days: 31 },
    { name: 'September', days: 30 },
    { name: 'October', days: 31 },
    { name: 'November', days: 30 },
    { name: 'December', days: 31 },
  ],
  weekdays: [
    { name: 'Sunday' },
    { name: 'Monday' },
    { name: 'Tuesday' },
    { name: 'Wednesday' },
    { name: 'Thursday' },
    { name: 'Friday' },
    { name: 'Saturday' },
  ],
  intercalary: [],
  time: {
    hoursInDay: 24,
    minutesInHour: 60,
    secondsInMinute: 60,
  },
};

// Simple test calendar
const simpleCalendar: SeasonsStarsCalendar = {
  id: 'test-simple',
  translations: {
    en: {
      label: 'Test Simple',
      description: 'Simple test calendar',
      setting: 'Test',
    },
  },
  year: {
    epoch: 0,
    currentYear: 1,
    prefix: '',
    suffix: '',
    startDay: 0,
  },
  leapYear: {
    rule: 'none',
  },
  months: [
    { name: 'Month1', days: 30 },
    { name: 'Month2', days: 30 },
  ],
  weekdays: [{ name: 'Day1' }, { name: 'Day2' }, { name: 'Day3' }],
  intercalary: [],
  time: {
    hoursInDay: 24,
    minutesInHour: 60,
    secondsInMinute: 60,
  },
};

describe('CalendarValidator', () => {
  it('should validate gregorian calendar', async () => {
    const result = await CalendarValidator.validate(gregorianCalendar);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate simple calendar', async () => {
    const result = await CalendarValidator.validate(simpleCalendar);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid calendar', async () => {
    const invalid = { id: 'test' }; // Missing required fields
    const result = await CalendarValidator.validate(invalid);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('CalendarEngine - Basic Operations', () => {
  let engine: CalendarEngine;

  beforeEach(() => {
    engine = new CalendarEngine(simpleCalendar);
  });

  it('should create engine with calendar', () => {
    expect(engine).toBeDefined();
    expect(engine.getCalendar().id).toBe('test-simple');
  });

  it('should convert world time to date', () => {
    // Test epoch (time 0)
    const date = engine.worldTimeToDate(0);
    expect(date.year).toBe(0); // epoch is 0
    expect(date.month).toBe(1); // 1-based months
    expect(date.day).toBe(1); // 1-based days
    expect(date.weekday).toBe(0); // startDay is 0
  });

  it('should convert date to world time', () => {
    const date = {
      year: 0, // Use epoch year
      month: 1,
      day: 1,
      weekday: 0,
    };

    const worldTime = engine.dateToWorldTime(date);
    expect(worldTime).toBe(0); // Should be epoch
  });

  it('should add days correctly', () => {
    const startDate = {
      year: 1,
      month: 1,
      day: 1,
      weekday: 0,
    };

    const newDate = engine.addDays(startDate, 5);
    expect(newDate.year).toBe(1);
    expect(newDate.month).toBe(1);
    expect(newDate.day).toBe(6);
    expect(newDate.weekday).toBe(2); // (0 + 5) % 3 = 2
  });

  it('should handle month overflow when adding days', () => {
    const startDate = {
      year: 1,
      month: 1,
      day: 25,
      weekday: 0,
    };

    const newDate = engine.addDays(startDate, 10); // Should go into next month
    expect(newDate.year).toBe(1);
    expect(newDate.month).toBe(2);
    expect(newDate.day).toBe(5); // 25 + 10 - 30 = 5
  });

  it('should handle year overflow when adding days', () => {
    const startDate = {
      year: 1,
      month: 2,
      day: 25,
      weekday: 0,
    };

    const newDate = engine.addDays(startDate, 10); // Should go into next year
    expect(newDate.year).toBe(2);
    expect(newDate.month).toBe(1);
    expect(newDate.day).toBe(5); // 25 + 10 - 30 = 5
  });

  it('should add months correctly', () => {
    const startDate = {
      year: 1,
      month: 1,
      day: 15,
      weekday: 0,
    };

    const newDate = engine.addMonths(startDate, 1);
    expect(newDate.year).toBe(1);
    expect(newDate.month).toBe(2);
    expect(newDate.day).toBe(15);
  });

  it('should add years correctly', () => {
    const startDate = {
      year: 1,
      month: 1,
      day: 15,
      weekday: 0,
    };

    const newDate = engine.addYears(startDate, 1);
    expect(newDate.year).toBe(2);
    expect(newDate.month).toBe(1);
    expect(newDate.day).toBe(15);
  });
});

describe('CalendarEngine - Gregorian Calendar', () => {
  let engine: CalendarEngine;

  beforeEach(() => {
    engine = new CalendarEngine(gregorianCalendar);
  });

  it('should handle leap years correctly', () => {
    // Test leap year date
    const leapYearDate = {
      year: 2024, // 2024 is a leap year
      month: 2, // February
      day: 29, // 29th day
      weekday: 0,
    };

    const worldTime = engine.dateToWorldTime(leapYearDate);
    const convertedBack = engine.worldTimeToDate(worldTime);

    expect(convertedBack.year).toBe(2024);
    expect(convertedBack.month).toBe(2);
    expect(convertedBack.day).toBe(29);
  });

  it('should handle non-leap years correctly', () => {
    // Test that February 29 doesn't exist in non-leap years
    const nonLeapYearDate = {
      year: 2023, // 2023 is not a leap year
      month: 3, // March
      day: 1, // 1st day
      weekday: 0,
    };

    const worldTime = engine.dateToWorldTime(nonLeapYearDate);
    const convertedBack = engine.worldTimeToDate(worldTime);

    expect(convertedBack.year).toBe(2023);
    expect(convertedBack.month).toBe(3);
    expect(convertedBack.day).toBe(1);
  });

  it('should roundtrip dates correctly', () => {
    const testDates = [
      { year: 2024, month: 1, day: 1, weekday: 0 }, // New Year
      { year: 2024, month: 2, day: 29, weekday: 0 }, // Leap day
      { year: 2024, month: 12, day: 31, weekday: 0 }, // End of year
      { year: 2025, month: 6, day: 15, weekday: 0 }, // Mid-year
    ];

    for (const date of testDates) {
      const worldTime = engine.dateToWorldTime(date);
      const converted = engine.worldTimeToDate(worldTime);

      expect(converted.year).toBe(date.year);
      expect(converted.month).toBe(date.month);
      expect(converted.day).toBe(date.day);
    }
  });
});

describe('CalendarEngine - Multi-Day Intercalary Periods', () => {
  // Test calendar with multi-day intercalary periods
  const intercalaryTestCalendar: SeasonsStarsCalendar = {
    id: 'test-intercalary',
    translations: {
      en: {
        label: 'Test Intercalary',
        description: 'Test calendar with multi-day intercalary periods',
        setting: 'Test',
      },
    },
    year: {
      epoch: 0,
      currentYear: 1,
      prefix: '',
      suffix: '',
      startDay: 0,
    },
    leapYear: {
      rule: 'none',
    },
    months: [
      { name: 'Month1', days: 30 },
      { name: 'Month2', days: 30 },
    ],
    weekdays: [{ name: 'Day1' }, { name: 'Day2' }, { name: 'Day3' }],
    intercalary: [
      {
        name: 'Festival1',
        days: 7, // Multi-day festival
        after: 'Month1',
        leapYearOnly: false,
        countsForWeekdays: true,
        description: '7-day festival after Month1',
      },
      {
        name: 'Festival2',
        days: 5, // Multi-day festival
        after: 'Month2',
        leapYearOnly: false,
        countsForWeekdays: true,
        description: '5-day festival after Month2',
      },
    ],
    time: {
      hoursInDay: 24,
      minutesInHour: 60,
      secondsInMinute: 60,
    },
  };

  let engine: CalendarEngine;

  beforeEach(() => {
    engine = new CalendarEngine(intercalaryTestCalendar);
  });

  it('should validate calendar with multi-day intercalary periods', async () => {
    const result = await CalendarValidator.validate(intercalaryTestCalendar);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should correctly calculate total year length with multi-day intercalary periods', () => {
    const yearLength = engine.getYearLength(1);
    // 30 + 30 = 60 (months) + 7 + 5 = 12 (intercalary days) = 72 total
    expect(yearLength).toBe(72);
  });

  it('should handle date arithmetic across multi-day intercalary periods', () => {
    // Start at end of Month1
    const startDate = {
      year: 1,
      month: 1,
      day: 30,
      weekday: 0,
    };

    // Add 8 days - should go through 7-day Festival1 and land on Month2 day 1
    const newDate = engine.addDays(startDate, 8);
    expect(newDate.year).toBe(1);
    expect(newDate.month).toBe(2);
    expect(newDate.day).toBe(1);
  });

  it('should handle conversion to/from world time with multi-day intercalary periods', () => {
    // Test dates around intercalary periods
    const testDates = [
      { year: 1, month: 1, day: 30, weekday: 0 }, // Last day of Month1
      { year: 1, month: 2, day: 1, weekday: 0 }, // First day of Month2 (after 7-day festival)
      { year: 1, month: 2, day: 30, weekday: 0 }, // Last day of Month2 (before 5-day festival)
    ];

    for (const date of testDates) {
      const worldTime = engine.dateToWorldTime(date);
      const converted = engine.worldTimeToDate(worldTime);

      expect(converted.year).toBe(date.year);
      expect(converted.month).toBe(date.month);
      expect(converted.day).toBe(date.day);
    }
  });

  it('should handle adding days across year boundary with intercalary periods', () => {
    // Start at end of Month2
    const startDate = {
      year: 1,
      month: 2,
      day: 30,
      weekday: 0,
    };

    // Add 6 days - should go through 5-day Festival2 and land in next year
    const newDate = engine.addDays(startDate, 6);
    expect(newDate.year).toBe(2);
    expect(newDate.month).toBe(1);
    expect(newDate.day).toBe(1);
  });

  it('should handle single-day intercalary periods (default behavior)', () => {
    // Test calendar with traditional single-day intercalary (no days field)
    const singleDayCalendar: SeasonsStarsCalendar = {
      ...intercalaryTestCalendar,
      id: 'test-single-day',
      intercalary: [
        {
          name: 'SingleDay',
          // No days field - should default to 1
          after: 'Month1',
          leapYearOnly: false,
          countsForWeekdays: true,
          description: 'Single day festival',
        },
      ],
    };

    const singleEngine = new CalendarEngine(singleDayCalendar);
    const yearLength = singleEngine.getYearLength(1);
    // 30 + 30 = 60 (months) + 1 (single intercalary day) = 61 total
    expect(yearLength).toBe(61);
  });
});

describe('CalendarEngine - Real Calendar Integration Tests', () => {
  it('should load and validate Greyhawk calendar with 7-day festivals', async () => {
    // Load the actual Greyhawk calendar
    const fs = await import('fs');
    const path = await import('path');

    const greyhawkPath = path.resolve('./calendars/greyhawk.json');
    const greyhawkData = JSON.parse(fs.readFileSync(greyhawkPath, 'utf8'));

    // Validate the calendar
    const result = await CalendarValidator.validate(greyhawkData);
    expect(result.isValid).toBe(true);

    // Test the engine with real data
    const engine = new CalendarEngine(greyhawkData);
    const yearLength = engine.getYearLength(591);

    // Greyhawk: 12 months × 28 days = 336 + 4 festivals × 7 days = 28 = 364 total
    expect(yearLength).toBe(364);
  });

  it('should load and validate Dark Sun calendar with 5-day periods', async () => {
    // Load the actual Dark Sun calendar
    const fs = await import('fs');
    const path = await import('path');

    const darkSunPath = path.resolve('./calendars/dark-sun.json');
    const darkSunData = JSON.parse(fs.readFileSync(darkSunPath, 'utf8'));

    // Validate the calendar
    const result = await CalendarValidator.validate(darkSunData);
    expect(result.isValid).toBe(true);

    // Test the engine with real data
    const engine = new CalendarEngine(darkSunData);
    const yearLength = engine.getYearLength(1);

    // Dark Sun: 12 months × 30 days = 360 + 3 periods × 5 days = 15 = 375 total
    expect(yearLength).toBe(375);
  });
});
