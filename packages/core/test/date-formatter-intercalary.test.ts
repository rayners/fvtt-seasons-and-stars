/**
 * Unit tests for DateFormatter intercalary day handling
 * Tests the core formatting methods that need to handle intercalary days correctly
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DateFormatter } from '../src/core/date-formatter';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Import test calendar with intercalary days
import testWarhammerCalendar from '../../test-module/calendars/test-warhammer-intercalary.json';

describe('DateFormatter Intercalary Day Handling', () => {
  let formatter: DateFormatter;
  let calendar: SeasonsStarsCalendar;

  beforeEach(() => {
    calendar = testWarhammerCalendar as SeasonsStarsCalendar;
    formatter = new DateFormatter(calendar);
  });

  describe('getBasicFormat() method', () => {
    it('should return intercalary name for intercalary days (CURRENTLY FAILS)', () => {
      // Create intercalary day data
      const intercalaryData = {
        year: 2522,
        month: 1, // Jahrdrung
        day: 1,
        weekday: undefined,
        intercalary: 'Mitterfruhl',
        time: { hour: 12, minute: 0, second: 0 },
      };

      // Access the private getBasicFormat method for testing
      const result = (formatter as any).getBasicFormat(intercalaryData);

      // Should return the intercalary name, not the regular date format
      expect(result).toBe('Mitterfruhl');
      expect(result).not.toContain('Jahrdrung'); // Should not contain month name
      expect(result).not.toContain('1'); // Should not contain day number
    });

    it('should return normal date format for regular days', () => {
      // Create normal day data - using month 0 (Nachexen) since that's what the formatter is returning
      const normalData = {
        year: 2522,
        month: 0, // Nachexen (first month - 0-based index)
        day: 15,
        weekday: 2, // Marktag
        // No intercalary property
        time: { hour: 12, minute: 0, second: 0 },
      };

      // Access the private getBasicFormat method for testing
      const result = (formatter as any).getBasicFormat(normalData);

      // Should return normal date format
      expect(result).toContain('Marktag'); // Should contain weekday
      expect(result).toContain('15th'); // Should contain ordinal day
      expect(result).toContain('Nachexen'); // Should contain month (using correct month for index 0)
      expect(result).toContain('2522'); // Should contain year
    });

    it('should handle empty intercalary name gracefully', () => {
      const intercalaryData = {
        year: 2522,
        month: 1,
        day: 1,
        weekday: undefined,
        intercalary: '', // Empty string
        time: { hour: 12, minute: 0, second: 0 },
      };

      const result = (formatter as any).getBasicFormat(intercalaryData);

      // Should fall back to regular formatting when intercalary name is empty
      expect(result).not.toBe('');
      expect(result).toContain('2522');
    });

    it('should handle null intercalary value gracefully', () => {
      const intercalaryData = {
        year: 2522,
        month: 1,
        day: 1,
        weekday: 0,
        intercalary: null, // Null value
        time: { hour: 12, minute: 0, second: 0 },
      };

      const result = (formatter as any).getBasicFormat(intercalaryData);

      // Should fall back to regular formatting when intercalary is null
      expect(result).toContain('2522');
    });
  });

  describe('CalendarDate integration', () => {
    it('should format intercalary days correctly through CalendarDate.toShortString (CURRENTLY FAILS)', () => {
      const intercalaryDate = new CalendarDate(
        {
          year: 2522,
          month: 1,
          day: 1,
          weekday: undefined,
          intercalary: 'Mitterfruhl',
          time: { hour: 12, minute: 0, second: 0 },
        },
        calendar
      );

      const result = intercalaryDate.toShortString();

      // Should show intercalary name
      expect(result).toBe('Mitterfruhl');
      expect(result).not.toContain('Jahrdrung');
    });

    it('should format intercalary days correctly through CalendarDate.toLongString (CURRENTLY FAILS)', () => {
      const intercalaryDate = new CalendarDate(
        {
          year: 2522,
          month: 1,
          day: 1,
          weekday: undefined,
          intercalary: 'Mitterfruhl',
          time: { hour: 12, minute: 0, second: 0 },
        },
        calendar
      );

      const result = intercalaryDate.toLongString();

      // Should show intercalary name prominently
      expect(result).toContain('Mitterfruhl');
      expect(result).not.toContain('Jahrdrung');
    });

    it('should handle regular dates normally', () => {
      const normalDate = new CalendarDate(
        {
          year: 2522,
          month: 0, // Nachexen (first month - 0-based index)
          day: 15,
          weekday: 2,
          time: { hour: 12, minute: 0, second: 0 },
        },
        calendar
      );

      const shortResult = normalDate.toShortString();
      const longResult = normalDate.toLongString();

      // Should contain month and day for regular dates
      expect(shortResult).toContain('15');
      expect(shortResult).toContain('Nac'); // Month abbreviation for Nachexen
      expect(longResult).toContain('Nachexen'); // Full month name
    });
  });
});
