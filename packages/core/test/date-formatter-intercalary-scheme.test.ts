/**
 * Test for the new -intercalary format scheme
 * Tests the enhanced formatting engine that supports <format>-intercalary naming
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DateFormatter } from '../src/core/date-formatter';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

describe('Date Formatter Intercalary Scheme', () => {
  let formatter: DateFormatter;
  let calendar: SeasonsStarsCalendar;

  beforeEach(() => {
    // Create test calendar with new -intercalary format scheme
    calendar = {
      id: 'test-intercalary-scheme',
      name: 'Test Intercalary Scheme Calendar',
      label: 'Test Calendar with -intercalary Formats',
      months: [
        { name: 'Spring', abbreviation: 'Spr', days: 30 },
        { name: 'Summer', abbreviation: 'Sum', days: 30 },
        { name: 'Autumn', abbreviation: 'Aut', days: 30 },
        { name: 'Winter', abbreviation: 'Win', days: 30 },
      ],
      weekdays: [
        { name: 'Moonday', abbreviation: 'Mon' },
        { name: 'Tueday', abbreviation: 'Tue' },
        { name: 'Wednesday', abbreviation: 'Wed' },
        { name: 'Thursday', abbreviation: 'Thu' },
        { name: 'Friday', abbreviation: 'Fri' },
        { name: 'Saturday', abbreviation: 'Sat' },
        { name: 'Sunday', abbreviation: 'Sun' },
      ],
      intercalary: [
        {
          name: 'Festival of Lights',
          after: 'Summer',
          days: 2,
          leapYearOnly: false,
          countsForWeekdays: false,
          description: 'Two-day celebration',
        },
        {
          name: 'New Year Day',
          after: 'Winter',
          days: 1,
          leapYearOnly: false,
          countsForWeekdays: false,
          description: 'Single day between years',
        },
      ],
      yearLength: 365,
      weekLength: 7,
      epoch: { year: 1, month: 1, day: 1 },
      dateFormats: {
        // Regular formats
        short: '{{ss-day}} {{ss-month format="abbr"}}',
        long: '{{ss-weekday format="name"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}} {{year}}',
        date: '{{ss-day}} {{ss-month format="abbr"}} {{year}}',
        time: '{{ss-hour format="pad"}}:{{ss-minute format="pad"}}',
        datetime: '{{ss-dateFmt "date"}} at {{ss-dateFmt "time"}}',
        brief: '{{ss-day}}/{{ss-month}}/{{year}}',

        // NEW: -intercalary formats
        'short-intercalary': '{{intercalary}}',
        'long-intercalary': '{{intercalary}}, {{year}}',
        'date-intercalary': '{{intercalary}}, {{year}}',
        'datetime-intercalary': '{{intercalary}}, {{year}} at {{ss-dateFmt "time"}}',
        'brief-intercalary': '{{intercalary}}',

        // Widget formats
        widgets: {
          mini: '{{ss-day}} {{ss-month format="abbr"}}',
          main: '{{ss-weekday format="abbr"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}}',
          grid: '{{ss-day}}',

          // NEW: Widget -intercalary formats
          'mini-intercalary': '{{intercalary}}',
          'main-intercalary': '{{intercalary}}, {{year}}',
          'grid-intercalary': '{{intercalary}}',
        },
      },
    } as SeasonsStarsCalendar;

    formatter = new DateFormatter(calendar);
  });

  describe('formatNamed() with -intercalary scheme', () => {
    it('should use -intercalary format for intercalary dates', () => {
      const intercalaryDate = new CalendarDate(
        {
          year: 2024,
          month: 1, // Summer
          day: 1,
          weekday: undefined,
          intercalary: 'Festival of Lights',
          time: { hour: 12, minute: 0, second: 0 },
        },
        calendar
      );

      // short-intercalary format should be used instead of short
      const result = formatter.formatNamed(intercalaryDate, 'short');
      expect(result).toBe('Festival of Lights');
    });

    it('should use -intercalary format with year for long formats', () => {
      const intercalaryDate = new CalendarDate(
        {
          year: 2024,
          month: 3, // Winter
          day: 1,
          weekday: undefined,
          intercalary: 'New Year Day',
          time: { hour: 0, minute: 0, second: 0 },
        },
        calendar
      );

      // long-intercalary format should include year
      const result = formatter.formatNamed(intercalaryDate, 'long');
      expect(result).toBe('New Year Day, 2024');
    });

    it('should use -intercalary format with time for datetime formats', () => {
      const intercalaryDate = new CalendarDate(
        {
          year: 2024,
          month: 1,
          day: 2, // Second day of Festival
          weekday: undefined,
          intercalary: 'Festival of Lights',
          time: { hour: 15, minute: 30, second: 0 },
        },
        calendar
      );

      // datetime-intercalary should combine intercalary name with time
      const result = formatter.formatNamed(intercalaryDate, 'datetime');
      expect(result).toBe('Festival of Lights, 2024 at 15:30');
    });

    it('should fall back to regular format when no -intercalary format exists', () => {
      // Add a format without an intercalary variant
      if (calendar.dateFormats) {
        calendar.dateFormats['custom'] = '{{ss-month format="name"}} {{ss-day}}, {{year}}';
      }

      const intercalaryDate = new CalendarDate(
        {
          year: 2024,
          month: 1,
          day: 1,
          weekday: undefined,
          intercalary: 'Festival of Lights',
          time: { hour: 12, minute: 0, second: 0 },
        },
        calendar
      );

      // Should fall back to regular 'custom' format since 'custom-intercalary' doesn't exist
      // The template should process with intercalary data available
      const result = formatter.formatNamed(intercalaryDate, 'custom');
      expect(result).toContain('Summer'); // Regular template should execute
    });

    it('should use regular format for normal dates', () => {
      const normalDate = new CalendarDate(
        {
          year: 2024,
          month: 1, // Summer
          day: 15,
          weekday: 2, // Wednesday
          time: { hour: 12, minute: 0, second: 0 },
        },
        calendar
      );

      // Regular dates should use regular format
      const result = formatter.formatNamed(normalDate, 'short');
      expect(result).toBe('15 Sum');
    });
  });

  describe('formatWidget() with -intercalary scheme', () => {
    it('should use mini-intercalary format for mini widget', () => {
      const intercalaryDate = new CalendarDate(
        {
          year: 2024,
          month: 1,
          day: 1,
          weekday: undefined,
          intercalary: 'Festival of Lights',
          time: { hour: 12, minute: 0, second: 0 },
        },
        calendar
      );

      const result = formatter.formatWidget(intercalaryDate, 'mini');
      expect(result).toBe('Festival of Lights');
    });

    it('should use main-intercalary format for main widget', () => {
      const intercalaryDate = new CalendarDate(
        {
          year: 2024,
          month: 3,
          day: 1,
          weekday: undefined,
          intercalary: 'New Year Day',
          time: { hour: 0, minute: 0, second: 0 },
        },
        calendar
      );

      const result = formatter.formatWidget(intercalaryDate, 'main');
      expect(result).toBe('New Year Day, 2024');
    });

    it('should use grid-intercalary format for grid widget', () => {
      const intercalaryDate = new CalendarDate(
        {
          year: 2024,
          month: 1,
          day: 2,
          weekday: undefined,
          intercalary: 'Festival of Lights',
          time: { hour: 12, minute: 0, second: 0 },
        },
        calendar
      );

      const result = formatter.formatWidget(intercalaryDate, 'grid');
      expect(result).toBe('Festival of Lights');
    });

    it('should fall back to regular widget format when no -intercalary variant exists', () => {
      // Remove one intercalary widget format to test fallback
      if (calendar.dateFormats?.widgets) {
        delete calendar.dateFormats.widgets['main-intercalary'];
      }

      const intercalaryDate = new CalendarDate(
        {
          year: 2024,
          month: 1,
          day: 1,
          weekday: undefined,
          intercalary: 'Festival of Lights',
          time: { hour: 12, minute: 0, second: 0 },
        },
        calendar
      );

      // Should fall back to regular main widget format
      const result = formatter.formatWidget(intercalaryDate, 'main');
      // The regular template should execute with intercalary data
      expect(result).toContain('Summer'); // Should show regular format result
    });

    it('should use regular widget format for normal dates', () => {
      const normalDate = new CalendarDate(
        {
          year: 2024,
          month: 0, // Spring
          day: 15,
          weekday: 2, // Wednesday
          time: { hour: 12, minute: 0, second: 0 },
        },
        calendar
      );

      const miniResult = formatter.formatWidget(normalDate, 'mini');
      expect(miniResult).toBe('15 Spr');

      const mainResult = formatter.formatWidget(normalDate, 'main');
      expect(mainResult).toContain('Wed');
      expect(mainResult).toContain('15th');
      expect(mainResult).toContain('Spring');
    });
  });

  describe('Backward compatibility', () => {
    it('should still work with calendars using {{#if intercalary}} approach', () => {
      // Create calendar with old-style conditional formats
      const oldStyleCalendar: SeasonsStarsCalendar = {
        ...calendar,
        dateFormats: {
          short:
            '{{#if intercalary}}{{intercalary}}{{else}}{{ss-day}} {{ss-month format="abbr"}}{{/if}}',
          long: '{{#if intercalary}}{{intercalary}}, {{year}}{{else}}{{ss-weekday format="name"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}} {{year}}{{/if}}',
          widgets: {
            mini: '{{#if intercalary}}{{intercalary}}{{else}}{{ss-day}} {{ss-month format="abbr"}}{{/if}}',
          },
        },
      } as SeasonsStarsCalendar;

      const oldFormatter = new DateFormatter(oldStyleCalendar);

      const intercalaryDate = new CalendarDate(
        {
          year: 2024,
          month: 1,
          day: 1,
          weekday: undefined,
          intercalary: 'Festival of Lights',
          time: { hour: 12, minute: 0, second: 0 },
        },
        oldStyleCalendar
      );

      // Old style should still work
      const shortResult = oldFormatter.formatNamed(intercalaryDate, 'short');
      expect(shortResult).toBe('Festival of Lights');

      const miniResult = oldFormatter.formatWidget(intercalaryDate, 'mini');
      expect(miniResult).toBe('Festival of Lights');
    });

    it('should prefer -intercalary format over {{#if}} when both exist', () => {
      // Create calendar with both approaches
      const mixedCalendar: SeasonsStarsCalendar = {
        ...calendar,
        dateFormats: {
          short:
            '{{#if intercalary}}{{intercalary}} (conditional){{else}}{{ss-day}} {{ss-month format="abbr"}}{{/if}}',
          'short-intercalary': '{{intercalary}} (dedicated)', // This should be preferred
        },
      } as SeasonsStarsCalendar;

      const mixedFormatter = new DateFormatter(mixedCalendar);

      const intercalaryDate = new CalendarDate(
        {
          year: 2024,
          month: 1,
          day: 1,
          weekday: undefined,
          intercalary: 'Festival of Lights',
          time: { hour: 12, minute: 0, second: 0 },
        },
        mixedCalendar
      );

      // Should use dedicated -intercalary format, not the conditional one
      const result = mixedFormatter.formatNamed(intercalaryDate, 'short');
      expect(result).toBe('Festival of Lights (dedicated)');
    });
  });
});
