import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarManager } from '../src/core/calendar-manager';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

/**
 * Test for calendar variant dateFormats override functionality
 *
 * This test validates the fix for a bug where calendar variants' dateFormats
 * overrides were not being applied, causing mini widgets to show incorrect
 * formatting (e.g., "30 Dec 0" instead of "SD 47015.0" for Star Trek calendars).
 */
describe('Calendar Variant DateFormats Override', () => {
  let calendarManager: CalendarManager;
  const mockHelpers: Record<string, Function> = {};

  beforeEach(() => {
    // Mock Handlebars
    global.Handlebars = {
      compile: vi.fn((template: string) => {
        return vi.fn((context: any) => {
          // Simple template processing for testing
          let result = template;

          // Replace ss-dateFmt calls - need to handle formatName parameter syntax
          result = result.replace(
            /\{\{ss-dateFmt formatName="([^"]+)"\}\}/g,
            (match, formatName) => {
              if (formatName === 'tng-stardate') {
                // Mock stardate calculation: should return something like "47015.0"
                const stardate = `${47000 + Math.floor(context.dayOfYear || 15)}.0`;
                return stardate;
              }
              return match;
            }
          );

          // Replace ss-stardate helper calls
          result = result.replace(
            /\{\{ss-stardate year prefix="([^"]+)" baseYear=(\d+) dayOfYear=dayOfYear precision=(\d+)\}\}/g,
            (match, prefix, baseYear, precision) => {
              if (mockHelpers['ss-stardate']) {
                return mockHelpers['ss-stardate'](context.year, {
                  hash: {
                    prefix,
                    baseYear: parseInt(baseYear),
                    dayOfYear: context.dayOfYear,
                    precision: parseInt(precision),
                  },
                });
              }
              // Fallback manual calculation
              const yearOffset = context.year - parseInt(baseYear);
              const stardatePrefix = parseInt(prefix) + yearOffset;
              const paddedDayOfYear = (context.dayOfYear || 15).toString().padStart(3, '0');
              return `${stardatePrefix}${paddedDayOfYear}.${precision > 0 ? '0'.repeat(precision) : '0'}`;
            }
          );

          return result;
        });
      }),
      registerHelper: vi.fn((name: string, helper: Function) => {
        mockHelpers[name] = helper;
      }),
    };

    // Create calendar manager
    calendarManager = new CalendarManager();
  });

  it('should apply dateFormats overrides from calendar variants', () => {
    // Create a mock base Gregorian calendar
    const baseCalendar: SeasonsStarsCalendar = {
      id: 'gregorian',
      name: 'Gregorian Calendar',
      description: 'Standard Gregorian calendar',
      author: 'Test',
      version: '1.0.0',
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
      translations: {
        en: {
          label: 'Gregorian Calendar',
          description: 'Standard Gregorian calendar',
        },
      },
      // No dateFormats in base calendar
      variants: {
        'federation-standard': {
          name: 'Federation Standard Calendar',
          description: 'United Federation of Planets standard calendar',
          config: { yearOffset: 2161 },
          overrides: {
            dateFormats: {
              'tng-stardate':
                '{{ss-stardate year prefix="47" baseYear=2370 dayOfYear=dayOfYear precision=1}}',
              widgets: {
                mini: 'SD {{ss-dateFmt formatName="tng-stardate"}}',
                main: '{{ss-weekday format="abbr"}}, {{ss-month format="name"}} {{ss-day format="ordinal"}}',
                grid: '{{ss-day}}',
              },
            },
          },
        },
      },
    };

    // Load the base calendar
    calendarManager.loadCalendar(baseCalendar);

    // Check if federation-standard variant was created
    const federationCalendar = calendarManager.calendars.get('gregorian(federation-standard)');

    expect(federationCalendar).toBeDefined();

    if (!federationCalendar) {
      throw new Error('Federation standard calendar not found');
    }

    console.log('Federation calendar dateFormats:', federationCalendar.dateFormats);

    // Check if dateFormats were applied from the variant
    expect(federationCalendar.dateFormats).toBeDefined();
    expect(federationCalendar.dateFormats?.widgets).toBeDefined();
    expect(federationCalendar.dateFormats?.widgets?.mini).toBeDefined();
    expect(federationCalendar.dateFormats?.widgets?.mini).toBe(
      'SD {{ss-dateFmt formatName="tng-stardate"}}'
    );
  });

  it('should format mini widget using variant dateFormats', () => {
    // Create the calendar as before
    const baseCalendar: SeasonsStarsCalendar = {
      id: 'gregorian',
      name: 'Gregorian Calendar',
      description: 'Standard Gregorian calendar',
      author: 'Test',
      version: '1.0.0',
      months: [
        { name: 'January', abbreviation: 'Jan', days: 31 },
        { name: 'December', abbreviation: 'Dec', days: 31 },
      ],
      weekdays: [{ name: 'Sunday', abbreviation: 'Sun' }],
      year: { prefix: '', suffix: '' },
      translations: {
        en: {
          label: 'Gregorian Calendar',
          description: 'Standard Gregorian calendar',
        },
      },
      variants: {
        'federation-standard': {
          name: 'Federation Standard Calendar',
          description: 'United Federation of Planets standard calendar',
          config: { yearOffset: 2161 },
          overrides: {
            dateFormats: {
              'tng-stardate':
                '{{ss-stardate year prefix="47" baseYear=2370 dayOfYear=dayOfYear precision=1}}',
              widgets: {
                mini: 'SD {{ss-dateFmt formatName="tng-stardate"}}',
                main: '{{ss-weekday format="abbr"}}, {{ss-month format="name"}} {{ss-day format="ordinal"}}',
                grid: '{{ss-day}}',
              },
            },
          },
        },
      },
    };

    calendarManager.loadCalendar(baseCalendar);

    // Get the federation variant
    const federationCalendar = calendarManager.calendars.get('gregorian(federation-standard)');

    if (!federationCalendar) {
      throw new Error('Federation standard calendar not found');
    }

    // Create a test date
    const testDate = new CalendarDate(
      { year: 2370, month: 1, day: 15, weekday: 0 },
      federationCalendar
    );

    // Test the mini widget format
    const result = testDate.toShortString();

    console.log('Mini widget result:', result);
    console.log('Federation calendar dateFormats:', federationCalendar.dateFormats);

    // Should show "SD 47015.0" format instead of "30 Dec 0"
    expect(result).toMatch(/SD \d+\.\d/);
    expect(result).not.toBe('30 Dec 0');
  });
});
