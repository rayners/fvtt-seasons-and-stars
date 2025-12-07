/**
 * CalendarEngine Week-of-Month Unit Tests
 *
 * Unit tests for CalendarEngine.getWeekOfMonth() and getWeekInfo() methods.
 * These tests focus on the methods in isolation with clear, simple test cases.
 *
 * Following TDD principles:
 * 1. Test each method independently with minimal setup
 * 2. Cover all code paths and edge cases
 * 3. Use descriptive test names that document behavior
 */

import { describe, test, expect } from 'vitest';
import { CalendarEngine } from '../../../src/core/calendar-engine';
import type { SeasonsStarsCalendar, CalendarWeek } from '../../../src/types/calendar';

// Minimal calendar with no weeks configuration
const baseCalendar: SeasonsStarsCalendar = {
  id: 'base-test',
  translations: { en: { label: 'Base Test' } },
  year: { epoch: 0, currentYear: 1, prefix: '', suffix: '', startDay: 0 },
  leapYear: { rule: 'none' },
  months: [{ name: 'Month1', days: 30 }],
  weekdays: [{ name: 'Day1' }, { name: 'Day2' }, { name: 'Day3' }],
  intercalary: [],
  time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
};

describe('CalendarEngine.getWeekOfMonth()', () => {
  describe('No weeks configuration', () => {
    test('returns null when calendar has no weeks field', () => {
      const engine = new CalendarEngine(baseCalendar);
      const result = engine.getWeekOfMonth({ year: 1, month: 1, day: 1, weekday: 0 });
      expect(result).toBeNull();
    });
  });

  describe('Year-based weeks', () => {
    test('returns null for year-based week configuration', () => {
      const calendar: SeasonsStarsCalendar = {
        ...baseCalendar,
        weeks: { type: 'year-based', daysPerWeek: 7 },
      };
      const engine = new CalendarEngine(calendar);
      const result = engine.getWeekOfMonth({ year: 1, month: 1, day: 1, weekday: 0 });
      expect(result).toBeNull();
    });
  });

  describe('Perfect alignment (no remainder)', () => {
    test('calculates week 1 for day 1 of month', () => {
      const calendar: SeasonsStarsCalendar = {
        ...baseCalendar,
        months: [{ name: 'Month1', days: 28 }],
        weekdays: Array(7)
          .fill(null)
          .map((_, i) => ({ name: `Day${i + 1}` })),
        weeks: { type: 'month-based', perMonth: 4, daysPerWeek: 7 },
      };
      const engine = new CalendarEngine(calendar);
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 1, weekday: 0 })).toBe(1);
    });

    test('calculates week 1 for last day of first week', () => {
      const calendar: SeasonsStarsCalendar = {
        ...baseCalendar,
        months: [{ name: 'Month1', days: 28 }],
        weekdays: Array(7)
          .fill(null)
          .map((_, i) => ({ name: `Day${i + 1}` })),
        weeks: { type: 'month-based', perMonth: 4, daysPerWeek: 7 },
      };
      const engine = new CalendarEngine(calendar);
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 7, weekday: 6 })).toBe(1);
    });

    test('calculates week 2 for day 8 of month', () => {
      const calendar: SeasonsStarsCalendar = {
        ...baseCalendar,
        months: [{ name: 'Month1', days: 28 }],
        weekdays: Array(7)
          .fill(null)
          .map((_, i) => ({ name: `Day${i + 1}` })),
        weeks: { type: 'month-based', perMonth: 4, daysPerWeek: 7 },
      };
      const engine = new CalendarEngine(calendar);
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 8, weekday: 0 })).toBe(2);
    });

    test('calculates week 4 for day 28 of month', () => {
      const calendar: SeasonsStarsCalendar = {
        ...baseCalendar,
        months: [{ name: 'Month1', days: 28 }],
        weekdays: Array(7)
          .fill(null)
          .map((_, i) => ({ name: `Day${i + 1}` })),
        weeks: { type: 'month-based', perMonth: 4, daysPerWeek: 7 },
      };
      const engine = new CalendarEngine(calendar);
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 28, weekday: 6 })).toBe(4);
    });

    test('handles 5-day weeks (Roshar style)', () => {
      const calendar: SeasonsStarsCalendar = {
        ...baseCalendar,
        months: [{ name: 'Month1', days: 50 }],
        weekdays: Array(5)
          .fill(null)
          .map((_, i) => ({ name: `Day${i + 1}` })),
        weeks: { type: 'month-based', perMonth: 10, daysPerWeek: 5 },
      };
      const engine = new CalendarEngine(calendar);
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 1, weekday: 0 })).toBe(1);
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 5, weekday: 4 })).toBe(1);
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 6, weekday: 0 })).toBe(2);
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 46, weekday: 0 })).toBe(10);
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 50, weekday: 4 })).toBe(10);
    });
  });

  describe('Remainder handling: partial-last', () => {
    test('creates partial 5th week for 37-day month with 9-day weeks', () => {
      const calendar: SeasonsStarsCalendar = {
        ...baseCalendar,
        months: [{ name: 'Month1', days: 37 }],
        weekdays: Array(9)
          .fill(null)
          .map((_, i) => ({ name: `Day${i + 1}` })),
        weeks: {
          type: 'month-based',
          perMonth: 4,
          daysPerWeek: 9,
          remainderHandling: 'partial-last',
        },
      };
      const engine = new CalendarEngine(calendar);
      // Weeks 1-4 are 9 days each (days 1-36)
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 1, weekday: 0 })).toBe(1);
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 9, weekday: 8 })).toBe(1);
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 36, weekday: 8 })).toBe(4);
      // Week 5 is partial (1 day only)
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 37, weekday: 0 })).toBe(5);
    });

    test('uses partial-last as default when remainderHandling not specified', () => {
      const calendar: SeasonsStarsCalendar = {
        ...baseCalendar,
        months: [{ name: 'Month1', days: 31 }],
        weekdays: Array(7)
          .fill(null)
          .map((_, i) => ({ name: `Day${i + 1}` })),
        weeks: { type: 'month-based', perMonth: 4, daysPerWeek: 7 },
      };
      const engine = new CalendarEngine(calendar);
      // 31 days ÷ 7 = 4 weeks + 3 days remainder
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 28, weekday: 6 })).toBe(4);
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 29, weekday: 0 })).toBe(5);
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 31, weekday: 2 })).toBe(5);
    });
  });

  describe('Remainder handling: extend-last', () => {
    test('extends last week to include remainder days', () => {
      const calendar: SeasonsStarsCalendar = {
        ...baseCalendar,
        months: [{ name: 'Month1', days: 37 }],
        weekdays: Array(9)
          .fill(null)
          .map((_, i) => ({ name: `Day${i + 1}` })),
        weeks: {
          type: 'month-based',
          perMonth: 4,
          daysPerWeek: 9,
          remainderHandling: 'extend-last',
        },
      };
      const engine = new CalendarEngine(calendar);
      // Weeks 1-3 are 9 days each
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 1, weekday: 0 })).toBe(1);
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 27, weekday: 8 })).toBe(3);
      // Week 4 is extended (days 28-37 = 10 days)
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 28, weekday: 0 })).toBe(4);
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 37, weekday: 0 })).toBe(4);
    });

    test('handles multiple remainder days', () => {
      const calendar: SeasonsStarsCalendar = {
        ...baseCalendar,
        months: [{ name: 'Month1', days: 31 }],
        weekdays: Array(7)
          .fill(null)
          .map((_, i) => ({ name: `Day${i + 1}` })),
        weeks: {
          type: 'month-based',
          perMonth: 4,
          daysPerWeek: 7,
          remainderHandling: 'extend-last',
        },
      };
      const engine = new CalendarEngine(calendar);
      // 31 days ÷ 7 = 4 weeks + 3 remainder days
      // Week 4 becomes 10 days (days 22-31)
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 28, weekday: 6 })).toBe(4);
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 29, weekday: 0 })).toBe(4);
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 31, weekday: 2 })).toBe(4);
    });
  });

  describe('Remainder handling: none', () => {
    test('returns null for remainder days', () => {
      const calendar: SeasonsStarsCalendar = {
        ...baseCalendar,
        months: [{ name: 'Month1', days: 37 }],
        weekdays: Array(9)
          .fill(null)
          .map((_, i) => ({ name: `Day${i + 1}` })),
        weeks: {
          type: 'month-based',
          perMonth: 4,
          daysPerWeek: 9,
          remainderHandling: 'none',
        },
      };
      const engine = new CalendarEngine(calendar);
      // Normal weeks work
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 1, weekday: 0 })).toBe(1);
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 36, weekday: 8 })).toBe(4);
      // Remainder day returns null
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 37, weekday: 0 })).toBeNull();
    });

    test('returns null for all remainder days', () => {
      const calendar: SeasonsStarsCalendar = {
        ...baseCalendar,
        months: [{ name: 'Month1', days: 31 }],
        weekdays: Array(7)
          .fill(null)
          .map((_, i) => ({ name: `Day${i + 1}` })),
        weeks: {
          type: 'month-based',
          perMonth: 4,
          daysPerWeek: 7,
          remainderHandling: 'none',
        },
      };
      const engine = new CalendarEngine(calendar);
      // 31 days ÷ 7 = 4 weeks + 3 remainder days
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 28, weekday: 6 })).toBe(4);
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 29, weekday: 0 })).toBeNull();
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 30, weekday: 1 })).toBeNull();
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 31, weekday: 2 })).toBeNull();
    });
  });

  describe('daysPerWeek defaults to weekdays.length', () => {
    test('uses weekdays.length when daysPerWeek not specified', () => {
      const calendar: SeasonsStarsCalendar = {
        ...baseCalendar,
        months: [{ name: 'Month1', days: 21 }],
        weekdays: Array(7)
          .fill(null)
          .map((_, i) => ({ name: `Day${i + 1}` })),
        weeks: { type: 'month-based', perMonth: 3 }, // daysPerWeek omitted
      };
      const engine = new CalendarEngine(calendar);
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 1, weekday: 0 })).toBe(1);
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 7, weekday: 6 })).toBe(1);
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 8, weekday: 0 })).toBe(2);
      expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 21, weekday: 6 })).toBe(3);
    });
  });
});

