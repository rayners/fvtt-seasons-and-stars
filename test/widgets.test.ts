/**
 * Tests for Widget API methods
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarWidget } from '../src/ui/calendar-widget';
import { CalendarMiniWidget } from '../src/ui/calendar-mini-widget';
import { CalendarGridWidget } from '../src/ui/calendar-grid-widget';

// Mock Foundry globals
globalThis.game = {
  user: { isGM: true },
  settings: {
    get: vi.fn().mockReturnValue({}),
    set: vi.fn(),
  },
} as any;

globalThis.ui = {
  notifications: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
} as any;

globalThis.Hooks = {
  on: vi.fn(),
  call: vi.fn(),
  callAll: vi.fn(),
} as any;

// Mock calendar data
const mockCalendar = {
  id: 'test-calendar',
  translations: { en: { label: 'Test Calendar' } },
  year: { epoch: 2024, currentYear: 2024, prefix: '', suffix: '', startDay: 0 },
  months: [{ name: 'January', days: 31 }],
  weekdays: [{ name: 'Monday' }],
  time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
} as any;

const mockDate = {
  year: 2024,
  month: 1,
  day: 1,
  weekday: 0,
} as any;

describe('CalendarWidget API', () => {
  let widget: CalendarWidget;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create widget instance
    widget = new CalendarWidget(mockCalendar, mockDate);
  });

  describe('addSidebarButton', () => {
    it('should add a sidebar button', () => {
      const callback = vi.fn();

      widget.addSidebarButton('test-button', 'fas fa-star', 'Test Button', callback);

      expect(widget.hasSidebarButton('test-button')).toBe(true);
    });

    it('should store button with correct properties', () => {
      const callback = vi.fn();

      widget.addSidebarButton('test-button', 'fas fa-star', 'Test Button', callback);

      const buttons = (widget as any).sidebarButtons;
      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toEqual({
        name: 'test-button',
        icon: 'fas fa-star',
        tooltip: 'Test Button',
        callback,
      });
    });

    it('should not add duplicate buttons', () => {
      const callback = vi.fn();

      widget.addSidebarButton('test-button', 'fas fa-star', 'Test Button', callback);
      widget.addSidebarButton('test-button', 'fas fa-heart', 'Another Button', callback);

      const buttons = (widget as any).sidebarButtons;
      expect(buttons).toHaveLength(1);
      expect(buttons[0].icon).toBe('fas fa-star'); // Should keep original
    });
  });

  describe('removeSidebarButton', () => {
    it('should remove existing button', () => {
      const callback = vi.fn();

      widget.addSidebarButton('test-button', 'fas fa-star', 'Test Button', callback);
      expect(widget.hasSidebarButton('test-button')).toBe(true);

      widget.removeSidebarButton('test-button');
      expect(widget.hasSidebarButton('test-button')).toBe(false);
    });

    it('should handle removing non-existent button', () => {
      widget.removeSidebarButton('non-existent');
      // Should not throw error
      expect(widget.hasSidebarButton('non-existent')).toBe(false);
    });

    it('should only remove specified button', () => {
      const callback = vi.fn();

      widget.addSidebarButton('button1', 'fas fa-star', 'Button 1', callback);
      widget.addSidebarButton('button2', 'fas fa-heart', 'Button 2', callback);

      widget.removeSidebarButton('button1');

      expect(widget.hasSidebarButton('button1')).toBe(false);
      expect(widget.hasSidebarButton('button2')).toBe(true);
    });
  });

  describe('hasSidebarButton', () => {
    it('should return false for non-existent button', () => {
      expect(widget.hasSidebarButton('non-existent')).toBe(false);
    });

    it('should return true for existing button', () => {
      const callback = vi.fn();
      widget.addSidebarButton('test-button', 'fas fa-star', 'Test Button', callback);

      expect(widget.hasSidebarButton('test-button')).toBe(true);
    });

    it('should return false after button is removed', () => {
      const callback = vi.fn();
      widget.addSidebarButton('test-button', 'fas fa-star', 'Test Button', callback);
      widget.removeSidebarButton('test-button');

      expect(widget.hasSidebarButton('test-button')).toBe(false);
    });
  });
});

describe('CalendarMiniWidget API', () => {
  let widget: CalendarMiniWidget;

  beforeEach(() => {
    vi.clearAllMocks();
    widget = new CalendarMiniWidget(mockCalendar, mockDate);
  });

  describe('addSidebarButton', () => {
    it('should add a sidebar button', () => {
      const callback = vi.fn();

      widget.addSidebarButton('test-button', 'fas fa-star', 'Test Button', callback);

      expect(widget.hasSidebarButton('test-button')).toBe(true);
    });

    it('should not add duplicate buttons', () => {
      const callback = vi.fn();

      widget.addSidebarButton('test-button', 'fas fa-star', 'Test Button', callback);
      widget.addSidebarButton('test-button', 'fas fa-heart', 'Another Button', callback);

      const buttons = (widget as any).sidebarButtons;
      expect(buttons).toHaveLength(1);
    });
  });

  describe('removeSidebarButton', () => {
    it('should remove existing button', () => {
      const callback = vi.fn();

      widget.addSidebarButton('test-button', 'fas fa-star', 'Test Button', callback);
      widget.removeSidebarButton('test-button');

      expect(widget.hasSidebarButton('test-button')).toBe(false);
    });

    it('should handle removing non-existent button gracefully', () => {
      // Should not throw
      widget.removeSidebarButton('non-existent');
      expect(widget.hasSidebarButton('non-existent')).toBe(false);
    });
  });

  describe('hasSidebarButton', () => {
    it('should correctly identify existing buttons', () => {
      const callback = vi.fn();

      expect(widget.hasSidebarButton('test-button')).toBe(false);

      widget.addSidebarButton('test-button', 'fas fa-star', 'Test Button', callback);
      expect(widget.hasSidebarButton('test-button')).toBe(true);

      widget.removeSidebarButton('test-button');
      expect(widget.hasSidebarButton('test-button')).toBe(false);
    });
  });
});

describe('CalendarGridWidget API', () => {
  let widget: CalendarGridWidget;

  beforeEach(() => {
    vi.clearAllMocks();
    widget = new CalendarGridWidget(mockCalendar, mockDate);
  });

  describe('addSidebarButton', () => {
    it('should add a sidebar button', () => {
      const callback = vi.fn();

      widget.addSidebarButton('test-button', 'fas fa-star', 'Test Button', callback);

      // Check internal storage
      const buttons = (widget as any).sidebarButtons;
      expect(buttons).toHaveLength(1);
      expect(buttons[0].name).toBe('test-button');
    });

    it('should prevent duplicate buttons', () => {
      const callback = vi.fn();

      widget.addSidebarButton('test-button', 'fas fa-star', 'Test Button', callback);
      widget.addSidebarButton('test-button', 'fas fa-heart', 'Another Button', callback);

      const buttons = (widget as any).sidebarButtons;
      expect(buttons).toHaveLength(1);
    });
  });
});

describe('Widget Hook Integration', () => {
  let calendarWidget: CalendarWidget;
  let miniWidget: CalendarMiniWidget;
  let gridWidget: CalendarGridWidget;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create widget instances
    calendarWidget = new CalendarWidget(mockCalendar, mockDate);
    miniWidget = new CalendarMiniWidget(mockCalendar, mockDate);
    gridWidget = new CalendarGridWidget(mockCalendar, mockDate);

    // Mock the render method for all widgets
    calendarWidget.render = vi.fn();
    miniWidget.render = vi.fn();
    gridWidget.render = vi.fn();

    // Mock the rendered property
    Object.defineProperty(calendarWidget, 'rendered', { value: true, writable: true });
    Object.defineProperty(miniWidget, 'rendered', { value: true, writable: true });
    Object.defineProperty(gridWidget, 'rendered', { value: true, writable: true });

    // Set as active instances
    (CalendarWidget as any).activeInstance = calendarWidget;
    (CalendarMiniWidget as any).activeInstance = miniWidget;
    (CalendarGridWidget as any).activeInstance = gridWidget;
  });

  describe('CalendarWidget hooks', () => {
    beforeEach(() => {
      // Register hooks
      CalendarWidget.registerHooks();
    });

    it('should re-render on seasons-stars:dateChanged hook', () => {
      // Find and call the dateChanged hook
      const hookCalls = (globalThis.Hooks.on as any).mock.calls;
      const dateChangedCall = hookCalls.find((call: any) => call[0] === 'seasons-stars:dateChanged');
      expect(dateChangedCall).toBeDefined();

      // Execute the hook callback
      const callback = dateChangedCall[1];
      callback();

      // Verify render was called
      expect(calendarWidget.render).toHaveBeenCalledTimes(1);
    });

    it('should re-render on seasons-stars:calendarChanged hook', () => {
      const hookCalls = (globalThis.Hooks.on as any).mock.calls;
      const calendarChangedCall = hookCalls.find((call: any) => call[0] === 'seasons-stars:calendarChanged');
      expect(calendarChangedCall).toBeDefined();

      const callback = calendarChangedCall[1];
      callback();

      expect(calendarWidget.render).toHaveBeenCalledTimes(1);
    });

    it('should re-render on seasons-stars:settingsChanged hook when quickTimeButtons setting changes', () => {
      const hookCalls = (globalThis.Hooks.on as any).mock.calls;
      const settingsChangedCall = hookCalls.find((call: any) => call[0] === 'seasons-stars:settingsChanged');
      expect(settingsChangedCall).toBeDefined();

      const callback = settingsChangedCall[1];
      
      // Test with quickTimeButtons setting
      callback('quickTimeButtons');
      expect(calendarWidget.render).toHaveBeenCalledTimes(1);

      // Reset mock
      vi.clearAllMocks();

      // Test with other setting (should not re-render)
      callback('someOtherSetting');
      expect(calendarWidget.render).not.toHaveBeenCalled();
    });

    it('should not re-render when widget is not rendered', () => {
      // Set widget as not rendered
      Object.defineProperty(calendarWidget, 'rendered', { value: false, writable: true });

      const hookCalls = (globalThis.Hooks.on as any).mock.calls;
      const dateChangedCall = hookCalls.find((call: any) => call[0] === 'seasons-stars:dateChanged');
      
      const callback = dateChangedCall[1];
      callback();

      // Should not call render when widget is not rendered
      expect(calendarWidget.render).not.toHaveBeenCalled();
    });

    it('should not re-render when no active instance', () => {
      // Clear active instance
      (CalendarWidget as any).activeInstance = null;

      const hookCalls = (globalThis.Hooks.on as any).mock.calls;
      const dateChangedCall = hookCalls.find((call: any) => call[0] === 'seasons-stars:dateChanged');
      
      const callback = dateChangedCall[1];
      callback();

      // Should not throw or call render
      expect(calendarWidget.render).not.toHaveBeenCalled();
    });
  });

  describe('CalendarMiniWidget hooks', () => {
    beforeEach(() => {
      CalendarMiniWidget.registerHooks();
    });

    it('should re-render on seasons-stars:dateChanged hook', () => {
      const hookCalls = (globalThis.Hooks.on as any).mock.calls;
      const dateChangedCall = hookCalls.find((call: any) => call[0] === 'seasons-stars:dateChanged');
      expect(dateChangedCall).toBeDefined();

      const callback = dateChangedCall[1];
      callback();

      expect(miniWidget.render).toHaveBeenCalledTimes(1);
    });

    it('should re-render on seasons-stars:calendarChanged hook', () => {
      const hookCalls = (globalThis.Hooks.on as any).mock.calls;
      const calendarChangedCall = hookCalls.find((call: any) => call[0] === 'seasons-stars:calendarChanged');
      expect(calendarChangedCall).toBeDefined();

      const callback = calendarChangedCall[1];
      callback();

      expect(miniWidget.render).toHaveBeenCalledTimes(1);
    });

    it('should re-render on seasons-stars:settingsChanged hook for relevant settings', () => {
      const hookCalls = (globalThis.Hooks.on as any).mock.calls;
      const settingsChangedCall = hookCalls.find((call: any) => call[0] === 'seasons-stars:settingsChanged');
      expect(settingsChangedCall).toBeDefined();

      const callback = settingsChangedCall[1];
      
      // Test with quickTimeButtons setting
      callback('quickTimeButtons');
      expect(miniWidget.render).toHaveBeenCalledTimes(1);
    });

    it('should handle missing active instance gracefully', () => {
      (CalendarMiniWidget as any).activeInstance = null;

      const hookCalls = (globalThis.Hooks.on as any).mock.calls;
      const dateChangedCall = hookCalls.find((call: any) => call[0] === 'seasons-stars:dateChanged');
      
      const callback = dateChangedCall[1];
      
      // Should not throw
      expect(() => callback()).not.toThrow();
      expect(miniWidget.render).not.toHaveBeenCalled();
    });
  });

  describe('CalendarGridWidget hooks', () => {
    beforeEach(() => {
      CalendarGridWidget.registerHooks();
    });

    it('should re-render on seasons-stars:dateChanged hook', () => {
      const hookCalls = (globalThis.Hooks.on as any).mock.calls;
      const dateChangedCall = hookCalls.find((call: any) => call[0] === 'seasons-stars:dateChanged');
      expect(dateChangedCall).toBeDefined();

      const callback = dateChangedCall[1];
      callback();

      expect(gridWidget.render).toHaveBeenCalledTimes(1);
    });

    it('should re-render on seasons-stars:calendarChanged hook', () => {
      const hookCalls = (globalThis.Hooks.on as any).mock.calls;
      const calendarChangedCall = hookCalls.find((call: any) => call[0] === 'seasons-stars:calendarChanged');
      expect(calendarChangedCall).toBeDefined();

      const callback = calendarChangedCall[1];
      callback();

      expect(gridWidget.render).toHaveBeenCalledTimes(1);
    });

    it('should handle widget not rendered', () => {
      Object.defineProperty(gridWidget, 'rendered', { value: false, writable: true });

      const hookCalls = (globalThis.Hooks.on as any).mock.calls;
      const dateChangedCall = hookCalls.find((call: any) => call[0] === 'seasons-stars:dateChanged');
      
      const callback = dateChangedCall[1];
      callback();

      expect(gridWidget.render).not.toHaveBeenCalled();
    });
  });

  describe('Cross-widget hook coordination', () => {
    it('should update all active widgets on dateChanged', () => {
      // Register all widget hooks
      CalendarWidget.registerHooks();
      CalendarMiniWidget.registerHooks();
      CalendarGridWidget.registerHooks();

      // Find all dateChanged hook registrations
      const hookCalls = (globalThis.Hooks.on as any).mock.calls;
      const dateChangedCalls = hookCalls.filter((call: any) => call[0] === 'seasons-stars:dateChanged');
      
      // Should have registered 3 hooks (one for each widget type)
      expect(dateChangedCalls.length).toBeGreaterThanOrEqual(3);

      // Execute all dateChanged callbacks
      dateChangedCalls.forEach((call: any) => {
        const callback = call[1];
        callback();
      });

      // All widgets should have been re-rendered
      expect(calendarWidget.render).toHaveBeenCalled();
      expect(miniWidget.render).toHaveBeenCalled();
      expect(gridWidget.render).toHaveBeenCalled();
    });

    it('should handle mixed widget states (some rendered, some not)', () => {
      // Set mixed render states
      Object.defineProperty(calendarWidget, 'rendered', { value: true, writable: true });
      Object.defineProperty(miniWidget, 'rendered', { value: false, writable: true });
      Object.defineProperty(gridWidget, 'rendered', { value: true, writable: true });

      CalendarWidget.registerHooks();
      CalendarMiniWidget.registerHooks();
      CalendarGridWidget.registerHooks();

      const hookCalls = (globalThis.Hooks.on as any).mock.calls;
      const dateChangedCalls = hookCalls.filter((call: any) => call[0] === 'seasons-stars:dateChanged');
      
      dateChangedCalls.forEach((call: any) => {
        const callback = call[1];
        callback();
      });

      // Only rendered widgets should update
      expect(calendarWidget.render).toHaveBeenCalled();
      expect(miniWidget.render).not.toHaveBeenCalled(); // Not rendered
      expect(gridWidget.render).toHaveBeenCalled();
    });
  });

  describe('Hook registration edge cases', () => {
    it('should handle registerHooks being called multiple times', () => {
      const initialHookCount = (globalThis.Hooks.on as any).mock.calls.length;
      
      // Call registerHooks multiple times
      CalendarWidget.registerHooks();
      CalendarWidget.registerHooks();
      CalendarWidget.registerHooks();

      const finalHookCount = (globalThis.Hooks.on as any).mock.calls.length;
      
      // Should have registered hooks (exact count depends on number of hooks per widget)
      expect(finalHookCount).toBeGreaterThan(initialHookCount);
    });

    it('should handle hooks being called when Hooks global is undefined', () => {
      const originalHooks = globalThis.Hooks;
      globalThis.Hooks = undefined as any;

      // Should throw when trying to register hooks with undefined Hooks global
      expect(() => CalendarWidget.registerHooks()).toThrow(TypeError);

      // Restore
      globalThis.Hooks = originalHooks;
    });
  });
});
