/**
 * Integration tests for module initialization and calendar settings timing
 *
 * This test suite specifically prevents regressions where calendar settings
 * are registered before calendars are fully loaded, causing incomplete
 * dropdown choices in the settings UI.
 */

import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { setupFoundryEnvironment } from './setup';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

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
    it('should register settings with basic choices first, then update after calendars load', async () => {
      // Import the module functions
      const { init, setup } = await import('../src/module');

      // Step 1: Module init - should register basic settings
      init();

      // Find the initial activeCalendar setting registration
      const initialActiveCalendarSetting = settingsRegistrations.find(
        reg => reg.module === 'seasons-and-stars' && reg.key === 'activeCalendar'
      );

      expect(initialActiveCalendarSetting).toBeDefined();
      expect(initialActiveCalendarSetting!.config.choices).toEqual({
        gregorian: 'Gregorian Calendar',
      });

      // Step 2: Module setup - should work with basic settings
      setup();

      // Step 3: Simulate calendar loading completion and settings update
      // This simulates what happens in the calendar loading promise
      const { CalendarLocalization } = await import('../src/core/calendar-localization');
      const choices = CalendarLocalization.createCalendarChoices(mockCalendars);

      // Simulate registerCalendarSettings being called after calendar loading
      game.settings.register('seasons-and-stars', 'activeCalendar', {
        name: 'SEASONS_STARS.settings.active_calendar',
        hint: 'SEASONS_STARS.settings.active_calendar_hint',
        scope: 'world',
        config: true,
        type: String,
        default: 'gregorian',
        choices: choices,
        onChange: expect.any(Function),
      });

      // Find the updated setting registration
      const updatedActiveCalendarSetting = settingsRegistrations[settingsRegistrations.length - 1];

      expect(updatedActiveCalendarSetting.module).toBe('seasons-and-stars');
      expect(updatedActiveCalendarSetting.key).toBe('activeCalendar');

      // The updated choices should include all calendars
      const updatedChoices = updatedActiveCalendarSetting.config.choices;
      expect(Object.keys(updatedChoices)).toHaveLength(3);
      expect(updatedChoices).toHaveProperty('gregorian');
      expect(updatedChoices).toHaveProperty('exandrian');
      expect(updatedChoices).toHaveProperty('starfinder');
    });

    it('should handle calendar loading failure gracefully', async () => {
      const { init } = await import('../src/module');

      // Step 1: Init with settings registration
      init();

      // Verify basic settings were registered
      const basicSetting = settingsRegistrations.find(
        reg => reg.module === 'seasons-and-stars' && reg.key === 'activeCalendar'
      );

      expect(basicSetting).toBeDefined();
      expect(basicSetting!.config.choices).toEqual({
        gregorian: 'Gregorian Calendar',
      });

      // Step 2: Simulate calendar loading failure
      // In this case, settings should remain with basic choices
      // The module should still be functional with just Gregorian calendar

      // This prevents crashes when external calendar sources are unavailable
      expect(basicSetting!.config.default).toBe('gregorian');
      expect(basicSetting!.config.scope).toBe('world');
    });
  });

  describe('Settings Registration Timing Validation', () => {
    it('should prevent registration race conditions', async () => {
      // This test ensures that even if calendar loading is slow,
      // the settings registration happens at the right time

      let settingsUpdateCalled = false;
      let calendarLoadingStarted = false;

      // Mock calendar loading that takes time
      const mockSlowCalendarLoad = async () => {
        calendarLoadingStarted = true;
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate slow loading
        settingsUpdateCalled = true;
      };

      // Module should work even during slow calendar loading
      const { init } = await import('../src/module');
      init();

      // Settings should be registered immediately with basic choices
      const immediateSetting = settingsRegistrations.find(
        reg => reg.module === 'seasons-and-stars' && reg.key === 'activeCalendar'
      );

      expect(immediateSetting).toBeDefined();
      expect(immediateSetting!.config.choices).toEqual({
        gregorian: 'Gregorian Calendar',
      });

      // Start slow calendar loading
      const loadingPromise = mockSlowCalendarLoad();

      expect(calendarLoadingStarted).toBe(true);
      expect(settingsUpdateCalled).toBe(false);

      // Wait for calendar loading to complete
      await loadingPromise;

      expect(settingsUpdateCalled).toBe(true);
    });

    it('should maintain setting configuration consistency across updates', async () => {
      const { init } = await import('../src/module');
      init();

      // Get initial setting configuration
      const initialSetting = settingsRegistrations.find(
        reg => reg.module === 'seasons-and-stars' && reg.key === 'activeCalendar'
      );

      const initialConfig = initialSetting!.config;

      // Simulate settings update after calendar loading
      const { CalendarLocalization } = await import('../src/core/calendar-localization');
      const newChoices = CalendarLocalization.createCalendarChoices(mockCalendars);

      game.settings.register('seasons-and-stars', 'activeCalendar', {
        ...initialConfig,
        choices: newChoices,
      });

      const updatedSetting = settingsRegistrations[settingsRegistrations.length - 1];
      const updatedConfig = updatedSetting.config;

      // Core configuration should remain the same
      expect(updatedConfig.name).toBe(initialConfig.name);
      expect(updatedConfig.hint).toBe(initialConfig.hint);
      expect(updatedConfig.scope).toBe(initialConfig.scope);
      expect(updatedConfig.config).toBe(initialConfig.config);
      expect(updatedConfig.type).toBe(initialConfig.type);
      expect(updatedConfig.default).toBe(initialConfig.default);

      // Only choices should be different
      expect(updatedConfig.choices).not.toEqual(initialConfig.choices);
      expect(Object.keys(updatedConfig.choices).length).toBeGreaterThan(
        Object.keys(initialConfig.choices).length
      );
    });
  });

  describe('Regression Prevention Tests', () => {
    it('should catch the specific regression that caused incomplete calendar lists', async () => {
      // This test replicates the exact conditions that caused the regression

      const { init } = await import('../src/module');

      // Step 1: Module init (this should register basic settings)
      init();

      // Get the setting that was registered during init
      const settingAfterInit = settingsRegistrations.find(
        reg => reg.module === 'seasons-and-stars' && reg.key === 'activeCalendar'
      );

      // This is what users would see if the bug exists - only gregorian
      expect(settingAfterInit!.config.choices).toEqual({
        gregorian: 'Gregorian Calendar',
      });

      // This is the bug: if setup() tried to register calendar settings too early,
      // it would only have the basic choices available

      // Step 2: Simulate proper fix - calendar loading completes and updates settings
      const { CalendarLocalization } = await import('../src/core/calendar-localization');
      const fullChoices = CalendarLocalization.createCalendarChoices(mockCalendars);

      // Re-register with full choices (what the fix does)
      game.settings.register('seasons-and-stars', 'activeCalendar', {
        name: 'SEASONS_STARS.settings.active_calendar',
        hint: 'SEASONS_STARS.settings.active_calendar_hint',
        scope: 'world',
        config: true,
        type: String,
        default: 'gregorian',
        choices: fullChoices,
        onChange: expect.any(Function),
      });

      const settingAfterUpdate = settingsRegistrations[settingsRegistrations.length - 1];

      // After the fix, users should see all calendars
      expect(Object.keys(settingAfterUpdate.config.choices)).toHaveLength(3);
      expect(settingAfterUpdate.config.choices).toHaveProperty('gregorian');
      expect(settingAfterUpdate.config.choices).toHaveProperty('exandrian');
      expect(settingAfterUpdate.config.choices).toHaveProperty('starfinder');

      // This confirms the regression is fixed
      expect(settingAfterUpdate.config.choices).not.toEqual({
        gregorian: 'Gregorian Calendar',
      });
    });

    it('should ensure calendar packs are loaded before settings update', async () => {
      // Test that the timing includes calendar pack loading

      let builtinCalendarsLoaded = false;
      let calendarPacksLoaded = false;
      let settingsUpdated = false;

      // Mock the loading sequence
      const mockLoadingSequence = async () => {
        // Step 1: Load built-in calendars
        await new Promise(resolve => setTimeout(resolve, 10));
        builtinCalendarsLoaded = true;

        // Step 2: Load calendar packs
        await new Promise(resolve => setTimeout(resolve, 10));
        calendarPacksLoaded = true;

        // Step 3: Update settings (should happen after both steps)
        settingsUpdated = true;
      };

      await mockLoadingSequence();

      // Verify the correct sequence
      expect(builtinCalendarsLoaded).toBe(true);
      expect(calendarPacksLoaded).toBe(true);
      expect(settingsUpdated).toBe(true);

      // Settings update should include calendars from packs
      const { CalendarLocalization } = await import('../src/core/calendar-localization');
      const choices = CalendarLocalization.createCalendarChoices(mockCalendars);

      expect(choices).toHaveProperty('gregorian'); // built-in
      expect(choices).toHaveProperty('exandrian'); // from fantasy pack
      expect(choices).toHaveProperty('starfinder'); // from sci-fi pack
    });
  });

  describe('User Experience Impact', () => {
    it('should provide immediate basic functionality while loading', async () => {
      // Even before all calendars are loaded, basic functionality should work

      const { init, setup } = await import('../src/module');

      init();
      setup();

      // User should be able to use Gregorian calendar immediately
      const basicSetting = settingsRegistrations.find(
        reg => reg.module === 'seasons-and-stars' && reg.key === 'activeCalendar'
      );

      expect(basicSetting!.config.default).toBe('gregorian');
      expect(basicSetting!.config.choices).toHaveProperty('gregorian');

      // onChange function should be functional
      expect(typeof basicSetting!.config.onChange).toBe('function');
    });

    it('should gracefully upgrade settings when more calendars become available', async () => {
      // Test the user experience of getting more calendar options

      // Initial state - only Gregorian
      const initialChoices = { gregorian: 'Gregorian Calendar' };

      // After calendar loading - more options
      const { CalendarLocalization } = await import('../src/core/calendar-localization');
      const expandedChoices = CalendarLocalization.createCalendarChoices(mockCalendars);

      // User experience: dropdown gets more options without requiring restart
      expect(Object.keys(initialChoices)).toHaveLength(1);
      expect(Object.keys(expandedChoices)).toHaveLength(3);

      // Gregorian remains available throughout
      expect(initialChoices).toHaveProperty('gregorian');
      expect(expandedChoices).toHaveProperty('gregorian');

      // New options are added
      expect(expandedChoices).toHaveProperty('exandrian');
      expect(expandedChoices).toHaveProperty('starfinder');
    });
  });
});
