/**
 * Test for intercalary format resolution logic
 * Tests the core -intercalary format selection without template execution complexity
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateFormatter } from '../src/core/date-formatter';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

describe('Intercalary Format Resolution Logic', () => {
  let formatter: DateFormatter;
  let calendar: SeasonsStarsCalendar;
  let mockFormatWithContext: any;

  beforeEach(() => {
    // Create simple test calendar
    calendar = {
      id: 'test-resolution',
      name: 'Test Resolution Calendar',
      label: 'Test Calendar',
      months: [{ name: 'Month1', days: 30 }],
      weekdays: [{ name: 'Day1' }],
      intercalary: [{ name: 'TestDay', after: 'Month1', days: 1 }],
      yearLength: 365,
      weekLength: 7,
      epoch: { year: 1, month: 1, day: 1 },
      dateFormats: {
        short: 'REGULAR_SHORT_FORMAT',
        'short-intercalary': 'INTERCALARY_SHORT_FORMAT',
        long: 'REGULAR_LONG_FORMAT',
        'long-intercalary': 'INTERCALARY_LONG_FORMAT',
        noIntercalary: 'NO_INTERCALARY_VARIANT',
        widgets: {
          mini: 'REGULAR_MINI_FORMAT',
          'mini-intercalary': 'INTERCALARY_MINI_FORMAT',
          main: 'REGULAR_MAIN_FORMAT',
          'main-intercalary': 'INTERCALARY_MAIN_FORMAT',
          grid: 'REGULAR_GRID_FORMAT',
          // Note: no grid-intercalary to test fallback
        },
      },
    } as SeasonsStarsCalendar;

    formatter = new DateFormatter(calendar);

    // Mock the formatWithContext method to return predictable results
    mockFormatWithContext = vi.spyOn(formatter as any, 'formatWithContext');
    mockFormatWithContext.mockImplementation((date: any, template: string, displayName: string) => {
      return `EXECUTED: ${template} (${displayName})`;
    });
  });

  describe('formatNamed() format resolution', () => {
    it('should select -intercalary format for intercalary dates when available', () => {
      const intercalaryDate = {
        year: 2024,
        month: 0,
        day: 1,
        weekday: undefined,
        intercalary: 'TestDay',
      };

      const result = formatter.formatNamed(intercalaryDate, 'short');

      expect(mockFormatWithContext).toHaveBeenCalledWith(
        intercalaryDate,
        'INTERCALARY_SHORT_FORMAT',
        'short-intercalary',
        expect.any(Set)
      );
      expect(result).toBe('EXECUTED: INTERCALARY_SHORT_FORMAT (short-intercalary)');
    });

    it('should select -intercalary format for long format', () => {
      const intercalaryDate = {
        year: 2024,
        month: 0,
        day: 1,
        weekday: undefined,
        intercalary: 'TestDay',
      };

      const result = formatter.formatNamed(intercalaryDate, 'long');

      expect(mockFormatWithContext).toHaveBeenCalledWith(
        intercalaryDate,
        'INTERCALARY_LONG_FORMAT',
        'long-intercalary',
        expect.any(Set)
      );
      expect(result).toBe('EXECUTED: INTERCALARY_LONG_FORMAT (long-intercalary)');
    });

    it('should fall back to regular format when no -intercalary format exists', () => {
      const intercalaryDate = {
        year: 2024,
        month: 0,
        day: 1,
        weekday: undefined,
        intercalary: 'TestDay',
      };

      const result = formatter.formatNamed(intercalaryDate, 'noIntercalary');

      // Should use regular format since noIntercalary-intercalary doesn't exist
      expect(mockFormatWithContext).toHaveBeenCalledWith(
        intercalaryDate,
        'NO_INTERCALARY_VARIANT',
        'noIntercalary',
        expect.any(Set)
      );
      expect(result).toBe('EXECUTED: NO_INTERCALARY_VARIANT (noIntercalary)');
    });

    it('should use regular format for non-intercalary dates', () => {
      const regularDate = {
        year: 2024,
        month: 0,
        day: 15,
        weekday: 0,
        // no intercalary property
      };

      const result = formatter.formatNamed(regularDate, 'short');

      // Should use regular format for non-intercalary dates
      expect(mockFormatWithContext).toHaveBeenCalledWith(
        regularDate,
        'REGULAR_SHORT_FORMAT',
        'short',
        expect.any(Set)
      );
      expect(result).toBe('EXECUTED: REGULAR_SHORT_FORMAT (short)');
    });
  });

  describe('formatWidget() format resolution', () => {
    it('should select -intercalary widget format when available', () => {
      const intercalaryDate = {
        year: 2024,
        month: 0,
        day: 1,
        weekday: undefined,
        intercalary: 'TestDay',
      };

      const result = formatter.formatWidget(intercalaryDate, 'mini');

      expect(mockFormatWithContext).toHaveBeenCalledWith(
        intercalaryDate,
        'INTERCALARY_MINI_FORMAT',
        'widgets.mini-intercalary'
      );
      expect(result).toBe('EXECUTED: INTERCALARY_MINI_FORMAT (widgets.mini-intercalary)');
    });

    it('should select -intercalary main widget format', () => {
      const intercalaryDate = {
        year: 2024,
        month: 0,
        day: 1,
        weekday: undefined,
        intercalary: 'TestDay',
      };

      const result = formatter.formatWidget(intercalaryDate, 'main');

      expect(mockFormatWithContext).toHaveBeenCalledWith(
        intercalaryDate,
        'INTERCALARY_MAIN_FORMAT',
        'widgets.main-intercalary'
      );
      expect(result).toBe('EXECUTED: INTERCALARY_MAIN_FORMAT (widgets.main-intercalary)');
    });

    it('should fall back to regular widget format when no -intercalary variant exists', () => {
      const intercalaryDate = {
        year: 2024,
        month: 0,
        day: 1,
        weekday: undefined,
        intercalary: 'TestDay',
      };

      const result = formatter.formatWidget(intercalaryDate, 'grid');

      // Should fall back to regular grid format since grid-intercalary doesn't exist
      expect(mockFormatWithContext).toHaveBeenCalledWith(
        intercalaryDate,
        'REGULAR_GRID_FORMAT',
        'widgets.grid'
      );
      expect(result).toBe('EXECUTED: REGULAR_GRID_FORMAT (widgets.grid)');
    });

    it('should use regular widget format for non-intercalary dates', () => {
      const regularDate = {
        year: 2024,
        month: 0,
        day: 15,
        weekday: 0,
        // no intercalary property
      };

      const result = formatter.formatWidget(regularDate, 'mini');

      // Should use regular format for non-intercalary dates
      expect(mockFormatWithContext).toHaveBeenCalledWith(
        regularDate,
        'REGULAR_MINI_FORMAT',
        'widgets.mini'
      );
      expect(result).toBe('EXECUTED: REGULAR_MINI_FORMAT (widgets.mini)');
    });
  });

  describe('Format selection priority', () => {
    it('should prefer -intercalary format over regular format for intercalary dates', () => {
      const intercalaryDate = {
        year: 2024,
        month: 0,
        day: 1,
        weekday: undefined,
        intercalary: 'TestDay',
      };

      // Call formatNamed for 'short' - should choose short-intercalary
      formatter.formatNamed(intercalaryDate, 'short');

      // Verify it chose the intercalary format, not the regular one
      expect(mockFormatWithContext).toHaveBeenCalledWith(
        intercalaryDate,
        'INTERCALARY_SHORT_FORMAT', // Not REGULAR_SHORT_FORMAT
        'short-intercalary',
        expect.any(Set)
      );
    });

    it('should handle empty intercalary name gracefully', () => {
      const intercalaryDateWithEmptyName = {
        year: 2024,
        month: 0,
        day: 1,
        weekday: undefined,
        intercalary: '', // Empty intercalary name
      };

      formatter.formatNamed(intercalaryDateWithEmptyName, 'short');

      // Should still try to use intercalary format even with empty name
      expect(mockFormatWithContext).toHaveBeenCalledWith(
        intercalaryDateWithEmptyName,
        'INTERCALARY_SHORT_FORMAT',
        'short-intercalary',
        expect.any(Set)
      );
    });

    it('should handle null intercalary value by using regular format', () => {
      const dateWithNullIntercalary = {
        year: 2024,
        month: 0,
        day: 1,
        weekday: undefined,
        intercalary: null, // Null intercalary
      };

      formatter.formatNamed(dateWithNullIntercalary, 'short');

      // Should use regular format since intercalary is falsy
      expect(mockFormatWithContext).toHaveBeenCalledWith(
        dateWithNullIntercalary,
        'REGULAR_SHORT_FORMAT',
        'short',
        expect.any(Set)
      );
    });
  });
});
