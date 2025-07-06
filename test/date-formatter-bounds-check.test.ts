/**
 * DateFormatter Array Bounds Test - TDD test to expose the calculateDayOfYear bounds issue
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateFormatter } from '../src/core/date-formatter';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Use REAL Handlebars for date formatter testing (following star-trek test pattern)
import Handlebars from 'handlebars';
global.Handlebars = Handlebars;

describe('DateFormatter Array Bounds Check', () => {
  let formatter: DateFormatter;
  let mockCalendar: SeasonsStarsCalendar;

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

    formatter = new DateFormatter(mockCalendar);
  });

  it('should fail when calculateDayOfYear accesses months array out of bounds', () => {
    // Create a date with month index that's out of bounds for our 2-month calendar
    const outOfBoundsDate = {
      year: 2024,
      month: 5, // This is out of bounds for a 2-month calendar (months[4] doesn't exist)
      day: 15,
      hour: 14,
      minute: 30,
      second: 45,
    } as CalendarDate;

    // Create a template that will trigger calculateDayOfYear
    const templateNeedingDayOfYear = 'Day {{dayOfYear}} of {{year}}';

    // This call will trigger prepareTemplateContext which calls calculateDayOfYear
    const result = formatter.format(outOfBoundsDate, templateNeedingDayOfYear);

    // Extract the dayOfYear from the result
    const match = result.match(/Day (\d+) of/);
    const dayOfYear = match ? parseInt(match[1]) : NaN;

    // This test should expose that calculateDayOfYear doesn't handle bounds properly
    // The current implementation will access months[4] which is undefined
    // and could cause issues when trying to read month.days
    console.log('Actual dayOfYear calculated:', dayOfYear);
    console.log('Expected: should be handled gracefully, not undefined or NaN');

    // The dayOfYear should be a valid number, not NaN or undefined
    expect(dayOfYear).toBeDefined();
    expect(typeof dayOfYear).toBe('number');
    expect(Number.isNaN(dayOfYear)).toBe(false);
  });

  it('should fail when month index is negative', () => {
    const negativeMonthDate = {
      year: 2024,
      month: -1, // Negative month
      day: 15,
      hour: 14,
      minute: 30,
      second: 45,
    } as CalendarDate;

    const templateNeedingDayOfYear = 'Day {{dayOfYear}} of {{year}}';

    const result = formatter.format(negativeMonthDate, templateNeedingDayOfYear);

    // Extract the dayOfYear from the result
    const match = result.match(/Day (\d+) of/);
    const dayOfYear = match ? parseInt(match[1]) : NaN;

    // This should expose the issue with negative indices
    console.log('Negative month dayOfYear:', dayOfYear);

    expect(dayOfYear).toBeDefined();
    expect(typeof dayOfYear).toBe('number');
    expect(Number.isNaN(dayOfYear)).toBe(false);
    expect(dayOfYear).toBeGreaterThan(0); // Should be positive
  });

  it('should fail when month index is zero (0-based vs 1-based confusion)', () => {
    const zeroMonthDate = {
      year: 2024,
      month: 0, // Zero month (should be 1-based)
      day: 15,
      hour: 14,
      minute: 30,
      second: 45,
    } as CalendarDate;

    const templateNeedingDayOfYear = 'Day {{dayOfYear}} of {{year}}';

    const result = formatter.format(zeroMonthDate, templateNeedingDayOfYear);

    // Extract the dayOfYear from the result
    const match = result.match(/Day (\d+) of/);
    const dayOfYear = match ? parseInt(match[1]) : NaN;

    // This should expose the 0-based vs 1-based confusion
    console.log('Zero month dayOfYear:', dayOfYear);

    expect(dayOfYear).toBeDefined();
    expect(typeof dayOfYear).toBe('number');
    expect(Number.isNaN(dayOfYear)).toBe(false);
    expect(dayOfYear).toBeGreaterThan(0); // Should be positive
  });
});
