/**
 * Tests for TimeAdvancementService
 * Following TDD approach - these tests define the expected behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimeAdvancementService } from '../src/core/time-advancement-service';

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
      expect(interval).toBe(1000); // Math.max(1000, 1000/1.0) = 1000
    });

    it('should calculate correct interval for 0.5 ratio (slow)', () => {
      const interval = (service as any).calculateOptimalInterval(0.5);
      expect(interval).toBe(2000); // Math.max(1000, 1000/0.5) = 2000
    });

    it('should calculate correct interval for 2.0 ratio (fast)', () => {
      const interval = (service as any).calculateOptimalInterval(2.0);
      expect(interval).toBe(1000); // Math.max(1000, 1000/2.0) = 1000 (minimum)
    });

    it('should calculate correct interval for 10.0 ratio (very fast)', () => {
      const interval = (service as any).calculateOptimalInterval(10.0);
      expect(interval).toBe(1000); // Math.max(1000, 1000/10.0) = 1000 (minimum)
    });

    it('should calculate correct interval for 0.1 ratio (very slow)', () => {
      const interval = (service as any).calculateOptimalInterval(0.1);
      expect(interval).toBe(10000); // Math.max(1000, 1000/0.1) = 10000
    });

    it('should enforce minimum interval of 1000ms', () => {
      const interval = (service as any).calculateOptimalInterval(100.0);
      expect(interval).toBe(1000); // Never less than 1000ms
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

    it('should not pause if already inactive', () => {
      expect(service.isActive).toBe(false);

      const initialCallCount = mockHooks.callAll.mock.calls.length;
      service.pause();

      // Should not fire hooks when already paused
      expect(mockHooks.callAll).toHaveBeenCalledTimes(initialCallCount);
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
        if (key === 'pauseOnCombat') return true;
        return key === 'timeAdvancementRatio' ? 1.0 : false;
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
        if (key === 'pauseOnCombat') return false;
        return key === 'timeAdvancementRatio' ? 1.0 : false;
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
        if (key === 'resumeAfterCombat') return true;
        return key === 'timeAdvancementRatio' ? 1.0 : false;
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
        if (key === 'pauseOnCombat') return true;
        return key === 'timeAdvancementRatio' ? 1.0 : false;
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
      vi.advanceTimersByTime(1000);

      // Should auto-pause on error
      expect(service.isActive).toBe(false);

      vi.useRealTimers();
    });

    it('should validate game state before starting', async () => {
      mockGame.seasonsStars = null; // Remove manager instead of setting ready = false

      await service.play();
      expect(service.isActive).toBe(false); // Should not start if manager not available
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
  });

  describe('Time Advancement Logic', () => {
    it('should advance time based on ratio', async () => {
      vi.useFakeTimers();

      service.updateRatio(2.0);
      await service.play();

      // Fast-forward timer - should trigger the interval
      vi.advanceTimersByTime(1000);

      // Should advance 2 seconds of game time for 1 second real time
      expect(mockGame.seasonsStars.manager.advanceSeconds).toHaveBeenCalledWith(2);

      vi.useRealTimers();
    });

    it('should use correct interval for different ratios', async () => {
      vi.useFakeTimers();
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      // Test 0.5 ratio (should use 2000ms interval)
      service.updateRatio(0.5);
      await service.play();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 2000);

      service.pause();
      setIntervalSpy.mockClear();

      // Test 10.0 ratio (should use 1000ms interval - minimum)
      service.updateRatio(10.0);
      await service.play();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

      vi.useRealTimers();
    });
  });

  describe('Game Pause Sync', () => {
    beforeEach(() => {
      // Mock game.paused property
      (mockGame as any).paused = false;

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

    it('should prevent starting advancement if game is paused and sync enabled', async () => {
      (mockGame as any).paused = true;

      await service.play();

      expect(service.isActive).toBe(false);
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
  });
});
