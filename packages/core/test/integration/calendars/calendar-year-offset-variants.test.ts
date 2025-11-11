import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use real TestLogger instead of mocks for better testing
import { TestLogger } from '../../../utils/test-logger';
vi.mock('../../../src/core/logger', () => ({
  Logger: TestLogger,
}));

import { CalendarManager } from '../../../src/core/calendar-manager';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';

// Mock foundry environment and dependencies
vi.stubGlobal('game', {
  settings: {
    get: vi.fn(),
    set: vi.fn(),
  },
  modules: new Map([['seasons-and-stars', { id: 'seasons-and-stars', active: true }]]),
});
vi.stubGlobal('Hooks', {
  callAll: vi.fn(),
  on: vi.fn(),
});

// Mock CalendarValidator
vi.mock('../../../src/core/calendar-validator', () => ({
  CalendarValidator: {
    validate: vi.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    }),
    validateWithHelp: vi.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    }),
  },
}));

// Mock CalendarLocalization
vi.mock('../../../src/core/calendar-localization', () => ({
  CalendarLocalization: {
    getCalendarLabel: vi.fn().mockReturnValue('Test Calendar'),
  },
}));

describe('Calendar Year Offset Variants Bug Fix', () => {
  let calendarManager: CalendarManager;

  beforeEach(() => {
    vi.clearAllMocks();
    TestLogger.clearLogs();
    calendarManager = new CalendarManager();
  });

  describe('Year Offset Config Application', () => {
    it('should apply yearOffset config to variant calendar year.epoch', () => {
      // Arrange: Create a calendar with variants that have different yearOffset values
      const testCalendar: SeasonsStarsCalendar = {
        id: 'test-calendar',
        translations: {
          en: { label: 'Test Calendar', description: 'Test calendar' },
        },
        months: [
          { name: 'January', abbreviation: 'Jan', days: 31 },
          { name: 'February', abbreviation: 'Feb', days: 28 },
        ],
        weekdays: [
          { name: 'Sunday', abbreviation: 'Sun' },
          { name: 'Monday', abbreviation: 'Mon' },
        ],
        year: {
          epoch: 1000,
          currentYear: 2000,
          suffix: ' TC',
        },
        leapYear: {
          rule: 'none',
        },
        worldTime: {
          interpretation: 'epoch-based',
          epochYear: 1000,
          currentYear: 2000,
        },
        intercalary: [],
        time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
        variants: {
          'high-epoch': {
            name: 'High Epoch Variant',
            description: 'Variant with higher year offset',
            config: {
              yearOffset: 3000, // Should set epoch to 3000 (difference of +2000)
            },
            overrides: {
              year: {
                suffix: ' HE',
              },
            },
          },
          'low-epoch': {
            name: 'Low Epoch Variant',
            description: 'Variant with lower year offset',
            config: {
              yearOffset: 500, // Should set epoch to 500 (difference of -500)
            },
            overrides: {
              year: {
                suffix: ' LE',
              },
            },
          },
        },
      };

      // Act: Load the calendar
      calendarManager.loadCalendar(testCalendar);

      // Assert: Check that variants have correct year epochs
      const highEpochVariant = calendarManager.calendars.get('test-calendar(high-epoch)');
      const lowEpochVariant = calendarManager.calendars.get('test-calendar(low-epoch)');

      expect(highEpochVariant).toBeDefined();
      expect(lowEpochVariant).toBeDefined();

      // FAILING TEST: These should apply yearOffset config but currently don't
      expect(highEpochVariant?.year.epoch).toBe(3000);
      expect(highEpochVariant?.year.currentYear).toBe(4000); // base 2000 + offset difference +2000
      expect(highEpochVariant?.worldTime?.epochYear).toBe(3000);
      expect(highEpochVariant?.worldTime?.currentYear).toBe(4000);

      expect(lowEpochVariant?.year.epoch).toBe(500);
      expect(lowEpochVariant?.year.currentYear).toBe(1500); // base 2000 + offset difference -500
      expect(lowEpochVariant?.worldTime?.epochYear).toBe(500);
      expect(lowEpochVariant?.worldTime?.currentYear).toBe(1500);

      // Overrides should still work
      expect(highEpochVariant?.year.suffix).toBe(' HE');
      expect(lowEpochVariant?.year.suffix).toBe(' LE');
    });

    it('should handle negative year offsets correctly', () => {
      // Arrange: Test calendar with negative year offset
      const testCalendar: SeasonsStarsCalendar = {
        id: 'test-calendar',
        translations: {
          en: { label: 'Test Calendar', description: 'Test calendar' },
        },
        months: [{ name: 'January', abbreviation: 'Jan', days: 31 }],
        weekdays: [{ name: 'Sunday', abbreviation: 'Sun' }],
        year: {
          epoch: 100,
          currentYear: 200,
          suffix: ' TC',
        },
        leapYear: {
          rule: 'none',
        },
        worldTime: {
          interpretation: 'epoch-based',
          epochYear: 100,
          currentYear: 200,
        },
        intercalary: [],
        time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
        variants: {
          'negative-offset': {
            name: 'Negative Offset Variant',
            description: 'Variant with negative year offset like Earth Historical',
            config: {
              yearOffset: -50, // Should set epoch to -50 (difference of -150)
            },
            overrides: {
              year: {
                suffix: ' BCE',
              },
            },
          },
        },
      };

      // Act: Load the calendar
      calendarManager.loadCalendar(testCalendar);

      // Assert: Check that negative offset is applied correctly
      const negativeVariant = calendarManager.calendars.get('test-calendar(negative-offset)');

      expect(negativeVariant).toBeDefined();

      // FAILING TEST: Should handle negative offsets
      expect(negativeVariant?.year.epoch).toBe(-50);
      expect(negativeVariant?.year.currentYear).toBe(50); // base 200 + offset difference -150
      expect(negativeVariant?.worldTime?.epochYear).toBe(-50);
      expect(negativeVariant?.worldTime?.currentYear).toBe(50);
      expect(negativeVariant?.year.suffix).toBe(' BCE');
    });

    it('should not modify variants without yearOffset config', () => {
      // Arrange: Test calendar with variant that has no yearOffset
      const testCalendar: SeasonsStarsCalendar = {
        id: 'test-calendar',
        translations: {
          en: { label: 'Test Calendar', description: 'Test calendar' },
        },
        months: [{ name: 'January', abbreviation: 'Jan', days: 31 }],
        weekdays: [{ name: 'Sunday', abbreviation: 'Sun' }],
        year: {
          epoch: 1000,
          currentYear: 2000,
          suffix: ' TC',
        },
        leapYear: {
          rule: 'none',
        },
        worldTime: {
          interpretation: 'epoch-based',
          epochYear: 1000,
          currentYear: 2000,
        },
        intercalary: [],
        time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
        variants: {
          'no-offset': {
            name: 'No Offset Variant',
            description: 'Variant without year offset config',
            overrides: {
              year: {
                suffix: ' NO',
              },
            },
          },
        },
      };

      // Act: Load the calendar
      calendarManager.loadCalendar(testCalendar);

      // Assert: Variant without yearOffset should keep base calendar years
      const noOffsetVariant = calendarManager.calendars.get('test-calendar(no-offset)');

      expect(noOffsetVariant).toBeDefined();
      expect(noOffsetVariant?.year.epoch).toBe(1000); // Should remain same as base
      expect(noOffsetVariant?.year.currentYear).toBe(2000); // Should remain same as base
      expect(noOffsetVariant?.worldTime?.epochYear).toBe(1000);
      expect(noOffsetVariant?.worldTime?.currentYear).toBe(2000);
      expect(noOffsetVariant?.year.suffix).toBe(' NO'); // Override should still work
    });

    it('should handle yearOffset config for calendars without worldTime property', () => {
      // Arrange: Test calendar WITHOUT worldTime property (like Gregorian)
      const testCalendar: SeasonsStarsCalendar = {
        id: 'test-calendar-no-worldtime',
        translations: {
          en: { label: 'Test Calendar', description: 'Test calendar without worldTime' },
        },
        months: [{ name: 'January', abbreviation: 'Jan', days: 31 }],
        weekdays: [{ name: 'Sunday', abbreviation: 'Sun' }],
        year: {
          epoch: 1000,
          currentYear: 2000,
          suffix: ' TC',
        },
        leapYear: {
          rule: 'none',
        },
        // NO worldTime property
        intercalary: [],
        time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
        variants: {
          'offset-variant': {
            name: 'Offset Variant',
            description: 'Variant with year offset but no worldTime',
            config: {
              yearOffset: 1500, // Should set epoch to 1500 (difference of +500)
            },
            overrides: {
              year: {
                suffix: ' OV',
              },
            },
          },
        },
      };

      // Act: Load the calendar - this should NOT crash
      expect(() => {
        calendarManager.loadCalendar(testCalendar);
      }).not.toThrow();

      // Assert: Year offset should still be applied even without worldTime
      const offsetVariant = calendarManager.calendars.get(
        'test-calendar-no-worldtime(offset-variant)'
      );

      expect(offsetVariant).toBeDefined();
      expect(offsetVariant?.year.epoch).toBe(1500);
      expect(offsetVariant?.year.currentYear).toBe(2500); // base 2000 + offset difference +500
      expect(offsetVariant?.year.suffix).toBe(' OV'); // Override should still work
      expect(offsetVariant?.worldTime).toBeUndefined(); // Should remain undefined
    });
  });

  describe('Golarion Calendar Variants Integration', () => {
    it('should apply correct year offsets for Golarion calendar variants', () => {
      // Arrange: Create simplified Golarion calendar with the actual variant configs
      const golarionCalendar: SeasonsStarsCalendar = {
        id: 'golarion-pf2e',
        translations: {
          en: { label: 'Golarion Calendar', description: 'Pathfinder calendar' },
        },
        months: [
          { name: 'Abadius', abbreviation: 'Aba', days: 31 },
          { name: 'Calistril', abbreviation: 'Cal', days: 28 },
        ],
        weekdays: [
          { name: 'Moonday', abbreviation: 'Mo' },
          { name: 'Toilday', abbreviation: 'To' },
        ],
        year: {
          epoch: 2700,
          currentYear: 4725,
          suffix: ' AR',
        },
        leapYear: {
          rule: 'gregorian',
          month: 'Calistril',
          extraDays: 1,
        },
        worldTime: {
          interpretation: 'epoch-based',
          epochYear: 2700,
          currentYear: 4725,
        },
        intercalary: [],
        time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
        variants: {
          'absalom-reckoning': {
            name: 'Absalom Reckoning',
            description: 'Standard Pathfinder Society calendar',
            default: true,
            config: {
              yearOffset: 2700, // Same as base
            },
            overrides: {
              year: {
                suffix: ' AR',
              },
            },
          },
          'imperial-calendar': {
            name: 'Imperial Calendar',
            description: 'Chelish Imperial dating system',
            config: {
              yearOffset: 5200, // +2500 years from base
            },
            overrides: {
              year: {
                suffix: ' IC',
              },
            },
          },
          'earth-historical': {
            name: 'Earth Historical (AD)',
            description: 'Earth Anno Domini calendar',
            config: {
              yearOffset: -95, // -2795 years from base
            },
            overrides: {
              year: {
                suffix: ' AD',
              },
            },
          },
        },
      };

      // Act: Load the calendar
      calendarManager.loadCalendar(golarionCalendar);

      // Assert: Check that each variant has correct year offsets
      const absalomVariant = calendarManager.calendars.get('golarion-pf2e(absalom-reckoning)');
      const imperialVariant = calendarManager.calendars.get('golarion-pf2e(imperial-calendar)');
      const earthVariant = calendarManager.calendars.get('golarion-pf2e(earth-historical)');

      expect(absalomVariant).toBeDefined();
      expect(imperialVariant).toBeDefined();
      expect(earthVariant).toBeDefined();

      // FAILING TESTS: Year offsets should be correctly applied

      // Absalom Reckoning: same as base (no change)
      expect(absalomVariant?.year.epoch).toBe(2700);
      expect(absalomVariant?.year.currentYear).toBe(4725);
      expect(absalomVariant?.year.suffix).toBe(' AR');

      // Imperial Calendar: +2500 years from base
      expect(imperialVariant?.year.epoch).toBe(5200);
      expect(imperialVariant?.year.currentYear).toBe(7225); // 4725 + 2500
      expect(imperialVariant?.year.suffix).toBe(' IC');

      // Earth Historical: -2795 years from base
      expect(earthVariant?.year.epoch).toBe(-95);
      expect(earthVariant?.year.currentYear).toBe(1930); // 4725 - 2795
      expect(earthVariant?.year.suffix).toBe(' AD');
    });

    it('should demonstrate the user-reported bug with Imperial Calendar', () => {
      // This test specifically demonstrates the bug reported in issue #141
      // When switching from AR to IC, the year should change by +2500

      // Arrange: Simplified calendar to focus on the bug
      const golarionCalendar: SeasonsStarsCalendar = {
        id: 'golarion-pf2e',
        translations: {
          en: { label: 'Golarion Calendar', description: 'Pathfinder calendar' },
        },
        months: [{ name: 'Abadius', abbreviation: 'Aba', days: 31 }],
        weekdays: [{ name: 'Moonday', abbreviation: 'Mo' }],
        year: {
          epoch: 2700,
          currentYear: 4725,
          suffix: ' AR',
        },
        leapYear: {
          rule: 'none',
        },
        intercalary: [],
        time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
        variants: {
          'absalom-reckoning': {
            name: 'Absalom Reckoning',
            description: 'Standard calendar',
            default: true,
            config: { yearOffset: 2700 },
            overrides: { year: { suffix: ' AR' } },
          },
          'imperial-calendar': {
            name: 'Imperial Calendar',
            description: 'Chelish Imperial dating system',
            config: { yearOffset: 5200 }, // This should add 2500 years
            overrides: { year: { suffix: ' IC' } },
          },
        },
      };

      // Act: Load calendar and simulate switching
      calendarManager.loadCalendar(golarionCalendar);

      const arVariant = calendarManager.calendars.get('golarion-pf2e(absalom-reckoning)');
      const icVariant = calendarManager.calendars.get('golarion-pf2e(imperial-calendar)');

      // Assert: This demonstrates the exact bug - years should be different but aren't
      expect(arVariant?.year.currentYear).toBe(4725); // AR year

      // FAILING TEST: IC should show 7225 (4725 + 2500) but currently shows 4725
      expect(icVariant?.year.currentYear).toBe(7225); // Should be AR year + 2500

      // The difference should be exactly 2500 years
      const yearDifference =
        (icVariant?.year.currentYear || 0) - (arVariant?.year.currentYear || 0);
      expect(yearDifference).toBe(2500);
    });
  });
});
