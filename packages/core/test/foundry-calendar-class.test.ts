/**
 * Tests for Foundry Calendar Class (CalendarData Extension)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SeasonsStarsFoundryCalendar } from '../src/core/foundry-calendar-class';
import { CalendarManager } from '../src/core/calendar-manager';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Mock Logger to avoid console output during tests
vi.mock('../src/core/logger', () => ({
  Logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('SeasonsStarsFoundryCalendar (CalendarData Extension)', () => {
  let foundryCalendar: SeasonsStarsFoundryCalendar;
  let manager: CalendarManager;
  let mockCalendar: SeasonsStarsCalendar;

  beforeEach(() => {
    foundryCalendar = new SeasonsStarsFoundryCalendar();

    // Create a simple test calendar
    mockCalendar = {
      id: 'test-calendar',
      translations: {
        en: {
          label: 'Test Calendar',
        },
      },
      year: {
        epoch: 0,
        currentYear: 1,
        prefix: '',
        suffix: '',
        startDay: 0,
      },
      leapYear: {
        rule: 'none',
      },
      months: [
        { name: 'Month1', days: 30 },
        { name: 'Month2', days: 30 },
        { name: 'Month3', days: 30 },
      ],
      weekdays: [{ name: 'Day1' }, { name: 'Day2' }, { name: 'Day3' }],
      intercalary: [],
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      },
    };

    // Create manager with mock calendar
    manager = new CalendarManager();
    manager.loadCalendar(mockCalendar);
    manager.setActiveCalendarSync(mockCalendar.id);
  });

  describe('setManager', () => {
    it('should set the manager reference', () => {
      foundryCalendar.setManager(manager);

      // Verify manager is set by testing a method that uses it
      const components = foundryCalendar.timeToComponents(0);
      expect(components.year).toBe(0);
      expect(components.month).toBe(1);
      expect(components.day).toBe(1);
    });
  });

  describe('timeToComponents', () => {
    it('should return default components when manager is not set', () => {
      const result = foundryCalendar.timeToComponents(0);

      expect(result.year).toBe(0);
      expect(result.month).toBe(1);
      expect(result.day).toBe(1);
      expect(result.hour).toBe(0);
      expect(result.minute).toBe(0);
      expect(result.second).toBe(0);
    });

    it('should convert world time to components when manager is set', () => {
      foundryCalendar.setManager(manager);

      const result = foundryCalendar.timeToComponents(0);

      expect(result.year).toBe(0);
      expect(result.month).toBe(1);
      expect(result.day).toBe(1);
      expect(result.hour).toBe(0);
      expect(result.minute).toBe(0);
      expect(result.second).toBe(0);
    });

    it('should handle non-zero world times', () => {
      foundryCalendar.setManager(manager);

      // 1 day = 24 * 60 * 60 = 86400 seconds
      const oneDayInSeconds = 86400;
      const result = foundryCalendar.timeToComponents(oneDayInSeconds);

      expect(result.day).toBe(2); // Should be second day
    });

    it('should handle time with hours, minutes, seconds', () => {
      foundryCalendar.setManager(manager);

      // 1 hour, 30 minutes, 45 seconds = 5445 seconds
      const timeInSeconds = 3600 + 1800 + 45;
      const result = foundryCalendar.timeToComponents(timeInSeconds);

      expect(result.day).toBe(1);
      expect(result.hour).toBe(1);
      expect(result.minute).toBe(30);
      expect(result.second).toBe(45);
    });
  });

  describe('componentsToTime', () => {
    it('should return 0 when manager is not set', () => {
      const result = foundryCalendar.componentsToTime({ year: 0, month: 1, day: 1 });
      expect(result).toBe(0);
    });

    it('should convert components to world time when manager is set', () => {
      foundryCalendar.setManager(manager);

      const result = foundryCalendar.componentsToTime({ year: 0, month: 1, day: 1 });
      expect(result).toBe(0);
    });

    it('should handle components after epoch', () => {
      foundryCalendar.setManager(manager);

      const result = foundryCalendar.componentsToTime({ year: 0, month: 1, day: 2 });
      expect(result).toBe(86400); // 1 day in seconds
    });

    it('should handle partial components', () => {
      foundryCalendar.setManager(manager);

      // Only specify day, should use defaults for other fields
      const result = foundryCalendar.componentsToTime({ day: 2 });
      expect(result).toBeGreaterThan(0);
    });

    it('should handle time components', () => {
      foundryCalendar.setManager(manager);

      const result = foundryCalendar.componentsToTime({
        year: 0,
        month: 1,
        day: 1,
        hour: 1,
        minute: 30,
        second: 45,
      });

      const expected = 3600 + 1800 + 45; // 5445 seconds
      expect(result).toBe(expected);
    });
  });

  describe('add', () => {
    it('should add time in seconds', () => {
      foundryCalendar.setManager(manager);

      const result = foundryCalendar.add(0, 86400); // Add 1 day

      expect(result.day).toBe(2);
    });

    it('should add time using components', () => {
      foundryCalendar.setManager(manager);

      const result = foundryCalendar.add({ year: 0, month: 1, day: 1 }, { day: 7 });

      expect(result.day).toBe(8);
    });

    it('should handle negative time (subtraction)', () => {
      foundryCalendar.setManager(manager);

      const result = foundryCalendar.add({ year: 0, month: 1, day: 5 }, { day: -2 });

      expect(result.day).toBe(3);
    });

    it('should handle month transitions when adding days', () => {
      foundryCalendar.setManager(manager);

      const result = foundryCalendar.add({ year: 0, month: 1, day: 30 }, { day: 1 });

      expect(result.month).toBe(2);
      expect(result.day).toBe(1);
    });
  });

  describe('difference', () => {
    it('should calculate difference between two times in seconds', () => {
      foundryCalendar.setManager(manager);

      const result = foundryCalendar.difference(86400, 0);

      expect(result.day).toBe(2); // 1 day difference + starting day 1 = day 2
    });

    it('should calculate difference using components', () => {
      foundryCalendar.setManager(manager);

      const result = foundryCalendar.difference(
        { year: 0, month: 1, day: 8 },
        { year: 0, month: 1, day: 1 }
      );

      // Result should represent the difference (7 days)
      expect(result.day).toBeGreaterThan(1);
    });

    it('should default to epoch when start time is not provided', () => {
      foundryCalendar.setManager(manager);

      const result = foundryCalendar.difference({ year: 0, month: 1, day: 2 });

      // Difference from epoch to day 2
      expect(result.day).toBe(2);
    });
  });

  describe('format', () => {
    it('should return placeholder when manager is not set', () => {
      const result = foundryCalendar.format();

      expect(result).toBe('Calendar not initialized');
    });

    it('should format time as string when manager is set', () => {
      foundryCalendar.setManager(manager);

      const result = foundryCalendar.format(0);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should format components as string', () => {
      foundryCalendar.setManager(manager);

      const result = foundryCalendar.format({ year: 0, month: 1, day: 15 });

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('isLeapYear', () => {
    it('should return false when manager is not set', () => {
      const result = foundryCalendar.isLeapYear(2024);
      expect(result).toBe(false);
    });

    it('should check leap year when manager is set', () => {
      foundryCalendar.setManager(manager);

      // Test calendar has no leap years
      const result = foundryCalendar.isLeapYear(2024);
      expect(result).toBe(false);
    });
  });

  describe('countLeapYears', () => {
    it('should return 0 when manager is not set', () => {
      const result = foundryCalendar.countLeapYears(10);
      expect(result).toBe(0);
    });

    it('should count leap years when manager is set', () => {
      foundryCalendar.setManager(manager);

      // Test calendar has no leap years, so count should be 0
      const result = foundryCalendar.countLeapYears(10);
      expect(result).toBe(0);
    });
  });

  describe('CalendarData integration', () => {
    it('should extend CalendarData', () => {
      expect(foundryCalendar).toBeInstanceOf(CalendarData);
    });

    it('should have all required CalendarData methods', () => {
      expect(typeof foundryCalendar.timeToComponents).toBe('function');
      expect(typeof foundryCalendar.componentsToTime).toBe('function');
      expect(typeof foundryCalendar.add).toBe('function');
      expect(typeof foundryCalendar.difference).toBe('function');
      expect(typeof foundryCalendar.format).toBe('function');
      expect(typeof foundryCalendar.isLeapYear).toBe('function');
      expect(typeof foundryCalendar.countLeapYears).toBe('function');
    });

    it('should work with Foundry time system pattern', () => {
      foundryCalendar.setManager(manager);

      // Simulate how Foundry would use the calendar
      const currentTime = 86400; // 1 day
      const components = foundryCalendar.timeToComponents(currentTime);
      const backToTime = foundryCalendar.componentsToTime(components);

      // Round-trip conversion should be accurate
      expect(backToTime).toBe(currentTime);
    });
  });
});