describe('CalendarEngine.getWeekInfo()', () => {
  describe('No weeks configuration', () => {
    test('returns null when calendar has no weeks field', () => {
      const engine = new CalendarEngine(baseCalendar);
      const result = engine.getWeekInfo({ year: 1, month: 1, day: 1, weekday: 0 });
      expect(result).toBeNull();
    });
  });

  describe('Named weeks', () => {
    test('returns week info for named weeks', () => {
      const weekNames: CalendarWeek[] = [
        { name: 'Alpha Week', abbreviation: 'A' },
        { name: 'Beta Week', abbreviation: 'B' },
        { name: 'Gamma Week', abbreviation: 'G' },
      ];
      const calendar: SeasonsStarsCalendar = {
        ...baseCalendar,
        months: [{ name: 'Month1', days: 21 }],
        weekdays: Array(7)
          .fill(null)
          .map((_, i) => ({ name: `Day${i + 1}` })),
        weeks: {
          type: 'month-based',
          perMonth: 3,
          daysPerWeek: 7,
          names: weekNames,
        },
      };
      const engine = new CalendarEngine(calendar);
      expect(engine.getWeekInfo({ year: 1, month: 1, day: 1, weekday: 0 })).toEqual({
        name: 'Alpha Week',
        abbreviation: 'A',
      });
      expect(engine.getWeekInfo({ year: 1, month: 1, day: 8, weekday: 0 })).toEqual({
        name: 'Beta Week',
        abbreviation: 'B',
      });
      expect(engine.getWeekInfo({ year: 1, month: 1, day: 15, weekday: 0 })).toEqual({
        name: 'Gamma Week',
        abbreviation: 'G',
      });
    });

    test('returns week info with all fields (name, abbr, prefix, suffix, description)', () => {
      const weekNames: CalendarWeek[] = [
        {
          name: 'First Week',
          abbreviation: '1st',
          prefix: 'F',
          suffix: 'irst',
          description: 'The first week',
        },
      ];
      const calendar: SeasonsStarsCalendar = {
        ...baseCalendar,
        months: [{ name: 'Month1', days: 7 }],
        weekdays: Array(7)
          .fill(null)
          .map((_, i) => ({ name: `Day${i + 1}` })),
        weeks: {
          type: 'month-based',
          perMonth: 1,
          daysPerWeek: 7,
          names: weekNames,
        },
      };
      const engine = new CalendarEngine(calendar);
      const result = engine.getWeekInfo({ year: 1, month: 1, day: 1, weekday: 0 });
      expect(result).toEqual({
        name: 'First Week',
        abbreviation: '1st',
        prefix: 'F',
        suffix: 'irst',
        description: 'The first week',
      });
    });
  });

  describe('Auto-generated week names: ordinal', () => {
    test('generates ordinal week names (1st, 2nd, 3rd, 4th)', () => {
      const calendar: SeasonsStarsCalendar = {
        ...baseCalendar,
        months: [{ name: 'Month1', days: 28 }],
        weekdays: Array(7)
          .fill(null)
          .map((_, i) => ({ name: `Day${i + 1}` })),
        weeks: {
          type: 'month-based',
          perMonth: 4,
          daysPerWeek: 7,
          namingPattern: 'ordinal',
        },
      };
      const engine = new CalendarEngine(calendar);
      expect(engine.getWeekInfo({ year: 1, month: 1, day: 1, weekday: 0 })).toEqual({
        name: '1st Week',
        abbreviation: '1',
      });
      expect(engine.getWeekInfo({ year: 1, month: 1, day: 8, weekday: 0 })).toEqual({
        name: '2nd Week',
        abbreviation: '2',
      });
      expect(engine.getWeekInfo({ year: 1, month: 1, day: 15, weekday: 0 })).toEqual({
        name: '3rd Week',
        abbreviation: '3',
      });
      expect(engine.getWeekInfo({ year: 1, month: 1, day: 22, weekday: 0 })).toEqual({
        name: '4th Week',
        abbreviation: '4',
      });
    });

    test('handles higher ordinals correctly (11th, 12th, 13th, 21st)', () => {
      const calendar: SeasonsStarsCalendar = {
        ...baseCalendar,
        months: [{ name: 'Month1', days: 150 }],
        weekdays: Array(7)
          .fill(null)
          .map((_, i) => ({ name: `Day${i + 1}` })),
        weeks: {
          type: 'month-based',
          perMonth: 21,
          daysPerWeek: 7,
          namingPattern: 'ordinal',
        },
      };
      const engine = new CalendarEngine(calendar);
      expect(engine.getWeekInfo({ year: 1, month: 1, day: 71, weekday: 0 })?.name).toBe(
        '11th Week'
      );
      expect(engine.getWeekInfo({ year: 1, month: 1, day: 78, weekday: 0 })?.name).toBe(
        '12th Week'
      );
      expect(engine.getWeekInfo({ year: 1, month: 1, day: 85, weekday: 0 })?.name).toBe(
        '13th Week'
      );
      expect(engine.getWeekInfo({ year: 1, month: 1, day: 141, weekday: 0 })?.name).toBe(
        '21st Week'
      );
    });
  });

  describe('Auto-generated week names: numeric', () => {
    test('generates numeric week names (Week 1, Week 2)', () => {
      const calendar: SeasonsStarsCalendar = {
        ...baseCalendar,
        months: [{ name: 'Month1', days: 28 }],
        weekdays: Array(7)
          .fill(null)
          .map((_, i) => ({ name: `Day${i + 1}` })),
        weeks: {
          type: 'month-based',
          perMonth: 4,
          daysPerWeek: 7,
          namingPattern: 'numeric',
        },
      };
      const engine = new CalendarEngine(calendar);
      expect(engine.getWeekInfo({ year: 1, month: 1, day: 1, weekday: 0 })).toEqual({
        name: 'Week 1',
        abbreviation: '1',
      });
      expect(engine.getWeekInfo({ year: 1, month: 1, day: 8, weekday: 0 })).toEqual({
        name: 'Week 2',
        abbreviation: '2',
      });
    });

    test('uses numeric as default when namingPattern not specified', () => {
      const calendar: SeasonsStarsCalendar = {
        ...baseCalendar,
        months: [{ name: 'Month1', days: 14 }],
        weekdays: Array(7)
          .fill(null)
          .map((_, i) => ({ name: `Day${i + 1}` })),
        weeks: {
          type: 'month-based',
          perMonth: 2,
          daysPerWeek: 7,
          // namingPattern omitted
        },
      };
      const engine = new CalendarEngine(calendar);
      expect(engine.getWeekInfo({ year: 1, month: 1, day: 1, weekday: 0 })?.name).toBe('Week 1');
    });
  });

  describe('Auto-generated week names: none', () => {
    test('returns null when namingPattern is "none"', () => {
      const calendar: SeasonsStarsCalendar = {
        ...baseCalendar,
        months: [{ name: 'Month1', days: 28 }],
        weekdays: Array(7)
          .fill(null)
          .map((_, i) => ({ name: `Day${i + 1}` })),
        weeks: {
          type: 'month-based',
          perMonth: 4,
          daysPerWeek: 7,
          namingPattern: 'none',
        },
      };
      const engine = new CalendarEngine(calendar);
      expect(engine.getWeekInfo({ year: 1, month: 1, day: 1, weekday: 0 })).toBeNull();
    });
  });

  describe('Remainder days', () => {
    test('returns null for remainder days when handling is "none"', () => {
      const calendar: SeasonsStarsCalendar = {
        ...baseCalendar,
        months: [{ name: 'Month1', days: 37 }],
        weekdays: Array(9)
          .fill(null)
          .map((_, i) => ({ name: `Day${i + 1}` })),
        weeks: {
          type: 'month-based',
          perMonth: 4,
          daysPerWeek: 9,
          remainderHandling: 'none',
          namingPattern: 'ordinal',
        },
      };
      const engine = new CalendarEngine(calendar);
      expect(engine.getWeekInfo({ year: 1, month: 1, day: 36, weekday: 8 })).toEqual({
        name: '4th Week',
        abbreviation: '4',
      });
      expect(engine.getWeekInfo({ year: 1, month: 1, day: 37, weekday: 0 })).toBeNull();
    });

    test('returns week info for remainder days when handling is "extend-last"', () => {
      const weekNames: CalendarWeek[] = [
        { name: 'Week One', abbreviation: 'W1' },
        { name: 'Week Two', abbreviation: 'W2' },
        { name: 'Week Three', abbreviation: 'W3' },
        { name: 'Week Four', abbreviation: 'W4' },
      ];
      const calendar: SeasonsStarsCalendar = {
        ...baseCalendar,
        months: [{ name: 'Month1', days: 37 }],
        weekdays: Array(9)
          .fill(null)
          .map((_, i) => ({ name: `Day${i + 1}` })),
        weeks: {
          type: 'month-based',
          perMonth: 4,
          daysPerWeek: 9,
          remainderHandling: 'extend-last',
          names: weekNames,
        },
      };
      const engine = new CalendarEngine(calendar);
      // Remainder day (37) should return last week's info
      expect(engine.getWeekInfo({ year: 1, month: 1, day: 37, weekday: 0 })).toEqual({
        name: 'Week Four',
        abbreviation: 'W4',
      });
    });
  });

  describe('Named weeks take precedence over auto-generation', () => {
    test('uses named weeks even when namingPattern is set', () => {
      const weekNames: CalendarWeek[] = [{ name: 'Custom Week', abbreviation: 'CW' }];
      const calendar: SeasonsStarsCalendar = {
        ...baseCalendar,
        months: [{ name: 'Month1', days: 7 }],
        weekdays: Array(7)
          .fill(null)
          .map((_, i) => ({ name: `Day${i + 1}` })),
        weeks: {
          type: 'month-based',
          perMonth: 1,
          daysPerWeek: 7,
          names: weekNames,
          namingPattern: 'ordinal', // Should be ignored
        },
      };
      const engine = new CalendarEngine(calendar);
      expect(engine.getWeekInfo({ year: 1, month: 1, day: 1, weekday: 0 })).toEqual({
        name: 'Custom Week',
        abbreviation: 'CW',
      });
    });
  });
});

