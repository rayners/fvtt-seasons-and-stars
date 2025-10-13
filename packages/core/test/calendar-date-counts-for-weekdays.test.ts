/**
 * Test for CalendarDate.countsForWeekdays() method
 */

import { describe, it, expect } from 'vitest';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar, CalendarDateData } from '../src/types/calendar';

describe('CalendarDate.countsForWeekdays()', () => {
  let mockCalendar: SeasonsStarsCalendar;

  beforeEach(() => {
    mockCalendar = {
      id: 'test-calendar',
      name: 'Test Calendar',
      label: 'Test Calendar',
      months: [
        { name: 'January', days: 31 },
        { name: 'December', days: 31 },
      ],
      weekdays: [
        { name: 'Sunday', abbreviation: 'Sun' },
        { name: 'Monday', abbreviation: 'Mon' },
        { name: 'Tuesday', abbreviation: 'Tue' },
        { name: 'Wednesday', abbreviation: 'Wed' },
        { name: 'Thursday', abbreviation: 'Thu' },
        { name: 'Friday', abbreviation: 'Fri' },
        { name: 'Saturday', abbreviation: 'Sat' },
      ],
      intercalary: [
        {
          name: 'Midwinter Festival',
          after: 'December',
          days: 1,
          leapYearOnly: false,
          countsForWeekdays: false,
        },
        {
          name: 'New Year Festival',
          after: 'December',
          days: 1,
          leapYearOnly: false,
          countsForWeekdays: true,
        },
        {
          name: 'Default Festival',
          after: 'January',
          days: 1,
          leapYearOnly: false,
          // Note: no countsForWeekdays property (should default to true)
        },
      ],
      yearLength: 365,
      weekLength: 7,
      epoch: { year: 1, month: 1, day: 1 },
    } as SeasonsStarsCalendar;
  });

  describe('Regular Days', () => {
    it('should return true for regular (non-intercalary) days', () => {
      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
        // No intercalary property
      };

      const date = new CalendarDate(dateData, mockCalendar);
      expect(date.countsForWeekdays()).toBe(true);
    });
  });

  describe('Intercalary Days', () => {
    it('should return false for intercalary days with countsForWeekdays: false', () => {
      const dateData: CalendarDateData = {
        year: 2024,
        month: 12,
        day: 1,
        weekday: 0,
        intercalary: 'Midwinter Festival',
      };

      const date = new CalendarDate(dateData, mockCalendar);
      expect(date.countsForWeekdays()).toBe(false);
    });

    it('should return true for intercalary days with countsForWeekdays: true', () => {
      const dateData: CalendarDateData = {
        year: 2024,
        month: 12,
        day: 1,
        weekday: 0,
        intercalary: 'New Year Festival',
      };

      const date = new CalendarDate(dateData, mockCalendar);
      expect(date.countsForWeekdays()).toBe(true);
    });

    it('should default to true for intercalary days without countsForWeekdays property', () => {
      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 1,
        weekday: 0,
        intercalary: 'Default Festival',
      };

      const date = new CalendarDate(dateData, mockCalendar);
      expect(date.countsForWeekdays()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should default to true for intercalary days not found in calendar definition', () => {
      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 1,
        weekday: 0,
        intercalary: 'Unknown Festival',
      };

      const date = new CalendarDate(dateData, mockCalendar);
      expect(date.countsForWeekdays()).toBe(true);
    });

    it('should handle calendar without intercalary array gracefully', () => {
      const calendarWithoutIntercalary = {
        ...mockCalendar,
        intercalary: undefined,
      } as SeasonsStarsCalendar;

      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 1,
        weekday: 0,
        intercalary: 'Some Festival',
      };

      const date = new CalendarDate(dateData, calendarWithoutIntercalary);
      expect(date.countsForWeekdays()).toBe(true);
    });

    it('should handle empty intercalary array gracefully', () => {
      const calendarWithEmptyIntercalary = {
        ...mockCalendar,
        intercalary: [],
      } as SeasonsStarsCalendar;

      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 1,
        weekday: 0,
        intercalary: 'Some Festival',
      };

      const date = new CalendarDate(dateData, calendarWithEmptyIntercalary);
      expect(date.countsForWeekdays()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty intercalary name', () => {
      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 1,
        weekday: 0,
        intercalary: '',
      };

      const date = new CalendarDate(dateData, mockCalendar);
      expect(date.countsForWeekdays()).toBe(true);
    });

    it('should handle null intercalary property', () => {
      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 1,
        weekday: 0,
        intercalary: null as any,
      };

      const date = new CalendarDate(dateData, mockCalendar);
      expect(date.countsForWeekdays()).toBe(true);
    });
  });
});
