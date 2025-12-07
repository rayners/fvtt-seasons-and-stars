/**
 * Tests for CalendarEngine week-of-month functionality
 *
 * Tests the new week naming feature including:
 * - Week-of-month calculations
 * - Named weeks
 * - Remainder day handling strategies
 * - Roshar and Coriolis calendar use cases
 */

import { describe, it, expect } from 'vitest';
import { CalendarEngine } from '../../../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';

describe('CalendarEngine - Week of Month', () => {
  describe('getWeekOfMonth()', () => {
    describe('Perfect alignment (no remainder)', () => {
      it('should calculate week-of-month for Roshar (10 weeks × 5 days = 50 days)', () => {
        const rosharCalendar: SeasonsStarsCalendar = {
          id: 'test-roshar',
          translations: {
            en: { label: 'Test Roshar', description: 'Roshar test calendar' },
          },
          year: { epoch: 0, currentYear: 1173, prefix: '', suffix: '', startDay: 0 },
          leapYear: { rule: 'none' },
          months: [
            { name: 'Jesnan', days: 50 },
            { name: 'Nanan', days: 50 },
          ],
          weekdays: [
            { name: 'Jesdes' },
            { name: 'Nandes' },
            { name: 'Chachdes' },
            { name: 'Vevdes' },
            { name: 'Palaides' },
          ],
          intercalary: [],
          time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
          weeks: {
            type: 'month-based',
            perMonth: 10,
            daysPerWeek: 5,
          },
        };

        const engine = new CalendarEngine(rosharCalendar);

        // First week (days 1-5)
        expect(engine.getWeekOfMonth({ year: 1173, month: 1, day: 1, weekday: 0 })).toBe(1);
        expect(engine.getWeekOfMonth({ year: 1173, month: 1, day: 5, weekday: 4 })).toBe(1);

        // Second week (days 6-10)
        expect(engine.getWeekOfMonth({ year: 1173, month: 1, day: 6, weekday: 0 })).toBe(2);
        expect(engine.getWeekOfMonth({ year: 1173, month: 1, day: 10, weekday: 4 })).toBe(2);

        // Fifth week (days 21-25)
        expect(engine.getWeekOfMonth({ year: 1173, month: 1, day: 25, weekday: 4 })).toBe(5);

        // Tenth week (days 46-50)
        expect(engine.getWeekOfMonth({ year: 1173, month: 1, day: 46, weekday: 0 })).toBe(10);
        expect(engine.getWeekOfMonth({ year: 1173, month: 1, day: 50, weekday: 4 })).toBe(10);

        // Different month, same pattern
        expect(engine.getWeekOfMonth({ year: 1173, month: 2, day: 1, weekday: 0 })).toBe(1);
        expect(engine.getWeekOfMonth({ year: 1173, month: 2, day: 50, weekday: 4 })).toBe(10);
      });

      it('should calculate week-of-month for standard 4-week months (28 days)', () => {
        const calendar: SeasonsStarsCalendar = {
          id: 'test-28day',
          translations: {
            en: { label: 'Test 28-day', description: 'Perfect 4-week months' },
          },
          year: { epoch: 0, currentYear: 1, prefix: '', suffix: '', startDay: 0 },
          leapYear: { rule: 'none' },
          months: [
            { name: 'Month1', days: 28 },
            { name: 'Month2', days: 28 },
          ],
          weekdays: [
            { name: 'Day1' },
            { name: 'Day2' },
            { name: 'Day3' },
            { name: 'Day4' },
            { name: 'Day5' },
            { name: 'Day6' },
            { name: 'Day7' },
          ],
          intercalary: [],
          time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
          weeks: {
            type: 'month-based',
            perMonth: 4,
            daysPerWeek: 7,
          },
        };

        const engine = new CalendarEngine(calendar);

        expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 1, weekday: 0 })).toBe(1);
        expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 7, weekday: 6 })).toBe(1);
        expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 8, weekday: 0 })).toBe(2);
        expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 14, weekday: 6 })).toBe(2);
        expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 21, weekday: 6 })).toBe(3);
        expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 28, weekday: 6 })).toBe(4);
      });
    });

    describe('Remainder handling: extend-last', () => {
      it('should extend last week for Coriolis (4 weeks × 9 days + 1 remainder = 37 days)', () => {
        const coriolisCalendar: SeasonsStarsCalendar = {
          id: 'test-coriolis',
          translations: {
            en: { label: 'Test Coriolis', description: 'Coriolis test calendar' },
          },
          year: { epoch: 0, currentYear: 465, prefix: 'CC ', suffix: '', startDay: 0 },
          leapYear: { rule: 'none' },
          months: [
            { name: 'First Segment', days: 37 },
            { name: 'Second Segment', days: 37 },
          ],
          weekdays: [
            { name: 'First Day' },
            { name: 'Second Day' },
            { name: 'Third Day' },
            { name: 'Fourth Day' },
            { name: 'Fifth Day' },
            { name: 'Sixth Day' },
            { name: 'Seventh Day' },
            { name: 'Eighth Day' },
            { name: 'Ninth Day' },
          ],
          intercalary: [],
          time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
          weeks: {
            type: 'month-based',
            perMonth: 4,
            daysPerWeek: 9,
            remainderHandling: 'extend-last',
          },
        };

        const engine = new CalendarEngine(coriolisCalendar);

        // First week (days 1-9)
        expect(engine.getWeekOfMonth({ year: 465, month: 1, day: 1, weekday: 0 })).toBe(1);
        expect(engine.getWeekOfMonth({ year: 465, month: 1, day: 9, weekday: 8 })).toBe(1);

        // Second week (days 10-18)
        expect(engine.getWeekOfMonth({ year: 465, month: 1, day: 10, weekday: 0 })).toBe(2);
        expect(engine.getWeekOfMonth({ year: 465, month: 1, day: 18, weekday: 8 })).toBe(2);

        // Third week (days 19-27)
        expect(engine.getWeekOfMonth({ year: 465, month: 1, day: 19, weekday: 0 })).toBe(3);
        expect(engine.getWeekOfMonth({ year: 465, month: 1, day: 27, weekday: 8 })).toBe(3);

        // Fourth week (days 28-37) - EXTENDED to include remainder day
        expect(engine.getWeekOfMonth({ year: 465, month: 1, day: 28, weekday: 0 })).toBe(4);
        expect(engine.getWeekOfMonth({ year: 465, month: 1, day: 36, weekday: 8 })).toBe(4);
        expect(engine.getWeekOfMonth({ year: 465, month: 1, day: 37, weekday: 0 })).toBe(4); // Remainder day
      });
    });

    describe('Remainder handling: partial-last', () => {
      it('should create partial last week for months with remainders', () => {
        const calendar: SeasonsStarsCalendar = {
          id: 'test-partial',
          translations: {
            en: { label: 'Test Partial', description: 'Partial week test' },
          },
          year: { epoch: 0, currentYear: 1, prefix: '', suffix: '', startDay: 0 },
          leapYear: { rule: 'none' },
          months: [
            { name: 'Month1', days: 37 }, // 37 ÷ 9 = 4 weeks + 1 day
          ],
          weekdays: [
            { name: 'Day1' },
            { name: 'Day2' },
            { name: 'Day3' },
            { name: 'Day4' },
            { name: 'Day5' },
            { name: 'Day6' },
            { name: 'Day7' },
            { name: 'Day8' },
            { name: 'Day9' },
          ],
          intercalary: [],
          time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
          weeks: {
            type: 'month-based',
            perMonth: 4,
            daysPerWeek: 9,
            remainderHandling: 'partial-last',
          },
        };

        const engine = new CalendarEngine(calendar);

        // First four weeks are normal (9 days each)
        expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 1, weekday: 0 })).toBe(1);
        expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 9, weekday: 8 })).toBe(1);
        expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 27, weekday: 8 })).toBe(3);
        expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 36, weekday: 8 })).toBe(4);

        // Fifth week is partial (1 day only)
        expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 37, weekday: 0 })).toBe(5);
      });
    });

    describe('Remainder handling: none', () => {
      it('should return null for remainder days when handling is "none"', () => {
        const calendar: SeasonsStarsCalendar = {
          id: 'test-none',
          translations: {
            en: { label: 'Test None', description: 'No remainder handling' },
          },
          year: { epoch: 0, currentYear: 1, prefix: '', suffix: '', startDay: 0 },
          leapYear: { rule: 'none' },
          months: [{ name: 'Month1', days: 37 }],
          weekdays: [
            { name: 'Day1' },
            { name: 'Day2' },
            { name: 'Day3' },
            { name: 'Day4' },
            { name: 'Day5' },
            { name: 'Day6' },
            { name: 'Day7' },
            { name: 'Day8' },
            { name: 'Day9' },
          ],
          intercalary: [],
          time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
          weeks: {
            type: 'month-based',
            perMonth: 4,
            daysPerWeek: 9,
            remainderHandling: 'none',
          },
        };

        const engine = new CalendarEngine(calendar);

        // Normal weeks work fine
        expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 1, weekday: 0 })).toBe(1);
        expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 36, weekday: 8 })).toBe(4);

        // Remainder day returns null
        expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 37, weekday: 0 })).toBeNull();
      });
    });

    describe('No weeks configuration', () => {
      it('should return null when calendar has no weeks configuration', () => {
        const calendar: SeasonsStarsCalendar = {
          id: 'test-no-weeks',
          translations: {
            en: { label: 'Test No Weeks', description: 'No weeks config' },
          },
          year: { epoch: 0, currentYear: 1, prefix: '', suffix: '', startDay: 0 },
          leapYear: { rule: 'none' },
          months: [{ name: 'Month1', days: 30 }],
          weekdays: [{ name: 'Day1' }, { name: 'Day2' }, { name: 'Day3' }],
          intercalary: [],
          time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
          // No weeks field
        };

        const engine = new CalendarEngine(calendar);
        expect(engine.getWeekOfMonth({ year: 1, month: 1, day: 1, weekday: 0 })).toBeNull();
      });
    });
  });

  describe('getWeekInfo()', () => {
    describe('Named weeks', () => {
      it('should return week info for Roshar calendar with Cosmere naming', () => {
        const rosharCalendar: SeasonsStarsCalendar = {
          id: 'test-roshar',
          translations: {
            en: { label: 'Test Roshar', description: 'Roshar test calendar' },
          },
          year: { epoch: 0, currentYear: 1173, prefix: '', suffix: '', startDay: 0 },
          leapYear: { rule: 'none' },
          months: [{ name: 'Jesnan', prefix: 'Jes', days: 50 }],
          weekdays: [
            { name: 'Jesdes', suffix: 'es' },
            { name: 'Nandes', suffix: 'an' },
            { name: 'Chachdes', suffix: 'ach' },
            { name: 'Vevdes', suffix: 'ev' },
            { name: 'Palaides', suffix: 'ah' },
          ],
          intercalary: [],
          time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
          weeks: {
            type: 'month-based',
            perMonth: 10,
            daysPerWeek: 5,
            names: [
              { name: 'First Week', abbreviation: '1st', suffix: 'es' },
              { name: 'Second Week', abbreviation: '2nd', suffix: 'an' },
              { name: 'Third Week', abbreviation: '3rd', suffix: 'ach' },
              { name: 'Fourth Week', abbreviation: '4th', suffix: 'ev' },
              { name: 'Fifth Week', abbreviation: '5th', suffix: 'ah' },
              { name: 'Sixth Week', abbreviation: '6th', suffix: 'ash' },
              { name: 'Seventh Week', abbreviation: '7th', suffix: 'et' },
              { name: 'Eighth Week', abbreviation: '8th', suffix: 'ak' },
              { name: 'Ninth Week', abbreviation: '9th', suffix: 'anat' },
              { name: 'Tenth Week', abbreviation: '10th', suffix: 'ishev' },
            ],
          },
        };

        const engine = new CalendarEngine(rosharCalendar);

        // First week
        const week1 = engine.getWeekInfo({ year: 1173, month: 1, day: 1, weekday: 0 });
        expect(week1).toEqual({
          name: 'First Week',
          abbreviation: '1st',
          suffix: 'es',
        });

        // Fifth week
        const week5 = engine.getWeekInfo({ year: 1173, month: 1, day: 25, weekday: 4 });
        expect(week5).toEqual({
          name: 'Fifth Week',
          abbreviation: '5th',
          suffix: 'ah',
        });

        // Tenth week
        const week10 = engine.getWeekInfo({ year: 1173, month: 1, day: 50, weekday: 4 });
        expect(week10).toEqual({
          name: 'Tenth Week',
          abbreviation: '10th',
          suffix: 'ishev',
        });
      });

      it('should return week info for Coriolis calendar with novena names', () => {
        const coriolisCalendar: SeasonsStarsCalendar = {
          id: 'test-coriolis',
          translations: {
            en: { label: 'Test Coriolis', description: 'Coriolis test calendar' },
          },
          year: { epoch: 0, currentYear: 465, prefix: 'CC ', suffix: '', startDay: 0 },
          leapYear: { rule: 'none' },
          months: [{ name: 'First Segment', days: 37 }],
          weekdays: [
            { name: 'First Day' },
            { name: 'Second Day' },
            { name: 'Third Day' },
            { name: 'Fourth Day' },
            { name: 'Fifth Day' },
            { name: 'Sixth Day' },
            { name: 'Seventh Day' },
            { name: 'Eighth Day' },
            { name: 'Ninth Day' },
          ],
          intercalary: [],
          time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
          weeks: {
            type: 'month-based',
            perMonth: 4,
            daysPerWeek: 9,
            remainderHandling: 'extend-last',
            names: [
              {
                name: 'The Novena of Grain',
                abbreviation: 'Grain',
                description:
                  'The first novena of each segment, symbolizing sustenance and prosperity',
              },
              {
                name: 'The Novena of Water',
                abbreviation: 'Water',
                description: 'The second novena, representing life and purification',
              },
              {
                name: 'The Novena of Light',
                abbreviation: 'Light',
                description: 'The third novena, honoring illumination and knowledge',
              },
              {
                name: 'The Novena of Incense',
                abbreviation: 'Incense',
                description: 'The fourth novena, sacred to prayer and the Icons',
              },
            ],
          },
        };

        const engine = new CalendarEngine(coriolisCalendar);

        // First novena
        const novena1 = engine.getWeekInfo({ year: 465, month: 1, day: 1, weekday: 0 });
        expect(novena1?.name).toBe('The Novena of Grain');
        expect(novena1?.abbreviation).toBe('Grain');
        expect(novena1?.description).toContain('sustenance');

        // Fourth novena (extended to include remainder day)
        const novena4 = engine.getWeekInfo({ year: 465, month: 1, day: 37, weekday: 0 });
        expect(novena4?.name).toBe('The Novena of Incense');
        expect(novena4?.abbreviation).toBe('Incense');
      });
    });

    describe('Auto-generated week names', () => {
      it('should auto-generate ordinal week names when pattern is "ordinal"', () => {
        const calendar: SeasonsStarsCalendar = {
          id: 'test-ordinal',
          translations: {
            en: { label: 'Test Ordinal', description: 'Ordinal week names' },
          },
          year: { epoch: 0, currentYear: 1, prefix: '', suffix: '', startDay: 0 },
          leapYear: { rule: 'none' },
          months: [{ name: 'Month1', days: 28 }],
          weekdays: [
            { name: 'Day1' },
            { name: 'Day2' },
            { name: 'Day3' },
            { name: 'Day4' },
            { name: 'Day5' },
            { name: 'Day6' },
            { name: 'Day7' },
          ],
          intercalary: [],
          time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
          weeks: {
            type: 'month-based',
            perMonth: 4,
            daysPerWeek: 7,
            namingPattern: 'ordinal',
          },
        };

        const engine = new CalendarEngine(calendar);

        expect(engine.getWeekInfo({ year: 1, month: 1, day: 1, weekday: 0 })?.name).toBe(
          '1st Week'
        );
        expect(engine.getWeekInfo({ year: 1, month: 1, day: 8, weekday: 0 })?.name).toBe(
          '2nd Week'
        );
        expect(engine.getWeekInfo({ year: 1, month: 1, day: 15, weekday: 0 })?.name).toBe(
          '3rd Week'
        );
        expect(engine.getWeekInfo({ year: 1, month: 1, day: 22, weekday: 0 })?.name).toBe(
          '4th Week'
        );
      });

      it('should auto-generate numeric week names when pattern is "numeric"', () => {
        const calendar: SeasonsStarsCalendar = {
          id: 'test-numeric',
          translations: {
            en: { label: 'Test Numeric', description: 'Numeric week names' },
          },
          year: { epoch: 0, currentYear: 1, prefix: '', suffix: '', startDay: 0 },
          leapYear: { rule: 'none' },
          months: [{ name: 'Month1', days: 28 }],
          weekdays: [
            { name: 'Day1' },
            { name: 'Day2' },
            { name: 'Day3' },
            { name: 'Day4' },
            { name: 'Day5' },
            { name: 'Day6' },
            { name: 'Day7' },
          ],
          intercalary: [],
          time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
          weeks: {
            type: 'month-based',
            perMonth: 4,
            daysPerWeek: 7,
            namingPattern: 'numeric',
          },
        };

        const engine = new CalendarEngine(calendar);

        expect(engine.getWeekInfo({ year: 1, month: 1, day: 1, weekday: 0 })?.name).toBe('Week 1');
        expect(engine.getWeekInfo({ year: 1, month: 1, day: 8, weekday: 0 })?.name).toBe('Week 2');
        expect(engine.getWeekInfo({ year: 1, month: 1, day: 15, weekday: 0 })?.name).toBe('Week 3');
        expect(engine.getWeekInfo({ year: 1, month: 1, day: 22, weekday: 0 })?.name).toBe('Week 4');
      });

      it('should return null when pattern is "none"', () => {
        const calendar: SeasonsStarsCalendar = {
          id: 'test-none-pattern',
          translations: {
            en: { label: 'Test None', description: 'No week names' },
          },
          year: { epoch: 0, currentYear: 1, prefix: '', suffix: '', startDay: 0 },
          leapYear: { rule: 'none' },
          months: [{ name: 'Month1', days: 28 }],
          weekdays: [
            { name: 'Day1' },
            { name: 'Day2' },
            { name: 'Day3' },
            { name: 'Day4' },
            { name: 'Day5' },
            { name: 'Day6' },
            { name: 'Day7' },
          ],
          intercalary: [],
          time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
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

    describe('Edge cases', () => {
      it('should return null when no weeks configuration exists', () => {
        const calendar: SeasonsStarsCalendar = {
          id: 'test-no-weeks',
          translations: {
            en: { label: 'Test No Weeks', description: 'No weeks config' },
          },
          year: { epoch: 0, currentYear: 1, prefix: '', suffix: '', startDay: 0 },
          leapYear: { rule: 'none' },
          months: [{ name: 'Month1', days: 30 }],
          weekdays: [{ name: 'Day1' }],
          intercalary: [],
          time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
        };

        const engine = new CalendarEngine(calendar);
        expect(engine.getWeekInfo({ year: 1, month: 1, day: 1, weekday: 0 })).toBeNull();
      });

      it('should return null for remainder days when handling is "none"', () => {
        const calendar: SeasonsStarsCalendar = {
          id: 'test-remainder-none',
          translations: {
            en: { label: 'Test Remainder None', description: 'Remainder none' },
          },
          year: { epoch: 0, currentYear: 1, prefix: '', suffix: '', startDay: 0 },
          leapYear: { rule: 'none' },
          months: [{ name: 'Month1', days: 37 }],
          weekdays: [
            { name: 'Day1' },
            { name: 'Day2' },
            { name: 'Day3' },
            { name: 'Day4' },
            { name: 'Day5' },
            { name: 'Day6' },
            { name: 'Day7' },
            { name: 'Day8' },
            { name: 'Day9' },
          ],
          intercalary: [],
          time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
          weeks: {
            type: 'month-based',
            perMonth: 4,
            daysPerWeek: 9,
            remainderHandling: 'none',
          },
        };

        const engine = new CalendarEngine(calendar);
        expect(engine.getWeekInfo({ year: 1, month: 1, day: 37, weekday: 0 })).toBeNull();
      });
    });
  });
});
