import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarManager } from '../src/core/calendar-manager';

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

// Mock Logger
vi.mock('../src/core/logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
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

describe('Calendar Variants System', () => {
  let calendarManager: CalendarManager;

  beforeEach(() => {
    vi.clearAllMocks();

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
});
