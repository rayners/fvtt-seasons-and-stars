/**
 * TDD Tests for Mini Widget Quick Time Button Configuration
 * RED PHASE: These tests should fail initially as the feature doesn't exist yet
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockStandardCalendar } from './mocks/calendar-mocks';

// Mock Foundry globals with setting support
const mockSettings = new Map();

globalThis.game = {
  user: { isGM: true },
  settings: {
    get: vi.fn((module: string, key: string) => {
      return mockSettings.get(`${module}.${key}`);
    }),
    set: vi.fn((module: string, key: string, value: any) => {
      mockSettings.set(`${module}.${key}`, value);
    }),
    register: vi.fn(),
  },
  seasonsStars: {
    manager: {
      getActiveCalendar: vi.fn().mockReturnValue(mockStandardCalendar),
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

// Import the functions we'll be extending (these currently exist)
import {
  getQuickTimeButtonsFromSettings,
  parseMiniWidgetButtons,
  getMiniWidgetButtonsFromSettings,
} from '../src/core/quick-time-buttons';

describe('Mini Widget Button Configuration (TDD Red Phase)', () => {
  beforeEach(() => {
    mockSettings.clear();
    vi.clearAllMocks();

    // Set up default main setting
    mockSettings.set('seasons-and-stars.quickTimeButtons', '-15,15,30,60,240');
  });

  describe('getQuickTimeButtonsFromSettings with mini widget configuration', () => {
    it('should use mini widget specific setting when available', () => {
      // RED: This test should fail - mini widget setting doesn't exist yet
      mockSettings.set('seasons-and-stars.miniWidgetQuickTimeButtons', '15,60');

      const result = getQuickTimeButtonsFromSettings(true);

      // Expect mini widget to use its specific buttons, not auto-selection
      expect(result).toEqual([
        { amount: 15, unit: 'minutes', label: '15m' },
        { amount: 60, unit: 'minutes', label: '1h' },
      ]);

      expect(game.settings.get).toHaveBeenCalledWith(
        'seasons-and-stars',
        'miniWidgetQuickTimeButtons'
      );
    });

    it('should fall back to auto-selection when mini widget setting is empty', () => {
      // RED: This test should fail - mini widget setting handling doesn't exist
      mockSettings.set('seasons-and-stars.miniWidgetQuickTimeButtons', '');

      const result = getQuickTimeButtonsFromSettings(true);

      // Should fall back to current auto-selection logic (1 negative + 2 positives)
      expect(result).toEqual([
        { amount: -15, unit: 'minutes', label: '-15m' },
        { amount: 15, unit: 'minutes', label: '15m' },
        { amount: 30, unit: 'minutes', label: '30m' },
      ]);
    });

    it('should fall back to auto-selection when mini widget setting is undefined', () => {
      // RED: This test should fail - mini widget setting handling doesn't exist
      // Don't set miniWidgetQuickTimeButtons at all

      const result = getQuickTimeButtonsFromSettings(true);

      // Should fall back to current auto-selection logic
      expect(result).toEqual([
        { amount: -15, unit: 'minutes', label: '-15m' },
        { amount: 15, unit: 'minutes', label: '15m' },
        { amount: 30, unit: 'minutes', label: '30m' },
      ]);
    });

    it('should validate mini widget buttons exist in main setting', () => {
      // RED: This test should fail - validation doesn't exist yet
      mockSettings.set('seasons-and-stars.quickTimeButtons', '15,30,60');
      mockSettings.set('seasons-and-stars.miniWidgetQuickTimeButtons', '15,120'); // 120 not in main

      const result = getQuickTimeButtonsFromSettings(true);

      // Should filter out 120 and only include 15, then fall back for missing buttons
      expect(result).toEqual([{ amount: 15, unit: 'minutes', label: '15m' }]);

      // Should warn about invalid buttons
      expect(ui.notifications.warn).toHaveBeenCalledWith(
        expect.stringContaining('Mini widget buttons contain values not found in main setting')
      );
    });

    it('should handle malformed mini widget setting gracefully', () => {
      // RED: This test should fail - error handling doesn't exist yet
      mockSettings.set('seasons-and-stars.miniWidgetQuickTimeButtons', 'invalid,15,bad,30');

      const result = getQuickTimeButtonsFromSettings(true);

      // Should parse valid buttons and ignore invalid ones
      expect(result).toEqual([
        { amount: 15, unit: 'minutes', label: '15m' },
        { amount: 30, unit: 'minutes', label: '30m' },
      ]);

      // Should not crash or show error notifications for parsing issues
      expect(ui.notifications.error).not.toHaveBeenCalled();
    });

    it('should not affect main widget when mini setting is configured', () => {
      // RED: This test should fail - mini widget setting shouldn't affect main widget
      mockSettings.set('seasons-and-stars.miniWidgetQuickTimeButtons', '15,60');

      const mainResult = getQuickTimeButtonsFromSettings(false);

      // Main widget should still get all buttons from main setting
      expect(mainResult).toEqual([
        { amount: -15, unit: 'minutes', label: '-15m' },
        { amount: 15, unit: 'minutes', label: '15m' },
        { amount: 30, unit: 'minutes', label: '30m' },
        { amount: 60, unit: 'minutes', label: '1h' },
        { amount: 240, unit: 'minutes', label: '4h' },
      ]);
    });
  });

  describe('parseMiniWidgetButtons function (to be implemented)', () => {
    it('should parse mini widget buttons and validate against main buttons', () => {
      const mainButtons = [15, 30, 60, 240];
      const miniSetting = '15,60';

      const result = parseMiniWidgetButtons(miniSetting, mainButtons, mockStandardCalendar);

      expect(result.valid).toEqual([15, 60]);
      expect(result.invalid).toEqual([]);
    });

    it('should identify invalid buttons not in main setting', () => {
      const mainButtons = [15, 30, 60];
      const miniSetting = '15,120,60'; // 120 not in main

      const result = parseMiniWidgetButtons(miniSetting, mainButtons, mockStandardCalendar);

      expect(result.valid).toEqual([15, 60]);
      expect(result.invalid).toEqual([120]);
    });

    it('should handle empty mini setting', () => {
      const mainButtons = [15, 30, 60];
      const miniSetting = '';

      const result = parseMiniWidgetButtons(miniSetting, mainButtons, mockStandardCalendar);

      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual([]);
    });
  });

  describe('getMiniWidgetButtonsFromSettings function (to be implemented)', () => {
    it('should return parsed and validated mini widget buttons', () => {
      mockSettings.set('seasons-and-stars.miniWidgetQuickTimeButtons', '15,60');

      const result = getMiniWidgetButtonsFromSettings();

      expect(result).toEqual([
        { amount: 15, unit: 'minutes', label: '15m' },
        { amount: 60, unit: 'minutes', label: '1h' },
      ]);
    });

    it('should return null when mini setting is empty (triggers fallback)', () => {
      mockSettings.set('seasons-and-stars.miniWidgetQuickTimeButtons', '');

      const result = getMiniWidgetButtonsFromSettings();

      expect(result).toBeNull(); // Null indicates fallback should be used
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complex mini configuration with mixed units', () => {
      // RED: Mini widget setting support doesn't exist yet
      mockSettings.set('seasons-and-stars.quickTimeButtons', '15,30,1h,2h,1d');
      mockSettings.set('seasons-and-stars.miniWidgetQuickTimeButtons', '15,1h');

      const result = getQuickTimeButtonsFromSettings(true);

      expect(result).toEqual([
        { amount: 15, unit: 'minutes', label: '15m' },
        { amount: 60, unit: 'minutes', label: '1h' },
      ]);
    });

    it('should maintain backward compatibility when no mini setting exists', () => {
      // This should pass even without the new feature - testing existing behavior
      const result = getQuickTimeButtonsFromSettings(true);

      // Should use existing auto-selection logic
      expect(result).toEqual([
        { amount: -15, unit: 'minutes', label: '-15m' },
        { amount: 15, unit: 'minutes', label: '15m' },
        { amount: 30, unit: 'minutes', label: '30m' },
      ]);
    });
  });
});
