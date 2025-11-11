/**
 * Advanced integration tests for CalendarMiniWidget
 *
 * Consolidated from:
 * - mini-widget-time-advancement.test.ts
 * - mini-widget-compact-mode.test.ts
 * - mini-widget-pinned-position.test.ts
 * - mini-widget-time-display.test.ts
 */

import { describe, it, expect, beforeEach, vi, afterEach, type Mock } from 'vitest';
import { CalendarMiniWidget } from '../../../src/ui/calendar-mini-widget';
import { TimeAdvancementService } from '../../../src/core/time-advancement-service';
import { CalendarDate } from '../../../src/core/calendar-date';
import { SmallTimeUtils } from '../../../src/ui/base-widget-manager';
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

vi.mock('../../../src/core/logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../src/core/date-formatter', () => ({
  DateFormatter: {
    formatDate: vi.fn().mockReturnValue('Formatted Date'),
    formatShortDate: vi.fn().mockReturnValue('Short Date'),
    formatTime: vi.fn().mockReturnValue('12:00'),
    formatWeekday: vi.fn().mockReturnValue('Mon'),
  },
}));

vi.mock('../../../src/ui/base-widget-manager', () => ({
  SmallTimeUtils: {
    isSmallTimeAvailable: vi.fn().mockReturnValue(false),
  },
  BaseWidgetManager: class {},
}));

(global as any).foundry = {
  utils: {
    mergeObject: (original: any, other: any) => ({ ...original, ...other }),
  },
  applications: {
    ux: {
      Draggable: vi.fn().mockImplementation(() => ({
        _onDragMouseDown: vi.fn(),
        _onDragMouseUp: vi.fn(),
      })),
    },
  },
};

