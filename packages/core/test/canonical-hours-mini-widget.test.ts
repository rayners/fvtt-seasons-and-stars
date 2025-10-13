/**
 * Canonical Hours Mini Widget Integration Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarMiniWidget } from '../src/ui/calendar-mini-widget';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Mock the game settings and UI environment
const mockSettings = new Map();
const mockGame = {
  settings: {
    get: vi.fn((module: string, setting: string) => {
      const key = `${module}.${setting}`;
      return mockSettings.get(key);
    }),
    set: vi.fn((module: string, setting: string, value: any) => {
      const key = `${module}.${setting}`;
      mockSettings.set(key, value);
    }),
  },
  user: {
    isGM: false,
  },
};

// Mock calendar with canonical hours
const mockCalendarWithCanonical: SeasonsStarsCalendar = {
  id: 'test-canonical',
  translations: { en: { label: 'Test Canonical Calendar' } },
  year: { epoch: 0, currentYear: 2024, prefix: '', suffix: '', startDay: 0 },
  leapYear: { rule: 'none' },
  months: [{ name: 'January', days: 31 }],
  weekdays: [{ name: 'Sunday' }],
  intercalary: [],
  time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
  canonicalHours: [
    { name: "Strange's Bells", startHour: 3, endHour: 6, startMinute: 0, endMinute: 0 },
    { name: "Dawn's Call", startHour: 9, endHour: 11, startMinute: 0, endMinute: 0 },
    {
      name: 'Very Long Canonical Hour Name',
      startHour: 12,
      endHour: 13,
      startMinute: 0,
      endMinute: 0,
    },
  ],
};

// Mock calendar without canonical hours
const mockCalendarWithoutCanonical: SeasonsStarsCalendar = {
  id: 'test-regular',
  translations: { en: { label: 'Test Regular Calendar' } },
  year: { epoch: 0, currentYear: 2024, prefix: '', suffix: '', startDay: 0 },
  leapYear: { rule: 'none' },
  months: [{ name: 'January', days: 31 }],
  weekdays: [{ name: 'Sunday' }],
  intercalary: [],
  time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
};

// Mock calendar with different time structure
const mockCalendarDifferentTime: SeasonsStarsCalendar = {
  id: 'test-different-time',
  translations: { en: { label: 'Test Different Time Calendar' } },
  year: { epoch: 0, currentYear: 2024, prefix: '', suffix: '', startDay: 0 },
  leapYear: { rule: 'none' },
  months: [{ name: 'January', days: 31 }],
  weekdays: [{ name: 'Sunday' }],
  intercalary: [],
  time: { hoursInDay: 20, minutesInHour: 50, secondsInMinute: 60 },
  canonicalHours: [{ name: 'Alien Hour', startHour: 5, endHour: 8, startMinute: 0, endMinute: 0 }],
};

describe('Canonical Hours Mini Widget Integration', () => {
  let widget: CalendarMiniWidget;

  beforeEach(() => {
    // Set up global mocks
    (global as any).game = mockGame;

    // Reset settings
    mockSettings.clear();
    mockSettings.set('seasons-and-stars.miniWidgetShowTime', true);
    mockSettings.set('seasons-and-stars.miniWidgetCanonicalMode', 'auto');

    // Create widget instance
    widget = new CalendarMiniWidget();
  });

  describe('getTimeDisplayString method', () => {
    it('should display canonical hour when time matches and mode is auto', () => {
      mockSettings.set('seasons-and-stars.miniWidgetCanonicalMode', 'auto');

      const time = { hour: 4, minute: 30, second: 0 };
      const result = (widget as any).getTimeDisplayString(time, mockCalendarWithCanonical);

      expect(result).toBe("Strange's Bells");
    });

    it('should display exact time when no canonical hour matches and mode is auto', () => {
      mockSettings.set('seasons-and-stars.miniWidgetCanonicalMode', 'auto');

      const time = { hour: 7, minute: 30, second: 0 };
      const result = (widget as any).getTimeDisplayString(time, mockCalendarWithCanonical);

      expect(result).toBe('07:30');
    });

    it('should always display exact time when mode is exact', () => {
      mockSettings.set('seasons-and-stars.miniWidgetCanonicalMode', 'exact');

      const time = { hour: 4, minute: 30, second: 0 };
      const result = (widget as any).getTimeDisplayString(time, mockCalendarWithCanonical);

      expect(result).toBe('04:30');
    });

    it('should hide time when mode is canonical but no canonical hour matches', () => {
      mockSettings.set('seasons-and-stars.miniWidgetCanonicalMode', 'canonical');

      const time = { hour: 7, minute: 30, second: 0 };
      const result = (widget as any).getTimeDisplayString(time, mockCalendarWithCanonical);

      expect(result).toBe('');
    });

    it('should display canonical hour when mode is canonical and hour matches', () => {
      mockSettings.set('seasons-and-stars.miniWidgetCanonicalMode', 'canonical');

      const time = { hour: 9, minute: 30, second: 0 };
      const result = (widget as any).getTimeDisplayString(time, mockCalendarWithCanonical);

      expect(result).toBe("Dawn's Call");
    });

    it('should truncate long canonical hour names for mini widget', () => {
      mockSettings.set('seasons-and-stars.miniWidgetCanonicalMode', 'auto');

      const time = { hour: 12, minute: 30, second: 0 };
      const result = (widget as any).getTimeDisplayString(time, mockCalendarWithCanonical);

      expect(result).toBe('Very Long Canon...');
    });

    it('should fallback to exact time when no calendar provided', () => {
      mockSettings.set('seasons-and-stars.miniWidgetCanonicalMode', 'auto');

      const time = { hour: 4, minute: 30, second: 0 };
      const result = (widget as any).getTimeDisplayString(time);

      expect(result).toBe('04:30');
    });

    it('should fallback to exact time when calendar has no canonical hours', () => {
      mockSettings.set('seasons-and-stars.miniWidgetCanonicalMode', 'auto');

      const time = { hour: 4, minute: 30, second: 0 };
      const result = (widget as any).getTimeDisplayString(time, mockCalendarWithoutCanonical);

      expect(result).toBe('04:30');
    });

    it('should work with different time structures', () => {
      mockSettings.set('seasons-and-stars.miniWidgetCanonicalMode', 'auto');

      // In a 50-minute hour system, time within canonical range
      const time = { hour: 6, minute: 25, second: 0 };
      const result = (widget as any).getTimeDisplayString(time, mockCalendarDifferentTime);

      expect(result).toBe('Alien Hour');
    });
  });

  describe('truncateCanonicalName method', () => {
    it('should not truncate short names', () => {
      const result = (widget as any).truncateCanonicalName('Prime');
      expect(result).toBe('Prime');
    });

    it('should not truncate names exactly at limit', () => {
      const result = (widget as any).truncateCanonicalName('Exactly 18 chars!!');
      expect(result).toBe('Exactly 18 chars!!');
    });

    it('should truncate long names with ellipsis', () => {
      const result = (widget as any).truncateCanonicalName(
        'This is a very long canonical hour name'
      );
      expect(result).toBe('This is a very ...');
    });
  });

  describe('formatExactTime method', () => {
    it('should format time with leading zeros', () => {
      const time = { hour: 4, minute: 5, second: 30 };
      const result = (widget as any).formatExactTime(time);
      expect(result).toBe('04:05');
    });

    it('should format time without leading zeros when not needed', () => {
      const time = { hour: 14, minute: 25, second: 30 };
      const result = (widget as any).formatExactTime(time);
      expect(result).toBe('14:25');
    });
  });

  describe('settings integration', () => {
    it('should use default setting value when setting not found', () => {
      mockSettings.delete('seasons-and-stars.miniWidgetCanonicalMode');

      const time = { hour: 4, minute: 30, second: 0 };
      const result = (widget as any).getTimeDisplayString(time, mockCalendarWithCanonical);

      // Should default to 'auto' mode and show canonical hour
      expect(result).toBe("Strange's Bells");
    });

    it('should respect different canonical mode settings', () => {
      const time = { hour: 4, minute: 30, second: 0 };

      // Test each mode
      const modes = ['auto', 'canonical', 'exact'];
      const expected = ["Strange's Bells", "Strange's Bells", '04:30'];

      modes.forEach((mode, index) => {
        mockSettings.set('seasons-and-stars.miniWidgetCanonicalMode', mode);
        const result = (widget as any).getTimeDisplayString(time, mockCalendarWithCanonical);
        expect(result).toBe(expected[index]);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle midnight wraparound canonical hours', () => {
      const calendarWithWraparound = {
        ...mockCalendarWithCanonical,
        canonicalHours: [
          { name: 'Night Watch', startHour: 23, endHour: 2, startMinute: 0, endMinute: 0 },
        ],
      };

      mockSettings.set('seasons-and-stars.miniWidgetCanonicalMode', 'auto');

      // Late night
      let time = { hour: 23, minute: 30, second: 0 };
      let result = (widget as any).getTimeDisplayString(time, calendarWithWraparound);
      expect(result).toBe('Night Watch');

      // Early morning
      time = { hour: 1, minute: 30, second: 0 };
      result = (widget as any).getTimeDisplayString(time, calendarWithWraparound);
      expect(result).toBe('Night Watch');
    });

    it('should handle empty canonical hours array', () => {
      const calendarWithEmptyCanonical = {
        ...mockCalendarWithCanonical,
        canonicalHours: [],
      };

      mockSettings.set('seasons-and-stars.miniWidgetCanonicalMode', 'auto');

      const time = { hour: 4, minute: 30, second: 0 };
      const result = (widget as any).getTimeDisplayString(time, calendarWithEmptyCanonical);

      expect(result).toBe('04:30');
    });
  });
});
