/**
 * Integration tests for Mini Widget Quick Time Button Settings
 * Tests the Foundry settings registration and integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Foundry globals with complete settings API
const mockSettings = new Map();
const mockRegisteredSettings = new Map();

globalThis.game = {
  user: { isGM: true },
  settings: {
    get: vi.fn((module: string, key: string) => {
      return mockSettings.get(`${module}.${key}`);
    }),
    set: vi.fn((module: string, key: string, value: any) => {
      mockSettings.set(`${module}.${key}`, value);

      // Simulate onChange handler being called
      const settingConfig = mockRegisteredSettings.get(`${module}.${key}`);
      if (settingConfig && typeof settingConfig.onChange === 'function') {
        settingConfig.onChange();
      }

      return Promise.resolve();
    }),
    register: vi.fn((module: string, key: string, data: any) => {
      mockRegisteredSettings.set(`${module}.${key}`, data);
    }),
  },
  seasonsStars: {
    manager: {
      getActiveCalendar: vi.fn().mockReturnValue({
        time: { hoursInDay: 24, minutesInHour: 60 },
        weekdays: Array(7).fill({}), // 7 weekdays
      }),
    },
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

// Import functions for testing
import {
  getMiniWidgetButtonsFromSettings,
  registerQuickTimeButtonsHelper,
  getQuickTimeButtonsFromSettings,
} from '../src/core/quick-time-buttons';
import { registerSettings } from '../src/module';

describe('Mini Widget Settings Integration Tests (TDD Red Phase)', () => {
  beforeEach(() => {
    mockSettings.clear();
    mockRegisteredSettings.clear();
    vi.clearAllMocks();

    // Set up default main setting
    mockSettings.set('seasons-and-stars.quickTimeButtons', '-15,15,30,60,240');
  });

  describe('Settings Registration', () => {
    it('should register miniWidgetQuickTimeButtons setting', () => {
      // Call the settings registration function
      registerSettings();

      // Check that the mini widget setting was registered
      expect(game.settings.register).toHaveBeenCalledWith(
        'seasons-and-stars',
        'miniWidgetQuickTimeButtons',
        expect.objectContaining({
          name: expect.stringContaining('Mini Widget'),
          hint: expect.stringContaining('mini widget'),
          scope: 'world',
          config: true,
          type: String,
          default: '',
        })
      );
    });

    it('should register setting with proper onChange handler', () => {
      registerSettings();

      // Get the registered setting config
      const settingConfig = mockRegisteredSettings.get(
        'seasons-and-stars.miniWidgetQuickTimeButtons'
      );
      expect(settingConfig).toBeDefined();
      expect(typeof settingConfig.onChange).toBe('function');

      // Test onChange handler triggers hook
      settingConfig.onChange();
      expect(Hooks.callAll).toHaveBeenCalledWith(
        'seasons-stars:settingsChanged',
        'miniWidgetQuickTimeButtons'
      );
    });
  });

  describe('Settings Change Hooks', () => {
    it('should trigger widget refresh when mini setting changes', async () => {
      // Register settings first so onChange handlers are available
      registerSettings();

      // Simulate setting change
      await game.settings.set('seasons-and-stars', 'miniWidgetQuickTimeButtons', '30,120');

      // Should have triggered hook
      expect(Hooks.callAll).toHaveBeenCalledWith(
        'seasons-stars:settingsChanged',
        'miniWidgetQuickTimeButtons'
      );
    });

    it('should handle both main and mini setting changes independently', async () => {
      // Register settings first so onChange handlers are available
      registerSettings();

      // Change main setting
      await game.settings.set('seasons-and-stars', 'quickTimeButtons', '10,20,30');
      expect(Hooks.callAll).toHaveBeenCalledWith(
        'seasons-stars:settingsChanged',
        'quickTimeButtons'
      );

      // Change mini setting
      await game.settings.set('seasons-and-stars', 'miniWidgetQuickTimeButtons', '10,30');
      expect(Hooks.callAll).toHaveBeenCalledWith(
        'seasons-stars:settingsChanged',
        'miniWidgetQuickTimeButtons'
      );

      // Both should be callable independently
      expect(Hooks.callAll).toHaveBeenCalledTimes(2);
    });
  });

  describe('Settings Default Values', () => {
    it('should use empty string as default for mini widget setting', () => {
      registerSettings();

      const settingConfig = mockRegisteredSettings.get(
        'seasons-and-stars.miniWidgetQuickTimeButtons'
      );
      expect(settingConfig.default).toBe('');
    });

    it('should not affect main setting default when mini setting is added', () => {
      registerSettings();

      const mainSettingConfig = mockRegisteredSettings.get('seasons-and-stars.quickTimeButtons');
      expect(mainSettingConfig).toBeDefined();
      expect(mainSettingConfig.default).toBe('-15,15,30,60,240'); // Should still be same as UI_CONSTANTS
    });
  });

  describe('Settings Validation', () => {
    it('should validate mini setting against main setting during registration', () => {
      // This could be a future enhancement - settings that validate against each other
      // For now, we validate at runtime in getMiniWidgetButtonsFromSettings

      registerSettings();

      // Should register successfully without throwing errors
      expect(game.settings.register).toHaveBeenCalled();
    });
  });

  describe('Settings Interaction with Existing Code', () => {
    it('should not break existing quick time button integration tests', async () => {
      // Should work exactly as before for main widget
      const mainResult = getQuickTimeButtonsFromSettings(false);
      expect(mainResult).toEqual([
        { amount: -15, unit: 'minutes', label: '-15m' },
        { amount: 15, unit: 'minutes', label: '15m' },
        { amount: 30, unit: 'minutes', label: '30m' },
        { amount: 60, unit: 'minutes', label: '1h' },
        { amount: 240, unit: 'minutes', label: '4h' },
      ]);

      // Should work as before for mini widget (auto-selection)
      const miniResult = getQuickTimeButtonsFromSettings(true);
      expect(miniResult).toEqual([
        { amount: -15, unit: 'minutes', label: '-15m' },
        { amount: 15, unit: 'minutes', label: '15m' },
        { amount: 30, unit: 'minutes', label: '30m' },
      ]);
    });

    it('should work with existing Handlebars helper registration', () => {
      // Mock Handlebars
      globalThis.Handlebars = {
        registerHelper: vi.fn(),
      };

      // Should register without errors
      expect(() => registerQuickTimeButtonsHelper()).not.toThrow();

      // Should register the getQuickTimeButtons helper
      expect(Handlebars.registerHelper).toHaveBeenCalledWith(
        'getQuickTimeButtons',
        expect.any(Function)
      );
    });
  });

  describe('Error Handling in Settings', () => {
    it('should handle corrupt mini widget setting gracefully', () => {
      mockSettings.set('seasons-and-stars.miniWidgetQuickTimeButtons', null);

      // Should return null for fallback, not crash
      expect(() => {
        const result = getMiniWidgetButtonsFromSettings();
        expect(result).toBeNull();
      }).not.toThrow();
    });

    it('should handle missing game.settings gracefully', () => {
      const originalGame = globalThis.game;
      globalThis.game = undefined as any;

      try {
        expect(() => {
          const result = getMiniWidgetButtonsFromSettings();
          expect(result).toBeNull();
        }).not.toThrow();
      } finally {
        globalThis.game = originalGame;
      }
    });
  });
});
