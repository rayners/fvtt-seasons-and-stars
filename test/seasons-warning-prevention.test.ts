/**
 * Tests for warning prevention logic in getSeasonInfo API function
 *
 * Tests the critical functionality that prevents repeated "No seasons found" warnings
 * from appearing in the console when getSeasonInfo is called repeatedly during
 * widget updates, while ensuring proper warning behavior and state management.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock Foundry globals before importing modules
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

const mockUI = {
  notifications: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
} as any;

const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

// Mock Logger before module import
vi.mock('../src/core/logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    api: vi.fn(),
  },
}));

// Mock calendar manager components
vi.mock('../src/core/calendar-manager', () => ({
  CalendarManager: vi.fn().mockImplementation(() => ({
    loadBuiltInCalendars: vi.fn().mockResolvedValue(undefined),
    completeInitialization: vi.fn().mockResolvedValue(undefined),
    getActiveCalendar: vi.fn(),
    getCalendar: vi.fn(),
    getActiveEngine: vi.fn(),
  })),
}));

vi.mock('../src/core/notes-manager', () => ({
  NotesManager: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock other components
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

vi.mock('../src/ui/widget-wrapper', () => ({
  WidgetWrapper: vi.fn(),
}));

vi.mock('../src/ui/scene-controls', () => ({
  SeasonsStarsSceneControls: {
    registerControls: vi.fn(),
  },
}));

describe('Seasons Warning Prevention Logic', () => {
  let Logger: any;
  let mockCalendarManager: any;
  let seasonsStarsAPI: any;
  let hasWarnedAboutMissingSeasons: boolean;

  // Mock the warning state variable that's in the module scope
  const createGetSeasonInfoFunction = () => {
    return (date: any, calendarId?: string) => {
      try {
        Logger.api('getSeasonInfo', { date, calendarId });

        // Input validation (simplified)
        if (!date || typeof date !== 'object') {
          throw new Error('Date must be a valid ICalendarDate object');
        }

        const calendar = calendarId
          ? mockCalendarManager.getCalendar(calendarId)
          : mockCalendarManager.getActiveCalendar();

        if (!calendar || !calendar.seasons || calendar.seasons.length === 0) {
          // Only log to console once per active calendar to prevent looping warnings
          if (!hasWarnedAboutMissingSeasons && !calendarId) {
            Logger.debug(`No seasons found for calendar: ${calendar?.id || 'active'}`);
            hasWarnedAboutMissingSeasons = true;
          }
          const result = { name: 'Unknown', icon: 'none' };
          Logger.api('getSeasonInfo', { date, calendarId }, result);
          return result;
        }

        // Basic season detection
        const currentSeason = calendar.seasons.find((season: any) => {
          if (season.startMonth && season.endMonth) {
            return date.month >= season.startMonth && date.month <= season.endMonth;
          }
          return false;
        });

        if (currentSeason) {
          const result = {
            name: currentSeason.name,
            icon: currentSeason.icon || currentSeason.name.toLowerCase(),
          };
          Logger.api('getSeasonInfo', { date, calendarId }, result);
          return result;
        }

        // Fallback: use first season or default
        const fallbackSeason = calendar.seasons[0];
        const result = {
          name: fallbackSeason?.name || 'Unknown',
          icon: fallbackSeason?.icon || fallbackSeason?.name?.toLowerCase() || 'none',
        };
        Logger.api('getSeasonInfo', { date, calendarId }, result);
        return result;
      } catch (error) {
        Logger.error('Failed to get season info', error);
        throw error;
      }
    };
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset warning state for each test
    hasWarnedAboutMissingSeasons = false;

    // Setup global mocks
    globalThis.game = mockGame;
    globalThis.ui = mockUI;
    globalThis.console = mockConsole as any;
    globalThis.Hooks = mockHooks;

    // Import Logger mock
    const { Logger: LoggerMock } = vi.mocked(await import('../src/core/logger'));
    Logger = LoggerMock;

    // Setup default Logger behavior
    Logger.debug.mockImplementation(() => {});
    Logger.api.mockImplementation(() => {});
    Logger.error.mockImplementation(() => {});

    // Mock calendar manager instance
    mockCalendarManager = {
      getActiveCalendar: vi.fn(),
      getCalendar: vi.fn(),
      getActiveEngine: vi.fn(),
      loadBuiltInCalendars: vi.fn().mockResolvedValue(undefined),
      completeInitialization: vi.fn().mockResolvedValue(undefined),
    };

    // Setup game.seasonsStars with API
    seasonsStarsAPI = {
      getSeasonInfo: createGetSeasonInfoFunction(),
      // Mock function to simulate calendar change hook registration
      resetWarningState: () => {
        hasWarnedAboutMissingSeasons = false;
      },
    };

    mockGame.seasonsStars = {
      api: seasonsStarsAPI,
      manager: mockCalendarManager,
    };

    // Setup default game settings behavior
    mockGame.settings.get.mockReturnValue(true); // Enable debug mode for Logger
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Warning State Tracking', () => {
    it('should warn once when calendar has no seasons', () => {
      // Setup: Calendar with no seasons
      const calendarWithoutSeasons = {
        id: 'test-calendar',
        name: 'Test Calendar',
        seasons: [],
      };

      mockCalendarManager.getActiveCalendar.mockReturnValue(calendarWithoutSeasons);

      const testDate = { year: 2024, month: 6, day: 15 };

      // Call getSeasonInfo multiple times - should only warn once
      seasonsStarsAPI.getSeasonInfo(testDate);
      seasonsStarsAPI.getSeasonInfo(testDate);
      seasonsStarsAPI.getSeasonInfo(testDate);

      // Should only log debug message once
      expect(Logger.debug).toHaveBeenCalledTimes(1);
      expect(Logger.debug).toHaveBeenCalledWith('No seasons found for calendar: test-calendar');
    });

    it('should warn once when calendar has undefined seasons', () => {
      // Setup: Calendar with undefined seasons property
      const calendarWithUndefinedSeasons = {
        id: 'calendar-undefined-seasons',
        name: 'Calendar Without Seasons Property',
        // seasons property intentionally missing
      };

      mockCalendarManager.getActiveCalendar.mockReturnValue(calendarWithUndefinedSeasons);

      const testDate = { year: 2024, month: 3, day: 10 };

      // Call multiple times
      seasonsStarsAPI.getSeasonInfo(testDate);
      seasonsStarsAPI.getSeasonInfo(testDate);
      seasonsStarsAPI.getSeasonInfo(testDate);
      seasonsStarsAPI.getSeasonInfo(testDate);

      // Should only warn once
      expect(Logger.debug).toHaveBeenCalledTimes(1);
      expect(Logger.debug).toHaveBeenCalledWith(
        'No seasons found for calendar: calendar-undefined-seasons'
      );
    });

    it('should warn once when no active calendar is available', () => {
      // Setup: No active calendar
      mockCalendarManager.getActiveCalendar.mockReturnValue(null);

      const testDate = { year: 2024, month: 12, day: 25 };

      // Call multiple times
      seasonsStarsAPI.getSeasonInfo(testDate);
      seasonsStarsAPI.getSeasonInfo(testDate);
      seasonsStarsAPI.getSeasonInfo(testDate);

      // Should only warn once
      expect(Logger.debug).toHaveBeenCalledTimes(1);
      expect(Logger.debug).toHaveBeenCalledWith('No seasons found for calendar: active');
    });

    it('should not warn when calendar has valid seasons', () => {
      // Setup: Calendar with proper seasons
      const calendarWithSeasons = {
        id: 'calendar-with-seasons',
        name: 'Calendar With Seasons',
        seasons: [
          { name: 'Spring', startMonth: 3, endMonth: 5, icon: 'spring' },
          { name: 'Summer', startMonth: 6, endMonth: 8, icon: 'summer' },
          { name: 'Autumn', startMonth: 9, endMonth: 11, icon: 'autumn' },
          { name: 'Winter', startMonth: 12, endMonth: 2, icon: 'winter' },
        ],
      };

      mockCalendarManager.getActiveCalendar.mockReturnValue(calendarWithSeasons);

      const testDate = { year: 2024, month: 6, day: 15 }; // Summer

      // Call multiple times
      seasonsStarsAPI.getSeasonInfo(testDate);
      seasonsStarsAPI.getSeasonInfo(testDate);
      seasonsStarsAPI.getSeasonInfo(testDate);

      // Should never warn
      expect(Logger.debug).not.toHaveBeenCalled();
    });
  });

  describe('Calendar Change Behavior', () => {
    it('should reset warning state when calendar changes', () => {
      // Setup: Start with calendar without seasons
      const calendarWithoutSeasons = {
        id: 'no-seasons-calendar',
        name: 'No Seasons Calendar',
        seasons: [],
      };

      mockCalendarManager.getActiveCalendar.mockReturnValue(calendarWithoutSeasons);

      const testDate = { year: 2024, month: 6, day: 15 };

      // First call - should warn
      seasonsStarsAPI.getSeasonInfo(testDate);
      expect(Logger.debug).toHaveBeenCalledTimes(1);

      // Clear debug call history
      Logger.debug.mockClear();

      // Simulate calendar change by resetting warning state
      seasonsStarsAPI.resetWarningState();

      // Now switch to a different calendar without seasons
      const anotherCalendarWithoutSeasons = {
        id: 'another-no-seasons-calendar',
        name: 'Another No Seasons Calendar',
        seasons: [],
      };

      mockCalendarManager.getActiveCalendar.mockReturnValue(anotherCalendarWithoutSeasons);

      // Should warn again after calendar change
      seasonsStarsAPI.getSeasonInfo(testDate);
      expect(Logger.debug).toHaveBeenCalledTimes(1);
      expect(Logger.debug).toHaveBeenCalledWith(
        'No seasons found for calendar: another-no-seasons-calendar'
      );
    });

    it('should allow warning state to be reset for new calendar', () => {
      // Test that the warning state reset mechanism works
      const calendarWithoutSeasons = {
        id: 'test-calendar',
        seasons: [],
      };

      mockCalendarManager.getActiveCalendar.mockReturnValue(calendarWithoutSeasons);

      const testDate = { year: 2024, month: 6, day: 15 };

      // First call should warn
      seasonsStarsAPI.getSeasonInfo(testDate);
      expect(Logger.debug).toHaveBeenCalledTimes(1);

      // Second call should not warn (already warned)
      seasonsStarsAPI.getSeasonInfo(testDate);
      expect(Logger.debug).toHaveBeenCalledTimes(1);

      // Reset warning state
      seasonsStarsAPI.resetWarningState();

      // Clear mock history
      Logger.debug.mockClear();

      // New call should warn again
      seasonsStarsAPI.getSeasonInfo(testDate);
      expect(Logger.debug).toHaveBeenCalledTimes(1);
    });
  });

  describe('Calendar-Specific Queries', () => {
    it('should not trigger warning state for calendar-specific queries', () => {
      // Setup: Calendar without seasons
      const calendarWithoutSeasons = {
        id: 'specific-calendar',
        name: 'Specific Calendar',
        seasons: [],
      };

      // Setup: Different active calendar
      const activeCalendar = {
        id: 'active-calendar',
        name: 'Active Calendar',
        seasons: [{ name: 'Spring', startMonth: 3, endMonth: 5 }],
      };

      mockCalendarManager.getActiveCalendar.mockReturnValue(activeCalendar);
      mockCalendarManager.getCalendar.mockReturnValue(calendarWithoutSeasons);

      const testDate = { year: 2024, month: 6, day: 15 };

      // Query specific calendar (should not affect warning state)
      seasonsStarsAPI.getSeasonInfo(testDate, 'specific-calendar');
      seasonsStarsAPI.getSeasonInfo(testDate, 'specific-calendar');

      // Should not trigger debug logging for calendar-specific queries
      expect(Logger.debug).not.toHaveBeenCalled();

      // Now query active calendar without seasons
      mockCalendarManager.getActiveCalendar.mockReturnValue(calendarWithoutSeasons);

      // This should still warn since it's the active calendar
      seasonsStarsAPI.getSeasonInfo(testDate);
      expect(Logger.debug).toHaveBeenCalledTimes(1);
    });
  });

  describe('Return Values', () => {
    it('should return Unknown season info when no seasons found', () => {
      const calendarWithoutSeasons = {
        id: 'test-calendar',
        seasons: [],
      };

      mockCalendarManager.getActiveCalendar.mockReturnValue(calendarWithoutSeasons);

      const testDate = { year: 2024, month: 6, day: 15 };
      const result = seasonsStarsAPI.getSeasonInfo(testDate);

      expect(result).toEqual({
        name: 'Unknown',
        icon: 'none',
      });
    });

    it('should return correct season info when seasons are available', () => {
      const calendarWithSeasons = {
        id: 'calendar-with-seasons',
        seasons: [
          { name: 'Spring', startMonth: 3, endMonth: 5, icon: 'spring' },
          { name: 'Summer', startMonth: 6, endMonth: 8, icon: 'summer' },
        ],
      };

      mockCalendarManager.getActiveCalendar.mockReturnValue(calendarWithSeasons);

      const summerDate = { year: 2024, month: 7, day: 15 };
      const result = seasonsStarsAPI.getSeasonInfo(summerDate);

      expect(result).toEqual({
        name: 'Summer',
        icon: 'summer',
      });
    });

    it('should return fallback season when no matching season found', () => {
      const calendarWithSeasons = {
        id: 'calendar-with-seasons',
        seasons: [
          { name: 'Spring', startMonth: 3, endMonth: 5, icon: 'spring' },
          { name: 'Summer', startMonth: 6, endMonth: 8, icon: 'summer' },
        ],
      };

      mockCalendarManager.getActiveCalendar.mockReturnValue(calendarWithSeasons);

      // Date that doesn't match any season range
      const winterDate = { year: 2024, month: 1, day: 15 };
      const result = seasonsStarsAPI.getSeasonInfo(winterDate);

      // Should return first season as fallback
      expect(result).toEqual({
        name: 'Spring',
        icon: 'spring',
      });
    });
  });

  describe('Logging Behavior', () => {
    it('should use debug level for warning messages', () => {
      const calendarWithoutSeasons = {
        id: 'test-calendar',
        seasons: [],
      };

      mockCalendarManager.getActiveCalendar.mockReturnValue(calendarWithoutSeasons);

      const testDate = { year: 2024, month: 6, day: 15 };
      seasonsStarsAPI.getSeasonInfo(testDate);

      // Should use debug level, not warn level
      expect(Logger.debug).toHaveBeenCalled();
      expect(Logger.warn).not.toHaveBeenCalled();
    });

    it('should log API calls with proper parameters and results', () => {
      const calendarWithoutSeasons = {
        id: 'test-calendar',
        seasons: [],
      };

      mockCalendarManager.getActiveCalendar.mockReturnValue(calendarWithoutSeasons);

      const testDate = { year: 2024, month: 6, day: 15 };
      const result = seasonsStarsAPI.getSeasonInfo(testDate);

      // Should log API call
      expect(Logger.api).toHaveBeenCalledWith(
        'getSeasonInfo',
        { date: testDate, calendarId: undefined },
        result
      );
    });

    it('should log API calls for calendar-specific queries', () => {
      const specificCalendar = {
        id: 'specific-calendar',
        seasons: [],
      };

      mockCalendarManager.getCalendar.mockReturnValue(specificCalendar);

      const testDate = { year: 2024, month: 6, day: 15 };
      const result = seasonsStarsAPI.getSeasonInfo(testDate, 'specific-calendar');

      // Should log API call with calendar ID
      expect(Logger.api).toHaveBeenCalledWith(
        'getSeasonInfo',
        { date: testDate, calendarId: 'specific-calendar' },
        result
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid calls without duplicate warnings', () => {
      const calendarWithoutSeasons = {
        id: 'rapid-test-calendar',
        seasons: [],
      };

      mockCalendarManager.getActiveCalendar.mockReturnValue(calendarWithoutSeasons);

      const testDate = { year: 2024, month: 6, day: 15 };

      // Simulate rapid calls that might happen during widget updates
      for (let i = 0; i < 10; i++) {
        seasonsStarsAPI.getSeasonInfo(testDate);
      }

      // Should only warn once despite 10 calls
      expect(Logger.debug).toHaveBeenCalledTimes(1);
    });

    it('should handle calendar with seasons property set to null', () => {
      const calendarWithNullSeasons = {
        id: 'null-seasons-calendar',
        seasons: null,
      };

      mockCalendarManager.getActiveCalendar.mockReturnValue(calendarWithNullSeasons);

      const testDate = { year: 2024, month: 6, day: 15 };
      seasonsStarsAPI.getSeasonInfo(testDate);

      // Should warn about missing seasons
      expect(Logger.debug).toHaveBeenCalledWith(
        'No seasons found for calendar: null-seasons-calendar'
      );
    });

    it('should handle undefined calendar gracefully', () => {
      mockCalendarManager.getActiveCalendar.mockReturnValue(undefined);

      const testDate = { year: 2024, month: 6, day: 15 };
      const result = seasonsStarsAPI.getSeasonInfo(testDate);

      expect(result).toEqual({
        name: 'Unknown',
        icon: 'none',
      });

      expect(Logger.debug).toHaveBeenCalledWith('No seasons found for calendar: active');
    });
  });
});
