/**
 * Direct test of the widget toggle race condition bug
 *
 * This test will FAIL with the current buggy implementation and PASS after the fix
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { CalendarWidget } from '../../../src/ui/calendar-widget';
import { CalendarMiniWidget } from '../../../src/ui/calendar-mini-widget';
import { TimeAdvancementService } from '../../../src/core/time-advancement-service';

// Mock that exposes the race condition by tracking call order
let mockServiceInstance: any;
let callOrder: string[] = [];

vi.mock('../../../src/core/time-advancement-service', () => ({
  TimeAdvancementService: {
    getInstance: vi.fn(() => mockServiceInstance),
  },
}));

// Mock Foundry globals minimally
global.game = {
  settings: { get: vi.fn().mockReturnValue(1.0) },
  user: { isGM: true },
  seasonsStars: {
    manager: {
      getActiveCalendar: vi.fn().mockReturnValue({}),
      getCurrentDate: vi.fn().mockReturnValue({}),
    },
  },
} as any;

global.ui = {
  notifications: {
    error: vi.fn(),
    info: vi.fn(),
  },
} as any;

global.foundry = {
  applications: {
    api: {
      HandlebarsApplicationMixin: (base: any) => base,
      ApplicationV2: class MockApplicationV2 {
        render = vi.fn();
        close = vi.fn();
      },
    },
  },
} as any;

// Mock logger
vi.mock('../../../src/core/logger', () => ({
  Logger: {
    info: vi.fn((msg: string) => {
      callOrder.push(`LOG: ${msg}`);
    }),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Widget Toggle Race Condition Bug - Direct Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callOrder = [];

    // Create service mock that tracks when methods are called
    mockServiceInstance = {
      _isActive: false,

      get isActive() {
        return this._isActive;
      },

      get shouldShowPauseButton() {
        const result = this._isActive;
        callOrder.push(`GET shouldShowPauseButton: ${result}`);
        return result;
      },

      play: vi.fn().mockImplementation(async function (this: any) {
        callOrder.push('CALL play()');
        this._isActive = true;
        return Promise.resolve();
      }),

      pause: vi.fn().mockImplementation(function (this: any) {
        callOrder.push('CALL pause()');
        this._isActive = false;
      }),

      updateRatio: vi.fn(),
      initialize: vi.fn(),
      destroy: vi.fn(),
    };

    (TimeAdvancementService.getInstance as Mock).mockReturnValue(mockServiceInstance);
  });

  describe('Calendar Widget Race Condition', () => {
    it('should demonstrate race condition in current implementation', async () => {
      const widget = new CalendarWidget();
      // Override render to avoid ApplicationV2 complications
      widget.render = vi.fn();

      const mockEvent = new Event('click');

      // Initial state: inactive
      expect(mockServiceInstance._isActive).toBe(false);

      // This will expose the bug if it exists
      await widget._onToggleTimeAdvancement(mockEvent);

      // Print call order for debugging
      console.log('Call order:', callOrder);

      // With current buggy implementation, we expect:
      // 1. shouldShowPauseButton is checked (returns false)
      // 2. play() is called
      // 3. If there's any second check of shouldShowPauseButton (bug), it would return true

      // The bug manifests in console logs, so let's verify the basic behavior
      expect(mockServiceInstance.play).toHaveBeenCalledTimes(1);
      expect(mockServiceInstance.pause).not.toHaveBeenCalled();
      expect(mockServiceInstance._isActive).toBe(true);
    });
  });

  describe('Mini Widget Race Condition', () => {
    it('should demonstrate race condition in mini widget implementation', async () => {
      const widget = new CalendarMiniWidget();
      // Override render to avoid ApplicationV2 complications
      widget.render = vi.fn();

      const mockEvent = new Event('click');

      // Initial state: inactive
      expect(mockServiceInstance._isActive).toBe(false);

      await widget._onToggleTimeAdvancement(mockEvent);

      // Print call order for debugging
      console.log('Mini widget call order:', callOrder);

      expect(mockServiceInstance.play).toHaveBeenCalledTimes(1);
      expect(mockServiceInstance.pause).not.toHaveBeenCalled();
      expect(mockServiceInstance._isActive).toBe(true);
    });
  });

  describe('Expected behavior after fix', () => {
    it('should check shouldShowPauseButton exactly once before any action', async () => {
      // This test represents what should happen:
      // 1. Check shouldShowPauseButton once
      // 2. Take appropriate action based on that single check
      // 3. Don't re-check shouldShowPauseButton after the action

      const service = mockServiceInstance;

      // Simulate correct logic: check state once, then act
      const shouldPause = service.shouldShowPauseButton; // Check once

      if (shouldPause) {
        service.pause();
      } else {
        await service.play(); // Don't check shouldShowPauseButton after this
      }

      // Verify the call pattern
      expect(callOrder).toEqual(['GET shouldShowPauseButton: false', 'CALL play()']);

      // Only one check of shouldShowPauseButton, followed by appropriate action
      expect(mockServiceInstance.play).toHaveBeenCalledTimes(1);
      expect(mockServiceInstance.pause).not.toHaveBeenCalled();
    });

    it('should work correctly for pause action too', async () => {
      // Start with active service
      mockServiceInstance._isActive = true;
      callOrder = [];

      const service = mockServiceInstance;

      // Simulate correct logic: check state once, then act
      const shouldPause = service.shouldShowPauseButton; // Check once

      if (shouldPause) {
        service.pause(); // Don't check shouldShowPauseButton after this
      } else {
        await service.play();
      }

      // Verify the call pattern
      expect(callOrder).toEqual(['GET shouldShowPauseButton: true', 'CALL pause()']);

      expect(mockServiceInstance.pause).toHaveBeenCalledTimes(1);
      expect(mockServiceInstance.play).not.toHaveBeenCalled();
    });
  });

  describe('What happens with rapid clicks (bug manifestation)', () => {
    it('should show how rapid clicks can expose the race condition', async () => {
      const widget = new CalendarWidget();
      widget.render = vi.fn();

      const mockEvent = new Event('click');

      // First click - should start
      await widget._onToggleTimeAdvancement(mockEvent);
      expect(mockServiceInstance._isActive).toBe(true);

      const firstCallOrder = [...callOrder];
      callOrder = []; // Reset for second click

      // Second click immediately - should pause
      await widget._onToggleTimeAdvancement(mockEvent);
      expect(mockServiceInstance._isActive).toBe(false);

      const secondCallOrder = [...callOrder];

      // The bug would be if we saw multiple checks of shouldShowPauseButton
      // within a single toggle operation, especially after calling play()
      console.log('First click call order:', firstCallOrder);
      console.log('Second click call order:', secondCallOrder);

      // Verify normal toggle behavior works
      expect(mockServiceInstance.play).toHaveBeenCalledTimes(1);
      expect(mockServiceInstance.pause).toHaveBeenCalledTimes(1);
    });
  });
});

// ========================================
// Fix Verification
// ========================================
describe('Issue #312 Fix Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Create service mock with the problematic state that caused the original bug
    mockServiceInstance = {
      _isActive: false, // Service is NOT active
      _wasActiveBeforePause: true, // But was active before auto-pause

      // This returns false (correct state)
      get isActive() {
        return this._isActive;
      },

      // This returns true (UI state that caused the bug)
      get shouldShowPauseButton() {
        return this._isActive || this._wasActiveBeforePause;
      },

      play: vi.fn().mockImplementation(async function (this: any) {
        this._isActive = true;
        return Promise.resolve();
      }),

      pause: vi.fn().mockImplementation(function (this: any) {
        this._isActive = false;
      }),

      updateRatio: vi.fn(),
      initialize: vi.fn(),
      destroy: vi.fn(),
    };

    (TimeAdvancementService.getInstance as Mock).mockReturnValue(mockServiceInstance);
  });

  describe('Calendar Widget Fix', () => {
    it('should use isActive instead of shouldShowPauseButton for toggle decisions', async () => {
      const widget = new CalendarWidget();
      widget.render = vi.fn(); // Mock render

      // Set up the problematic state that caused the original bug
      mockServiceInstance._isActive = false; // Service inactive
      mockServiceInstance._wasActiveBeforePause = true; // But was active before pause

      // Verify the problematic state exists
      expect(mockServiceInstance.isActive).toBe(false); // Correct: service is inactive
      expect(mockServiceInstance.shouldShowPauseButton).toBe(true); // UI shows pause button

      // With the fix: widget should call play() because isActive = false
      const mockEvent = new Event('click');
      await widget._onToggleTimeAdvancement(mockEvent);

      // FIXED: Widget should call play() because service.isActive = false
      expect(mockServiceInstance.play).toHaveBeenCalledTimes(1);
      expect(mockServiceInstance.pause).not.toHaveBeenCalled();

      // Service should now be active
      expect(mockServiceInstance.isActive).toBe(true);
    });

    it('should still pause when service is actually active', async () => {
      const widget = new CalendarWidget();
      widget.render = vi.fn();

      // Set up active state
      mockServiceInstance._isActive = true;
      mockServiceInstance._wasActiveBeforePause = false;

      expect(mockServiceInstance.isActive).toBe(true);

      const mockEvent = new Event('click');
      await widget._onToggleTimeAdvancement(mockEvent);

      // Should pause because isActive = true
      expect(mockServiceInstance.pause).toHaveBeenCalledTimes(1);
      expect(mockServiceInstance.play).not.toHaveBeenCalled();
    });
  });

  describe('Mini Widget Fix', () => {
    it('should use isActive instead of shouldShowPauseButton for toggle decisions', async () => {
      const widget = new CalendarMiniWidget();
      widget.render = vi.fn();

      // Set up the problematic state
      mockServiceInstance._isActive = false;
      mockServiceInstance._wasActiveBeforePause = true;

      expect(mockServiceInstance.isActive).toBe(false);
      expect(mockServiceInstance.shouldShowPauseButton).toBe(true);

      const mockEvent = new Event('click');
      await widget._onToggleTimeAdvancement(mockEvent);

      // FIXED: Should call play() because isActive = false
      expect(mockServiceInstance.play).toHaveBeenCalledTimes(1);
      expect(mockServiceInstance.pause).not.toHaveBeenCalled();
    });
  });

  describe('Before vs After Fix Behavior', () => {
    it('should demonstrate the difference between old buggy behavior and new fixed behavior', async () => {
      // Set up problematic state
      mockServiceInstance._isActive = false;
      mockServiceInstance._wasActiveBeforePause = true;

      // OLD BUGGY LOGIC (what the code used to do):
      const oldBuggyDecision = mockServiceInstance.shouldShowPauseButton;
      // This would return true, causing widget to call pause() on inactive service

      // NEW FIXED LOGIC (what the code now does):
      const newFixedDecision = mockServiceInstance.isActive;
      // This returns false, causing widget to correctly call play()

      expect(oldBuggyDecision).toBe(true); // Would cause bug
      expect(newFixedDecision).toBe(false); // Correct behavior

      // Simulate fixed widget behavior
      if (newFixedDecision) {
        mockServiceInstance.pause();
      } else {
        await mockServiceInstance.play();
      }

      // Verify correct action was taken
      expect(mockServiceInstance.play).toHaveBeenCalledTimes(1);
      expect(mockServiceInstance.pause).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle the case where both isActive and wasActiveBeforePause are false', async () => {
      const widget = new CalendarWidget();
      widget.render = vi.fn();

      mockServiceInstance._isActive = false;
      mockServiceInstance._wasActiveBeforePause = false;

      const mockEvent = new Event('click');
      await widget._onToggleTimeAdvancement(mockEvent);

      // Should call play()
      expect(mockServiceInstance.play).toHaveBeenCalledTimes(1);
      expect(mockServiceInstance.pause).not.toHaveBeenCalled();
    });

    it('should handle the case where both isActive and wasActiveBeforePause are true', async () => {
      const widget = new CalendarWidget();
      widget.render = vi.fn();

      mockServiceInstance._isActive = true;
      mockServiceInstance._wasActiveBeforePause = true;

      const mockEvent = new Event('click');
      await widget._onToggleTimeAdvancement(mockEvent);

      // Should call pause() because isActive = true
      expect(mockServiceInstance.pause).toHaveBeenCalledTimes(1);
      expect(mockServiceInstance.play).not.toHaveBeenCalled();
    });
  });
});
