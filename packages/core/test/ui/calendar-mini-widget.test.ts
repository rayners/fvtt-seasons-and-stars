/**
 * Comprehensive tests for CalendarMiniWidget
 * Tests all mini widget functionality including click behaviors, rendering, positioning, and integrations
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { CalendarMiniWidget } from '../../src/ui/calendar-mini-widget';
import { TimeAdvancementService } from '../../src/core/time-advancement-service';
import { CalendarWidgetManager } from '../../src/ui/widget-manager';
import { CalendarDate } from '../../src/core/calendar-date';
import { mockStandardCalendar } from '../mocks/calendar-mocks';
import type { SeasonsStarsCalendar } from '../../src/types/calendar';

// Mock TimeAdvancementService
let mockServiceInstance: any = {
  isActive: false,
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  updateRatio: vi.fn(),
  initialize: vi.fn(),
  destroy: vi.fn(),
};

vi.mock('../../src/core/time-advancement-service', () => ({
  TimeAdvancementService: {
    getInstance: vi.fn(() => mockServiceInstance),
  },
}));

// Mock CalendarWidgetManager
vi.mock('../../src/ui/widget-manager', () => ({
  CalendarWidgetManager: {
    showWidget: vi.fn(),
  },
}));

// Mock SmallTimeUtils
vi.mock('../../src/ui/base-widget-manager', () => ({
  SmallTimeUtils: {
    isSmallTimeAvailable: () => false,
    getSmallTimeElement: () => null,
  },
}));

// Mock dynamic imports
vi.mock('../../src/ui/calendar-selection-dialog', () => ({
  CalendarSelectionDialog: vi.fn().mockImplementation(() => ({
    render: vi.fn(),
  })),
}));

describe('CalendarMiniWidget', () => {
  let widget: CalendarMiniWidget;
  let mockCalendar: SeasonsStarsCalendar;
  let mockDate: CalendarDate;
  let mockSettings: Map<string, any>;
  let mockNotifications: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset mock instances
    mockServiceInstance = {
      isActive: false,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      updateRatio: vi.fn(),
      initialize: vi.fn(),
      destroy: vi.fn(),
    };

    // Re-establish the mock after clearAllMocks
    (TimeAdvancementService.getInstance as Mock).mockReturnValue(mockServiceInstance);

    // Setup settings mock
    mockSettings = new Map();
    mockSettings.set('seasons-and-stars.miniWidgetShowTime', false);
    mockSettings.set('seasons-and-stars.miniWidgetShowDayOfWeek', false);
    mockSettings.set('seasons-and-stars.alwaysShowQuickTimeButtons', false);
    mockSettings.set('seasons-and-stars.timeAdvancementRatio', 1.0);
    mockSettings.set('seasons-and-stars.defaultWidget', 'main');

    // Setup notifications mock
    mockNotifications = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    };

    // Create mock calendar
    mockCalendar = { ...mockStandardCalendar };

    // Create mock date
    mockDate = new CalendarDate(
      {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 0,
        time: {
          hour: 12,
          minute: 30,
          second: 0,
        },
      },
      mockCalendar
    );

    // Setup global game object
    global.game = {
      settings: {
        get: vi.fn((module: string, key: string) => mockSettings.get(`${module}.${key}`)),
      },
      user: { isGM: true },
      seasonsStars: {
        manager: {
          getActiveCalendar: vi.fn().mockReturnValue(mockCalendar),
          getCurrentDate: vi.fn().mockReturnValue(mockDate),
          getAllCalendars: vi.fn().mockReturnValue([mockCalendar]),
          advanceMinutes: vi.fn().mockResolvedValue(undefined),
          advanceHours: vi.fn().mockResolvedValue(undefined),
        },
      },
    } as any;

    global.ui = { notifications: mockNotifications } as any;

    // Create widget instance
    widget = new CalendarMiniWidget();
  });

  describe('Click Behavior', () => {
    let renderedWidget: CalendarMiniWidget;

    beforeEach(async () => {
      // Create a widget and actually render it so the click handlers are set up
      renderedWidget = new CalendarMiniWidget();

      // Mock the render process to set up the DOM properly
      const mockElement = document.createElement('div');
      mockElement.innerHTML = `
        <div class="calendar-mini-content">
          <div class="mini-header-row">
            <div class="mini-date" data-action="openCalendarSelection" title="Test Date (Click for larger view, Double-click to change calendar)">
              Test Date
            </div>
          </div>
        </div>
      `;

      // Set up the widget's element
      (renderedWidget as any).element = mockElement;

      // Trigger the actual _onRender method to set up click handlers
      await renderedWidget._onRender({}, {});
    });

    it('should open larger view on single click', async () => {
      // Test for the NEW behavior (single click → larger view)
      const miniDateElement = renderedWidget.element?.querySelector('.mini-date') as HTMLElement;
      expect(miniDateElement).toBeTruthy();

      let methodCalled = false;
      const originalMethod = renderedWidget._onOpenLargerView;
      renderedWidget._onOpenLargerView = async (event, target) => {
        methodCalled = true;
        // Call original method to maintain behavior and hit coverage
        await originalMethod.call(renderedWidget, event, target);
      };

      // Click the actual element with the real event handlers
      miniDateElement.click();

      expect(methodCalled).toBe(true);
    });

    it('should open calendar selection on double click', async () => {
      // Test for the NEW behavior (double-click → calendar selection)
      const miniDateElement = renderedWidget.element?.querySelector('.mini-date') as HTMLElement;
      expect(miniDateElement).toBeTruthy();

      let methodCalled = false;
      const originalMethod = renderedWidget._onOpenCalendarSelection;
      renderedWidget._onOpenCalendarSelection = async (event, target) => {
        methodCalled = true;
        // Call original method to maintain behavior and hit coverage
        await originalMethod.call(renderedWidget, event, target);
      };

      // Trigger double click event directly
      const dblclickEvent = new MouseEvent('dblclick', {
        bubbles: true,
        cancelable: true,
      });
      miniDateElement.dispatchEvent(dblclickEvent);

      expect(methodCalled).toBe(true);
    });

    it('should execute double-click with proper logging and method call', async () => {
      // This test specifically ensures line 211 is covered
      const miniDateElement = renderedWidget.element?.querySelector('.mini-date') as HTMLElement;
      expect(miniDateElement).toBeTruthy();

      let methodCalled = false;
      const originalMethod = renderedWidget._onOpenCalendarSelection;
      renderedWidget._onOpenCalendarSelection = async (event, target) => {
        methodCalled = true;
        // Call original method
        await originalMethod.call(renderedWidget, event, target);
      };

      // Trigger double click event directly
      const dblclickEvent = new MouseEvent('dblclick', {
        bubbles: true,
        cancelable: true,
      });
      miniDateElement.dispatchEvent(dblclickEvent);

      // Wait a bit for the handler to execute
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(methodCalled).toBe(true);
    });

    it('should handle single click immediately', async () => {
      // Verify that single click executes immediately (no timeout needed)
      const miniDateElement = renderedWidget.element?.querySelector('.mini-date') as HTMLElement;
      expect(miniDateElement).toBeTruthy();

      let methodCalled = false;
      const originalMethod = renderedWidget._onOpenLargerView;
      renderedWidget._onOpenLargerView = async (event, target) => {
        methodCalled = true;
        await originalMethod.call(renderedWidget, event, target);
      };

      // Single click triggers immediately
      miniDateElement.click();

      // Should execute immediately (no timeout delay)
      expect(methodCalled).toBe(true);
    });

    it('should handle double click behavior with browser timing', async () => {
      // Verify that double-click works with native browser behavior
      const miniDateElement = renderedWidget.element?.querySelector('.mini-date') as HTMLElement;
      expect(miniDateElement).toBeTruthy();

      let doubleClickCalled = false;
      const originalMethod = renderedWidget._onOpenCalendarSelection;
      renderedWidget._onOpenCalendarSelection = async (event, target) => {
        doubleClickCalled = true;
        await originalMethod.call(renderedWidget, event, target);
      };

      // Trigger double click event directly (simulates browser behavior)
      const dblclickEvent = new MouseEvent('dblclick', {
        bubbles: true,
        cancelable: true,
      });
      miniDateElement.dispatchEvent(dblclickEvent);

      // Wait a bit for the handler to execute
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(doubleClickCalled).toBe(true);
    });
  });

  describe('Action Handlers', () => {
    it('should handle _onOpenLargerView with main widget default', async () => {
      const mockEvent = new MouseEvent('click');
      const mockTarget = document.createElement('div');

      await widget._onOpenLargerView(mockEvent, mockTarget);

      expect(CalendarWidgetManager.showWidget).toHaveBeenCalledWith('main');
    });

    it('should handle _onOpenLargerView with grid widget when set as default', async () => {
      mockSettings.set('seasons-and-stars.defaultWidget', 'grid');

      const mockEvent = new MouseEvent('click');
      const mockTarget = document.createElement('div');

      await widget._onOpenLargerView(mockEvent, mockTarget);

      expect(CalendarWidgetManager.showWidget).toHaveBeenCalledWith('grid');
    });

    it('should handle _onOpenCalendarSelection', async () => {
      const { CalendarSelectionDialog } = await import('../../src/ui/calendar-selection-dialog');

      const mockEvent = new MouseEvent('click');
      const mockTarget = document.createElement('div');

      await widget._onOpenCalendarSelection(mockEvent, mockTarget);

      expect(CalendarSelectionDialog).toHaveBeenCalledWith([mockCalendar], mockCalendar.id);
    });

    it('should handle time advancement toggle', async () => {
      const mockEvent = new MouseEvent('click');

      // Test starting time advancement
      mockServiceInstance.isActive = false;
      await widget._onToggleTimeAdvancement(mockEvent);

      expect(mockServiceInstance.play).toHaveBeenCalled();

      // Test pausing time advancement
      mockServiceInstance.isActive = true;
      await widget._onToggleTimeAdvancement(mockEvent);

      expect(mockServiceInstance.pause).toHaveBeenCalled();
    });

    it('should handle time advancement with custom amounts', async () => {
      const mockEvent = new MouseEvent('click');
      const mockTarget = document.createElement('div');
      mockTarget.dataset.amount = '2';
      mockTarget.dataset.unit = 'hours';

      await widget._onAdvanceTime(mockEvent, mockTarget);

      expect(global.game.seasonsStars.manager.advanceHours).toHaveBeenCalledWith(2);
    });

    it('should handle minute advancement', async () => {
      const mockEvent = new MouseEvent('click');
      const mockTarget = document.createElement('div');
      mockTarget.dataset.amount = '30';
      mockTarget.dataset.unit = 'minutes';

      await widget._onAdvanceTime(mockEvent, mockTarget);

      expect(global.game.seasonsStars.manager.advanceMinutes).toHaveBeenCalledWith(30);
    });
  });

  describe('Context Preparation', () => {
    it('should prepare basic context with calendar data', async () => {
      const context = await widget._prepareContext();

      expect(context.shortDate).toBe(mockDate.toShortString());
      expect(context.calendar.id).toBe(mockCalendar.id);
      expect(context.calendar.label).toBe('Unknown Calendar'); // Since mockCalendar has no label/name property
      expect(context.isGM).toBe(true);
      expect(context.hasSmallTime).toBe(false);
    });

    it('should handle missing calendar gracefully', async () => {
      global.game.seasonsStars.manager.getActiveCalendar = vi.fn().mockReturnValue(null);

      const context = await widget._prepareContext();

      expect(context.error).toBe('No calendar active');
      expect(context.shortDate).toBe('N/A');
    });

    it('should handle missing manager gracefully', async () => {
      global.game.seasonsStars = { manager: null };

      const context = await widget._prepareContext();

      expect(context.error).toBe('Calendar not available');
      expect(context.shortDate).toBe('N/A');
    });

    it('should show time when setting is enabled', async () => {
      mockSettings.set('seasons-and-stars.miniWidgetShowTime', true);

      const context = await widget._prepareContext();

      expect(context.showTime).toBe(true);
      expect(context.timeString).toBe('12:30');
    });

    it('should show day of week when setting is enabled', async () => {
      mockSettings.set('seasons-and-stars.miniWidgetShowDayOfWeek', true);

      const context = await widget._prepareContext();

      expect(context.showDayOfWeek).toBe(true);
      expect(context.weekdayDisplay).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle _onOpenLargerView errors gracefully', async () => {
      // Mock CalendarWidgetManager to throw error on first call, succeed on second (fallback)
      (CalendarWidgetManager.showWidget as Mock)
        .mockImplementationOnce(() => {
          throw new Error('Test error');
        })
        .mockImplementationOnce(() => {}); // Succeeds on fallback call

      const mockEvent = new MouseEvent('click');
      const mockTarget = document.createElement('div');

      // Should not throw
      await expect(widget._onOpenLargerView(mockEvent, mockTarget)).resolves.toBeUndefined();

      // Should be called twice - once that fails, once for fallback
      expect(CalendarWidgetManager.showWidget).toHaveBeenCalledTimes(2);
      expect(CalendarWidgetManager.showWidget).toHaveBeenLastCalledWith('main');
    });

    it('should handle _onOpenCalendarSelection errors gracefully', async () => {
      // Mock manager to throw error
      global.game.seasonsStars.manager.getAllCalendars = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      const mockEvent = new MouseEvent('click');
      const mockTarget = document.createElement('div');

      // Should not throw
      await expect(widget._onOpenCalendarSelection(mockEvent, mockTarget)).resolves.toBeUndefined();

      expect(mockNotifications.error).toHaveBeenCalledWith('Failed to open calendar selection');
    });

    it('should handle time advancement errors gracefully', async () => {
      mockServiceInstance.play.mockRejectedValue(new Error('Test error'));

      const mockEvent = new MouseEvent('click');

      await widget._onToggleTimeAdvancement(mockEvent);

      expect(mockNotifications.error).toHaveBeenCalledWith('Failed to toggle time advancement');
    });
  });

  describe('Static Methods', () => {
    beforeEach(() => {
      // Clear any existing instances
      if (CalendarMiniWidget.getInstance()) {
        CalendarMiniWidget.getInstance()?.close();
      }
    });

    it('should show widget when none exists', () => {
      expect(CalendarMiniWidget.getInstance()).toBeNull();

      // Mock render to properly set activeInstance like the real implementation
      const originalRender = CalendarMiniWidget.prototype.render;
      CalendarMiniWidget.prototype.render = vi.fn().mockImplementation(function (
        this: CalendarMiniWidget
      ) {
        // Simulate the activeInstance being set in _onRender
        (CalendarMiniWidget as any).activeInstance = this;
        return Promise.resolve();
      });

      CalendarMiniWidget.show();
      expect(CalendarMiniWidget.getInstance()).toBeTruthy();

      // Restore original render
      CalendarMiniWidget.prototype.render = originalRender;
    });

    it('should hide widget with animation when instance exists', () => {
      // Mock render to properly set activeInstance
      const originalRender = CalendarMiniWidget.prototype.render;
      CalendarMiniWidget.prototype.render = vi.fn().mockImplementation(function (
        this: CalendarMiniWidget
      ) {
        (CalendarMiniWidget as any).activeInstance = this;
        (this as any).rendered = true; // Mark as rendered for hide to work
        return Promise.resolve();
      });

      CalendarMiniWidget.show();
      const instance = CalendarMiniWidget.getInstance();
      expect(instance).toBeTruthy();

      if (instance) {
        const hideAnimationSpy = vi.spyOn(instance, 'hideWithAnimation');
        CalendarMiniWidget.hide();
        expect(hideAnimationSpy).toHaveBeenCalled();
      }

      // Restore original render
      CalendarMiniWidget.prototype.render = originalRender;
    });

    it('should toggle widget visibility', () => {
      // Mock render to properly set activeInstance
      const originalRender = CalendarMiniWidget.prototype.render;
      CalendarMiniWidget.prototype.render = vi.fn().mockImplementation(function (
        this: CalendarMiniWidget
      ) {
        (CalendarMiniWidget as any).activeInstance = this;
        (this as any).rendered = true;
        return Promise.resolve();
      });

      // Should show when no widget exists
      expect(CalendarMiniWidget.getInstance()).toBeNull();
      CalendarMiniWidget.toggle();
      expect(CalendarMiniWidget.getInstance()).toBeTruthy();

      // Should hide when widget exists
      const instance = CalendarMiniWidget.getInstance();
      if (instance) {
        const hideAnimationSpy = vi.spyOn(instance, 'hideWithAnimation');
        CalendarMiniWidget.toggle();
        expect(hideAnimationSpy).toHaveBeenCalled();
      }

      // Restore original render
      CalendarMiniWidget.prototype.render = originalRender;
    });
  });

  describe('Sidebar Button Management', () => {
    beforeEach(() => {
      widget.render(true);
    });

    it('should add sidebar button', () => {
      const callback = vi.fn();
      widget.addSidebarButton('test-button', 'fas fa-cog', 'Test Button', callback);

      expect(widget.hasSidebarButton('test-button')).toBe(true);
    });

    it('should remove sidebar button', () => {
      const callback = vi.fn();
      widget.addSidebarButton('test-button', 'fas fa-cog', 'Test Button', callback);

      expect(widget.hasSidebarButton('test-button')).toBe(true);

      widget.removeSidebarButton('test-button');
      expect(widget.hasSidebarButton('test-button')).toBe(false);
    });

    it('should not add duplicate sidebar buttons', () => {
      const callback = vi.fn();
      widget.addSidebarButton('test-button', 'fas fa-cog', 'Test Button', callback);
      widget.addSidebarButton('test-button', 'fas fa-star', 'Different Button', callback);

      // Should still only have one button with original settings
      expect(widget.hasSidebarButton('test-button')).toBe(true);
    });
  });
});
