import { describe, it, expect } from 'vitest';
import { SunriseSunsetCalculator } from '../src/core/sunrise-sunset-calculator';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

/**
 * Tests for converting seconds from midnight to time strings for display
 *
 * The calculator returns seconds, but widgets need to display HH:MM format
 */
describe('SunriseSunsetCalculator - secondsToTimeString', () => {
  describe('Standard 24-hour days', () => {
    it('should convert sunrise at 6:00 AM (21600 seconds) to "06:00"', () => {
      const result = SunriseSunsetCalculator.secondsToTimeString(21600);
      expect(result).toBe('06:00');
    });

    it('should convert sunset at 6:00 PM (64800 seconds) to "18:00"', () => {
      const result = SunriseSunsetCalculator.secondsToTimeString(64800);
      expect(result).toBe('18:00');
    });

    it('should convert 5:30 AM (19800 seconds) to "05:30"', () => {
      const result = SunriseSunsetCalculator.secondsToTimeString(19800);
      expect(result).toBe('05:30');
    });

    it('should convert 8:30 PM (73800 seconds) to "20:30"', () => {
      const result = SunriseSunsetCalculator.secondsToTimeString(73800);
      expect(result).toBe('20:30');
    });

    it('should convert midnight (0 seconds) to "00:00"', () => {
      const result = SunriseSunsetCalculator.secondsToTimeString(0);
      expect(result).toBe('00:00');
    });

    it('should convert 7:45 AM (27900 seconds) to "07:45"', () => {
      const result = SunriseSunsetCalculator.secondsToTimeString(27900);
      expect(result).toBe('07:45');
    });
  });

  describe('Non-standard minutesInHour', () => {
    it('should handle 90 minutes per hour correctly', () => {
      const calendar: SeasonsStarsCalendar = {
        id: 'test',
        name: 'Test',
        time: {
          hoursInDay: 24,
          minutesInHour: 90,
          secondsInMinute: 60,
        },
      } as SeasonsStarsCalendar;

      // 6:00 AM with 90-minute hours = 6 × 90 × 60 = 32400 seconds
      const result = SunriseSunsetCalculator.secondsToTimeString(32400, calendar);
      expect(result).toBe('06:00');
    });

    it('should handle 90 minutes per hour with fractional hour', () => {
      const calendar: SeasonsStarsCalendar = {
        id: 'test',
        name: 'Test',
        time: {
          hoursInDay: 24,
          minutesInHour: 90,
          secondsInMinute: 60,
        },
      } as SeasonsStarsCalendar;

      // 6:45 in 90-minute hours = 6 × 5400 + 45 × 60 = 32400 + 2700 = 35100 seconds
      const result = SunriseSunsetCalculator.secondsToTimeString(35100, calendar);
      expect(result).toBe('06:45');
    });
  });

  describe('Non-standard secondsInMinute', () => {
    it('should handle 100 seconds per minute correctly', () => {
      const calendar: SeasonsStarsCalendar = {
        id: 'test',
        name: 'Test',
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 100,
        },
      } as SeasonsStarsCalendar;

      // 6:00 AM with 100-second minutes = 6 × 60 × 100 = 36000 seconds
      const result = SunriseSunsetCalculator.secondsToTimeString(36000, calendar);
      expect(result).toBe('06:00');
    });

    it('should handle 100 seconds per minute with fractional hour', () => {
      const calendar: SeasonsStarsCalendar = {
        id: 'test',
        name: 'Test',
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 100,
        },
      } as SeasonsStarsCalendar;

      // 6:30 with 100-second minutes = 6 × 6000 + 30 × 100 = 36000 + 3000 = 39000 seconds
      const result = SunriseSunsetCalculator.secondsToTimeString(39000, calendar);
      expect(result).toBe('06:30');
    });
  });

  describe('Edge cases', () => {
    it('should pad single-digit hours with zero', () => {
      const result = SunriseSunsetCalculator.secondsToTimeString(10800); // 3:00 AM
      expect(result).toBe('03:00');
    });

    it('should pad single-digit minutes with zero', () => {
      const result = SunriseSunsetCalculator.secondsToTimeString(21780); // 6:03 AM
      expect(result).toBe('06:03');
    });

    it('should handle end of day correctly', () => {
      const result = SunriseSunsetCalculator.secondsToTimeString(86340); // 23:59
      expect(result).toBe('23:59');
    });
  });
});
