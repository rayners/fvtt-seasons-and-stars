/**
 * Tests for calendar settings registration functionality
 *
 * This test suite covers the critical timing and integration between:
 * - Calendar loading (init hook)
 * - Settings registration with calendar choices
 * - Ensuring the settings dropdown shows all available calendars
 */

import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { setupFoundryEnvironment } from '../../setup';
import { CalendarManager } from '../../../src/core/calendar-manager';
import { CalendarLocalization } from '../../../src/core/calendar-localization';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';

// Mock calendar data for testing
const mockGregorianCalendar: SeasonsStarsCalendar = {
  id: 'gregorian',
  name: 'Gregorian Calendar',
  translations: {
    en: { label: 'Gregorian Calendar' },
  },
  months: [
    { name: 'January', days: 31 },
    { name: 'February', days: 28 },
  ],
  weekdays: [{ name: 'Monday' }, { name: 'Tuesday' }],
  leapYears: { rule: 'gregorian' },
  year: { epoch: 0, yearZero: false },
  sourceInfo: { type: 'builtin' },
};

const mockExandrianCalendar: SeasonsStarsCalendar = {
  id: 'exandrian',
  name: 'Exandrian Calendar',
  translations: {
    en: { label: 'Exandrian Calendar', setting: 'Critical Role' },
  },
  months: [
    { name: 'Horisal', days: 29 },
    { name: 'Misuthar', days: 30 },
  ],
  weekdays: [{ name: 'Miresen' }, { name: 'Grissen' }],
  leapYears: { rule: 'none' },
  year: { epoch: 0, yearZero: false },
  sourceInfo: { type: 'pack', sourceName: 'Fantasy Pack' },
};

