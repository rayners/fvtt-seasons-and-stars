/**
 * Calendar JSON Syntax Validation - TDD test for single quote syntax issues
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Handlebars from 'handlebars';
import { DateFormatter } from '../src/core/date-formatter';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Use REAL Handlebars for syntax validation testing
global.Handlebars = Handlebars;

describe('Calendar JSON Syntax Validation', () => {
  let formatter: DateFormatter;
  let mockCalendar: SeasonsStarsCalendar;
  let mockDate: CalendarDate;

  beforeEach(() => {
    // Reset Handlebars helpers before each test
    DateFormatter.resetHelpersForTesting();

    mockCalendar = {
      id: 'test-calendar',
      name: 'Test Calendar',
      months: [{ name: 'January', abbreviation: 'Jan', days: 31 }],
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

  describe('Template Syntax Validation', () => {
    it('should handle invalid helper syntax gracefully', () => {
      // Test with invalid helper syntax that should cause compilation to fail
      const invalidTemplate = '{{ss-hour format="unclosed-quote}}:{{ss-minute format="pad"}}';

      // This should handle the error gracefully and fall back to basic format
      const result = formatter.format(mockDate, invalidTemplate);

      // Should fall back to basic format when template compilation fails
      expect(result).toContain('Sunday'); // Basic format includes weekday
      expect(result).toContain('15th'); // Basic format includes ordinal
      expect(result).toContain('January'); // Basic format includes month name
      expect(result).toContain('2024'); // Basic format includes year
    });

    it('should succeed with correct double quote syntax', () => {
      // GREEN: This should work with proper double quotes and correct helper syntax
      const validTemplate =
        '{{ss-hour format="pad"}}:{{ss-minute format="pad"}}:{{ss-second format="pad"}} UTC';

      const result = formatter.format(mockDate, validTemplate);

      expect(result).toBe('14:30:45 UTC');
    });

    it('should handle missing helper parameters gracefully', () => {
      // Test template with old-style helper syntax (missing required parameters)
      const oldStyleTemplate = '{{ss-hour:pad}}:{{ss-minute:pad}}:{{ss-second:pad}} UTC';

      // This should fall back to basic format since helpers won't find their parameters
      const result = formatter.format(mockDate, oldStyleTemplate);

      // Should fall back to basic format
      expect(result).toContain('Sunday');
      expect(result).toContain('15th');
      expect(result).toContain('January');
    });
  });

  describe('Real Calendar File Validation', () => {
    it('should handle single quote syntax errors in templates', () => {
      // Test calendar with actually problematic syntax (unclosed quote)
      const calendarWithSingleQuotes: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          // This would cause a real Handlebars compilation error (unclosed quote)
          'bad-time':
            "{{ss-hour format='pad}}:{{ss-minute format='pad'}}:{{ss-second format='pad'}} UTC",
        },
      };

      const formatterWithBadCalendar = new DateFormatter(calendarWithSingleQuotes);

      // Should handle the compilation error gracefully and fall back to basic format
      const result = formatterWithBadCalendar.formatNamed(mockDate, 'bad-time');

      // Should fall back to basic format due to syntax error
      expect(result).toContain('Sunday'); // Basic format includes weekday
      expect(result).toContain('15th'); // Basic format includes ordinal
      expect(result).toContain('January'); // Basic format includes month
      expect(result).toContain('2024'); // Basic format includes year
    });

    it('should successfully compile corrected double quote syntax', () => {
      // Test calendar with correct double quote syntax (after fix)
      const calendarWithDoubleQuotes: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          // This should compile and execute successfully
          'good-time':
            '{{ss-hour format="pad"}}:{{ss-minute format="pad"}}:{{ss-second format="pad"}} UTC',
        },
      };

      const formatterWithGoodCalendar = new DateFormatter(calendarWithDoubleQuotes);

      // Should compile and execute the template successfully
      const result = formatterWithGoodCalendar.formatNamed(mockDate, 'good-time');

      // Should produce the expected formatted result
      expect(result).toBe('14:30:45 UTC');
    });
  });
});
