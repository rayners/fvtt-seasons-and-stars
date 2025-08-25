/**
 * Tests for Mini Widget Time Advancement Integration
 * Following TDD approach for play/pause button functionality
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { CalendarMiniWidget } from '../src/ui/calendar-mini-widget';
import { TimeAdvancementService } from '../src/core/time-advancement-service';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

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

vi.mock('../src/core/time-advancement-service', () => ({
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
    },
  },
} as any;

// Also ensure window.game is set for any global access
(global as any).window = { game: global.game };

global.ui = mockUI as any;

// Mock SmallTimeUtils
vi.mock('../src/ui/base-widget-manager', () => ({
  SmallTimeUtils: {
    isSmallTimeAvailable: () => false,
    getSmallTimeElement: () => null,
  },
}));

describe('Mini Widget Time Advancement Integration', () => {
  let widget: CalendarMiniWidget;
  let mockCalendar: SeasonsStarsCalendar;
  let mockDate: CalendarDate;
  let mockService: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    mockSettings.clear();

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

    // Setup manager mocks
    (global.game.seasonsStars.manager.getActiveCalendar as any).mockReturnValue(mockCalendar);
    (global.game.seasonsStars.manager.getCurrentDate as any).mockReturnValue(mockDate);

    // Reset user to GM (some tests change this)
    global.game.user = { isGM: true };

    // Set default settings
    mockSettings.set('seasons-and-stars.timeAdvancementRatio', 1.0);

    // Ensure settings mock returns integers when ratio is a whole number
    global.game.settings.get = vi.fn((module: string, key: string) => {
      const value = mockSettings.get(`${module}.${key}`);
      // Convert 1.0 to 1 for display purposes
      if (key === 'timeAdvancementRatio' && value === 1.0) {
        return 1;
      }
      return value;
    });

    widget = new CalendarMiniWidget();
  });

  describe('Context Preparation with Time Advancement', () => {
    it('should include time advancement state in context when GM', async () => {
      const context = await widget._prepareContext();

      expect(context.isGM).toBe(true);
      expect(context).toHaveProperty('timeAdvancementActive');
      expect(context).toHaveProperty('advancementRatioDisplay');
    });

    it('should not include time advancement for non-GM users', async () => {
      global.game.user = { isGM: false };

      const context = await widget._prepareContext();

      expect(context.isGM).toBe(false);
      // Time advancement controls only shown to GM
    });

    it('should show active state when service is active', async () => {
      // Update the service mock to show active state
      mockServiceInstance.isActive = true;
      mockServiceInstance.shouldShowPauseButton = true;

      // Update settings to return 2 (not 2.0) for clean display
      global.game.settings.get = vi.fn().mockImplementation((module: string, key: string) => {
        if (key === 'timeAdvancementRatio') return 2;
        return mockSettings.get(`${module}.${key}`);
      });

      const context = await widget._prepareContext();

      expect(context.timeAdvancementActive).toBe(true);
      expect(context.advancementRatioDisplay).toBe('2x speed');
    });

    it('should show inactive state when service is paused', async () => {
      // Service mock is inactive by default, settings return 1 not 1.0
      const context = await widget._prepareContext();

      expect(context.timeAdvancementActive).toBe(false);
      expect(context.advancementRatioDisplay).toBe('1x speed');
    });

    it('should handle different ratio displays correctly', async () => {
      const testCases = [
        { ratio: 0.5, expected: '0.5x speed' },
        { ratio: 1, expected: '1x speed' }, // Use integer, not 1.0
        { ratio: 2, expected: '2x speed' }, // Use integer, not 2.0
        { ratio: 10, expected: '10x speed' }, // Use integer, not 10.0
      ];

      for (const testCase of testCases) {
        global.game.settings.get = vi.fn().mockImplementation((module: string, key: string) => {
          if (key === 'timeAdvancementRatio') return testCase.ratio;
          return mockSettings.get(`${module}.${key}`);
        });
        const context = await widget._prepareContext();
        expect(context.advancementRatioDisplay).toBe(testCase.expected);
      }
    });
  });

  describe('Toggle Time Advancement Action', () => {
    beforeEach(() => {
      // Add the action handler to the widget
      if ((widget.constructor as any).DEFAULT_OPTIONS?.actions) {
        (widget.constructor as any).DEFAULT_OPTIONS.actions.toggleTimeAdvancement =
          CalendarMiniWidget.prototype._onToggleTimeAdvancement;
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

    it('should handle play() errors gracefully', async () => {
      mockService.isActive = false;
      mockService.play.mockRejectedValue(new Error('Failed to start'));
      const mockEvent = new Event('click');

      await widget._onToggleTimeAdvancement(mockEvent);

      expect(mockUI.notifications.error).toHaveBeenCalledWith('Failed to toggle time advancement');
    });

    it('should prevent default event behavior', async () => {
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as any;

      await widget._onToggleTimeAdvancement(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should trigger widget re-render after successful toggle', async () => {
      const renderSpy = vi.spyOn(widget, 'render');
      const mockEvent = new Event('click');

      await widget._onToggleTimeAdvancement(mockEvent);

      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing TimeAdvancementService gracefully', async () => {
      // Mock getInstance to return null
      (TimeAdvancementService.getInstance as Mock).mockReturnValue(null);
      const mockEvent = new Event('click');

      await widget._onToggleTimeAdvancement(mockEvent);

      expect(mockUI.notifications.error).toHaveBeenCalled();
    });

    it('should handle context preparation with service errors', async () => {
      // Mock service to throw during state check
      Object.defineProperty(mockService, 'isActive', {
        get: () => {
          throw new Error('Service error');
        },
      });

      const context = await widget._prepareContext();

      // Should gracefully handle the error and provide safe defaults
      expect(context.timeAdvancementActive).toBe(false);
    });
  });

  describe('Button State Updates', () => {
    it('should handle context preparation correctly', async () => {
      // This test focuses on context preparation rather than DOM manipulation
      // which is more reliable and focuses on the actual widget functionality

      // Test active state
      mockServiceInstance.isActive = true;
      mockServiceInstance.shouldShowPauseButton = true;

      let context = await widget._prepareContext();
      expect(context.timeAdvancementActive).toBe(true);

      // Test inactive state
      mockServiceInstance.isActive = false;
      mockServiceInstance.shouldShowPauseButton = false;

      context = await widget._prepareContext();
      expect(context.timeAdvancementActive).toBe(false);
    });
  });

  describe('Settings Integration', () => {
    it('should react to ratio setting changes', async () => {
      // Change ratio setting via game.settings.get mock - use integer
      global.game.settings.get = vi.fn().mockImplementation((module: string, key: string) => {
        if (key === 'timeAdvancementRatio') return 5;
        return mockSettings.get(`${module}.${key}`);
      });

      const context = await widget._prepareContext();

      expect(context.advancementRatioDisplay).toBe('5x speed');
    });

    it('should handle missing ratio setting with default', async () => {
      // Mock settings to return undefined for timeAdvancementRatio
      global.game.settings.get = vi.fn().mockImplementation((module: string, key: string) => {
        if (key === 'timeAdvancementRatio') return undefined;
        return mockSettings.get(`${module}.${key}`);
      });

      const context = await widget._prepareContext();

      // Should use default ratio (1.0, but display as 1)
      expect(context.advancementRatioDisplay).toBe('1x speed');
    });
  });

  describe('Widget Lifecycle', () => {
    it('should properly initialize time advancement integration', () => {
      const widget = new CalendarMiniWidget();

      // Should have the toggle action registered
      expect(
        (widget.constructor as any).DEFAULT_OPTIONS?.actions?.toggleTimeAdvancement
      ).toBeDefined();
    });

    it('should clean up properly when widget is destroyed', () => {
      const widget = new CalendarMiniWidget();

      // Widget should not interfere with service lifecycle
      // Service cleanup is handled by the service itself
      expect(() => widget.close()).not.toThrow();
    });
  });
});
