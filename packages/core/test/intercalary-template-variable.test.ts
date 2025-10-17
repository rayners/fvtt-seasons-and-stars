/**
 * Intercalary Template Variable Test Suite
 *
 * Tests that {{intercalary}} template variable is properly available in Handlebars context.
 * This test suite uses REAL Handlebars template execution to verify the bug and fix.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { DateFormatter } from '../src/core/date-formatter';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Use REAL Handlebars for proper template execution testing
import Handlebars from 'handlebars';
global.Handlebars = Handlebars;

describe('Intercalary Template Variable Availability', () => {
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
