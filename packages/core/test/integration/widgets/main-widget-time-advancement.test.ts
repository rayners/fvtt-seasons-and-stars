/**
 * Tests for Main Widget Time Advancement Integration
 * Following TDD approach for time advancement section and settings button
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { CalendarWidget } from '../../../src/ui/calendar-widget';
import { TimeAdvancementService } from '../../../src/core/time-advancement-service';
import { CalendarDate } from '../../../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';

// Mock TimeAdvancementService with a dynamic mock
let mockServiceInstance: any = {
  isActive: false,
  shouldShowPauseButton: false,
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  updateRatio: vi.fn(),
  initialize: vi.fn(),
  destroy: vi.fn(),
};

vi.mock('../../../src/core/time-advancement-service', () => ({
  TimeAdvancementService: {
    getInstance: vi.fn(() => mockServiceInstance),
  },
}));

// Mock Foundry globals
const mockSettings = new Map();
const mockUI = {
  notifications: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
};

global.game = {
  settings: {
    get: vi.fn((module: string, key: string) => mockSettings.get(`${module}.${key}`)),
  },
  user: { isGM: true },
  seasonsStars: {
    manager: {
      getActiveCalendar: vi.fn(),
      getCurrentDate: vi.fn(),
      advanceSeconds: vi.fn().mockResolvedValue(undefined),
    },
  },
} as any;

global.ui = mockUI as any;

// Mock dialog classes for settings
global.Dialog = class MockDialog {
  static wait = vi.fn().mockResolvedValue({});
  render = vi.fn();
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

describe('Main Widget Time Advancement Integration', () => {
  let widget: CalendarWidget;
  let mockCalendar: SeasonsStarsCalendar;
  let mockDate: CalendarDate;
  let mockService: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    mockSettings.clear();

    // Reset user to GM (some tests change this)
    global.game.user = { isGM: true };

    // Reset the mock instance that the mocked module will return
    mockServiceInstance = {
      isActive: false,
      shouldShowPauseButton: false,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      updateRatio: vi.fn(),
      initialize: vi.fn(),
      destroy: vi.fn(),
    };

    // Keep reference for tests to modify
    mockService = mockServiceInstance;

    // Re-establish the mock after clearAllMocks
    (TimeAdvancementService.getInstance as Mock).mockReturnValue(mockServiceInstance);

    // Re-establish the game.settings.get mock after clearAllMocks
    (global.game.settings.get as Mock).mockImplementation((module: string, key: string) =>
      mockSettings.get(`${module}.${key}`)
    );

    // Create mock calendar
    mockCalendar = {
      id: 'gregorian',
      name: 'Gregorian Calendar',
      label: 'Gregorian Calendar',
      months: [
        { name: 'January', days: 31 },
        { name: 'February', days: 28 },
      ],
      weekdays: [
        { name: 'Sunday', abbreviation: 'Sun' },
        { name: 'Monday', abbreviation: 'Mon' },
      ],
      yearLength: 365,
      weekLength: 7,
      epoch: { year: 1, month: 1, day: 1 },
      translations: {
        en: {
          label: 'Gregorian Calendar',
          description: 'Standard Gregorian calendar system',
          setting: 'Standard calendar used worldwide',
        },
      },
    } as SeasonsStarsCalendar;

    // Create mock date
    mockDate = new CalendarDate(
      {
        year: 2024,
        month: 6,
        day: 15,
        weekday: 5,
        time: {
          hour: 14,
          minute: 30,
          second: 45,
        },
      },
      mockCalendar
    );

    // Reset seasonsStars manager (in case a test set it to null)
    global.game.seasonsStars = {
      manager: {
        getActiveCalendar: vi.fn(),
        getCurrentDate: vi.fn(),
        advanceSeconds: vi.fn().mockResolvedValue(undefined),
      },
    };

    // Setup manager mocks
    (global.game.seasonsStars.manager.getActiveCalendar as any).mockReturnValue(mockCalendar);
    (global.game.seasonsStars.manager.getCurrentDate as any).mockReturnValue(mockDate);

    // Set default settings
    mockSettings.set('seasons-and-stars.timeAdvancementRatio', 1.0);
    mockSettings.set('seasons-and-stars.pauseOnCombat', true);
    mockSettings.set('seasons-and-stars.resumeAfterCombat', false);

    widget = new CalendarWidget();
  });

  describe('Context Preparation with Time Advancement', () => {
    it('should include time advancement state in context for GM', async () => {
      const context = await widget._prepareContext();

      expect(context.canAdvanceTime).toBe(true);
      expect(context).toHaveProperty('timeAdvancementActive');
      expect(context).toHaveProperty('advancementRatioDisplay');
    });

    it('should not show time advancement for non-GM users', async () => {
      global.game.user = { isGM: false };

      const context = await widget._prepareContext();

      expect(context.canAdvanceTime).toBe(false);
    });

    it('should show detailed advancement information when active', async () => {
      mockService.isActive = true;
      mockService.shouldShowPauseButton = true;
      mockSettings.set('seasons-and-stars.timeAdvancementRatio', 2.5);

      const context = await widget._prepareContext();

      expect(context.timeAdvancementActive).toBe(true);
      expect(context.advancementRatioDisplay).toBe('2.5x speed');
      expect(context.timeAdvancementStatus).toContain('Active');
    });

    it('should provide pause state information', async () => {
      mockService.isActive = false;
      mockSettings.set('seasons-and-stars.timeAdvancementRatio', 0.5);

      const context = await widget._prepareContext();

      expect(context.timeAdvancementActive).toBe(false);
      expect(context.advancementRatioDisplay).toBe('0.5x speed');
      expect(context.timeAdvancementStatus).toContain('Paused');
    });

    it('should include settings information in context', async () => {
      mockSettings.set('seasons-and-stars.pauseOnCombat', true);
      mockSettings.set('seasons-and-stars.resumeAfterCombat', true);

      const context = await widget._prepareContext();

      expect(context.pauseOnCombat).toBe(true);
      expect(context.resumeAfterCombat).toBe(true);
    });
  });

  describe('Toggle Time Advancement Action', () => {
    beforeEach(() => {
      // Add the action handler to the widget
      if ((widget.constructor as any).DEFAULT_OPTIONS?.actions) {
        (widget.constructor as any).DEFAULT_OPTIONS.actions.toggleTimeAdvancement =
          CalendarWidget.prototype._onToggleTimeAdvancement;
      }
    });

    it('should start time advancement when currently inactive', async () => {
      mockService.isActive = false;
      const mockEvent = new Event('click');

      await widget._onToggleTimeAdvancement(mockEvent);

      expect(mockService.play).toHaveBeenCalled();
      expect(mockService.pause).not.toHaveBeenCalled();
    });

    it('should pause time advancement when currently active', async () => {
      mockService.isActive = true;
      mockService.shouldShowPauseButton = true;
      const mockEvent = new Event('click');

      await widget._onToggleTimeAdvancement(mockEvent);

      expect(mockService.pause).toHaveBeenCalled();
      expect(mockService.play).not.toHaveBeenCalled();
    });

    it('should handle async errors during play', async () => {
      mockService.isActive = false;
      mockService.play.mockRejectedValue(new Error('Game not ready'));
      const mockEvent = new Event('click');

      await widget._onToggleTimeAdvancement(mockEvent);

      expect(mockUI.notifications.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to toggle time advancement')
      );
    });

    it('should update widget display after successful toggle', async () => {
      const renderSpy = vi.spyOn(widget, 'render');
      const mockEvent = new Event('click');

      await widget._onToggleTimeAdvancement(mockEvent);

      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe('Time Advancement Section Rendering', () => {
    it('should include time advancement section for GM', async () => {
      const context = await widget._prepareContext();

      expect(context.canAdvanceTime).toBe(true);
      expect(context.showTimeAdvancementSection).toBe(true);
    });

    it('should hide time advancement section for players', async () => {
      global.game.user = { isGM: false };

      const context = await widget._prepareContext();

      expect(context.canAdvanceTime).toBe(false);
      expect(context.showTimeAdvancementSection).toBe(false);
    });

    it('should provide button state classes', async () => {
      mockService.isActive = true;
      mockService.shouldShowPauseButton = true;

      const context = await widget._prepareContext();

      expect(context.playPauseButtonClass).toContain('active');
      expect(context.playPauseButtonIcon).toBe('fa-pause');
      expect(context.playPauseButtonText).toBe('Pause');
    });

    it('should provide inactive button state', async () => {
      mockService.isActive = false;

      const context = await widget._prepareContext();

      expect(context.playPauseButtonClass).not.toContain('active');
      expect(context.playPauseButtonIcon).toBe('fa-play');
      expect(context.playPauseButtonText).toBe('Play');
    });
  });

  describe('Settings Integration', () => {
    it('should react to ratio changes', async () => {
      // Test multiple ratio values
      const ratios = [0.1, 0.5, 1.0, 2.0, 10.0, 100.0];

      for (const ratio of ratios) {
        mockSettings.set('seasons-and-stars.timeAdvancementRatio', ratio);
        const context = await widget._prepareContext();
        expect(context.advancementRatioDisplay).toBe(`${ratio.toFixed(1)}x speed`);
      }
    });

    it('should handle missing settings with safe defaults', async () => {
      // Clear all settings
      mockSettings.clear();
      global.game.settings.get = vi.fn().mockReturnValue(undefined);

      const context = await widget._prepareContext();

      expect(context.advancementRatioDisplay).toBe('1.0x speed');
      expect(context.pauseOnCombat).toBe(true); // Default to true
      expect(context.resumeAfterCombat).toBe(false); // Default to false
    });

    it('should update service when ratio changes through widget', () => {
      const newRatio = 3.0;

      // Simulate ratio update from settings dialog
      widget._onRatioSettingChanged?.(newRatio);

      expect(mockService.updateRatio).toHaveBeenCalledWith(newRatio);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle service unavailable gracefully', async () => {
      (TimeAdvancementService.getInstance as Mock).mockReturnValue(null);

      const context = await widget._prepareContext();

      expect(context.timeAdvancementActive).toBe(false);
      expect(context.advancementRatioDisplay).toBe('1.0x speed');
    });

    it('should handle context preparation errors', async () => {
      // Mock service to throw during state access
      Object.defineProperty(mockService, 'isActive', {
        get: () => {
          throw new Error('Service error');
        },
      });

      const context = await widget._prepareContext();

      // Should provide safe fallback values
      expect(context.timeAdvancementActive).toBe(false);
    });

    it('should handle missing calendar manager', async () => {
      global.game.seasonsStars = null;

      const context = await widget._prepareContext();

      expect(context.error).toBeTruthy();
      expect(context.canAdvanceTime).toBe(false);
    });
  });

  describe('Integration with Existing Time Controls', () => {
    it('should not interfere with existing quick time buttons', async () => {
      const context = await widget._prepareContext();

      expect(context.canAdvanceTime).toBe(true);
      // Time advancement should be separate from quick time controls
      expect(context).toHaveProperty('showTimeControls');
    });

    it('should maintain existing time display functionality', async () => {
      const context = await widget._prepareContext();

      expect(context.timeString).toBeTruthy();
      expect(context.formattedDate).toBeTruthy();
    });
  });
});
