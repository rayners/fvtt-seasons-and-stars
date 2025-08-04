/**
 * Test for mini widget time display functionality
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

describe('Mini Widget Time Display', () => {
  let widget: CalendarMiniWidget;
  let mockCalendar: SeasonsStarsCalendar;
  let mockDate: CalendarDate;

  beforeEach(() => {
    // Reset settings
    mockSettings.clear();

    // Create mock calendar
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
      ],
      yearLength: 365,
      weekLength: 7,
      epoch: { year: 1, month: 1, day: 1 },
    } as SeasonsStarsCalendar;

    // Create mock date with time
    mockDate = new CalendarDate(
      {
        year: 2024,
        month: 6,
        day: 15,
        weekday: 5,
        time: {
          hour: 14,
          minute: 30,
          second: 45,
        },
      },
      mockCalendar
    );

    // Mock manager responses
    (global.game.seasonsStars.manager.getActiveCalendar as any).mockReturnValue(mockCalendar);
    (global.game.seasonsStars.manager.getCurrentDate as any).mockReturnValue(mockDate);

    // Mock SmallTime utilities
    vi.mock('../src/ui/base-widget-manager', () => ({
      SmallTimeUtils: {
        isSmallTimeAvailable: () => false,
        getSmallTimeElement: () => null,
      },
    }));

    widget = new CalendarMiniWidget();
  });

  it('should not show time when setting is disabled', async () => {
    // Set the setting to false
    mockSettings.set('seasons-and-stars.miniWidgetShowTime', false);

    const context = await widget._prepareContext();

    expect(context.showTime).toBe(false);
    expect(context.timeString).toBe('');
  });

  it('should show formatted time when setting is enabled', async () => {
    // Set the setting to true
    mockSettings.set('seasons-and-stars.miniWidgetShowTime', true);

    const context = await widget._prepareContext();

    expect(context.showTime).toBe(true);
    expect(context.timeString).toBe('14:30'); // HH:MM format
  });

  it('should handle dates without time gracefully', async () => {
    // Create date without time
    const mockDateNoTime = new CalendarDate(
      {
        year: 2024,
        month: 6,
        day: 15,
        weekday: 5,
        // No time property
      },
      mockCalendar
    );

    (global.game.seasonsStars.manager.getCurrentDate as any).mockReturnValue(mockDateNoTime);
    mockSettings.set('seasons-and-stars.miniWidgetShowTime', true);

    const context = await widget._prepareContext();

    expect(context.showTime).toBe(true);
    expect(context.timeString).toBe(''); // Empty when no time available
  });

  it('should format time with proper padding', async () => {
    // Create date with single digit values
    const mockDateSingleDigits = new CalendarDate(
      {
        year: 2024,
        month: 6,
        day: 15,
        weekday: 5,
        time: {
          hour: 9,
          minute: 5,
          second: 0,
        },
      },
      mockCalendar
    );

    (global.game.seasonsStars.manager.getCurrentDate as any).mockReturnValue(mockDateSingleDigits);
    mockSettings.set('seasons-and-stars.miniWidgetShowTime', true);

    const context = await widget._prepareContext();

    expect(context.timeString).toBe('09:05'); // Properly padded
  });
});
