import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import { CalendarDate } from '../src/core/calendar-date';
import { DateFormatter } from '../src/core/date-formatter';

describe('Star Trek Calendar Formatting', () => {
  let engine: CalendarEngine;
  let starTrekCalendar: any;

  beforeEach(async () => {
    // Load the base Gregorian calendar (Star Trek extends from this)
    const fs = await import('fs/promises');
    const path = await import('path');
    const calendarPath = path.resolve(__dirname, '../calendars/gregorian.json');
    const calendarData = await fs.readFile(calendarPath, 'utf-8');
    const baseCalendar = JSON.parse(calendarData);

    // Load the Star Trek dateFormats to test
    const starTrekPath = path.resolve(__dirname, '../calendars/gregorian-star-trek-variants.json');
    const starTrekData = await fs.readFile(starTrekPath, 'utf-8');
    const starTrekVariants = JSON.parse(starTrekData);

    // Extract the Star Trek dateFormats from the federation-standard variant
    const federationVariant = starTrekVariants.variants['federation-standard'];
    const dateFormats = federationVariant?.overrides?.dateFormats;

    // Merge the Star Trek dateFormats into the base calendar for testing
    starTrekCalendar = {
      ...baseCalendar,
      dateFormats: dateFormats,
    };

    // Create engine with the merged calendar
    engine = new CalendarEngine(starTrekCalendar);
  });

  describe('Stardate Helper Tests', () => {
    it('should fail when using unregistered stardate helper', () => {
      // Test date: 2370-01-15 (TNG era)
      const date = new CalendarDate(
        { year: 2370, month: 1, day: 15, weekday: 0 },
        starTrekCalendar
      );

      // This should fail because 'stardate' helper doesn't exist
      // The calendar currently uses {{stardate ...}} instead of {{ss-stardate ...}}
      const result = date.format({ format: 'tng-stardate' });

      // Should return mock result indicating template compilation failed
      expect(result).toBe('mock-template-result');
    });

    it('should fail when using unregistered dateFmt helper', () => {
      // Test date: 2375-06-10 (DS9 era)
      const date = new CalendarDate(
        { year: 2375, month: 6, day: 10, weekday: 0 },
        starTrekCalendar
      );

      // Should fail because 'dateFmt' helper doesn't exist (should be 'ss-dateFmt')
      const result = date.format({ format: 'starfleet' });
      expect(result).toBe('mock-template-result');
    });

    it('should fail when using unregistered time helpers', () => {
      // Test date: 2376-03-20 (Voyager era)
      const date = new CalendarDate(
        {
          year: 2376,
          month: 3,
          day: 20,
          weekday: 0,
          time: { hour: 14, minute: 30, second: 25 },
        },
        starTrekCalendar
      );

      // Should fail because 'hour', 'minute', 'second' helpers don't exist
      // (should be 'ss-hour', 'ss-minute', 'ss-second')
      const result = date.format({ format: 'time' });
      expect(result).toBe('mock-template-result');
    });
  });

  describe('After fixing helper names', () => {
    let helpers: Record<string, Function> = {};

    beforeEach(() => {
      // Reset DateFormatter registration for clean state
      DateFormatter.resetHelpersForTesting();
      helpers = {};

      // Set up Handlebars mock that captures helper registrations
      global.Handlebars = {
        compile: vi.fn((template: string) => {
          return vi.fn((context: any) => {
            // Simple template processing for testing
            let result = template;

            // Replace ss-dateFmt helper calls with embedded format results
            result = result.replace(/\{\{ss-dateFmt:([^}]+)\}\}/g, (match, formatName) => {
              // Get the format from the calendar's dateFormats
              const dateFormats = starTrekCalendar.dateFormats;
              if (dateFormats && dateFormats[formatName]) {
                const embeddedTemplate = dateFormats[formatName];
                // Recursively process the embedded template
                let embeddedResult = embeddedTemplate;

                // Handle ss-stardate in embedded templates
                embeddedResult = embeddedResult.replace(
                  /\{\{ss-stardate year prefix='(\d+)' baseYear=(\d+) dayOfYear=dayOfYear precision=(\d+)\}\}/g,
                  (match, prefix, baseYear, precision) => {
                    const stardateHelper = helpers['ss-stardate'];
                    if (stardateHelper) {
                      return stardateHelper(context.year, {
                        hash: {
                          prefix,
                          baseYear: parseInt(baseYear),
                          dayOfYear: context.dayOfYear,
                          precision: parseInt(precision),
                        },
                      });
                    }
                    return match;
                  }
                );

                return embeddedResult;
              }
              return match;
            });

            // Replace simple helper calls with their results
            result = result.replace(
              /\{\{ss-stardate year prefix='(\d+)' baseYear=(\d+) dayOfYear=dayOfYear precision=(\d+)\}\}/g,
              (match, prefix, baseYear, precision) => {
                const stardateHelper = helpers['ss-stardate'];
                if (stardateHelper) {
                  return stardateHelper(context.year, {
                    hash: {
                      prefix,
                      baseYear: parseInt(baseYear),
                      dayOfYear: context.dayOfYear,
                      precision: parseInt(precision),
                    },
                  });
                }
                return match;
              }
            );

            // Replace time helpers
            result = result.replace(/\{\{ss-hour format='pad'\}\}/g, () => {
              const hourHelper = helpers['ss-hour'];
              if (hourHelper) {
                return hourHelper(context.hour, { hash: { format: 'pad' } });
              }
              return '00';
            });

            result = result.replace(/\{\{ss-minute format='pad'\}\}/g, () => {
              const minuteHelper = helpers['ss-minute'];
              if (minuteHelper) {
                return minuteHelper(context.minute, { hash: { format: 'pad' } });
              }
              return '00';
            });

            result = result.replace(/\{\{ss-second format='pad'\}\}/g, () => {
              const secondHelper = helpers['ss-second'];
              if (secondHelper) {
                return secondHelper(context.second, { hash: { format: 'pad' } });
              }
              return '00';
            });

            // Replace other simple substitutions
            result = result.replace(/\{\{year\}\}/g, context.year?.toString() || '');
            result = result.replace(/\{\{dayOfYear\}\}/g, context.dayOfYear?.toString() || '');

            return result;
          });
        }),
        registerHelper: vi.fn((name: string, helper: Function) => {
          helpers[name] = helper;
        }),
      };

      // Create a DateFormatter to register helpers
      new DateFormatter(starTrekCalendar);
    });

    it('should work after fixing to use ss-stardate helper', () => {
      // Now that we've fixed the calendar JSON to use {{ss-stardate}}
      const date = new CalendarDate(
        { year: 2370, month: 1, day: 15, weekday: 0 },
        starTrekCalendar
      );

      // Debug what's happening
      console.log('Testing stardate format with date:', date);

      // Should not throw and should produce a proper format
      expect(() => {
        date.format({ format: 'tng-stardate' });
      }).not.toThrow();

      const result = date.format({ format: 'tng-stardate' });
      console.log('Stardate result:', result);

      // Should be formatted as a stardate number
      expect(result).not.toBe('mock-template-result');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should work after fixing to use ss-dateFmt and ss-time helpers', () => {
      // Now that we've fixed the calendar JSON to use {{ss-dateFmt}} and {{ss-hour}} etc.
      const date = new CalendarDate(
        {
          year: 2370,
          month: 1,
          day: 15,
          weekday: 0,
          time: { hour: 14, minute: 30, second: 25 },
        },
        starTrekCalendar
      );

      // Should not throw and should produce a proper combined format
      expect(() => {
        date.formatter.formatNamed(date, 'datetime');
      }).not.toThrow();

      const result = date.formatter.formatNamed(date, 'datetime');
      // Should contain 'at' from the template
      expect(result).not.toBe('mock-template-result');
      expect(result).toContain(' at ');
    });

    it('should format starfleet using ss-dateFmt helper', () => {
      const date = new CalendarDate(
        { year: 2370, month: 1, day: 15, weekday: 0 },
        starTrekCalendar
      );

      expect(() => {
        date.formatter.formatNamed(date, 'starfleet');
      }).not.toThrow();

      const result = date.formatter.formatNamed(date, 'starfleet');
      expect(result).not.toBe('mock-template-result');
      expect(result).toContain('Stardate');
    });
  });
});
