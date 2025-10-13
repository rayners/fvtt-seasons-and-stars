/**
 * Tests for CalendarManager hook payload structure
 *
 * Verifies that calendarChanged hook fires with correct payload structure
 * including oldCalendarId, newCalendarId, and calendar data.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use real TestLogger instead of mocks for better testing
import { TestLogger } from './utils/test-logger';
vi.mock('../src/core/logger', () => ({
  Logger: TestLogger,
}));

import { CalendarManager } from '../src/core/calendar-manager';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Mock Foundry globals
const mockSettings = {
  get: vi.fn(),
  set: vi.fn(),
};

const mockGame = {
  settings: mockSettings,
  time: {
    worldTime: 86400,
  },
  modules: {
    get: vi.fn().mockReturnValue({ active: true }),
    values: vi.fn().mockReturnValue([]),
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

// Simple test calendar data
const testCalendar: SeasonsStarsCalendar = {
  id: 'test-calendar',
  name: 'Test Calendar',
  translations: {
    en: {
      label: 'Test Calendar',
    },
  },
  year: {
    epoch: 0,
    currentYear: 1,
  },
  months: [
    {
      name: 'January',
      days: 30,
    },
  ],
  weekdays: [
    { name: 'Monday' },
    { name: 'Tuesday' },
    { name: 'Wednesday' },
    { name: 'Thursday' },
    { name: 'Friday' },
    { name: 'Saturday' },
    { name: 'Sunday' },
  ],
  worldTime: {
    secondsInMinute: 60,
    minutesInHour: 60,
    hoursInDay: 24,
    dayOfWeek: 0,
    epochYear: 0,
    currentYear: 1,
    currentMonth: 1,
    currentDay: 1,
    currentHour: 0,
    currentMinute: 0,
    currentSecond: 0,
  },
};

const secondCalendar: SeasonsStarsCalendar = {
  ...testCalendar,
  id: 'second-calendar',
  name: 'Second Calendar',
  translations: {
    en: {
      label: 'Second Calendar',
    },
  },
};

describe('CalendarManager Hook Payload Structure', () => {
  let manager: CalendarManager;

  beforeEach(() => {
    manager = new CalendarManager();
    vi.clearAllMocks();
    TestLogger.clearLogs();

    // Mock settings to return null by default
    mockSettings.get.mockReturnValue(null);
  });

  describe('setActiveCalendarSync hook payload', () => {
    it('should include oldCalendarId and reason when calendar is initially null', () => {
      // Load calendar
      manager.loadCalendar(testCalendar);

      // Set active calendar
      manager.setActiveCalendarSync(testCalendar.id);

      // Verify hook was called with correct payload including reason
      expect(mockHooks.callAll).toHaveBeenCalledWith('seasons-stars:calendarChanged', {
        oldCalendarId: null,
        newCalendarId: testCalendar.id,
        calendar: testCalendar,
        reason: 'initialization',
      });
    });

    it('should include oldCalendarId and reason when switching calendars', () => {
      // Load both calendars
      manager.loadCalendar(testCalendar);
      manager.loadCalendar(secondCalendar);

      // Set first calendar
      manager.setActiveCalendarSync(testCalendar.id);
      mockHooks.callAll.mockClear();

      // Switch to second calendar
      manager.setActiveCalendarSync(secondCalendar.id);

      // Verify hook was called with oldCalendarId and initialization reason
      expect(mockHooks.callAll).toHaveBeenCalledWith('seasons-stars:calendarChanged', {
        oldCalendarId: testCalendar.id,
        newCalendarId: secondCalendar.id,
        calendar: secondCalendar,
        reason: 'initialization',
      });
    });
  });

  describe('setActiveCalendar hook payload', () => {
    it('should include oldCalendarId and reason when calendar is initially null', async () => {
      // Load calendar
      manager.loadCalendar(testCalendar);

      // Set active calendar (uses default 'settings-sync' reason)
      await manager.setActiveCalendar(testCalendar.id);

      // Verify hook was called with correct payload including oldCalendarId and reason
      expect(mockHooks.callAll).toHaveBeenCalledWith('seasons-stars:calendarChanged', {
        oldCalendarId: null,
        newCalendarId: testCalendar.id,
        calendar: testCalendar,
        reason: 'settings-sync',
      });
    });

    it('should include oldCalendarId and reason when switching calendars', async () => {
      // Load both calendars
      manager.loadCalendar(testCalendar);
      manager.loadCalendar(secondCalendar);

      // Set first calendar
      await manager.setActiveCalendar(testCalendar.id);
      mockHooks.callAll.mockClear();

      // Switch to second calendar
      await manager.setActiveCalendar(secondCalendar.id);

      // Verify hook was called with oldCalendarId and settings-sync reason
      expect(mockHooks.callAll).toHaveBeenCalledWith('seasons-stars:calendarChanged', {
        oldCalendarId: testCalendar.id,
        newCalendarId: secondCalendar.id,
        calendar: secondCalendar,
        reason: 'settings-sync',
      });
    });

    it('should use user-change reason when explicitly provided', async () => {
      // Load calendar
      manager.loadCalendar(testCalendar);

      // Set active calendar with explicit user-change reason
      await manager.setActiveCalendar(testCalendar.id, true, 'user-change');

      // Verify hook was called with user-change reason
      expect(mockHooks.callAll).toHaveBeenCalledWith('seasons-stars:calendarChanged', {
        oldCalendarId: null,
        newCalendarId: testCalendar.id,
        calendar: testCalendar,
        reason: 'user-change',
      });
    });
  });

  describe('hook payload consistency', () => {
    it('should have identical payload structure between sync and async methods', async () => {
      // Load calendars
      manager.loadCalendar(testCalendar);
      manager.loadCalendar(secondCalendar);

      // Test sync method
      manager.setActiveCalendarSync(testCalendar.id);
      const syncPayload = mockHooks.callAll.mock.calls[0][1];

      mockHooks.callAll.mockClear();

      // Reset manager for async test
      const manager2 = new CalendarManager();
      manager2.loadCalendar(testCalendar);
      manager2.loadCalendar(secondCalendar);

      // Test async method
      await manager2.setActiveCalendar(testCalendar.id);
      const asyncPayload = mockHooks.callAll.mock.calls[0][1];

      // Verify both payloads have the same structure
      expect(Object.keys(syncPayload).sort()).toEqual(Object.keys(asyncPayload).sort());
      expect(syncPayload).toHaveProperty('oldCalendarId');
      expect(syncPayload).toHaveProperty('newCalendarId');
      expect(syncPayload).toHaveProperty('calendar');
      expect(syncPayload).toHaveProperty('reason');
      expect(asyncPayload).toHaveProperty('oldCalendarId');
      expect(asyncPayload).toHaveProperty('newCalendarId');
      expect(asyncPayload).toHaveProperty('calendar');
      expect(asyncPayload).toHaveProperty('reason');
    });
  });

  describe('hook deduplication', () => {
    it('should not fire hook when setting same calendar via sync method', () => {
      // Load calendar
      manager.loadCalendar(testCalendar);

      // Set calendar first time
      manager.setActiveCalendarSync(testCalendar.id);
      expect(mockHooks.callAll).toHaveBeenCalledTimes(1);

      mockHooks.callAll.mockClear();

      // Set same calendar again
      manager.setActiveCalendarSync(testCalendar.id);

      // Hook should not fire
      expect(mockHooks.callAll).not.toHaveBeenCalled();
    });

    it('should not fire hook when setting same calendar via async method', async () => {
      // Load calendar
      manager.loadCalendar(testCalendar);

      // Set calendar first time
      await manager.setActiveCalendar(testCalendar.id);
      expect(mockHooks.callAll).toHaveBeenCalledTimes(1);

      mockHooks.callAll.mockClear();

      // Set same calendar again
      await manager.setActiveCalendar(testCalendar.id);

      // Hook should not fire
      expect(mockHooks.callAll).not.toHaveBeenCalled();
    });

    it('should prevent duplicate hooks during initialization sequence', async () => {
      // Simulate initialization sequence where both sync and async might set same calendar
      manager.loadCalendar(testCalendar);

      // First: sync initialization (like during init hook)
      manager.setActiveCalendarSync(testCalendar.id);
      expect(mockHooks.callAll).toHaveBeenCalledTimes(1);

      mockHooks.callAll.mockClear();

      // Second: async initialization (like during ready hook with same calendar)
      await manager.setActiveCalendar(testCalendar.id);

      // Hook should not fire again since calendar hasn't changed
      expect(mockHooks.callAll).not.toHaveBeenCalled();
    });
  });
});
