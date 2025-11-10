/**
 * Sunrise/Sunset Time Components Test Suite
 *
 * Tests for the decimalHoursToTimeComponents helper method that converts
 * decimal hours to hour/minute components for use in setDate operations.
 *
 * This test suite ensures the extraction of duplicate minute conversion logic
 * maintains existing behavior.
 */

import { describe, test, expect } from 'vitest';
import { SunriseSunsetCalculator } from '../src/core/sunrise-sunset-calculator';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

describe('SunriseSunsetCalculator - Time Components Conversion', () => {
  describe('decimalHoursToTimeComponents - Standard 60-minute Hours', () => {
    test('should convert whole hours correctly', () => {
      const result = SunriseSunsetCalculator.decimalHoursToTimeComponents(6.0);
      expect(result.hour).toBe(6);
      expect(result.minute).toBe(0);
    });

    test('should convert 30-minute intervals correctly', () => {
      const result = SunriseSunsetCalculator.decimalHoursToTimeComponents(6.5);
      expect(result.hour).toBe(6);
      expect(result.minute).toBe(30);
    });

    test('should convert 15-minute intervals correctly', () => {
      const result1 = SunriseSunsetCalculator.decimalHoursToTimeComponents(16.75);
      expect(result1.hour).toBe(16);
      expect(result1.minute).toBe(45);

      const result2 = SunriseSunsetCalculator.decimalHoursToTimeComponents(20.25);
      expect(result2.hour).toBe(20);
      expect(result2.minute).toBe(15);
    });

    test('should round fractional minutes correctly', () => {
      // 6.5 hours = 6:30
      const result1 = SunriseSunsetCalculator.decimalHoursToTimeComponents(6.5);
      expect(result1.hour).toBe(6);
      expect(result1.minute).toBe(30);

      // 18.833333 hours ≈ 18:50
      const result2 = SunriseSunsetCalculator.decimalHoursToTimeComponents(18.833333);
      expect(result2.hour).toBe(18);
      expect(result2.minute).toBe(50);
    });

    test('should handle sunrise times from real calendar data', () => {
      // Winter sunrise: 7:00
      const winter = SunriseSunsetCalculator.decimalHoursToTimeComponents(7.0);
      expect(winter.hour).toBe(7);
      expect(winter.minute).toBe(0);

      // Spring sunrise: 6:30
      const spring = SunriseSunsetCalculator.decimalHoursToTimeComponents(6.5);
      expect(spring.hour).toBe(6);
      expect(spring.minute).toBe(30);

      // Summer sunrise: 5:45
      const summer = SunriseSunsetCalculator.decimalHoursToTimeComponents(5.75);
      expect(summer.hour).toBe(5);
      expect(summer.minute).toBe(45);
    });

    test('should handle sunset times from real calendar data', () => {
      // Winter sunset: 16:45
      const winter = SunriseSunsetCalculator.decimalHoursToTimeComponents(16.75);
      expect(winter.hour).toBe(16);
      expect(winter.minute).toBe(45);

      // Summer sunset: 20:15
      const summer = SunriseSunsetCalculator.decimalHoursToTimeComponents(20.25);
      expect(summer.hour).toBe(20);
      expect(summer.minute).toBe(15);
    });

    test('should handle edge case where rounding produces 60 minutes', () => {
      // 6.9999 should round to 7:00, not 6:60
      const result = SunriseSunsetCalculator.decimalHoursToTimeComponents(6.9999);
      expect(result.hour).toBe(7);
      expect(result.minute).toBe(0);
    });

    test('should handle midnight (0:00)', () => {
      const result = SunriseSunsetCalculator.decimalHoursToTimeComponents(0.0);
      expect(result.hour).toBe(0);
      expect(result.minute).toBe(0);
    });

    test('should handle values close to midnight', () => {
      // 23:45
      const result = SunriseSunsetCalculator.decimalHoursToTimeComponents(23.75);
      expect(result.hour).toBe(23);
      expect(result.minute).toBe(45);
    });
  });

  describe('decimalHoursToTimeComponents - Custom Minutes Per Hour', () => {
    const calendar90Min: SeasonsStarsCalendar = {
      id: 'custom-90',
      year: { epoch: 0, currentYear: 1, startDay: 0 },
      leapYear: { rule: 'none' },
      months: [{ name: 'Month1', abbreviation: 'M1', days: 30 }],
      weekdays: [{ name: 'Day1' }],
      intercalary: [],
      time: {
        hoursInDay: 24,
        minutesInHour: 90,
        secondsInMinute: 60,
      },
    };

    const calendar100Min: SeasonsStarsCalendar = {
      id: 'custom-100',
      year: { epoch: 0, currentYear: 1, startDay: 0 },
      leapYear: { rule: 'none' },
      months: [{ name: 'Month1', abbreviation: 'M1', days: 30 }],
      weekdays: [{ name: 'Day1' }],
      intercalary: [],
      time: {
        hoursInDay: 24,
        minutesInHour: 100,
        secondsInMinute: 60,
      },
    };

    test('should handle 90 minutes per hour', () => {
      // 6.5 hours = 6 hours + 0.5 * 90 minutes = 6:45
      const result = SunriseSunsetCalculator.decimalHoursToTimeComponents(6.5, calendar90Min);
      expect(result.hour).toBe(6);
      expect(result.minute).toBe(45);
    });

    test('should handle 100 minutes per hour', () => {
      // 6.5 hours = 6 hours + 0.5 * 100 minutes = 6:50
      const result = SunriseSunsetCalculator.decimalHoursToTimeComponents(6.5, calendar100Min);
      expect(result.hour).toBe(6);
      expect(result.minute).toBe(50);
    });

    test('should round to nearest minute in custom calendar', () => {
      // 6.333 hours with 90 min/hour = 6 + (0.333 * 90) = 6:30 (rounded from 29.97)
      const result = SunriseSunsetCalculator.decimalHoursToTimeComponents(6.333, calendar90Min);
      expect(result.hour).toBe(6);
      expect(result.minute).toBe(30);
    });

    test('should handle edge case where rounding produces minutesInHour', () => {
      // Create a case where rounding would produce exactly minutesInHour
      // 6.9999 with 90 min/hour should become 7:00, not 6:90
      const result = SunriseSunsetCalculator.decimalHoursToTimeComponents(6.9999, calendar90Min);
      expect(result.hour).toBe(7);
      expect(result.minute).toBe(0);
    });
  });

  describe('decimalHoursToTimeComponents - Fallback to 60 Minutes', () => {
    const calendarNoTime: SeasonsStarsCalendar = {
      id: 'no-time',
      year: { epoch: 0, currentYear: 1, startDay: 0 },
      leapYear: { rule: 'none' },
      months: [{ name: 'Month1', abbreviation: 'M1', days: 30 }],
      weekdays: [{ name: 'Day1' }],
      intercalary: [],
      // No time property at all
    };

    test('should default to 60 minutes per hour when calendar has no time config', () => {
      const result = SunriseSunsetCalculator.decimalHoursToTimeComponents(6.5, calendarNoTime);
      expect(result.hour).toBe(6);
      expect(result.minute).toBe(30);
    });

    test('should default to 60 minutes per hour when calendar is undefined', () => {
      const result = SunriseSunsetCalculator.decimalHoursToTimeComponents(6.5);
      expect(result.hour).toBe(6);
      expect(result.minute).toBe(30);
    });
  });

  describe('Integration with Existing hoursToTimeString', () => {
    test('should produce same hour/minute as hoursToTimeString for standard calendars', () => {
      const testCases = [
        { decimal: 6.0, expected: '06:00' },
        { decimal: 6.5, expected: '06:30' },
        { decimal: 16.75, expected: '16:45' },
        { decimal: 20.25, expected: '20:15' },
        { decimal: 18.833333, expected: '18:50' },
      ];

      testCases.forEach(({ decimal, expected }) => {
        const components = SunriseSunsetCalculator.decimalHoursToTimeComponents(decimal);
        const timeString = SunriseSunsetCalculator.hoursToTimeString(decimal);

        expect(timeString).toBe(expected);
        expect(
          `${components.hour.toString().padStart(2, '0')}:${components.minute.toString().padStart(2, '0')}`
        ).toBe(expected);
      });
    });
  });

  describe('Consistency with Widget Implementation', () => {
    test('should match the existing widget calculation logic', () => {
      // This replicates the exact logic from calendar-widget.ts:480-482
      const sunriseSunset = { sunrise: 6.5, sunset: 18.75 };
      const calendar = undefined; // Using default 60 minutes

      // Old approach (what widgets currently do)
      const sunriseHoursOld = Math.floor(sunriseSunset.sunrise);
      const minutesInHour = 60;
      const sunriseMinutesOld = Math.round(
        (sunriseSunset.sunrise - sunriseHoursOld) * minutesInHour
      );

      // New approach (using helper)
      const resultNew = SunriseSunsetCalculator.decimalHoursToTimeComponents(
        sunriseSunset.sunrise,
        calendar
      );

      expect(resultNew.hour).toBe(sunriseHoursOld);
      expect(resultNew.minute).toBe(sunriseMinutesOld);
    });

    test('should match widget calculation for sunset', () => {
      const sunriseSunset = { sunrise: 6.5, sunset: 18.75 };
      const calendar = undefined;

      // Old approach
      const sunsetHoursOld = Math.floor(sunriseSunset.sunset);
      const minutesInHour = 60;
      const sunsetMinutesOld = Math.round((sunriseSunset.sunset - sunsetHoursOld) * minutesInHour);

      // New approach
      const resultNew = SunriseSunsetCalculator.decimalHoursToTimeComponents(
        sunriseSunset.sunset,
        calendar
      );

      expect(resultNew.hour).toBe(sunsetHoursOld);
      expect(resultNew.minute).toBe(sunsetMinutesOld);
    });
  });
});
