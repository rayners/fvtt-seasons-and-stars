import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use real TestLogger instead of mocks for better testing
import { TestLogger } from './utils/test-logger';
vi.mock('../src/core/logger', () => ({
  Logger: TestLogger,
}));

import { CalendarManager } from '../src/core/calendar-manager';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar, CalendarDateData } from '../src/types/calendar';

// Mock foundry environment and dependencies
vi.stubGlobal('game', {
  settings: {
    get: vi.fn(),
    set: vi.fn(),
  },
});
vi.stubGlobal('Hooks', {
  callAll: vi.fn(),
  on: vi.fn(),
});

// Mock the built-in calendars list to be empty
vi.mock('../src/generated/calendar-list', () => ({
  BUILT_IN_CALENDARS: [],
}));

// Mock CalendarValidator
vi.mock('../src/core/calendar-validator', () => ({
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
vi.mock('../src/core/calendar-localization', () => ({
  CalendarLocalization: {
    getCalendarLabel: vi.fn().mockReturnValue('Test Calendar'),
  },
}));

// Mock Handlebars for testing
const mockHandlebars = {
  compile: vi.fn(),
  registerHelper: vi.fn(),
};

vi.mock('handlebars', () => ({
  default: mockHandlebars,
}));

global.Handlebars = mockHandlebars;

describe('Calendar Variants System', () => {
  let calendarManager: CalendarManager;

  beforeEach(() => {
    vi.clearAllMocks();
    TestLogger.clearLogs();

    // Create a real CalendarManager instance
    calendarManager = new CalendarManager();
  });

  describe('Calendar Variant Loading', () => {
    it('should load base calendar without variants', async () => {
      // Test that a calendar without variants loads normally
      const baseCalendar = {
        id: 'gregorian',
        translations: {
          en: { label: 'Gregorian Calendar', description: 'Standard calendar' },
        },
        months: [
          { name: 'January', days: 31 },
          { name: 'February', days: 28 },
        ],
        weekdays: [{ name: 'Sunday' }, { name: 'Monday' }],
        year: { epoch: 0, suffix: ' AD' },
      };

      // Load the calendar directly (skip built-in loading since we mocked it to be empty)
      calendarManager.loadCalendar(baseCalendar as any);

      // Should have exactly one calendar (no variants generated)
      expect(calendarManager.calendars.size).toBe(1);
      expect(calendarManager.calendars.has('gregorian')).toBe(true);
      expect(calendarManager.calendars.has('gregorian(variant)')).toBe(false);
    });

    it('should expand calendar with variants into multiple selectable calendars', async () => {
      // RED: This test should fail because variant expansion is not implemented yet
      const calendarWithVariants = {
        id: 'golarion-pf2e',
        translations: {
          en: { label: 'Golarion Calendar', description: 'Pathfinder calendar' },
        },
        months: [
          { name: 'Abadius', days: 31 },
          { name: 'Calistril', days: 28 },
        ],
        weekdays: [{ name: 'Moonday' }, { name: 'Toilday' }],
        year: { epoch: 2700, suffix: ' AR' },

        // NEW: Variants structure that should expand into multiple calendar options
        variants: {
          'absalom-reckoning': {
            name: 'Absalom Reckoning',
            description: 'Standard Pathfinder Society calendar',
            default: true,
            config: { yearOffset: 2700 },
            overrides: { year: { suffix: ' AR' } },
          },
          'imperial-calendar': {
            name: 'Imperial Calendar',
            description: 'Chelish Imperial dating system',
            config: { yearOffset: 5200 },
            overrides: {
              year: { suffix: ' IC' },
              months: { Abadius: { name: 'First Imperial' } },
            },
          },
        },
      };

      // Load the calendar with variants
      calendarManager.loadCalendar(calendarWithVariants as any);

      // Should expand into 3 calendars: base + 2 variants
      expect(calendarManager.calendars.size).toBe(3);
      expect(calendarManager.calendars.has('golarion-pf2e')).toBe(true); // Base calendar
      expect(calendarManager.calendars.has('golarion-pf2e(absalom-reckoning)')).toBe(true); // Variant 1
      expect(calendarManager.calendars.has('golarion-pf2e(imperial-calendar)')).toBe(true); // Variant 2
    });

    it('should apply variant overrides correctly', async () => {
      // RED: This test should fail because override system is not implemented yet
      const calendarWithVariants = {
        id: 'golarion-pf2e',
        translations: {
          en: { label: 'Golarion Calendar', description: 'Pathfinder calendar' },
        },
        months: [
          { name: 'Abadius', days: 31, description: 'First month' },
          { name: 'Calistril', days: 28, description: 'Second month' },
        ],
        weekdays: [{ name: 'Moonday' }],
        year: { epoch: 2700, suffix: ' AR' },

        variants: {
          'imperial-calendar': {
            name: 'Imperial Calendar',
            description: 'Chelish Imperial dating system',
            config: { yearOffset: 5200 },
            overrides: {
              year: { suffix: ' IC' },
              months: {
                Abadius: { name: 'First Imperial', description: 'Imperial first month' },
              },
            },
          },
        },
      };

      // Load the calendar with variants
      calendarManager.loadCalendar(calendarWithVariants as any);

      // Get the imperial variant calendar
      const imperialVariant = calendarManager.calendars.get('golarion-pf2e(imperial-calendar)');

      expect(imperialVariant).toBeDefined();
      expect(imperialVariant?.year.suffix).toBe(' IC'); // Year suffix overridden
      expect(imperialVariant?.months[0].name).toBe('First Imperial'); // Month name overridden
      expect(imperialVariant?.months[0].description).toBe('Imperial first month'); // Month description overridden
      expect(imperialVariant?.months[0].days).toBe(31); // Days inherited from base
      expect(imperialVariant?.months[1].name).toBe('Calistril'); // Non-overridden month inherited
    });

    it('should preserve backward compatibility with existing calendar selections', async () => {
      // RED: This test should fail because backward compatibility is not implemented yet
      const calendarWithVariants = {
        id: 'golarion-pf2e',
        translations: {
          en: { label: 'Golarion Calendar', description: 'Pathfinder calendar' },
        },
        months: [{ name: 'Abadius', days: 31 }],
        weekdays: [{ name: 'Moonday' }],
        year: { epoch: 2700, suffix: ' AR' },

        variants: {
          'absalom-reckoning': {
            name: 'Absalom Reckoning',
            description: 'Standard calendar',
            default: true, // This should be the default when someone selects 'golarion-pf2e'
            config: { yearOffset: 2700 },
          },
        },
      };

      // Load the calendar with variants
      calendarManager.loadCalendar(calendarWithVariants as any);

      // When setting active calendar to base ID, should resolve to default variant
      await calendarManager.setActiveCalendar('golarion-pf2e');

      // Should resolve to the default variant instead of base calendar
      const activeId = calendarManager.getActiveCalendarId();
      expect(activeId).toBe('golarion-pf2e(absalom-reckoning)');
    });
  });

  describe('Calendar Selection Dialog Variants', () => {
    it('should show expanded calendar list with base + variant options', async () => {
      // RED: This test should fail because selection dialog variant support is not implemented yet
      const calendarWithVariants = {
        id: 'golarion-pf2e',
        translations: {
          en: { label: 'Golarion Calendar', description: 'Pathfinder calendar' },
        },
        months: [{ name: 'Abadius', days: 31 }],
        weekdays: [{ name: 'Moonday' }],
        year: { epoch: 2700, suffix: ' AR' },

        variants: {
          'absalom-reckoning': { name: 'Absalom Reckoning', description: 'Standard' },
          'imperial-calendar': { name: 'Imperial Calendar', description: 'Chelish' },
        },
      };

      // Load the calendar with variants
      calendarManager.loadCalendar(calendarWithVariants as any);

      // Get available calendars for selection dialog
      const availableCalendars = calendarManager.getAvailableCalendars();

      // Should include base calendar and both variants
      expect(availableCalendars).toHaveLength(3);

      const calendarIds = availableCalendars.map(cal => cal.id);
      expect(calendarIds).toContain('golarion-pf2e');
      expect(calendarIds).toContain('golarion-pf2e(absalom-reckoning)');
      expect(calendarIds).toContain('golarion-pf2e(imperial-calendar)');

      // Variant calendars should have distinct display names
      const absalomVariant = availableCalendars.find(
        cal => cal.id === 'golarion-pf2e(absalom-reckoning)'
      );
      const imperialVariant = availableCalendars.find(
        cal => cal.id === 'golarion-pf2e(imperial-calendar)'
      );

      expect(absalomVariant?.translations.en.label).toBe('Golarion Calendar (Absalom Reckoning)');
      expect(imperialVariant?.translations.en.label).toBe('Golarion Calendar (Imperial Calendar)');
    });
  });

  describe('Variant DateFormats Support', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      TestLogger.clearLogs();

      // Setup mock template compilation
      const mockCompiledTemplate = vi.fn(context => {
        // Simple template output based on format
        if (context.year && context.month && context.day) {
          return `${context.year}-${context.month}-${context.day}`;
        }
        return 'formatted-date';
      });
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);
    });

    it('should support dateFormats property in variants', () => {
      // Arrange
      const mockCalendar = {
        id: 'test-calendar',
        name: 'Test Calendar',
        months: [
          { name: 'January', abbreviation: 'Jan', days: 31 },
          { name: 'February', abbreviation: 'Feb', days: 28 },
        ],
        weekdays: [
          { name: 'Sunday', abbreviation: 'Sun' },
          { name: 'Monday', abbreviation: 'Mon' },
        ],
        year: { prefix: '', suffix: '' },
        time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
        variants: {
          'test-variant': {
            name: 'Test Variant',
            description: 'Test variant with dateFormats',
            overrides: {
              dateFormats: {
                'variant-format': 'Variant: {{ss-month format="name"}} {{ss-day}}, {{year}}',
                short: 'V{{year}}-{{ss-month format="pad"}}-{{ss-day format="pad"}}',
                widgets: {
                  mini: 'V{{ss-month format="abbr"}} {{ss-day}}',
                  main: 'Variant {{ss-weekday format="name"}}, {{ss-day format="ordinal"}} {{ss-month format="name"}}',
                },
              },
            },
          },
        },
      } as SeasonsStarsCalendar;

      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 1,
      };

      // Apply variant overrides to create variant calendar
      const variantCalendar = { ...mockCalendar };
      const variant = mockCalendar.variants!['test-variant'];
      if (variant.overrides?.dateFormats) {
        variantCalendar.dateFormats = variant.overrides.dateFormats;
      }

      const date = new CalendarDate(dateData, variantCalendar);

      // Act - Test that variant dateFormats are used
      const result = date.format();

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(mockHandlebars.compile).toHaveBeenCalled();
    });

    it('should handle variants without dateFormats gracefully', () => {
      // Arrange
      // Set up Handlebars mock to return a function that formats the date
      const mockCompiledTemplate = vi.fn().mockReturnValue('Monday, 15th January 2024');
      mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);

      const mockCalendar = {
        id: 'test-calendar',
        name: 'Test Calendar',
        months: [{ name: 'January', abbreviation: 'Jan', days: 31 }],
        weekdays: [{ name: 'Monday', abbreviation: 'Mon' }],
        year: { prefix: '', suffix: '' },
        time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
        variants: {
          'simple-variant': {
            name: 'Simple Variant',
            description: 'Variant without dateFormats',
            overrides: {
              year: { prefix: 'V', suffix: ' AV' },
            },
          },
        },
      } as SeasonsStarsCalendar;

      const dateData: CalendarDateData = {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 0,
      };

      const date = new CalendarDate(dateData, mockCalendar);

      // Act
      const result = date.format();

      // Assert - Should use basic format since no dateFormats
      expect(result).toBe('Monday, 15th January 2024');
    });
  });
});
