/**
 * Tests for Star Trek calendar helper functionality
 * Focuses on testing the actual helper functions rather than full template rendering
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Handlebars from 'handlebars';
import { DateFormatter } from '../src/core/date-formatter';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Use REAL Handlebars for Star Trek helper testing
global.Handlebars = Handlebars;

describe('Star Trek Helpers Functionality', () => {
  let formatter: DateFormatter;
  let mockCalendar: SeasonsStarsCalendar;

  beforeEach(() => {
    // Reset helper registration
    DateFormatter.resetHelpersForTesting();

    // Mock calendar
    mockCalendar = {
      id: 'test-calendar',
      months: [
        { name: 'January', abbreviation: 'Jan', days: 31 },
        { name: 'February', abbreviation: 'Feb', days: 28 },
      ],
      weekdays: [
        { name: 'Sunday', abbreviation: 'Sun' },
        { name: 'Monday', abbreviation: 'Mon' },
      ],
      year: { prefix: '', suffix: '' },
      time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
    } as SeasonsStarsCalendar;

    // Create formatter to register helpers with real Handlebars
    formatter = new DateFormatter(mockCalendar);
  });

  // Helper function to get registered helper from Handlebars
  function getHelper(name: string): Function {
    return (Handlebars as any).helpers[name];
  }

  describe('Stardate Helper', () => {
    it('should calculate TNG era stardate correctly', () => {
      const stardateHelper = getHelper('ss-stardate');
      expect(stardateHelper).toBeDefined();

      // Test TNG era: year 2370, day 15 of year, prefix 47
      const result = stardateHelper(2370, {
        hash: {
          prefix: '47',
          baseYear: 2370,
          dayOfYear: 15,
          precision: 1,
        },
      });

      // Should be 47015.0 (prefix + year offset + padded day)
      expect(result).toBe('47015.0');
    });

    it('should calculate DS9 era stardate correctly', () => {
      const stardateHelper = getHelper('ss-stardate');

      // Test DS9 era: year 2375, day 161 of year, prefix 52
      const result = stardateHelper(2375, {
        hash: {
          prefix: '52',
          baseYear: 2375,
          dayOfYear: 161,
          precision: 1,
        },
      });

      // Should be 52161.0
      expect(result).toBe('52161.0');
    });

    it('should calculate Enterprise era stardate with higher precision', () => {
      const stardateHelper = getHelper('ss-stardate');

      // Test Enterprise era: year 2151, day 95 of year, prefix 0, precision 2
      const result = stardateHelper(2151, {
        hash: {
          prefix: '0',
          baseYear: 2151,
          dayOfYear: 95,
          precision: 2,
        },
      });

      // Should be 0095.00 (with 2 decimal places)
      expect(result).toBe('0095.00');
    });

    it('should handle year offsets correctly', () => {
      const stardateHelper = getHelper('ss-stardate');

      // Test year offset: year 2371 (one year after base 2370)
      const result = stardateHelper(2371, {
        hash: {
          prefix: '47',
          baseYear: 2370,
          dayOfYear: 50,
          precision: 1,
        },
      });

      // Should be 48050.0 (47 + 1 year offset = 48)
      expect(result).toBe('48050.0');
    });
  });

  describe('Time Helpers', () => {
    it('should format hour with padding', () => {
      const hourHelper = getHelper('ss-hour');
      expect(hourHelper).toBeDefined();

      // Test single digit with padding
      const result1 = hourHelper(5, { hash: { format: 'pad' } });
      expect(result1).toBe('05');

      // Test double digit (no change needed)
      const result2 = hourHelper(14, { hash: { format: 'pad' } });
      expect(result2).toBe('14');

      // Test without padding
      const result3 = hourHelper(5, { hash: {} });
      expect(result3).toBe('5');
    });

    it('should format minute with padding', () => {
      const minuteHelper = getHelper('ss-minute');
      expect(minuteHelper).toBeDefined();

      // Test single digit with padding
      const result1 = minuteHelper(3, { hash: { format: 'pad' } });
      expect(result1).toBe('03');

      // Test double digit
      const result2 = minuteHelper(30, { hash: { format: 'pad' } });
      expect(result2).toBe('30');
    });

    it('should format second with padding', () => {
      const secondHelper = getHelper('ss-second');
      expect(secondHelper).toBeDefined();

      // Test single digit with padding
      const result1 = secondHelper(7, { hash: { format: 'pad' } });
      expect(result1).toBe('07');

      // Test double digit
      const result2 = secondHelper(45, { hash: { format: 'pad' } });
      expect(result2).toBe('45');
    });

    it('should handle undefined/null values gracefully', () => {
      const hourHelper = getHelper('ss-hour');

      // Test undefined - when passed undefined with pad format, should apply padding to default 0
      const result1 = hourHelper(undefined, { hash: { format: 'pad' } });
      expect(result1).toBe('00');

      // Test null - when passed null with pad format, should apply padding to default 0
      const result2 = hourHelper(null, { hash: { format: 'pad' } });
      expect(result2).toBe('00');
    });

    it('should use context when no explicit value provided', () => {
      const hourHelper = getHelper('ss-hour');

      // Simulate context data available via options.data.root
      const result = hourHelper(undefined, {
        hash: { format: 'pad' },
        data: { root: { hour: 9 } },
      });

      expect(result).toBe('09');
    });
  });

  describe('Math Helper', () => {
    it('should perform addition correctly', () => {
      const mathHelper = getHelper('ss-math');
      expect(mathHelper).toBeDefined();

      const result = mathHelper(2024, {
        hash: { op: 'add', value: 100 },
      });

      expect(result).toBe(2124);
    });

    it('should perform subtraction correctly', () => {
      const mathHelper = getHelper('ss-math');

      // Test TOS stardate calculation (year - 1300)
      const result = mathHelper(2268, {
        hash: { op: 'subtract', value: 1300 },
      });

      expect(result).toBe(968);
    });

    it('should perform multiplication correctly', () => {
      const mathHelper = getHelper('ss-math');

      const result = mathHelper(15, {
        hash: { op: 'multiply', value: 10 },
      });

      expect(result).toBe(150);
    });

    it('should perform division correctly', () => {
      const mathHelper = getHelper('ss-math');

      const result = mathHelper(100, {
        hash: { op: 'divide', value: 4 },
      });

      expect(result).toBe(25);
    });

    it('should handle division by zero safely', () => {
      const mathHelper = getHelper('ss-math');

      const result = mathHelper(100, {
        hash: { op: 'divide', value: 0 },
      });

      // Should return original value when dividing by zero
      expect(result).toBe(100);
    });

    it('should handle invalid operations gracefully', () => {
      const mathHelper = getHelper('ss-math');

      const result = mathHelper(50, {
        hash: { op: 'invalid-operation', value: 10 },
      });

      // Should return original value for unknown operations
      expect(result).toBe(50);
    });
  });

  describe('Month and Day Helpers', () => {
    it('should format month abbreviations correctly', () => {
      const monthHelper = getHelper('ss-month');
      expect(monthHelper).toBeDefined();

      // Test month 1 (January)
      const result1 = monthHelper(1, { hash: { format: 'abbr' } });
      expect(result1).toBe('Jan');

      // Test month 2 (February)
      const result2 = monthHelper(2, { hash: { format: 'abbr' } });
      expect(result2).toBe('Feb');
    });

    it('should format month names correctly', () => {
      const monthHelper = getHelper('ss-month');

      // Test month 1 (January)
      const result1 = monthHelper(1, { hash: { format: 'name' } });
      expect(result1).toBe('January');

      // Test month 2 (February)
      const result2 = monthHelper(2, { hash: { format: 'name' } });
      expect(result2).toBe('February');
    });

    it('should format day ordinals correctly', () => {
      const dayHelper = getHelper('ss-day');
      expect(dayHelper).toBeDefined();

      // Test various ordinal suffixes
      expect(dayHelper(1, { hash: { format: 'ordinal' } })).toBe('1st');
      expect(dayHelper(2, { hash: { format: 'ordinal' } })).toBe('2nd');
      expect(dayHelper(3, { hash: { format: 'ordinal' } })).toBe('3rd');
      expect(dayHelper(4, { hash: { format: 'ordinal' } })).toBe('4th');
      expect(dayHelper(11, { hash: { format: 'ordinal' } })).toBe('11th');
      expect(dayHelper(21, { hash: { format: 'ordinal' } })).toBe('21st');
      expect(dayHelper(22, { hash: { format: 'ordinal' } })).toBe('22nd');
      expect(dayHelper(23, { hash: { format: 'ordinal' } })).toBe('23rd');
    });

    it('should format weekday names correctly', () => {
      const weekdayHelper = getHelper('ss-weekday');
      expect(weekdayHelper).toBeDefined();

      // Test weekday 0 (Sunday)
      const result1 = weekdayHelper(0, { hash: { format: 'name' } });
      expect(result1).toBe('Sunday');

      // Test weekday 1 (Monday)
      const result2 = weekdayHelper(1, { hash: { format: 'name' } });
      expect(result2).toBe('Monday');
    });
  });

  describe('Helper Registration', () => {
    it('should register all required helpers', () => {
      const expectedHelpers = [
        'ss-day',
        'ss-month',
        'ss-weekday',
        'ss-dateFmt',
        'ss-math',
        'ss-hour',
        'ss-minute',
        'ss-second',
        'ss-stardate',
      ];

      for (const helperName of expectedHelpers) {
        const helper = getHelper(helperName);
        expect(helper).toBeDefined();
        expect(typeof helper).toBe('function');
      }
    });

    it('should only register helpers once', () => {
      const initialHelpers = Object.keys((Handlebars as any).helpers).filter(name =>
        name.startsWith('ss-')
      );
      const initialHelperCount = initialHelpers.length;

      // Create another formatter (should not re-register)
      new DateFormatter(mockCalendar);

      const afterHelpers = Object.keys((Handlebars as any).helpers).filter(name =>
        name.startsWith('ss-')
      );
      const afterHelperCount = afterHelpers.length;
      expect(afterHelperCount).toBe(initialHelperCount);
    });
  });
});
