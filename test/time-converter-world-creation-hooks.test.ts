/**
 * Time Converter World Creation Hooks Tests
 *
 * Tests for the new system-specific hook pattern that enables time converter
 * to request world creation timestamps from system integrations.
 */

import { describe, it, expect, beforeEach, vi, beforeAll, afterEach } from 'vitest';
import { TimeConverter } from '../src/core/time-converter';
import { CalendarEngine } from '../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../src/types/calendar-types';
import golarionCalendarData from '../calendars/golarion-pf2e.json';

// Use the actual Golarion calendar JSON file instead of duplicating definitions
const golarionCalendar: SeasonsStarsCalendar = golarionCalendarData as SeasonsStarsCalendar;

describe('TimeConverter - World Creation Hooks Integration', () => {
  let engine: CalendarEngine;
  let timeConverter: TimeConverter;
  let mockHooks: any;

  beforeAll(() => {
    // Setup mock Foundry globals
    mockHooks = {
      callAll: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      off: vi.fn(),
    };

    global.Hooks = mockHooks;
    global.game = {
      time: { worldTime: 0 },
      user: { isGM: true },
      system: { id: 'pf2e' },
    } as any;
  });

  beforeEach(() => {
    engine = new CalendarEngine(golarionCalendar);
    timeConverter = new TimeConverter(engine);

    // Reset global.game.system to default for each test
    global.game.system = { id: 'pf2e' };

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('System-Specific Hook Pattern in onWorldTimeUpdate', () => {
    it('should call system-specific hook when game system is available', () => {
      // Setup
      global.game.system = { id: 'pf2e' };
      const newTime = 86400; // 1 day
      const delta = 86400;

      // Execute - trigger the private onWorldTimeUpdate method
      // We do this by calling getCurrentDate since it uses the same logic
      timeConverter.getCurrentDate();

      // Verify hook was called with correct pattern
      expect(mockHooks.callAll).toHaveBeenCalledWith(
        'seasons-stars:pf2e:getWorldCreationTimestamp',
        expect.objectContaining({
          worldCreationTimestamp: undefined,
        })
      );
    });

    it('should not call hook when no game system is available', () => {
      // Setup
      global.game.system = undefined;

      // Execute
      timeConverter.getCurrentDate();

      // Verify no hook was called
      expect(mockHooks.callAll).not.toHaveBeenCalledWith(
        expect.stringMatching(/seasons-stars:.*:getWorldCreationTimestamp/),
        expect.any(Object)
      );
    });

    it('should handle different game systems correctly', () => {
      const testSystems = ['pf2e', 'dnd5e', 'worldbuilding', 'custom-system'];

      testSystems.forEach(systemId => {
        // Setup
        global.game.system = { id: systemId };
        vi.clearAllMocks();

        // Execute
        timeConverter.getCurrentDate();

        // Verify correct system-specific hook was called
        expect(mockHooks.callAll).toHaveBeenCalledWith(
          `seasons-stars:${systemId}:getWorldCreationTimestamp`,
          expect.objectContaining({
            worldCreationTimestamp: undefined,
          })
        );
      });
    });

    it('should use world creation timestamp when provided by hook', () => {
      // Setup - Ensure system is pf2e for this test
      global.game.system = { id: 'pf2e' };

      // Setup - mock a system integration that provides a timestamp
      const testTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;

      mockHooks.callAll.mockImplementation((hookName: string, data: any) => {
        if (hookName === 'seasons-stars:pf2e:getWorldCreationTimestamp') {
          data.worldCreationTimestamp = testTimestamp;
        }
      });

      // Execute
      const result = timeConverter.getCurrentDate();

      // Verify the hook was called correctly
      expect(mockHooks.callAll).toHaveBeenCalledWith(
        'seasons-stars:pf2e:getWorldCreationTimestamp',
        expect.objectContaining({
          worldCreationTimestamp: testTimestamp, // Should be modified by mock
        })
      );

      // Verify the result uses the world creation timestamp
      // worldTime=0 with 2025 creation should give 2025 + 2700 = 4725
      expect(result.year).toBe(4725);
      expect(result.month).toBe(1);
      expect(result.day).toBe(1);
    });

    it('should fall back to epoch calculation when no timestamp provided', () => {
      // Setup - hook is called but doesn't provide timestamp
      mockHooks.callAll.mockImplementation((hookName: string, data: any) => {
        // Hook is called but data.worldCreationTimestamp remains undefined
      });

      // Execute
      const result = timeConverter.getCurrentDate();

      // Verify the result uses epoch calculation
      // worldTime=0 without timestamp should give raw epoch (2700)
      expect(result.year).toBe(2700);
    });
  });

  describe('Hook Data Structure', () => {
    it('should pass correctly structured data object to hook', () => {
      // Setup
      global.game.system = { id: 'pf2e' };

      // Execute
      timeConverter.getCurrentDate();

      // Verify hook was called with correct data structure
      expect(mockHooks.callAll).toHaveBeenCalledWith(
        'seasons-stars:pf2e:getWorldCreationTimestamp',
        expect.objectContaining({
          worldCreationTimestamp: undefined,
        })
      );

      // Verify the data object has the exact expected structure
      const callArgs = mockHooks.callAll.mock.calls[0];
      const dataObject = callArgs[1];
      expect(Object.keys(dataObject)).toEqual(['worldCreationTimestamp']);
      expect(dataObject.worldCreationTimestamp).toBeUndefined();
    });

    it('should preserve timestamp modifications made by hook listeners', () => {
      // Setup hook that simulates multiple listeners modifying the data
      const finalTimestamp = 2000;

      mockHooks.callAll.mockImplementation((hookName: string, data: any) => {
        if (hookName === 'seasons-stars:pf2e:getWorldCreationTimestamp') {
          // Simulate multiple listeners - final one wins
          data.worldCreationTimestamp = 1000; // First listener
          data.worldCreationTimestamp = finalTimestamp; // Second listener overwrites
        }
      });

      // Execute
      timeConverter.getCurrentDate();

      // Verify the hook was called and final timestamp was used
      expect(mockHooks.callAll).toHaveBeenCalledWith(
        'seasons-stars:pf2e:getWorldCreationTimestamp',
        expect.objectContaining({
          worldCreationTimestamp: finalTimestamp,
        })
      );
    });
  });

  describe('getCurrentDate Method Integration', () => {
    it('should use same hook pattern in getCurrentDate as onWorldTimeUpdate', () => {
      // Setup
      global.game.system = { id: 'test-system' };
      global.game.time = { worldTime: 12345 };

      // Execute
      timeConverter.getCurrentDate();

      // Verify hook was called with test system
      expect(mockHooks.callAll).toHaveBeenCalledWith(
        'seasons-stars:test-system:getWorldCreationTimestamp',
        expect.objectContaining({
          worldCreationTimestamp: undefined,
        })
      );
    });

    it('should handle system ID changes dynamically', () => {
      // First call with one system
      global.game.system = { id: 'system1' };
      timeConverter.getCurrentDate();

      expect(mockHooks.callAll).toHaveBeenCalledWith(
        'seasons-stars:system1:getWorldCreationTimestamp',
        expect.any(Object)
      );

      vi.clearAllMocks();

      // Second call with different system
      global.game.system = { id: 'system2' };
      timeConverter.getCurrentDate();

      expect(mockHooks.callAll).toHaveBeenCalledWith(
        'seasons-stars:system2:getWorldCreationTimestamp',
        expect.any(Object)
      );
    });
  });

  describe('Error Handling in Hook Integration', () => {
    it('should handle hook callback exceptions gracefully', () => {
      // Setup - Ensure system is pf2e for this test
      global.game.system = { id: 'pf2e' };

      // Setup - mock hook that throws an error
      mockHooks.callAll.mockImplementation((hookName: string, data: any) => {
        if (hookName === 'seasons-stars:pf2e:getWorldCreationTimestamp') {
          throw new Error('Hook callback failed');
        }
      });

      // Execute - should not throw
      expect(() => {
        timeConverter.getCurrentDate();
      }).not.toThrow();

      // Verify hook was still called (even though it threw)
      expect(mockHooks.callAll).toHaveBeenCalledWith(
        'seasons-stars:pf2e:getWorldCreationTimestamp',
        expect.any(Object)
      );
    });

    it('should handle undefined/null system ID gracefully', () => {
      const testCases = [undefined, null, ''];

      testCases.forEach(systemId => {
        // Setup
        global.game.system = systemId ? { id: systemId } : systemId;
        vi.clearAllMocks();

        // Execute - should not throw
        expect(() => {
          timeConverter.getCurrentDate();
        }).not.toThrow();

        // Verify no system-specific hook was called
        expect(mockHooks.callAll).not.toHaveBeenCalledWith(
          expect.stringMatching(/seasons-stars:.*:getWorldCreationTimestamp/),
          expect.any(Object)
        );
      });
    });
  });

  describe('Integration with Widget Synchronization', () => {
    it('should provide consistent timestamps across multiple calls', () => {
      // Setup - Ensure system is pf2e for this test
      global.game.system = { id: 'pf2e' };

      // Setup - system provides consistent timestamp
      const consistentTimestamp = new Date('2025-06-15T12:00:00.000Z').getTime() / 1000;

      mockHooks.callAll.mockImplementation((hookName: string, data: any) => {
        if (hookName === 'seasons-stars:pf2e:getWorldCreationTimestamp') {
          data.worldCreationTimestamp = consistentTimestamp;
        }
      });

      // Execute multiple calls
      const result1 = timeConverter.getCurrentDate();
      const result2 = timeConverter.getCurrentDate();

      // Verify consistent results
      expect(result1.year).toBe(result2.year);
      expect(result1.month).toBe(result2.month);
      expect(result1.day).toBe(result2.day);

      // Verify both used the world creation timestamp (2025 + 2700 = 4725)
      expect(result1.year).toBe(4725);
      expect(result2.year).toBe(4725);
    });

    it('should handle timestamp changes between calls', () => {
      // Setup - Ensure system is pf2e for this test
      global.game.system = { id: 'pf2e' };

      // Setup - system provides different timestamps on different calls
      let callCount = 0;

      mockHooks.callAll.mockImplementation((hookName: string, data: any) => {
        if (hookName === 'seasons-stars:pf2e:getWorldCreationTimestamp') {
          callCount++;
          const year = 2024 + callCount; // 2025, 2026, etc.
          data.worldCreationTimestamp = new Date(`${year}-01-01T00:00:00.000Z`).getTime() / 1000;
        }
      });

      // Execute multiple calls
      const result1 = timeConverter.getCurrentDate();
      const result2 = timeConverter.getCurrentDate();

      // Verify different results reflecting different timestamps
      expect(result1.year).toBe(4725); // 2025 + 2700
      expect(result2.year).toBe(4726); // 2026 + 2700
      expect(result1.year).not.toBe(result2.year); // Should be different
    });
  });
});
