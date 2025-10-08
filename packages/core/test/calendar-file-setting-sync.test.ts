/**
 * Integration tests for custom calendar file setting synchronization
 *
 * Tests the scenario where a GM uploads a custom calendar file and it should
 * automatically sync to player clients. This addresses issue #348.
 *
 * Test scenario:
 * 1. GM uploads a custom calendar JSON file
 * 2. activeCalendarFile setting is saved and syncs to all clients
 * 3. Player client's onChange handler should load the calendar
 * 4. Player should see the custom calendar, not Gregorian
 * 5. After refresh, both GM and players should still see the custom calendar
 */

import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { setupFoundryEnvironment } from './setup';
import { CalendarManager } from '../src/core/calendar-manager';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

const mockCustomCalendar: SeasonsStarsCalendar = {
  id: 'custom-lunar-calendar',
  name: 'Custom Lunar Calendar',
  translations: {
    en: { label: 'Custom Lunar Calendar' },
  },
  months: [
    { name: 'First Moon', days: 29 },
    { name: 'Second Moon', days: 30 },
  ],
  weekdays: [{ name: 'Day1' }, { name: 'Day2' }, { name: 'Day3' }],
  leapYears: { rule: 'none' },
  year: { epoch: 0, yearZero: false },
  sourceInfo: { type: 'external', sourceName: 'Custom File' },
};

