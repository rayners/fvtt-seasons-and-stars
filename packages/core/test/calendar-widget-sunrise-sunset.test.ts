/**
 * Tests for CalendarWidget sunrise/sunset button functionality
 *
 * Clicking sunrise/sunset buttons should set the time to sunrise/sunset on the CURRENT day,
 * regardless of whether that time is in the past or future for that day.
 * These buttons are GM-only and should not be callable by non-GM users.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarWidget } from '../src/ui/calendar-widget';
import { CalendarManager } from '../src/core/calendar-manager';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Mock TimeAdvancementService to avoid initialization logic
vi.mock('../src/core/time-advancement-service', () => ({
  TimeAdvancementService: {
    getInstance: vi.fn(() => ({ shouldShowPauseButton: false })),
  },
}));

// Mock Foundry globals
const mockSettings = new Map();
global.game = {
  settings: {
    get: vi.fn((module: string, key: string) => mockSettings.get(`${module}.${key}`)),
    set: vi.fn((module: string, key: string, value: unknown) => {
      mockSettings.set(`${module}.${key}`, value);
    }),
  },
  user: { isGM: true },
  system: { id: 'generic' },
  time: {
    worldTime: 0,
    advance: vi.fn(async (delta: number) => {
      global.game.time!.worldTime += delta;
    }),
  },
  seasonsStars: {} as any,
} as any;

global.Hooks = {
  on: vi.fn(),
  callAll: vi.fn(),
  call: vi.fn(),
  off: vi.fn(),
} as any;

global.ui = {
  notifications: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
} as any;

describe('CalendarWidget - Sunrise/Sunset Button Functionality', () => {
  let widget: CalendarWidget;
  let manager: CalendarManager;
  let testCalendar: SeasonsStarsCalendar;

  beforeEach(async () => {
    // Reset game.time
    global.game.time!.worldTime = 0;
    global.game.user = { isGM: true } as any;
    vi.clearAllMocks();

    // Create a simple test calendar with explicit sunrise/sunset times
    testCalendar = {
      id: 'test-calendar',
      translations: { en: { label: 'Test Calendar' } },
      year: {
        epoch: 2000,
        currentYear: 2024,
        prefix: '',
        suffix: '',
        startDay: 0,
      },
      months: [
        { name: 'Month1', days: 30 },
        { name: 'Month2', days: 30 },
        { name: 'Month3', days: 30 },
        { name: 'Month4', days: 30 },
      ],
      weekdays: [{ name: 'Day1' }, { name: 'Day2' }, { name: 'Day3' }],
      intercalary: [],
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      },
      seasons: [
        {
          name: 'Season1',
          startMonth: 1,
          endMonth: 2,
          sunrise: '06:00', // 6 AM
          sunset: '18:00', // 6 PM
        },
        {
          name: 'Season2',
          startMonth: 3,
          endMonth: 4,
          sunrise: '05:30', // 5:30 AM
          sunset: '18:30', // 6:30 PM
        },
      ],
      leapYear: {
        rule: 'none',
      },
    };

    manager = new CalendarManager();
    manager.loadCalendar(testCalendar);
    await manager.setActiveCalendar('test-calendar');

    game.seasonsStars.manager = manager;
    widget = new CalendarWidget();
  });

  describe('Setting time to sunrise on current day', () => {
    it('should change time when sunrise button is clicked', async () => {
      // Current time: Month1 Day 15 at 12:00
      await manager.setCurrentDate(
        new CalendarDate(
          { year: 2024, month: 1, day: 15, weekday: 0, time: { hour: 12, minute: 0, second: 0 } },
          testCalendar
        )
      );

      const initialHour = manager.getCurrentDate()?.time?.hour;

      await widget._onSetTimeToSunrise(new Event('click'));

      const newDate = manager.getCurrentDate();

      // Time should have changed (sunrise will be different from noon)
      expect(newDate?.time?.hour).not.toBe(initialHour);

      // Should be in morning hours (sunrise is typically 5-7 AM)
      expect(newDate?.time?.hour).toBeGreaterThanOrEqual(5);
      expect(newDate?.time?.hour).toBeLessThanOrEqual(7);

      // Date should remain the same
      expect(newDate?.day).toBe(15);
      expect(newDate?.month).toBe(1);
      expect(newDate?.year).toBe(2024);
    });

    it('should preserve date when setting time backward', async () => {
      // Current time: Month1 Day 15 at 23:59 (late evening)
      await manager.setCurrentDate(
        new CalendarDate(
          { year: 2024, month: 1, day: 15, weekday: 0, time: { hour: 23, minute: 59, second: 0 } },
          testCalendar
        )
      );

      await widget._onSetTimeToSunrise(new Event('click'));

      const newDate = manager.getCurrentDate();

      // Time should have moved backward to morning
      expect(newDate?.time?.hour).toBeLessThan(12);

      // Date should remain the same (not advance to next day)
      expect(newDate?.day).toBe(15);
      expect(newDate?.month).toBe(1);
      expect(newDate?.year).toBe(2024);
    });
  });

  describe('Setting time to sunset on current day', () => {
    it('should change time when sunset button is clicked', async () => {
      // Current time: Month1 Day 20 at noon
      await manager.setCurrentDate(
        new CalendarDate(
          { year: 2024, month: 1, day: 20, weekday: 1, time: { hour: 12, minute: 0, second: 0 } },
          testCalendar
        )
      );

      const initialHour = manager.getCurrentDate()?.time?.hour;

      await widget._onSetTimeToSunset(new Event('click'));

      const newDate = manager.getCurrentDate();

      // Time should have changed (sunset will be different from noon)
      expect(newDate?.time?.hour).not.toBe(initialHour);

      // Should be in evening hours (sunset is typically 17-19)
      expect(newDate?.time?.hour).toBeGreaterThanOrEqual(17);
      expect(newDate?.time?.hour).toBeLessThanOrEqual(19);

      // Date should remain the same
      expect(newDate?.day).toBe(20);
      expect(newDate?.month).toBe(1);
      expect(newDate?.year).toBe(2024);
    });

    it('should preserve date when setting time backward', async () => {
      // Current time: Month1 Day 20 at 22:00 (late night, after sunset)
      await manager.setCurrentDate(
        new CalendarDate(
          { year: 2024, month: 1, day: 20, weekday: 1, time: { hour: 22, minute: 0, second: 0 } },
          testCalendar
        )
      );

      await widget._onSetTimeToSunset(new Event('click'));

      const newDate = manager.getCurrentDate();

      // Time should have moved backward to evening
      expect(newDate?.time?.hour).toBeLessThan(22);

      // Date should remain the same (not go back to previous day)
      expect(newDate?.day).toBe(20);
      expect(newDate?.month).toBe(1);
      expect(newDate?.year).toBe(2024);
    });
  });

  describe('GM permission requirements', () => {
    it('should prevent non-GMs from setting time to sunrise', async () => {
      global.game.user = { isGM: false } as any;

      await manager.setCurrentDate(
        new CalendarDate(
          { year: 2024, month: 1, day: 15, weekday: 0, time: { hour: 12, minute: 0, second: 0 } },
          testCalendar
        )
      );

      const initialHour = manager.getCurrentDate()?.time?.hour;

      await widget._onSetTimeToSunrise(new Event('click'));

      const newDate = manager.getCurrentDate();

      // Time should not have changed for non-GM
      expect(newDate?.time?.hour).toBe(initialHour);
    });

    it('should prevent non-GMs from setting time to sunset', async () => {
      global.game.user = { isGM: false } as any;

      await manager.setCurrentDate(
        new CalendarDate(
          { year: 2024, month: 1, day: 20, weekday: 1, time: { hour: 12, minute: 0, second: 0 } },
          testCalendar
        )
      );

      const initialHour = manager.getCurrentDate()?.time?.hour;

      await widget._onSetTimeToSunset(new Event('click'));

      const newDate = manager.getCurrentDate();

      // Time should not have changed for non-GM
      expect(newDate?.time?.hour).toBe(initialHour);
    });

    it('should allow GMs to set time to sunrise', async () => {
      global.game.user = { isGM: true } as any;

      await manager.setCurrentDate(
        new CalendarDate(
          { year: 2024, month: 1, day: 15, weekday: 0, time: { hour: 12, minute: 0, second: 0 } },
          testCalendar
        )
      );

      const initialHour = manager.getCurrentDate()?.time?.hour;

      await widget._onSetTimeToSunrise(new Event('click'));

      const newDate = manager.getCurrentDate();

      // Time should have changed for GM
      expect(newDate?.time?.hour).not.toBe(initialHour);
    });

    it('should allow GMs to set time to sunset', async () => {
      global.game.user = { isGM: true } as any;

      await manager.setCurrentDate(
        new CalendarDate(
          { year: 2024, month: 1, day: 20, weekday: 1, time: { hour: 12, minute: 0, second: 0 } },
          testCalendar
        )
      );

      const initialHour = manager.getCurrentDate()?.time?.hour;

      await widget._onSetTimeToSunset(new Event('click'));

      const newDate = manager.getCurrentDate();

      // Time should have changed for GM
      expect(newDate?.time?.hour).not.toBe(initialHour);
    });
  });

  describe('Edge cases', () => {
    it('should preserve year, month, and day when setting time to sunrise', async () => {
      await manager.setCurrentDate(
        new CalendarDate(
          { year: 2024, month: 4, day: 30, weekday: 2, time: { hour: 1, minute: 0, second: 0 } },
          testCalendar
        )
      );

      await widget._onSetTimeToSunrise(new Event('click'));

      const newDate = manager.getCurrentDate();
      expect(newDate?.year).toBe(2024);
      expect(newDate?.month).toBe(4);
      expect(newDate?.day).toBe(30);
    });

    it('should preserve year, month, and day when setting time to sunset', async () => {
      await manager.setCurrentDate(
        new CalendarDate(
          { year: 2024, month: 4, day: 30, weekday: 2, time: { hour: 1, minute: 0, second: 0 } },
          testCalendar
        )
      );

      await widget._onSetTimeToSunset(new Event('click'));

      const newDate = manager.getCurrentDate();
      expect(newDate?.year).toBe(2024);
      expect(newDate?.month).toBe(4);
      expect(newDate?.day).toBe(30);
    });
  });
});
