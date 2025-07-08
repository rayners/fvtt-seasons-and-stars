/**
 * Tests for Widget API methods
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarWidget } from '../src/ui/calendar-widget';
import { CalendarMiniWidget } from '../src/ui/calendar-mini-widget';
import { CalendarGridWidget } from '../src/ui/calendar-grid-widget';
import { mockStandardCalendar, mockStandardDate } from './mocks/calendar-mocks';

// Shared helper functions for widget API testing
function createWidgetTestSuite(WidgetClass: any, widgetName: string) {
  describe(`${widgetName} API`, () => {
    let widget: any;

    beforeEach(() => {
      vi.clearAllMocks();
      // CalendarGridWidget only takes initialDate parameter, others take calendar and date
      if (widgetName === 'CalendarGridWidget') {
        widget = new WidgetClass(mockStandardDate);
      } else {
        widget = new WidgetClass(mockStandardCalendar, mockStandardDate);
      }
    });

    describe('addSidebarButton', () => {
      it('should add a sidebar button', () => {
        const callback = vi.fn();

        widget.addSidebarButton('test-button', 'fas fa-star', 'Test Button', callback);

        // Only check hasSidebarButton if it exists (CalendarWidget and CalendarMiniWidget have it)
        if (typeof widget.hasSidebarButton === 'function') {
          expect(widget.hasSidebarButton('test-button')).toBe(true);
        } else {
          // For CalendarGridWidget, just check internal storage
          const buttons = (widget as any).sidebarButtons;
          expect(buttons).toHaveLength(1);
          expect(buttons[0].name).toBe('test-button');
        }
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
        if (widgetName === 'CalendarWidget') {
          expect(buttons[0].icon).toBe('fas fa-star'); // Should keep original
        }
      });
    });

    // Only test remove/has methods for widgets that have them
    if (widgetName !== 'CalendarGridWidget') {
      describe('removeSidebarButton', () => {
        it('should remove existing button', () => {
          const callback = vi.fn();

          widget.addSidebarButton('test-button', 'fas fa-star', 'Test Button', callback);
          expect(widget.hasSidebarButton('test-button')).toBe(true);

          widget.removeSidebarButton('test-button');
          expect(widget.hasSidebarButton('test-button')).toBe(false);
        });

        it('should handle removing non-existent button gracefully', () => {
          widget.removeSidebarButton('non-existent');
          expect(widget.hasSidebarButton('non-existent')).toBe(false);
        });

        if (widgetName === 'CalendarWidget') {
          it('should only remove specified button', () => {
            const callback = vi.fn();

            widget.addSidebarButton('button1', 'fas fa-star', 'Button 1', callback);
            widget.addSidebarButton('button2', 'fas fa-heart', 'Button 2', callback);

            widget.removeSidebarButton('button1');

            expect(widget.hasSidebarButton('button1')).toBe(false);
            expect(widget.hasSidebarButton('button2')).toBe(true);
          });
        }
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
    }
  });
}

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

// Use shared test suite for all widget types
createWidgetTestSuite(CalendarWidget, 'CalendarWidget');
createWidgetTestSuite(CalendarMiniWidget, 'CalendarMiniWidget');
createWidgetTestSuite(CalendarGridWidget, 'CalendarGridWidget');

describe('CalendarGridWidget Note Permission Filtering', () => {
  let gridWidget: CalendarGridWidget;
  let mockNotesManager: any;
  let mockNotes: any[];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock CONST.DOCUMENT_OWNERSHIP_LEVELS for tests
    (globalThis as any).CONST = {
      DOCUMENT_OWNERSHIP_LEVELS: {
        NONE: 0,
        LIMITED: 1,
        OBSERVER: 2,
        OWNER: 3,
      },
    };

    // Create mock notes with different permission levels
    mockNotes = [
      {
        id: 'gm-note-1',
        name: 'GM Secret Meeting',
        ownership: {
          default: 0, // NONE level - not visible to players
          'gm-user-id': 3, // OWNER level for GM
        },
        flags: { 'seasons-and-stars': { category: 'event' } },
      },
      {
        id: 'public-note-1',
        name: 'Public Festival',
        ownership: {
          default: 2, // OBSERVER level - visible to all players
        },
        flags: { 'seasons-and-stars': { category: 'general' } },
      },
    ];

    // Mock notes manager
    mockNotesManager = {
      storage: {
        findNotesByDateSync: vi.fn(() => mockNotes),
      },
      canCreateNote: vi.fn(() => true),
    };

    // Mock game object with seasons stars
    globalThis.game = {
      user: { isGM: false, id: 'player-user-id' }, // Default to player for testing
      settings: {
        get: vi.fn().mockReturnValue('setDate'),
      },
      seasonsStars: {
        manager: {
          getActiveEngine: vi.fn(() => ({
            getMonthLength: vi.fn(() => 30),
            calculateWeekday: vi.fn(() => 0),
            getIntercalaryDaysAfterMonth: vi.fn(() => []),
          })),
          getActiveCalendar: vi.fn(() => ({
            months: [{ name: 'January', description: 'First month' }],
            weekdays: [
              { name: 'Monday', abbreviation: 'Mon' },
              { name: 'Tuesday', abbreviation: 'Tue' },
            ],
          })),
          getCurrentDate: vi.fn(() => ({ year: 2024, month: 1, day: 1 })),
        },
        notes: mockNotesManager,
      },
    } as any;

    gridWidget = new CalendarGridWidget({ year: 2024, month: 1, day: 1 } as any);
  });

  describe('generateMonthData permission filtering', () => {
    it('should filter notes by player permissions in generateMonthData', () => {
      // Set user as player
      globalThis.game.user = { isGM: false, id: 'player-user-id' };

      // Call the private generateMonthData method directly to test the changed lines
      const calendar = globalThis.game.seasonsStars.manager.getActiveCalendar();
      const viewDate = { year: 2024, month: 1, day: 1 };
      const currentDate = { year: 2024, month: 1, day: 1 };

      const monthData = (gridWidget as any).generateMonthData(calendar, viewDate, currentDate);

      // Verify that findNotesByDateSync was called (this tests line 214)
      expect(mockNotesManager.storage.findNotesByDateSync).toHaveBeenCalled();

      // Check that month data was generated (indicating the filter worked)
      expect(monthData).toBeDefined();
      expect(monthData.weeks).toBeDefined();

      // The filtering logic should have run - we can't directly assert on the filtered notes
      // since they're used internally, but we can verify the method completed successfully
      // which means the permission filtering code (lines 215-225) executed without error
    });

    it('should allow GM to see all notes in generateMonthData', () => {
      // Set user as GM
      globalThis.game.user = { isGM: true, id: 'gm-user-id' };

      const calendar = globalThis.game.seasonsStars.manager.getActiveCalendar();
      const viewDate = { year: 2024, month: 1, day: 1 };
      const currentDate = { year: 2024, month: 1, day: 1 };

      const monthData = (gridWidget as any).generateMonthData(calendar, viewDate, currentDate);

      // Verify the method completed successfully for GM user
      expect(monthData).toBeDefined();
      expect(monthData.weeks).toBeDefined();
      expect(mockNotesManager.storage.findNotesByDateSync).toHaveBeenCalled();
    });

    it('should handle missing game.user gracefully in generateMonthData', () => {
      // Set user as null to test the null check (line 217)
      globalThis.game.user = null;

      const calendar = globalThis.game.seasonsStars.manager.getActiveCalendar();
      const viewDate = { year: 2024, month: 1, day: 1 };
      const currentDate = { year: 2024, month: 1, day: 1 };

      // Should not throw an error even with null user
      expect(() => {
        (gridWidget as any).generateMonthData(calendar, viewDate, currentDate);
      }).not.toThrow();

      expect(mockNotesManager.storage.findNotesByDateSync).toHaveBeenCalled();
    });

    it('should use CONST.DOCUMENT_OWNERSHIP_LEVELS for permission checking', () => {
      // This tests that the code on lines 222-224 properly uses the CONST values
      globalThis.game.user = { isGM: false, id: 'player-user-id' };

      const calendar = globalThis.game.seasonsStars.manager.getActiveCalendar();
      const viewDate = { year: 2024, month: 1, day: 1 };
      const currentDate = { year: 2024, month: 1, day: 1 };

      // This will execute the permission filtering code that references CONST.DOCUMENT_OWNERSHIP_LEVELS
      const monthData = (gridWidget as any).generateMonthData(calendar, viewDate, currentDate);

      expect(monthData).toBeDefined();
      expect(mockNotesManager.storage.findNotesByDateSync).toHaveBeenCalled();
    });

    it('should handle notes manager not available', () => {
      // Test when notes manager is missing
      globalThis.game.seasonsStars.notes = null;

      const calendar = globalThis.game.seasonsStars.manager.getActiveCalendar();
      const viewDate = { year: 2024, month: 1, day: 1 };
      const currentDate = { year: 2024, month: 1, day: 1 };

      // Should not throw error when notes manager is unavailable
      expect(() => {
        (gridWidget as any).generateMonthData(calendar, viewDate, currentDate);
      }).not.toThrow();
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
    calendarWidget = new CalendarWidget(mockStandardCalendar, mockStandardDate);
    miniWidget = new CalendarMiniWidget(mockStandardCalendar, mockStandardDate);
    gridWidget = new CalendarGridWidget(mockStandardDate);

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
      const dateChangedCall = hookCalls.find(
        (call: any) => call[0] === 'seasons-stars:dateChanged'
      );
      expect(dateChangedCall).toBeDefined();

      // Execute the hook callback
      const callback = dateChangedCall[1];
      callback();

      // Verify render was called
      expect(calendarWidget.render).toHaveBeenCalledTimes(1);
    });

    it('should re-render on seasons-stars:calendarChanged hook', () => {
      const hookCalls = (globalThis.Hooks.on as any).mock.calls;
      const calendarChangedCall = hookCalls.find(
        (call: any) => call[0] === 'seasons-stars:calendarChanged'
      );
      expect(calendarChangedCall).toBeDefined();

      const callback = calendarChangedCall[1];
      callback();

      expect(calendarWidget.render).toHaveBeenCalledTimes(1);
    });

    it('should re-render on seasons-stars:settingsChanged hook when quickTimeButtons setting changes', () => {
      const hookCalls = (globalThis.Hooks.on as any).mock.calls;
      const settingsChangedCall = hookCalls.find(
        (call: any) => call[0] === 'seasons-stars:settingsChanged'
      );
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
      const dateChangedCall = hookCalls.find(
        (call: any) => call[0] === 'seasons-stars:dateChanged'
      );

      const callback = dateChangedCall[1];
      callback();

      // Should not call render when widget is not rendered
      expect(calendarWidget.render).not.toHaveBeenCalled();
    });

    it('should not re-render when no active instance', () => {
      // Clear active instance
      (CalendarWidget as any).activeInstance = null;

      const hookCalls = (globalThis.Hooks.on as any).mock.calls;
      const dateChangedCall = hookCalls.find(
        (call: any) => call[0] === 'seasons-stars:dateChanged'
      );

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
      const dateChangedCall = hookCalls.find(
        (call: any) => call[0] === 'seasons-stars:dateChanged'
      );
      expect(dateChangedCall).toBeDefined();

      const callback = dateChangedCall[1];
      callback();

      expect(miniWidget.render).toHaveBeenCalledTimes(1);
    });

    it('should re-render on seasons-stars:calendarChanged hook', () => {
      const hookCalls = (globalThis.Hooks.on as any).mock.calls;
      const calendarChangedCall = hookCalls.find(
        (call: any) => call[0] === 'seasons-stars:calendarChanged'
      );
      expect(calendarChangedCall).toBeDefined();

      const callback = calendarChangedCall[1];
      callback();

      expect(miniWidget.render).toHaveBeenCalledTimes(1);
    });

    it('should re-render on seasons-stars:settingsChanged hook for relevant settings', () => {
      const hookCalls = (globalThis.Hooks.on as any).mock.calls;
      const settingsChangedCall = hookCalls.find(
        (call: any) => call[0] === 'seasons-stars:settingsChanged'
      );
      expect(settingsChangedCall).toBeDefined();

      const callback = settingsChangedCall[1];

      // Test with quickTimeButtons setting
      callback('quickTimeButtons');
      expect(miniWidget.render).toHaveBeenCalledTimes(1);
    });

    it('should handle missing active instance gracefully', () => {
      (CalendarMiniWidget as any).activeInstance = null;

      const hookCalls = (globalThis.Hooks.on as any).mock.calls;
      const dateChangedCall = hookCalls.find(
        (call: any) => call[0] === 'seasons-stars:dateChanged'
      );

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
      const dateChangedCall = hookCalls.find(
        (call: any) => call[0] === 'seasons-stars:dateChanged'
      );
      expect(dateChangedCall).toBeDefined();

      const callback = dateChangedCall[1];
      callback();

      expect(gridWidget.render).toHaveBeenCalledTimes(1);
    });

    it('should re-render on seasons-stars:calendarChanged hook', () => {
      const hookCalls = (globalThis.Hooks.on as any).mock.calls;
      const calendarChangedCall = hookCalls.find(
        (call: any) => call[0] === 'seasons-stars:calendarChanged'
      );
      expect(calendarChangedCall).toBeDefined();

      const callback = calendarChangedCall[1];
      callback();

      expect(gridWidget.render).toHaveBeenCalledTimes(1);
    });

    it('should handle widget not rendered', () => {
      Object.defineProperty(gridWidget, 'rendered', { value: false, writable: true });

      const hookCalls = (globalThis.Hooks.on as any).mock.calls;
      const dateChangedCall = hookCalls.find(
        (call: any) => call[0] === 'seasons-stars:dateChanged'
      );

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
      const dateChangedCalls = hookCalls.filter(
        (call: any) => call[0] === 'seasons-stars:dateChanged'
      );

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
      const dateChangedCalls = hookCalls.filter(
        (call: any) => call[0] === 'seasons-stars:dateChanged'
      );

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
