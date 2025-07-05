/**
 * Comprehensive tests for Star Trek calendar variants
 * Tests actual date formatting functionality with all variants
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import { CalendarDate } from '../src/core/calendar-date';
import { DateFormatter } from '../src/core/date-formatter';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

describe('Star Trek Calendar Comprehensive Tests', () => {
  let mockCalendar: SeasonsStarsCalendar;
  let formatter: DateFormatter;
  let starTrekFormats: any;
  let realHandlebars: any;

  beforeEach(async () => {
    // Reset helper registration
    DateFormatter.resetHelpersForTesting();

    // Save real Handlebars functionality for this test
    const originalCompile = global.Handlebars?.compile;
    const originalRegisterHelper = global.Handlebars?.registerHelper;

    // Create a real Handlebars-like implementation for testing
    const helpers: Record<string, Function> = {};
    const templates: Map<string, Function> = new Map();

    realHandlebars = {
      compile: (template: string) => {
        if (templates.has(template)) {
          return templates.get(template);
        }

        const compiledTemplate = (context: any) => {
          let result = template;

          // First pass: Handle complex helper calls with parameters
          // Like {{ss-stardate year prefix='47' baseYear=2370 dayOfYear=dayOfYear precision=1}}
          result = result.replace(
            /\{\{\s*(\w+(?:-\w+)*)\s+([^}]+)\}\}/g,
            (match, helperName, params) => {
              const helper = helpers[helperName];
              if (!helper) return match;

              // Parse parameters
              const args: any[] = [];
              const options: any = { hash: {}, data: { root: context } };

              // Better parameter parsing that handles quotes and variable references
              const parts = [];
              let current = '';
              let inQuotes = false;
              let quoteChar = '';

              for (let i = 0; i < params.length; i++) {
                const char = params[i];
                if ((char === '"' || char === "'") && !inQuotes) {
                  inQuotes = true;
                  quoteChar = char;
                  current += char;
                } else if (char === quoteChar && inQuotes) {
                  inQuotes = false;
                  current += char;
                } else if (char === ' ' && !inQuotes) {
                  if (current.trim()) {
                    parts.push(current.trim());
                    current = '';
                  }
                } else {
                  current += char;
                }
              }
              if (current.trim()) parts.push(current.trim());

              for (const part of parts) {
                if (part.includes('=')) {
                  const [key, value] = part.split('=');
                  let parsedValue = value.replace(/^['"]|['"]$/g, '');
                  if (!isNaN(Number(parsedValue))) {
                    parsedValue = Number(parsedValue);
                  } else if (context[parsedValue] !== undefined) {
                    parsedValue = context[parsedValue];
                  }
                  options.hash[key] = parsedValue;
                } else {
                  let argValue = part.replace(/^['"]|['"]$/g, '');
                  if (!isNaN(Number(argValue))) {
                    argValue = Number(argValue);
                  } else if (context[argValue] !== undefined) {
                    argValue = context[argValue];
                  }
                  args.push(argValue);
                }
              }

              try {
                return helper(...args, options);
              } catch (error) {
                console.warn(`Helper ${helperName} failed:`, error);
                return match;
              }
            }
          );

          // Second pass: Handle helper calls with colon syntax like {{ss-month:abbr}}
          result = result.replace(
            /\{\{\s*(\w+(?:-\w+)*):(\w+)\s*\}\}/g,
            (match, helperName, format) => {
              const helper = helpers[helperName];
              if (!helper) return match;

              const options: any = { hash: { format }, data: { root: context } };

              try {
                // For these helpers, pass the context value as first arg
                let value = undefined;
                if (helperName === 'ss-month') value = context.month;
                else if (helperName === 'ss-day') value = context.day;
                else if (helperName === 'ss-weekday') value = context.weekday;
                else if (helperName === 'ss-hour') value = context.hour;
                else if (helperName === 'ss-minute') value = context.minute;
                else if (helperName === 'ss-second') value = context.second;

                return helper(value, options);
              } catch (error) {
                console.warn(`Helper ${helperName} failed:`, error);
                return match;
              }
            }
          );

          // Handle helper calls with format attribute like {{ss-hour format='pad'}}
          result = result.replace(
            /\{\{\s*(\w+(?:-\w+)*)\s+format=['"]([^'"]+)['"]\s*\}\}/g,
            (match, helperName, format) => {
              const helper = helpers[helperName];
              if (!helper) return match;

              const options: any = { hash: { format }, data: { root: context } };

              try {
                // For these helpers, pass the context value as first arg
                let value = undefined;
                if (helperName === 'ss-hour') value = context.hour;
                else if (helperName === 'ss-minute') value = context.minute;
                else if (helperName === 'ss-second') value = context.second;

                return helper(value, options);
              } catch (error) {
                console.warn(`Helper ${helperName} failed:`, error);
                return match;
              }
            }
          );

          // Third pass: Handle simple helper calls like {{ss-day}}
          result = result.replace(/\{\{\s*(\w+(?:-\w+)*)\s*\}\}/g, (match, helperName) => {
            const helper = helpers[helperName];
            if (helper) {
              const options: any = { hash: {}, data: { root: context } };

              try {
                // For these helpers, pass the context value as first arg
                let value = undefined;
                if (helperName === 'ss-month') value = context.month;
                else if (helperName === 'ss-day') value = context.day;
                else if (helperName === 'ss-weekday') value = context.weekday;
                else if (helperName === 'ss-hour') value = context.hour;
                else if (helperName === 'ss-minute') value = context.minute;
                else if (helperName === 'ss-second') value = context.second;

                return helper(value, options);
              } catch (error) {
                console.warn(`Helper ${helperName} failed:`, error);
                return match;
              }
            }

            // Simple variable replacement for context values
            return context[helperName] || '';
          });

          return result;
        };

        templates.set(template, compiledTemplate);
        return compiledTemplate;
      },

      registerHelper: (name: string, helper: Function) => {
        helpers[name] = helper;
      },
    };

    // Replace global Handlebars for this test
    global.Handlebars = realHandlebars;

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
      dateFormats: starTrekFormats,
    } as SeasonsStarsCalendar;

    // Create formatter to register helpers
    formatter = new DateFormatter(mockCalendar);
  });

  describe('Federation Standard Date Formats', () => {
    it('should format federation standard date correctly', () => {
      const date = new CalendarDate({ year: 2370, month: 1, day: 15, weekday: 1 }, mockCalendar);

      const result = formatter.formatNamed(date, 'federation');

      // Should be in format: Jan 15, 2370
      expect(result).toMatch(/^[A-Za-z]{3} \d{1,2}, \d{4}$/);
      expect(result).toContain('Jan');
      expect(result).toContain('15');
      expect(result).toContain('2370');
    });

    it('should format short date correctly', () => {
      const date = new CalendarDate({ year: 2375, month: 6, day: 10, weekday: 3 }, mockCalendar);

      const result = formatter.formatNamed(date, 'short');

      // Should be in format: Jun 10
      expect(result).toMatch(/^[A-Za-z]{3} \d{1,2}$/);
      expect(result).toContain('Jun');
      expect(result).toContain('10');
    });

    it('should format long date correctly', () => {
      const date = new CalendarDate({ year: 2376, month: 3, day: 20, weekday: 0 }, mockCalendar);

      const result = formatter.formatNamed(date, 'long');

      // Should be in format: Sunday, March 20th, 2376
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

      // Should be in format: 09:05:03 UTC
      expect(result).toBe('09:05:03 UTC');
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

      // Should be in format: 14:30:45 UTC
      expect(result).toBe('14:30:45 UTC');
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

      // Should default to 00:00:00
      expect(result).toBe('00:00:00 UTC');
    });
  });

  describe('Combined Formats', () => {
    it('should format starfleet command format correctly', () => {
      const date = new CalendarDate({ year: 2370, month: 1, day: 15, weekday: 0 }, mockCalendar);

      const result = formatter.formatNamed(date, 'starfleet');

      // Should be in format: Stardate 47015.0
      expect(result).toContain('Stardate');
      expect(result).toMatch(/Stardate 47\d{3}\.\d/);
    });

    it('should format diplomatic format correctly', () => {
      const date = new CalendarDate({ year: 2370, month: 1, day: 15, weekday: 0 }, mockCalendar);

      const result = formatter.formatNamed(date, 'diplomatic');

      // Should be in format: Jan 15, 2370 (47015.0)
      expect(result).toContain('Jan 15, 2370');
      expect(result).toContain('(');
      expect(result).toContain(')');
      expect(result).toMatch(/\(47\d{3}\.\d\)/);
    });

    it('should format official Federation date correctly', () => {
      const date = new CalendarDate({ year: 2370, month: 1, day: 15, weekday: 0 }, mockCalendar);

      const result = formatter.formatNamed(date, 'official');

      // Should be in format: Federation Standard Date: January 15th, 2370
      expect(result).toContain('Federation Standard Date:');
      expect(result).toContain('January');
      expect(result).toContain('15th');
      expect(result).toContain('2370');
    });
  });

  describe('Widget Formats', () => {
    it('should format mini widget correctly', () => {
      const date = new CalendarDate({ year: 2370, month: 1, day: 15, weekday: 0 }, mockCalendar);

      const result = formatter.formatWidget(date, 'mini');

      // Should be in format: SD 47015.0
      expect(result).toMatch(/^SD 47\d{3}\.\d$/);
      expect(result).toContain('SD');
    });

    it('should format main widget correctly', () => {
      const date = new CalendarDate({ year: 2370, month: 1, day: 15, weekday: 1 }, mockCalendar);

      const result = formatter.formatWidget(date, 'main');

      // Should be in format: Mon, January 15th
      expect(result).toContain('Mon');
      expect(result).toContain('January');
      expect(result).toContain('15th');
    });

    it('should format grid widget correctly', () => {
      const date = new CalendarDate({ year: 2370, month: 1, day: 15, weekday: 0 }, mockCalendar);

      const result = formatter.formatWidget(date, 'grid');

      // Should be just the day number
      expect(result).toBe('15');
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
