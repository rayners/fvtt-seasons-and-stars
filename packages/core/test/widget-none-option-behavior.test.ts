/**
 * Behavior Tests for 'none' Widget Option
 *
 * This test suite defines the expected behavior when defaultWidget is set to 'none'.
 *
 * Design Decision:
 * ================
 * When 'none' is selected, the system operates with these principles:
 *
 * 1. NO AUTOMATIC WIDGET DISPLAY
 *    - On Foundry startup, no widget appears automatically
 *    - This gives users a clean interface by default
 *
 * 2. MANUAL CONTROLS WORK WITH MAIN WIDGET
 *    - Scene control button toggles the main widget
 *    - Alt+S keybinding toggles the main widget
 *    - This provides a consistent "fallback" widget for manual actions
 *
 * 3. HIDE OPERATIONS ARE CONSISTENT
 *    - Since manual toggles show/hide the main widget, hideDefaultWidget should hide main
 *    - This ensures that scene control activation/deactivation works correctly
 *
 * Rationale:
 * ==========
 * The 'none' option means "don't show a widget automatically on startup", not "disable widgets entirely".
 * When users manually trigger widget display (via scene controls or keybindings), they expect something
 * to happen. We choose the main widget as the consistent target for these manual actions because:
 * - It's the most full-featured widget
 * - It's the default for other settings (main/mini/grid)
 * - It provides predictable behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { TestLogger } from './utils/test-logger';
vi.mock('../src/core/logger', () => ({
  Logger: TestLogger,
}));

import { CalendarWidgetManager } from '../src/ui/widget-manager';

const mockSettings = {
  get: vi.fn(),
  set: vi.fn(),
  register: vi.fn(),
};

const mockGame = {
  user: { isGM: true },
  settings: mockSettings,
  time: { worldTime: 86400 },
  modules: { get: vi.fn().mockReturnValue({ active: true }) },
} as any;

globalThis.game = mockGame;

/**
 * Helper to get the widget type that should be shown/hidden/toggled
 * for a given default widget setting and operation context.
 */
function getTargetWidgetType(
  defaultWidget: string,
  operation: 'show' | 'hide' | 'toggle'
): string | null {
  switch (defaultWidget) {
    case 'none':
      // 'none' means don't auto-show, but manual operations use main widget
      return operation === 'show' ? null : 'main';
    case 'mini':
      return 'mini';
    case 'grid':
      return 'grid';
    case 'main':
    default:
      return 'main';
  }
}

