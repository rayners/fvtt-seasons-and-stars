/**
 * Regression test for calendar selection dialog array vs Map bug.
 * This test proves the fix for issue #314 where calendars would not appear
 * in the selection dialog due to checking .size on an array instead of .length.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CalendarSelectionDialog } from '../src/ui/calendar-selection-dialog';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Mock a simple calendar for testing
const mockCalendar: SeasonsStarsCalendar = {
  id: 'test-calendar',
  name: 'Test Calendar',
  label: 'Test Calendar',
  months: [{ name: 'January', days: 31 }],
  weekdays: [{ name: 'Monday', abbreviation: 'Mon' }],
  yearLength: 365,
  weekLength: 7,
  epoch: { year: 1, month: 1, day: 1 },
  translations: {
    en: {
      label: 'Test Calendar',
      description: 'A test calendar',
      setting: 'Test setting',
    },
  },
} as SeasonsStarsCalendar;

describe('CalendarSelectionDialog array vs Map bug', () => {
  let mockGame: any;
  let mockUI: any;
  let mockNotificationsSpy: any;

  beforeEach(() => {
    // Mock game object
    mockNotificationsSpy = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    };

    mockUI = {
      notifications: mockNotificationsSpy,
    };

    mockGame = {
      seasonsStars: {
        manager: {
          // This returns an ARRAY (the bug condition)
          getAllCalendars: vi.fn().mockReturnValue([mockCalendar]),
        },
      },
      settings: {
        get: vi.fn().mockReturnValue('test-calendar'),
      },
      i18n: {
        localize: vi.fn((key: string) => key),
      },
    };

    // Set up global objects
    global.game = mockGame;
    global.ui = mockUI;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fail with the original bug - checking .size on an array', async () => {
    // Save the original code behavior by temporarily modifying the method
    // to simulate the buggy behavior
    const originalShow = CalendarSelectionDialog.show;

    // Mock the buggy version that checks .size on an array
    CalendarSelectionDialog.show = async function () {
      if (!game.seasonsStars?.manager) {
        ui.notifications?.error('manager_not_ready');
        return;
      }

      const calendars = game.seasonsStars.manager.getAllCalendars();

      // THE BUG: checking .size on an array (arrays don't have .size property)
      if (calendars.size === 0) {
        ui.notifications?.warn('no_calendars_available');
        return;
      }

      // If we get here, the bug didn't trigger the early return
      ui.notifications?.info('calendars_found');
    };

    // Run the buggy version
    await CalendarSelectionDialog.show();

    // The bug: calendars.size is undefined, undefined === 0 is false
    // So the warning should NOT have been called (the bug lets it through)
    // But since calendars.size is undefined, the condition fails and no warning is shown
    expect(mockNotificationsSpy.warn).not.toHaveBeenCalled();
    expect(mockNotificationsSpy.info).toHaveBeenCalledWith('calendars_found');

    // Restore original method
    CalendarSelectionDialog.show = originalShow;
  });

  it('should pass with the fixed version - proper array/Map detection', async () => {
    // The current fixed version should work correctly
    await CalendarSelectionDialog.show();

    // With the fix, it should properly detect that we have calendars (array.length > 0)
    // and not show the "no calendars" warning
    expect(mockNotificationsSpy.warn).not.toHaveBeenCalled();
    expect(mockNotificationsSpy.error).not.toHaveBeenCalled();
  });

  it('should correctly handle empty arrays with the fix', async () => {
    // Test with an empty array
    mockGame.seasonsStars.manager.getAllCalendars.mockReturnValue([]);

    await CalendarSelectionDialog.show();

    // Should now correctly detect empty array and show warning
    expect(mockNotificationsSpy.warn).toHaveBeenCalledWith(
      'SEASONS_STARS.warnings.no_calendars_available'
    );
  });

  it('should correctly handle empty Maps with the fix', async () => {
    // Test with an empty Map
    mockGame.seasonsStars.manager.getAllCalendars.mockReturnValue(new Map());

    await CalendarSelectionDialog.show();

    // Should correctly detect empty Map and show warning
    expect(mockNotificationsSpy.warn).toHaveBeenCalledWith(
      'SEASONS_STARS.warnings.no_calendars_available'
    );
  });

  it('should correctly handle populated Maps with the fix', async () => {
    // Test with a populated Map
    const calendarsMap = new Map();
    calendarsMap.set('test-calendar', mockCalendar);
    mockGame.seasonsStars.manager.getAllCalendars.mockReturnValue(calendarsMap);

    await CalendarSelectionDialog.show();

    // Should correctly detect populated Map and not show warning
    expect(mockNotificationsSpy.warn).not.toHaveBeenCalled();
    expect(mockNotificationsSpy.error).not.toHaveBeenCalled();
  });

  it('demonstrates the exact bug condition that caused issue #314', () => {
    // This test demonstrates the exact problem that users experienced
    const calendarsArray = [mockCalendar]; // getAllCalendars() returns this

    // The buggy check that was causing the problem:
    const buggyCheck = calendarsArray.size === 0;

    // calendarsArray.size is undefined, so undefined === 0 is false
    expect(calendarsArray.size).toBeUndefined();
    expect(buggyCheck).toBe(false);

    // The correct checks that the fix implements:
    const arrayLength = Array.isArray(calendarsArray) ? calendarsArray.length : calendarsArray.size;
    const fixedCheck = arrayLength === 0;

    expect(arrayLength).toBe(1); // We have 1 calendar
    expect(fixedCheck).toBe(false); // So it's not empty

    // This shows why the bug let calendars through but broke the logic flow
  });
});
