import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import darkSunCalendar from '../calendars/dark-sun.json';

describe('Dark Sun Calendar', () => {
  let engine: CalendarEngine;

  beforeEach(() => {
    engine = new CalendarEngine(darkSunCalendar);
  });

  describe('Weekday Behavior', () => {
    it('should start every month on "1 Day" (weekday index 0)', () => {
      const testYear = 1; // FY 1
      
      // Test each month
      for (let month = 1; month <= 12; month++) {
        const monthName = darkSunCalendar.months[month - 1].name;
        const firstDayWeekday = engine.calculateWeekday(testYear, month, 1);
        
        expect(firstDayWeekday).toBe(0);
        expect(darkSunCalendar.weekdays[firstDayWeekday].name).toBe('1 Day');
      }
    });

    it('should have intercalary days that do not count for weekdays', () => {
      // Verify all intercalary periods have countsForWeekdays = false
      darkSunCalendar.intercalary.forEach(intercalary => {
        expect(intercalary.countsForWeekdays).toBe(false);
      });
    });

    it('should reset weekday cycle after each intercalary period', () => {
      const testYear = 1;
      
      // Test Cooling Sun (after Gather, month 4)
      // Last day of Gather should be 6 Day (30 days, starting from 1 Day)
      const lastDayGather = engine.calculateWeekday(testYear, 4, 30);
      expect(lastDayGather).toBe(5); // 6 Day (index 5)
      
      // First day of Breeze (month 5, after Cooling Sun) should be 1 Day
      const firstDayBreeze = engine.calculateWeekday(testYear, 5, 1);
      expect(firstDayBreeze).toBe(0); // 1 Day (index 0)
      
      // Test Soaring Sun (after Haze, month 8)
      const lastDayHaze = engine.calculateWeekday(testYear, 8, 30);
      expect(lastDayHaze).toBe(5); // 6 Day (index 5)
      
      // First day of Hoard (month 9, after Soaring Sun) should be 1 Day
      const firstDayHoard = engine.calculateWeekday(testYear, 9, 1);
      expect(firstDayHoard).toBe(0); // 1 Day (index 0)
      
      // Test Highest Sun (after Smolder, month 12)
      const lastDaySmolder = engine.calculateWeekday(testYear, 12, 30);
      expect(lastDaySmolder).toBe(5); // 6 Day (index 5)
      
      // First day of Scorch (month 1 of next year, after Highest Sun) should be 1 Day
      const firstDayScorchNextYear = engine.calculateWeekday(testYear + 1, 1, 1);
      expect(firstDayScorchNextYear).toBe(0); // 1 Day (index 0)
    });

    it('should maintain consistent weekday progression within months', () => {
      const testYear = 1;
      const testMonth = 3; // Rest
      
      // Each month has 30 days and 6-day weeks
      // So it should go: 1 Day, 2 Day, 3 Day, 4 Day, 5 Day, 6 Day, 1 Day, ...
      for (let day = 1; day <= 30; day++) {
        const weekday = engine.calculateWeekday(testYear, testMonth, day);
        const expectedWeekday = (day - 1) % 6;
        
        expect(weekday).toBe(expectedWeekday);
        expect(darkSunCalendar.weekdays[weekday].name).toBe(`${expectedWeekday + 1} Day`);
      }
    });

    it('should handle year transitions correctly', () => {
      // Test multiple years to ensure consistency
      for (let year = -101; year <= 10; year++) {
        // First day of first month should always be 1 Day
        const firstDayScorch = engine.calculateWeekday(year, 1, 1);
        expect(firstDayScorch).toBe(0);
        
        // First day of month after each intercalary should be 1 Day
        const firstDayBreeze = engine.calculateWeekday(year, 5, 1); // After Cooling Sun
        expect(firstDayBreeze).toBe(0);
        
        const firstDayHoard = engine.calculateWeekday(year, 9, 1); // After Soaring Sun
        expect(firstDayHoard).toBe(0);
      }
    });
  });

  describe('Intercalary Days Configuration', () => {
    it('should have exactly 3 intercalary periods of 5 days each', () => {
      expect(darkSunCalendar.intercalary).toHaveLength(3);
      
      darkSunCalendar.intercalary.forEach(intercalary => {
        expect(intercalary.days).toBe(5);
        expect(intercalary.leapYearOnly).toBe(false);
      });
    });

    it('should place intercalary periods after correct months', () => {
      const intercalaryPlacements = darkSunCalendar.intercalary.map(i => ({
        name: i.name,
        after: i.after
      }));
      
      expect(intercalaryPlacements).toEqual([
        { name: 'Cooling Sun', after: 'Gather' },
        { name: 'Soaring Sun', after: 'Haze' },
        { name: 'Highest Sun', after: 'Smolder' }
      ]);
    });
  });

  describe('Calendar Structure', () => {
    it('should have 12 months of 30 days each', () => {
      expect(darkSunCalendar.months).toHaveLength(12);
      
      darkSunCalendar.months.forEach(month => {
        expect(month.days).toBe(30);
      });
    });

    it('should have 6 weekdays', () => {
      expect(darkSunCalendar.weekdays).toHaveLength(6);
      
      darkSunCalendar.weekdays.forEach((weekday, index) => {
        expect(weekday.name).toBe(`${index + 1} Day`);
      });
    });

    it('should have 375 total days per year', () => {
      // 12 months × 30 days = 360 days
      // 3 intercalary periods × 5 days = 15 days
      // Total: 375 days
      const regularDays = darkSunCalendar.months.reduce((sum, month) => sum + month.days, 0);
      const intercalaryDays = darkSunCalendar.intercalary.reduce((sum, i) => sum + i.days, 0);
      
      expect(regularDays).toBe(360);
      expect(intercalaryDays).toBe(15);
      expect(regularDays + intercalaryDays).toBe(375);
    });
  });
});