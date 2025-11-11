/**
 * Intercalary Format Regression Test Suite
 *
 * This suite consolidates regression tests related to format handling for intercalary days.
 * It covers format recursion, format resolution logic, and template variable availability.
 *
 * Sources:
 * - intercalary-format-recursion.test.ts
 * - intercalary-format-resolution.test.ts
 * - intercalary-template-variable.test.ts
 */

import { describe, it, test, expect, beforeEach, vi } from 'vitest';
import Handlebars from 'handlebars';
import { DateFormatter } from '../../../src/core/date-formatter';
import type {
  SeasonsStarsCalendar,
  CalendarDate as ICalendarDate,
} from '../../../src/types/calendar';

// Use REAL Handlebars for template execution
(global as any).Handlebars = Handlebars;

describe('Intercalary Format Regression Tests', () => {
  describe('Format Recursion', () => {
    it('should fallback to base format when intercalary format references it', () => {
      DateFormatter.resetHelpersForTesting();

      const calendar: SeasonsStarsCalendar = {
        id: 'test',
        name: 'Test',
        months: [{ name: 'Month', days: 30 }],
        weekdays: [{ name: 'Day' }],
        year: { prefix: '', suffix: '' },
        time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
        dateFormats: {
          short: '{{ss-day}}',
          'short-intercalary': '{{ss-dateFmt "short"}}',
        },
      };

      const formatter = new DateFormatter(calendar);

      const intercalaryDate: ICalendarDate = {
        year: 1,
        month: 1,
        day: 1,
        weekday: 0,
        intercalary: 'Festival',
      };

      const result = formatter.formatNamed(intercalaryDate, 'short');
      expect(result).toBe('1');
    });
  });

  describe('Format Resolution Logic', () => {
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
      mockFormatWithContext.mockImplementation(
        (date: any, template: string, displayName: string) => {
          return `EXECUTED: ${template} (${displayName})`;
        }
      );
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

  describe('Template Variable Availability', () => {
    let formatter: DateFormatter;
    let calendar: SeasonsStarsCalendar;

    beforeEach(() => {
      DateFormatter.resetHelpersForTesting();

      calendar = {
        id: 'test-intercalary-variable',
        name: 'Test Calendar',
        label: 'Test Calendar',
        months: [
          { name: 'Month1', abbreviation: 'M1', days: 30 },
          { name: 'Month2', abbreviation: 'M2', days: 30 },
        ],
        weekdays: [
          { name: 'Day1', abbreviation: 'D1' },
          { name: 'Day2', abbreviation: 'D2' },
        ],
        intercalary: [
          {
            name: 'Midwinter Festival',
            after: 'Month1',
            days: 1,
          },
          {
            name: 'Midsummer Celebration',
            after: 'Month2',
            days: 1,
          },
        ],
        yearLength: 365,
        weekLength: 2,
        epoch: { year: 1, month: 1, day: 1 },
        year: { prefix: '', suffix: '' },
        time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
      } as SeasonsStarsCalendar;

      formatter = new DateFormatter(calendar);
    });

    test('should make {{intercalary}} variable available in template context', () => {
      // Arrange - intercalary date with name
      const intercalaryDate = {
        year: 2024,
        month: 0,
        day: 1,
        weekday: 0,
        intercalary: 'Midwinter Festival',
      };

      // Act - format with simple {{intercalary}} template
      const result = formatter.format(intercalaryDate, '{{intercalary}}');

      // Assert - should display the intercalary name, not empty string
      expect(result).toBe('Midwinter Festival');
    });

    test('should support {{intercalary}} in complex templates', () => {
      // Arrange - intercalary date
      const intercalaryDate = {
        year: 2024,
        month: 0,
        day: 1,
        weekday: 0,
        intercalary: 'Midwinter Festival',
      };

      // Act - format with complex template combining intercalary with other variables
      const result = formatter.format(intercalaryDate, '{{intercalary}}, {{year}}');

      // Assert - should display full formatted string
      expect(result).toBe('Midwinter Festival, 2024');
    });

    test('should support Roshar-style format: {{intercalary}} {{ss-day}}', () => {
      // Arrange - intercalary date with day number (Roshar has 10-day intercalary periods)
      const intercalaryDate = {
        year: 2024,
        month: 0,
        day: 5,
        weekday: 0,
        intercalary: 'Lightweeks',
      };

      // Act - format using Roshar pattern from roshar.json
      const result = formatter.format(intercalaryDate, '{{intercalary}} {{ss-day}}');

      // Assert - should display intercalary name with day number
      expect(result).toBe('Lightweeks 5');
    });

    test('should support formatNamed with {{intercalary}} in named formats', () => {
      // Arrange - calendar with named format using {{intercalary}}
      const calendarWithIntercalaryFormat: SeasonsStarsCalendar = {
        ...calendar,
        dateFormats: {
          'short-intercalary': '{{intercalary}}, {{year}}',
          'long-intercalary': '{{intercalary}} ({{year}})',
        },
      };

      formatter = new DateFormatter(calendarWithIntercalaryFormat);

      const intercalaryDate = {
        year: 2024,
        month: 0,
        day: 1,
        weekday: 0,
        intercalary: 'Midsummer Celebration',
      };

      // Act - format using named format
      const shortResult = formatter.formatNamed(intercalaryDate, 'short');
      const longResult = formatter.formatNamed(intercalaryDate, 'long');

      // Assert
      expect(shortResult).toBe('Midsummer Celebration, 2024');
      expect(longResult).toBe('Midsummer Celebration (2024)');
    });

    test('should support formatWidget with {{intercalary}} in widget formats', () => {
      // Arrange - calendar with widget formats using {{intercalary}}
      const calendarWithWidgetFormats: SeasonsStarsCalendar = {
        ...calendar,
        dateFormats: {
          widgets: {
            'mini-intercalary': '{{intercalary}}',
            'main-intercalary': '{{intercalary}}, {{year}}',
            'grid-intercalary': '{{intercalary}}',
          },
        },
      };

      formatter = new DateFormatter(calendarWithWidgetFormats);

      const intercalaryDate = {
        year: 2024,
        month: 0,
        day: 1,
        weekday: 0,
        intercalary: 'Midwinter Festival',
      };

      // Act - format using widget formats
      const miniResult = formatter.formatWidget(intercalaryDate, 'mini');
      const mainResult = formatter.formatWidget(intercalaryDate, 'main');
      const gridResult = formatter.formatWidget(intercalaryDate, 'grid');

      // Assert
      expect(miniResult).toBe('Midwinter Festival');
      expect(mainResult).toBe('Midwinter Festival, 2024');
      expect(gridResult).toBe('Midwinter Festival');
    });

    test('should handle empty intercalary name', () => {
      // Arrange - intercalary date with empty string name
      const intercalaryDate = {
        year: 2024,
        month: 0,
        day: 1,
        weekday: 0,
        intercalary: '',
      };

      // Act
      const result = formatter.format(intercalaryDate, '{{intercalary}}');

      // Assert - empty string should be preserved
      expect(result).toBe('');
    });

    test('should handle non-intercalary date with {{intercalary}} template', () => {
      // Arrange - regular date without intercalary property
      const regularDate = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 0,
      };

      // Act
      const result = formatter.format(regularDate, 'Day: {{intercalary}}{{ss-day}}');

      // Assert - {{intercalary}} should be empty/undefined for regular dates
      expect(result).toBe('Day: 15');
    });

    test('should support Traveller Imperial format: {{intercalary}}/{{year}}', () => {
      // Arrange - intercalary date (from traveller-imperial.json)
      const intercalaryDate = {
        year: 1105,
        month: 0,
        day: 1,
        weekday: 0,
        intercalary: 'Holiday',
      };

      // Act - format using Traveller Imperial pattern
      const result = formatter.format(intercalaryDate, '{{intercalary}}/{{year}}');

      // Assert
      expect(result).toBe('Holiday/1105');
    });

    test('should support Coriolis format: {{intercalary}}/CC{{year}}', () => {
      // Arrange - intercalary date (from coriolis-third-horizon.json)
      const intercalaryDate = {
        year: 63,
        month: 0,
        day: 1,
        weekday: 0,
        intercalary: 'Pilgrimage Day',
      };

      // Act - format using Coriolis pattern
      const result = formatter.format(intercalaryDate, '{{intercalary}}/CC{{year}}');

      // Assert
      expect(result).toBe('Pilgrimage Day/CC63');
    });

    test('should support mixing {{intercalary}} with helper functions', () => {
      // Arrange
      const intercalaryDate = {
        year: 2024,
        month: 0,
        day: 3,
        weekday: 0,
        intercalary: 'Festival Week',
      };

      // Act - mix intercalary with ss-day helper
      const result = formatter.format(
        intercalaryDate,
        '{{intercalary}}, Day {{ss-day format="ordinal"}}'
      );

      // Assert
      expect(result).toBe('Festival Week, Day 3rd');
    });
  });
});
