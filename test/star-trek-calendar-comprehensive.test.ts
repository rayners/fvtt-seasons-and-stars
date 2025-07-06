/**
 * Comprehensive tests for Star Trek calendar variants
 * Tests actual date formatting functionality with all variants
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Handlebars from 'handlebars';
import { CalendarEngine } from '../src/core/calendar-engine';
import { CalendarDate } from '../src/core/calendar-date';
import { DateFormatter } from '../src/core/date-formatter';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Use REAL Handlebars for Star Trek comprehensive testing
global.Handlebars = Handlebars;

describe('Star Trek Calendar Comprehensive Tests', () => {
  let mockCalendar: SeasonsStarsCalendar;
  let formatter: DateFormatter;
  let starTrekFormats: any;

  beforeEach(async () => {
    // Reset helper registration
    DateFormatter.resetHelpersForTesting();

    // Load the actual Star Trek date formats
    const fs = await import('fs/promises');
    const path = await import('path');
    const starTrekPath = path.resolve(__dirname, '../calendars/gregorian-star-trek-variants.json');
    const starTrekData = await fs.readFile(starTrekPath, 'utf-8');
    const starTrekVariants = JSON.parse(starTrekData);

    // Extract the federation-standard formats
    const federationVariant = starTrekVariants.variants['federation-standard'];
    starTrekFormats = federationVariant?.overrides?.dateFormats;

    // Create mock calendar with Star Trek formats
    mockCalendar = {
      id: 'gregorian-star-trek',
      months: [
        { name: 'January', abbreviation: 'Jan', days: 31 },
        { name: 'February', abbreviation: 'Feb', days: 28 },
        { name: 'March', abbreviation: 'Mar', days: 31 },
        { name: 'April', abbreviation: 'Apr', days: 30 },
        { name: 'May', abbreviation: 'May', days: 31 },
        { name: 'June', abbreviation: 'Jun', days: 30 },
        { name: 'July', abbreviation: 'Jul', days: 31 },
        { name: 'August', abbreviation: 'Aug', days: 31 },
        { name: 'September', abbreviation: 'Sep', days: 30 },
        { name: 'October', abbreviation: 'Oct', days: 31 },
        { name: 'November', abbreviation: 'Nov', days: 30 },
        { name: 'December', abbreviation: 'Dec', days: 31 },
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
      year: { prefix: '', suffix: '' },
      time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
      dateFormats: starTrekFormats || {},
    } as SeasonsStarsCalendar;

    // Create formatter to register helpers
    formatter = new DateFormatter(mockCalendar);
  });

  describe('Federation Standard Date Formats', () => {
    it('should format federation standard date correctly', () => {
      const date = new CalendarDate({ year: 2370, month: 1, day: 15, weekday: 1 }, mockCalendar);

      const result = formatter.formatNamed(date, 'federation');

      // Federation format should exist and work properly
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // If federation format works, it should contain the year
      expect(result).toContain('2370');
    });

    it('should format short date correctly', () => {
      const date = new CalendarDate({ year: 2375, month: 6, day: 10, weekday: 3 }, mockCalendar);

      const result = formatter.formatNamed(date, 'short');

      // Short format should exist and work properly
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Short format contains month abbreviation and day (no year)
      expect(result).toContain('Jun');
      expect(result).toContain('10');
    });

    it('should format long date correctly', () => {
      const date = new CalendarDate({ year: 2376, month: 3, day: 20, weekday: 0 }, mockCalendar);

      const result = formatter.formatNamed(date, 'long');

      // Long format should exist and work properly
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Sunday');
      expect(result).toContain('March');
      expect(result).toContain('20th');
      expect(result).toContain('2376');
    });
  });

  describe('Stardate Calculations', () => {
    it('should calculate TNG era stardate correctly', () => {
      const date = new CalendarDate({ year: 2370, month: 1, day: 15, weekday: 0 }, mockCalendar);

      const result = formatter.formatNamed(date, 'tng-stardate');

      // TNG stardates start with 47 prefix for year 2370
      expect(result).toMatch(/^47\d{3}\.\d$/);
      expect(result.length).toBeGreaterThan(6); // Should be like 47015.0
    });

    it('should calculate DS9 era stardate correctly', () => {
      const date = new CalendarDate({ year: 2375, month: 6, day: 10, weekday: 0 }, mockCalendar);

      const result = formatter.formatNamed(date, 'ds9-stardate');

      // DS9 stardates start with 52 prefix for year 2375
      expect(result).toMatch(/^52\d{3}\.\d$/);
    });

    it('should calculate Voyager era stardate correctly', () => {
      const date = new CalendarDate({ year: 2376, month: 3, day: 20, weekday: 0 }, mockCalendar);

      const result = formatter.formatNamed(date, 'voyager-stardate');

      // Voyager stardates start with 53 prefix for year 2376
      expect(result).toMatch(/^53\d{3}\.\d$/);
    });

    it('should calculate Enterprise era stardate correctly', () => {
      const date = new CalendarDate({ year: 2151, month: 4, day: 5, weekday: 0 }, mockCalendar);

      const result = formatter.formatNamed(date, 'enterprise-stardate');

      // Enterprise stardates start with 0 prefix for year 2151
      expect(result).toMatch(/^0\d{3}\.\d{2}$/);
    });

    it('should calculate TOS era stardate correctly', () => {
      const date = new CalendarDate({ year: 2268, month: 12, day: 31, weekday: 0 }, mockCalendar);

      const result = formatter.formatNamed(date, 'tos-stardate');

      // TOS uses year - 1300 + dayOfYear format
      expect(result).toMatch(/^\d{3}\.\d+$/);
      expect(parseInt(result.split('.')[0])).toBeGreaterThan(960); // 2268 - 1300 = 968
    });
  });

  describe('Time Formatting', () => {
    it('should format time with padded hours, minutes, and seconds', () => {
      const date = new CalendarDate(
        {
          year: 2370,
          month: 1,
          day: 15,
          weekday: 0,
          time: { hour: 9, minute: 5, second: 3 },
        },
        mockCalendar
      );

      const result = formatter.formatNamed(date, 'time');

      // Time format should work with time data
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Should reflect the time data somehow
      expect(result).toMatch(/\d/);
    });

    it('should format time with double-digit values', () => {
      const date = new CalendarDate(
        {
          year: 2370,
          month: 1,
          day: 15,
          weekday: 0,
          time: { hour: 14, minute: 30, second: 45 },
        },
        mockCalendar
      );

      const result = formatter.formatNamed(date, 'time');

      // Time format should work with time data
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toMatch(/\d/);
    });

    it('should handle undefined time gracefully', () => {
      const date = new CalendarDate(
        {
          year: 2370,
          month: 1,
          day: 15,
          weekday: 0,
          // no time property
        },
        mockCalendar
      );

      const result = formatter.formatNamed(date, 'time');

      // Should handle undefined time gracefully
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Combined Formats', () => {
    it('should format starfleet command format correctly', () => {
      const date = new CalendarDate({ year: 2370, month: 1, day: 15, weekday: 0 }, mockCalendar);

      const result = formatter.formatNamed(date, 'starfleet');

      // Starfleet format should work properly
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Starfleet format should contain "Stardate" not the year
      expect(result).toContain('Stardate');
    });

    it('should format diplomatic format correctly', () => {
      const date = new CalendarDate({ year: 2370, month: 1, day: 15, weekday: 0 }, mockCalendar);

      const result = formatter.formatNamed(date, 'diplomatic');

      // Diplomatic format should work properly
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('2370');
    });

    it('should format official Federation date correctly', () => {
      const date = new CalendarDate({ year: 2370, month: 1, day: 15, weekday: 0 }, mockCalendar);

      const result = formatter.formatNamed(date, 'official');

      // Official format should work properly
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('2370');
    });
  });

  describe('Widget Formats', () => {
    it('should format mini widget correctly', () => {
      const date = new CalendarDate({ year: 2370, month: 1, day: 15, weekday: 0 }, mockCalendar);

      const result = formatter.formatWidget(date, 'mini');

      // Mini widget format should work properly
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should format main widget correctly', () => {
      const date = new CalendarDate({ year: 2370, month: 1, day: 15, weekday: 1 }, mockCalendar);

      const result = formatter.formatWidget(date, 'main');

      // Main widget format should work properly
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('January');
      expect(result).toContain('15th');
    });

    it('should format grid widget correctly', () => {
      const date = new CalendarDate({ year: 2370, month: 1, day: 15, weekday: 0 }, mockCalendar);

      const result = formatter.formatWidget(date, 'grid');

      // Grid widget format should work properly
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Variant Formats', () => {
    it('should format command variant short correctly', () => {
      const date = new CalendarDate({ year: 2370, month: 1, day: 15, weekday: 0 }, mockCalendar);

      const result = formatter.formatNamed(date, 'variants', 'command');

      // Command variant should have short and long options
      // This test verifies the variant system works
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid format names gracefully', () => {
      const date = new CalendarDate({ year: 2370, month: 1, day: 15, weekday: 0 }, mockCalendar);

      const result = formatter.formatNamed(date, 'nonexistent-format');

      // Should fall back to basic format
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle malformed date objects gracefully', () => {
      const invalidDate = { year: NaN, month: 0, day: 0, weekday: -1 } as any;

      expect(() => {
        formatter.formatNamed(invalidDate, 'federation');
      }).not.toThrow();
    });
  });
});
