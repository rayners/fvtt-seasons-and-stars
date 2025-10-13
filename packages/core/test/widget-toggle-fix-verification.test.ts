/**
 * Verification test for Issue #312 fix
 *
 * This test verifies that the widget toggle logic now correctly uses isActive
 * instead of shouldShowPauseButton, fixing the race condition bug.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { CalendarWidget } from '../src/ui/calendar-widget';
import { CalendarMiniWidget } from '../src/ui/calendar-mini-widget';
import { TimeAdvancementService } from '../src/core/time-advancement-service';

// Mock service with the problematic state that caused the bug
let mockServiceInstance: any;

vi.mock('../src/core/time-advancement-service', () => ({
  TimeAdvancementService: {
    getInstance: vi.fn(() => mockServiceInstance),
  },
}));

// Mock Foundry globals
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
  notifications: { error: vi.fn(), info: vi.fn() },
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

// Mock logger to capture calls
vi.mock('../src/core/logger', () => ({
  Logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

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
