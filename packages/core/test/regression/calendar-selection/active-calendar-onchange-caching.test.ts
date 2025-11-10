/**
 * Tests for handleCalendarSelection function
 *
 * This test suite verifies that when a user selects a calendar from the dropdown,
 * the full calendar JSON is cached in the activeCalendarData setting for synchronous
 * loading on next reload. This prevents race condition errors like:
 * "Calendar not found: vale-reckoning"
 *
 * Tests the extracted handleCalendarSelection function directly for better testability.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupFoundryEnvironment } from './setup';
import { CalendarManager } from '../../../src/core/calendar-manager';
import { handleCalendarSelection } from '../../../src/core/calendar-selection-handler';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';

// Mock calendar data for testing
const mockValeReckoningCalendar: SeasonsStarsCalendar = {
  id: 'vale-reckoning',
  name: 'Harptos (Vale-Reckoning)',
  translations: {
    en: { label: 'Harptos (Vale-Reckoning)', setting: 'Forgotten Realms' },
  },
  months: [
    { name: 'Hammer', days: 30 },
    { name: 'Alturiak', days: 30 },
  ],
  weekdays: [{ name: 'Eleasis' }, { name: 'Eleint' }],
  leapYears: { rule: 'none' },
  year: { epoch: 0, yearZero: false },
  sourceInfo: { type: 'pack', sourceName: 'Fantasy Pack' },
};

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

describe('handleCalendarSelection', () => {
  let calendarManager: CalendarManager;

  beforeEach(() => {
    setupFoundryEnvironment();

    // Create calendar manager and load test calendars
    calendarManager = new CalendarManager();
    calendarManager.loadCalendar(mockGregorianCalendar);
    calendarManager.loadCalendar(mockValeReckoningCalendar);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Calendar Data Caching After Selection', () => {
    it('should call game.settings.set for activeCalendarData when user selects calendar', async () => {
      // Clear mock call history
      vi.clearAllMocks();

      // Simulate user selecting vale-reckoning from dropdown
      await handleCalendarSelection('vale-reckoning', calendarManager);

      // Verify that game.settings.set was called for activeCalendarData
      expect(game.settings.set).toHaveBeenCalledWith(
        'seasons-and-stars',
        'activeCalendarData',
        expect.objectContaining({
          id: 'vale-reckoning',
          name: 'Harptos (Vale-Reckoning)',
        })
      );
    });

    it('should cache calendar data for builtin calendars', async () => {
      vi.clearAllMocks();

      // Simulate user selecting gregorian from dropdown
      await handleCalendarSelection('gregorian', calendarManager);

      // Verify gregorian calendar data is cached
      expect(game.settings.set).toHaveBeenCalledWith(
        'seasons-and-stars',
        'activeCalendarData',
        expect.objectContaining({
          id: 'gregorian',
          name: 'Gregorian Calendar',
        })
      );
    });

    it('should cache complete calendar definition including all properties', async () => {
      vi.clearAllMocks();

      await handleCalendarSelection('vale-reckoning', calendarManager);

      // Find the call that set activeCalendarData
      const setActiveCalendarDataCalls = vi
        .mocked(game.settings.set)
        .mock.calls.filter(
          call => call[0] === 'seasons-and-stars' && call[1] === 'activeCalendarData'
        );

      expect(setActiveCalendarDataCalls).toHaveLength(1);

      const cachedData = setActiveCalendarDataCalls[0][2] as SeasonsStarsCalendar;

      // Verify all critical calendar properties are cached
      expect(cachedData).toMatchObject({
        id: 'vale-reckoning',
        name: expect.any(String),
        months: expect.any(Array),
        weekdays: expect.any(Array),
        leapYears: expect.any(Object),
        year: expect.any(Object),
        translations: expect.any(Object),
        sourceInfo: expect.any(Object),
      });

      // Verify the cached data matches the original calendar
      expect(cachedData.months.length).toBe(mockValeReckoningCalendar.months.length);
      expect(cachedData.weekdays.length).toBe(mockValeReckoningCalendar.weekdays.length);
    });
  });

  describe('Calendar Selection from Different Sources', () => {
    it('should cache calendar loaded from pack module', async () => {
      vi.clearAllMocks();

      // vale-reckoning is from Fantasy Pack
      await handleCalendarSelection('vale-reckoning', calendarManager);

      // Find the cached data
      const setActiveCalendarDataCalls = vi
        .mocked(game.settings.set)
        .mock.calls.filter(
          call => call[0] === 'seasons-and-stars' && call[1] === 'activeCalendarData'
        );

      const cachedData = setActiveCalendarDataCalls[0][2] as SeasonsStarsCalendar;

      expect(cachedData.sourceInfo).toEqual({
        type: 'pack',
        sourceName: 'Fantasy Pack',
      });
    });

    it('should cache calendar loaded from builtin sources', async () => {
      vi.clearAllMocks();

      // gregorian is builtin
      await handleCalendarSelection('gregorian', calendarManager);

      // Find the cached data
      const setActiveCalendarDataCalls = vi
        .mocked(game.settings.set)
        .mock.calls.filter(
          call => call[0] === 'seasons-and-stars' && call[1] === 'activeCalendarData'
        );

      const cachedData = setActiveCalendarDataCalls[0][2] as SeasonsStarsCalendar;

      expect(cachedData.sourceInfo).toEqual({
        type: 'builtin',
      });
    });
  });

  describe('Settings State After onChange', () => {
    it('should not modify activeCalendar setting in onChange handler', async () => {
      // Clear the mock call history before onChange
      vi.clearAllMocks();

      await handleCalendarSelection('vale-reckoning', calendarManager);

      // The onChange handler should NOT call settings.set for activeCalendar
      // because that would trigger onChange recursively
      expect(game.settings.set).not.toHaveBeenCalledWith(
        'seasons-and-stars',
        'activeCalendar',
        expect.anything()
      );
    });

    it('should clear activeCalendarFile when regular calendar is selected', async () => {
      vi.clearAllMocks();

      await handleCalendarSelection('vale-reckoning', calendarManager);

      // activeCalendarFile should be cleared when selecting regular calendar
      expect(game.settings.set).toHaveBeenCalledWith('seasons-and-stars', 'activeCalendarFile', '');
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle empty calendar ID gracefully', async () => {
      // Should not throw on empty string
      await expect(handleCalendarSelection('', calendarManager)).resolves.not.toThrow();
    });

    it('should handle whitespace-only calendar ID gracefully', async () => {
      // Should not throw on whitespace
      await expect(handleCalendarSelection('   ', calendarManager)).resolves.not.toThrow();
    });

    it('should handle unknown calendar ID gracefully', async () => {
      // Should not throw on unknown calendar
      await expect(
        handleCalendarSelection('unknown-calendar-id', calendarManager)
      ).resolves.not.toThrow();
    });
  });

  describe('Regression Prevention for Race Condition', () => {
    it('should prevent "Calendar not found" error on reload by caching data', async () => {
      /**
       * This test simulates the race condition scenario:
       * 1. User selects vale-reckoning from dropdown
       * 2. onChange handler runs
       * 3. World reloads
       * 4. initializeSync() runs before async calendar pack loading completes
       * 5. initializeSync() should find cached calendar data and load successfully
       */
      vi.clearAllMocks();

      // Step 1-2: User selects vale-reckoning
      await handleCalendarSelection('vale-reckoning', calendarManager);

      // Verify calendar data was cached via game.settings.set call
      const setActiveCalendarDataCalls = vi
        .mocked(game.settings.set)
        .mock.calls.filter(
          call => call[0] === 'seasons-and-stars' && call[1] === 'activeCalendarData'
        );

      expect(setActiveCalendarDataCalls).toHaveLength(1);

      const cachedData = setActiveCalendarDataCalls[0][2] as SeasonsStarsCalendar;
      expect(cachedData.id).toBe('vale-reckoning');

      // Step 3-4: Simulate world reload with cached data
      // Create new calendar manager to simulate fresh start
      const reloadedManager = new CalendarManager();

      // Mock settings to return cached data
      vi.mocked(game.settings.get).mockImplementation((module, key) => {
        if (module === 'seasons-and-stars' && key === 'activeCalendar') return 'vale-reckoning';
        if (module === 'seasons-and-stars' && key === 'activeCalendarData') return cachedData;
        if (module === 'seasons-and-stars' && key === 'activeCalendarFile') return '';
        return undefined;
      });

      // Step 5: initializeSync should successfully load from cache
      const syncResult = reloadedManager.initializeSync();

      expect(syncResult).toBe(true);
      expect(reloadedManager.getActiveCalendar()).toBeDefined();
      expect(reloadedManager.getActiveCalendar()?.id).toBe('vale-reckoning');
    });

    it('should cache data even though saveToSettings is false in setActiveCalendar call', async () => {
      /**
       * This is the core bug: onChange handler calls:
       *   setActiveCalendar(value, false, 'user-change')
       * with saveToSettings=false to avoid recursive onChange.
       *
       * But calendar data caching only happens when saveToSettings=true.
       * This test verifies that data IS cached despite saveToSettings=false.
       */
      vi.clearAllMocks();

      // User selects calendar from dropdown
      await handleCalendarSelection('vale-reckoning', calendarManager);

      // After onChange completes, activeCalendarData MUST have been set
      const setActiveCalendarDataCalls = vi
        .mocked(game.settings.set)
        .mock.calls.filter(
          call => call[0] === 'seasons-and-stars' && call[1] === 'activeCalendarData'
        );

      expect(setActiveCalendarDataCalls.length).toBeGreaterThan(0);

      const cachedData = setActiveCalendarDataCalls[0][2] as SeasonsStarsCalendar;
      expect(cachedData).toBeDefined();
      expect(cachedData.id).toBe('vale-reckoning');
    });
  });
});
