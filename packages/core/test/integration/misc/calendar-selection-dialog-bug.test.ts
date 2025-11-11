/**
 * Regression test for calendar selection dialog array vs Map bug.
 * This test proves the fix for issue #314 where calendars would not appear
 * in the selection dialog due to checking .size on an array instead of .length.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CalendarSelectionDialog } from '../../../src/ui/calendar-selection-dialog';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';

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

/**
 * Helper function to test the calendar count logic.
 * This represents the core logic that was fixed.
 */
function getCalendarCount(calendars: any[] | Map<string, any>): number {
  return Array.isArray(calendars) ? calendars.length : calendars.size;
}

/**
 * Helper function to simulate the original buggy logic.
 * This shows what the code was doing before the fix.
 */
function getBuggyCalendarCount(calendars: any): number {
  return (calendars as any).size; // Always tries .size, even on arrays
}

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

  it('should fail with the original bug - checking .size on an array', () => {
    // Test the buggy logic directly using helper functions
    const calendarsArray = [mockCalendar]; // What getAllCalendars() returns
    const emptyArray: any[] = [];

    // Test buggy logic with populated array
    const buggyCount = getBuggyCalendarCount(calendarsArray);
    expect(buggyCount).toBeUndefined(); // arrays don't have .size property
    expect(buggyCount === 0).toBe(false); // undefined === 0 is false

    // Test buggy logic with empty array
    const buggyEmptyCount = getBuggyCalendarCount(emptyArray);
    expect(buggyEmptyCount).toBeUndefined(); // still undefined
    expect(buggyEmptyCount === 0).toBe(false); // Bug: empty arrays incorrectly fail the check

    // Compare with fixed logic
    const fixedCount = getCalendarCount(calendarsArray);
    const fixedEmptyCount = getCalendarCount(emptyArray);

    expect(fixedCount).toBe(1); // correctly gets array length
    expect(fixedEmptyCount).toBe(0); // correctly detects empty array
    expect(fixedEmptyCount === 0).toBe(true); // fixed logic works correctly

    // This demonstrates the exact bug: arrays would never trigger the empty calendar warning
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

  it('validates the calendar count logic for both arrays and Maps', () => {
    // Test arrays
    const emptyArray: any[] = [];
    const populatedArray = [mockCalendar];

    expect(getCalendarCount(emptyArray)).toBe(0);
    expect(getCalendarCount(populatedArray)).toBe(1);

    // Test Maps
    const emptyMap = new Map();
    const populatedMap = new Map();
    populatedMap.set('test', mockCalendar);

    expect(getCalendarCount(emptyMap)).toBe(0);
    expect(getCalendarCount(populatedMap)).toBe(1);

    // Demonstrate the bug would have broken array handling
    expect(getBuggyCalendarCount(emptyArray)).toBeUndefined();
    expect(getBuggyCalendarCount(populatedArray)).toBeUndefined();

    // But Maps would have worked with the buggy code (by accident)
    expect(getBuggyCalendarCount(emptyMap)).toBe(0);
    expect(getBuggyCalendarCount(populatedMap)).toBe(1);

    // This explains why the bug only affected array returns, not Map returns
  });

  it('demonstrates the exact bug condition that caused issue #314', () => {
    // This test demonstrates the exact problem that users experienced
    const calendarsArray = [mockCalendar]; // getAllCalendars() returns this

    // The buggy check that was causing the problem:
    const buggyCheck = (calendarsArray as any).size === 0;

    // calendarsArray.size is undefined, so undefined === 0 is false
    expect((calendarsArray as any).size).toBeUndefined();
    expect(buggyCheck).toBe(false);

    // The correct checks that the fix implements:
    const fixedCount = getCalendarCount(calendarsArray);
    const fixedCheck = fixedCount === 0;

    expect(fixedCount).toBe(1); // We have 1 calendar
    expect(fixedCheck).toBe(false); // So it's not empty

    // This shows why the bug let calendars through but broke the logic flow
  });
});