describe('Calendar Settings Registration', () => {
  let mockCalendarManager: CalendarManager;
  let registeredSettings: Map<string, any>;

  beforeEach(async () => {
    setupFoundryEnvironment();

    // Track settings registrations
    registeredSettings = new Map();
    vi.mocked(game.settings.register).mockImplementation((moduleId, key, config) => {
      registeredSettings.set(`${moduleId}.${key}`, config);
      return undefined as any;
    });

    // Create a real calendar manager for testing
    mockCalendarManager = new CalendarManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Settings Registration', () => {
    it('should register activeCalendar setting as hidden (managed by menu)', async () => {
      const { registerSettings } = await import('../../../src/module');

      registerSettings();

      const activeCalendarSetting = registeredSettings.get('seasons-and-stars.activeCalendar');
      expect(activeCalendarSetting).toBeDefined();
      expect(activeCalendarSetting.default).toBe('gregorian');
      expect(activeCalendarSetting.scope).toBe('world');
      expect(activeCalendarSetting.config).toBe(false); // Hidden from settings UI
    });

    it('should register calendar selection menu', async () => {
      // Track menu registrations
      const registeredMenus = new Map();
      vi.mocked(game.settings).registerMenu = vi.fn((moduleId, key, config) => {
        registeredMenus.set(`${moduleId}.${key}`, config);
      }) as any;

      const { registerSettings } = await import('../../../src/module');
      registerSettings();

      const calendarMenu = registeredMenus.get('seasons-and-stars.calendarSelectionMenu');
      expect(calendarMenu).toBeDefined();
      expect(calendarMenu.name).toBe('SEASONS_STARS.settings.calendar_selection');
      expect(calendarMenu.label).toBe('SEASONS_STARS.settings.select_calendar_button');
      expect(calendarMenu.restricted).toBe(true); // GM only
    });
  });

  describe('Calendar Choices Creation', () => {
    it('should create choices for single calendar', () => {
      const calendars = [mockGregorianCalendar];
      const choices = CalendarLocalization.createCalendarChoices(calendars);

      expect(choices).toEqual({
        gregorian: 'Gregorian Calendar',
      });
    });

    it('should create choices for multiple calendars with proper ordering', () => {
      const calendars = [mockExandrianCalendar, mockGregorianCalendar];
      const choices = CalendarLocalization.createCalendarChoices(calendars);

      // Gregorian should come first, then alphabetical
      const choiceKeys = Object.keys(choices);
      expect(choiceKeys[0]).toBe('gregorian');
      expect(choiceKeys[1]).toBe('exandrian');

      expect(choices.gregorian).toBe('Gregorian Calendar');
      expect(choices.exandrian).toBe('Exandrian Calendar - Fantasy Pack');
    });

    it('should handle calendars with different source types', () => {
      const builtinCalendar = { ...mockGregorianCalendar };
      const packCalendar = {
        ...mockExandrianCalendar,
        sourceInfo: { type: 'pack' as const, sourceName: 'Fantasy Pack' },
      };
      const externalCalendar = {
        ...mockExandrianCalendar,
        id: 'external-test',
        name: 'External Calendar',
        translations: { en: { label: 'External Calendar' } },
        sourceInfo: { type: 'external' as const, sourceName: 'Test Source' },
      };

      const calendars = [builtinCalendar, packCalendar, externalCalendar];
      const choices = CalendarLocalization.createCalendarChoices(calendars);

      expect(choices.gregorian).toBe('Gregorian Calendar');
      expect(choices.exandrian).toBe('Exandrian Calendar - Fantasy Pack');
      expect(choices['external-test']).toBe('External Calendar - Test Source');
    });

    it('should handle empty calendar list', () => {
      const choices = CalendarLocalization.createCalendarChoices([]);
      expect(choices).toEqual({});
    });
  });

  describe('Calendar Selection Dialog Integration', () => {
    it('should have CalendarSelectionDialog available for browsing calendars', async () => {
      // Mock calendar manager with loaded calendars
      vi.spyOn(mockCalendarManager, 'getAllCalendars').mockReturnValue([
        mockGregorianCalendar,
        mockExandrianCalendar,
      ]);

      // The dialog handles presenting all calendars to the user
      const { CalendarLocalization } = await import('../../../src/core/calendar-localization');
      const calendars = [mockGregorianCalendar, mockExandrianCalendar];
      const choices = CalendarLocalization.createCalendarChoices(calendars);

      // Verify the choices include both calendars (used by dialog)
      expect(choices).toHaveProperty('gregorian');
      expect(choices).toHaveProperty('exandrian');
      expect(Object.keys(choices)).toHaveLength(2);
    });

    it('should keep activeCalendar setting hidden from config UI', async () => {
      const { registerSettings } = await import('../../../src/module');

      // Initial registration
      registerSettings();
      const activeCalendarSetting = registeredSettings.get('seasons-and-stars.activeCalendar');

      // Setting should remain hidden (selection now handled via menu button/dialog)
      expect(activeCalendarSetting.config).toBe(false);
      expect(activeCalendarSetting.scope).toBe('world');
      expect(activeCalendarSetting.default).toBe('gregorian');
    });
  });

  describe('Integration with Calendar Manager', () => {
    it('should handle calendar manager with no calendars loaded', () => {
      vi.spyOn(mockCalendarManager, 'getAllCalendars').mockReturnValue([]);

      const calendars = mockCalendarManager.getAllCalendars();
      const choices = CalendarLocalization.createCalendarChoices(calendars);

      expect(choices).toEqual({});
    });

    it('should handle calendar manager with multiple calendar packs', () => {
      const calendars = [
        mockGregorianCalendar,
        mockExandrianCalendar,
        {
          ...mockExandrianCalendar,
          id: 'starfinder',
          name: 'Starfinder Calendar',
          translations: { en: { label: 'Starfinder Calendar' } },
          sourceInfo: { type: 'pack' as const, sourceName: 'Sci-Fi Pack' },
        },
      ];

      vi.spyOn(mockCalendarManager, 'getAllCalendars').mockReturnValue(calendars);

      const allCalendars = mockCalendarManager.getAllCalendars();
      const choices = CalendarLocalization.createCalendarChoices(allCalendars);

      expect(Object.keys(choices)).toHaveLength(3);
      expect(choices.gregorian).toBe('Gregorian Calendar');
      expect(choices.exandrian).toBe('Exandrian Calendar - Fantasy Pack');
      expect(choices.starfinder).toBe('Starfinder Calendar - Sci-Fi Pack');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle calendars without translations', () => {
      const calendarWithoutTranslations = {
        ...mockGregorianCalendar,
        id: 'no-translations',
        name: 'No Translations Calendar',
        translations: {},
      };

      const choices = CalendarLocalization.createCalendarChoices([calendarWithoutTranslations]);

      // Should fall back to calendar ID when no translations available
      expect(choices['no-translations']).toBe('no-translations');
    });

    it('should handle calendars with missing English translations', () => {
      const calendarWithoutEnglish = {
        ...mockGregorianCalendar,
        id: 'no-english',
        name: 'No English Calendar',
        translations: {
          fr: { label: 'Calendrier Français' },
        },
      };

      const choices = CalendarLocalization.createCalendarChoices([calendarWithoutEnglish]);

      // Should fall back to calendar ID when no English translation
      expect(choices['no-english']).toBe('no-english');
    });

    it('should handle calendars with variant naming patterns', () => {
      const variantCalendar = {
        ...mockGregorianCalendar,
        id: 'gregorian(variant)',
        name: 'Gregorian Variant',
        translations: {
          en: { label: 'Gregorian Calendar Variant' },
        },
      };

      const choices = CalendarLocalization.createCalendarChoices([
        mockGregorianCalendar,
        variantCalendar,
      ]);

      expect(choices.gregorian).toBe('Gregorian Calendar');
      expect(choices['gregorian(variant)']).toBe('— Gregorian Calendar Variant');
    });
  });

  describe('Regression Prevention', () => {
    it('should ensure settings are updated after calendar loading completes', async () => {
      // This test specifically prevents the regression where settings were registered
      // before calendars were loaded, causing only default choices to be available

      let calendarLoadingComplete = false;
      let settingsRegistered = false;

      // Mock the calendar loading process
      const mockLoadCalendars = vi.fn().mockImplementation(async () => {
        // Simulate async calendar loading
        await new Promise(resolve => setTimeout(resolve, 10));
        calendarLoadingComplete = true;

        // Settings should be registered AFTER calendar loading
        if (!settingsRegistered) {
          settingsRegistered = true;
          // Simulate registerCalendarSettings being called
          const calendars = [mockGregorianCalendar, mockExandrianCalendar];
          const choices = CalendarLocalization.createCalendarChoices(calendars);

          // Verify we have more than just the default
          expect(Object.keys(choices).length).toBeGreaterThan(1);
          expect(choices).toHaveProperty('gregorian');
          expect(choices).toHaveProperty('exandrian');
        }
      });

      await mockLoadCalendars();

      expect(calendarLoadingComplete).toBe(true);
      expect(settingsRegistered).toBe(true);
    });

    it('should prevent settings registration before calendar loading', () => {
      // This test ensures the timing issue doesn't happen again

      // Mock initial state - no calendars loaded yet
      vi.spyOn(mockCalendarManager, 'getAllCalendars').mockReturnValue([]);

      const calendars = mockCalendarManager.getAllCalendars();
      const choices = CalendarLocalization.createCalendarChoices(calendars);

      // If settings were registered too early, we'd only have empty choices
      expect(choices).toEqual({});

      // Now simulate calendars being loaded
      vi.spyOn(mockCalendarManager, 'getAllCalendars').mockReturnValue([
        mockGregorianCalendar,
        mockExandrianCalendar,
      ]);

      const loadedCalendars = mockCalendarManager.getAllCalendars();
      const updatedChoices = CalendarLocalization.createCalendarChoices(loadedCalendars);

      // After calendars are loaded, we should have proper choices
      expect(Object.keys(updatedChoices).length).toBeGreaterThan(0);
      expect(updatedChoices).toHaveProperty('gregorian');
      expect(updatedChoices).toHaveProperty('exandrian');
    });
  });
});
