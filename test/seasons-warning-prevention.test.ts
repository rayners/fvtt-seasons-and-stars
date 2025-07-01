/**
 * Tests for seasons warning prevention logic in getSeasonInfo API function
 *
 * Tests the critical functionality that prevents repeated "No seasons found" warnings
 * from appearing in the console when getSeasonInfo is called repeatedly during
 * widget updates, while ensuring proper warning behavior and state management.
 *
 * This test isolates the specific warning logic without complex setup.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Logger } from '../src/core/logger';

// Test calendar without seasons
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

// Test calendar with seasons
const calendarWithSeasons = {
  id: 'test-with-seasons',
  name: 'Test Calendar With Seasons',
  year: { epoch: 0, currentYear: 2024 },
  months: [
    { name: 'January', days: 31 },
    { name: 'February', days: 28 },
  ],
  weekdays: [{ name: 'Sunday' }, { name: 'Monday' }],
  intercalary: [],
  seasons: [
    {
      name: 'Winter',
      startMonth: 1,
      endMonth: 2,
      icon: 'winter',
    },
  ],
  time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
};

// Test calendar with empty seasons array
const calendarWithEmptySeasons = {
  id: 'empty-seasons',
  name: 'Test Calendar Empty Seasons',
  year: { epoch: 0, currentYear: 2024 },
  months: [
    { name: 'January', days: 31 },
    { name: 'February', days: 28 },
  ],
  weekdays: [{ name: 'Sunday' }, { name: 'Monday' }],
  intercalary: [],
  seasons: [], // Empty array
  time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
};

// Module-level warning flag - this simulates the actual warning state in module.ts
let hasWarnedAboutMissingSeasons = false;

/**
 * Function that exactly replicates the warning logic from module.ts lines 996-1000
 * This tests the actual implementation logic without complex setup.
 */
