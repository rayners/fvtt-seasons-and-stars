/**
 * Date Formatter Integration Tests - Real Handlebars compilation and execution
 *
 * These tests use actual Handlebars compilation to validate that:
 * 1. Calendar JSON templates can be compiled successfully
 * 2. Helper functions work correctly with real template execution
 * 3. Template syntax in calendar files is valid
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Handlebars from 'handlebars';
import { DateFormatter } from '../src/core/date-formatter';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';
import { readFileSync } from 'fs';
import { join } from 'path';

// Use REAL Handlebars for integration testing
global.Handlebars = Handlebars;

describe('DateFormatter Integration Tests', () => {
  let formatter: DateFormatter;
  let testCalendar: SeasonsStarsCalendar;
  let testDate: CalendarDate;

  beforeEach(() => {
    // Reset Handlebars helpers before each test
    DateFormatter.resetHelpersForTesting();

    testCalendar = {
      id: 'integration-test',
      name: 'Integration Test Calendar',
      months: [
        { name: 'January', abbreviation: 'Jan', days: 31 },
        { name: 'February', abbreviation: 'Feb', days: 28 },
        { name: 'March', abbreviation: 'Mar', days: 31 },
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
      year: { prefix: '', suffix: ' CE' },
      time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
      dateFormats: {
        // Test basic helper functionality
        'test-day-ordinal': '{{ss-day format="ordinal"}}',
        'test-day-pad': '{{ss-day format="pad"}}',
        'test-month-name': '{{ss-month format="name"}}',
        'test-month-abbr': '{{ss-month format="abbr"}}',
        'test-weekday-name': '{{ss-weekday format="name"}}',
        'test-math-subtract': '{{ss-math year op="subtract" value=100}}',
        'test-math-add': '{{ss-math dayOfYear op="add" value=50}}',
        'test-time-pad': '{{ss-hour format="pad"}}:{{ss-minute format="pad"}}',

        // Test format embedding
        'test-embed-simple':
          'Date: {{ss-dateFmt formatName="test-day-ordinal"}} {{ss-dateFmt formatName="test-month-name"}}',
        'test-embed-complex':
          '{{ss-dateFmt formatName="test-weekday-name"}}, {{ss-dateFmt formatName="test-embed-simple"}} {{year}} CE',

        // Test real-world scenarios
        'iso-format': '{{year}}-{{ss-month format="pad"}}-{{ss-day format="pad"}}',
        'full-date':
          '{{ss-weekday format="name"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}} {{year}} CE',
        'time-format':
          '{{ss-hour format="pad"}}:{{ss-minute format="pad"}}:{{ss-second format="pad"}}',
      },
    } as SeasonsStarsCalendar;

    testDate = {
      year: 2024,
      month: 1, // January
      day: 15,
      weekday: 1, // Monday
      time: {
        hour: 14,
        minute: 30,
        second: 45,
      },
    } as CalendarDate;

    formatter = new DateFormatter(testCalendar);
  });

  describe('Real Handlebars Template Compilation', () => {
    it('should compile and execute basic helper templates', () => {
      const ordinalResult = formatter.formatNamed(testDate, 'test-day-ordinal');
      expect(ordinalResult).toBe('15th');

      const padResult = formatter.formatNamed(testDate, 'test-day-pad');
      expect(padResult).toBe('15');

      const monthNameResult = formatter.formatNamed(testDate, 'test-month-name');
      expect(monthNameResult).toBe('January');

      const monthAbbrResult = formatter.formatNamed(testDate, 'test-month-abbr');
      expect(monthAbbrResult).toBe('Jan');

      const weekdayResult = formatter.formatNamed(testDate, 'test-weekday-name');
      expect(weekdayResult).toBe('Monday');
    });

    it('should execute math operations correctly', () => {
      const subtractResult = formatter.formatNamed(testDate, 'test-math-subtract');
      expect(subtractResult).toBe('1924'); // 2024 - 100

      const addResult = formatter.formatNamed(testDate, 'test-math-add');
      expect(addResult).toBe('65'); // 15 (day of year) + 50
    });

    it('should handle time formatting with padding', () => {
      const timeResult = formatter.formatNamed(testDate, 'test-time-pad');
      expect(timeResult).toBe('14:30');
    });

    it('should execute format embedding correctly', () => {
      const simpleEmbed = formatter.formatNamed(testDate, 'test-embed-simple');
      expect(simpleEmbed).toBe('Date: 15th January');

      const complexEmbed = formatter.formatNamed(testDate, 'test-embed-complex');
      expect(complexEmbed).toBe('Monday, Date: 15th January 2024 CE');
    });

    it('should handle ISO date formatting', () => {
      const isoResult = formatter.formatNamed(testDate, 'iso-format');
      expect(isoResult).toBe('2024-01-15');
    });

    it('should handle full date formatting', () => {
      const fullResult = formatter.formatNamed(testDate, 'full-date');
      expect(fullResult).toBe('Monday, 15th January 2024 CE');
    });

    it('should handle time formatting with seconds', () => {
      const timeResult = formatter.formatNamed(testDate, 'time-format');
      expect(timeResult).toBe('14:30:45');
    });
  });

  describe('Calendar JSON Template Validation', () => {
    it('should validate Eberron calendar templates compile successfully', () => {
      try {
        const eberronPath = join(process.cwd(), 'calendars', 'eberron.json');
        const eberronCalendar = JSON.parse(
          readFileSync(eberronPath, 'utf8')
        ) as SeasonsStarsCalendar;

        if (eberronCalendar.dateFormats) {
          const formatter = new DateFormatter(eberronCalendar);

          // Test a few key formats to ensure they compile and execute
          const testDate = {
            year: 998,
            month: 1,
            day: 15,
            weekday: 1,
            time: { hour: 12, minute: 30, second: 0 },
          } as CalendarDate;

          // Test formats that were fixed for syntax
          expect(() => formatter.formatNamed(testDate, 'week-number')).not.toThrow();
          expect(() => formatter.formatNamed(testDate, 'historical')).not.toThrow();
          expect(() => formatter.formatNamed(testDate, 'treaty')).not.toThrow();

          // Verify the math operations work correctly
          const weekNumber = formatter.formatNamed(testDate, 'week-number');
          expect(weekNumber).toContain('Week');
          expect(weekNumber).toContain('998 YK');

          const historical = formatter.formatNamed(testDate, 'historical');
          expect(historical).toContain('104 years'); // 998 - 894

          const treaty = formatter.formatNamed(testDate, 'treaty');
          expect(treaty).toContain('+2'); // 998 - 996
        }
      } catch (error) {
        throw new Error(`Eberron calendar template validation failed: ${error.message}`);
      }
    });

    it('should validate Star Trek calendar templates compile successfully', () => {
      try {
        const starTrekPath = join(process.cwd(), 'calendars', 'gregorian-star-trek-variants.json');
        const starTrekVariants = JSON.parse(readFileSync(starTrekPath, 'utf8'));

        // Get the Star Trek variant from the variants object
        const starTrekCalendar = starTrekVariants.variants?.['star-trek-calendar'];
        if (starTrekCalendar?.overrides?.dateFormats) {
          // Create a test calendar by merging base Gregorian with Star Trek overrides
          const gregorianPath = join(process.cwd(), 'calendars', 'gregorian.json');
          const baseCalendar = JSON.parse(
            readFileSync(gregorianPath, 'utf8')
          ) as SeasonsStarsCalendar;

          // Apply Star Trek overrides
          const testCalendar = {
            ...baseCalendar,
            id: 'star-trek-test',
            dateFormats: starTrekCalendar.overrides.dateFormats,
          };

          const formatter = new DateFormatter(testCalendar);

          const testDate = {
            year: 2370,
            month: 1,
            day: 15,
            weekday: 1,
            time: { hour: 12, minute: 30, second: 0 },
          } as CalendarDate;

          // Test formats that were fixed for syntax
          expect(() => formatter.formatNamed(testDate, 'tos-stardate')).not.toThrow();
          expect(() => formatter.formatNamed(testDate, 'tng-stardate')).not.toThrow();
          expect(() => formatter.formatNamed(testDate, 'ds9-stardate')).not.toThrow();

          // Verify the stardate calculations work
          const tosStardate = formatter.formatNamed(testDate, 'tos-stardate');
          expect(tosStardate).toContain('1070.15'); // (2370-1300).15

          const tngStardate = formatter.formatNamed(testDate, 'tng-stardate');
          expect(tngStardate).toContain('47000.'); // prefix 47 + (2370-2370) + day
        }
      } catch (error) {
        throw new Error(`Star Trek calendar template validation failed: ${error.message}`);
      }
    });

    it('should compile all calendar templates without syntax errors', () => {
      const calendarFiles = [
        'eberron.json',
        'gregorian.json',
        'starfinder-absalom-station.json',
        'traveller-imperial.json',
      ];

      calendarFiles.forEach(filename => {
        try {
          const calendarPath = join(process.cwd(), 'calendars', filename);
          const calendar = JSON.parse(readFileSync(calendarPath, 'utf8')) as SeasonsStarsCalendar;

          if (calendar.dateFormats) {
            Object.entries(calendar.dateFormats).forEach(([formatName, template]) => {
              if (typeof template === 'string') {
                try {
                  // Test that the template can be compiled
                  Handlebars.compile(template);
                } catch (compileError) {
                  throw new Error(
                    `Template '${formatName}' in ${filename} has syntax error: ${compileError.message}`
                  );
                }
              }
            });
          }
        } catch (error) {
          throw new Error(`Calendar ${filename} validation failed: ${error.message}`);
        }
      });
    });
  });

  describe('Error Handling with Real Templates', () => {
    it('should handle template compilation errors gracefully', () => {
      // Create a calendar with intentionally bad template syntax (unclosed quote)
      const badCalendar = {
        ...testCalendar,
        dateFormats: {
          'bad-template': '{{ss-day format="unclosed-quote}}',
        },
      };

      const badFormatter = new DateFormatter(badCalendar);

      // Should not throw, should fallback to basic format
      const result = badFormatter.formatNamed(testDate, 'bad-template');
      expect(result).toContain('Monday'); // Should fallback to basic format
      expect(result).toContain('15th');
      expect(result).toContain('January');
    });

    it('should handle missing helper gracefully', () => {
      const testTemplate = '{{ss-nonexistent-helper value}}';

      // Should not throw, should fallback to basic format
      const result = formatter.format(testDate, testTemplate);
      expect(result).toContain('Monday'); // Should fallback to basic format
    });
  });

  describe('Performance with Real Templates', () => {
    it('should cache compiled templates for performance', () => {
      const template = '{{ss-day day format="ordinal"}} {{ss-month month format="name"}}';

      // First compilation
      const start1 = performance.now();
      const result1 = formatter.format(testDate, template);
      const time1 = performance.now() - start1;

      // Second execution (should use cache)
      const start2 = performance.now();
      const result2 = formatter.format(testDate, template);
      const time2 = performance.now() - start2;

      expect(result1).toBe(result2);
      expect(result1).toBe('15th January');

      // Second execution should be faster due to caching
      // Allow for some variance in timing
      expect(time2).toBeLessThan(time1 * 2);
    });
  });
});
