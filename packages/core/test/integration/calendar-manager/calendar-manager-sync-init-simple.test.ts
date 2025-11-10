/**
 * Simple tests for CalendarManager synchronous initialization functionality
 *
 * Tests the core logic without complex validation or full calendar setup.
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

describe('CalendarManager Synchronous Initialization - Core Logic', () => {
  let manager: CalendarManager;

  beforeEach(() => {
    manager = new CalendarManager();
    vi.clearAllMocks();
    TestLogger.clearLogs();
  });

  describe('initializeSync() core logic', () => {
    it('should return false when no active calendar setting exists', () => {
      mockSettings.get.mockImplementation((module: string, setting: string) => {
        if (setting === 'activeCalendar') return null;
        if (setting === 'activeCalendarData') return null;
        return undefined;
      });

      const result = manager.initializeSync();

      expect(result).toBe(false);
      expect(
        TestLogger.getLogsContaining('No cached calendar data available').length
      ).toBeGreaterThan(0);
    });

    it('should return false when cached calendar data is missing', () => {
      mockSettings.get.mockImplementation((module: string, setting: string) => {
        if (setting === 'activeCalendar') return 'some-calendar';
        if (setting === 'activeCalendarData') return null;
        return undefined;
      });

      const result = manager.initializeSync();

      expect(result).toBe(false);
      expect(
        TestLogger.getLogsContaining('No cached calendar data available').length
      ).toBeGreaterThan(0);
    });

    it('should return false when calendar ID and cached data do not match', () => {
      mockSettings.get.mockImplementation((module: string, setting: string) => {
        if (setting === 'activeCalendar') return 'calendar-a';
        if (setting === 'activeCalendarData')
          return { id: 'calendar-b', name: 'Different Calendar' };
        return undefined;
      });

      const result = manager.initializeSync();

      expect(result).toBe(false);
      expect(
        TestLogger.getLogsContaining('No cached calendar data available').length
      ).toBeGreaterThan(0);
    });

    it('should attempt to load calendar when matching data is available', () => {
      const testCalendar = { id: 'test-calendar', name: 'Test Calendar' };

      mockSettings.get.mockImplementation((module: string, setting: string) => {
        if (setting === 'activeCalendar') return testCalendar.id;
        if (setting === 'activeCalendarData') return testCalendar;
        return undefined;
      });

      // Spy on loadCalendar to verify it's called
      const loadCalendarSpy = vi.spyOn(manager, 'loadCalendar').mockReturnValue(false);

      const result = manager.initializeSync();

      expect(loadCalendarSpy).toHaveBeenCalledWith(
        testCalendar,
        expect.objectContaining({
          type: 'builtin',
          sourceName: 'Seasons & Stars',
          description: 'Built-in calendar from cached data',
          icon: 'fa-solid fa-calendar',
        })
      );

      expect(result).toBe(false); // Returns false because loadCalendar is mocked to return false

      loadCalendarSpy.mockRestore();
    });
  });

  describe('setActiveCalendarSync() core logic', () => {
    it('should return false when calendar is not loaded', () => {
      const result = manager.setActiveCalendarSync('nonexistent-calendar');

      expect(result).toBe(false);
      expect(
        TestLogger.getLogsContaining('Calendar not found: nonexistent-calendar').length
      ).toBeGreaterThan(0);
    });

    it('should call resolveDefaultVariant for variant handling', () => {
      const resolveVariantSpy = vi
        .spyOn(manager as any, 'resolveDefaultVariant')
        .mockReturnValue('resolved-id');

      // This will fail because the resolved calendar doesn't exist, but we can verify the call
      manager.setActiveCalendarSync('base-id');

      expect(resolveVariantSpy).toHaveBeenCalledWith('base-id');

      resolveVariantSpy.mockRestore();
    });

    it('should not save settings during synchronous operation', () => {
      // This will fail because calendar doesn't exist, but we can verify no settings are saved
      manager.setActiveCalendarSync('any-calendar');

      expect(mockSettings.set).not.toHaveBeenCalled();
    });
  });

  describe('loadBuiltInCalendarsSync() core logic', () => {
    it('should start async calendar loading without blocking', () => {
      const loadBuiltInSpy = vi.spyOn(manager, 'loadBuiltInCalendars').mockResolvedValue();

      manager.loadBuiltInCalendarsSync();

      expect(loadBuiltInSpy).toHaveBeenCalled();
      expect(
        TestLogger.getLogsContaining('Calendar loading initiated asynchronously').length
      ).toBeGreaterThan(0);

      loadBuiltInSpy.mockRestore();
    });

    it('should handle async loading errors gracefully', async () => {
      const loadBuiltInSpy = vi
        .spyOn(manager, 'loadBuiltInCalendars')
        .mockRejectedValue(new Error('Async load failed'));

      manager.loadBuiltInCalendarsSync();

      // Wait for async error handling
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(
        TestLogger.getLogsContaining('Failed to load calendars asynchronously').length
      ).toBeGreaterThan(0);

      loadBuiltInSpy.mockRestore();
    });
  });

  describe('Calendar data caching in async methods', () => {
    it('should include calendar data caching logic in setActiveCalendar', async () => {
      // Mock a successful setActiveCalendar call
      const mockCalendar = { id: 'test-calendar', name: 'Test Calendar' };

      // Manually add calendar to make setActiveCalendar succeed
      manager.calendars.set(mockCalendar.id, mockCalendar as any);

      // Mock the engine creation to avoid validation
      manager.engines.set(mockCalendar.id, {} as any);

      await manager.setActiveCalendar(mockCalendar.id, true);

      // Verify both settings were set
      expect(mockSettings.set).toHaveBeenCalledWith(
        'seasons-and-stars',
        'activeCalendar',
        mockCalendar.id
      );
      expect(mockSettings.set).toHaveBeenCalledWith(
        'seasons-and-stars',
        'activeCalendarData',
        mockCalendar
      );
    });

    it('should handle missing calendar data gracefully in async setActiveCalendar', async () => {
      const result = await manager.setActiveCalendar('missing-calendar', true);

      // Should return false and not set any settings since calendar doesn't exist
      expect(result).toBe(false);
      expect(mockSettings.set).not.toHaveBeenCalledWith(
        'seasons-and-stars',
        'activeCalendar',
        expect.anything()
      );
      expect(mockSettings.set).not.toHaveBeenCalledWith(
        'seasons-and-stars',
        'activeCalendarData',
        expect.anything()
      );
    });
  });
});
