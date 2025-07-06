/**
 * DateFormatter Edge Cases Tests - TDD tests for critical issues found in PR #121
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateFormatter } from '../src/core/date-formatter';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Use REAL Handlebars for date formatter testing (following star-trek test pattern)
import Handlebars from 'handlebars';
global.Handlebars = Handlebars;

describe('DateFormatter Edge Cases', () => {
  let formatter: DateFormatter;
  let mockCalendar: SeasonsStarsCalendar;
  let mockDate: CalendarDate;

  beforeEach(() => {
    vi.clearAllMocks();
    DateFormatter.resetHelpersForTesting();

    mockCalendar = {
      id: 'test-calendar',
      name: 'Test Calendar',
      months: [
        { name: 'January', abbreviation: 'Jan', days: 31 },
        { name: 'February', abbreviation: 'Feb', days: 28 },
      ],
      weekdays: [
        { name: 'Sunday', abbreviation: 'Sun' },
        { name: 'Monday', abbreviation: 'Mon' },
      ],
      year: { prefix: '', suffix: '' },
      time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
    } as SeasonsStarsCalendar;

    mockDate = {
      year: 2024,
      month: 1,
      day: 15,
      weekday: 0,
      time: { hour: 14, minute: 30, second: 45 },
    } as CalendarDate;

    formatter = new DateFormatter(mockCalendar);
  });

  describe('Helper Syntax Edge Cases', () => {
    it('should handle single-quote format parameters gracefully', () => {
      // Test actual Handlebars compilation error with unclosed quote
      const invalidSyntax = "{{ss-hour format='pad}}:{{ss-minute format='pad'}}";
      const result = formatter.format(mockDate, invalidSyntax);

      // Should fall back to basic format due to compilation error
      expect(result).toContain('2024');
      expect(result).toContain('1');
      expect(result).toContain('15');
    });

    it('should validate ss-stardate helper parameters', () => {
      // Test complex stardate format with invalid syntax (unclosed quote)
      const complexStardateFormat =
        "{{ss-stardate year prefix='47 baseYear=2370 dayOfYear=dayOfYear precision=1}}";

      const result = formatter.format(mockDate, complexStardateFormat);

      // Should fall back to basic format when compilation fails due to syntax error
      expect(result).toContain('2024');
    });
  });

  describe('Array Bounds Validation', () => {
    it('should handle invalid month indices gracefully', () => {
      // Test invalid month index bounds checking
      const invalidDate = {
        ...mockDate,
        month: 99, // Invalid month index
      } as CalendarDate;

      // Access the calculateDayOfYear method indirectly through format
      const templateWithDayOfYear = 'Day {{dayOfYear}} of {{year}}';

      // This should not throw an error, but should handle the invalid month gracefully
      expect(() => {
        formatter.format(invalidDate, templateWithDayOfYear);
      }).not.toThrow();
    });

    it('should handle negative month indices gracefully', () => {
      // Test negative month index bounds checking
      const invalidDate = {
        ...mockDate,
        month: -1, // Invalid negative month index
      } as CalendarDate;

      const templateWithDayOfYear = 'Day {{dayOfYear}} of {{year}}';

      // This should not throw an error, but should handle the invalid month gracefully
      expect(() => {
        formatter.format(invalidDate, templateWithDayOfYear);
      }).not.toThrow();
    });

    it('should handle month index of zero gracefully', () => {
      // Test zero month index bounds checking (0-based vs 1-based confusion)
      const invalidDate = {
        ...mockDate,
        month: 0, // Invalid month index (should be 1-based)
      } as CalendarDate;

      const templateWithDayOfYear = 'Day {{dayOfYear}} of {{year}}';

      // This should not throw an error, but should handle the invalid month gracefully
      expect(() => {
        formatter.format(invalidDate, templateWithDayOfYear);
      }).not.toThrow();
    });
  });

  describe('Calendar JSON Helper Syntax Validation', () => {
    it('should detect and handle malformed helper syntax in real calendar files', () => {
      // Test malformed syntax with unclosed quote
      const malformedTimeFormat =
        "{{ss-hour format='pad}}:{{ss-minute format='pad'}}:{{ss-second format='pad'}} UTC";

      const result = formatter.format(mockDate, malformedTimeFormat);

      // Should fall back to basic format due to syntax error
      expect(result).toContain('2024');
    });
  });
});
