import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import { SunriseSunsetCalculator } from '../src/core/sunrise-sunset-calculator';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

/**
 * Tests for getSunriseSunset API - External Interface
 *
 * The external API (used by compatibility bridges) should return sunrise/sunset
 * times as **seconds from midnight** to match Simple Calendar's SeasonData format.
 *
 * Internally, the calculator uses decimal hours (e.g., 6.5 = 6:30 AM) for
 * efficiency and precision. The API layer converts these to seconds.
 *
 * Simple Calendar stores times as:
 * - sunriseTime: number (seconds from midnight)
 * - sunsetTime: number (seconds from midnight)
 *
 * Example: 21600 = 6:00 AM (6 hours × 3600 seconds)
 */
describe('getSunriseSunset API - External Interface', () => {
  let testCalendar: SeasonsStarsCalendar;

  beforeEach(() => {
    // Create a minimal calendar for testing
    testCalendar = {
      id: 'test-calendar',
      name: 'Test Calendar',
      months: [
        { name: 'January', days: 31 },
        { name: 'February', days: 28 },
        { name: 'March', days: 31 },
        { name: 'April', days: 30 },
        { name: 'May', days: 31 },
        { name: 'June', days: 30 },
        { name: 'July', days: 31 },
        { name: 'August', days: 31 },
        { name: 'September', days: 30 },
        { name: 'October', days: 31 },
        { name: 'November', days: 30 },
        { name: 'December', days: 31 },
      ],
      weekdays: [
        { name: 'Sunday' },
        { name: 'Monday' },
        { name: 'Tuesday' },
        { name: 'Wednesday' },
        { name: 'Thursday' },
        { name: 'Friday' },
        { name: 'Saturday' },
      ],
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      },
      seasons: [
        {
          name: 'Spring',
          startMonth: 3,
          startDay: 20,
          sunrise: '06:00',
          sunset: '18:00',
        },
        {
          name: 'Summer',
          startMonth: 6,
          startDay: 21,
          sunrise: '05:30',
          sunset: '20:30',
        },
        {
          name: 'Fall',
          startMonth: 9,
          startDay: 22,
          sunrise: '06:30',
          sunset: '18:30',
        },
        {
          name: 'Winter',
          startMonth: 12,
          startDay: 21,
          sunrise: '07:00',
          sunset: '17:00',
        },
      ],
      year: {
        epoch: 0,
      },
    };
  });

  describe('Return value format', () => {
    it('should return an object with sunrise and sunset properties', () => {
      const result = SunriseSunsetCalculator.calculate(
        { year: 2024, month: 6, day: 15, weekday: 0 },
        testCalendar,
        new CalendarEngine(testCalendar)
      );

      expect(result).toHaveProperty('sunrise');
      expect(result).toHaveProperty('sunset');
    });

    it('should return numbers (NOT strings) for sunrise and sunset', () => {
      const result = SunriseSunsetCalculator.calculate(
        { year: 2024, month: 6, day: 15, weekday: 0 },
        testCalendar,
        new CalendarEngine(testCalendar)
      );

      expect(typeof result.sunrise).toBe('number');
      expect(typeof result.sunset).toBe('number');
    });
  });

  describe('Return value units - should return SECONDS from midnight', () => {
    it('should return sunrise at 6:00 AM as 21600 seconds', () => {
      const result = SunriseSunsetCalculator.calculate(
        { year: 2024, month: 3, day: 20, weekday: 0 }, // Spring equinox
        testCalendar,
        new CalendarEngine(testCalendar)
      );

      // Spring starts with sunrise at 06:00 = 6 hours × 3600 = 21600 seconds
      expect(result.sunrise).toBe(21600);
    });

    it('should return sunset at 6:00 PM (18:00) as 64800 seconds', () => {
      const result = SunriseSunsetCalculator.calculate(
        { year: 2024, month: 3, day: 20, weekday: 0 }, // Spring equinox
        testCalendar,
        new CalendarEngine(testCalendar)
      );

      // Spring starts with sunset at 18:00 = 18 hours × 3600 = 64800 seconds
      expect(result.sunset).toBe(64800);
    });

    it('should handle sunrise at 5:30 AM as 19800 seconds', () => {
      const result = SunriseSunsetCalculator.calculate(
        { year: 2024, month: 6, day: 21, weekday: 0 }, // Summer solstice
        testCalendar,
        new CalendarEngine(testCalendar)
      );

      // Summer starts with sunrise at 05:30 = 5.5 hours × 3600 = 19800 seconds
      expect(result.sunrise).toBe(19800);
    });

    it('should handle sunset at 8:30 PM (20:30) as 73800 seconds', () => {
      const result = SunriseSunsetCalculator.calculate(
        { year: 2024, month: 6, day: 21, weekday: 0 }, // Summer solstice
        testCalendar,
        new CalendarEngine(testCalendar)
      );

      // Summer starts with sunset at 20:30 = 20.5 hours × 3600 = 73800 seconds
      expect(result.sunset).toBe(73800);
    });
  });

  describe('Calendar-specific time units', () => {
    it('should handle calendars with non-standard minutesInHour', () => {
      const customCalendar: SeasonsStarsCalendar = {
        ...testCalendar,
        time: {
          hoursInDay: 24,
          minutesInHour: 90, // 90 minutes per hour
          secondsInMinute: 60,
        },
        seasons: [
          {
            name: 'Spring',
            startMonth: 3,
            startDay: 20,
            sunrise: '06:00', // 6 hours = 6 × 90 × 60 = 32400 seconds
            sunset: '18:00', // 18 hours = 18 × 90 × 60 = 97200 seconds
          },
        ],
      };

      const result = SunriseSunsetCalculator.calculate(
        { year: 2024, month: 3, day: 20, weekday: 0 },
        customCalendar,
        new CalendarEngine(customCalendar)
      );

      // With 90 minutes per hour:
      // 6:00 AM = 6 hours × 90 minutes × 60 seconds = 32400 seconds
      // 18:00 PM = 18 hours × 90 minutes × 60 seconds = 97200 seconds
      expect(result.sunrise).toBe(32400);
      expect(result.sunset).toBe(97200);
    });

    it('should handle calendars with non-standard secondsInMinute', () => {
      const customCalendar: SeasonsStarsCalendar = {
        ...testCalendar,
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 100, // 100 seconds per minute
        },
        seasons: [
          {
            name: 'Spring',
            startMonth: 3,
            startDay: 20,
            sunrise: '06:00', // 6 hours = 6 × 60 × 100 = 36000 "seconds"
            sunset: '18:00', // 18 hours = 18 × 60 × 100 = 108000 "seconds"
          },
        ],
      };

      const result = SunriseSunsetCalculator.calculate(
        { year: 2024, month: 3, day: 20, weekday: 0 },
        customCalendar,
        new CalendarEngine(customCalendar)
      );

      // With 100 seconds per minute:
      // 6:00 AM = 6 hours × 60 minutes × 100 seconds = 36000 calendar-seconds
      // 18:00 PM = 18 hours × 60 minutes × 100 seconds = 108000 calendar-seconds
      expect(result.sunrise).toBe(36000);
      expect(result.sunset).toBe(108000);
    });
  });

  describe('Interpolation between seasons', () => {
    it('should interpolate sunrise/sunset times as seconds progress through season', () => {
      // Spring: sunrise 06:00, sunset 18:00 (starts Mar 20)
      // Summer: sunrise 05:30, sunset 20:30 (starts Jun 21)
      // Fall: sunrise 06:30, sunset 18:30 (starts Sep 22)

      const engine = new CalendarEngine(testCalendar);

      const springStart = SunriseSunsetCalculator.calculate(
        { year: 2024, month: 3, day: 20, weekday: 0 }, // Spring equinox
        testCalendar,
        engine
      );

      const summerStart = SunriseSunsetCalculator.calculate(
        { year: 2024, month: 6, day: 21, weekday: 0 }, // Summer solstice
        testCalendar,
        engine
      );

      const fallStart = SunriseSunsetCalculator.calculate(
        { year: 2024, month: 9, day: 22, weekday: 0 }, // Fall equinox
        testCalendar,
        engine
      );

      // Test exact season start times (now in seconds)
      expect(springStart.sunrise).toBe(21600); // 6.0 hours × 3600
      expect(springStart.sunset).toBe(64800); // 18.0 hours × 3600

      expect(summerStart.sunrise).toBe(19800); // 5.5 hours × 3600
      expect(summerStart.sunset).toBe(73800); // 20.5 hours × 3600

      expect(fallStart.sunrise).toBe(23400); // 6.5 hours × 3600
      expect(fallStart.sunset).toBe(66600); // 18.5 hours × 3600

      // Test that values are different (interpolation happening between seasons)
      expect(springStart.sunrise).not.toBe(summerStart.sunrise);
      expect(summerStart.sunset).not.toBe(fallStart.sunset);
    });
  });

  describe('Fallback behavior', () => {
    it('should return default times when calendar has no seasons', () => {
      const noSeasonsCalendar: SeasonsStarsCalendar = {
        ...testCalendar,
        seasons: [],
      };

      const result = SunriseSunsetCalculator.calculate(
        { year: 2024, month: 6, day: 15, weekday: 0 },
        noSeasonsCalendar,
        new CalendarEngine(noSeasonsCalendar)
      );

      // Default is 25% through day for sunrise, 75% for sunset
      // With 24 hour day: sunrise = 6 hours, sunset = 18 hours
      // In seconds: sunrise = 21600, sunset = 64800
      expect(result.sunrise).toBe(21600);
      expect(result.sunset).toBe(64800);
    });

    it('should handle calendars with non-standard hoursInDay in fallback', () => {
      const customCalendar: SeasonsStarsCalendar = {
        ...testCalendar,
        time: {
          hoursInDay: 32, // 32-hour day
          minutesInHour: 60,
          secondsInMinute: 60,
        },
        seasons: [],
      };

      const result = SunriseSunsetCalculator.calculate(
        { year: 2024, month: 6, day: 15, weekday: 0 },
        customCalendar,
        new CalendarEngine(customCalendar)
      );

      // Default: 25% through day = 8 hours, 75% = 24 hours
      // In seconds: 8 × 3600 = 28800, 24 × 3600 = 86400
      expect(result.sunrise).toBe(28800);
      expect(result.sunset).toBe(86400);
    });
  });

  describe('Edge cases', () => {
    it('should handle dates at season boundaries', () => {
      // Test exact season start date
      const result = SunriseSunsetCalculator.calculate(
        { year: 2024, month: 6, day: 21, weekday: 0 }, // Summer solstice
        testCalendar,
        new CalendarEngine(testCalendar)
      );

      expect(result.sunrise).toBe(19800); // 5.5 hours × 3600
      expect(result.sunset).toBe(73800); // 20.5 hours × 3600
    });

    it('should handle year-crossing seasons (Winter)', () => {
      // Winter starts Dec 21 and crosses into next year
      const winterDate = SunriseSunsetCalculator.calculate(
        { year: 2024, month: 1, day: 15, weekday: 0 }, // Mid-winter (January)
        testCalendar,
        new CalendarEngine(testCalendar)
      );

      // Should be in Winter season
      expect(typeof winterDate.sunrise).toBe('number');
      expect(typeof winterDate.sunset).toBe('number');
    });
  });
});

/**
 * Integration tests for the full API stack
 *
 * These tests verify the complete flow from:
 * game.seasonsStars.api.getSunriseSunset() → module.ts → SunriseSunsetCalculator
 */
describe('getSunriseSunset API - Full Integration', () => {
  it('should be available on game.seasonsStars.api', () => {
    // This test will verify the API is exposed correctly once implemented
    // TODO: Implement once API wrapper is updated
  });

  it('should accept ICalendarDate and optional calendarId', () => {
    // This test will verify the API signature once implemented
    // TODO: Implement once API wrapper is updated
  });

  it('should return seconds from midnight in production use', () => {
    // This test will verify the end-to-end conversion once implemented
    // TODO: Implement once API wrapper is updated
  });
});
