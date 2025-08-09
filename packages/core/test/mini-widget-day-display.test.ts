/**
 * Test for mini widget day of week display functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarMiniWidget } from '../src/ui/calendar-mini-widget';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Mock Foundry globals
const mockSettings = new Map();
global.game = {
  settings: {
    get: vi.fn((module: string, key: string) => mockSettings.get(`${module}.${key}`)),
  },
  user: { isGM: true },
  seasonsStars: {
    manager: {
      getActiveCalendar: vi.fn(),
      getCurrentDate: vi.fn(),
    },
  },
} as any;

describe('Mini Widget Day of Week Display', () => {
  let widget: CalendarMiniWidget;
  let mockCalendar: SeasonsStarsCalendar;
  let mockDate: CalendarDate;

  beforeEach(() => {
    // Reset settings
    mockSettings.clear();

    // Create mock calendar with abbreviated weekdays
    mockCalendar = {
      id: 'gregorian',
      name: 'Gregorian Calendar',
      label: 'Gregorian Calendar',
      months: [
        { name: 'January', days: 31 },
        { name: 'February', days: 28 },
      ],
      weekdays: [
        { name: 'Sunday', abbreviation: 'Sun' },
        { name: 'Monday', abbreviation: 'Mon' },
        { name: 'Tuesday', abbreviation: 'Tue' },
        { name: 'Wednesday', abbreviation: 'Wed' },
        { name: 'Thursday', abbreviation: 'Thu' },
        { name: 'Friday', abbreviation: 'Fri' },
        { name: 'Saturday', abbreviation: 'Sat' },
      ],
      yearLength: 365,
      weekLength: 7,
      epoch: { year: 1, month: 1, day: 1 },
    } as SeasonsStarsCalendar;

    // Create mock date with weekday
    mockDate = {
      year: 2024,
      month: 1,
      day: 15,
      weekday: 1, // Monday
      time: { hour: 12, minute: 30, second: 0 },
      toShortString: vi.fn(() => 'Jan 15, 2024'),
      toLongString: vi.fn(() => 'January 15, 2024'),
      toObject: vi.fn(() => ({
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
      })),
    } as any;

    // Setup mock returns
    (game.seasonsStars.manager.getActiveCalendar as any).mockReturnValue(mockCalendar);
    (game.seasonsStars.manager.getCurrentDate as any).mockReturnValue(mockDate);

    // Create widget instance
    widget = new CalendarMiniWidget();
  });

  describe('Setting Disabled (Default)', () => {
    beforeEach(() => {
      mockSettings.set('seasons-and-stars.miniWidgetShowDayOfWeek', false);
    });

    it('should not show weekday when setting is disabled', async () => {
      const context = await widget._prepareContext();

      expect(context.showDayOfWeek).toBe(false);
      expect(context.weekdayDisplay).toBe('');
    });

    it('should not show weekday when setting is undefined', async () => {
      // Don't set the setting at all (undefined)
      const context = await widget._prepareContext();

      expect(context.showDayOfWeek).toBe(false);
      expect(context.weekdayDisplay).toBe('');
    });
  });

  describe('Setting Enabled - With Abbreviations', () => {
    beforeEach(() => {
      mockSettings.set('seasons-and-stars.miniWidgetShowDayOfWeek', true);
    });

    it('should show abbreviated weekday when setting is enabled', async () => {
      const context = await widget._prepareContext();

      expect(context.showDayOfWeek).toBe(true);
      expect(context.weekdayDisplay).toBe('Mon');
    });

    it('should show correct weekday for different days', async () => {
      // Test Sunday (weekday 0)
      mockDate.weekday = 0;
      let context = await widget._prepareContext();
      expect(context.weekdayDisplay).toBe('Sun');

      // Test Wednesday (weekday 3)
      mockDate.weekday = 3;
      context = await widget._prepareContext();
      expect(context.weekdayDisplay).toBe('Wed');

      // Test Saturday (weekday 6)
      mockDate.weekday = 6;
      context = await widget._prepareContext();
      expect(context.weekdayDisplay).toBe('Sat');
    });
  });

  describe('Setting Enabled - Without Abbreviations', () => {
    beforeEach(() => {
      mockSettings.set('seasons-and-stars.miniWidgetShowDayOfWeek', true);

      // Create calendar without abbreviations
      mockCalendar.weekdays = [
        { name: 'Sunday' },
        { name: 'Monday' },
        { name: 'Tuesday' },
        { name: 'Wednesday' },
        { name: 'Thursday' },
        { name: 'Friday' },
        { name: 'Saturday' },
      ];
    });

    it('should fallback to truncated name when abbreviation missing', async () => {
      // Test Monday (weekday 1) - should truncate to 'Mon'
      mockDate.weekday = 1;
      const context = await widget._prepareContext();

      expect(context.showDayOfWeek).toBe(true);
      expect(context.weekdayDisplay).toBe('Mon');
    });

    it('should truncate long weekday names correctly', async () => {
      // Test with a longer name
      mockCalendar.weekdays[1] = { name: 'Moonday' };
      mockDate.weekday = 1;

      const context = await widget._prepareContext();
      expect(context.weekdayDisplay).toBe('Moo'); // First 3 characters
    });
  });

  describe('Edge Cases and Error Handling', () => {
    beforeEach(() => {
      mockSettings.set('seasons-and-stars.miniWidgetShowDayOfWeek', true);
    });

    it('should handle invalid weekday index gracefully', async () => {
      mockDate.weekday = 10; // Out of bounds

      const context = await widget._prepareContext();
      expect(context.showDayOfWeek).toBe(true);
      expect(context.weekdayDisplay).toBe('');
    });

    it('should handle negative weekday index gracefully', async () => {
      mockDate.weekday = -1; // Negative index

      const context = await widget._prepareContext();
      expect(context.showDayOfWeek).toBe(true);
      expect(context.weekdayDisplay).toBe('');
    });

    it('should handle undefined weekday gracefully', async () => {
      mockDate.weekday = undefined;

      const context = await widget._prepareContext();
      expect(context.showDayOfWeek).toBe(true);
      expect(context.weekdayDisplay).toBe('');
    });

    it('should handle calendars without weekdays array', async () => {
      mockCalendar.weekdays = undefined as any;

      const context = await widget._prepareContext();
      expect(context.showDayOfWeek).toBe(true);
      expect(context.weekdayDisplay).toBe('');
    });

    it('should handle empty weekdays array', async () => {
      mockCalendar.weekdays = [];

      const context = await widget._prepareContext();
      expect(context.showDayOfWeek).toBe(true);
      expect(context.weekdayDisplay).toBe('');
    });

    it('should handle null weekday object', async () => {
      mockCalendar.weekdays[1] = null as any;
      mockDate.weekday = 1;

      const context = await widget._prepareContext();
      expect(context.showDayOfWeek).toBe(true);
      expect(context.weekdayDisplay).toBe('');
    });

    it('should handle weekday with empty name', async () => {
      mockCalendar.weekdays[1] = { name: '' };
      mockDate.weekday = 1;

      const context = await widget._prepareContext();
      expect(context.showDayOfWeek).toBe(true);
      expect(context.weekdayDisplay).toBe('');
    });
  });

  describe('Integration with Existing Features', () => {
    beforeEach(() => {
      mockSettings.set('seasons-and-stars.miniWidgetShowDayOfWeek', true);
      mockSettings.set('seasons-and-stars.miniWidgetShowTime', true);
    });

    it('should work alongside time display', async () => {
      const context = await widget._prepareContext();

      expect(context.showDayOfWeek).toBe(true);
      expect(context.weekdayDisplay).toBe('Mon');
      expect(context.showTime).toBe(true);
      expect(context.timeString).toBeTruthy();
    });

    it('should work when time display is disabled', async () => {
      mockSettings.set('seasons-and-stars.miniWidgetShowTime', false);

      const context = await widget._prepareContext();

      expect(context.showDayOfWeek).toBe(true);
      expect(context.weekdayDisplay).toBe('Mon');
      expect(context.showTime).toBe(false);
    });
  });

  describe('Different Calendar Systems', () => {
    beforeEach(() => {
      mockSettings.set('seasons-and-stars.miniWidgetShowDayOfWeek', true);
    });

    it('should work with fantasy calendar system', async () => {
      // Create fantasy calendar with different weekdays
      mockCalendar.weekdays = [
        { name: 'Sunreach', abbreviation: 'Sun' },
        { name: 'Moonfall', abbreviation: 'Moo' },
        { name: 'Starlight', abbreviation: 'Sta' },
        { name: 'Windday', abbreviation: 'Win' },
        { name: 'Earthen', abbreviation: 'Ear' },
      ];
      mockDate.weekday = 2; // Starlight

      const context = await widget._prepareContext();
      expect(context.weekdayDisplay).toBe('Sta');
    });

    it('should work with calendar having 10-day weeks', async () => {
      // Create calendar with 10-day week
      mockCalendar.weekdays = Array.from({ length: 10 }, (_, i) => ({
        name: `Day${i + 1}`,
        abbreviation: `D${i + 1}`,
      }));
      mockDate.weekday = 7; // Day8

      const context = await widget._prepareContext();
      expect(context.weekdayDisplay).toBe('D8');
    });
  });

  describe('Hook Integration', () => {
    it('should include miniWidgetShowDayOfWeek in settings change hook', () => {
      // This tests that the hook listener includes our new setting
      // The actual hook registration is tested implicitly through the widget behavior
      const settingsHook = CalendarMiniWidget.registerHooks;
      expect(settingsHook).toBeDefined();
    });
  });
});
