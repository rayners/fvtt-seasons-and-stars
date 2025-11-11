/**
 * Test for shouldShowPauseButton race condition bug
 *
 * The bug is in the shouldShowPauseButton logic:
 * - It returns true if _isActive is true OR wasActiveBeforePause is true
 * - When user clicks toggle on an inactive service that has wasActiveBeforePause=true,
 *   it calls pause() instead of play() even though service is inactive
 *
 * Root cause: shouldShowPauseButton is designed for auto-pause scenarios but
 * interferes with manual toggle logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the logger to avoid import issues
vi.mock('../../../src/core/logger', () => ({
  Logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock Foundry globals
global.game = {
  settings: {
    get: vi.fn((module: string, key: string) => {
      if (key === 'pauseOnCombat') return true;
      if (key === 'resumeAfterCombat') return false;
      if (key === 'syncWithGamePause') return true;
      return undefined;
    }),
  },
  user: { isGM: true },
  paused: false,
  combat: null,
  seasonsStars: {
    manager: {
      advanceSeconds: vi.fn(),
    },
  },
} as any;

global.ui = {
  notifications: {
    info: vi.fn(),
    error: vi.fn(),
  },
} as any;

global.Hooks = {
  on: vi.fn(),
  callAll: vi.fn(),
} as any;

describe('shouldShowPauseButton Race Condition Bug', () => {
  let TimeAdvancementService: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset the module to get a fresh instance
    vi.resetModules();

    // Import the service fresh each time
    const module = await import('../src/core/time-advancement-service');
    TimeAdvancementService = module.TimeAdvancementService;

    // Reset singleton
    TimeAdvancementService.resetInstance();
  });

  describe('Bug Scenario: wasActiveBeforePause causes wrong toggle behavior', () => {
    it('should demonstrate the exact bug when wasActiveBeforePause is true', async () => {
      const service = TimeAdvancementService.getInstance();

      // Simulate the bug scenario:
      // 1. Service was previously active
      // 2. Got auto-paused (combat, game pause, etc.) - this sets wasActiveBeforePause=true
      // 3. Service is now inactive but wasActiveBeforePause=true

      // Step 1: Start service normally
      await service.play();
      expect(service.isActive).toBe(true);
      expect(service.shouldShowPauseButton).toBe(true);

      // Step 2: Simulate auto-pause (like combat start) - NOT manual pause
      // This should set wasActiveBeforePause=true and make service inactive
      service['wasActiveBeforePause'] = true; // Simulate what combat pause does
      service['_isActive'] = false; // Simulate auto-pause
      service['intervalId'] = null; // Clear interval

      // Step 3: Verify the problematic state
      expect(service.isActive).toBe(false); // Service is NOT active
      expect(service['wasActiveBeforePause']).toBe(true); // But was active before pause
      expect(service.shouldShowPauseButton).toBe(true); // BUG: This returns true!

      // Step 4: This is the bug - shouldShowPauseButton returns true for inactive service
      // So widget calls pause() instead of play() when user clicks toggle!
      console.log('Service state:');
      console.log('- isActive:', service.isActive);
      console.log('- wasActiveBeforePause:', service['wasActiveBeforePause']);
      console.log('- shouldShowPauseButton:', service.shouldShowPauseButton);

      // THE BUG: Widget thinks it should call pause() but service is already inactive!
      expect(service.isActive).toBe(false);
      expect(service.shouldShowPauseButton).toBe(true); // This is wrong for toggle logic
    });

    it('should show correct behavior when wasActiveBeforePause is false', async () => {
      const service = TimeAdvancementService.getInstance();

      // Normal scenario: service is inactive and was not previously active
      expect(service.isActive).toBe(false);
      expect(service['wasActiveBeforePause']).toBe(false);
      expect(service.shouldShowPauseButton).toBe(false); // Correct

      // User clicks toggle - should call play()
      await service.play();
      expect(service.isActive).toBe(true);
      expect(service.shouldShowPauseButton).toBe(true); // Correct
    });
  });

  describe('Widget Toggle Logic Bug Reproduction', () => {
    it('should reproduce the exact console log sequence from bug report', async () => {
      const service = TimeAdvancementService.getInstance();
      let logMessages: string[] = [];

      // Mock Logger.info to capture log messages
      const { Logger } = await import('../src/core/logger');
      (Logger.info as any).mockImplementation((msg: string) => {
        logMessages.push(msg);
      });

      // Step 1: Service was active, then got auto-paused (simulates combat/game pause)
      await service.play();
      expect(logMessages).toContain('Starting time advancement');

      // Simulate auto-pause (what combat start or game pause does)
      service['wasActiveBeforePause'] = true;
      service['_isActive'] = false;
      service['intervalId'] = null;

      logMessages = []; // Clear logs

      // Step 2: Now user clicks "Time Advancement" button
      // Widget checks: service.shouldShowPauseButton -> returns TRUE (bug!)
      // So widget calls service.pause() instead of service.play()

      const shouldPauseAccordingToWidget = service.shouldShowPauseButton;
      console.log('Widget sees shouldShowPauseButton =', shouldPauseAccordingToWidget);
      console.log('But service.isActive =', service.isActive);

      if (shouldPauseAccordingToWidget) {
        service.pause(); // This is what widget does - WRONG!
        console.log('Widget called pause() - this logs "Pausing time advancement (manual)"');
      } else {
        await service.play(); // This is what should happen
        console.log('Widget called play() - this logs "Starting time advancement"');
      }

      // Verify we have the bug - pause was called on inactive service
      expect(service.isActive).toBe(false);
      expect(shouldPauseAccordingToWidget).toBe(true);
      // Note: After fix, pause() won't be called on inactive service anymore

      // This reproduces the console logs from the bug report:
      // [S&S] Pausing time advancement (manual) <- This happens when service is already inactive!
    });
  });

  describe('Expected Correct Behavior After Fix', () => {
    it('should use isActive instead of shouldShowPauseButton for toggle logic', async () => {
      const service = TimeAdvancementService.getInstance();

      // Simulate the same problematic state
      service['wasActiveBeforePause'] = true;
      service['_isActive'] = false;

      // CORRECT toggle logic should use isActive, not shouldShowPauseButton
      const shouldPauseCorrect = service.isActive; // Use this instead
      const shouldPauseBuggy = service.shouldShowPauseButton; // Don't use this

      expect(shouldPauseCorrect).toBe(false); // Correct: should call play()
      expect(shouldPauseBuggy).toBe(true); // Buggy: would call pause()

      // Correct action based on isActive
      if (shouldPauseCorrect) {
        service.pause();
      } else {
        await service.play();
      }

      expect(service.isActive).toBe(true); // Service should now be active
    });

    it('should demonstrate the fix: store initial state before any action', async () => {
      const service = TimeAdvancementService.getInstance();

      // Set up problematic state
      service['wasActiveBeforePause'] = true;
      service['_isActive'] = false;

      // FIXED LOGIC: Capture the actual service state, not UI state
      const serviceIsCurrentlyActive = service.isActive; // This is the truth
      // Don't use service.shouldShowPauseButton for toggle decisions!

      if (serviceIsCurrentlyActive) {
        service.pause();
      } else {
        await service.play(); // This is correct
      }

      expect(service.isActive).toBe(true);
    });
  });
});