describe('CalendarMiniWidget - Advanced Integration Tests', () => {
  describe('Time Advancement Integration', () => {
    let widget: CalendarMiniWidget;
    let mockCalendar: SeasonsStarsCalendar;
    let mockDate: CalendarDate;
    let mockService: any;
    const mockSettings = new Map();
    const mockUI = {
      notifications: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      },
    };

    beforeEach(() => {
      vi.clearAllMocks();
      mockSettings.clear();

      mockServiceInstance = {
        isActive: false,
        shouldShowPauseButton: false,
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        updateRatio: vi.fn(),
        initialize: vi.fn(),
        destroy: vi.fn(),
      };

      mockService = mockServiceInstance;
      (TimeAdvancementService.getInstance as Mock).mockReturnValue(mockServiceInstance);

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

      global.game = {
        settings: {
          get: vi.fn((module: string, key: string) => {
            const value = mockSettings.get(`${module}.${key}`);
            if (key === 'timeAdvancementRatio' && value === 1.0) {
              return 1;
            }
            return value;
          }),
        },
        user: { isGM: true },
        seasonsStars: {
          manager: {
            getActiveCalendar: vi.fn().mockReturnValue(mockCalendar),
            getCurrentDate: vi.fn().mockReturnValue(mockDate),
          },
        },
      } as any;

      (global as any).window = { game: global.game };
      global.ui = mockUI as any;

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
      });

      it('should show active state when service is active', async () => {
        mockServiceInstance.isActive = true;
        mockServiceInstance.shouldShowPauseButton = true;

        global.game.settings.get = vi.fn().mockImplementation((module: string, key: string) => {
          if (key === 'timeAdvancementRatio') return 2;
          return mockSettings.get(`${module}.${key}`);
        });

        const context = await widget._prepareContext();

        expect(context.timeAdvancementActive).toBe(true);
        expect(context.advancementRatioDisplay).toBe('2x speed');
      });

      it('should show inactive state when service is paused', async () => {
        const context = await widget._prepareContext();

        expect(context.timeAdvancementActive).toBe(false);
        expect(context.advancementRatioDisplay).toBe('1x speed');
      });

      it('should handle different ratio displays correctly', async () => {
        const testCases = [
          { ratio: 0.5, expected: '0.5x speed' },
          { ratio: 1, expected: '1x speed' },
          { ratio: 2, expected: '2x speed' },
          { ratio: 10, expected: '10x speed' },
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

        expect(mockUI.notifications.error).toHaveBeenCalledWith(
          'Failed to toggle time advancement'
        );
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
        (TimeAdvancementService.getInstance as Mock).mockReturnValue(null);
        const mockEvent = new Event('click');

        await widget._onToggleTimeAdvancement(mockEvent);

        expect(mockUI.notifications.error).toHaveBeenCalled();
      });

      it('should handle context preparation with service errors', async () => {
        Object.defineProperty(mockService, 'isActive', {
          get: () => {
            throw new Error('Service error');
          },
        });

        const context = await widget._prepareContext();

        expect(context.timeAdvancementActive).toBe(false);
      });
    });

    describe('Button State Updates', () => {
      it('should handle context preparation correctly', async () => {
        mockServiceInstance.isActive = true;
        mockServiceInstance.shouldShowPauseButton = true;

        let context = await widget._prepareContext();
        expect(context.timeAdvancementActive).toBe(true);

        mockServiceInstance.isActive = false;
        mockServiceInstance.shouldShowPauseButton = false;

        context = await widget._prepareContext();
        expect(context.timeAdvancementActive).toBe(false);
      });
    });

    describe('Settings Integration', () => {
      it('should react to ratio setting changes', async () => {
        global.game.settings.get = vi.fn().mockImplementation((module: string, key: string) => {
          if (key === 'timeAdvancementRatio') return 5;
          return mockSettings.get(`${module}.${key}`);
        });

        const context = await widget._prepareContext();

        expect(context.advancementRatioDisplay).toBe('5x speed');
      });

      it('should handle missing ratio setting with default', async () => {
        global.game.settings.get = vi.fn().mockImplementation((module: string, key: string) => {
          if (key === 'timeAdvancementRatio') return undefined;
          return mockSettings.get(`${module}.${key}`);
        });

        const context = await widget._prepareContext();

        expect(context.advancementRatioDisplay).toBe('1x speed');
      });
    });

    describe('Widget Lifecycle', () => {
      it('should properly initialize time advancement integration', () => {
        const widget = new CalendarMiniWidget();

        expect(
          (widget.constructor as any).DEFAULT_OPTIONS?.actions?.toggleTimeAdvancement
        ).toBeDefined();
      });

      it('should clean up properly when widget is destroyed', () => {
        const widget = new CalendarMiniWidget();

        expect(() => widget.close()).not.toThrow();
      });
    });
  });

  describe('Compact Mode Context', () => {
    let widget: CalendarMiniWidget;
    const mockGame = {
      settings: {
        get: vi.fn(),
      },
      user: {
        isGM: true,
      },
      seasonsStars: {
        manager: {
          getActiveCalendar: vi.fn().mockReturnValue({
            id: 'test-calendar',
            label: 'Test Calendar',
            description: 'Test calendar description',
            weekdays: [
              { name: 'Monday', abbreviation: 'Mon' },
              { name: 'Tuesday', abbreviation: 'Tue' },
              { name: 'Wednesday', abbreviation: 'Wed' },
              { name: 'Thursday', abbreviation: 'Thu' },
              { name: 'Friday', abbreviation: 'Fri' },
              { name: 'Saturday', abbreviation: 'Sat' },
              { name: 'Sunday', abbreviation: 'Sun' },
            ],
          }),
          getCurrentDate: vi.fn().mockReturnValue({
            day: 1,
            month: 1,
            year: 2024,
            weekday: 0,
            toShortString: vi.fn().mockReturnValue('Jan 1'),
            toLongString: vi.fn().mockReturnValue('January 1, 2024'),
            toObject: vi.fn().mockReturnValue({ day: 1, month: 1, year: 2024 }),
            time: { hour: 12, minute: 0, second: 0 },
            countsForWeekdays: vi.fn().mockReturnValue(true),
          }),
        },
      },
    };

    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(SmallTimeUtils.isSmallTimeAvailable).mockReturnValue(false);
      globalThis.game = mockGame as any;
      widget = new CalendarMiniWidget();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    describe('Context-Based Compact Mode Logic', () => {
      it('should set compactMode true when both weekday and time controls are active', async () => {
        mockGame.settings.get.mockImplementation((module: string, setting: string) => {
          if (setting === 'miniWidgetShowDayOfWeek') return true;
          if (setting === 'miniWidgetQuickTimeButtons') return true;
          return false;
        });

        const context = await widget._prepareContext();

        expect(context.compactMode).toBe(true);
      });

      it('should set compactMode false when only weekday is active', async () => {
        mockGame.settings.get.mockImplementation((module: string, setting: string) => {
          if (setting === 'miniWidgetShowDayOfWeek') return true;
          if (setting === 'alwaysShowQuickTimeButtons') return false;
          return false;
        });

        vi.mocked(SmallTimeUtils.isSmallTimeAvailable).mockReturnValue(true);

        const context = await widget._prepareContext();

        expect(context.compactMode).toBe(false);
        expect(context.showDayOfWeek).toBe(true);
        expect(context.showTimeControls).toBe(false);
      });

      it('should set compactMode false when only time controls are active', async () => {
        mockGame.settings.get.mockImplementation((module: string, setting: string) => {
          if (setting === 'miniWidgetShowDayOfWeek') return false;
          if (setting === 'miniWidgetQuickTimeButtons') return true;
          return false;
        });

        const context = await widget._prepareContext();

        expect(context.compactMode).toBe(false);
      });

      it('should set compactMode false when neither feature is active', async () => {
        mockGame.settings.get.mockImplementation((module: string, setting: string) => {
          if (setting === 'miniWidgetShowDayOfWeek') return false;
          if (setting === 'miniWidgetQuickTimeButtons') return false;
          return false;
        });

        const context = await widget._prepareContext();

        expect(context.compactMode).toBe(false);
      });

      it('should include compactMode in the context structure', async () => {
        mockGame.settings.get.mockReturnValue(false);

        const context = await widget._prepareContext();

        expect(context).toHaveProperty('compactMode');
        expect(typeof context.compactMode).toBe('boolean');
      });
    });

    describe('Context Structure Validation', () => {
      it('should maintain all existing context properties', async () => {
        mockGame.settings.get.mockReturnValue(false);

        const context = await widget._prepareContext();

        expect(context).toHaveProperty('shortDate');
        expect(context).toHaveProperty('hasSmallTime');
        expect(context).toHaveProperty('showTimeControls');
        expect(context).toHaveProperty('showTime');
        expect(context).toHaveProperty('timeString');
        expect(context).toHaveProperty('showDayOfWeek');
        expect(context).toHaveProperty('weekdayDisplay');
        expect(context).toHaveProperty('calendar');
        expect(context).toHaveProperty('currentDate');
        expect(context).toHaveProperty('formattedDate');
        expect(context).toHaveProperty('isGM');
        expect(context).toHaveProperty('compactMode');
      });

      it('should derive compactMode correctly based on feature flags', async () => {
        const testCases = [
          {
            showDayOfWeek: true,
            alwaysShow: true,
            hasSmallTime: false,
            expectedCompact: true,
            expectedShowTimeControls: true,
          },
          {
            showDayOfWeek: true,
            alwaysShow: false,
            hasSmallTime: true,
            expectedCompact: false,
            expectedShowTimeControls: false,
          },
          {
            showDayOfWeek: false,
            alwaysShow: true,
            hasSmallTime: false,
            expectedCompact: false,
            expectedShowTimeControls: true,
          },
          {
            showDayOfWeek: false,
            alwaysShow: false,
            hasSmallTime: true,
            expectedCompact: false,
            expectedShowTimeControls: false,
          },
        ];

        for (const testCase of testCases) {
          mockGame.settings.get.mockImplementation((module: string, setting: string) => {
            if (setting === 'miniWidgetShowDayOfWeek') return testCase.showDayOfWeek;
            if (setting === 'alwaysShowQuickTimeButtons') return testCase.alwaysShow;
            return false;
          });

          vi.mocked(SmallTimeUtils.isSmallTimeAvailable).mockReturnValue(testCase.hasSmallTime);

          const context = await widget._prepareContext();

          expect(context.compactMode).toBe(testCase.expectedCompact);
          expect(context.showDayOfWeek).toBe(testCase.showDayOfWeek);
          expect(context.showTimeControls).toBe(testCase.expectedShowTimeControls);
        }
      });
    });
  });

  describe('Pinned Positioning', () => {
    let widget: CalendarMiniWidget;
    const mockSettings = new Map();

    beforeEach(() => {
      vi.clearAllMocks();
      mockSettings.clear();
      mockSettings.set('seasons-and-stars.miniWidgetPinned', true);
      mockSettings.set('seasons-and-stars.miniWidgetPosition', { top: 100, left: 50 });

      global.game = {
        settings: {
          get: vi.fn((module: string, key: string) => mockSettings.get(`${module}.${key}`)),
          set: vi.fn((module: string, key: string, value: unknown) => {
            mockSettings.set(`${module}.${key}`, value);
            return Promise.resolve();
          }),
        },
        user: { isGM: true },
        seasonsStars: {} as any,
      } as any;

      widget = new CalendarMiniWidget();
      (widget as any).element = document.createElement('div');
    });

    it('applies stored position when pinned', () => {
      (widget as any).position = { top: 100, left: 50 };

      (widget as any).applyPinnedPosition();
      const element = widget.element as HTMLElement;
      expect(element.style.top).toBe('100px');
      expect(element.style.left).toBe('50px');
      expect(element.style.position).toBe('fixed');
      expect(element.classList.contains('standalone-mode')).toBe(true);
    });

    it('sets up dragging with Foundry Draggable class', () => {
      const element = widget.element as HTMLElement;

      expect(() => {
        (widget as any).setupDragging();
      }).not.toThrow();

      expect((global as any).foundry.applications.ux.Draggable).toHaveBeenCalledWith(
        widget,
        element,
        element,
        false
      );
    });

    it('skips positioning when ApplicationV2 position is undefined', () => {
      (widget as any).position = { top: undefined, left: undefined };
      const element = widget.element as HTMLElement;

      (widget as any).applyPinnedPosition();

      expect(element.style.top).toBe('');
      expect(element.style.left).toBe('');
      expect(element.style.position).toBe('');
      expect(element.classList.contains('standalone-mode')).toBe(true);
    });
  });

  describe('Time Display', () => {
    let widget: CalendarMiniWidget;
    let mockCalendar: SeasonsStarsCalendar;
    let mockDate: CalendarDate;
    const mockSettings = new Map();

    beforeEach(() => {
      mockSettings.clear();

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

      global.game = {
        settings: {
          get: vi.fn((module: string, key: string) => mockSettings.get(`${module}.${key}`)),
        },
        user: { isGM: true },
        seasonsStars: {
          manager: {
            getActiveCalendar: vi.fn().mockReturnValue(mockCalendar),
            getCurrentDate: vi.fn().mockReturnValue(mockDate),
          },
        },
      } as any;

      widget = new CalendarMiniWidget();
    });

    it('should not show time when setting is disabled', async () => {
      mockSettings.set('seasons-and-stars.miniWidgetShowTime', false);

      const context = await widget._prepareContext();

      expect(context.showTime).toBe(false);
      expect(context.timeString).toBe('');
    });

    it('should show formatted time when setting is enabled', async () => {
      mockSettings.set('seasons-and-stars.miniWidgetShowTime', true);

      const context = await widget._prepareContext();

      expect(context.showTime).toBe(true);
      expect(context.timeString).toBe('14:30');
    });

    it('should handle dates without time gracefully', async () => {
      const mockDateNoTime = new CalendarDate(
        {
          year: 2024,
          month: 6,
          day: 15,
          weekday: 5,
        },
        mockCalendar
      );

      (global.game.seasonsStars.manager.getCurrentDate as any).mockReturnValue(mockDateNoTime);
      mockSettings.set('seasons-and-stars.miniWidgetShowTime', true);

      const context = await widget._prepareContext();

      expect(context.showTime).toBe(true);
      expect(context.timeString).toBe('');
    });

    it('should format time with proper padding', async () => {
      const mockDateSingleDigits = new CalendarDate(
        {
          year: 2024,
          month: 6,
          day: 15,
          weekday: 5,
          time: {
            hour: 9,
            minute: 5,
            second: 0,
          },
        },
        mockCalendar
      );

      (global.game.seasonsStars.manager.getCurrentDate as any).mockReturnValue(
        mockDateSingleDigits
      );
      mockSettings.set('seasons-and-stars.miniWidgetShowTime', true);

      const context = await widget._prepareContext();

      expect(context.timeString).toBe('09:05');
    });
  });
});
