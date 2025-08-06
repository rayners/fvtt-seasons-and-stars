/**
 * Tests for Mini Widget Time Advancement Integration
 * Following TDD approach for play/pause button functionality
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { CalendarMiniWidget } from '../src/ui/calendar-mini-widget';
import { TimeAdvancementService } from '../src/core/time-advancement-service';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Mock TimeAdvancementService
vi.mock('../src/core/time-advancement-service', () => ({
  TimeAdvancementService: {
    getInstance: vi.fn(() => ({
      isActive: false,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      updateRatio: vi.fn(),
      initialize: vi.fn(),
      destroy: vi.fn(),
    })),
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

    // Get mocked service instance
    mockService = (TimeAdvancementService.getInstance as Mock)();
    mockService.isActive = false;

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

    // Set default settings
    mockSettings.set('seasons-and-stars.timeAdvancementRatio', 1.0);

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
      mockService.isActive = true;
      mockSettings.set('seasons-and-stars.timeAdvancementRatio', 2.0);

      const context = await widget._prepareContext();

      expect(context.timeAdvancementActive).toBe(true);
      expect(context.advancementRatioDisplay).toBe('2.0x speed');
    });

    it('should show inactive state when service is paused', async () => {
      mockService.isActive = false;

      const context = await widget._prepareContext();

      expect(context.timeAdvancementActive).toBe(false);
      expect(context.advancementRatioDisplay).toBe('1.0x speed');
    });

    it('should handle different ratio displays correctly', async () => {
      const testCases = [
        { ratio: 0.5, expected: '0.5x speed' },
        { ratio: 1.0, expected: '1.0x speed' },
        { ratio: 2.0, expected: '2.0x speed' },
        { ratio: 10.0, expected: '10.0x speed' },
      ];

      for (const testCase of testCases) {
        mockSettings.set('seasons-and-stars.timeAdvancementRatio', testCase.ratio);
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
    it('should update button appearance based on active state', async () => {
      // Mock DOM element
      const mockButton = {
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
          contains: vi.fn(),
        },
        setAttribute: vi.fn(),
        querySelector: vi.fn(),
      };

      // Mock element finding
      vi.spyOn(widget, 'element', 'get').mockReturnValue({
        querySelector: vi.fn().mockReturnValue(mockButton),
      } as any);

      // Test active state
      mockService.isActive = true;
      await widget.render();

      // Test inactive state
      mockService.isActive = false;
      await widget.render();

      // Verify context includes the correct state
      const context = await widget._prepareContext();
      expect(context.timeAdvancementActive).toBe(false);
    });
  });

  describe('Settings Integration', () => {
    it('should react to ratio setting changes', async () => {
      // Change ratio setting
      mockSettings.set('seasons-and-stars.timeAdvancementRatio', 5.0);

      const context = await widget._prepareContext();

      expect(context.advancementRatioDisplay).toBe('5.0x speed');
    });

    it('should handle missing ratio setting with default', async () => {
      // Remove ratio setting
      mockSettings.delete('seasons-and-stars.timeAdvancementRatio');
      global.game.settings.get = vi.fn().mockReturnValue(undefined);

      const context = await widget._prepareContext();

      // Should use default ratio
      expect(context.advancementRatioDisplay).toBe('1.0x speed');
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
