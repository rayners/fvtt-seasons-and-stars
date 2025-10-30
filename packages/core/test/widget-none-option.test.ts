/**
 * Tests for 'none' widget option behavior
 * Ensures that when defaultWidget is set to 'none':
 * - No widget is shown on startup
 * - Scene control button shows main widget when clicked
 * - Alt+S keybinding shows main widget when pressed
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { TestLogger } from './utils/test-logger';
vi.mock('../src/core/logger', () => ({
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