describe('CalendarEngine.getOrdinalName() (private method behavior)', () => {
  test('ordinal suffixes work correctly through getWeekInfo', () => {
    const calendar: SeasonsStarsCalendar = {
      ...baseCalendar,
      months: [{ name: 'Month1', days: 280 }],
      weekdays: Array(7)
        .fill(null)
        .map((_, i) => ({ name: `Day${i + 1}` })),
      weeks: {
        type: 'month-based',
        perMonth: 40,
        daysPerWeek: 7,
        namingPattern: 'ordinal',
      },
    };
    const engine = new CalendarEngine(calendar);

    // Test various ordinal patterns
    expect(engine.getWeekInfo({ year: 1, month: 1, day: 1, weekday: 0 })?.name).toBe('1st Week');
    expect(engine.getWeekInfo({ year: 1, month: 1, day: 8, weekday: 0 })?.name).toBe('2nd Week');
    expect(engine.getWeekInfo({ year: 1, month: 1, day: 15, weekday: 0 })?.name).toBe('3rd Week');
    expect(engine.getWeekInfo({ year: 1, month: 1, day: 22, weekday: 0 })?.name).toBe('4th Week');
    expect(engine.getWeekInfo({ year: 1, month: 1, day: 29, weekday: 0 })?.name).toBe('5th Week');
    // Special cases: 11th, 12th, 13th (not 11st, 12nd, 13rd)
    expect(engine.getWeekInfo({ year: 1, month: 1, day: 71, weekday: 0 })?.name).toBe('11th Week');
    expect(engine.getWeekInfo({ year: 1, month: 1, day: 78, weekday: 0 })?.name).toBe('12th Week');
    expect(engine.getWeekInfo({ year: 1, month: 1, day: 85, weekday: 0 })?.name).toBe('13th Week');
    // Back to normal pattern
    expect(engine.getWeekInfo({ year: 1, month: 1, day: 141, weekday: 0 })?.name).toBe('21st Week');
    expect(engine.getWeekInfo({ year: 1, month: 1, day: 148, weekday: 0 })?.name).toBe('22nd Week');
    expect(engine.getWeekInfo({ year: 1, month: 1, day: 155, weekday: 0 })?.name).toBe('23rd Week');
  });
});
