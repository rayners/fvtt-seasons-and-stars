/**
 * Test that Handlebars helpers can use both explicit parameters and template context
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateFormatter } from '../src/core/date-formatter';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

describe('Helper Context Usage', () => {
  let formatter: DateFormatter;
  let mockCalendar: SeasonsStarsCalendar;
  let mockDate: CalendarDate;

  beforeEach(() => {
    mockCalendar = {
      id: 'test-calendar',
      months: [{ name: 'January', days: 31 }],
      weekdays: [{ name: 'Sunday' }],
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
    // Arrange
    const template =
      '{{ss-hour format="pad"}}:{{ss-minute format="pad"}}:{{ss-second format="pad"}}';
    const expectedOutput = '14:30:45';

    const mockCompiledTemplate = vi.fn().mockReturnValue(expectedOutput);
    global.Handlebars.compile = vi.fn().mockReturnValue(mockCompiledTemplate);

    // Act
    const result = formatter.format(mockDate, template);

    // Assert
    expect(result).toBe(expectedOutput);
    expect(global.Handlebars.compile).toHaveBeenCalledWith(template);
    expect(mockCompiledTemplate).toHaveBeenCalledWith({
      year: 2024,
      month: 1,
      day: 15,
      weekday: 0,
      hour: 14,
      minute: 30,
      second: 45,
      dayOfYear: 15,
    });
  });

  it('should still support explicit parameter style for backward compatibility', () => {
    // Arrange
    const template =
      '{{ss-hour 9 format="pad"}}:{{ss-minute 5 format="pad"}}:{{ss-second 0 format="pad"}}';
    const expectedOutput = '09:05:00';

    const mockCompiledTemplate = vi.fn().mockReturnValue(expectedOutput);
    global.Handlebars.compile = vi.fn().mockReturnValue(mockCompiledTemplate);

    // Act
    const result = formatter.format(mockDate, template);

    // Assert
    expect(result).toBe(expectedOutput);
  });

  it('should handle context-based helpers when time is undefined', () => {
    // Arrange
    const dateWithoutTime = { ...mockDate, time: undefined };
    const template =
      '{{ss-hour format="pad"}}:{{ss-minute format="pad"}}:{{ss-second format="pad"}}';
    const expectedOutput = '00:00:00';

    const mockCompiledTemplate = vi.fn().mockReturnValue(expectedOutput);
    global.Handlebars.compile = vi.fn().mockReturnValue(mockCompiledTemplate);

    // Act
    const result = formatter.format(dateWithoutTime as CalendarDate, template);

    // Assert
    expect(result).toBe(expectedOutput);
    expect(mockCompiledTemplate).toHaveBeenCalledWith({
      year: 2024,
      month: 1,
      day: 15,
      weekday: 0,
      hour: undefined,
      minute: undefined,
      second: undefined,
      dayOfYear: 15,
    });
  });
});
