/**
 * Tests for Configurable Quick Time Buttons functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Foundry globals
globalThis.game = {
  user: { isGM: true },
  settings: {
    get: vi.fn().mockReturnValue("15,30,60,240"),
    set: vi.fn(),
  },
  seasonsStars: {
    getCurrentCalendar: vi.fn().mockReturnValue({
      hoursPerDay: 24,
      minutesPerHour: 60,
      daysPerWeek: 7
    })
  }
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

// Mock calendar data - properly typed to match SeasonsStarsCalendar interface
const mockCalendar = {
  id: 'test-calendar',
  translations: { en: { label: 'Test Calendar' } },
  year: { epoch: 2024, currentYear: 2024, prefix: '', suffix: '', startDay: 0 },
  months: [{ name: 'January', days: 31 }],
  weekdays: [
    { name: 'Monday' }, { name: 'Tuesday' }, { name: 'Wednesday' }, 
    { name: 'Thursday' }, { name: 'Friday' }, { name: 'Saturday' }, { name: 'Sunday' }
  ], // 7 days per week
  intercalary: [],
  time: {
    hoursInDay: 24,
    minutesInHour: 60,
    secondsInMinute: 60
  },
  leapYear: { rule: 'none' as const }
};

const mockCalendarCustom = {
  id: 'custom-calendar',
  translations: { en: { label: 'Custom Calendar' } },
  year: { epoch: 2024, currentYear: 2024, prefix: '', suffix: '', startDay: 0 },
  months: [{ name: 'CustomMonth', days: 20 }],
  weekdays: [
    { name: 'Day1' }, { name: 'Day2' }, { name: 'Day3' },
    { name: 'Day4' }, { name: 'Day5' }, { name: 'Day6' }
  ], // 6 days per week
  intercalary: [],
  time: {
    hoursInDay: 20,
    minutesInHour: 50,
    secondsInMinute: 60
  },
  leapYear: { rule: 'none' as const }
};

// Mock functions to test (these will be implemented in the actual module)
function parseQuickTimeButtons(settingValue: string, calendar: any): number[] {
  const hoursPerDay = calendar?.time?.hoursInDay || 24;
  const minutesPerHour = calendar?.time?.minutesInHour || 60;
  const daysPerWeek = calendar?.weekdays?.length || 7;
  
  return settingValue
    .split(',')
    .map(val => {
      const trimmed = val.trim();
      const match = trimmed.match(/^(-?\d+)([mhdw]?)$/);
      
      if (!match) return NaN;
      
      const [, amount, unit] = match;
      const num = parseInt(amount);
      
      switch (unit) {
        case 'w': return num * daysPerWeek * hoursPerDay * minutesPerHour;
        case 'd': return num * hoursPerDay * minutesPerHour;
        case 'h': return num * minutesPerHour;
        case 'm':
        case '': return num; // Default to minutes
        default: return NaN;
      }
    })
    .filter(val => !isNaN(val))
    .sort((a, b) => a - b); // Sort numerically: negatives first, then positives
}

function formatTimeButton(minutes: number, calendar: any): string {
  const minutesPerHour = calendar?.time?.minutesInHour || 60;
  const hoursPerDay = calendar?.time?.hoursInDay || 24;
  const daysPerWeek = calendar?.weekdays?.length || 7;
  
  const absMinutes = Math.abs(minutes);
  const sign = minutes < 0 ? '-' : '';
  
  // Calculate in calendar-specific units
  const minutesPerDay = hoursPerDay * minutesPerHour;
  const minutesPerWeek = daysPerWeek * minutesPerDay;
  
  if (absMinutes >= minutesPerWeek && absMinutes % minutesPerWeek === 0) {
    return `${sign}${absMinutes / minutesPerWeek}w`;
  } else if (absMinutes >= minutesPerDay && absMinutes % minutesPerDay === 0) {
    return `${sign}${absMinutes / minutesPerDay}d`;
  } else if (absMinutes >= minutesPerHour && absMinutes % minutesPerHour === 0) {
    return `${sign}${absMinutes / minutesPerHour}h`;
  } else {
    return `${sign}${absMinutes}m`;
  }
}

function getQuickTimeButtons(allButtons: number[], isMiniWidget: boolean = false): number[] {
  if (!isMiniWidget || allButtons.length <= 4) {
    return allButtons;
  }
  
  // Smart selection for mini widget: 1 most useful negative + 3 smallest positives
  // First ensure we work with sorted input
  const sorted = [...allButtons].sort((a, b) => a - b);
  const negatives = sorted.filter(b => b < 0);
  const positives = sorted.filter(b => b > 0);
  
  // Take largest negative (closest to zero) + smallest positives
  const selectedNegative = negatives.length > 0 ? [negatives[negatives.length - 1]] : [];
  const selectedPositives = positives.slice(0, 4 - selectedNegative.length);
  
  return [...selectedNegative, ...selectedPositives].sort((a, b) => a - b);
}

describe('parseQuickTimeButtons', () => {
  describe('basic parsing', () => {
    it('should parse basic minute values', () => {
      const result = parseQuickTimeButtons("15,30,60", mockCalendar);
      expect(result).toEqual([15, 30, 60]);
    });

    it('should parse mixed positive and negative values', () => {
      const result = parseQuickTimeButtons("30,-60,10,-15", mockCalendar);
      expect(result).toEqual([-60, -15, 10, 30]);
    });

    it('should sort values numerically', () => {
      const result = parseQuickTimeButtons("240,10,60,30", mockCalendar);
      expect(result).toEqual([10, 30, 60, 240]);
    });

    it('should handle empty input gracefully', () => {
      const result = parseQuickTimeButtons("", mockCalendar);
      expect(result).toEqual([]);
    });

    it('should filter out invalid entries', () => {
      const result = parseQuickTimeButtons("15,invalid,30,abc,60", mockCalendar);
      expect(result).toEqual([15, 30, 60]);
    });

    it('should handle whitespace correctly', () => {
      const result = parseQuickTimeButtons(" 15 , 30 , 60 ", mockCalendar);
      expect(result).toEqual([15, 30, 60]);
    });
  });

  describe('unit parsing', () => {
    it('should parse minute units correctly', () => {
      const result = parseQuickTimeButtons("15m,30m,60m", mockCalendar);
      expect(result).toEqual([15, 30, 60]);
    });

    it('should parse hour units correctly', () => {
      const result = parseQuickTimeButtons("1h,2h,4h", mockCalendar);
      expect(result).toEqual([60, 120, 240]);
    });

    it('should parse day units correctly', () => {
      const result = parseQuickTimeButtons("1d,2d", mockCalendar);
      expect(result).toEqual([1440, 2880]); // 24 * 60 = 1440
    });

    it('should parse week units correctly', () => {
      const result = parseQuickTimeButtons("1w", mockCalendar);
      expect(result).toEqual([10080]); // 7 * 24 * 60 = 10080
    });

    it('should handle mixed units', () => {
      const result = parseQuickTimeButtons("30m,1h,1d", mockCalendar);
      expect(result).toEqual([30, 60, 1440]);
    });

    it('should handle negative units', () => {
      const result = parseQuickTimeButtons("-1h,-30m,-1d", mockCalendar);
      expect(result).toEqual([-1440, -60, -30]);
    });
  });

  describe('calendar-aware parsing', () => {
    it('should use custom calendar hour lengths', () => {
      const result = parseQuickTimeButtons("1h,1d", mockCalendarCustom);
      expect(result).toEqual([50, 1000]); // 50 minutes/hour, 20 hours/day = 1000 minutes/day
    });

    it('should use custom calendar week lengths', () => {
      const result = parseQuickTimeButtons("1w", mockCalendarCustom);
      expect(result).toEqual([6000]); // 6 days/week * 20 hours/day * 50 minutes/hour = 6000
    });

    it('should handle missing calendar gracefully', () => {
      const result = parseQuickTimeButtons("1h,1d,1w", null);
      expect(result).toEqual([60, 1440, 10080]); // Default to standard calendar
    });

    it('should handle incomplete calendar data', () => {
      const partialCalendar = { 
        time: { hoursInDay: 20, minutesInHour: 60, secondsInMinute: 60 }
        // Missing weekdays, so should default to 7
      };
      const result = parseQuickTimeButtons("1h,1d", partialCalendar);
      expect(result).toEqual([60, 1200]); // Uses 20 hours/day, 60 min/hour, 7 days/week
    });
  });

  describe('edge cases', () => {
    it('should handle very large numbers', () => {
      const result = parseQuickTimeButtons("999999,1000000", mockCalendar);
      expect(result).toEqual([999999, 1000000]);
    });

    it('should handle zero values', () => {
      const result = parseQuickTimeButtons("0,15,30", mockCalendar);
      expect(result).toEqual([0, 15, 30]);
    });

    it('should handle duplicate values', () => {
      const result = parseQuickTimeButtons("15,30,15,30", mockCalendar);
      expect(result).toEqual([15, 15, 30, 30]); // Keeps duplicates, sorts them
    });

    it('should handle single value', () => {
      const result = parseQuickTimeButtons("60", mockCalendar);
      expect(result).toEqual([60]);
    });

    it('should handle trailing commas', () => {
      const result = parseQuickTimeButtons("15,30,60,", mockCalendar);
      expect(result).toEqual([15, 30, 60]);
    });

    it('should handle leading commas', () => {
      const result = parseQuickTimeButtons(",15,30,60", mockCalendar);
      expect(result).toEqual([15, 30, 60]);
    });
  });
});

describe('formatTimeButton', () => {
  describe('standard calendar formatting', () => {
    it('should format minutes correctly', () => {
      expect(formatTimeButton(15, mockCalendar)).toBe('15m');
      expect(formatTimeButton(45, mockCalendar)).toBe('45m');
    });

    it('should format hours correctly', () => {
      expect(formatTimeButton(60, mockCalendar)).toBe('1h');
      expect(formatTimeButton(120, mockCalendar)).toBe('2h');
      expect(formatTimeButton(240, mockCalendar)).toBe('4h');
    });

    it('should format days correctly', () => {
      expect(formatTimeButton(1440, mockCalendar)).toBe('1d'); // 24 * 60
      expect(formatTimeButton(2880, mockCalendar)).toBe('2d');
    });

    it('should format weeks correctly', () => {
      expect(formatTimeButton(10080, mockCalendar)).toBe('1w'); // 7 * 24 * 60
    });

    it('should prefer largest appropriate unit', () => {
      expect(formatTimeButton(60, mockCalendar)).toBe('1h'); // Not "60m"
      expect(formatTimeButton(1440, mockCalendar)).toBe('1d'); // Not "24h"
      expect(formatTimeButton(10080, mockCalendar)).toBe('1w'); // Not "7d"
    });

    it('should handle non-exact divisions as minutes', () => {
      expect(formatTimeButton(90, mockCalendar)).toBe('90m'); // 1.5 hours
      expect(formatTimeButton(1500, mockCalendar)).toBe('25h'); // 25 hours (exact hours)
    });

    it('should handle negative values correctly', () => {
      expect(formatTimeButton(-60, mockCalendar)).toBe('-1h');
      expect(formatTimeButton(-1440, mockCalendar)).toBe('-1d');
      expect(formatTimeButton(-15, mockCalendar)).toBe('-15m');
    });
  });

  describe('custom calendar formatting', () => {
    it('should use custom hour lengths', () => {
      expect(formatTimeButton(50, mockCalendarCustom)).toBe('1h'); // 50 minutes/hour
      expect(formatTimeButton(100, mockCalendarCustom)).toBe('2h');
    });

    it('should use custom day lengths', () => {
      expect(formatTimeButton(1000, mockCalendarCustom)).toBe('1d'); // 20 * 50 = 1000
      expect(formatTimeButton(2000, mockCalendarCustom)).toBe('2d');
    });

    it('should use custom week lengths', () => {
      expect(formatTimeButton(6000, mockCalendarCustom)).toBe('1w'); // 6 * 20 * 50 = 6000
    });

    it('should handle mixed custom calendar units', () => {
      expect(formatTimeButton(25, mockCalendarCustom)).toBe('25m'); // Less than 1 hour
      expect(formatTimeButton(75, mockCalendarCustom)).toBe('75m'); // 1.5 hours, not exact
      expect(formatTimeButton(150, mockCalendarCustom)).toBe('3h'); // Exact 3 hours
    });
  });

  describe('edge cases', () => {
    it('should handle zero correctly', () => {
      expect(formatTimeButton(0, mockCalendar)).toBe('0m');
    });

    it('should handle missing calendar gracefully', () => {
      expect(formatTimeButton(60, null)).toBe('1h'); // Default calendar
      expect(formatTimeButton(1440, undefined)).toBe('1d');
    });

    it('should handle very large numbers', () => {
      expect(formatTimeButton(999999, mockCalendar)).toBe('999999m');
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

  describe('mini widget selection (4 button limit)', () => {
    it('should return all buttons when 4 or fewer', () => {
      const allButtons = [10, 30, 60];
      const result = getQuickTimeButtons(allButtons, true);
      expect(result).toEqual([10, 30, 60]);
    });

    it('should return exactly 4 buttons when more available', () => {
      const allButtons = [10, 30, 60, 120, 240];
      const result = getQuickTimeButtons(allButtons, true);
      expect(result).toHaveLength(4);
    });

    it('should prioritize largest negative + smallest positives', () => {
      const allButtons = [-240, -60, -15, 10, 30, 60, 120, 240];
      const result = getQuickTimeButtons(allButtons, true);
      expect(result).toEqual([-15, 10, 30, 60]); // -15 (largest negative) + 3 smallest positives
    });

    it('should take 4 smallest positives when no negatives', () => {
      const allButtons = [10, 30, 60, 120, 240, 480];
      const result = getQuickTimeButtons(allButtons, true);
      expect(result).toEqual([10, 30, 60, 120]);
    });

    it('should handle only negative values', () => {
      const allButtons = [-480, -240, -120, -60, -30, -10];
      const result = getQuickTimeButtons(allButtons, true);
      expect(result).toEqual([-10]); // Only largest negative, no positives to fill remaining slots
    });

    it('should handle mixed with multiple negatives', () => {
      const allButtons = [-120, -60, -15, 10, 30, 60, 120, 240, 480];
      const result = getQuickTimeButtons(allButtons, true);
      expect(result).toEqual([-15, 10, 30, 60]); // 1 negative + 3 positives
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
      expect(result1).toEqual([5, 10, 15, 30]);

      // All negative  
      const negativeButtons = [-240, -120, -60, -30, -15, -10, -5];
      const result2 = getQuickTimeButtons(negativeButtons, true);
      expect(result2).toEqual([-5]); // Just the largest (closest to zero)
    });

    it('should maintain sorted order in output', () => {
      const allButtons = [-120, -15, 240, 10, 480, 30, -60];
      // After sorting: [-120, -60, -15, 10, 30, 240, 480]
      // Negatives: [-120, -60, -15], largest = -15
      // Positives: [10, 30, 240, 480], take first 3 = [10, 30, 240]
      const result = getQuickTimeButtons(allButtons, true);
      expect(result).toEqual([-15, 10, 30, 240]);
    });

    it('should handle exactly 4 buttons', () => {
      const allButtons = [-60, 10, 30, 60];
      const result = getQuickTimeButtons(allButtons, true);
      expect(result).toEqual([-60, 10, 30, 60]); // All 4 buttons
    });

    it('should handle exactly 5 buttons (edge of limitation)', () => {
      const allButtons = [-60, -15, 10, 30, 60];
      const result = getQuickTimeButtons(allButtons, true);
      expect(result).toEqual([-15, 10, 30, 60]); // Drop one negative, keep largest
    });
  });
});

describe('integration scenarios', () => {
  describe('PF2e use case', () => {
    it('should handle PF2e exploration mode configuration', () => {
      const pf2eInput = "10,30,60";
      const parsed = parseQuickTimeButtons(pf2eInput, mockCalendar);
      expect(parsed).toEqual([10, 30, 60]);
      
      const mainWidget = getQuickTimeButtons(parsed, false);
      expect(mainWidget).toEqual([10, 30, 60]);
      
      const miniWidget = getQuickTimeButtons(parsed, true);
      expect(miniWidget).toEqual([10, 30, 60]); // All 3 fit in mini widget
    });
  });

  describe('complex user configurations', () => {
    it('should handle power user configuration with many options', () => {
      const powerUserInput = "-4h,-1h,-15m,10m,30m,1h,4h,8h";
      const parsed = parseQuickTimeButtons(powerUserInput, mockCalendar);
      expect(parsed).toEqual([-240, -60, -15, 10, 30, 60, 240, 480]);
      
      const mainWidget = getQuickTimeButtons(parsed, false);
      expect(mainWidget).toHaveLength(8); // All buttons
      
      const miniWidget = getQuickTimeButtons(parsed, true);
      expect(miniWidget).toEqual([-15, 10, 30, 60]); // Smart selection
    });

    it('should handle backward-time-heavy configuration', () => {
      const backwardInput = "-8h,-4h,-1h,-30m,15m,1h";
      const parsed = parseQuickTimeButtons(backwardInput, mockCalendar);
      expect(parsed).toEqual([-480, -240, -60, -30, 15, 60]);
      
      const miniWidget = getQuickTimeButtons(parsed, true);
      expect(miniWidget).toEqual([-30, 15, 60]); // Largest negative + available positives
    });
  });

  describe('calendar-specific scenarios', () => {
    it('should work with custom calendar and complex input', () => {
      const customInput = "1h,1d,1w,-30m";
      const parsed = parseQuickTimeButtons(customInput, mockCalendarCustom);
      // 1h = 50m, 1d = 1000m (20*50), 1w = 6000m (6*20*50), -30m = -30m
      expect(parsed).toEqual([-30, 50, 1000, 6000]);
      
      const formatted = parsed.map(m => formatTimeButton(m, mockCalendarCustom));
      expect(formatted).toEqual(["-30m", "1h", "1d", "1w"]);
    });
  });

  describe('error recovery and edge cases', () => {
    it('should handle malformed input gracefully', () => {
      const malformedInput = "15,,30,invalid,abc123,60m,1h,";
      const parsed = parseQuickTimeButtons(malformedInput, mockCalendar);
      expect(parsed).toEqual([15, 30, 60, 60]); // Filters out invalid, keeps valid
    });

    it('should handle all invalid input', () => {
      const invalidInput = "invalid,abc,xyz,";
      const parsed = parseQuickTimeButtons(invalidInput, mockCalendar);
      expect(parsed).toEqual([]); // Empty result
      
      const miniWidget = getQuickTimeButtons(parsed, true);
      expect(miniWidget).toEqual([]); // Handles empty gracefully
    });

    it('should handle very large mixed configuration', () => {
      const largeInput = Array.from({length: 20}, (_, i) => `${(i - 10) * 15}`).join(',');
      const parsed = parseQuickTimeButtons(largeInput, mockCalendar);
      expect(parsed).toHaveLength(20); // All valid
      expect(parsed[0]).toBe(-150); // Largest negative (i=0: (0-10)*15 = -150)
      expect(parsed[19]).toBe(135); // Largest positive (i=19: (19-10)*15 = 135)
      
      const miniWidget = getQuickTimeButtons(parsed, true);
      expect(miniWidget).toHaveLength(4); // Limited to 4
      expect(miniWidget[0]).toBe(-15); // Largest negative
      expect(miniWidget.slice(1)).toEqual([15, 30, 45]); // 3 smallest positives
    });
  });
});