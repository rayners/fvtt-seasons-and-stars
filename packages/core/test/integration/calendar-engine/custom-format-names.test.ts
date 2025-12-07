/**
 * Tests for custom format names via the API
 *
 * Verifies that calendars with custom dateFormats (like 'cosmere', 'roshar', 'vorin')
 * can be accessed through the formatDate API by passing the format name directly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Handlebars from 'handlebars';
import { CalendarDate } from '../../../src/core/calendar-date';
import { DateFormatter } from '../../../src/core/date-formatter';
import { CalendarEngine } from '../../../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';

// Use REAL Handlebars for integration testing
global.Handlebars = Handlebars;

// Calendar with custom format names (similar to Roshar)
const calendarWithCustomFormats: SeasonsStarsCalendar = {
  id: 'test-custom-formats',
  translations: {
    en: { label: 'Test Custom Formats', description: 'Calendar with custom format names' },
  },
  year: { epoch: 0, currentYear: 1173, prefix: '', suffix: '', startDay: 0 },
  leapYear: { rule: 'none' },
  months: [
    { name: 'Jesnan', abbreviation: 'Jes', prefix: 'Jes', days: 50 },
    { name: 'Nanan', abbreviation: 'Nan', prefix: 'Nan', days: 50 },
  ],
  weekdays: [
    { name: 'Jesdes', abbreviation: 'Je', suffix: 'es' },
    { name: 'Nandes', abbreviation: 'Na', suffix: 'an' },
    { name: 'Chachel', abbreviation: 'Ch', suffix: 'ach' },
    { name: 'Vevod', abbreviation: 'Ve', suffix: 'ev' },
    { name: 'Palah', abbreviation: 'Pa', suffix: 'ah' },
  ],
  intercalary: [],
  time: { hoursInDay: 20, minutesInHour: 50, secondsInMinute: 100 },
  weeks: {
    type: 'month-based',
    perMonth: 10,
    daysPerWeek: 5,
    names: [
      { name: 'First Week', abbreviation: '1st', suffix: 'es' },
      { name: 'Second Week', abbreviation: '2nd', suffix: 'an' },
      { name: 'Third Week', abbreviation: '3rd', suffix: 'ach' },
      { name: 'Fourth Week', abbreviation: '4th', suffix: 'ev' },
      { name: 'Fifth Week', abbreviation: '5th', suffix: 'ah' },
      { name: 'Sixth Week', abbreviation: '6th', suffix: 'ash' },
      { name: 'Seventh Week', abbreviation: '7th', suffix: 'et' },
      { name: 'Eighth Week', abbreviation: '8th', suffix: 'ak' },
      { name: 'Ninth Week', abbreviation: '9th', suffix: 'anat' },
      { name: 'Tenth Week', abbreviation: '10th', suffix: 'ishev' },
    ],
  },
  dateFormats: {
    // Custom format using prefix/suffix combinatorial style
    cosmere:
      '{{ss-month format="prefix"}}{{ss-week format="suffix"}}{{ss-weekday format="suffix"}}',
    // Numeric format
    roshar: '{{year}}.{{month}}.{{ss-week}}.{{ss-day-in-week}}',
    // Verbose format
    vorin:
      '{{ss-day format="ordinal"}} day of {{ss-week format="ordinal"}} week, {{ss-month format="name"}}, {{year}}',
    // Standard formats
    short: '{{ss-month format="abbr"}} {{ss-day}}',
    long: '{{ss-weekday format="name"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}} {{year}}',
    date: '{{ss-weekday format="name"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}} {{year}}',
  },
};

describe('Custom Format Names', () => {
  beforeEach(() => {
    // Reset Handlebars helpers before each test
    DateFormatter.resetHelpersForTesting();
  });

  describe('CalendarDate.format() with custom format names', () => {
    it('should format using "cosmere" custom format name', () => {
      const date = { year: 1173, month: 1, day: 1, weekday: 0 };
      const calendarDate = new CalendarDate(date, calendarWithCustomFormats);

      const result = calendarDate.format({ format: 'cosmere' as any });

      // Month prefix "Jes" + Week suffix "es" + Weekday suffix "es" = "Jeseses"
      expect(result).toBe('Jeseses');
    });

    it('should format using "roshar" custom format name', () => {
      const date = { year: 1173, month: 1, day: 1, weekday: 0 };
      const calendarDate = new CalendarDate(date, calendarWithCustomFormats);

      const result = calendarDate.format({ format: 'roshar' as any });

      // year.month.week.day-in-week = 1173.1.1.1
      expect(result).toBe('1173.1.1.1');
    });

    it('should format using "vorin" custom format name', () => {
      const date = { year: 1173, month: 1, day: 1, weekday: 0 };
      const calendarDate = new CalendarDate(date, calendarWithCustomFormats);

      const result = calendarDate.format({ format: 'vorin' as any });

      expect(result).toBe('1st day of 1st week, Jesnan, 1173');
    });

    it('should format day 6 correctly with week 2 suffix', () => {
      const date = { year: 1173, month: 1, day: 6, weekday: 0 };
      const calendarDate = new CalendarDate(date, calendarWithCustomFormats);

      const result = calendarDate.format({ format: 'cosmere' as any });

      // Month prefix "Jes" + Week 2 suffix "an" + Weekday suffix "es" = "Jesanes"
      expect(result).toBe('Jesanes');
    });

    it('should format day 50 correctly with week 10 suffix', () => {
      const date = { year: 1173, month: 1, day: 50, weekday: 4 };
      const calendarDate = new CalendarDate(date, calendarWithCustomFormats);

      const result = calendarDate.format({ format: 'cosmere' as any });

      // Month prefix "Jes" + Week 10 suffix "ishev" + Weekday 5 suffix "ah" = "Jesishevah"
      expect(result).toBe('Jesishevah');
    });

    it('should fall back to default format for unknown format names', () => {
      const date = { year: 1173, month: 1, day: 1, weekday: 0 };
      const calendarDate = new CalendarDate(date, calendarWithCustomFormats);

      const result = calendarDate.format({ format: 'nonexistent' as any });

      // Should produce some output (fallback format)
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('DateFormatter.formatNamed() with custom format names', () => {
    it('should format using "cosmere" via formatNamed', () => {
      const engine = new CalendarEngine(calendarWithCustomFormats);
      const formatter = new DateFormatter(calendarWithCustomFormats, engine);
      const date = { year: 1173, month: 1, day: 1, weekday: 0 };

      const result = formatter.formatNamed(date, 'cosmere');

      expect(result).toBe('Jeseses');
    });

    it('should format using "roshar" via formatNamed', () => {
      const engine = new CalendarEngine(calendarWithCustomFormats);
      const formatter = new DateFormatter(calendarWithCustomFormats, engine);
      const date = { year: 1173, month: 1, day: 1, weekday: 0 };

      const result = formatter.formatNamed(date, 'roshar');

      expect(result).toBe('1173.1.1.1');
    });
  });

  describe('format() with string option (API-style)', () => {
    it('should accept format name as string option', () => {
      const date = { year: 1173, month: 1, day: 1, weekday: 0 };
      const calendarDate = new CalendarDate(date, calendarWithCustomFormats);

      // This is how the API would call it with a string
      const result = calendarDate.format('cosmere' as any);

      // Should recognize 'cosmere' as a format name
      expect(result).toBe('Jeseses');
    });
  });

  describe('Week suffix variations across the month', () => {
    const weekTests = [
      { day: 1, expectedWeek: 1, expectedSuffix: 'es', expectedCosmere: 'Jeseses' },
      { day: 5, expectedWeek: 1, expectedSuffix: 'es', expectedCosmere: 'Jesesah' }, // day 5 = weekday 5 = "ah"
      { day: 6, expectedWeek: 2, expectedSuffix: 'an', expectedCosmere: 'Jesanes' },
      { day: 25, expectedWeek: 5, expectedSuffix: 'ah', expectedCosmere: 'Jesahah' }, // week 5, day 5
      { day: 46, expectedWeek: 10, expectedSuffix: 'ishev', expectedCosmere: 'Jesisheves' },
      { day: 50, expectedWeek: 10, expectedSuffix: 'ishev', expectedCosmere: 'Jesishevah' },
    ];

    weekTests.forEach(({ day, expectedWeek, expectedSuffix, expectedCosmere }) => {
      it(`day ${day} should be week ${expectedWeek} with suffix "${expectedSuffix}"`, () => {
        const engine = new CalendarEngine(calendarWithCustomFormats);
        const date = { year: 1173, month: 1, day, weekday: (day - 1) % 5 };

        const weekNum = engine.getWeekOfMonth(date);
        const weekInfo = engine.getWeekInfo(date);

        expect(weekNum).toBe(expectedWeek);
        expect(weekInfo?.suffix).toBe(expectedSuffix);
      });

      it(`day ${day} cosmere format should be "${expectedCosmere}"`, () => {
        const engine = new CalendarEngine(calendarWithCustomFormats);
        const formatter = new DateFormatter(calendarWithCustomFormats, engine);
        const date = { year: 1173, month: 1, day, weekday: (day - 1) % 5 };
        const result = formatter.formatNamed(date, 'cosmere');
        expect(result).toBe(expectedCosmere);
      });
    });
  });
});
