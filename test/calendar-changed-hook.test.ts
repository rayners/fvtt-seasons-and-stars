/**
 * Tests for seasons warning state management and hook integration
 *
 * This test focuses specifically on the changes made in the prevent-seasons-warning-loop branch:
 * - The resetSeasonsWarningState and getSeasonsWarningState functions
 * - Integration with the warning prevention system in getSeasonInfo
 * - The hook functionality (tested indirectly through the exposed functions)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Logger } from '../src/core/logger';
import {
  resetSeasonsWarningState,
  getSeasonsWarningState,
  setSeasonsWarningState,
} from '../src/module';

// Test calendar configurations
const calendarWithoutSeasons = {
  id: 'test-no-seasons',
  name: 'Test Calendar No Seasons',
  year: { epoch: 0, currentYear: 2024 },
  months: [
    { name: 'January', days: 31 },
    { name: 'February', days: 28 },
  ],
  weekdays: [{ name: 'Sunday' }, { name: 'Monday' }],
  intercalary: [],
  time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
  // No seasons property
};

const anotherCalendarWithoutSeasons = {
  id: 'another-no-seasons',
  name: 'Another Calendar No Seasons',
  year: { epoch: 0, currentYear: 2024 },
  months: [
    { name: 'January', days: 31 },
    { name: 'February', days: 28 },
  ],
  weekdays: [{ name: 'Sunday' }, { name: 'Monday' }],
  intercalary: [],
  time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
  // No seasons property
};

// Mock Foundry globals
const mockGame = {
  settings: {
    get: vi.fn(),
  },
  time: {
    worldTime: 86400,
  },
  seasonsStars: {} as any,
} as any;

const mockHooks = {
  on: vi.fn(),
  once: vi.fn(),
  call: vi.fn(),
  callAll: vi.fn(),
};

// Set up global mocks before importing the module
globalThis.game = mockGame;
globalThis.Hooks = mockHooks;

// Mock the calendar manager to avoid complex dependencies
const mockCalendarManager = {
  getActiveCalendar: vi.fn(),
  getCalendar: vi.fn(),
  getActiveEngine: vi.fn(),
  loadBuiltInCalendars: vi.fn().mockResolvedValue(undefined),
  completeInitialization: vi.fn().mockResolvedValue(undefined),
};

// Mock components to prevent side effects during module import
vi.mock('../src/core/calendar-manager', () => ({
  CalendarManager: vi.fn().mockImplementation(() => mockCalendarManager),
}));

vi.mock('../src/core/notes-manager', () => ({
  NotesManager: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../src/ui/calendar-widget', () => ({
  CalendarWidget: {
    registerHooks: vi.fn(),
    getInstance: vi.fn(),
  },
}));

vi.mock('../src/ui/calendar-mini-widget', () => ({
  CalendarMiniWidget: {
    registerHooks: vi.fn(),
    registerSmallTimeIntegration: vi.fn(),
    getInstance: vi.fn(),
  },
}));

vi.mock('../src/ui/calendar-grid-widget', () => ({
  CalendarGridWidget: {
    registerHooks: vi.fn(),
    getInstance: vi.fn(),
  },
}));

vi.mock('../src/ui/calendar-widget-manager', () => ({
  CalendarWidgetManager: {
    registerWidget: vi.fn(),
  },
}));

vi.mock('../src/ui/scene-controls', () => ({
  SeasonsStarsSceneControls: {
    registerControls: vi.fn(),
    registerMacros: vi.fn(),
  },
}));

// Variables to hold API functionality
let getSeasonInfo: any;

describe('Seasons Warning State Management', () => {
  let loggerDebugSpy: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup logger spy
    loggerDebugSpy = vi.spyOn(Logger, 'debug').mockImplementation(() => {});

    // Setup game.seasonsStars.manager
    mockGame.seasonsStars = {
      manager: mockCalendarManager,
      api: {},
    };

    // Reset the warning state using the exposed function
    resetSeasonsWarningState();

    // Set up the getSeasonInfo API function (same as seasons-warning-prevention.test.ts)
    getSeasonInfo = (date: any, calendarId?: string): { name: string; icon: string } => {
      // Input validation
      if (!date || typeof date !== 'object') {
        throw new Error('Date must be a valid ICalendarDate object');
      }

      if (
        typeof date.year !== 'number' ||
        typeof date.month !== 'number' ||
        typeof date.day !== 'number'
      ) {
        throw new Error('Date must have valid year, month, and day numbers');
      }

      if (calendarId !== undefined && typeof calendarId !== 'string') {
        throw new Error('Calendar ID must be a string');
      }

      const calendar = calendarId
        ? mockCalendarManager.getCalendar(calendarId)
        : mockCalendarManager.getActiveCalendar();

      if (!calendar || !calendar.seasons || calendar.seasons.length === 0) {
        // Only log to console once per active calendar to prevent looping warnings
        // Using the exposed module functions to manage warning state
        const shouldWarn = !getSeasonsWarningState() && !calendarId;
        if (shouldWarn) {
          Logger.debug(`No seasons found for calendar: ${calendar?.id || 'active'}`);
          // Set the warning state using the exposed function
          setSeasonsWarningState(true);
        }
        return { name: 'Unknown', icon: 'none' };
      }

      // Basic season detection - find season containing this date
      const currentSeason = calendar.seasons.find((season: any) => {
        if (season.startMonth && season.endMonth) {
          return date.month >= season.startMonth && date.month <= season.endMonth;
        }
        return false;
      });

      if (currentSeason) {
        return {
          name: currentSeason.name,
          icon: currentSeason.icon || currentSeason.name.toLowerCase(),
        };
      }

      // Fallback: use first season or default
      const fallbackSeason = calendar.seasons[0];
      return {
        name: fallbackSeason?.name || 'Unknown',
        icon: fallbackSeason?.icon || fallbackSeason?.name?.toLowerCase() || 'none',
      };
    };

    // Also set up the API on the mock game object for consistency
    mockGame.seasonsStars.api.getSeasonInfo = getSeasonInfo;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Warning State Management Functions', () => {
    it('should initialize with warning state false', () => {
      expect(getSeasonsWarningState()).toBe(false);
    });

    it('should allow setting warning state to true', () => {
      setSeasonsWarningState(true);
      expect(getSeasonsWarningState()).toBe(true);
    });

    it('should allow setting warning state to false', () => {
      setSeasonsWarningState(true);
      expect(getSeasonsWarningState()).toBe(true);

      setSeasonsWarningState(false);
      expect(getSeasonsWarningState()).toBe(false);
    });

    it('should reset warning state to false', () => {
      setSeasonsWarningState(true);
      expect(getSeasonsWarningState()).toBe(true);

      resetSeasonsWarningState();
      expect(getSeasonsWarningState()).toBe(false);
    });
  });

  describe('Integration with getSeasonInfo Warning Logic', () => {
    it('should prevent repeated warnings using the warning state', () => {
      const testDate = { year: 2024, month: 1, day: 15 };

      // Setup calendar without seasons
      mockCalendarManager.getActiveCalendar.mockReturnValue(calendarWithoutSeasons);

      // Verify initial state
      expect(getSeasonsWarningState()).toBe(false);

      // First call should trigger warning and set the flag
      getSeasonInfo(testDate);
      expect(loggerDebugSpy).toHaveBeenCalledTimes(1);
      expect(loggerDebugSpy).toHaveBeenCalledWith('No seasons found for calendar: test-no-seasons');
      expect(getSeasonsWarningState()).toBe(true);

      // Second call should not trigger warning (flag is set)
      vi.clearAllMocks();
      getSeasonInfo(testDate);
      expect(loggerDebugSpy).not.toHaveBeenCalled();
      expect(getSeasonsWarningState()).toBe(true); // Still true

      // Reset the warning state (simulating calendar change)
      resetSeasonsWarningState();
      expect(getSeasonsWarningState()).toBe(false);

      // Next call should trigger warning again
      getSeasonInfo(testDate);
      expect(loggerDebugSpy).toHaveBeenCalledTimes(1);
      expect(loggerDebugSpy).toHaveBeenCalledWith('No seasons found for calendar: test-no-seasons');
      expect(getSeasonsWarningState()).toBe(true);
    });

    it('should allow warnings for different calendars after state reset', () => {
      const testDate = { year: 2024, month: 1, day: 15 };

      // Setup first calendar without seasons
      mockCalendarManager.getActiveCalendar.mockReturnValue(calendarWithoutSeasons);

      // Trigger warning for first calendar
      getSeasonInfo(testDate);
      expect(loggerDebugSpy).toHaveBeenCalledWith('No seasons found for calendar: test-no-seasons');
      expect(getSeasonsWarningState()).toBe(true);

      // Reset state (simulating calendar change)
      resetSeasonsWarningState();
      expect(getSeasonsWarningState()).toBe(false);

      // Switch to different calendar without seasons
      mockCalendarManager.getActiveCalendar.mockReturnValue(anotherCalendarWithoutSeasons);
      vi.clearAllMocks();

      // Should warn again for the new calendar
      getSeasonInfo(testDate);
      expect(loggerDebugSpy).toHaveBeenCalledTimes(1);
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'No seasons found for calendar: another-no-seasons'
      );
      expect(getSeasonsWarningState()).toBe(true);
    });

    it('should not affect specific calendar ID queries', () => {
      const testDate = { year: 2024, month: 1, day: 15 };

      // Setup calendars to return no seasons
      mockCalendarManager.getActiveCalendar.mockReturnValue(calendarWithoutSeasons);
      mockCalendarManager.getCalendar.mockReturnValue(anotherCalendarWithoutSeasons);

      // Trigger warning for active calendar
      getSeasonInfo(testDate);
      expect(loggerDebugSpy).toHaveBeenCalledTimes(1);
      expect(getSeasonsWarningState()).toBe(true);

      // Query specific calendar - should not be affected by warning state
      vi.clearAllMocks();
      getSeasonInfo(testDate, 'another-no-seasons');
      expect(loggerDebugSpy).not.toHaveBeenCalled(); // No warning for specific calendar

      // Reset state
      resetSeasonsWarningState();
      expect(getSeasonsWarningState()).toBe(false);

      // Specific calendar queries should still not warn
      getSeasonInfo(testDate, 'another-no-seasons');
      expect(loggerDebugSpy).not.toHaveBeenCalled();

      // But active calendar should warn again
      getSeasonInfo(testDate);
      expect(loggerDebugSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple rapid state changes', () => {
      const testDate = { year: 2024, month: 1, day: 15 };
      mockCalendarManager.getActiveCalendar.mockReturnValue(calendarWithoutSeasons);

      // Test multiple state changes
      expect(getSeasonsWarningState()).toBe(false);

      setSeasonsWarningState(true);
      expect(getSeasonsWarningState()).toBe(true);

      resetSeasonsWarningState();
      expect(getSeasonsWarningState()).toBe(false);

      resetSeasonsWarningState(); // Reset when already false
      expect(getSeasonsWarningState()).toBe(false);

      setSeasonsWarningState(true);
      setSeasonsWarningState(false);
      expect(getSeasonsWarningState()).toBe(false);

      // Should still work correctly with getSeasonInfo
      getSeasonInfo(testDate);
      expect(loggerDebugSpy).toHaveBeenCalledTimes(1);
      expect(getSeasonsWarningState()).toBe(true);
    });
  });
});
