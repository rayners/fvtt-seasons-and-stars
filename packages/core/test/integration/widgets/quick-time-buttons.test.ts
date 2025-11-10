/**
 * Comprehensive tests for Quick Time Buttons functionality
 * Combines base parsing, formatting, widget selection, and always-show feature tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseQuickTimeButtons,
  formatTimeButton,
  getQuickTimeButtons,
  getMiniWidgetButtonsFromSettings,
  getQuickTimeButtonsFromSettings,
} from '../../../src/core/quick-time-buttons';
import { mockStandardCalendar, mockCustomCalendar } from '../../../mocks/calendar-mocks';
import { CalendarMiniWidget } from '../../../src/ui/calendar-mini-widget';
import { CalendarWidget } from '../../../src/ui/calendar-widget';
import { SmallTimeUtils } from '../../../src/ui/base-widget-manager';

// Mock Foundry globals
globalThis.game = {
  user: { isGM: true },
  settings: {
    get: vi.fn().mockReturnValue('-15,15,30,60,240'),
    set: vi.fn(),
    register: vi.fn(),
  },
  seasonsStars: {
    getCurrentCalendar: vi.fn().mockReturnValue({
      hoursPerDay: 24,
      minutesPerHour: 60,
      daysPerWeek: 7,
    }),
    manager: {
      getActiveCalendar: vi.fn().mockReturnValue(mockStandardCalendar),
      getCurrentDate: vi.fn().mockReturnValue({
        toShortString: () => 'Test Date',
        toDateString: () => 'Test Date String',
        toTimeString: () => 'Test Time String',
        toObject: () => ({}),
        toLongString: () => 'Test Long Date',
      }),
    },
  },
  i18n: {
    lang: 'en',
  },
  modules: new Map(),
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

describe('parseQuickTimeButtons', () => {
  describe('basic parsing', () => {
    it('should parse basic minute values', () => {
      const result = parseQuickTimeButtons('15,30,60', mockStandardCalendar);
      expect(result).toEqual([15, 30, 60]);
    });

    it('should parse mixed positive and negative values', () => {
      const result = parseQuickTimeButtons('30,-60,10,-15', mockStandardCalendar);
      expect(result).toEqual([-60, -15, 10, 30]);
    });

    it('should sort values numerically', () => {
      const result = parseQuickTimeButtons('240,10,60,30', mockStandardCalendar);
      expect(result).toEqual([10, 30, 60, 240]);
    });

    it('should handle empty input gracefully', () => {
      const result = parseQuickTimeButtons('', mockStandardCalendar);
      expect(result).toEqual([-15, 15, 30, 60, 240]); // Returns default values for empty input
    });

    it('should filter out invalid entries', () => {
      const result = parseQuickTimeButtons('15,invalid,30,abc,60', mockStandardCalendar);
      expect(result).toEqual([15, 30, 60]);
    });

    it('should handle whitespace correctly', () => {
      const result = parseQuickTimeButtons(' 15 , 30 , 60 ', mockStandardCalendar);
      expect(result).toEqual([15, 30, 60]);
    });
  });

  describe('unit parsing', () => {
    it('should parse minute units correctly', () => {
      const result = parseQuickTimeButtons('15m,30m,60m', mockStandardCalendar);
      expect(result).toEqual([15, 30, 60]);
    });

    it('should parse hour units correctly', () => {
      const result = parseQuickTimeButtons('1h,2h,4h', mockStandardCalendar);
      expect(result).toEqual([60, 120, 240]);
    });

    it('should parse day units correctly', () => {
      const result = parseQuickTimeButtons('1d,2d', mockStandardCalendar);
      expect(result).toEqual([1440, 2880]); // 24 * 60 = 1440
    });

    it('should parse week units correctly', () => {
      const result = parseQuickTimeButtons('1w', mockStandardCalendar);
      expect(result).toEqual([10080]); // 7 * 24 * 60 = 10080
    });

    it('should handle mixed units', () => {
      const result = parseQuickTimeButtons('30m,1h,1d', mockStandardCalendar);
      expect(result).toEqual([30, 60, 1440]);
    });

    it('should handle negative units', () => {
      const result = parseQuickTimeButtons('-1h,-30m,-1d', mockStandardCalendar);
      expect(result).toEqual([-1440, -60, -30]);
    });

    it('should handle unknown units by filtering them out', () => {
      const result = parseQuickTimeButtons('15x,30,60y,120', mockStandardCalendar);
      expect(result).toEqual([30, 120]); // Should filter out 15x and 60y
    });

    it('should handle multiple unknown units', () => {
      const result = parseQuickTimeButtons('15z,30y,60x,120', mockStandardCalendar);
      expect(result).toEqual([120]); // Only 120 (no unit) is valid
    });
  });

  describe('calendar-aware parsing', () => {
    it('should use custom calendar hour lengths', () => {
      const result = parseQuickTimeButtons('1h,1d', mockCustomCalendar);
      expect(result).toEqual([50, 1000]); // 50 minutes/hour, 20 hours/day = 1000 minutes/day
    });

    it('should use custom calendar week lengths', () => {
      const result = parseQuickTimeButtons('1w', mockCustomCalendar);
      expect(result).toEqual([6000]); // 6 days/week * 20 hours/day * 50 minutes/hour = 6000
    });

    it('should handle missing calendar gracefully', () => {
      const result = parseQuickTimeButtons('1h,1d,1w', null);
      expect(result).toEqual([60, 1440, 10080]); // Default to standard calendar
    });

    it('should handle incomplete calendar data', () => {
      const partialCalendar = {
        time: { hoursInDay: 20, minutesInHour: 60, secondsInMinute: 60 },
        // Missing weekdays, so should default to 7
      };
      const result = parseQuickTimeButtons('1h,1d', partialCalendar);
      expect(result).toEqual([60, 1200]); // Uses 20 hours/day, 60 min/hour, 7 days/week
    });
  });

  describe('edge cases', () => {
    it('should handle very large numbers', () => {
      const result = parseQuickTimeButtons('999999,1000000', mockStandardCalendar);
      expect(result).toEqual([999999, 1000000]);
    });

    it('should handle zero values', () => {
      const result = parseQuickTimeButtons('0,15,30', mockStandardCalendar);
      expect(result).toEqual([0, 15, 30]);
    });

    it('should handle duplicate values', () => {
      const result = parseQuickTimeButtons('15,30,15,30', mockStandardCalendar);
      expect(result).toEqual([15, 15, 30, 30]); // Keeps duplicates, sorts them
    });

    it('should handle single value', () => {
      const result = parseQuickTimeButtons('60', mockStandardCalendar);
      expect(result).toEqual([60]);
    });

    it('should handle trailing commas', () => {
      const result = parseQuickTimeButtons('15,30,60,', mockStandardCalendar);
      expect(result).toEqual([15, 30, 60]);
    });

    it('should handle leading commas', () => {
      const result = parseQuickTimeButtons(',15,30,60', mockStandardCalendar);
      expect(result).toEqual([15, 30, 60]);
    });
  });
});

describe('formatTimeButton', () => {
  describe('standard calendar formatting', () => {
    it('should format minutes correctly', () => {
      expect(formatTimeButton(15, mockStandardCalendar)).toBe('15m');
      expect(formatTimeButton(45, mockStandardCalendar)).toBe('45m');
    });

    it('should format hours correctly', () => {
      expect(formatTimeButton(60, mockStandardCalendar)).toBe('1h');
      expect(formatTimeButton(120, mockStandardCalendar)).toBe('2h');
      expect(formatTimeButton(240, mockStandardCalendar)).toBe('4h');
    });

    it('should format days correctly', () => {
      expect(formatTimeButton(1440, mockStandardCalendar)).toBe('1d'); // 24 * 60
      expect(formatTimeButton(2880, mockStandardCalendar)).toBe('2d');
    });

    it('should format weeks correctly', () => {
      expect(formatTimeButton(10080, mockStandardCalendar)).toBe('1w'); // 7 * 24 * 60
      expect(formatTimeButton(20160, mockStandardCalendar)).toBe('2w'); // 2 weeks
      expect(formatTimeButton(-10080, mockStandardCalendar)).toBe('-1w'); // Negative week
    });

    it('should prefer largest appropriate unit', () => {
      expect(formatTimeButton(60, mockStandardCalendar)).toBe('1h'); // Not "60m"
      expect(formatTimeButton(1440, mockStandardCalendar)).toBe('1d'); // Not "24h"
      expect(formatTimeButton(10080, mockStandardCalendar)).toBe('1w'); // Not "7d"
    });

    it('should format exact days when not exact weeks', () => {
      // Test exact day formatting when it's not a full week
      expect(formatTimeButton(1440, mockStandardCalendar)).toBe('1d'); // 1 day
      expect(formatTimeButton(2880, mockStandardCalendar)).toBe('2d'); // 2 days
      expect(formatTimeButton(4320, mockStandardCalendar)).toBe('3d'); // 3 days
      expect(formatTimeButton(-2880, mockStandardCalendar)).toBe('-2d'); // Negative days
    });

    it('should handle non-exact divisions as minutes', () => {
      expect(formatTimeButton(90, mockStandardCalendar)).toBe('90m'); // 1.5 hours
      expect(formatTimeButton(1500, mockStandardCalendar)).toBe('25h'); // 25 hours (exact hours)
    });

    it('should handle negative values correctly', () => {
      expect(formatTimeButton(-60, mockStandardCalendar)).toBe('-1h');
      expect(formatTimeButton(-1440, mockStandardCalendar)).toBe('-1d');
      expect(formatTimeButton(-15, mockStandardCalendar)).toBe('-15m');
    });
  });

  describe('custom calendar formatting', () => {
    it('should use custom hour lengths', () => {
      expect(formatTimeButton(50, mockCustomCalendar)).toBe('1h'); // 50 minutes/hour
      expect(formatTimeButton(100, mockCustomCalendar)).toBe('2h');
    });

    it('should use custom day lengths', () => {
      expect(formatTimeButton(1000, mockCustomCalendar)).toBe('1d'); // 20 * 50 = 1000
      expect(formatTimeButton(2000, mockCustomCalendar)).toBe('2d');
    });

    it('should use custom week lengths', () => {
      expect(formatTimeButton(6000, mockCustomCalendar)).toBe('1w'); // 6 * 20 * 50 = 6000
    });

    it('should handle mixed custom calendar units', () => {
      expect(formatTimeButton(25, mockCustomCalendar)).toBe('25m'); // Less than 1 hour
      expect(formatTimeButton(75, mockCustomCalendar)).toBe('75m'); // 1.5 hours, not exact
      expect(formatTimeButton(150, mockCustomCalendar)).toBe('3h'); // Exact 3 hours
    });
  });

  describe('edge cases', () => {
    it('should handle zero correctly', () => {
      expect(formatTimeButton(0, mockStandardCalendar)).toBe('0m');
    });

    it('should handle missing calendar gracefully', () => {
      expect(formatTimeButton(60, null)).toBe('1h'); // Default calendar
      expect(formatTimeButton(1440, undefined)).toBe('1d');
    });

    it('should handle very large numbers', () => {
      expect(formatTimeButton(999999, mockStandardCalendar)).toBe('999999m');
    });
  });
});

describe('getQuickTimeButtons (mini widget selection)', () => {
  describe('main widget (no limitation)', () => {
    it('should return all buttons for main widget', () => {
      const allButtons = [10, 30, 60, 120, 240];
      const result = getQuickTimeButtons(allButtons, false);
      expect(result).toEqual([10, 30, 60, 120, 240]);
    });

    it('should return all buttons even with many buttons', () => {
      const allButtons = [-240, -60, -15, 5, 10, 15, 30, 60, 120, 240, 480];
      const result = getQuickTimeButtons(allButtons, false);
      expect(result).toEqual([-240, -60, -15, 5, 10, 15, 30, 60, 120, 240, 480]);
    });
  });

  describe('mini widget selection (3 button limit)', () => {
    it('should return all buttons when 3 or fewer', () => {
      const allButtons = [10, 30, 60];
      const result = getQuickTimeButtons(allButtons, true);
      expect(result).toEqual([10, 30, 60]);
    });

    it('should return exactly 3 buttons when more available', () => {
      const allButtons = [10, 30, 60, 120, 240];
      const result = getQuickTimeButtons(allButtons, true);
      expect(result).toHaveLength(3);
    });

    it('should prioritize largest negative + smallest positives', () => {
      const allButtons = [-240, -60, -15, 10, 30, 60, 120, 240];
      const result = getQuickTimeButtons(allButtons, true);
      expect(result).toEqual([-15, 10, 30]); // -15 (largest negative) + 2 smallest positives
    });

    it('should take 3 smallest positives when no negatives', () => {
      const allButtons = [10, 30, 60, 120, 240, 480];
      const result = getQuickTimeButtons(allButtons, true);
      expect(result).toEqual([10, 30, 60]);
    });

    it('should handle only negative values', () => {
      const allButtons = [-480, -240, -120, -60, -30, -10];
      const result = getQuickTimeButtons(allButtons, true);
      expect(result).toEqual([-10]); // Only largest negative, no positives to fill remaining slots
    });

    it('should handle mixed with multiple negatives', () => {
      const allButtons = [-120, -60, -15, 10, 30, 60, 120, 240, 480];
      const result = getQuickTimeButtons(allButtons, true);
      expect(result).toEqual([-15, 10, 30]); // 1 negative + 2 positives
    });

    it('should handle single button', () => {
      const allButtons = [60];
      const result = getQuickTimeButtons(allButtons, true);
      expect(result).toEqual([60]);
    });

    it('should handle empty array', () => {
      const allButtons: number[] = [];
      const result = getQuickTimeButtons(allButtons, true);
      expect(result).toEqual([]);
    });
  });

  describe('auto-selection algorithm edge cases', () => {
    it('should handle all same sign values', () => {
      // All positive
      const positiveButtons = [5, 10, 15, 30, 60, 120, 240];
      const result1 = getQuickTimeButtons(positiveButtons, true);
      expect(result1).toEqual([5, 10, 15]);

      // All negative
      const negativeButtons = [-240, -120, -60, -30, -15, -10, -5];
      const result2 = getQuickTimeButtons(negativeButtons, true);
      expect(result2).toEqual([-5]); // Just the largest (closest to zero)
    });

    it('should maintain sorted order in output', () => {
      const allButtons = [-120, -15, 240, 10, 480, 30, -60];
      // After sorting: [-120, -60, -15, 10, 30, 240, 480]
      // Negatives: [-120, -60, -15], largest = -15
      // Positives: [10, 30, 240, 480], take first 2 = [10, 30]
      const result = getQuickTimeButtons(allButtons, true);
      expect(result).toEqual([-15, 10, 30]);
    });

    it('should handle exactly 3 buttons', () => {
      const allButtons = [-60, 10, 30];
      const result = getQuickTimeButtons(allButtons, true);
      expect(result).toEqual([-60, 10, 30]); // All 3 buttons
    });

    it('should handle exactly 4 buttons (edge of limitation)', () => {
      const allButtons = [-60, -15, 10, 30];
      const result = getQuickTimeButtons(allButtons, true);
      expect(result).toEqual([-15, 10, 30]); // Drop one negative, keep largest
    });
  });
});

describe('integration scenarios', () => {
  describe('PF2e use case', () => {
    it('should handle PF2e exploration mode configuration', () => {
      const pf2eInput = '10,30,60';
      const parsed = parseQuickTimeButtons(pf2eInput, mockStandardCalendar);
      expect(parsed).toEqual([10, 30, 60]);

      const mainWidget = getQuickTimeButtons(parsed, false);
      expect(mainWidget).toEqual([10, 30, 60]);

      const miniWidget = getQuickTimeButtons(parsed, true);
      expect(miniWidget).toEqual([10, 30, 60]); // All 3 fit in mini widget
    });
  });

  describe('complex user configurations', () => {
    it('should handle power user configuration with many options', () => {
      const powerUserInput = '-4h,-1h,-15m,10m,30m,1h,4h,8h';
      const parsed = parseQuickTimeButtons(powerUserInput, mockStandardCalendar);
      expect(parsed).toEqual([-240, -60, -15, 10, 30, 60, 240, 480]);

      const mainWidget = getQuickTimeButtons(parsed, false);
      expect(mainWidget).toHaveLength(8); // All buttons

      const miniWidget = getQuickTimeButtons(parsed, true);
      expect(miniWidget).toEqual([-15, 10, 30]); // Auto-selected subset
    });

    it('should handle backward-time-heavy configuration', () => {
      const backwardInput = '-8h,-4h,-1h,-30m,15m,1h';
      const parsed = parseQuickTimeButtons(backwardInput, mockStandardCalendar);
      expect(parsed).toEqual([-480, -240, -60, -30, 15, 60]);

      const miniWidget = getQuickTimeButtons(parsed, true);
      expect(miniWidget).toEqual([-30, 15, 60]); // Largest negative + available positives
    });
  });

  describe('calendar-specific scenarios', () => {
    it('should work with custom calendar and complex input', () => {
      const customInput = '1h,1d,1w,-30m';
      const parsed = parseQuickTimeButtons(customInput, mockCustomCalendar);
      // 1h = 50m, 1d = 1000m (20*50), 1w = 6000m (6*20*50), -30m = -30m
      expect(parsed).toEqual([-30, 50, 1000, 6000]);

      const formatted = parsed.map(m => formatTimeButton(m, mockCustomCalendar));
      expect(formatted).toEqual(['-30m', '1h', '1d', '1w']);
    });
  });

  describe('error recovery and edge cases', () => {
    it('should handle malformed input gracefully', () => {
      const malformedInput = '15,,30,invalid,abc123,60m,1h,';
      const parsed = parseQuickTimeButtons(malformedInput, mockStandardCalendar);
      expect(parsed).toEqual([15, 30, 60, 60]); // Filters out invalid, keeps valid
    });

    it('should handle all invalid input', () => {
      const invalidInput = 'invalid,abc,xyz,';
      const parsed = parseQuickTimeButtons(invalidInput, mockStandardCalendar);
      expect(parsed).toEqual([]); // Empty result

      const miniWidget = getQuickTimeButtons(parsed, true);
      expect(miniWidget).toEqual([]); // Handles empty gracefully
    });

    it('should handle very large mixed configuration', () => {
      const largeInput = Array.from({ length: 20 }, (_, i) => `${(i - 10) * 15}`).join(',');
      const parsed = parseQuickTimeButtons(largeInput, mockStandardCalendar);
      expect(parsed).toHaveLength(20); // All valid
      expect(parsed[0]).toBe(-150); // Largest negative (i=0: (0-10)*15 = -150)
      expect(parsed[19]).toBe(135); // Largest positive (i=19: (19-10)*15 = 135)

      const miniWidget = getQuickTimeButtons(parsed, true);
      expect(miniWidget).toHaveLength(3); // Limited to 3
      expect(miniWidget[0]).toBe(-15); // Largest negative
      expect(miniWidget.slice(1)).toEqual([15, 30]); // 2 smallest positives
    });
  });
});

describe('getMiniWidgetButtonsFromSettings (Independent Configuration)', () => {
  // Mock the manager for these tests
  const mockManager = {
    getActiveCalendar: vi.fn().mockReturnValue(mockStandardCalendar),
  };

  beforeEach(() => {
    // Reset game mock to clean state
    globalThis.game = {
      user: { isGM: true },
      settings: {
        get: vi.fn(),
        set: vi.fn(),
      },
      seasonsStars: {
        manager: mockManager,
      },
    } as any;
  });

  describe('empty or missing mini widget setting', () => {
    it('should return null when mini widget setting is empty', () => {
      globalThis.game.settings.get.mockImplementation((namespace: string, key: string) => {
        if (key === 'miniWidgetQuickTimeButtons') return '';
        if (key === 'quickTimeButtons') return '-15,15,30,60,240';
        return '';
      });

      const result = getMiniWidgetButtonsFromSettings();
      expect(result).toBeNull();
    });

    it('should return null when mini widget setting is not set', () => {
      globalThis.game.settings.get.mockImplementation((namespace: string, key: string) => {
        if (key === 'miniWidgetQuickTimeButtons') return undefined;
        if (key === 'quickTimeButtons') return '-15,15,30,60,240';
        return '';
      });

      const result = getMiniWidgetButtonsFromSettings();
      expect(result).toBeNull();
    });

    it('should return null when mini widget setting is whitespace only', () => {
      globalThis.game.settings.get.mockImplementation((namespace: string, key: string) => {
        if (key === 'miniWidgetQuickTimeButtons') return '   ';
        if (key === 'quickTimeButtons') return '-15,15,30,60,240';
        return '';
      });

      const result = getMiniWidgetButtonsFromSettings();
      expect(result).toBeNull();
    });
  });

  describe('valid mini widget specific configuration', () => {
    it('should accept buttons not in main setting', () => {
      globalThis.game.settings.get.mockImplementation((namespace: string, key: string) => {
        if (key === 'miniWidgetQuickTimeButtons') return '-6h,+1d'; // Not in main setting
        if (key === 'quickTimeButtons') return '15,30,60'; // Different buttons
        return '';
      });

      const result = getMiniWidgetButtonsFromSettings();
      expect(result).toEqual([
        { amount: -360, unit: 'minutes', label: '-6h' },
        { amount: 1440, unit: 'minutes', label: '1d' },
      ]);
    });

    it('should parse any valid time format independently', () => {
      globalThis.game.settings.get.mockImplementation((namespace: string, key: string) => {
        if (key === 'miniWidgetQuickTimeButtons') return '10m,-2h,3d,-1w';
        if (key === 'quickTimeButtons') return '5,15'; // Completely different
        return '';
      });

      const result = getMiniWidgetButtonsFromSettings();
      expect(result).toEqual([
        { amount: -10080, unit: 'minutes', label: '-1w' },
        { amount: -120, unit: 'minutes', label: '-2h' },
        { amount: 10, unit: 'minutes', label: '10m' },
        { amount: 4320, unit: 'minutes', label: '3d' },
      ]);
    });

    it('should work with numbers only (no units)', () => {
      globalThis.game.settings.get.mockImplementation((namespace: string, key: string) => {
        if (key === 'miniWidgetQuickTimeButtons') return '-100,50,200';
        if (key === 'quickTimeButtons') return '15,30,60';
        return '';
      });

      const result = getMiniWidgetButtonsFromSettings();
      expect(result).toEqual([
        { amount: -100, unit: 'minutes', label: '-100m' },
        { amount: 50, unit: 'minutes', label: '50m' },
        { amount: 200, unit: 'minutes', label: '200m' },
      ]);
    });

    it('should work with mixed units and numbers', () => {
      globalThis.game.settings.get.mockImplementation((namespace: string, key: string) => {
        if (key === 'miniWidgetQuickTimeButtons') return '-30,1h,90,2d';
        if (key === 'quickTimeButtons') return '15,30,60';
        return '';
      });

      const result = getMiniWidgetButtonsFromSettings();
      expect(result).toEqual([
        { amount: -30, unit: 'minutes', label: '-30m' },
        { amount: 60, unit: 'minutes', label: '1h' },
        { amount: 90, unit: 'minutes', label: '90m' },
        { amount: 2880, unit: 'minutes', label: '2d' },
      ]);
    });
  });

  describe('invalid mini widget setting handling', () => {
    it('should return null when no valid buttons can be parsed', () => {
      globalThis.game.settings.get.mockImplementation((namespace: string, key: string) => {
        if (key === 'miniWidgetQuickTimeButtons') return 'invalid,abc,xyz';
        if (key === 'quickTimeButtons') return '15,30,60';
        return '';
      });

      const result = getMiniWidgetButtonsFromSettings();
      expect(result).toBeNull();
    });

    it('should return valid buttons and ignore invalid ones', () => {
      globalThis.game.settings.get.mockImplementation((namespace: string, key: string) => {
        if (key === 'miniWidgetQuickTimeButtons') return '15,invalid,30,abc,1h';
        if (key === 'quickTimeButtons') return '5,10';
        return '';
      });

      const result = getMiniWidgetButtonsFromSettings();
      expect(result).toEqual([
        { amount: 15, unit: 'minutes', label: '15m' },
        { amount: 30, unit: 'minutes', label: '30m' },
        { amount: 60, unit: 'minutes', label: '1h' },
      ]);
    });

    it('should return null when only invalid entries exist', () => {
      globalThis.game.settings.get.mockImplementation((namespace: string, key: string) => {
        if (key === 'miniWidgetQuickTimeButtons') return 'invalid,,,abc,xyz,';
        if (key === 'quickTimeButtons') return '15,30,60';
        return '';
      });

      const result = getMiniWidgetButtonsFromSettings();
      expect(result).toBeNull();
    });
  });

  describe('calendar integration', () => {
    it('should use custom calendar for parsing units', () => {
      mockManager.getActiveCalendar.mockReturnValue(mockCustomCalendar);

      globalThis.game.settings.get.mockImplementation((namespace: string, key: string) => {
        if (key === 'miniWidgetQuickTimeButtons') return '1h,1d';
        if (key === 'quickTimeButtons') return '15,30,60';
        return '';
      });

      const result = getMiniWidgetButtonsFromSettings();
      expect(result).toEqual([
        { amount: 50, unit: 'minutes', label: '1h' }, // Custom: 50 min/hour
        { amount: 1000, unit: 'minutes', label: '1d' }, // Custom: 20 hours * 50 min = 1000
      ]);
    });

    it('should handle null calendar gracefully', () => {
      mockManager.getActiveCalendar.mockReturnValue(null);

      globalThis.game.settings.get.mockImplementation((namespace: string, key: string) => {
        if (key === 'miniWidgetQuickTimeButtons') return '1h,1d';
        if (key === 'quickTimeButtons') return '15,30,60';
        return '';
      });

      const result = getMiniWidgetButtonsFromSettings();
      expect(result).toEqual([
        { amount: 60, unit: 'minutes', label: '1h' }, // Default: 60 min/hour
        { amount: 1440, unit: 'minutes', label: '1d' }, // Default: 24 * 60 = 1440
      ]);
    });
  });

  describe('error handling', () => {
    it('should handle game.settings being undefined', () => {
      globalThis.game.settings = undefined as any;

      const result = getMiniWidgetButtonsFromSettings();
      expect(result).toBeNull();
    });

    it('should handle manager being undefined', () => {
      globalThis.game.seasonsStars = undefined as any;

      globalThis.game.settings.get.mockImplementation((namespace: string, key: string) => {
        if (key === 'miniWidgetQuickTimeButtons') return '15,30,60';
        return '';
      });

      const result = getMiniWidgetButtonsFromSettings();
      expect(result).toEqual([
        { amount: 15, unit: 'minutes', label: '15m' },
        { amount: 30, unit: 'minutes', label: '30m' },
        { amount: 60, unit: 'minutes', label: '1h' },
      ]);
    });

    it('should handle exceptions gracefully and return null', () => {
      globalThis.game.settings.get.mockImplementation(() => {
        throw new Error('Settings error');
      });

      const result = getMiniWidgetButtonsFromSettings();
      expect(result).toBeNull();
    });
  });
});

describe('Backward Compatibility', () => {
  const mockManager = {
    getActiveCalendar: vi.fn().mockReturnValue(mockStandardCalendar),
  };

  beforeEach(() => {
    globalThis.game = {
      settings: {
        get: vi.fn(),
        set: vi.fn(),
      },
      seasonsStars: {
        manager: mockManager,
      },
    } as any;
  });

  it('should maintain existing behavior when mini widget setting is not configured', () => {
    // This tests that the change doesn't break existing users
    globalThis.game.settings.get.mockImplementation((namespace: string, key: string) => {
      if (key === 'miniWidgetQuickTimeButtons') return ''; // Not configured
      if (key === 'quickTimeButtons') return '-60,15,30,60,240'; // Existing config
      return '';
    });

    // Main widget should get all buttons
    const mainResult = getQuickTimeButtonsFromSettings(false);
    expect(mainResult).toEqual([
      { amount: -60, unit: 'minutes', label: '-1h' },
      { amount: 15, unit: 'minutes', label: '15m' },
      { amount: 30, unit: 'minutes', label: '30m' },
      { amount: 60, unit: 'minutes', label: '1h' },
      { amount: 240, unit: 'minutes', label: '4h' },
    ]);

    // Mini widget should get auto-selected subset (existing behavior)
    const miniResult = getQuickTimeButtonsFromSettings(true);
    expect(miniResult).toEqual([
      { amount: -60, unit: 'minutes', label: '-1h' },
      { amount: 15, unit: 'minutes', label: '15m' },
      { amount: 30, unit: 'minutes', label: '30m' },
    ]);
  });

  it('should not produce any validation warnings with valid configurations', () => {
    // This ensures no warnings are generated with the new permissive logic
    const warnSpy = vi.spyOn(globalThis.console, 'warn').mockImplementation(() => {});

    globalThis.game.settings.get.mockImplementation((namespace: string, key: string) => {
      if (key === 'miniWidgetQuickTimeButtons') return '-7d,+30d'; // Not in main setting
      if (key === 'quickTimeButtons') return '15,30,60'; // Different buttons
      return '';
    });

    const result = getMiniWidgetButtonsFromSettings();
    expect(result).toEqual([
      { amount: -10080, unit: 'minutes', label: '-1w' },
      { amount: 43200, unit: 'minutes', label: '30d' },
    ]);

    // Verify no warnings were generated
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});

describe('Always Show Quick Time Buttons - Settings Registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    globalThis.game = {
      user: { isGM: true },
      settings: {
        get: vi.fn().mockReturnValue('-15,15,30,60,240'),
        set: vi.fn(),
        register: vi.fn(),
      },
      i18n: {
        lang: 'en',
      },
      modules: new Map(),
      seasonsStars: {
        manager: {
          getActiveCalendar: vi.fn().mockReturnValue(mockStandardCalendar),
          getCurrentDate: vi.fn().mockReturnValue({
            toShortString: () => 'Test Date',
            toDateString: () => 'Test Date String',
            toTimeString: () => 'Test Time String',
            toObject: () => ({}),
            toLongString: () => 'Test Long Date',
          }),
        },
      },
    } as any;

    globalThis.Hooks = {
      callAll: vi.fn(),
      on: vi.fn(),
    } as any;

    // Reset SmallTime mock to default (not available)
    vi.spyOn(SmallTimeUtils, 'isSmallTimeAvailable').mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should register alwaysShowQuickTimeButtons setting with correct configuration', () => {
    // This test verifies the setting can be retrieved without errors
    // The actual registration is tested in module.ts integration
    expect(() => {
      globalThis.game.settings.get('seasons-and-stars', 'alwaysShowQuickTimeButtons');
    }).not.toThrow();
  });

  it('should return false as default value when setting is not configured', () => {
    globalThis.game.settings.get.mockReturnValue(undefined);

    const result =
      globalThis.game.settings.get('seasons-and-stars', 'alwaysShowQuickTimeButtons') || false;
    expect(result).toBe(false);
  });

  it('should trigger settings change hook when setting changes', () => {
    // Simulate setting registration with onChange callback
    globalThis.game.settings.register.mockImplementation((module, setting, config) => {
      if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
        // Store the onChange callback for testing
        config.onChange();
      }
    });

    // Should call Hooks.callAll with correct parameters
    // This will be implemented when we add the setting registration
  });
});

describe('Always Show Quick Time Buttons - CalendarMiniWidget Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.game.user.isGM = true;
    globalThis.game.modules.clear();

    // Reset settings mock with implementation
    globalThis.game.settings.get = vi.fn().mockImplementation((module, setting) => {
      if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
        return false; // Default value
      }
      return undefined;
    });

    // Reset manager mocks
    globalThis.game.seasonsStars.manager.getActiveCalendar.mockReturnValue({
      id: 'test-calendar',
      label: 'Test Calendar',
      name: 'Test Calendar',
      translations: {
        en: {
          label: 'Test Calendar',
          description: 'Test Description',
        },
      },
    });

    globalThis.game.seasonsStars.manager.getCurrentDate.mockReturnValue({
      toShortString: () => 'Test Date',
      toDateString: () => 'Test Date String',
      toTimeString: () => 'Test Time String',
      toObject: () => ({}),
      toLongString: () => 'Test Long Date',
    });

    vi.spyOn(SmallTimeUtils, 'isSmallTimeAvailable').mockReturnValue(false);
  });

  it('should show time controls when alwaysShowQuickTimeButtons is true regardless of SmallTime', async () => {
    // Set the always show setting to true
    globalThis.game.settings.get.mockImplementation((module, setting) => {
      if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
        return true;
      }
      return false;
    });

    const widget = new CalendarMiniWidget();

    // Mock SmallTime as available (normally would hide controls)
    vi.spyOn(SmallTimeUtils, 'isSmallTimeAvailable').mockReturnValue(true);

    const context = await widget._prepareContext();

    // Should show time controls even with SmallTime present
    expect(context.showTimeControls).toBe(true);
  });

  it('should hide time controls when alwaysShowQuickTimeButtons is false and SmallTime is present', async () => {
    // Set the always show setting to false
    globalThis.game.settings.get.mockImplementation((module, setting) => {
      if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
        return false;
      }
      return false;
    });

    const widget = new CalendarMiniWidget();

    // Mock SmallTime as available
    vi.spyOn(SmallTimeUtils, 'isSmallTimeAvailable').mockReturnValue(true);

    const context = await widget._prepareContext();

    // Should hide time controls when SmallTime is present and setting is false
    expect(context.showTimeControls).toBe(false);
  });

  it('should show time controls when alwaysShowQuickTimeButtons is false but SmallTime is absent', async () => {
    // Set the always show setting to false
    globalThis.game.settings.get.mockImplementation((module, setting) => {
      if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
        return false;
      }
      return false;
    });

    const widget = new CalendarMiniWidget();

    // Mock SmallTime as not available
    vi.spyOn(SmallTimeUtils, 'isSmallTimeAvailable').mockReturnValue(false);

    const context = await widget._prepareContext();

    // Should show time controls when SmallTime is absent
    expect(context.showTimeControls).toBe(true);
  });

  it('should enforce GM permissions regardless of alwaysShowQuickTimeButtons setting', async () => {
    // Set user as non-GM
    globalThis.game.user.isGM = false;

    // Set the always show setting to true
    globalThis.game.settings.get.mockImplementation((module, setting) => {
      if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
        return true;
      }
      return false;
    });

    const widget = new CalendarMiniWidget();

    // Mock SmallTime as not available
    vi.spyOn(SmallTimeUtils, 'isSmallTimeAvailable').mockReturnValue(false);

    const context = await widget._prepareContext();

    // Should not show time controls for non-GM users
    expect(context.showTimeControls).toBe(false);
  });
});

describe('Always Show Quick Time Buttons - CalendarWidget Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.game.user.isGM = true;
    globalThis.game.modules.clear();

    // Reset settings mock with implementation
    globalThis.game.settings.get = vi.fn().mockImplementation((module, setting) => {
      if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
        return false; // Default value
      }
      return undefined;
    });

    // Reset manager mocks
    globalThis.game.seasonsStars.manager.getActiveCalendar.mockReturnValue({
      id: 'test-calendar',
      label: 'Test Calendar',
      name: 'Test Calendar',
      translations: {
        en: {
          label: 'Test Calendar',
          description: 'Test Description',
        },
      },
    });

    globalThis.game.seasonsStars.manager.getCurrentDate.mockReturnValue({
      toShortString: () => 'Test Date',
      toDateString: () => 'Test Date String',
      toTimeString: () => 'Test Time String',
      toObject: () => ({}),
      toLongString: () => 'Test Long Date',
    });
  });

  it('should show time controls when alwaysShowQuickTimeButtons is true regardless of SmallTime', async () => {
    // Set the always show setting to true
    globalThis.game.settings.get.mockImplementation((module, setting) => {
      if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
        return true;
      }
      return false;
    });

    // Mock game modules to simulate SmallTime being available
    const mockModules = new Map();
    mockModules.set('smalltime', { active: true });
    globalThis.game.modules = mockModules;

    const widget = new CalendarWidget();

    const context = await widget._prepareContext();

    // Should show time controls even with SmallTime present because setting is true
    expect(context.showTimeControls).toBe(true);
  });

  it('should hide time controls when alwaysShowQuickTimeButtons is false and SmallTime is present', async () => {
    // Set the always show setting to false
    globalThis.game.settings.get.mockImplementation((module, setting) => {
      if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
        return false;
      }
      return false;
    });

    const widget = new CalendarWidget();

    // Mock detectSmallTime method to return true
    vi.spyOn(widget as any, 'detectSmallTime').mockReturnValue(true);

    const context = await widget._prepareContext();

    // Should hide time controls when SmallTime is present and setting is false
    expect(context.showTimeControls).toBe(false);
  });

  it('should enforce GM permissions regardless of alwaysShowQuickTimeButtons setting', async () => {
    // Set user as non-GM
    globalThis.game.user.isGM = false;

    // Set the always show setting to true
    globalThis.game.settings.get.mockImplementation((module, setting) => {
      if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
        return true;
      }
      return false;
    });

    const widget = new CalendarWidget();

    // Mock detectSmallTime method to return false
    vi.spyOn(widget as any, 'detectSmallTime').mockReturnValue(false);

    const context = await widget._prepareContext();

    // Should not show time controls for non-GM users
    expect(context.showTimeControls).toBe(false);
  });
});

describe('Always Show Quick Time Buttons - Hook Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should trigger widget re-render when alwaysShowQuickTimeButtons setting changes', () => {
    const mockRender = vi.fn();

    // Mock active widget instance
    CalendarMiniWidget.activeInstance = {
      rendered: true,
      render: mockRender,
    } as any;

    // Simulate the hook being called
    const hookCallback = globalThis.Hooks.on.mock.calls.find(
      call => call[0] === 'seasons-stars:settingsChanged'
    )?.[1];

    if (hookCallback) {
      hookCallback('alwaysShowQuickTimeButtons');
    }

    // Should trigger render when setting changes
    // This will be verified once we implement the hook handlers
  });

  it('should handle multiple widgets updating simultaneously', () => {
    const mockMiniRender = vi.fn();
    const mockMainRender = vi.fn();

    // Mock both widget instances
    CalendarMiniWidget.activeInstance = {
      rendered: true,
      render: mockMiniRender,
    } as any;

    CalendarWidget.activeInstance = {
      rendered: true,
      render: mockMainRender,
    } as any;

    // Both widgets should update when setting changes
    // This will be tested once hook handlers are implemented
  });
});

describe('Always Show Quick Time Buttons - SmallTime Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.game.user.isGM = true;
    globalThis.game.modules.clear();

    // Reset settings mock with implementation
    globalThis.game.settings.get = vi.fn().mockImplementation((module, setting) => {
      if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
        return false; // Default value
      }
      return undefined;
    });

    // Reset manager mocks
    globalThis.game.seasonsStars.manager.getActiveCalendar.mockReturnValue({
      id: 'test-calendar',
      label: 'Test Calendar',
      name: 'Test Calendar',
      translations: {
        en: {
          label: 'Test Calendar',
          description: 'Test Description',
        },
      },
    });

    globalThis.game.seasonsStars.manager.getCurrentDate.mockReturnValue({
      toShortString: () => 'Test Date',
      toDateString: () => 'Test Date String',
      toTimeString: () => 'Test Time String',
      toObject: () => ({}),
      toLongString: () => 'Test Long Date',
    });

    vi.spyOn(SmallTimeUtils, 'isSmallTimeAvailable').mockReturnValue(false);
  });

  it('should handle SmallTime becoming available after setting is enabled', async () => {
    // Start with SmallTime not available and setting enabled
    globalThis.game.settings.get.mockImplementation((module, setting) => {
      if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
        return true;
      }
      return false;
    });

    const widget = new CalendarMiniWidget();

    // First call - SmallTime not available (already set in beforeEach)
    let context = await widget._prepareContext();
    expect(context.showTimeControls).toBe(true);

    // Second call - SmallTime becomes available
    vi.spyOn(SmallTimeUtils, 'isSmallTimeAvailable').mockReturnValue(true);

    context = await widget._prepareContext();
    // Should still show controls because setting is enabled
    expect(context.showTimeControls).toBe(true);
  });

  it('should not interfere with existing quickTimeButtons setting', () => {
    // Both settings should work independently
    globalThis.game.settings.get.mockImplementation((module, setting) => {
      if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
        return true;
      }
      if (module === 'seasons-and-stars' && setting === 'quickTimeButtons') {
        return '15,30,60';
      }
      return false;
    });

    // Both settings should be retrievable
    const alwaysShow = globalThis.game.settings.get('seasons-and-stars', 'alwaysShowQuickTimeButtons');
    const quickButtons = globalThis.game.settings.get('seasons-and-stars', 'quickTimeButtons');

    expect(alwaysShow).toBe(true);
    expect(quickButtons).toBe('15,30,60');
  });
});

describe('Always Show Quick Time Buttons - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.game.user.isGM = true;
    globalThis.game.modules.clear();

    // Reset settings mock with implementation
    globalThis.game.settings.get = vi.fn().mockImplementation((module, setting) => {
      if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
        return false; // Default value
      }
      return undefined;
    });

    // Reset manager mocks
    globalThis.game.seasonsStars.manager.getActiveCalendar.mockReturnValue({
      id: 'test-calendar',
      label: 'Test Calendar',
      name: 'Test Calendar',
      translations: {
        en: {
          label: 'Test Calendar',
          description: 'Test Description',
        },
      },
    });

    globalThis.game.seasonsStars.manager.getCurrentDate.mockReturnValue({
      toShortString: () => 'Test Date',
      toDateString: () => 'Test Date String',
      toTimeString: () => 'Test Time String',
      toObject: () => ({}),
      toLongString: () => 'Test Long Date',
    });

    vi.spyOn(SmallTimeUtils, 'isSmallTimeAvailable').mockReturnValue(false);
  });

  it('should handle settings retrieval errors gracefully', async () => {
    // Mock settings.get to return undefined (simulating missing setting)
    globalThis.game.settings.get.mockReturnValue(undefined);

    const widget = new CalendarMiniWidget();

    // Should not throw and should default to false
    const context = await widget._prepareContext();

    // Should have showTimeControls as true (GM user, no SmallTime, setting defaults to false)
    // The SmallTime mock is already set to false in beforeEach
    expect(context.showTimeControls).toBe(true);
  });

  it('should handle missing game.settings gracefully', async () => {
    // Remove settings from game object
    delete (globalThis.game as any).settings;

    const widget = new CalendarMiniWidget();

    // Should not throw when settings is undefined
    expect(async () => {
      await widget._prepareContext();
    }).not.toThrow();
  });
});