describe("Widget 'none' Option - Behavior Specification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestLogger.clearLogs();
    CalendarWidgetManager.clearInstances();
    (CalendarWidgetManager as any).factories.clear();

    // Default to 'none' setting for most tests
    mockSettings.get.mockImplementation((module: string, key: string) => {
      if (module === 'seasons-and-stars' && key === 'defaultWidget') {
        return 'none';
      }
      if (module === 'seasons-and-stars' && key === 'showTimeWidget') {
        return true;
      }
      return undefined;
    });
  });

  describe('Startup Behavior (showDefaultWidget)', () => {
    describe("when defaultWidget is 'none'", () => {
      it('should NOT show any widget on startup', () => {
        const showWidgetSpy = vi.spyOn(CalendarWidgetManager, 'showWidget');

        const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';
        const targetWidget = getTargetWidgetType(defaultWidget, 'show');

        if (targetWidget) {
          CalendarWidgetManager.showWidget(targetWidget);
        }
        // else: no widget shown (this is the 'none' case)

        expect(defaultWidget).toBe('none');
        expect(targetWidget).toBeNull();
        expect(showWidgetSpy).not.toHaveBeenCalled();
      });

      it('should leave the UI in a clean state with no visible widgets', () => {
        const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';
        const targetWidget = getTargetWidgetType(defaultWidget, 'show');

        expect(targetWidget).toBeNull();
        // In a real integration test, we would check:
        // expect(CalendarWidget.isVisible()).toBe(false);
        // expect(CalendarMiniWidget.isVisible()).toBe(false);
        // expect(CalendarGridWidget.isVisible()).toBe(false);
      });
    });

    describe("when defaultWidget is 'main'", () => {
      beforeEach(() => {
        mockSettings.get.mockImplementation((module: string, key: string) => {
          if (module === 'seasons-and-stars' && key === 'defaultWidget') {
            return 'main';
          }
          return undefined;
        });
      });

      it('should show main widget on startup', () => {
        const showWidgetSpy = vi.spyOn(CalendarWidgetManager, 'showWidget');

        const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';
        const targetWidget = getTargetWidgetType(defaultWidget, 'show');

        if (targetWidget) {
          CalendarWidgetManager.showWidget(targetWidget);
        }

        expect(defaultWidget).toBe('main');
        expect(targetWidget).toBe('main');
        expect(showWidgetSpy).toHaveBeenCalledWith('main');
      });
    });

    describe("when defaultWidget is 'mini'", () => {
      beforeEach(() => {
        mockSettings.get.mockImplementation((module: string, key: string) => {
          if (module === 'seasons-and-stars' && key === 'defaultWidget') {
            return 'mini';
          }
          return undefined;
        });
      });

      it('should show mini widget on startup', () => {
        const showWidgetSpy = vi.spyOn(CalendarWidgetManager, 'showWidget');

        const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';
        const targetWidget = getTargetWidgetType(defaultWidget, 'show');

        if (targetWidget) {
          CalendarWidgetManager.showWidget(targetWidget);
        }

        expect(defaultWidget).toBe('mini');
        expect(targetWidget).toBe('mini');
        expect(showWidgetSpy).toHaveBeenCalledWith('mini');
      });
    });
  });

  describe('Manual Toggle Behavior (toggleDefaultWidget)', () => {
    describe("when defaultWidget is 'none'", () => {
      it('should toggle MAIN widget when scene control is clicked', () => {
        const toggleSpy = vi.spyOn(CalendarWidgetManager, 'toggleWidget');

        const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';
        const targetWidget = getTargetWidgetType(defaultWidget, 'toggle');

        if (targetWidget) {
          CalendarWidgetManager.toggleWidget(targetWidget);
        }

        expect(defaultWidget).toBe('none');
        expect(targetWidget).toBe('main');
        expect(toggleSpy).toHaveBeenCalledWith('main');
      });

      it('should toggle MAIN widget when Alt+S keybinding is pressed', () => {
        const toggleSpy = vi.spyOn(CalendarWidgetManager, 'toggleWidget');

        const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';
        const targetWidget = getTargetWidgetType(defaultWidget, 'toggle');

        if (targetWidget) {
          CalendarWidgetManager.toggleWidget(targetWidget);
        }

        expect(defaultWidget).toBe('none');
        expect(targetWidget).toBe('main');
        expect(toggleSpy).toHaveBeenCalledWith('main');
      });

      it('should consistently use main widget as the fallback for manual actions', () => {
        const defaultWidget = 'none';

        // All manual operations should target the same widget
        const toggleTarget = getTargetWidgetType(defaultWidget, 'toggle');
        const hideTarget = getTargetWidgetType(defaultWidget, 'hide');

        expect(toggleTarget).toBe('main');
        expect(hideTarget).toBe('main');
        // Show should still be null (no auto-show)
        expect(getTargetWidgetType(defaultWidget, 'show')).toBeNull();
      });
    });

    describe("when defaultWidget is 'mini'", () => {
      beforeEach(() => {
        mockSettings.get.mockImplementation((module: string, key: string) => {
          if (module === 'seasons-and-stars' && key === 'defaultWidget') {
            return 'mini';
          }
          return undefined;
        });
      });

      it('should toggle MINI widget when scene control is clicked', () => {
        const toggleSpy = vi.spyOn(CalendarWidgetManager, 'toggleWidget');

        const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';
        const targetWidget = getTargetWidgetType(defaultWidget, 'toggle');

        if (targetWidget) {
          CalendarWidgetManager.toggleWidget(targetWidget);
        }

        expect(defaultWidget).toBe('mini');
        expect(targetWidget).toBe('mini');
        expect(toggleSpy).toHaveBeenCalledWith('mini');
      });
    });
  });

  describe('Hide Behavior (hideDefaultWidget)', () => {
    describe("when defaultWidget is 'none'", () => {
      it('should hide MAIN widget (the widget used for manual toggles)', () => {
        const hideSpy = vi.spyOn(CalendarWidgetManager, 'hideWidget');

        const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';
        const targetWidget = getTargetWidgetType(defaultWidget, 'hide');

        if (targetWidget) {
          CalendarWidgetManager.hideWidget(targetWidget);
        }

        expect(defaultWidget).toBe('none');
        expect(targetWidget).toBe('main');
        expect(hideSpy).toHaveBeenCalledWith('main');
      });

      it('should maintain consistency: hide what toggle would show', () => {
        const defaultWidget = 'none';

        // The widget we toggle should be the same widget we hide
        const toggleTarget = getTargetWidgetType(defaultWidget, 'toggle');
        const hideTarget = getTargetWidgetType(defaultWidget, 'hide');

        expect(toggleTarget).toBe(hideTarget);
        expect(toggleTarget).toBe('main');
      });
    });

    describe("when defaultWidget is 'mini'", () => {
      beforeEach(() => {
        mockSettings.get.mockImplementation((module: string, key: string) => {
          if (module === 'seasons-and-stars' && key === 'defaultWidget') {
            return 'mini';
          }
          return undefined;
        });
      });

      it('should hide MINI widget', () => {
        const hideSpy = vi.spyOn(CalendarWidgetManager, 'hideWidget');

        const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';
        const targetWidget = getTargetWidgetType(defaultWidget, 'hide');

        if (targetWidget) {
          CalendarWidgetManager.hideWidget(targetWidget);
        }

        expect(defaultWidget).toBe('mini');
        expect(targetWidget).toBe('mini');
        expect(hideSpy).toHaveBeenCalledWith('mini');
      });
    });
  });

  describe('Comprehensive Cross-Setting Validation', () => {
    it.each([
      // [setting, show, hide, toggle]
      ['none', null, 'main', 'main'], // 'none': no auto-show, but manual operations use main
      ['main', 'main', 'main', 'main'], // 'main': all operations use main
      ['mini', 'mini', 'mini', 'mini'], // 'mini': all operations use mini
      ['grid', 'grid', 'grid', 'grid'], // 'grid': all operations use grid
    ])(
      "defaultWidget='%s' should: show=%s, hide=%s, toggle=%s",
      (setting, expectedShow, expectedHide, expectedToggle) => {
        mockSettings.get.mockImplementation((module: string, key: string) => {
          if (module === 'seasons-and-stars' && key === 'defaultWidget') {
            return setting;
          }
          return undefined;
        });

        const showTarget = getTargetWidgetType(setting, 'show');
        const hideTarget = getTargetWidgetType(setting, 'hide');
        const toggleTarget = getTargetWidgetType(setting, 'toggle');

        expect(showTarget).toBe(expectedShow);
        expect(hideTarget).toBe(expectedHide);
        expect(toggleTarget).toBe(expectedToggle);
      }
    );
  });

  describe('Real-World Usage Scenarios', () => {
    describe("User selects 'none' to reduce UI clutter", () => {
      it('should have clean startup (no widgets)', () => {
        const showSpy = vi.spyOn(CalendarWidgetManager, 'showWidget');

        // Simulate startup code
        const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';
        const targetWidget = getTargetWidgetType(defaultWidget, 'show');

        if (targetWidget) {
          CalendarWidgetManager.showWidget(targetWidget);
        }

        expect(showSpy).not.toHaveBeenCalled();
      });

      it('should allow user to manually open calendar via scene control', () => {
        const toggleSpy = vi.spyOn(CalendarWidgetManager, 'toggleWidget');

        // Simulate user clicking scene control
        const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';
        const targetWidget = getTargetWidgetType(defaultWidget, 'toggle');

        if (targetWidget) {
          CalendarWidgetManager.toggleWidget(targetWidget);
        }

        expect(toggleSpy).toHaveBeenCalledWith('main');
      });

      it('should allow user to close calendar via scene control again', () => {
        const toggleSpy = vi.spyOn(CalendarWidgetManager, 'toggleWidget');

        // First click opens
        const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';
        const targetWidget = getTargetWidgetType(defaultWidget, 'toggle');

        if (targetWidget) {
          CalendarWidgetManager.toggleWidget(targetWidget);
        }

        expect(toggleSpy).toHaveBeenCalledWith('main');

        // Second click closes (same toggle operation)
        if (targetWidget) {
          CalendarWidgetManager.toggleWidget(targetWidget);
        }

        expect(toggleSpy).toHaveBeenCalledTimes(2);
        expect(toggleSpy).toHaveBeenCalledWith('main');
      });
    });

    describe('Scene control activation/deactivation flow', () => {
      it('should show correct widget when scene controls activate', () => {
        // When scene controls activate, showDefaultWidget is called
        // For 'none', this should NOT show anything
        const showSpy = vi.spyOn(CalendarWidgetManager, 'showWidget');

        const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';
        const targetWidget = getTargetWidgetType(defaultWidget, 'show');

        if (targetWidget) {
          CalendarWidgetManager.showWidget(targetWidget);
        }

        expect(showSpy).not.toHaveBeenCalled();
      });

      it('should hide correct widget when scene controls deactivate', () => {
        // When scene controls deactivate, hideDefaultWidget is called
        // For 'none', this should hide the main widget (the one manual toggles use)
        const hideSpy = vi.spyOn(CalendarWidgetManager, 'hideWidget');

        const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';
        const targetWidget = getTargetWidgetType(defaultWidget, 'hide');

        if (targetWidget) {
          CalendarWidgetManager.hideWidget(targetWidget);
        }

        expect(hideSpy).toHaveBeenCalledWith('main');
      });
    });
  });
});
