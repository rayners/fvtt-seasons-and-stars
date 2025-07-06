/**
 * Test that Handlebars helpers can use both explicit parameters and template context
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Handlebars from 'handlebars';
import { DateFormatter } from '../src/core/date-formatter';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Use REAL Handlebars for helper context testing
global.Handlebars = Handlebars;

describe('Helper Context Usage', () => {
  let formatter: DateFormatter;
  let mockCalendar: SeasonsStarsCalendar;
  let mockDate: CalendarDate;

  beforeEach(() => {
    // Reset Handlebars helpers before each test
    DateFormatter.resetHelpersForTesting();

    mockCalendar = {
      id: 'test-calendar',
      months: [{ name: 'January', abbreviation: 'Jan', days: 31 }],
      weekdays: [{ name: 'Sunday', abbreviation: 'Sun' }],
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

  it('should use context for time helpers without explicit parameters', () => {
    // Test template that uses context-based helpers (no explicit parameters)
    const template =
      '{{ss-hour format="pad"}}:{{ss-minute format="pad"}}:{{ss-second format="pad"}}';

    // Act - formatter should use real Handlebars compilation and execution
    const result = formatter.format(mockDate, template);

    // Assert - should produce the formatted time using context data
    expect(result).toBe('14:30:45');
  });

  it('should still support explicit parameter style for backward compatibility', () => {
    // Test template that uses explicit parameter values instead of context
    const template =
      '{{ss-hour 9 format="pad"}}:{{ss-minute 5 format="pad"}}:{{ss-second 0 format="pad"}}';

    // Act - should use the explicit parameter values, not context
    const result = formatter.format(mockDate, template);

    // Assert - should use the explicit values (9:05:00) not context values (14:30:45)
    expect(result).toBe('09:05:00');
  });

  it('should handle context-based helpers when time is undefined', () => {
    // Test with a date that has no time component
    const dateWithoutTime = { ...mockDate, time: undefined };
    const template =
      '{{ss-hour format="pad"}}:{{ss-minute format="pad"}}:{{ss-second format="pad"}}';

    // Act - helpers should handle undefined time gracefully
    const result = formatter.format(dateWithoutTime as CalendarDate, template);

    // Assert - should default to 00:00:00 when time is undefined
    expect(result).toBe('00:00:00');
  });
});
