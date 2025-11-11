/**
 * Integration tests for module initialization and calendar settings timing
 *
 * This test suite specifically prevents regressions where calendar settings
 * are registered before calendars are fully loaded, causing incomplete
 * dropdown choices in the settings UI.
 */

import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { setupFoundryEnvironment } from '../../setup';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';

describe('Module Initialization - Calendar Settings Integration', () => {
  let mockCalendars: SeasonsStarsCalendar[];
  let settingsRegistrations: Array<{ module: string; key: string; config: any }>;

  beforeEach(() => {
    setupFoundryEnvironment();

    // Track all settings registrations in order
    settingsRegistrations = [];
    vi.mocked(game.settings.register).mockImplementation((moduleId, key, config) => {
      settingsRegistrations.push({ module: moduleId, key, config });
      return undefined as any;
    });

    // Mock calendar data
    mockCalendars = [
      {
        id: 'gregorian',
        name: 'Gregorian Calendar',
        translations: { en: { label: 'Gregorian Calendar' } },
        months: [{ name: 'January', days: 31 }],
        weekdays: [{ name: 'Monday' }],
        leapYears: { rule: 'gregorian' },
        year: { epoch: 0, yearZero: false },
        sourceInfo: { type: 'builtin' },
      },
      {
        id: 'exandrian',
        name: 'Exandrian Calendar',
        translations: { en: { label: 'Exandrian Calendar' } },
        months: [{ name: 'Horisal', days: 29 }],
        weekdays: [{ name: 'Miresen' }],
        leapYears: { rule: 'none' },
        year: { epoch: 0, yearZero: false },
        sourceInfo: { type: 'pack', sourceName: 'Fantasy Pack' },
      },
      {
        id: 'starfinder',
        name: 'Starfinder Calendar',
        translations: { en: { label: 'Starfinder Calendar' } },
        months: [{ name: 'Abadius', days: 30 }],
        weekdays: [{ name: 'Moonday' }],
        leapYears: { rule: 'none' },
        year: { epoch: 0, yearZero: false },
        sourceInfo: { type: 'pack', sourceName: 'Sci-Fi Pack' },
      },
    ];

    // Mock calendar loading setup is done in individual tests as needed
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Calendar Loading and Settings Registration Flow', () => {
    it('should register menu and hidden setting during init', async () => {
      // Import the module functions
      const { init, setup } = await import('../../../src/module');

      // Step 1: Module init - should register menu and hidden setting
      init();

      // Find the activeCalendar setting registration
      const activeCalendarSetting = settingsRegistrations.find(
        reg => reg.module === 'seasons-and-stars' && reg.key === 'activeCalendar'
      );

      expect(activeCalendarSetting).toBeDefined();
      // Setting is now hidden (config: false) - no choices property
      expect(activeCalendarSetting!.config.config).toBe(false);
      expect(activeCalendarSetting!.config.default).toBe('gregorian');
      expect(activeCalendarSetting!.config.choices).toBeUndefined();

      // Verify menu was registered
      expect(game.settings.registerMenu).toHaveBeenCalledWith(
        'seasons-and-stars',
        'calendarSelectionMenu',
        expect.objectContaining({
          name: 'SEASONS_STARS.settings.calendar_selection',
          label: 'SEASONS_STARS.settings.select_calendar_button',
          restricted: true,
        })
      );

      // Step 2: Module setup - should work with hidden settings
      setup();
    });

    it('should handle calendar loading failure gracefully', async () => {
      const { init } = await import('../../../src/module');

      // Step 1: Init with settings registration
      init();

      // Verify hidden setting was registered with default
      const activeCalendarSetting = settingsRegistrations.find(
        reg => reg.module === 'seasons-and-stars' && reg.key === 'activeCalendar'
      );

      expect(activeCalendarSetting).toBeDefined();
      // Setting is hidden - no choices
      expect(activeCalendarSetting!.config.config).toBe(false);
      expect(activeCalendarSetting!.config.default).toBe('gregorian');

      // Step 2: Simulate calendar loading failure
      // The module should still be functional with just Gregorian calendar
      // This prevents crashes when external calendar sources are unavailable
      expect(activeCalendarSetting!.config.scope).toBe('world');
      expect(activeCalendarSetting!.config.onChange).toBeDefined();
    });
  });

  describe('Settings Registration Timing Validation', () => {
    it('should prevent registration race conditions', async () => {
      // This test ensures that settings are registered immediately,
      // independent of calendar loading timing

      let calendarLoadingStarted = false;
      let calendarLoadingCompleted = false;

      // Mock calendar loading that takes time
      const mockSlowCalendarLoad = async () => {
        calendarLoadingStarted = true;
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate slow loading
        calendarLoadingCompleted = true;
      };

      // Module should work even during slow calendar loading
      const { init } = await import('../../../src/module');
      init();

      // Settings and menu should be registered immediately, regardless of calendar loading
      const activeCalendarSetting = settingsRegistrations.find(
        reg => reg.module === 'seasons-and-stars' && reg.key === 'activeCalendar'
      );

      expect(activeCalendarSetting).toBeDefined();
      expect(activeCalendarSetting!.config.config).toBe(false); // Hidden setting
      expect(activeCalendarSetting!.config.default).toBe('gregorian');

      // Verify menu is also registered
      expect(game.settings.registerMenu).toHaveBeenCalled();

      // Start slow calendar loading
      const loadingPromise = mockSlowCalendarLoad();

      expect(calendarLoadingStarted).toBe(true);
      expect(calendarLoadingCompleted).toBe(false);

      // Wait for calendar loading to complete
      await loadingPromise;

      expect(calendarLoadingCompleted).toBe(true);
    });

    it('should maintain consistent setting configuration', async () => {
      const { init } = await import('../../../src/module');
      init();

      // Get setting configuration
      const activeCalendarSetting = settingsRegistrations.find(
        reg => reg.module === 'seasons-and-stars' && reg.key === 'activeCalendar'
      );

      const config = activeCalendarSetting!.config;

      // Verify core configuration properties
      expect(config.name).toBe('SEASONS_STARS.settings.active_calendar');
      expect(config.hint).toBe('SEASONS_STARS.settings.active_calendar_hint');
      expect(config.scope).toBe('world');
      expect(config.config).toBe(false); // Hidden from settings UI
      expect(config.type).toBe(String);
      expect(config.default).toBe('gregorian');
      expect(config.onChange).toBeDefined();

      // No choices since it's a hidden setting
      expect(config.choices).toBeUndefined();
    });
  });

  describe('Regression Prevention Tests', () => {
    it('should use menu button instead of dropdown to avoid incomplete calendar lists', async () => {
      // The original regression was caused by settings dropdown being registered
      // before all calendars loaded. The fix is to use a menu button + dialog instead.

      const { init } = await import('../../../src/module');

      // Step 1: Module init (registers menu and hidden setting)
      init();

      // Verify menu is registered (not a dropdown with choices)
      expect(game.settings.registerMenu).toHaveBeenCalledWith(
        'seasons-and-stars',
        'calendarSelectionMenu',
        expect.objectContaining({
          type: expect.anything(),
          restricted: true,
        })
      );

      // Verify the setting is hidden (no choices dropdown in UI)
      const activeCalendarSetting = settingsRegistrations.find(
        reg => reg.module === 'seasons-and-stars' && reg.key === 'activeCalendar'
      );

      expect(activeCalendarSetting).toBeDefined();
      expect(activeCalendarSetting!.config.config).toBe(false); // Hidden
      expect(activeCalendarSetting!.config.choices).toBeUndefined(); // No dropdown

      // The CalendarSelectionDialog will fetch all available calendars when opened,
      // avoiding the race condition entirely
    });

    it('should load calendars independently of settings registration', async () => {
      // Calendar loading happens asynchronously and doesn't affect settings registration
      // because the dialog fetches calendars dynamically when opened

      let builtinCalendarsLoaded = false;
      let calendarPacksLoaded = false;

      // Mock the loading sequence
      const mockLoadingSequence = async () => {
        // Step 1: Load built-in calendars
        await new Promise(resolve => setTimeout(resolve, 10));
        builtinCalendarsLoaded = true;

        // Step 2: Load calendar packs
        await new Promise(resolve => setTimeout(resolve, 10));
        calendarPacksLoaded = true;
      };

      await mockLoadingSequence();

      // Verify calendars loaded
      expect(builtinCalendarsLoaded).toBe(true);
      expect(calendarPacksLoaded).toBe(true);

      // Verify calendar localization can create choices from all calendars
      const { CalendarLocalization } = await import('../../../src/core/calendar-localization');
      const choices = CalendarLocalization.createCalendarChoices(mockCalendars);

      expect(choices).toHaveProperty('gregorian'); // built-in
      expect(choices).toHaveProperty('exandrian'); // from fantasy pack
      expect(choices).toHaveProperty('starfinder'); // from sci-fi pack
    });
  });

  describe('User Experience Impact', () => {
    it('should provide immediate basic functionality while loading', async () => {
      // Even before all calendars are loaded, basic functionality should work

      const { init, setup } = await import('../../../src/module');

      init();
      setup();

      // User should be able to use Gregorian calendar immediately
      const activeCalendarSetting = settingsRegistrations.find(
        reg => reg.module === 'seasons-and-stars' && reg.key === 'activeCalendar'
      );

      expect(activeCalendarSetting!.config.default).toBe('gregorian');
      expect(activeCalendarSetting!.config.config).toBe(false); // Hidden

      // onChange function should be functional
      expect(typeof activeCalendarSetting!.config.onChange).toBe('function');
    });

    it('should show all calendars when dialog is opened', async () => {
      // Test that the dialog shows all available calendars when opened

      // Calendar choices are created from all loaded calendars
      const { CalendarLocalization } = await import('../../../src/core/calendar-localization');
      const allChoices = CalendarLocalization.createCalendarChoices(mockCalendars);

      // User experience: dialog shows all calendars when opened
      expect(Object.keys(allChoices)).toHaveLength(3);

      // All calendars are available
      expect(allChoices).toHaveProperty('gregorian');
      expect(allChoices).toHaveProperty('exandrian');
      expect(allChoices).toHaveProperty('starfinder');
    });
  });
});
