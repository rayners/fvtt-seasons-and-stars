/**
 * Integration tests for Quick Time Buttons functionality
 * Tests the actual Foundry integration, settings, and Handlebars helpers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Foundry globals with more complete integration
const mockSettings = new Map();
const mockHandlebarsHelpers = new Map();

globalThis.game = {
  user: { isGM: true },
  settings: {
    get: vi.fn((module: string, key: string) => {
      return mockSettings.get(`${module}.${key}`) || '15,30,60,240';
    }),
    set: vi.fn((module: string, key: string, value: any) => {
      mockSettings.set(`${module}.${key}`, value);
    }),
    register: vi.fn(),
  },
  seasonsStars: {
    manager: {
      getActiveCalendar: vi.fn().mockReturnValue({
        id: 'test-calendar',
        time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
        weekdays: [
          { name: 'Monday' },
          { name: 'Tuesday' },
          { name: 'Wednesday' },
          { name: 'Thursday' },
          { name: 'Friday' },
          { name: 'Saturday' },
          { name: 'Sunday' },
        ],
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

// Mock Handlebars
globalThis.Handlebars = {
  registerHelper: vi.fn((name: string, helper: Function) => {
    mockHandlebarsHelpers.set(name, helper);
  }),
} as any;

// Import the actual module functions after mocking
import {
  parseQuickTimeButtons,
  formatTimeButton,
  getQuickTimeButtons,
  getQuickTimeButtonsFromSettings,
  registerQuickTimeButtonsHelper,
} from '../src/core/quick-time-buttons';
import { SettingsPreview } from '../src/core/settings-preview';

describe('Quick Time Buttons Integration Tests', () => {
  beforeEach(() => {
    mockSettings.clear();
    mockHandlebarsHelpers.clear();
    vi.clearAllMocks();
  });

  describe('getQuickTimeButtonsFromSettings', () => {
    it('should get buttons from settings with default values', () => {
      const result = getQuickTimeButtonsFromSettings(false);

      expect(result).toEqual([
        { amount: 15, unit: 'minutes', label: '15m' },
        { amount: 30, unit: 'minutes', label: '30m' },
        { amount: 60, unit: 'minutes', label: '1h' },
        { amount: 240, unit: 'minutes', label: '4h' },
      ]);

      expect(game.settings.get).toHaveBeenCalledWith('seasons-and-stars', 'quickTimeButtons');
    });

    it('should handle custom settings values', () => {
      mockSettings.set('seasons-and-stars.quickTimeButtons', '10,30,60');

      const result = getQuickTimeButtonsFromSettings(false);

      expect(result).toEqual([
        { amount: 10, unit: 'minutes', label: '10m' },
        { amount: 30, unit: 'minutes', label: '30m' },
        { amount: 60, unit: 'minutes', label: '1h' },
      ]);
    });

    it('should apply mini widget selection for mini widget', () => {
      mockSettings.set('seasons-and-stars.quickTimeButtons', '5,10,15,30,60,120,240');

      const result = getQuickTimeButtonsFromSettings(true);

      expect(result).toHaveLength(4); // Mini widget limited to 4
      expect(result).toEqual([
        { amount: 5, unit: 'minutes', label: '5m' },
        { amount: 10, unit: 'minutes', label: '10m' },
        { amount: 15, unit: 'minutes', label: '15m' },
        { amount: 30, unit: 'minutes', label: '30m' },
      ]);
    });

    it('should handle invalid settings gracefully', () => {
      mockSettings.set('seasons-and-stars.quickTimeButtons', 'invalid,abc,123xyz');

      const result = getQuickTimeButtonsFromSettings(false);

      // Should fall back to default when no valid values found
      // Since parseQuickTimeButtons filters out invalid values, we get empty array
      // getQuickTimeButtonsFromSettings then falls back to default
      expect(result).toEqual([
        { amount: 15, unit: 'minutes', label: '15m' },
        { amount: 30, unit: 'minutes', label: '30m' },
        { amount: 60, unit: 'minutes', label: '1h' },
        { amount: 240, unit: 'minutes', label: '4h' },
      ]);
    });

    it('should handle missing game.settings', () => {
      const originalSettings = globalThis.game.settings;
      globalThis.game.settings = undefined as any;

      const result = getQuickTimeButtonsFromSettings(false);

      // Should use fallback default values
      expect(result).toEqual([
        { amount: 15, unit: 'minutes', label: '15m' },
        { amount: 30, unit: 'minutes', label: '30m' },
        { amount: 60, unit: 'minutes', label: '1h' },
        { amount: 240, unit: 'minutes', label: '4h' },
      ]);

      globalThis.game.settings = originalSettings;
    });

    it('should handle missing seasonsStars manager', () => {
      const originalSeasonsStars = globalThis.game.seasonsStars;
      globalThis.game.seasonsStars = undefined as any;

      const result = getQuickTimeButtonsFromSettings(false);

      // Should still work with fallback calendar values
      expect(result).toEqual([
        { amount: 15, unit: 'minutes', label: '15m' },
        { amount: 30, unit: 'minutes', label: '30m' },
        { amount: 60, unit: 'minutes', label: '1h' },
        { amount: 240, unit: 'minutes', label: '4h' },
      ]);

      globalThis.game.seasonsStars = originalSeasonsStars;
    });
  });

  describe('registerQuickTimeButtonsHelper', () => {
    it('should register Handlebars helpers when Handlebars is available', () => {
      registerQuickTimeButtonsHelper();

      expect(globalThis.Handlebars.registerHelper).toHaveBeenCalledTimes(2);
      expect(globalThis.Handlebars.registerHelper).toHaveBeenCalledWith(
        'getQuickTimeButtons',
        expect.any(Function)
      );
      expect(globalThis.Handlebars.registerHelper).toHaveBeenCalledWith(
        'formatTimeButton',
        expect.any(Function)
      );
    });

    it('should handle missing Handlebars gracefully', () => {
      const originalHandlebars = globalThis.Handlebars;
      globalThis.Handlebars = undefined as any;

      // Should not throw error
      expect(() => registerQuickTimeButtonsHelper()).not.toThrow();

      globalThis.Handlebars = originalHandlebars;
    });

    it('should handle Handlebars without registerHelper method', () => {
      const originalHandlebars = globalThis.Handlebars;
      globalThis.Handlebars = {} as any;

      // Should not throw error
      expect(() => registerQuickTimeButtonsHelper()).not.toThrow();

      globalThis.Handlebars = originalHandlebars;
    });

    it('should test getQuickTimeButtons helper function', () => {
      registerQuickTimeButtonsHelper();

      const getQuickTimeButtonsHelper = mockHandlebarsHelpers.get('getQuickTimeButtons');
      expect(getQuickTimeButtonsHelper).toBeDefined();

      // Test helper with mini widget false
      const mainButtons = getQuickTimeButtonsHelper(false);
      expect(mainButtons).toHaveLength(4);

      // Test helper with mini widget true
      const miniButtons = getQuickTimeButtonsHelper(true);
      expect(miniButtons).toHaveLength(4);
    });

    it('should test formatTimeButton helper function', () => {
      registerQuickTimeButtonsHelper();

      const formatTimeButtonHelper = mockHandlebarsHelpers.get('formatTimeButton');
      expect(formatTimeButtonHelper).toBeDefined();

      const formatted = formatTimeButtonHelper(60);
      expect(formatted).toBe('1h');
    });
  });

  describe('Error handling paths', () => {
    it('should handle parseQuickTimeButtons with invalid input types', () => {
      // Test null input
      const result1 = parseQuickTimeButtons(null as any);
      expect(result1).toEqual([15, 30, 60, 240]);

      // Test undefined input
      const result2 = parseQuickTimeButtons(undefined as any);
      expect(result2).toEqual([15, 30, 60, 240]);

      // Test number input
      const result3 = parseQuickTimeButtons(123 as any);
      expect(result3).toEqual([15, 30, 60, 240]);
    });

    it('should handle formatTimeButton with invalid input', () => {
      expect(formatTimeButton(NaN)).toBe('0m');
      expect(formatTimeButton(Infinity)).toBe('0m');
      expect(formatTimeButton(-Infinity)).toBe('0m');
    });

    it('should handle parsing errors gracefully', () => {
      // Force an error in the parsing logic by mocking parseInt
      const originalParseInt = globalThis.parseInt;
      globalThis.parseInt = vi.fn(() => {
        throw new Error('Parse error');
      });

      const result = parseQuickTimeButtons('15,30,60');
      expect(result).toEqual([15, 30, 60, 240]); // Should return default

      globalThis.parseInt = originalParseInt;
    });

    it('should handle non-finite numbers in parsing', () => {
      // Mock parseInt to return non-finite values
      const originalParseInt = globalThis.parseInt;
      globalThis.parseInt = vi.fn((str: string) => {
        if (str === '15') return Infinity;
        if (str === '30') return NaN;
        return originalParseInt(str);
      });

      const result = parseQuickTimeButtons('15,30,60');
      expect(result).toEqual([60]); // Should filter out non-finite values

      globalThis.parseInt = originalParseInt;
    });
  });
});

describe('SettingsPreview Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerHooks', () => {
    it('should register renderSettingsConfig hook', () => {
      SettingsPreview.registerHooks();

      expect(globalThis.Hooks.on).toHaveBeenCalledWith(
        'renderSettingsConfig',
        expect.any(Function)
      );
    });
  });

  describe('cleanup', () => {
    it('should clear timers and reset container', () => {
      // Test cleanup without any timers
      expect(() => SettingsPreview.cleanup()).not.toThrow();
    });
  });

  describe('Error handling in enhanceQuickTimeButtonsSetting', () => {
    it('should register hooks without throwing', () => {
      // Test that the hook registration doesn't throw
      expect(() => SettingsPreview.registerHooks()).not.toThrow();
    });

    it('should handle hook callback errors gracefully', () => {
      // Register hooks
      SettingsPreview.registerHooks();

      // Get the hook callback that was registered
      const hookCalls = (globalThis.Hooks.on as any).mock.calls;
      const renderSettingsConfigCall = hookCalls.find(
        (call: any) => call[0] === 'renderSettingsConfig'
      );
      expect(renderSettingsConfigCall).toBeDefined();

      const callback = renderSettingsConfigCall[1];

      // Create a minimal mock HTML object that might cause errors
      const mockHtml = {
        find: vi.fn().mockReturnValue({ length: 0 }),
      };

      // Should not throw when called with mock HTML
      expect(() => callback({}, mockHtml)).not.toThrow();
    });
  });

  describe('Coverage for class methods', () => {
    it('should cover SettingsPreview static methods', () => {
      // Test cleanup method
      expect(() => SettingsPreview.cleanup()).not.toThrow();

      // Test registerHooks method
      expect(() => SettingsPreview.registerHooks()).not.toThrow();

      // Verify hooks were registered
      expect(globalThis.Hooks.on).toHaveBeenCalledWith(
        'renderSettingsConfig',
        expect.any(Function)
      );
    });

    it('should handle registration edge cases', () => {
      // Test multiple registrations
      SettingsPreview.registerHooks();
      SettingsPreview.registerHooks();

      // Should not cause issues
      expect(globalThis.Hooks.on).toHaveBeenCalled();
    });
  });
});
