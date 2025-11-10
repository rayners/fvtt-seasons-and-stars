/**
 * Test that proves Issue #363: Active calendar is being reset on Foundry reload
 *
 * The bug: completeInitialization() calls setActiveCalendar() without passing
 * saveToSettings: false, which causes it to trigger game.settings.set(),
 * which fires onChange handlers, potentially causing a reset loop.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use real TestLogger instead of mocks for better testing
import { TestLogger } from '../../../utils/test-logger';
vi.mock('../src/core/logger', () => ({
  Logger: TestLogger,
}));

import { CalendarManager } from '../../../src/core/calendar-manager';

// Mock Foundry globals
const mockSettings = {
  get: vi.fn(),
  set: vi.fn().mockResolvedValue(undefined),
};

const mockGame = {
  settings: mockSettings,
  time: {
    worldTime: 86400,
  },
  modules: {
    get: vi.fn().mockReturnValue({ active: true }),
  },
  user: {
    isGM: true,
  },
} as any;

const mockHooks = {
  on: vi.fn(),
  once: vi.fn(),
  call: vi.fn(),
  callAll: vi.fn(),
};

// Set up global mocks
globalThis.game = mockGame;
globalThis.Hooks = mockHooks;

describe('Issue #363: Calendar reset on reload', () => {
  let manager: CalendarManager;

  beforeEach(() => {
    manager = new CalendarManager();
    vi.clearAllMocks();
    TestLogger.clearLogs();
  });

  it('should not call settings.set during initialization when loading from cached calendar data', async () => {
    // Mock a cached calendar in settings (fast path with full calendar data)
    const cachedCalendar = {
      id: 'cached-calendar',
      name: 'Cached Calendar',
      version: '1.0.0',
      year: { epoch: 0, currentYear: 1 },
      months: [{ name: 'Month 1', length: 30 }],
      weekdays: [{ name: 'Day 1' }],
      timekeeping: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
      translations: { en: { label: 'Cached Calendar' } },
    };

    mockSettings.get.mockImplementation((module: string, setting: string) => {
      if (setting === 'activeCalendar') return 'cached-calendar';
      if (setting === 'activeCalendarData') return cachedCalendar;
      if (setting === 'activeCalendarFile') return '';
      if (setting === 'worldEvents') return undefined;
      return undefined;
    });

    // Clear mocks so we can see what completeInitialization does
    vi.clearAllMocks();

    // Run completeInitialization
    await manager.completeInitialization();

    // VERIFY FIX: settings.set should NOT be called during initialization
    // The cached path loads the calendar data directly and should not write back
    expect(mockSettings.set).not.toHaveBeenCalledWith(
      'seasons-and-stars',
      'activeCalendar',
      expect.anything()
    );
  });

  it('should not call settings.set during initialization when restoring saved calendar', async () => {
    // Mock a saved calendar in settings (already loaded calendar scenario)
    const testCalendar = {
      id: 'test-calendar',
      name: 'Test Calendar',
      version: '1.0.0',
      year: { epoch: 0, currentYear: 1 },
      months: [{ name: 'Month 1', length: 30 }],
      weekdays: [{ name: 'Day 1' }],
      timekeeping: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
      translations: { en: { label: 'Test Calendar' } },
    };

    mockSettings.get.mockImplementation((module: string, setting: string) => {
      if (setting === 'activeCalendar') return 'test-calendar';
      if (setting === 'activeCalendarData') return null;
      if (setting === 'activeCalendarFile') return '';
      if (setting === 'worldEvents') return undefined;
      return undefined;
    });

    // Pre-load the calendar to simulate it being discovered during initialization
    manager.loadCalendar(testCalendar as any);

    // Clear mocks so we can see what completeInitialization does
    vi.clearAllMocks();

    // Run completeInitialization
    await manager.completeInitialization();

    // VERIFY FIX: settings.set should NOT be called during initialization
    // We're already loading FROM settings, we shouldn't write BACK to settings
    // This would trigger onChange handlers and cause a reset loop
    expect(mockSettings.set).not.toHaveBeenCalledWith(
      'seasons-and-stars',
      'activeCalendar',
      expect.anything()
    );
  });

  it('should not call settings.set during initialization when defaulting to first calendar', async () => {
    // Mock no saved calendar (should default to first)
    const firstCalendar = {
      id: 'first-calendar',
      name: 'First Calendar',
      version: '1.0.0',
      year: { epoch: 0, currentYear: 1 },
      months: [{ name: 'Month 1', length: 30 }],
      weekdays: [{ name: 'Day 1' }],
      timekeeping: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
      translations: { en: { label: 'First Calendar' } },
    };

    mockSettings.get.mockImplementation((module: string, setting: string) => {
      if (setting === 'activeCalendar') return null;
      if (setting === 'activeCalendarData') return null;
      if (setting === 'activeCalendarFile') return '';
      if (setting === 'worldEvents') return undefined;
      return undefined;
    });

    // Pre-load the calendar to simulate it being discovered during initialization
    manager.loadCalendar(firstCalendar as any);

    // Clear mocks so we can see what completeInitialization does
    vi.clearAllMocks();

    // Run completeInitialization
    await manager.completeInitialization();

    // VERIFY FIX: settings.set should NOT be called during initialization
    // Even when defaulting to first calendar, we shouldn't save during init
    expect(mockSettings.set).not.toHaveBeenCalledWith(
      'seasons-and-stars',
      'activeCalendar',
      expect.anything()
    );
  });

  it('should not call settings.set during initialization when loading from custom file', async () => {
    // Mock file-based calendar configuration
    const fileCalendar = {
      id: 'custom-file-calendar',
      name: 'Custom File Calendar',
      version: '1.0.0',
      year: { epoch: 0, currentYear: 1 },
      months: [{ name: 'Month 1', length: 30 }],
      weekdays: [{ name: 'Day 1' }],
      timekeeping: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
      translations: { en: { label: 'Custom File Calendar' } },
    };

    mockSettings.get.mockImplementation((module: string, setting: string) => {
      if (setting === 'activeCalendarFile') return 'calendars/custom-calendar.json';
      if (setting === 'activeCalendar') return null;
      if (setting === 'activeCalendarData') return null;
      if (setting === 'worldEvents') return undefined;
      return undefined;
    });

    // Mock convertFoundryPathToUrl to return a URL
    vi.spyOn(manager, 'convertFoundryPathToUrl').mockReturnValue(
      'http://localhost/calendars/custom-calendar.json'
    );

    // Mock loadCalendarFromUrl to simulate the file load and calendar registration
    vi.spyOn(manager, 'loadCalendarFromUrl').mockImplementation(async () => {
      // Simulate what loadCalendarFromUrl does: loads and registers the calendar
      manager.loadCalendar(fileCalendar as any);
      return {
        success: true,
        calendar: fileCalendar as any,
      };
    });

    // Clear mocks to track what completeInitialization does
    vi.clearAllMocks();

    // Run completeInitialization
    await manager.completeInitialization();

    // VERIFY FIX: settings.set should NOT be called with activeCalendar during file-based initialization
    // When loading from a file, we should not write the calendar ID back to the activeCalendar setting
    // This would trigger onChange handlers and cause a reset loop
    expect(mockSettings.set).not.toHaveBeenCalledWith(
      'seasons-and-stars',
      'activeCalendar',
      expect.anything()
    );
  });
});
