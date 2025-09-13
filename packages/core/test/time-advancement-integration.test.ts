/**
 * Integration Tests for Time Advancement System
 * Tests the complete system working together including widgets, service, and settings
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimeAdvancementService } from '../src/core/time-advancement-service';

// Mock Foundry globals with more complete API surface
const mockGame = {
  ready: true,
  settings: {
    get: vi.fn(),
    set: vi.fn(),
  },
  seasonsStars: {
    manager: {
      advanceSeconds: vi.fn().mockResolvedValue(undefined),
    },
  },
  time: {
    worldTime: 0,
    advance: vi.fn().mockResolvedValue(undefined),
  },
  user: {
    isGM: true,
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

describe('Time Advancement Integration Tests', () => {
  let service: TimeAdvancementService;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset singleton instance
    (TimeAdvancementService as any).instance = null;

    // Reset game mock to clean state
    mockGame.seasonsStars = {
      manager: {
        advanceSeconds: vi.fn().mockResolvedValue(undefined),
      },
    };

    mockGame.time = {
      worldTime: 0,
      advance: vi.fn().mockResolvedValue(undefined),
    };

    // Setup default mock return values for settings
    mockGame.settings.get.mockImplementation((module: string, key: string) => {
      const defaults: Record<string, any> = {
        timeAdvancementRatio: 1.0,
        pauseOnCombat: true,
        resumeAfterCombat: false,
      };
      return defaults[key];
    });

    mockHooks.on.mockReturnValue(1); // Mock hook ID

    service = TimeAdvancementService.getInstance();
    service.initialize();
  });

  afterEach(() => {
    service.destroy();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Complete System Integration', () => {
    it('should integrate with calendar manager for time advancement', async () => {
      // Setup
      service.updateRatio(2.0);

      // Start time advancement
      await service.play();
      expect(service.isActive).toBe(true);

      // Fast-forward timer to trigger advancement
      vi.advanceTimersByTime(10000);

      // Verify calendar manager was called with correct seconds
      expect(mockGame.seasonsStars.manager.advanceSeconds).toHaveBeenCalledWith(20);
    });

    it('should handle settings changes dynamically', async () => {
      // Start with default ratio
      await service.play();
      vi.advanceTimersByTime(10000);
      expect(mockGame.seasonsStars.manager.advanceSeconds).toHaveBeenCalledWith(10);

      // Change ratio through settings
      service.updateRatio(5.0);

      // Should restart with new ratio
      expect(service.isActive).toBe(true);

      // Advance timer and verify new ratio is used
      vi.advanceTimersByTime(10000);
      expect(mockGame.seasonsStars.manager.advanceSeconds).toHaveBeenCalledWith(50);
    });

    it('should integrate with combat system properly', async () => {
      // Setup combat auto-pause
      mockGame.settings.get.mockImplementation((module: string, key: string) => {
        const settings: Record<string, any> = {
          timeAdvancementRatio: 1.0,
          pauseOnCombat: true,
          resumeAfterCombat: true,
        };
        return settings[key];
      });

      // Start time advancement
      await service.play();
      expect(service.isActive).toBe(true);

      // Simulate combat start
      const combatStartHandler = (service as any).handleCombatStart;
      combatStartHandler({ id: 'test-combat' }, { round: 1, turn: 0 });

      // Should pause
      expect(service.isActive).toBe(false);
      expect(mockUI.notifications.info).toHaveBeenCalledWith('Time advancement paused for combat');

      // Simulate combat end
      const combatEndHandler = (service as any).handleCombatEnd;
      const playMock = vi.spyOn(service, 'play').mockResolvedValue();

      combatEndHandler({ id: 'test-combat' }, {}, 'user-id');

      // Should resume
      expect(playMock).toHaveBeenCalled();
    });

    it('should handle errors gracefully without breaking the system', async () => {
      // Start time advancement
      await service.play();
      expect(service.isActive).toBe(true);

      // Simulate calendar manager error
      mockGame.seasonsStars.manager.advanceSeconds.mockImplementation(() => {
        throw new Error('Calendar error');
      });

      // Timer should auto-pause on error
      vi.advanceTimersByTime(10000);
      expect(service.isActive).toBe(false);

      // Should be able to recover after fixing the error
      mockGame.seasonsStars.manager.advanceSeconds.mockResolvedValue(undefined);
      await service.play();
      expect(service.isActive).toBe(true);
    });
  });

  describe('Performance and Resource Management', () => {
    it('should efficiently handle rapid ratio changes', async () => {
      const originalPlay = service.play.bind(service);
      const playSpy = vi.spyOn(service, 'play').mockImplementation(originalPlay);

      // Rapidly change ratios
      service.updateRatio(1.0);
      service.updateRatio(2.0);
      service.updateRatio(3.0);
      service.updateRatio(4.0);
      service.updateRatio(5.0);

      // Should not create excessive play() calls
      expect(playSpy.mock.calls.length).toBeLessThanOrEqual(1);
    });

    it('should properly clean up resources on destruction', async () => {
      // Start time advancement
      await service.play();
      expect(service.isActive).toBe(true);

      // Destroy service
      service.destroy();

      // Should clean up properly
      expect(service.isActive).toBe(false);
      expect((service as any).intervalId).toBeNull();

      // Timer should not continue advancing
      const callCount = mockGame.seasonsStars.manager.advanceSeconds.mock.calls.length;
      vi.advanceTimersByTime(5000);
      expect(mockGame.seasonsStars.manager.advanceSeconds.mock.calls.length).toBe(callCount);
    });

    it('should handle long-running operations without memory leaks', async () => {
      // Start time advancement
      await service.play();

      // Simulate long runtime with many intervals
      for (let i = 0; i < 100; i++) {
        vi.advanceTimersByTime(10000);
      }

      // Should still function properly
      expect(service.isActive).toBe(true);
      expect(mockGame.seasonsStars.manager.advanceSeconds).toHaveBeenCalledTimes(100);

      // Clean destruction should work
      service.destroy();
      expect(service.isActive).toBe(false);
    });
  });

  describe('Cross-System Compatibility', () => {
    it('should work when calendar manager is temporarily unavailable', async () => {
      // Remove calendar manager
      mockGame.seasonsStars = null;

      // Should fail to start gracefully
      await service.play();
      expect(service.isActive).toBe(false);

      // Restore calendar manager
      mockGame.seasonsStars = {
        manager: {
          advanceSeconds: vi.fn().mockResolvedValue(undefined),
        },
      };

      // Should work again
      await service.play();
      expect(service.isActive).toBe(true);
    });

    it('should handle missing settings gracefully', async () => {
      // Mock settings that return undefined
      mockGame.settings.get.mockReturnValue(undefined);

      // Should use fallback values
      await service.play();
      expect(service.isActive).toBe(true);

      // Should still advance time with default ratio
      vi.advanceTimersByTime(10000);
      expect(mockGame.seasonsStars.manager.advanceSeconds).toHaveBeenCalledWith(10);
    });

    it('should work across different advancement ratios efficiently', async () => {
      const testRatios = [0.1, 0.5, 1.0, 2.0, 10.0, 100.0];

      for (const ratio of testRatios) {
        // Reset for each test
        service.pause();
        mockGame.seasonsStars.manager.advanceSeconds.mockClear();

        service.updateRatio(ratio);

        await service.play();
        expect(service.isActive).toBe(true);

        // Calculate the expected interval for this ratio
        const expectedInterval = Math.max(10000, Math.ceil(1000 / ratio));

        // Advance by the calculated interval to ensure timer fires
        vi.advanceTimersByTime(expectedInterval);
        const expectedSeconds = ratio * (expectedInterval / 1000);
        expect(mockGame.seasonsStars.manager.advanceSeconds).toHaveBeenCalledWith(expectedSeconds);
      }
    });
  });

  describe('Widget Integration Scenarios', () => {
    it('should provide correct context data for widget rendering', () => {
      // Test widget context preparation
      expect(service.isActive).toBe(false);

      const mockWidget = {
        prepareContext: () => ({
          timeAdvancementActive: service.isActive,
          advancementRatioDisplay: `${mockGame.settings.get('seasons-and-stars', 'timeAdvancementRatio')}x`,
        }),
      };

      const context = mockWidget.prepareContext();
      expect(context.timeAdvancementActive).toBe(false);
      expect(context.advancementRatioDisplay).toBe('1x');
    });

    it('should handle multiple widget interactions correctly', async () => {
      // Simulate mini widget toggle
      await service.play();
      expect(service.isActive).toBe(true);

      // Simulate main widget toggle (should pause)
      service.pause();
      expect(service.isActive).toBe(false);

      // Simulate settings button click (would open settings)
      // Settings change should update ratio
      service.updateRatio(3.0);

      // Resume from either widget
      await service.play();
      expect(service.isActive).toBe(true);

      // Verify new ratio is active
      vi.advanceTimersByTime(10000);
      expect(mockGame.seasonsStars.manager.advanceSeconds).toHaveBeenCalledWith(30);
    });
  });
});