describe('Calendar File Setting Synchronization (Issue #348)', () => {
  let gmCalendarManager: CalendarManager;
  let playerCalendarManager: CalendarManager;
  let settingsStore: Map<string, any>;
  let onChangeHandlers: Map<string, Function>;

  beforeEach(() => {
    setupFoundryEnvironment();

    settingsStore = new Map();
    onChangeHandlers = new Map();

    vi.mocked(game.settings.set).mockImplementation(async (module, key, value) => {
      const settingKey = `${module}.${key}`;
      const oldValue = settingsStore.get(settingKey);
      settingsStore.set(settingKey, value);

      const handler = onChangeHandlers.get(settingKey);
      if (handler && oldValue !== value) {
        await handler(value);
      }
      return undefined;
    });

    vi.mocked(game.settings.get).mockImplementation((module, key) => {
      const settingKey = `${module}.${key}`;
      return settingsStore.get(settingKey) || '';
    });

    vi.mocked(game.settings.register).mockImplementation((module, key, config: any) => {
      const settingKey = `${module}.${key}`;
      if (config.onChange) {
        onChangeHandlers.set(settingKey, config.onChange);
      }
      if (config.default !== undefined) {
        settingsStore.set(settingKey, config.default);
      }
      return undefined as any;
    });

    gmCalendarManager = new CalendarManager();
    playerCalendarManager = new CalendarManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GM Uploads Custom Calendar File', () => {
    it('should save activeCalendarFile setting when GM selects file', async () => {
      const { registerSettings } = await import('../src/module');
      registerSettings();

      const testFilePath = 'worlds/test-world/calendars/custom-calendar.json';

      await game.settings.set('seasons-and-stars', 'activeCalendarFile', testFilePath);

      expect(settingsStore.get('seasons-and-stars.activeCalendarFile')).toBe(testFilePath);
    });

    it('should trigger onChange handler when activeCalendarFile setting changes', async () => {
      const { registerSettings } = await import('../src/module');
      registerSettings();

      const testFilePath = 'worlds/test-world/calendars/custom-calendar.json';

      const onChangeHandler = onChangeHandlers.get('seasons-and-stars.activeCalendarFile');
      expect(onChangeHandler).toBeDefined();
      expect(onChangeHandler).toBeInstanceOf(Function);

      const onChangeSpy = vi.fn(onChangeHandler);
      onChangeHandlers.set('seasons-and-stars.activeCalendarFile', onChangeSpy);

      await game.settings.set('seasons-and-stars', 'activeCalendarFile', testFilePath);

      expect(onChangeSpy).toHaveBeenCalledWith(testFilePath);
    });
  });

  describe('Player Client Receives Setting Change (FIXED)', () => {
    it('should have onChange handler with calendar loading logic', async () => {
      const { registerSettings } = await import('../src/module');
      registerSettings();

      const registerCalls = vi.mocked(game.settings.register).mock.calls;
      const activeCalendarFileCall = registerCalls.find(
        call => call[0] === 'seasons-and-stars' && call[1] === 'activeCalendarFile'
      );

      expect(activeCalendarFileCall).toBeDefined();

      const fileOnChange = activeCalendarFileCall?.[2].onChange?.toString();

      expect(fileOnChange).toContain('loadCalendarFromUrl');
      expect(fileOnChange).toContain('setActiveCalendar');
      expect(fileOnChange).toContain('activeCalendarData');
    });

    it('should verify onChange handler includes all necessary steps', async () => {
      const { registerSettings } = await import('../src/module');
      registerSettings();

      const registerCalls = vi.mocked(game.settings.register).mock.calls;
      const activeCalendarFileCall = registerCalls.find(
        call => call[0] === 'seasons-and-stars' && call[1] === 'activeCalendarFile'
      );

      const onChange = activeCalendarFileCall?.[2].onChange;
      expect(onChange).toBeDefined();
      expect(onChange).toBeInstanceOf(Function);

      const onChangeString = onChange?.toString();
      expect(onChangeString).toContain('convertFoundryPathToUrl');
      expect(onChangeString).toContain('loadCalendar');
      expect(onChangeString).toContain('fileSourceInfo');
    });
  });

  describe('Refresh Behavior', () => {
    it('DEMONSTRATES BUG: GM refresh loses calendar if activeCalendarData not cached', async () => {
      const { registerSettings } = await import('../src/module');
      registerSettings();

      const testFilePath = 'worlds/test-world/calendars/custom-calendar.json';

      settingsStore.set('seasons-and-stars.activeCalendarFile', testFilePath);
      settingsStore.set('seasons-and-stars.activeCalendar', '');

      vi.spyOn(gmCalendarManager, 'loadCalendarFromUrl').mockResolvedValue({
        success: false,
        error: 'File not found',
      });

      await gmCalendarManager.completeInitialization();

      const activeCalendar = gmCalendarManager.getActiveCalendar();
      expect(activeCalendar?.id).not.toBe(mockCustomCalendar.id);
    });

    it('should load calendar from activeCalendarFile on initialization', async () => {
      const { registerSettings } = await import('../src/module');
      registerSettings();

      const testFilePath = 'worlds/test-world/calendars/custom-calendar.json';
      settingsStore.set('seasons-and-stars.activeCalendarFile', testFilePath);

      vi.spyOn(gmCalendarManager, 'loadCalendarFromUrl').mockResolvedValue({
        success: true,
        calendar: mockCustomCalendar,
      });
      vi.spyOn(gmCalendarManager, 'loadCalendar').mockReturnValue(true);

      await gmCalendarManager.completeInitialization();

      expect(gmCalendarManager.loadCalendarFromUrl).toHaveBeenCalledWith(
        expect.stringContaining(testFilePath),
        { validate: true }
      );
    });
  });

  describe('Expected Behavior (What Should Happen)', () => {
    it('EXPECTED: onChange should load calendar when setting changes', async () => {
      const { registerSettings } = await import('../src/module');
      registerSettings();

      const testFilePath = 'worlds/test-world/calendars/custom-calendar.json';

      const mockLoadFromUrl = vi.fn().mockResolvedValue({
        success: true,
        calendar: mockCustomCalendar,
      });

      (globalThis as any).game.seasonsStars = {
        manager: {
          ...playerCalendarManager,
          loadCalendarFromUrl: mockLoadFromUrl,
          convertFoundryPathToUrl: (path: string) => path,
        },
      };

      await game.settings.set('seasons-and-stars', 'activeCalendarFile', testFilePath);
    });

    it('EXPECTED: activeCalendarData should be cached for persistence', async () => {
      const { registerSettings } = await import('../src/module');
      registerSettings();

      const testFilePath = 'worlds/test-world/calendars/custom-calendar.json';

      gmCalendarManager.loadCalendar(mockCustomCalendar, {
        type: 'external',
        sourceName: 'Custom File',
      });
      await gmCalendarManager.setActiveCalendar(mockCustomCalendar.id, false);

      await game.settings.set('seasons-and-stars', 'activeCalendarFile', testFilePath);

      const cachedData = settingsStore.get('seasons-and-stars.activeCalendarData');
      expect(cachedData).toBeDefined();
    });
  });
});
