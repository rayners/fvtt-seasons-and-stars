/**
 * Tests for CalendarManager lazy EventsManager initialization
 *
 * Tests the on-demand creation of EventsManager when getActiveEventsManager()
 * is called before full initialization completes, preventing race condition warnings.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use real TestLogger instead of mocks for better testing
import { TestLogger } from '../../../utils/test-logger';
vi.mock('../src/core/logger', () => ({
  Logger: TestLogger,
}));

import { CalendarManager } from '../../../src/core/calendar-manager';
import { CalendarEngine } from '../../../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';

// Test calendar with minimal structure
const testCalendar: SeasonsStarsCalendar = {
  id: 'test-calendar',
  translations: {
    en: {
      label: 'Test Calendar',
      description: 'Test calendar for lazy initialization',
      setting: 'Test',
    },
  },
  year: {
    epoch: 2024,
    currentYear: 2024,
    prefix: '',
    suffix: '',
    startDay: 1,
  },
  leapYear: {
    rule: 'none',
  },
  months: [
    { name: 'January', days: 31 },
    { name: 'February', days: 28 },
    { name: 'March', days: 31 },
  ],
  weekdays: [{ name: 'Monday' }, { name: 'Tuesday' }, { name: 'Wednesday' }],
  intercalary: [],
  time: {
    hoursInDay: 24,
    minutesInHour: 60,
    secondsInMinute: 60,
  },
  events: [
    {
      id: 'test-event',
      name: 'Test Event',
      recurrence: { type: 'fixed', month: 1, day: 1 },
    },
  ],
};

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

describe('CalendarManager - Lazy EventsManager Initialization', () => {
  let manager: CalendarManager;

  beforeEach(() => {
    manager = new CalendarManager();
    vi.clearAllMocks();
    TestLogger.clearLogs();

    // Set up world events setting
    mockSettings.get.mockImplementation((module: string, setting: string) => {
      if (setting === 'worldEvents') {
        return {
          events: [
            {
              id: 'world-event',
              name: 'World Event',
              recurrence: { type: 'fixed', month: 2, day: 15 },
            },
          ],
          disabledEventIds: [],
        };
      }
      return undefined;
    });
  });

  describe('getActiveEventsManager() - basic behavior', () => {
    it('should return null when no active calendar is set', () => {
      const eventsManager = manager.getActiveEventsManager();
      expect(eventsManager).toBeNull();
    });

    it('should return null when active calendar exists but calendar not loaded', () => {
      // Set active calendar ID but don't load the calendar
      manager['activeCalendarId'] = 'missing-calendar';

      const eventsManager = manager.getActiveEventsManager();
      expect(eventsManager).toBeNull();
    });

    it('should return null when calendar exists but engine not loaded', () => {
      // Manually set calendar without engine
      manager['activeCalendarId'] = testCalendar.id;
      manager.calendars.set(testCalendar.id, testCalendar);

      const eventsManager = manager.getActiveEventsManager();
      expect(eventsManager).toBeNull();
    });
  });

  describe('getActiveEventsManager() - lazy initialization', () => {
    it('should create EventsManager on-demand when calendar and engine exist', () => {
      // Manually set up calendar and engine (simulating partial initialization)
      manager['activeCalendarId'] = testCalendar.id;
      manager.calendars.set(testCalendar.id, testCalendar);
      const engine = new CalendarEngine(testCalendar);
      manager.engines.set(testCalendar.id, engine);

      // EventsManager should not exist yet
      expect(manager['eventsManagers'].has(testCalendar.id)).toBe(false);

      // First call creates it
      const eventsManager = manager.getActiveEventsManager();

      expect(eventsManager).not.toBeNull();
      expect(manager['eventsManagers'].has(testCalendar.id)).toBe(true);
      expect(TestLogger.getLogsContaining('Creating EventsManager on-demand').length).toBe(1);
    });

    it('should return existing EventsManager if already created', () => {
      // Set up calendar, engine, and EventsManager
      manager['activeCalendarId'] = testCalendar.id;
      manager.calendars.set(testCalendar.id, testCalendar);
      const engine = new CalendarEngine(testCalendar);
      manager.engines.set(testCalendar.id, engine);

      // Create EventsManager through first call
      const firstCall = manager.getActiveEventsManager();

      // Clear logs to verify second call doesn't log creation
      TestLogger.clearLogs();

      // Second call returns same instance
      const secondCall = manager.getActiveEventsManager();

      expect(secondCall).toBe(firstCall);
      expect(TestLogger.getLogsContaining('Creating EventsManager on-demand').length).toBe(0);
    });

    it('should load world events when creating EventsManager on-demand', () => {
      // Set up calendar and engine
      manager['activeCalendarId'] = testCalendar.id;
      manager.calendars.set(testCalendar.id, testCalendar);
      const engine = new CalendarEngine(testCalendar);
      manager.engines.set(testCalendar.id, engine);

      // Get EventsManager (triggers lazy creation)
      const eventsManager = manager.getActiveEventsManager();

      expect(eventsManager).not.toBeNull();
      expect(mockSettings.get).toHaveBeenCalledWith('seasons-and-stars', 'worldEvents');

      // Verify world events were loaded
      const allEvents = eventsManager!.getAllEvents();
      const worldEvent = allEvents.find(e => e.id === 'world-event');
      expect(worldEvent).toBeDefined();
      expect(worldEvent?.name).toBe('World Event');
    });

    it('should handle missing world events setting gracefully', () => {
      // Mock no world events
      mockSettings.get.mockReturnValue(undefined);

      // Set up calendar and engine
      manager['activeCalendarId'] = testCalendar.id;
      manager.calendars.set(testCalendar.id, testCalendar);
      const engine = new CalendarEngine(testCalendar);
      manager.engines.set(testCalendar.id, engine);

      // Get EventsManager (triggers lazy creation)
      const eventsManager = manager.getActiveEventsManager();

      expect(eventsManager).not.toBeNull();

      // Should only have calendar events, not world events
      const allEvents = eventsManager!.getAllEvents();
      expect(allEvents).toHaveLength(1);
      expect(allEvents[0].id).toBe('test-event');
    });
  });

  describe('getActiveEventsManager() - race condition prevention', () => {
    it('should handle call before EventsManager creation completes', () => {
      // This simulates the race condition: calendar and engine exist,
      // but EventsManager hasn't been created yet (e.g., during async init)
      manager['activeCalendarId'] = testCalendar.id;
      manager.calendars.set(testCalendar.id, testCalendar);
      const engine = new CalendarEngine(testCalendar);
      manager.engines.set(testCalendar.id, engine);

      // Verify no EventsManager exists yet
      expect(manager['eventsManagers'].has(testCalendar.id)).toBe(false);

      // This would previously have returned null and logged a warning
      // Now it creates the EventsManager on-demand
      const eventsManager = manager.getActiveEventsManager();

      expect(eventsManager).not.toBeNull();
      expect(eventsManager!.getAllEvents()).toHaveLength(2); // calendar + world event
    });

    it('should work correctly when called during day transition', () => {
      // Simulate the exact scenario from the bug report:
      // Time advances, day changes, dateChanged hook fires,
      // EventsAPI.getEventsForDate() is called, which calls getActiveEventsManager()
      manager['activeCalendarId'] = testCalendar.id;
      manager.calendars.set(testCalendar.id, testCalendar);
      const engine = new CalendarEngine(testCalendar);
      manager.engines.set(testCalendar.id, engine);

      // First call (e.g., from dateChanged hook handler)
      const eventsManager = manager.getActiveEventsManager();
      expect(eventsManager).not.toBeNull();

      // Should be able to query events
      const events = eventsManager!.getEventsForDate(2024, 1, 1);
      expect(events).toHaveLength(1);
      expect(events[0].event.id).toBe('test-event');

      // Verify no warnings were logged
      const warnings = TestLogger.getLogsContaining('not initialized');
      expect(warnings.length).toBe(0);
    });
  });

  describe('getActiveEventsManager() - integration with normal initialization', () => {
    it('should not interfere with normal initialization flow', () => {
      // Simulate normal initialization through loadCalendar
      const loaded = manager.loadCalendar(testCalendar, {
        type: 'builtin',
        sourceName: 'Test',
        description: 'Test source',
      });
      expect(loaded).toBe(true);

      // Set active calendar normally
      manager['activeCalendarId'] = testCalendar.id;

      // Create EventsManager through normal flow
      const engine = manager.engines.get(testCalendar.id);
      expect(engine).toBeDefined();

      // Normal code path would create EventsManager here
      // but we're testing that getActiveEventsManager works either way

      const eventsManager = manager.getActiveEventsManager();
      expect(eventsManager).not.toBeNull();
    });
  });
});
