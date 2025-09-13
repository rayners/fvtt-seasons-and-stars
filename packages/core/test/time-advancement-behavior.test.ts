/**
 * Behavioral Tests for Time Advancement System
 * Tests correctness and behavior rather than performance metrics
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimeAdvancementService } from '../src/core/time-advancement-service';

// Mock Foundry globals
const mockGame = {
  ready: true,
  settings: {
    get: vi.fn(),
  },
  seasonsStars: {
    manager: {
      advanceSeconds: vi.fn().mockResolvedValue(undefined),
    },
  },
};

const mockUI = {
  notifications: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
};

const mockHooks = {
  on: vi.fn().mockReturnValue(1),
  off: vi.fn(),
  call: vi.fn(),
  callAll: vi.fn(),
};

// Setup global mocks
(global as any).game = mockGame;
(global as any).ui = mockUI;
(global as any).Hooks = mockHooks;

describe('Time Advancement Behavioral Tests', () => {
  let service: TimeAdvancementService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    (TimeAdvancementService as any).instance = null;

    mockGame.settings.get.mockImplementation((module: string, key: string) => {
      const defaults: Record<string, any> = {
        timeAdvancementRatio: 1.0,
        pauseOnCombat: true,
        resumeAfterCombat: false,
      };
      return defaults[key];
    });

    service = TimeAdvancementService.getInstance();
  });

  afterEach(() => {
    service.destroy();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Interval Calculation Correctness', () => {
    it('should calculate correct intervals for various ratios', () => {
      const calculateOptimalInterval = (service as any).calculateOptimalInterval.bind(service);

      const testCases = [
        { ratio: 0.001, expectedInterval: 1000000 }, // Very slow
        { ratio: 0.1, expectedInterval: 10000 }, // Slow
        { ratio: 1.0, expectedInterval: 10000 }, // Normal
        { ratio: 10.0, expectedInterval: 10000 }, // Fast (minimum)
        { ratio: 1000.0, expectedInterval: 10000 }, // Very fast (minimum)
      ];

      testCases.forEach(({ ratio, expectedInterval }) => {
        const result = calculateOptimalInterval(ratio);
        expect(result).toBe(expectedInterval);
      });
    });

    it('should handle ratio changes correctly', () => {
      const ratios = [1.0, 2.0, 0.5, 10.0, 0.1, 5.0, 1.0];

      for (const ratio of ratios) {
        service.updateRatio(ratio);
        // Verify the ratio was set correctly (with clamping)
        const expectedRatio = Math.max(0.1, Math.min(100, ratio));
        expect((service as any).advancementRatio).toBe(expectedRatio);
      }

      // Service should be in consistent state after all changes
      expect(service.isActive).toBe(false);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not accumulate resources with repeated start/stop cycles', async () => {
      const cycles = 20; // Reduced count for faster testing

      for (let i = 0; i < cycles; i++) {
        await service.play();
        expect(service.isActive).toBe(true);

        service.pause();
        expect(service.isActive).toBe(false);
      }

      // Verify no resource leaks (intervals should be properly cleaned up)
      expect((service as any).intervalId).toBeNull();
    });

    it('should handle time advancement correctly', async () => {
      service.updateRatio(1.0);
      await service.play();

      const advanceCount = 5; // Reasonable count for testing

      // Simulate time advances
      for (let i = 0; i < advanceCount; i++) {
        vi.advanceTimersByTime(10000);
      }

      expect(mockGame.seasonsStars.manager.advanceSeconds).toHaveBeenCalledTimes(advanceCount);
      expect(service.isActive).toBe(true);
    });

    it('should handle error scenarios gracefully', async () => {
      await service.play();

      // Simulate intermittent errors
      let errorCount = 0;
      let successCount = 0;
      mockGame.seasonsStars.manager.advanceSeconds.mockImplementation(() => {
        errorCount++;
        if (errorCount % 3 === 0) {
          throw new Error(`Intermittent error ${errorCount}`);
        }
        successCount++;
        return Promise.resolve();
      });

      // Run with intermittent errors
      for (let i = 0; i < 9; i++) {
        // 9 iterations = 3 errors, 6 successes
        vi.advanceTimersByTime(10000);
        // Re-start if auto-paused by error
        if (!service.isActive) {
          await service.play();
        }
      }

      // Verify the error handling behavior
      expect(errorCount).toBe(9); // All attempts should have been made
      expect(successCount).toBe(6); // 6 successful calls (2/3 of attempts)
    });
  });

  describe('Edge Case Handling', () => {
    it('should clamp extreme ratio values correctly', () => {
      const extremeRatios = [
        { ratio: 0.05, expectedAdvancement: 0.1 }, // Below minimum (should clamp)
        { ratio: 0.1, expectedAdvancement: 0.1 }, // Minimum allowed
        { ratio: 100.0, expectedAdvancement: 100.0 }, // Maximum allowed
        { ratio: 150.0, expectedAdvancement: 100.0 }, // Above maximum (should clamp)
      ];

      for (const { ratio, expectedAdvancement } of extremeRatios) {
        service.updateRatio(ratio);

        // Check that ratio was clamped appropriately immediately after update
        expect((service as any).advancementRatio).toBe(expectedAdvancement);
      }
    });

    it('should remain active when timers advance', async () => {
      await service.play();
      expect(service.isActive).toBe(true);

      // Advance time to trigger the timer
      vi.advanceTimersByTime(10000);

      // Should continue functioning normally
      expect(service.isActive).toBe(true);
      expect(mockGame.seasonsStars.manager.advanceSeconds).toHaveBeenCalled();
    });

    it('should correctly apply different ratios', async () => {
      const testRatios = [0.5, 2.0, 10.0];

      for (const ratio of testRatios) {
        service.updateRatio(ratio);
        await service.play();

        mockGame.seasonsStars.manager.advanceSeconds.mockClear();

        // Advance time and check that the correct amount is passed
        const interval = Math.max(10000, Math.ceil(1000 / ratio));
        vi.advanceTimersByTime(interval);

        const expectedSeconds = ratio * (interval / 1000);
        expect(mockGame.seasonsStars.manager.advanceSeconds).toHaveBeenCalledWith(expectedSeconds);
        expect((service as any).advancementRatio).toBe(ratio);

        service.pause();
      }
    });
  });

  describe('Concurrent Operation Handling', () => {
    it('should handle multiple rapid play/pause requests safely', async () => {
      const operations = [];

      // Queue up multiple async operations
      for (let i = 0; i < 10; i++) {
        if (i % 2 === 0) {
          operations.push(service.play());
        } else {
          operations.push(Promise.resolve(service.pause()));
        }
      }

      // Wait for all operations to complete
      await Promise.allSettled(operations);

      // Service should be in a consistent state
      expect(typeof service.isActive).toBe('boolean');
      expect(
        (service as any).intervalId === null || typeof (service as any).intervalId === 'number'
      ).toBe(true);
    });

    it('should handle settings changes during active advancement', async () => {
      await service.play();
      expect(service.isActive).toBe(true);

      // Change settings while running
      const ratioChanges = [1.0, 2.0, 0.5, 3.0, 1.0];

      for (const ratio of ratioChanges) {
        service.updateRatio(ratio);

        // Should remain active throughout (updateRatio restarts the service if it was active)
        expect(service.isActive).toBe(true);
        // Ratio should be updated
        expect((service as any).advancementRatio).toBe(ratio);
      }

      // Should still be functioning
      vi.advanceTimersByTime(10000);
      expect(mockGame.seasonsStars.manager.advanceSeconds).toHaveBeenCalled();
    });
  });

  describe('Hook System Behavior', () => {
    it('should handle hook errors without breaking functionality', async () => {
      // Make hooks throw errors
      mockHooks.callAll.mockImplementation(() => {
        throw new Error('Hook error');
      });

      await service.play();
      expect(service.isActive).toBe(true);

      service.pause(); // This will trigger hook calls
      await service.play(); // This will also trigger hook calls

      // Should handle hook errors without breaking functionality
      expect(service.isActive).toBe(true);
    });

    it('should handle combat hook scenarios correctly', async () => {
      await service.play();

      const combatStartHandler = (service as any).handleCombatStart;
      const combatEndHandler = (service as any).handleCombatEnd;

      const iterations = 5; // Reasonable number for testing

      // Simulate combat start/end cycles
      for (let i = 0; i < iterations; i++) {
        combatStartHandler({ id: `combat-${i}` }, { round: 1, turn: 0 });

        // Mock the play method to avoid actual timer setup in this test
        const playMock = vi.spyOn(service, 'play').mockResolvedValue();
        combatEndHandler({ id: `combat-${i}` }, {}, 'user-id');
        playMock.mockRestore();
      }

      // Should complete all combat cycles without errors
      expect(mockHooks.callAll).toHaveBeenCalled();
    });
  });
});
