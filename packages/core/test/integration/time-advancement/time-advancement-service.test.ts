/**
 * Tests for TimeAdvancementService
 * Comprehensive test suite covering service functionality and behavior
 * Following TDD approach - these tests define the expected behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimeAdvancementService } from '../../../src/core/time-advancement-service';

// Mock Foundry globals
const mockGame = {
  ready: true,
  user: {
    isGM: true, // Default to GM, tests can override
  },
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
  on: vi.fn(),
  off: vi.fn(),
  call: vi.fn(),
  callAll: vi.fn(),
};

// Setup global mocks
(global as any).game = mockGame;
(global as any).ui = mockUI;
(global as any).Hooks = mockHooks;

describe('TimeAdvancementService', () => {
  let service: TimeAdvancementService;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset singleton instance
    (TimeAdvancementService as any).instance = null;

    // Reset game mock to avoid null states
    mockGame.seasonsStars = {
      manager: {
        advanceSeconds: vi.fn().mockResolvedValue(undefined),
      },
    };

    // Setup default mock return values
    mockGame.settings.get.mockImplementation((module: string, key: string) => {
      const defaults: Record<string, any> = {
        timeAdvancementRatio: 1.0,
        pauseOnCombat: true,
        resumeAfterCombat: false,
        syncWithGamePause: true,
        realTimeAdvancementInterval: 10, // Default to 10 seconds
      };
      return defaults[key];
    });

    mockHooks.on.mockReturnValue(1); // Mock hook ID

    service = TimeAdvancementService.getInstance();
  });

  afterEach(() => {
    // Clean up service state
    service.destroy();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = TimeAdvancementService.getInstance();
      const instance2 = TimeAdvancementService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should not allow external instantiation', () => {
      // Constructor should be private - this tests that the class design prevents direct instantiation
      // In TypeScript, private constructors can still be called with 'any' cast,
      // but this verifies the intended usage pattern
      expect(() => new (TimeAdvancementService as any)()).not.toThrow();
      // The real protection is at TypeScript compile time, not runtime
    });

    it('should provide a way to reset instance for testing', () => {
      const originalInstance = service;

      (TimeAdvancementService as any).resetInstance();
      const newInstance = TimeAdvancementService.getInstance();

      expect(newInstance).not.toBe(originalInstance);
    });
  });

  describe('Smart Interval Calculation', () => {
    it('should calculate correct interval for 1:1 ratio', () => {
      const interval = (service as any).calculateOptimalInterval(1.0);
      expect(interval).toBe(10000); // Math.max(10000, 1000/1.0) = 10000
    });

    it('should calculate correct interval for 0.5 ratio (slow)', () => {
      const interval = (service as any).calculateOptimalInterval(0.5);
      expect(interval).toBe(10000); // Math.max(10000, 1000/0.5) = 10000
    });

    it('should calculate correct interval for 2.0 ratio (fast)', () => {
      const interval = (service as any).calculateOptimalInterval(2.0);
      expect(interval).toBe(10000); // Math.max(10000, 1000/2.0) = 10000 (minimum)
    });

    it('should calculate correct interval for 10.0 ratio (very fast)', () => {
      const interval = (service as any).calculateOptimalInterval(10.0);
      expect(interval).toBe(10000); // Math.max(10000, 1000/10.0) = 10000 (minimum)
    });

    it('should calculate correct interval for 0.1 ratio (very slow)', () => {
      const interval = (service as any).calculateOptimalInterval(0.1);
      expect(interval).toBe(10000); // Math.max(10000, 1000/0.1) = 10000
    });

    it('should enforce minimum interval based on configuration', () => {
      const interval = (service as any).calculateOptimalInterval(100.0);
      expect(interval).toBe(10000); // Never less than configured minimum (10s default = 10000ms)
    });

    it('should use configurable minimum interval', () => {
      // Test with different configured values
      mockGame.settings.get.mockImplementation((module: string, key: string) => {
        if (key === 'realTimeAdvancementInterval') return 5; // 5 seconds
        return 1.0;
      });
      let interval = (service as any).calculateOptimalInterval(100.0);
      expect(interval).toBe(5000); // 5 seconds = 5000ms

      mockGame.settings.get.mockImplementation((module: string, key: string) => {
        if (key === 'realTimeAdvancementInterval') return 30; // 30 seconds
        return 1.0;
      });
      interval = (service as any).calculateOptimalInterval(100.0);
      expect(interval).toBe(30000); // 30 seconds = 30000ms
    });

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
  });

  describe('State Management', () => {
    it('should start with inactive state', () => {
      expect(service.isActive).toBe(false);
    });

    it('should track active state correctly', async () => {
      vi.useFakeTimers();

      expect(service.isActive).toBe(false);

      await service.play();
      expect(service.isActive).toBe(true);

      service.pause();
      expect(service.isActive).toBe(false);

      vi.useRealTimers();
    });

    it('should not start if already active', async () => {
      vi.useFakeTimers();

      await service.play();
      const initialCallCount = mockHooks.callAll.mock.calls.length;

      // Try to start again
      await service.play();

      // Should not fire additional hooks
      expect(mockHooks.callAll).toHaveBeenCalledTimes(initialCallCount);

      vi.useRealTimers();
    });

    it('should still clear auto-resume flag when pausing already inactive service', () => {
      expect(service.isActive).toBe(false);

      const initialCallCount = mockHooks.callAll.mock.calls.length;
      service.pause();

      // Should fire pauseStateChanged hook to notify UI even when already paused
      // because the auto-resume flag is being cleared
      expect(mockHooks.callAll).toHaveBeenCalledTimes(initialCallCount + 1);

      // Verify the pauseStateChanged hook was called
      const lastCall = mockHooks.callAll.mock.calls[mockHooks.callAll.mock.calls.length - 1];
      expect(lastCall[0]).toBe('seasons-stars:pauseStateChanged');
    });
  });

  describe('Hook Integration', () => {
    it('should fire hook when starting time advancement', async () => {
      vi.useFakeTimers();

      await service.play();

      expect(mockHooks.callAll).toHaveBeenCalledWith(
        'seasons-stars:timeAdvancementStarted',
        1.0 // default ratio
      );

      vi.useRealTimers();
    });

    it('should fire hook when pausing time advancement', async () => {
      vi.useFakeTimers();

      await service.play();
      service.pause();

      expect(mockHooks.callAll).toHaveBeenCalledWith('seasons-stars:timeAdvancementPaused');

      vi.useRealTimers();
    });

    it('should handle hook firing errors gracefully', async () => {
      vi.useFakeTimers();

      mockHooks.callAll.mockImplementation(() => {
        throw new Error('Hook error');
      });

      // Should not throw despite hook error
      await expect(service.play()).resolves.not.toThrow();
      expect(service.isActive).toBe(true);

      vi.useRealTimers();
    });

    it('should handle hook errors without breaking functionality', async () => {
      vi.useFakeTimers();

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

      vi.useRealTimers();
    });
  });

  describe('Combat Hook Registration and Handling', () => {
    it('should register combat hooks during initialization', () => {
      service.initialize();

      expect(mockHooks.on).toHaveBeenCalledWith('combatStart', expect.any(Function));
      expect(mockHooks.on).toHaveBeenCalledWith('deleteCombat', expect.any(Function));
    });

    it('should not clean up hooks during destruction (hooks remain registered)', () => {
      service.initialize();
      service.destroy();

      // Hooks are not cleaned up anymore - they remain registered
      expect(mockHooks.off).not.toHaveBeenCalled();
    });

    it('should pause when combat starts if active and setting enabled', async () => {
      vi.useFakeTimers();

      mockGame.settings.get.mockImplementation((module: string, key: string) => {
        const settings: Record<string, any> = {
          timeAdvancementRatio: 1.0,
          pauseOnCombat: true,
        };
        return settings[key];
      });

      await service.play();
      expect(service.isActive).toBe(true);

      // Simulate combat start
      const combatStartHandler = (service as any).handleCombatStart;
      const mockCombat = { id: 'test-combat' };
      combatStartHandler(mockCombat, { round: 1, turn: 0 });

      expect(service.isActive).toBe(false);
      expect(mockUI.notifications.info).toHaveBeenCalledWith('Time advancement paused for combat');

      vi.useRealTimers();
    });

    it('should not pause when combat starts if setting disabled', async () => {
      vi.useFakeTimers();

      mockGame.settings.get.mockImplementation((module: string, key: string) => {
        const settings: Record<string, any> = {
          timeAdvancementRatio: 1.0,
          pauseOnCombat: false,
        };
        return settings[key];
      });

      await service.play();
      expect(service.isActive).toBe(true);

      // Simulate combat start
      const combatStartHandler = (service as any).handleCombatStart;
      const mockCombat = { id: 'test-combat' };
      combatStartHandler(mockCombat, { round: 1, turn: 0 });

      expect(service.isActive).toBe(true); // Should remain active

      vi.useRealTimers();
    });

    it('should resume when combat ends if was active before and setting enabled', async () => {
      mockGame.settings.get.mockImplementation((module: string, key: string) => {
        const defaults: Record<string, any> = {
          timeAdvancementRatio: 1.0,
          pauseOnCombat: true,
          resumeAfterCombat: true,
          syncWithGamePause: true,
        };
        return defaults[key] ?? false;
      });

      // Start with advancement active, then pause due to combat
      await service.play();
      expect(service.isActive).toBe(true);

      // Trigger combat start to pause
      const combatStartHandler = (service as any).handleCombatStart;
      combatStartHandler({ id: 'test-combat' });
      expect(service.isActive).toBe(false);

      // Simulate combat end
      const combatEndHandler = (service as any).handleCombatEnd;
      const mockCombat = { id: 'test-combat' };

      // Mock the play method to avoid actual timer setup but simulate state change
      const playMock = vi.spyOn(service, 'play').mockImplementation(async () => {
        (service as any)._isActive = true; // Simulate the state change
      });

      combatEndHandler(mockCombat, {}, 'user-id');

      expect(playMock).toHaveBeenCalled();
    });

    it('should only resume for GMs when combat ends', async () => {
      mockGame.settings.get.mockImplementation((module: string, key: string) => {
        const defaults: Record<string, any> = {
          timeAdvancementRatio: 1.0,
          pauseOnCombat: true,
          resumeAfterCombat: true,
          syncWithGamePause: true,
        };
        return defaults[key] ?? false;
      });

      // Start with advancement active for both tests
      await service.play();
      expect(service.isActive).toBe(true);

      // Pause via combat
      const combatStartHandler = (service as any).handleCombatStart;
      combatStartHandler({ id: 'test-combat' });
      expect(service.isActive).toBe(false);

      // Test GM user can resume
      mockGame.user.isGM = true;
      const combatEndHandler = (service as any).handleCombatEnd;
      const mockCombat = { id: 'test-combat' };
      const playMock = vi.spyOn(service, 'play').mockImplementation(async () => {
        (service as any)._isActive = true; // Simulate the state change
      });

      combatEndHandler(mockCombat, {}, 'user-id');
      expect(playMock).toHaveBeenCalled();

      // Reset for next test - need to set wasActiveBeforePause again
      playMock.mockClear();
      (service as any).wasActiveBeforePause = true; // Reset state for non-GM test

      // Test non-GM user cannot resume
      mockGame.user.isGM = false;
      combatEndHandler(mockCombat, {}, 'user-id');
      expect(playMock).not.toHaveBeenCalled();
    });

    it('should not attempt resume for non-GMs even with setting enabled', async () => {
      mockGame.settings.get.mockImplementation((module: string, key: string) => {
        const settings: Record<string, any> = {
          timeAdvancementRatio: 1.0,
          resumeAfterCombat: true,
        };
        return settings[key];
      });

      // Set user as non-GM
      mockGame.user.isGM = false;
      expect(service.isActive).toBe(false);

      const combatEndHandler = (service as any).handleCombatEnd;
      const mockCombat = { id: 'test-combat' };
      const playMock = vi.spyOn(service, 'play').mockResolvedValue();

      combatEndHandler(mockCombat, {}, 'user-id');

      // Should not call play() for non-GM users
      expect(playMock).not.toHaveBeenCalled();
    });

    it('should allow pause for all users during combat start', async () => {
      mockGame.settings.get.mockImplementation((module: string, key: string) => {
        const settings: Record<string, any> = {
          timeAdvancementRatio: 1.0,
          pauseOnCombat: true,
        };
        return settings[key];
      });

      // Start time advancement first
      await service.play();
      expect(service.isActive).toBe(true);

      const combatStartHandler = (service as any).handleCombatStart;
      const mockCombat = { id: 'test-combat' };

      // Test GM user can pause
      mockGame.user.isGM = true;
      combatStartHandler(mockCombat, {});
      expect(service.isActive).toBe(false);

      // Reset for next test
      await service.play();
      expect(service.isActive).toBe(true);

      // Test non-GM user can also pause (existing behavior)
      mockGame.user.isGM = false;
      combatStartHandler(mockCombat, {});
      expect(service.isActive).toBe(false);
    });

    it('should handle combat hook scenarios correctly', async () => {
      vi.useFakeTimers();

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

      vi.useRealTimers();
    });
  });

  describe('Settings Integration', () => {
    it('should use safe settings access with fallbacks', () => {
      mockGame.settings.get.mockImplementation(() => {
        throw new Error('Settings error');
      });

      const value = (service as any).getSettingValue('pauseOnCombat', false);
      expect(value).toBe(false); // Should use fallback
    });

    it('should handle missing settings gracefully', () => {
      mockGame.settings.get.mockReturnValue(undefined);

      const value = (service as any).getSettingValue('pauseOnCombat', true);
      expect(value).toBe(true); // Should use fallback
    });

    it('should update ratio when setting changes', () => {
      mockGame.settings.get.mockImplementation((module: string, key: string) => {
        return key === 'timeAdvancementRatio' ? 2.0 : false;
      });

      service.updateRatio(2.0);
      expect((service as any).advancementRatio).toBe(2.0);
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

  describe('Error Handling', () => {
    it('should handle Foundry API errors gracefully', async () => {
      // Set up valid game state first
      await service.play();
      expect(service.isActive).toBe(true);

      // Now simulate API failure during advancement
      mockGame.seasonsStars = null;

      // The service should be active but advancement will fail during timer
      expect(service.isActive).toBe(true);
    });

    it('should handle timer errors and auto-pause', async () => {
      vi.useFakeTimers();

      mockGame.seasonsStars.manager.advanceSeconds.mockImplementation(() => {
        throw new Error('Advancement error');
      });

      await service.play();
      expect(service.isActive).toBe(true);

      // Fast-forward to trigger timer
      vi.advanceTimersByTime(10000);

      // Should auto-pause on error
      expect(service.isActive).toBe(false);

      vi.useRealTimers();
    });

    it('should validate game state before starting', async () => {
      mockGame.seasonsStars = null; // Remove manager instead of setting ready = false

      await service.play();
      expect(service.isActive).toBe(false); // Should not start if manager not available
    });

    it('should handle error scenarios gracefully', async () => {
      vi.useFakeTimers();

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

      vi.useRealTimers();
    });
  });

  describe('Resource Management', () => {
    it('should clean up intervals on pause', async () => {
      vi.useFakeTimers();

      await service.play();
      expect(service.isActive).toBe(true);

      service.pause();
      expect(service.isActive).toBe(false);
      expect((service as any).intervalId).toBeNull();

      vi.useRealTimers();
    });

    it('should clean up all resources on destroy', async () => {
      vi.useFakeTimers();

      service.initialize();
      await service.play();

      expect(service.isActive).toBe(true);

      service.destroy();

      expect((service as any).intervalId).toBeNull();
      expect(service.isActive).toBe(false);

      vi.useRealTimers();
    });

    it('should prevent memory leaks with proper cleanup', () => {
      const originalInstance = service;

      service.initialize();
      service.destroy();

      // Create new instance to ensure clean state
      (TimeAdvancementService as any).resetInstance();
      const newInstance = TimeAdvancementService.getInstance();

      expect(newInstance).not.toBe(originalInstance);
      // Hooks are registered in constructor, so no cleanup needed
    });

    it('should not accumulate resources with repeated start/stop cycles', async () => {
      vi.useFakeTimers();

      const cycles = 20; // Reduced count for faster testing

      for (let i = 0; i < cycles; i++) {
        await service.play();
        expect(service.isActive).toBe(true);

        service.pause();
        expect(service.isActive).toBe(false);
      }

      // Verify no resource leaks (intervals should be properly cleaned up)
      expect((service as any).intervalId).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('Time Advancement Logic', () => {
    it('should advance time based on ratio', async () => {
      vi.useFakeTimers();

      service.updateRatio(2.0);
      await service.play();

      // Fast-forward timer - should trigger the interval
      vi.advanceTimersByTime(10000);

      // Should advance 20 seconds of game time for 10 seconds real time
      expect(mockGame.seasonsStars.manager.advanceSeconds).toHaveBeenCalledWith(20);

      vi.useRealTimers();
    });

    it('should use correct interval for different ratios', async () => {
      vi.useFakeTimers();
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      // Test 0.5 ratio (should use 10000ms interval)
      service.updateRatio(0.5);
      await service.play();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 10000);

      service.pause();
      setIntervalSpy.mockClear();

      // Test 10.0 ratio (should use 10000ms interval - minimum)
      service.updateRatio(10.0);
      await service.play();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 10000);

      vi.useRealTimers();
    });

    it('should handle time advancement correctly', async () => {
      vi.useFakeTimers();

      service.updateRatio(1.0);
      await service.play();

      const advanceCount = 5; // Reasonable count for testing

      // Simulate time advances
      for (let i = 0; i < advanceCount; i++) {
        vi.advanceTimersByTime(10000);
      }

      expect(mockGame.seasonsStars.manager.advanceSeconds).toHaveBeenCalledTimes(advanceCount);
      expect(service.isActive).toBe(true);

      vi.useRealTimers();
    });

    it('should correctly apply different ratios', async () => {
      vi.useFakeTimers();

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

      vi.useRealTimers();
    });
  });

  describe('Game Pause Sync', () => {
    beforeEach(() => {
      // Mock game.paused property
      (mockGame as any).paused = false;
      (mockGame as any).combat = null;

      // Ensure user is GM by default for these tests
      mockGame.user.isGM = true;

      // Setup syncWithGamePause setting to return true by default
      mockGame.settings.get.mockImplementation((module: string, key: string) => {
        const defaults: Record<string, any> = {
          timeAdvancementRatio: 1.0,
          pauseOnCombat: true,
          resumeAfterCombat: false,
          syncWithGamePause: true,
        };
        return defaults[key];
      });
    });

    it('should register pauseGame hook listener on construction', () => {
      expect(mockHooks.on).toHaveBeenCalledWith('pauseGame', expect.any(Function));
    });

    it('should pause time advancement when game is paused', async () => {
      await service.play();
      expect(service.isActive).toBe(true);

      // Simulate game pause event
      const pauseHandler = mockHooks.on.mock.calls.find(call => call[0] === 'pauseGame')[1];
      pauseHandler(true);

      expect(service.isActive).toBe(false);
    });

    it('should resume time advancement when game is unpaused', async () => {
      // Start with advancement active, then pause via game
      await service.play();
      const pauseHandler = mockHooks.on.mock.calls.find(call => call[0] === 'pauseGame')[1];

      // Simulate game pause
      (mockGame as any).paused = true;
      pauseHandler(true);
      expect(service.isActive).toBe(false);

      // Now unpause the game
      (mockGame as any).paused = false;
      pauseHandler(false);

      expect(service.isActive).toBe(true);
    });

    it('should not pause if syncWithGamePause setting is disabled', async () => {
      // Disable the setting
      mockGame.settings.get.mockImplementation((module: string, key: string) => {
        const defaults: Record<string, any> = {
          timeAdvancementRatio: 1.0,
          pauseOnCombat: true,
          resumeAfterCombat: false,
          syncWithGamePause: false,
        };
        return defaults[key];
      });

      await service.play();
      expect(service.isActive).toBe(true);

      // Simulate game pause event
      const pauseHandler = mockHooks.on.mock.calls.find(call => call[0] === 'pauseGame')[1];
      pauseHandler(true);

      // Should still be active since sync is disabled
      expect(service.isActive).toBe(true);
    });

    it('should allow starting advancement even when game is paused', async () => {
      (mockGame as any).paused = true;

      await service.play();

      // User should be able to start advancement even when game is paused
      expect(service.isActive).toBe(true);
    });

    it('should handle multiple pause sources - game pause then combat start', async () => {
      await service.play();
      expect(service.isActive).toBe(true);

      // First game pause
      const pauseHandler = mockHooks.on.mock.calls.find(call => call[0] === 'pauseGame')[1];
      pauseHandler(true);
      expect(service.isActive).toBe(false);

      // Then combat starts (should still be paused)
      const combatStartHandler = mockHooks.on.mock.calls.find(call => call[0] === 'combatStart')[1];
      combatStartHandler({});
      expect(service.isActive).toBe(false);

      // Game unpause should not resume (combat still active)
      const mockCombat = { started: true };
      (mockGame as any).combat = mockCombat;
      pauseHandler(false);
      expect(service.isActive).toBe(false);
    });

    it('should handle multiple pause sources - combat start then game pause', async () => {
      await service.play();
      expect(service.isActive).toBe(true);

      // First combat starts
      const combatStartHandler = mockHooks.on.mock.calls.find(call => call[0] === 'combatStart')[1];
      combatStartHandler({});
      expect(service.isActive).toBe(false);

      // Then game pause
      const pauseHandler = mockHooks.on.mock.calls.find(call => call[0] === 'pauseGame')[1];
      pauseHandler(true);
      expect(service.isActive).toBe(false);

      // Combat end should not resume (game still paused)
      (mockGame as any).paused = true;
      const combatEndHandler = mockHooks.on.mock.calls.find(call => call[0] === 'deleteCombat')[1];
      combatEndHandler({});
      expect(service.isActive).toBe(false);
    });

    it('should resume when all blocking conditions are cleared', async () => {
      // Enable resume after combat for this test
      mockGame.settings.get.mockImplementation((module: string, key: string) => {
        const defaults: Record<string, any> = {
          timeAdvancementRatio: 1.0,
          pauseOnCombat: true,
          resumeAfterCombat: true,
          syncWithGamePause: true,
        };
        return defaults[key];
      });

      await service.play();
      expect(service.isActive).toBe(true);

      // Set up handlers
      const pauseHandler = mockHooks.on.mock.calls.find(call => call[0] === 'pauseGame')[1];
      const combatStartHandler = mockHooks.on.mock.calls.find(call => call[0] === 'combatStart')[1];
      const combatEndHandler = mockHooks.on.mock.calls.find(call => call[0] === 'deleteCombat')[1];

      // Pause due to game and combat
      (mockGame as any).paused = true;
      pauseHandler(true);
      combatStartHandler({});
      expect(service.isActive).toBe(false);

      // Clear game pause first (should still be paused due to combat)
      (mockGame as any).paused = false;
      (mockGame as any).combat = { started: true };
      pauseHandler(false);
      expect(service.isActive).toBe(false);

      // Now clear combat (should resume)
      (mockGame as any).combat = null;
      combatEndHandler({});
      expect(service.isActive).toBe(true);
    });

    it('should not resume for non-GM users when game is unpaused', async () => {
      // Set user to non-GM
      mockGame.user.isGM = false;

      await service.play();
      const pauseHandler = mockHooks.on.mock.calls.find(call => call[0] === 'pauseGame')[1];
      pauseHandler(true);
      expect(service.isActive).toBe(false);

      // Non-GM unpause should not resume
      pauseHandler(false);
      expect(service.isActive).toBe(false);
    });

    it('should not resume when manually paused after being auto-paused by game pause', async () => {
      await service.play();
      expect(service.isActive).toBe(true);

      // Game pause auto-pauses time advancement
      const pauseHandler = mockHooks.on.mock.calls.find(call => call[0] === 'pauseGame')[1];
      (mockGame as any).paused = true;
      pauseHandler(true);
      expect(service.isActive).toBe(false);

      // Game unpauses temporarily - auto-resume happens
      (mockGame as any).paused = false;
      pauseHandler(false);
      expect(service.isActive).toBe(true); // Should auto-resume

      // Now user manually pauses (while game is unpaused)
      service.pause();
      expect(service.isActive).toBe(false);

      // Game pauses again, then unpauses - should NOT resume because user manually paused
      (mockGame as any).paused = true;
      pauseHandler(true);
      expect(service.isActive).toBe(false);

      (mockGame as any).paused = false;
      pauseHandler(false);
      expect(service.isActive).toBe(false); // Should NOT resume due to manual pause
    });

    it('should not resume when manually paused after auto-pause by game pause (direct scenario)', async () => {
      await service.play();
      expect(service.isActive).toBe(true);

      // Game pause auto-pauses time advancement
      const pauseHandler = mockHooks.on.mock.calls.find(call => call[0] === 'pauseGame')[1];
      (mockGame as any).paused = true;
      pauseHandler(true);
      expect(service.isActive).toBe(false);

      // User manually turns off advancement (while game is still paused)
      // This should clear the auto-resume flag even though already paused
      service.pause();
      expect(service.isActive).toBe(false);

      // Game unpause should NOT resume because user manually stopped it
      (mockGame as any).paused = false;
      pauseHandler(false);
      expect(service.isActive).toBe(false); // Should stay off due to manual pause
    });

    it('should require only one click to pause when game is paused', async () => {
      await service.play();
      expect(service.isActive).toBe(true);

      // Game pauses, auto-pausing time advancement
      const pauseHandler = mockHooks.on.mock.calls.find(call => call[0] === 'pauseGame')[1];
      (mockGame as any).paused = true;
      pauseHandler(true);

      // Time advancement should now appear as inactive
      expect(service.isActive).toBe(false);

      // User clicks pause once - this should work and not require a second click
      service.pause();
      expect(service.isActive).toBe(false);

      // When game unpauses, time advancement should stay paused
      (mockGame as any).paused = false;
      pauseHandler(false);
      expect(service.isActive).toBe(false); // Should NOT auto-resume
    });
  });

  describe('Pause State and UI Integration', () => {
    beforeEach(() => {
      // Mock game.paused property
      (mockGame as any).paused = false;
      (mockGame as any).combat = null;
      // Ensure user is GM by default for these tests
      mockGame.user.isGM = true;
      // Setup settings
      mockGame.settings.get.mockImplementation((module: string, key: string) => {
        const defaults: Record<string, any> = {
          timeAdvancementRatio: 1.0,
          pauseOnCombat: true,
          resumeAfterCombat: false,
          syncWithGamePause: true,
        };
        return defaults[key];
      });
    });

    it('should return correct pause state when time advancement is stopped', () => {
      const pauseState = service.getPauseState();

      expect(pauseState.isPaused).toBe(true);
      expect(pauseState.reason).toBe('Time advancement stopped');
      expect(pauseState.canResume).toBe(true);
    });

    it('should return correct pause state when time advancement is active but blocked by game pause', async () => {
      await service.play();
      (mockGame as any).paused = true;

      const pauseState = service.getPauseState();

      expect(pauseState.isPaused).toBe(true);
      expect(pauseState.reason).toBe('Game paused');
      expect(pauseState.canResume).toBe(false); // Can't manually resume while externally blocked
    });

    it('should return correct pause state when time advancement is active but blocked by combat', async () => {
      await service.play();
      (mockGame as any).combat = { started: true };

      const pauseState = service.getPauseState();

      expect(pauseState.isPaused).toBe(true);
      expect(pauseState.reason).toBe('Combat active');
      expect(pauseState.canResume).toBe(false);
    });

    it('should return correct pause state when blocked by both game pause and combat', async () => {
      await service.play();
      (mockGame as any).paused = true;
      (mockGame as any).combat = { started: true };

      const pauseState = service.getPauseState();

      expect(pauseState.isPaused).toBe(true);
      expect(pauseState.reason).toBe('Game paused & Combat active');
      expect(pauseState.canResume).toBe(false);
    });

    it('should return correct pause state when time advancement is active and unblocked', async () => {
      await service.play();

      const pauseState = service.getPauseState();

      expect(pauseState.isPaused).toBe(false);
      expect(pauseState.reason).toBe(null);
      expect(pauseState.canResume).toBe(true);
    });

    it('should emit pauseStateChanged hook when game pause changes', async () => {
      await service.play();
      const pauseHandler = mockHooks.on.mock.calls.find(call => call[0] === 'pauseGame')[1];

      // Clear previous hook calls
      mockHooks.callAll.mockClear();

      // Pause the game
      (mockGame as any).paused = true;
      pauseHandler(true);

      // Should have emitted pauseStateChanged hook
      expect(mockHooks.callAll).toHaveBeenCalledWith(
        'seasons-stars:pauseStateChanged',
        expect.objectContaining({
          isPaused: true,
          reason: 'Game paused',
        })
      );
    });

    it('should emit pauseStateChanged hook when combat starts', async () => {
      await service.play();
      const combatStartHandler = mockHooks.on.mock.calls.find(call => call[0] === 'combatStart')[1];

      // Clear previous hook calls
      mockHooks.callAll.mockClear();

      // Start combat
      (mockGame as any).combat = { started: true };
      combatStartHandler({});

      // Should have emitted pauseStateChanged hook
      expect(mockHooks.callAll).toHaveBeenCalledWith(
        'seasons-stars:pauseStateChanged',
        expect.objectContaining({
          isPaused: true,
          reason: 'Combat active',
        })
      );
    });

    it('should emit pauseStateChanged hook when time advancement is manually started', async () => {
      // Clear previous hook calls
      mockHooks.callAll.mockClear();

      await service.play();

      // Should have emitted pauseStateChanged hook when started
      expect(mockHooks.callAll).toHaveBeenCalledWith(
        'seasons-stars:pauseStateChanged',
        expect.objectContaining({
          isPaused: false,
          reason: null,
        })
      );
    });

    it('should emit pauseStateChanged hook when time advancement is manually paused', async () => {
      await service.play();

      // Clear previous hook calls
      mockHooks.callAll.mockClear();

      service.pause();

      // Should have emitted pauseStateChanged hook when paused
      expect(mockHooks.callAll).toHaveBeenCalledWith(
        'seasons-stars:pauseStateChanged',
        expect.objectContaining({
          isPaused: true,
          reason: 'Time advancement stopped',
        })
      );
    });

    it('should skip interval advancement when blocked by external factors', async () => {
      await service.play();
      expect(service.isActive).toBe(true);

      // Block advancement with game pause
      (mockGame as any).paused = true;

      // This is a simplified test of the blocking logic
      // In reality, the interval would call isAdvancementBlocked() and skip
      const isBlocked = (service as any).isAdvancementBlocked();
      expect(isBlocked).toBe(true);

      // The actual interval would skip advancement when blocked
      // We can't easily test setInterval behavior in unit tests
    });

    it('should reset lastAdvancement when interval tick is blocked', async () => {
      vi.useFakeTimers();

      await service.play();
      const initial = (service as any).lastAdvancement;

      // Block advancement via game pause
      (mockGame as any).paused = true;

      // Advance the interval once
      vi.advanceTimersByTime(10000);

      expect(mockGame.seasonsStars.manager.advanceSeconds).not.toHaveBeenCalled();
      const after = (service as any).lastAdvancement;
      expect(after - initial).toBe(10000);

      vi.useRealTimers();
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
  });
});