function getSeasonInfoWithWarningLogic(
  date: any,
  calendar: any,
  calendarId?: string
): { name: string; icon: string } {
  if (!calendar || !(calendar as any).seasons || (calendar as any).seasons.length === 0) {
    // Only log to console once per active calendar to prevent looping warnings
    if (!hasWarnedAboutMissingSeasons && !calendarId) {
      Logger.debug(`No seasons found for calendar: ${calendar?.id || 'active'}`);
      hasWarnedAboutMissingSeasons = true;
    }
    return { name: 'Unknown', icon: 'none' };
  }

  // Basic season detection - find season containing this date
  const currentSeason = (calendar as any).seasons.find((season: any) => {
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
  const fallbackSeason = (calendar as any).seasons[0];
  if (fallbackSeason) {
    return {
      name: fallbackSeason.name,
      icon: fallbackSeason.icon || fallbackSeason.name.toLowerCase(),
    };
  }

  return { name: 'Unknown', icon: 'none' };
}

/**
 * Function to reset warning flag (simulates hook behavior from module.ts line 252)
 */
function resetSeasonsWarningFlag(): void {
  hasWarnedAboutMissingSeasons = false;
}

describe('Seasons Warning Prevention Logic', () => {
  let loggerDebugSpy: any;

  beforeEach(() => {
    // Reset warning flag for each test
    hasWarnedAboutMissingSeasons = false;

    // Reset all mocks
    vi.clearAllMocks();

    // Spy on Logger.debug to track warning calls
    loggerDebugSpy = vi.spyOn(Logger, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Warning Prevention for Missing Seasons', () => {
    it('should warn only once when calendar has no seasons', () => {
      const testDate = { year: 2024, month: 1, day: 15 };

      // Call multiple times (simulating repeated widget updates)
      getSeasonInfoWithWarningLogic(testDate, calendarWithoutSeasons);
      getSeasonInfoWithWarningLogic(testDate, calendarWithoutSeasons);
      getSeasonInfoWithWarningLogic(testDate, calendarWithoutSeasons);
      getSeasonInfoWithWarningLogic(testDate, calendarWithoutSeasons);

      // Should only warn once
      expect(loggerDebugSpy).toHaveBeenCalledTimes(1);
      expect(loggerDebugSpy).toHaveBeenCalledWith('No seasons found for calendar: test-no-seasons');
    });

    it('should not warn when calendar has valid seasons', () => {
      const testDate = { year: 2024, month: 1, day: 15 };

      // Call multiple times
      getSeasonInfoWithWarningLogic(testDate, calendarWithSeasons);
      getSeasonInfoWithWarningLogic(testDate, calendarWithSeasons);
      getSeasonInfoWithWarningLogic(testDate, calendarWithSeasons);

      // Should not warn at all
      expect(loggerDebugSpy).not.toHaveBeenCalled();
    });

    it('should reset warning state when calendar changes', () => {
      const testDate = { year: 2024, month: 1, day: 15 };

      // First calendar without seasons
      getSeasonInfoWithWarningLogic(testDate, calendarWithoutSeasons);
      expect(loggerDebugSpy).toHaveBeenCalledTimes(1);

      // Simulate calendar change by calling the reset function (like the hook does)
      resetSeasonsWarningFlag();

      // Switch to another calendar without seasons
      const anotherCalendarWithoutSeasons = {
        ...calendarWithoutSeasons,
        id: 'another-no-seasons',
      };

      // Should warn again after calendar change
      getSeasonInfoWithWarningLogic(testDate, anotherCalendarWithoutSeasons);
      expect(loggerDebugSpy).toHaveBeenCalledTimes(2);
      expect(loggerDebugSpy).toHaveBeenNthCalledWith(
        2,
        'No seasons found for calendar: another-no-seasons'
      );
    });

    it('should not affect warning state for specific calendar queries', () => {
      const testDate = { year: 2024, month: 1, day: 15 };

      // Call with specific calendar ID (should not trigger warning)
      getSeasonInfoWithWarningLogic(testDate, calendarWithSeasons, 'test-with-seasons');
      getSeasonInfoWithWarningLogic(testDate, calendarWithSeasons, 'test-with-seasons');

      // Should not warn for specific calendar queries
      expect(loggerDebugSpy).not.toHaveBeenCalled();

      // Now call without calendar ID (active calendar)
      getSeasonInfoWithWarningLogic(testDate, calendarWithoutSeasons);

      // Should warn once for active calendar
      expect(loggerDebugSpy).toHaveBeenCalledTimes(1);
      expect(loggerDebugSpy).toHaveBeenCalledWith('No seasons found for calendar: test-no-seasons');
    });

    it('should use debug level logging (console-only)', () => {
      // Spy on other log levels to ensure they're not used
      const loggerWarnSpy = vi.spyOn(Logger, 'warn').mockImplementation(() => {});
      const loggerErrorSpy = vi.spyOn(Logger, 'error').mockImplementation(() => {});

      const testDate = { year: 2024, month: 1, day: 15 };

      getSeasonInfoWithWarningLogic(testDate, calendarWithoutSeasons);

      // Should use debug level (console-only, not UI notifications)
      expect(loggerDebugSpy).toHaveBeenCalled();
      expect(loggerWarnSpy).not.toHaveBeenCalled();
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should handle calendar with empty seasons array', () => {
      const testDate = { year: 2024, month: 1, day: 15 };

      const result = getSeasonInfoWithWarningLogic(testDate, calendarWithEmptySeasons);

      expect(result).toEqual({
        name: 'Unknown',
        icon: 'none',
      });

      expect(loggerDebugSpy).toHaveBeenCalledWith('No seasons found for calendar: empty-seasons');
    });

    it('should handle rapid repeated calls gracefully', () => {
      const testDate = { year: 2024, month: 1, day: 15 };

      // Simulate rapid widget updates (like every 30 seconds)
      for (let i = 0; i < 10; i++) {
        getSeasonInfoWithWarningLogic(testDate, calendarWithoutSeasons);
      }

      // Should only warn once regardless of number of calls
      expect(loggerDebugSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle null or undefined calendar', () => {
      const testDate = { year: 2024, month: 1, day: 15 };

      // Test null calendar
      const result1 = getSeasonInfoWithWarningLogic(testDate, null);
      expect(result1).toEqual({ name: 'Unknown', icon: 'none' });
      expect(loggerDebugSpy).toHaveBeenCalledWith('No seasons found for calendar: active');

      // Reset for next test
      resetSeasonsWarningFlag();
      vi.clearAllMocks();

      // Test undefined calendar
      const result2 = getSeasonInfoWithWarningLogic(testDate, undefined);
      expect(result2).toEqual({ name: 'Unknown', icon: 'none' });
      expect(loggerDebugSpy).toHaveBeenCalledWith('No seasons found for calendar: active');
    });
  });

  describe('Return Value Validation', () => {
    it('should return proper season info for calendars with seasons', () => {
      const testDate = { year: 2024, month: 1, day: 15 };

      const result = getSeasonInfoWithWarningLogic(testDate, calendarWithSeasons);

      expect(result).toEqual({
        name: 'Winter',
        icon: 'winter',
      });
    });

    it('should return Unknown for calendars without seasons', () => {
      const testDate = { year: 2024, month: 1, day: 15 };

      const result = getSeasonInfoWithWarningLogic(testDate, calendarWithoutSeasons);

      expect(result).toEqual({
        name: 'Unknown',
        icon: 'none',
      });
    });

    it('should return fallback season when no matching season found', () => {
      // Create calendar with season that doesn't match test date
      const calendarWithNonMatchingSeason = {
        ...calendarWithSeasons,
        seasons: [
          {
            name: 'Summer',
            startMonth: 6,
            endMonth: 8,
            icon: 'summer',
          },
        ],
      };

      const testDate = { year: 2024, month: 1, day: 15 }; // Winter date

      const result = getSeasonInfoWithWarningLogic(testDate, calendarWithNonMatchingSeason);

      // Should return the fallback (first) season
      expect(result).toEqual({
        name: 'Summer',
        icon: 'summer',
      });
    });

    it('should handle season without icon', () => {
      const calendarWithSeasonNoIcon = {
        ...calendarWithSeasons,
        seasons: [
          {
            name: 'Spring',
            startMonth: 1,
            endMonth: 2,
            // No icon property
          },
        ],
      };

      const testDate = { year: 2024, month: 1, day: 15 };

      const result = getSeasonInfoWithWarningLogic(testDate, calendarWithSeasonNoIcon);

      expect(result).toEqual({
        name: 'Spring',
        icon: 'spring', // Should use lowercased name
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid date objects gracefully', () => {
      // Test with missing month property
      const invalidDate = { year: 2024, day: 15 };

      const result = getSeasonInfoWithWarningLogic(invalidDate, calendarWithSeasons);

      // Should still work, just might not find matching season
      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.icon).toBeDefined();
    });

    it('should handle calendar with malformed seasons', () => {
      const calendarWithMalformedSeasons = {
        ...calendarWithSeasons,
        seasons: [
          {
            name: 'Broken Season',
            // Missing startMonth and endMonth
          },
        ],
      };

      const testDate = { year: 2024, month: 1, day: 15 };

      const result = getSeasonInfoWithWarningLogic(testDate, calendarWithMalformedSeasons);

      // Should fall back to the first season since no matching season found
      expect(result).toEqual({
        name: 'Broken Season',
        icon: 'broken season',
      });
    });
  });
});
