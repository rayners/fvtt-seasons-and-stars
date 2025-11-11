/**
 * Test external calendar registration hook functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarManager } from '../../../src/core/calendar-manager';
import type { SeasonsStarsCalendar, CalendarSourceInfo } from '../../../src/types/calendar';

// Mock global Foundry objects
global.game = {
  settings: {
    get: vi.fn(),
    set: vi.fn(),
  },
  modules: {
    get: vi.fn(),
  },
} as any;

global.Hooks = {
  callAll: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
} as any;

global.ui = {
  notifications: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
} as any;

describe('External Calendar Registration Hook', () => {
  let manager: CalendarManager;
  let hookCallback: any;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new CalendarManager();
    hookCallback = undefined;

    // Capture calls to the registration hook without conditional logic
    (global.Hooks.callAll as any).mockImplementation(() => {});
  });

  it('should fire registration hook during initialization', async () => {
    // Mock the calendar loading to prevent actual file loading
    vi.spyOn(manager as any, 'loadBuiltInCalendars').mockResolvedValue(undefined);
    vi.spyOn(manager as any, 'completeInitialization').mockResolvedValue(undefined);

    await manager.initialize();

    expect(global.Hooks.callAll).toHaveBeenCalledWith(
      'seasons-stars:registerExternalCalendars',
      expect.objectContaining({
        registerCalendar: expect.any(Function),
        manager: manager,
      })
    );
  });

  it('should provide working registration callback', async () => {
    // Initialize to get the hook callback
    vi.spyOn(manager as any, 'loadBuiltInCalendars').mockResolvedValue(undefined);
    vi.spyOn(manager as any, 'completeInitialization').mockResolvedValue(undefined);

    await manager.initialize();
    hookCallback = (global.Hooks.callAll as any).mock.calls.find(
      ([hookName]: any[]) => hookName === 'seasons-stars:registerExternalCalendars'
    )[1];

    // Ensure we captured the hook callback
    expect(hookCallback).toBeDefined();
    expect(hookCallback.registerCalendar).toBeInstanceOf(Function);

    // Mock the loadCalendar method to test the registration
    vi.spyOn(manager, 'loadCalendar').mockReturnValue(true);

    // Create test calendar data
    const testCalendar: SeasonsStarsCalendar = {
      id: 'test-external-calendar',
      translations: {
        en: {
          label: 'Test External Calendar',
          description: 'Calendar registered via external hook',
        },
      },
      year: {
        epoch: 0,
        currentYear: 2024,
        prefix: '',
        suffix: '',
        startDay: 1,
      },
      leapYear: {
        rule: 'none',
      },
      months: [
        {
          name: 'January',
          days: 31,
        },
      ],
      weekdays: [
        {
          name: 'Monday',
        },
      ],
      intercalary: [],
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      },
    };

    const sourceInfo: CalendarSourceInfo = {
      type: 'module',
      sourceName: 'Simple Calendar',
      description: 'Calendar from Simple Calendar module',
      icon: 'fa-solid fa-puzzle-piece',
      moduleId: 'simple-calendar',
    };

    // Call the registration callback
    const success = hookCallback.registerCalendar(testCalendar, sourceInfo);

    // Verify the registration was successful
    expect(success).toBe(true);
    expect(manager.loadCalendar).toHaveBeenCalledWith(testCalendar, sourceInfo);
  });

  it('should reject invalid calendar data', async () => {
    // Initialize to get the hook callback
    vi.spyOn(manager as any, 'loadBuiltInCalendars').mockResolvedValue(undefined);
    vi.spyOn(manager as any, 'completeInitialization').mockResolvedValue(undefined);

    await manager.initialize();
    hookCallback = (global.Hooks.callAll as any).mock.calls.find(
      ([hookName]: any[]) => hookName === 'seasons-stars:registerExternalCalendars'
    )[1];

    // Test with invalid data (missing id)
    const invalidCalendar = {
      translations: {
        en: { label: 'Invalid Calendar' },
      },
    } as any;

    const success = hookCallback.registerCalendar(invalidCalendar);
    expect(success).toBe(false);
  });

  it('should handle registration failures gracefully', async () => {
    // Initialize to get the hook callback
    vi.spyOn(manager as any, 'loadBuiltInCalendars').mockResolvedValue(undefined);
    vi.spyOn(manager as any, 'completeInitialization').mockResolvedValue(undefined);

    await manager.initialize();
    hookCallback = (global.Hooks.callAll as any).mock.calls.find(
      ([hookName]: any[]) => hookName === 'seasons-stars:registerExternalCalendars'
    )[1];

    // Mock loadCalendar to return false (validation failure)
    vi.spyOn(manager, 'loadCalendar').mockReturnValue(false);

    const testCalendar: SeasonsStarsCalendar = {
      id: 'test-failing-calendar',
      translations: { en: { label: 'Test Calendar' } },
      year: { epoch: 0, currentYear: 2024, prefix: '', suffix: '', startDay: 1 },
      leapYear: { rule: 'none' },
      months: [{ name: 'January', days: 31 }],
      weekdays: [{ name: 'Monday' }],
      intercalary: [],
      time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
    };

    const success = hookCallback.registerCalendar(testCalendar);
    expect(success).toBe(false);
  });
});
