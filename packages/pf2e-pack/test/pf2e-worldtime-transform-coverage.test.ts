/**
 * Test Coverage for PF2e WorldTime Transform Code Paths
 *
 * This test suite focuses on testing the specific new code paths added for the PF2e fix:
 * - Time converter system time offset in setCurrentDate (working)
 * - Compatibility manager data provider functionality (simpler approach)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import { TimeConverter } from '../src/core/time-converter';
import { CalendarDate } from '../src/core/calendar-date';
import { compatibilityManager } from '../src/core/compatibility-manager';
import { Logger } from '../src/core/logger';
import type { SeasonsStarsCalendar } from '../src/types/calendar';
import golarionCalendar from '../calendars/golarion-pf2e.json';

describe('PF2e WorldTime Transform - Real Module Code Coverage', () => {
  let engine: CalendarEngine;
  let timeConverter: TimeConverter;
  let calendar: SeasonsStarsCalendar;
  let originalGame: typeof globalThis.game;

  beforeEach(() => {
    calendar = golarionCalendar as SeasonsStarsCalendar;
    engine = new CalendarEngine(calendar);
    timeConverter = new TimeConverter(engine);

    // Store original game object
    originalGame = global.game;
  });

  afterEach(() => {
    // Restore original game object
    global.game = originalGame;
    vi.clearAllMocks();
  });

  describe('Compatibility Manager Data Provider Coverage', () => {
    it('should register and retrieve worldTimeTransform data provider', () => {
      // Setup system
      global.game = {
        system: { id: 'test-system' },
      } as typeof globalThis.game;

      // Test the real compatibility manager methods used in the PF2e fix
      const mockTransform = vi.fn((worldTime: number) => [worldTime + 1000, 500]);

      // Test registration (used in pf2e-integration.ts)
      compatibilityManager.registerDataProvider(
        'test-system',
        'worldTimeTransform',
        () => mockTransform
      );

      // Test availability check (used in bridge-integration.ts and time-converter.ts)
      expect(compatibilityManager.hasDataProvider('test-system', 'worldTimeTransform')).toBe(true);

      // Test data retrieval (used in bridge-integration.ts and time-converter.ts)
      const retrievedTransform = compatibilityManager.getSystemData<
        (worldTime: number, defaultOffset?: number) => [number, number | undefined]
      >('test-system', 'worldTimeTransform');

      expect(retrievedTransform).toBeDefined();
      expect(typeof retrievedTransform).toBe('function');

      // Test the transform function behavior
      expect(retrievedTransform).toBeDefined();
      const [transformedWorldTime, systemTimeOffset] = retrievedTransform?.(0, undefined) ?? [0, 0];
      expect(transformedWorldTime).toBe(1000); // worldTime + 1000
      expect(systemTimeOffset).toBe(500);
    });

    it('should handle missing data providers gracefully', () => {
      global.game = {
        system: { id: 'nonexistent-system' },
      } as typeof globalThis.game;

      // Test hasDataProvider with nonexistent provider
      expect(compatibilityManager.hasDataProvider('nonexistent-system', 'worldTimeTransform')).toBe(
        false
      );

      // Test getSystemData with nonexistent provider
      const result = compatibilityManager.getSystemData('nonexistent-system', 'worldTimeTransform');
      expect(result).toBe(null);
    });

    it('should handle error in data provider function', () => {
      global.game = {
        system: { id: 'error-system' },
      } as typeof globalThis.game;

      // Register a provider that throws an error
      compatibilityManager.registerDataProvider('error-system', 'worldTimeTransform', () => {
        throw new Error('Provider error');
      });

      // Mock Logger.warn to verify error handling
      const warnSpy = vi.spyOn(Logger, 'warn').mockImplementation(() => {});

      // Test that getSystemData handles errors gracefully
      const result = compatibilityManager.getSystemData('error-system', 'worldTimeTransform');
      expect(result).toBe(null);
      expect(warnSpy).toHaveBeenCalledWith(
        'Error getting system data error-system.worldTimeTransform:',
        expect.any(Error)
      );

      warnSpy.mockRestore();
    });
  });

  describe('TimeConverter setCurrentDate Coverage', () => {
    it('should apply system time offset when transform is available', async () => {
      // Setup game with system and user
      global.game = {
        system: { id: 'test-system' },
        user: { isGM: true },
        time: {
          worldTime: 0,
          advance: vi.fn(),
        },
      } as typeof globalThis.game;

      // Register a mock transform that returns system time offset
      const mockTransform = vi.fn((worldTime: number) => [worldTime, 98765]);
      compatibilityManager.registerDataProvider(
        'test-system',
        'worldTimeTransform',
        () => mockTransform
      );

      const testDate = new CalendarDate(
        { year: 4725, month: 1, day: 2, weekday: 1, time: { hour: 12, minute: 0, second: 0 } },
        calendar
      );

      // Test setCurrentDate with system offset - exercises real TimeConverter code
      await timeConverter.setCurrentDate(testDate);

      // Verify transform was called with 0 to get offset (real behavior)
      expect(mockTransform).toHaveBeenCalledWith(0);
      expect(global.game.time.advance).toHaveBeenCalled();
    });

    it('should handle transform errors gracefully in setCurrentDate', async () => {
      // Setup game with system and user
      global.game = {
        system: { id: 'error-system' },
        user: { isGM: true },
        time: {
          worldTime: 0,
          advance: vi.fn(),
        },
      } as typeof globalThis.game;

      // Register a transform that throws an error
      compatibilityManager.registerDataProvider('error-system', 'worldTimeTransform', () => {
        throw new Error('Transform error');
      });

      // Mock Logger.warn to verify real error handling in TimeConverter
      const warnSpy = vi.spyOn(Logger, 'warn').mockImplementation(() => {});

      const testDate = new CalendarDate({ year: 4725, month: 1, day: 2, weekday: 1 }, calendar);

      // Should not throw, should fallback to normal behavior
      await timeConverter.setCurrentDate(testDate);

      expect(warnSpy).toHaveBeenCalledWith(
        'Error getting system data error-system.worldTimeTransform:',
        expect.any(Error)
      );
      expect(global.game.time.advance).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('should handle case where transform returns null offset', async () => {
      // Setup game with system
      global.game = {
        system: { id: 'null-system' },
        user: { isGM: true },
        time: {
          worldTime: 0,
          advance: vi.fn(),
        },
      } as typeof globalThis.game;

      // Register a transform that returns null offset
      const mockTransform = vi.fn((worldTime: number) => [worldTime, null]);
      compatibilityManager.registerDataProvider(
        'null-system',
        'worldTimeTransform',
        () => mockTransform
      );

      const testDate = new CalendarDate({ year: 4725, month: 1, day: 2, weekday: 1 }, calendar);

      // Should work with null offset (falls back to no offset)
      await timeConverter.setCurrentDate(testDate);
      expect(mockTransform).toHaveBeenCalledWith(0);
      expect(global.game.time.advance).toHaveBeenCalled();
    });

    it('should handle non-GM users appropriately', async () => {
      // Setup game with non-GM user
      const mockNotifications = {
        warn: vi.fn(),
      };

      global.game = {
        system: { id: 'test-system' },
        user: { isGM: false },
      } as typeof globalThis.game;

      global.ui = {
        notifications: mockNotifications,
      } as typeof globalThis.game;

      const testDate = new CalendarDate({ year: 4725, month: 1, day: 2, weekday: 1 }, calendar);

      // Should show warning for non-GM users
      await timeConverter.setCurrentDate(testDate);
      expect(mockNotifications.warn).toHaveBeenCalledWith('Only GMs can change the world time.');
    });
  });
});
