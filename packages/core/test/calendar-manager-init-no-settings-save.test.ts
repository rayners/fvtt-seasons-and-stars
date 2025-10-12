/**
 * Test that proves Issue #363: Active calendar is being reset on Foundry reload
 *
 * The bug: completeInitialization() calls setActiveCalendar() without passing
 * saveToSettings: false, which causes it to trigger game.settings.set(),
 * which fires onChange handlers, potentially causing a reset loop.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use real TestLogger instead of mocks for better testing
import { TestLogger } from './utils/test-logger';
vi.mock('../src/core/logger', () => ({
  Logger: TestLogger,
}));

import { CalendarManager } from '../src/core/calendar-manager';

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

  it('should call setActiveCalendar with saveToSettings=false when restoring saved calendar', async () => {
    // Mock a saved calendar in settings
    mockSettings.get.mockImplementation((module: string, setting: string) => {
      if (setting === 'activeCalendar') return 'test-calendar';
      if (setting === 'activeCalendarData') return null; // No cache, so it goes to line 185
      if (setting === 'worldEvents') return undefined;
      return undefined;
    });

    // Mock a calendar that exists in the manager
    const mockCalendar = { id: 'test-calendar', name: 'Test Calendar' };
    manager.calendars.set('test-calendar', mockCalendar as any);
    manager.engines.set('test-calendar', {} as any);

    // Spy on setActiveCalendar to verify it's called with correct parameters
    const setActiveCalendarSpy = vi.spyOn(manager, 'setActiveCalendar');

    // Run completeInitialization
    await manager.completeInitialization();

    // BUG: Currently setActiveCalendar is called WITHOUT saveToSettings parameter
    // which defaults to true, causing settings.set() to be called
    expect(setActiveCalendarSpy).toHaveBeenCalledWith('test-calendar', false);
  });

  it('should call setActiveCalendar with saveToSettings=false when defaulting to first calendar', async () => {
    // Mock no saved calendar (should default to first)
    mockSettings.get.mockImplementation((module: string, setting: string) => {
      if (setting === 'activeCalendar') return null;
      if (setting === 'activeCalendarData') return null;
      if (setting === 'worldEvents') return undefined;
      return undefined;
    });

    // Mock a calendar that exists in the manager
    const mockCalendar = { id: 'first-calendar', name: 'First Calendar' };
    manager.calendars.set('first-calendar', mockCalendar as any);
    manager.engines.set('first-calendar', {} as any);

    // Spy on setActiveCalendar to verify it's called with correct parameters
    const setActiveCalendarSpy = vi.spyOn(manager, 'setActiveCalendar');

    // Run completeInitialization
    await manager.completeInitialization();

    // BUG: Currently setActiveCalendar is called WITHOUT saveToSettings parameter
    // which defaults to true, causing settings.set() to be called
    expect(setActiveCalendarSpy).toHaveBeenCalledWith('first-calendar', false);
  });

  it('demonstrates the bug: settings.set IS called during initialization (should NOT be)', async () => {
    // Mock a saved calendar in settings
    mockSettings.get.mockImplementation((module: string, setting: string) => {
      if (setting === 'activeCalendar') return 'test-calendar';
      if (setting === 'activeCalendarData') return null;
      if (setting === 'worldEvents') return undefined;
      return undefined;
    });

    // Mock a calendar that exists in the manager
    const mockCalendar = { id: 'test-calendar', name: 'Test Calendar' };
    manager.calendars.set('test-calendar', mockCalendar as any);
    manager.engines.set('test-calendar', {} as any);

    // Clear mocks so we can see what completeInitialization does
    vi.clearAllMocks();

    // Run completeInitialization
    await manager.completeInitialization();

    // BUG: settings.set SHOULD NOT be called during initialization
    // We're already loading FROM settings, we shouldn't write BACK to settings
    // This causes onChange handlers to fire, leading to the reset bug
    expect(mockSettings.set).not.toHaveBeenCalledWith(
      'seasons-and-stars',
      'activeCalendar',
      expect.anything()
    );
  });
});
