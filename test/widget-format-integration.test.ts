/**
 * Widget Format Integration Tests
 * Tests the formatWidget functionality across all widget types for Phase 3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DateFormatter } from '../src/core/date-formatter';
import type { SeasonsStarsCalendar, ICalendarDate } from '../src/types/calendar';

describe('Widget Format Integration Tests', () => {
  let mockCalendar: SeasonsStarsCalendar;
  let formatter: DateFormatter;
  let testDate: ICalendarDate;

  beforeEach(() => {
    // Create comprehensive test calendar with all widget formats
    mockCalendar = {
      id: 'test-widget-calendar',
      translations: {
        en: {
          label: 'Test Widget Calendar',
          description: 'Test calendar for widget format integration',
          setting: 'Test',
        },
      },
      year: {
        epoch: 0,
        currentYear: 2024,
        prefix: '',
        suffix: '',
        startDay: 0,
      },
      leapYear: { rule: 'none' },
      months: [
        { name: 'January', abbreviation: 'Jan', days: 31, description: 'First month' },
        { name: 'February', abbreviation: 'Feb', days: 28, description: 'Second month' },
        { name: 'March', abbreviation: 'Mar', days: 31, description: 'Third month' },
      ],
      weekdays: [
        { name: 'Monday', abbreviation: 'Mon', description: 'First day' },
        { name: 'Tuesday', abbreviation: 'Tue', description: 'Second day' },
        { name: 'Wednesday', abbreviation: 'Wed', description: 'Third day' },
      ],
      intercalary: [],
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      },
      dateFormats: {
        widgets: {
          mini: '{{ss-month:abbr}} {{ss-day}}',
          main: '{{ss-weekday:abbr}}, {{ss-day:ordinal}} {{ss-month:name}}',
          grid: '{{ss-day}}',
        },
        // Add other format categories for completeness
        iso: '{{year}}-{{ss-month:pad}}-{{ss-day:pad}}',
        short: '{{ss-month:abbr}} {{ss-day}}',
        long: '{{ss-weekday:name}}, {{ss-day:ordinal}} {{ss-month:name}} {{year}}',
      },
    };

    formatter = new DateFormatter(mockCalendar);

    testDate = {
      year: 2024,
      month: 1, // January (1-based)
      day: 15,
    };
  });

  describe('Widget Format Types', () => {
    it('should format mini widget correctly', () => {
      const result = formatter.formatWidget(testDate, 'mini');
      expect(result).toBe('Jan 15');
    });

    it('should format main widget correctly', () => {
      const result = formatter.formatWidget(testDate, 'main');
      expect(result).toBe('Mon, 15th January');
    });

    it('should format grid widget correctly', () => {
      const result = formatter.formatWidget(testDate, 'grid');
      expect(result).toBe('15');
    });
  });

  describe('Widget Format Edge Cases', () => {
    it('should handle missing widget formats gracefully', () => {
      // Create calendar without widget formats
      const calendarNoWidgets = {
        ...mockCalendar,
        dateFormats: {
          iso: '{{year}}-{{ss-month:pad}}-{{ss-day:pad}}',
          // No widgets section
        },
      };

      const formatterNoWidgets = new DateFormatter(calendarNoWidgets);

      // Should fall back to basic format or handle gracefully
      expect(() => {
        formatterNoWidgets.formatWidget(testDate, 'mini');
      }).not.toThrow();
    });

    it('should handle invalid widget type gracefully', () => {
      expect(() => {
        formatter.formatWidget(testDate, 'invalid' as any);
      }).not.toThrow();
    });

    it('should handle empty widget format gracefully', () => {
      const calendarEmptyWidget = {
        ...mockCalendar,
        dateFormats: {
          ...mockCalendar.dateFormats,
          widgets: {
            mini: '', // Empty format
            main: '{{ss-weekday:abbr}}, {{ss-day:ordinal}} {{ss-month:name}}',
            grid: '{{ss-day}}',
          },
        },
      };

      const formatterEmpty = new DateFormatter(calendarEmptyWidget);
      expect(() => {
        formatterEmpty.formatWidget(testDate, 'mini');
      }).not.toThrow();
    });
  });

  describe('Widget Format Calendar Switching', () => {
    it('should handle calendar switching with different widget formats', () => {
      // Test switching to a calendar with different format patterns
      const alternateCalendar: SeasonsStarsCalendar = {
        ...mockCalendar,
        id: 'alternate-test-calendar',
        dateFormats: {
          widgets: {
            mini: '{{ss-day}}/{{ss-month}}',
            main: '{{ss-month:name}} {{ss-day}}, {{year}}',
            grid: '{{ss-day:pad}}',
          },
          iso: '{{year}}-{{ss-month:pad}}-{{ss-day:pad}}',
        },
      };

      const alternateFormatter = new DateFormatter(alternateCalendar);

      expect(alternateFormatter.formatWidget(testDate, 'mini')).toBe('15/1');
      expect(alternateFormatter.formatWidget(testDate, 'main')).toBe('January 15, 2024');
      expect(alternateFormatter.formatWidget(testDate, 'grid')).toBe('15');
    });

    it('should maintain widget format consistency across date changes', () => {
      const dates = [
        { year: 2024, month: 1, day: 1 },
        { year: 2024, month: 2, day: 15 },
        { year: 2024, month: 3, day: 31 },
      ];

      dates.forEach(date => {
        expect(() => {
          formatter.formatWidget(date, 'mini');
          formatter.formatWidget(date, 'main');
          formatter.formatWidget(date, 'grid');
        }).not.toThrow();
      });
    });
  });

  describe('Widget Format Helper Integration', () => {
    it('should use proper helper syntax with ss- namespace', () => {
      // Verify all widget formats use namespaced helpers
      const miniFormat = mockCalendar.dateFormats.widgets!.mini;
      const mainFormat = mockCalendar.dateFormats.widgets!.main;
      const gridFormat = mockCalendar.dateFormats.widgets!.grid;

      // All helpers should be namespaced with 'ss-'
      expect(miniFormat).toContain('ss-month');
      expect(miniFormat).toContain('ss-day');
      expect(mainFormat).toContain('ss-weekday');
      expect(mainFormat).toContain('ss-day');
      expect(mainFormat).toContain('ss-month');
      expect(gridFormat).toContain('ss-day');
    });

    it('should handle complex helper combinations in widget formats', () => {
      // Test calendar with complex widget format patterns
      const complexCalendar = {
        ...mockCalendar,
        dateFormats: {
          ...mockCalendar.dateFormats,
          widgets: {
            mini: '{{ss-month:abbr}} {{ss-day}}',
            main: '{{ss-weekday:abbr}}, {{ss-day:ordinal}} {{ss-month:name}} ({{ss-dateFmt:iso}})',
            grid: '{{ss-day:pad}}',
          },
        },
      };

      const complexFormatter = new DateFormatter(complexCalendar);

      expect(() => {
        complexFormatter.formatWidget(testDate, 'mini');
        complexFormatter.formatWidget(testDate, 'main');
        complexFormatter.formatWidget(testDate, 'grid');
      }).not.toThrow();
    });
  });

  describe('Cross-Widget Format Consistency', () => {
    it('should produce consistent results for same date across all widget types', () => {
      const sameDate = { year: 2024, month: 2, day: 29 }; // Potential leap year edge case

      const miniResult = formatter.formatWidget(sameDate, 'mini');
      const mainResult = formatter.formatWidget(sameDate, 'main');
      const gridResult = formatter.formatWidget(sameDate, 'grid');

      // Results should be consistent (not empty, not throw errors)
      expect(typeof miniResult).toBe('string');
      expect(typeof mainResult).toBe('string');
      expect(typeof gridResult).toBe('string');

      expect(miniResult.length).toBeGreaterThan(0);
      expect(mainResult.length).toBeGreaterThan(0);
      expect(gridResult.length).toBeGreaterThan(0);
    });

    it('should handle month/day boundary conditions across all widget formats', () => {
      const boundaryDates = [
        { year: 2024, month: 1, day: 1 }, // Start of year
        { year: 2024, month: 1, day: 31 }, // End of month
        { year: 2024, month: 12, day: 1 }, // Start of last month (if it exists)
        { year: 2024, month: 3, day: 31 }, // End of March
      ];

      boundaryDates.forEach(date => {
        expect(() => {
          const mini = formatter.formatWidget(date, 'mini');
          const main = formatter.formatWidget(date, 'main');
          const grid = formatter.formatWidget(date, 'grid');

          // Verify all formats produce non-empty strings
          expect(mini).toBeTruthy();
          expect(main).toBeTruthy();
          expect(grid).toBeTruthy();
        }).not.toThrow();
      });
    });
  });
});
