/**
 * DateFormatter Edge Cases Tests - TDD tests for critical issues found in PR #121
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateFormatter } from '../src/core/date-formatter';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Mock Handlebars for testing
const mockHandlebars = {
  compile: vi.fn(),
  registerHelper: vi.fn(),
};

// Ensure global Handlebars is available (mimicking Foundry)
global.Handlebars = mockHandlebars;

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
      hour: 14,
      minute: 30,
      second: 45,
    } as CalendarDate;

    formatter = new DateFormatter(mockCalendar);
  });

  describe('Helper Syntax Edge Cases', () => {
    it('should handle single-quote format parameters gracefully', () => {
      // RED: This should fail because single quotes are not valid Handlebars syntax
      const mockTemplate = vi.fn().mockImplementation(() => {
        throw new Error("Parse error: Expecting 'STRING', got 'INVALID'");
      });
      mockHandlebars.compile.mockReturnValue(mockTemplate);

      const invalidSyntax = "{{ss-hour format='pad'}}:{{ss-minute format='pad'}}";
      const result = formatter.format(mockDate, invalidSyntax);

      // Should fall back to basic format due to compilation error
      expect(result).toContain('2024');
      expect(result).toContain('1');
      expect(result).toContain('15');
    });

    it('should validate ss-stardate helper parameters', () => {
      // RED: This should fail if the helper doesn't support complex parameters
      const complexStardateFormat =
        "{{ss-stardate year prefix='47' baseYear=2370 dayOfYear=dayOfYear precision=1}}";

      // Mock a template that throws on complex parameter usage
      const mockTemplate = vi.fn().mockImplementation(() => {
        throw new Error('ss-stardate helper: Invalid parameter configuration');
      });
      mockHandlebars.compile.mockReturnValue(mockTemplate);

      const result = formatter.format(mockDate, complexStardateFormat);

      // Should fall back to basic format when helper fails
      expect(result).toContain('2024');
      expect(mockHandlebars.compile).toHaveBeenCalled();
    });
  });

  describe('Array Bounds Validation', () => {
    it('should handle invalid month indices gracefully', () => {
      // RED: This should fail without proper bounds checking
      const invalidDate = {
        ...mockDate,
        month: 99, // Invalid month index
      } as CalendarDate;

      // Access the calculateDayOfYear method indirectly through format
      const templateWithDayOfYear = 'Day {{dayOfYear}} of {{year}}';

      const mockTemplate = vi.fn().mockReturnValue('Day 45 of 2024');
      mockHandlebars.compile.mockReturnValue(mockTemplate);

      // This should not throw an error, but should handle the invalid month gracefully
      expect(() => {
        formatter.format(invalidDate, templateWithDayOfYear);
      }).not.toThrow();
    });

    it('should handle negative month indices gracefully', () => {
      // RED: This should fail without proper bounds checking
      const invalidDate = {
        ...mockDate,
        month: -1, // Invalid negative month index
      } as CalendarDate;

      const templateWithDayOfYear = 'Day {{dayOfYear}} of {{year}}';

      const mockTemplate = vi.fn().mockReturnValue('Day 1 of 2024');
      mockHandlebars.compile.mockReturnValue(mockTemplate);

      // This should not throw an error, but should handle the invalid month gracefully
      expect(() => {
        formatter.format(invalidDate, templateWithDayOfYear);
      }).not.toThrow();
    });

    it('should handle month index of zero gracefully', () => {
      // RED: This should fail without proper bounds checking (0-based vs 1-based confusion)
      const invalidDate = {
        ...mockDate,
        month: 0, // Invalid month index (should be 1-based)
      } as CalendarDate;

      const templateWithDayOfYear = 'Day {{dayOfYear}} of {{year}}';

      const mockTemplate = vi.fn().mockReturnValue('Day 1 of 2024');
      mockHandlebars.compile.mockReturnValue(mockTemplate);

      // This should not throw an error, but should handle the invalid month gracefully
      expect(() => {
        formatter.format(invalidDate, templateWithDayOfYear);
      }).not.toThrow();
    });
  });

  describe('Calendar JSON Helper Syntax Validation', () => {
    it('should detect and handle malformed helper syntax in real calendar files', () => {
      // RED: This simulates the actual malformed syntax found in gregorian-star-trek-variants.json
      const malformedTimeFormat =
        "{{ss-hour format='pad'}}:{{ss-minute format='pad'}}:{{ss-second format='pad'}} UTC";

      // Mock Handlebars compilation failure for single quotes
      mockHandlebars.compile.mockImplementation(template => {
        if (template.includes("format='pad'")) {
          throw new Error("Parse error on line 1: Expecting 'STRING', got 'INVALID'");
        }
        return vi.fn().mockReturnValue('14:30:45 UTC');
      });

      const result = formatter.format(mockDate, malformedTimeFormat);

      // Should fall back to basic format due to syntax error
      expect(result).toContain('2024');
      expect(mockHandlebars.compile).toHaveBeenCalled();
    });
  });
});
