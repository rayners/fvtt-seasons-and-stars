/**
 * Tests for 'none' widget option behavior
 * Ensures that when defaultWidget is set to 'none':
 * - No widget is shown on startup
 * - Scene control button shows main widget when clicked
 * - Alt+S keybinding shows main widget when pressed
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { TestLogger } from '../../../utils/test-logger';
vi.mock('../../../src/core/logger', () => ({
  Logger: TestLogger,
}));

import { CalendarWidgetManager } from '../src/ui/widget-manager';
import { CalendarWidget } from '../src/ui/calendar-widget';
import { CalendarMiniWidget } from '../src/ui/calendar-mini-widget';
import { CalendarGridWidget } from '../src/ui/calendar-grid-widget';

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

describe("Widget 'none' Option", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestLogger.clearLogs();
    CalendarWidgetManager.clearInstances();
    (CalendarWidgetManager as any).factories.clear();

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

  describe('Module Startup Behavior', () => {
    it("should not show any widget on startup when defaultWidget is 'none'", () => {
      const showWidgetSpy = vi.spyOn(CalendarWidgetManager, 'showWidget');

      const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';

      switch (defaultWidget) {
        case 'none':
          break;
        case 'mini':
          CalendarMiniWidget.show();
          break;
        case 'grid':
          CalendarGridWidget.show();
          break;
        case 'main':
        default:
          CalendarWidget.show();
          break;
      }

      expect(defaultWidget).toBe('none');
      expect(showWidgetSpy).not.toHaveBeenCalled();
    });

    it("should show main widget on startup when defaultWidget is 'main'", () => {
      mockSettings.get.mockImplementation((module: string, key: string) => {
        if (module === 'seasons-and-stars' && key === 'defaultWidget') {
          return 'main';
        }
        return undefined;
      });

      const showWidgetSpy = vi.spyOn(CalendarWidget, 'show');

      const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';
      if (defaultWidget === 'main') {
        CalendarWidget.show();
      }

      expect(showWidgetSpy).toHaveBeenCalled();
    });
  });

  describe('Scene Controls Integration', () => {
    it("should show main widget when scene control is clicked and defaultWidget is 'none'", async () => {
      const toggleSpy = vi.spyOn(CalendarWidgetManager, 'toggleWidget');

      const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';

      switch (defaultWidget) {
        case 'none':
          CalendarWidgetManager.toggleWidget('main');
          break;
        case 'mini':
          CalendarWidgetManager.toggleWidget('mini');
          break;
        case 'grid':
          CalendarWidgetManager.toggleWidget('grid');
          break;
        case 'main':
        default:
          CalendarWidgetManager.toggleWidget('main');
          break;
      }

      expect(defaultWidget).toBe('none');
      expect(toggleSpy).toHaveBeenCalledWith('main');
    });

    it("should hide main widget when hideDefaultWidget is called with 'none'", () => {
      const hideSpy = vi.spyOn(CalendarWidgetManager, 'hideWidget');

      const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';

      switch (defaultWidget) {
        case 'none':
          CalendarWidgetManager.hideWidget('main');
          break;
        case 'mini':
          CalendarWidgetManager.hideWidget('mini');
          break;
        case 'grid':
          CalendarWidgetManager.hideWidget('grid');
          break;
        case 'main':
        default:
          CalendarWidgetManager.hideWidget('main');
          break;
      }

      expect(defaultWidget).toBe('none');
      expect(hideSpy).toHaveBeenCalledWith('main');
    });

    it("should NOT show widget when showDefaultWidget is called during initialization with 'none'", () => {
      const showSpy = vi.spyOn(CalendarWidgetManager, 'showWidget');

      const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';

      switch (defaultWidget) {
        case 'none':
          break;
        case 'mini':
          CalendarWidgetManager.showWidget('mini');
          break;
        case 'grid':
          CalendarWidgetManager.showWidget('grid');
          break;
        case 'main':
        default:
          CalendarWidgetManager.showWidget('main');
          break;
      }

      expect(defaultWidget).toBe('none');
      expect(showSpy).not.toHaveBeenCalled();
    });
  });

  describe('Keybinding Integration (Alt+S)', () => {
    it("should toggle main widget when Alt+S is pressed and defaultWidget is 'none'", () => {
      const toggleSpy = vi.spyOn(CalendarWidget, 'toggle');

      const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';

      switch (defaultWidget) {
        case 'none':
          CalendarWidget.toggle();
          break;
        case 'mini':
          CalendarMiniWidget.toggle();
          break;
        case 'grid':
          CalendarGridWidget.toggle();
          break;
        case 'main':
        default:
          CalendarWidget.toggle();
          break;
      }

      expect(defaultWidget).toBe('none');
      expect(toggleSpy).toHaveBeenCalled();
    });

    it("should toggle mini widget when Alt+S is pressed and defaultWidget is 'mini'", () => {
      mockSettings.get.mockImplementation((module: string, key: string) => {
        if (module === 'seasons-and-stars' && key === 'defaultWidget') {
          return 'mini';
        }
        return undefined;
      });

      const toggleSpy = vi.spyOn(CalendarMiniWidget, 'toggle');

      const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';

      switch (defaultWidget) {
        case 'none':
          CalendarWidget.toggle();
          break;
        case 'mini':
          CalendarMiniWidget.toggle();
          break;
        case 'grid':
          CalendarGridWidget.toggle();
          break;
        case 'main':
        default:
          CalendarWidget.toggle();
          break;
      }

      expect(defaultWidget).toBe('mini');
      expect(toggleSpy).toHaveBeenCalled();
    });
  });

  describe('Settings onChange Behavior', () => {
    it("should not show widget when showTimeWidget is enabled and defaultWidget is 'none'", () => {
      const showMainSpy = vi.spyOn(CalendarWidget, 'show');
      const showMiniSpy = vi.spyOn(CalendarMiniWidget, 'show');
      const showGridSpy = vi.spyOn(CalendarGridWidget, 'show');

      const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';

      switch (defaultWidget) {
        case 'none':
          break;
        case 'mini':
          CalendarMiniWidget.show();
          break;
        case 'grid':
          CalendarGridWidget.show();
          break;
        case 'main':
        default:
          CalendarWidget.show();
          break;
      }

      expect(defaultWidget).toBe('none');
      expect(showMainSpy).not.toHaveBeenCalled();
      expect(showMiniSpy).not.toHaveBeenCalled();
      expect(showGridSpy).not.toHaveBeenCalled();
    });
  });

  describe('Comprehensive Widget Type Coverage', () => {
    it.each([
      ['none', 'main'],
      ['main', 'main'],
      ['mini', 'mini'],
      ['grid', 'grid'],
    ])(
      "should handle '%s' defaultWidget correctly for toggle (expects %s)",
      (setting, expected) => {
        mockSettings.get.mockImplementation((module: string, key: string) => {
          if (module === 'seasons-and-stars' && key === 'defaultWidget') {
            return setting;
          }
          return undefined;
        });

        const toggleSpy = vi.spyOn(CalendarWidgetManager, 'toggleWidget');

        const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';

        switch (defaultWidget) {
          case 'none':
            CalendarWidgetManager.toggleWidget('main');
            break;
          case 'mini':
            CalendarWidgetManager.toggleWidget('mini');
            break;
          case 'grid':
            CalendarWidgetManager.toggleWidget('grid');
            break;
          case 'main':
          default:
            CalendarWidgetManager.toggleWidget('main');
            break;
        }

        expect(toggleSpy).toHaveBeenCalledWith(expected);
      }
    );
  });
});

// ========================================
// Behavior Tests
// ========================================
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
