/**
 * Tests for UI integration features
 * Widget management, SmallTime detection, and scene controls
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SmallTimeUtils, SidebarButtonManager } from '../src/ui/base-widget-manager';
import { SeasonsStarsSceneControls } from '../src/ui/scene-controls';

// Mock Foundry globals
const mockGame = {
  user: { isGM: true },
  modules: new Map(),
  settings: {
    get: vi.fn().mockReturnValue('main'),
    set: vi.fn(),
  },
} as any;

const mockHooks = {
  on: vi.fn(),
  call: vi.fn(),
  callAll: vi.fn(),
} as any;

const mockUI = {
  notifications: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
} as any;

const mockDocument = {
  querySelector: vi.fn(),
  getElementById: vi.fn(),
  createElement: vi.fn().mockImplementation((tagName: string) => ({
    tagName: tagName.toUpperCase(),
    id: '',
    className: '',
    innerHTML: '',
  })),
} as any;

// Mock DOM
Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true,
});

globalThis.game = mockGame;
globalThis.Hooks = mockHooks;
globalThis.ui = mockUI;

describe('SmallTime Integration', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockGame.modules = new Map(); // Reset modules map
    mockDocument.querySelector.mockReturnValue(null);
  });

  describe('isSmallTimeAvailable', () => {
    it('should return true when SmallTime module is active', () => {
      mockGame.modules.set('smalltime', { active: true });

      expect(SmallTimeUtils.isSmallTimeAvailable()).toBe(true);
    });

    it('should return false when SmallTime module is not active', () => {
      mockGame.modules.set('smalltime', { active: false });

      expect(SmallTimeUtils.isSmallTimeAvailable()).toBe(false);
    });

    it('should return false when SmallTime module is not installed', () => {
      // Module not in map
      expect(SmallTimeUtils.isSmallTimeAvailable()).toBe(false);
    });

    it('should return false when modules system is not available', () => {
      mockGame.modules = undefined;

      expect(SmallTimeUtils.isSmallTimeAvailable()).toBe(false);
    });
  });

  describe('getSmallTimeElement', () => {
    it('should return null when SmallTime module is not active', () => {
      mockGame.modules.set('smalltime', { active: false });

      expect(SmallTimeUtils.getSmallTimeElement()).toBeNull();
    });

    it('should search for element when SmallTime is active', () => {
      mockGame.modules.set('smalltime', { active: true });
      const mockElement = document.createElement('div');
      mockDocument.querySelector.mockReturnValueOnce(mockElement);

      const result = SmallTimeUtils.getSmallTimeElement();

      expect(result).toBe(mockElement);
      expect(mockDocument.querySelector).toHaveBeenCalledWith('#smalltime-app');
    });

    it('should try multiple selectors until one is found', () => {
      mockGame.modules.set('smalltime', { active: true });
      const mockElement = document.createElement('div');

      // First two selectors return null, third returns element
      mockDocument.querySelector
        .mockReturnValueOnce(null) // #smalltime-app
        .mockReturnValueOnce(null) // .smalltime-app
        .mockReturnValueOnce(mockElement); // #timeDisplay

      const result = SmallTimeUtils.getSmallTimeElement();

      expect(result).toBe(mockElement);
      expect(mockDocument.querySelector).toHaveBeenCalledTimes(3);
      expect(mockDocument.querySelector).toHaveBeenNthCalledWith(1, '#smalltime-app');
      expect(mockDocument.querySelector).toHaveBeenNthCalledWith(2, '.smalltime-app');
      expect(mockDocument.querySelector).toHaveBeenNthCalledWith(3, '#timeDisplay');
    });

    it('should return null when no SmallTime element is found', () => {
      mockGame.modules.set('smalltime', { active: true });
      mockDocument.querySelector.mockReturnValue(null);

      const result = SmallTimeUtils.getSmallTimeElement();

      expect(result).toBeNull();
      // Should have tried all selectors
      expect(mockDocument.querySelector).toHaveBeenCalledTimes(4);
    });
  });
});

describe('Sidebar Button Management', () => {
  let manager: SidebarButtonManager;

  beforeEach(() => {
    manager = new SidebarButtonManager();
    vi.clearAllMocks();
  });

  describe('addSidebarButton', () => {
    it('should add a new button', () => {
      const callback = vi.fn();

      manager.addSidebarButton('test-button', 'fas fa-test', 'Test Button', callback);

      expect(manager.hasSidebarButton('test-button')).toBe(true);
      expect(manager.getSidebarButtons()).toHaveLength(1);

      const buttons = manager.getSidebarButtons();
      expect(buttons[0]).toEqual({
        name: 'test-button',
        icon: 'fas fa-test',
        tooltip: 'Test Button',
        callback: callback,
      });
    });

    it('should not add duplicate buttons', () => {
      const callback = vi.fn();

      manager.addSidebarButton('test-button', 'fas fa-test', 'Test Button', callback);
      manager.addSidebarButton('test-button', 'fas fa-test2', 'Test Button 2', callback);

      expect(manager.getSidebarButtons()).toHaveLength(1);
      expect(manager.getSidebarButtons()[0].icon).toBe('fas fa-test'); // Original unchanged
    });

    it('should allow multiple different buttons', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.addSidebarButton('button1', 'fas fa-test1', 'Button 1', callback1);
      manager.addSidebarButton('button2', 'fas fa-test2', 'Button 2', callback2);

      expect(manager.getSidebarButtons()).toHaveLength(2);
      expect(manager.hasSidebarButton('button1')).toBe(true);
      expect(manager.hasSidebarButton('button2')).toBe(true);
    });
  });

  describe('removeSidebarButton', () => {
    it('should remove an existing button', () => {
      const callback = vi.fn();
      manager.addSidebarButton('test-button', 'fas fa-test', 'Test Button', callback);

      expect(manager.hasSidebarButton('test-button')).toBe(true);

      manager.removeSidebarButton('test-button');

      expect(manager.hasSidebarButton('test-button')).toBe(false);
      expect(manager.getSidebarButtons()).toHaveLength(0);
    });

    it('should handle removing non-existent button gracefully', () => {
      expect(() => {
        manager.removeSidebarButton('non-existent');
      }).not.toThrow();

      expect(manager.getSidebarButtons()).toHaveLength(0);
    });
  });

  describe('clearSidebarButtons', () => {
    it('should remove all buttons', () => {
      const callback = vi.fn();
      manager.addSidebarButton('button1', 'fas fa-test1', 'Button 1', callback);
      manager.addSidebarButton('button2', 'fas fa-test2', 'Button 2', callback);

      expect(manager.getSidebarButtons()).toHaveLength(2);

      manager.clearSidebarButtons();

      expect(manager.getSidebarButtons()).toHaveLength(0);
      expect(manager.hasSidebarButton('button1')).toBe(false);
      expect(manager.hasSidebarButton('button2')).toBe(false);
    });
  });

  describe('getSidebarButtons', () => {
    it('should return a copy of buttons array', () => {
      const callback = vi.fn();
      manager.addSidebarButton('test-button', 'fas fa-test', 'Test Button', callback);

      const buttons1 = manager.getSidebarButtons();
      const buttons2 = manager.getSidebarButtons();

      expect(buttons1).toEqual(buttons2);
      expect(buttons1).not.toBe(buttons2); // Different object instances

      // Modifying returned array shouldn't affect internal state
      buttons1.push({
        name: 'external',
        icon: 'fas fa-external',
        tooltip: 'External',
        callback: vi.fn(),
      });

      expect(manager.getSidebarButtons()).toHaveLength(1); // Still original length
    });
  });
});

describe('Scene Controls Integration', () => {
  let mockControls: Record<string, any>;

  beforeEach(() => {
    mockControls = {
      notes: {
        tools: {},
      },
    };
    vi.clearAllMocks();
    mockHooks.on.mockClear();
  });

  describe('registerControls', () => {
    it('should register getSceneControlButtons hook', () => {
      SeasonsStarsSceneControls.registerControls();

      expect(mockHooks.on).toHaveBeenCalledWith('getSceneControlButtons', expect.any(Function));
    });

    it('should register seasons-stars:widgetStateChanged hook for button state updates', () => {
      SeasonsStarsSceneControls.registerControls();

      const widgetStateCall = mockHooks.on.mock.calls.find(
        call => call[0] === 'seasons-stars:widgetStateChanged'
      );
      expect(widgetStateCall).toBeDefined();
      expect(widgetStateCall[1]).toBeTypeOf('function');
    });
  });

  describe('scene control button behavior', () => {
    let sceneControlHandler: Function;

    beforeEach(() => {
      SeasonsStarsSceneControls.registerControls();
      // Get the registered handler
      const getSceneControlsCall = mockHooks.on.mock.calls.find(
        call => call[0] === 'getSceneControlButtons'
      );
      sceneControlHandler = getSceneControlsCall[1];
    });

    it('should add scene control button for GM users', () => {
      mockGame.user.isGM = true;

      sceneControlHandler(mockControls);

      expect(mockControls.notes.tools['seasons-stars-widget']).toBeDefined();
      expect(mockControls.notes.tools['seasons-stars-widget']).toEqual({
        name: 'seasons-stars-widget',
        title: 'SEASONS_STARS.calendar.toggle_calendar',
        icon: 'fas fa-calendar-alt',
        onChange: expect.any(Function),
        button: true,
      });
    });

    it('should not add scene control button for non-GM users', () => {
      mockGame.user.isGM = false;

      sceneControlHandler(mockControls);

      expect(mockControls.notes.tools['seasons-stars-widget']).toBeUndefined();
    });

    it('should handle missing notes controls gracefully', () => {
      mockGame.user.isGM = true;
      const controlsWithoutNotes = {};

      expect(() => {
        sceneControlHandler(controlsWithoutNotes);
      }).not.toThrow();
    });

    it('should handle missing notes.tools gracefully', () => {
      mockGame.user.isGM = true;
      const controlsWithoutTools = { notes: {} };

      expect(() => {
        sceneControlHandler(controlsWithoutTools);
      }).not.toThrow();
    });
  });

  describe('macro registration', () => {
    beforeEach(() => {
      // Clear global SeasonsStars if it exists
      delete (globalThis as any).SeasonsStars;
    });

    it('should register macro functions on window.SeasonsStars', () => {
      SeasonsStarsSceneControls.registerMacros();

      const seasonsStars = (globalThis as any).SeasonsStars;
      expect(seasonsStars).toBeDefined();
      expect(seasonsStars.showWidget).toBeTypeOf('function');
      expect(seasonsStars.hideWidget).toBeTypeOf('function');
      expect(seasonsStars.toggleWidget).toBeTypeOf('function');
      expect(seasonsStars.showMiniWidget).toBeTypeOf('function');
      expect(seasonsStars.hideMiniWidget).toBeTypeOf('function');
      expect(seasonsStars.toggleMiniWidget).toBeTypeOf('function');
    });

    it('should register time advancement macro functions', () => {
      SeasonsStarsSceneControls.registerMacros();

      const seasonsStars = (globalThis as any).SeasonsStars;
      expect(seasonsStars.advanceMinutes).toBeTypeOf('function');
      expect(seasonsStars.advanceHours).toBeTypeOf('function');
      expect(seasonsStars.advanceDays).toBeTypeOf('function');
      expect(seasonsStars.advanceWeeks).toBeTypeOf('function');
      expect(seasonsStars.advanceMonths).toBeTypeOf('function');
      expect(seasonsStars.advanceYears).toBeTypeOf('function');
    });

    it('should extend existing SeasonsStars object instead of replacing', () => {
      // Set up existing object
      (globalThis as any).SeasonsStars = { existingProperty: 'test' };

      SeasonsStarsSceneControls.registerMacros();

      const seasonsStars = (globalThis as any).SeasonsStars;
      expect(seasonsStars.existingProperty).toBe('test');
      expect(seasonsStars.showWidget).toBeTypeOf('function');
    });
  });
});
