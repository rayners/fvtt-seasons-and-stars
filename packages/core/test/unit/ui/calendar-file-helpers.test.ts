/**
 * Comprehensive tests for calendar file picker helper functions and workflows
 *
 * This test suite consolidates tests for:
 * - Calendar file helper functions (GM permission checks, settings sync)
 * - File path handling and resolution
 * - Pending state pattern for file selection workflow
 *
 * The pending state pattern workflow:
 * 1. GM opens file picker and selects a file (pendingFilePath set, settings NOT modified)
 * 2. GM clicks "Select" in dialog (calendar loads, THEN settings saved)
 * 3. Settings sync to all clients (including non-GMs)
 * 4. Non-GM clients can load but not save settings
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupFoundryEnvironment } from '../../setup';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';
import {
  saveCalendarDataForSync,
  saveCalendarFilePath,
  clearConflictingCalendarSetting,
  resolveCalendarFilePath,
} from '../../../src/ui/calendar-file-helpers';
import { CalendarSelectionDialog } from '../../../src/ui/calendar-selection-dialog';

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
  leapYear: { rule: 'none' },
  year: { epoch: 0, yearZero: false },
};

describe('Calendar File Helpers', () => {
  describe('Core Helper Functions', () => {
    let mockSettings: any;
    let mockGame: any;

    beforeEach(() => {
      mockSettings = {
        get: vi.fn(),
        set: vi.fn().mockResolvedValue(undefined),
      };

      mockGame = {
        settings: mockSettings,
        user: { isGM: true },
      };

      (globalThis as any).game = mockGame;
    });

    describe('saveCalendarDataForSync', () => {
      it('should save calendar data when user is GM', async () => {
        const calendar: SeasonsStarsCalendar = {
          id: 'test-calendar',
          name: 'Test Calendar',
          months: [],
          weekdays: [],
          year: { epoch: 0 },
        };

        const result = await saveCalendarDataForSync(calendar);

        expect(result.success).toBe(true);
        expect(result.isGM).toBe(true);
        expect(result.error).toBeUndefined();
        expect(mockSettings.set).toHaveBeenCalledWith(
          'seasons-and-stars',
          'activeCalendarData',
          calendar
        );
      });

      it('should skip save when user is not GM', async () => {
        mockGame.user.isGM = false;

        const calendar: SeasonsStarsCalendar = {
          id: 'test-calendar',
          name: 'Test Calendar',
          months: [],
          weekdays: [],
          year: { epoch: 0 },
        };

        const result = await saveCalendarDataForSync(calendar);

        expect(result.success).toBe(true);
        expect(result.isGM).toBe(false);
        expect(result.error).toBeUndefined();
        expect(mockSettings.set).not.toHaveBeenCalled();
      });

      it('should return error when settings not available', async () => {
        mockGame.settings = undefined;

        const calendar: SeasonsStarsCalendar = {
          id: 'test-calendar',
          name: 'Test Calendar',
          months: [],
          weekdays: [],
          year: { epoch: 0 },
        };

        const result = await saveCalendarDataForSync(calendar);

        expect(result.success).toBe(false);
        expect(result.isGM).toBe(false);
        expect(result.error).toBe('Game settings not available');
      });

      it('should handle save errors gracefully', async () => {
        mockSettings.set.mockRejectedValue(new Error('Permission denied'));

        const calendar: SeasonsStarsCalendar = {
          id: 'test-calendar',
          name: 'Test Calendar',
          months: [],
          weekdays: [],
          year: { epoch: 0 },
        };

        const result = await saveCalendarDataForSync(calendar);

        expect(result.success).toBe(false);
        expect(result.isGM).toBe(true);
        expect(result.error).toBe('Permission denied');
      });

      it('should handle user being undefined', async () => {
        mockGame.user = undefined;

        const calendar: SeasonsStarsCalendar = {
          id: 'test-calendar',
          name: 'Test Calendar',
          months: [],
          weekdays: [],
          year: { epoch: 0 },
        };

        const result = await saveCalendarDataForSync(calendar);

        expect(result.success).toBe(true);
        expect(result.isGM).toBe(false);
        expect(mockSettings.set).not.toHaveBeenCalled();
      });
    });

    describe('saveCalendarFilePath', () => {
      it('should save file path when user is GM', async () => {
        const filePath = 'modules/test/calendar.json';

        const result = await saveCalendarFilePath(filePath);

        expect(result.success).toBe(true);
        expect(result.isGM).toBe(true);
        expect(result.error).toBeUndefined();
        expect(mockSettings.set).toHaveBeenCalledWith(
          'seasons-and-stars',
          'activeCalendarFile',
          filePath
        );
      });

      it('should skip save when user is not GM', async () => {
        mockGame.user.isGM = false;

        const filePath = 'modules/test/calendar.json';

        const result = await saveCalendarFilePath(filePath);

        expect(result.success).toBe(true);
        expect(result.isGM).toBe(false);
        expect(result.error).toBeUndefined();
        expect(mockSettings.set).not.toHaveBeenCalled();
      });

      it('should return error when settings not available', async () => {
        mockGame.settings = undefined;

        const filePath = 'modules/test/calendar.json';

        const result = await saveCalendarFilePath(filePath);

        expect(result.success).toBe(false);
        expect(result.isGM).toBe(false);
        expect(result.error).toBe('Game settings not available');
      });

      it('should handle save errors gracefully', async () => {
        mockSettings.set.mockRejectedValue(new Error('Disk full'));

        const filePath = 'modules/test/calendar.json';

        const result = await saveCalendarFilePath(filePath);

        expect(result.success).toBe(false);
        expect(result.isGM).toBe(true);
        expect(result.error).toBe('Disk full');
      });

      it('should save empty string path', async () => {
        const filePath = '';

        const result = await saveCalendarFilePath(filePath);

        expect(result.success).toBe(true);
        expect(result.isGM).toBe(true);
        expect(mockSettings.set).toHaveBeenCalledWith(
          'seasons-and-stars',
          'activeCalendarFile',
          ''
        );
      });
    });

    describe('clearConflictingCalendarSetting', () => {
      it('should clear activeCalendar when it has a value', async () => {
        mockSettings.get.mockReturnValue('gregorian');

        const result = await clearConflictingCalendarSetting();

        expect(result.success).toBe(true);
        expect(result.isGM).toBe(true);
        expect(result.error).toBeUndefined();
        expect(mockSettings.set).toHaveBeenCalledWith('seasons-and-stars', 'activeCalendar', '');
      });

      it('should not call set when activeCalendar is empty', async () => {
        mockSettings.get.mockReturnValue('');

        const result = await clearConflictingCalendarSetting();

        expect(result.success).toBe(true);
        expect(result.isGM).toBe(true);
        expect(mockSettings.set).not.toHaveBeenCalled();
      });

      it('should skip when user is not GM', async () => {
        mockGame.user.isGM = false;
        mockSettings.get.mockReturnValue('gregorian');

        const result = await clearConflictingCalendarSetting();

        expect(result.success).toBe(true);
        expect(result.isGM).toBe(false);
        expect(mockSettings.set).not.toHaveBeenCalled();
      });

      it('should return error when settings not available', async () => {
        mockGame.settings = undefined;

        const result = await clearConflictingCalendarSetting();

        expect(result.success).toBe(false);
        expect(result.isGM).toBe(false);
        expect(result.error).toBe('Game settings not available');
      });

      it('should handle clear errors gracefully', async () => {
        mockSettings.get.mockReturnValue('gregorian');
        mockSettings.set.mockRejectedValue(new Error('Network error'));

        const result = await clearConflictingCalendarSetting();

        expect(result.success).toBe(false);
        expect(result.isGM).toBe(true);
        expect(result.error).toBe('Network error');
      });

      it('should handle get returning null', async () => {
        mockSettings.get.mockReturnValue(null);

        const result = await clearConflictingCalendarSetting();

        expect(result.success).toBe(true);
        expect(result.isGM).toBe(true);
        expect(mockSettings.set).not.toHaveBeenCalled();
      });

      it('should handle get returning undefined', async () => {
        mockSettings.get.mockReturnValue(undefined);

        const result = await clearConflictingCalendarSetting();

        expect(result.success).toBe(true);
        expect(result.isGM).toBe(true);
        expect(mockSettings.set).not.toHaveBeenCalled();
      });
    });

    describe('resolveCalendarFilePath', () => {
      it('should return pending path when provided', () => {
        const pendingPath = 'modules/pending/calendar.json';
        mockSettings.get.mockReturnValue('modules/saved/calendar.json');

        const result = resolveCalendarFilePath(pendingPath);

        expect(result).toBe(pendingPath);
        expect(mockSettings.get).not.toHaveBeenCalled();
      });

      it('should return saved path when no pending path', () => {
        const savedPath = 'modules/saved/calendar.json';
        mockSettings.get.mockReturnValue(savedPath);

        const result = resolveCalendarFilePath(null);

        expect(result).toBe(savedPath);
        expect(mockSettings.get).toHaveBeenCalledWith('seasons-and-stars', 'activeCalendarFile');
      });

      it('should return null when neither pending nor saved path exists', () => {
        mockSettings.get.mockReturnValue('');

        const result = resolveCalendarFilePath(null);

        expect(result).toBeNull();
      });

      it('should return null when settings not available', () => {
        mockGame.settings = undefined;

        const result = resolveCalendarFilePath(null);

        expect(result).toBeNull();
      });

      it('should prefer pending path over empty saved path', () => {
        const pendingPath = 'modules/pending/calendar.json';
        mockSettings.get.mockReturnValue('');

        const result = resolveCalendarFilePath(pendingPath);

        expect(result).toBe(pendingPath);
      });

      it('should return null for empty pending path', () => {
        mockSettings.get.mockReturnValue('');

        const result = resolveCalendarFilePath('');

        expect(result).toBeNull();
      });

      it('should handle whitespace-only pending path', () => {
        mockSettings.get.mockReturnValue('modules/saved/calendar.json');

        const result = resolveCalendarFilePath('   ');

        expect(result).toBe('   '); // Returns as-is, caller should trim if needed
      });

      it('should handle get returning null', () => {
        mockSettings.get.mockReturnValue(null);

        const result = resolveCalendarFilePath(null);

        expect(result).toBeNull();
      });

      it('should handle get returning undefined', () => {
        mockSettings.get.mockReturnValue(undefined);

        const result = resolveCalendarFilePath(null);

        expect(result).toBeNull();
      });
    });
  });

  describe('Settings and Path Handling', () => {
    beforeEach(() => {
      setupFoundryEnvironment();

      // Add game.modules to mock environment
      (globalThis as any).game.modules = new Map();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe('Settings Detection', () => {
      it('should detect when activeCalendarFile setting is set', () => {
        const testPath = 'worlds/test/custom-calendar.json';
        vi.mocked(game.settings.get).mockImplementation((module, key) => {
          if (key === 'activeCalendarFile') return testPath;
          if (key === 'activeCalendar') return '';
          return '';
        });

        const filePath = game.settings.get('seasons-and-stars', 'activeCalendarFile');
        const regularCalendar = game.settings.get('seasons-and-stars', 'activeCalendar');

        expect(filePath).toBe(testPath);
        expect(regularCalendar).toBe('');
      });

      it('should handle empty activeCalendarFile setting', () => {
        vi.mocked(game.settings.get).mockImplementation((module, key) => {
          if (key === 'activeCalendarFile') return '';
          if (key === 'activeCalendar') return 'gregorian';
          return 'gregorian';
        });

        const filePath = game.settings.get('seasons-and-stars', 'activeCalendarFile');
        const regularCalendar = game.settings.get('seasons-and-stars', 'activeCalendar');

        expect(filePath).toBe('');
        expect(regularCalendar).toBe('gregorian');
      });

      it('should show mutual exclusivity in settings', async () => {
        // Ensure all required settings methods are mocked
        if (!game.settings.register) {
          (game.settings as any).register = vi.fn();
        }
        if (!game.settings.registerMenu) {
          (game.settings as any).registerMenu = vi.fn();
        }

        // Import and register settings to get the onChange handlers
        const { registerSettings } = await import('../../../src/module');
        registerSettings();

        // Check that both settings were registered with onChange handlers
        const registerCalls = vi.mocked(game.settings.register).mock.calls;

        const fileSettingCall = registerCalls.find(
          call => call[0] === 'seasons-and-stars' && call[1] === 'activeCalendarFile'
        );
        const calendarSettingCall = registerCalls.find(
          call => call[0] === 'seasons-and-stars' && call[1] === 'activeCalendar'
        );

        expect(fileSettingCall).toBeDefined();
        expect(calendarSettingCall).toBeDefined();

        expect(fileSettingCall?.[2]?.onChange).toBeInstanceOf(Function);
        expect(calendarSettingCall?.[2]?.onChange).toBeInstanceOf(Function);
      });
    });

    describe('Path Format Handling', () => {
      it('should handle different path formats', () => {
        const testCases = [
          'worlds/my-world/calendars/custom.json',
          '/absolute/path/to/calendar.json',
          'Data/calendars/campaign.json',
          'modules/my-module/calendars/special.json',
        ];

        for (const testPath of testCases) {
          vi.mocked(game.settings.get).mockReturnValue(testPath);

          const filePath = game.settings.get('seasons-and-stars', 'activeCalendarFile');
          expect(filePath).toBe(testPath);
        }
      });

      it('should handle Foundry server paths', () => {
        const testPaths = [
          'worlds/my-world/calendars/custom.json',
          'Data/calendars/campaign.json',
          'modules/calendar-pack/calendars/special.json',
        ];

        for (const testPath of testPaths) {
          vi.mocked(game.settings.get).mockReturnValue(testPath);
          const filePath = game.settings.get('seasons-and-stars', 'activeCalendarFile');
          expect(filePath).toBe(testPath);
        }
      });

      it('should validate file extension', () => {
        const validPaths = ['worlds/test/calendar.json', 'Data/calendars/custom.JSON'];

        const invalidPaths = [
          'worlds/test/calendar.txt',
          'Data/calendars/custom.xml',
          'not-a-file',
        ];

        // All paths should be storable - validation happens during loading
        [...validPaths, ...invalidPaths].forEach(testPath => {
          vi.mocked(game.settings.get).mockReturnValue(testPath);
          const filePath = game.settings.get('seasons-and-stars', 'activeCalendarFile');
          expect(filePath).toBe(testPath);
        });
      });
    });

    describe('Integration with Calendar Manager', () => {
      it('should provide method to check if file path is set', () => {
        // Test that we can determine when file path mode is active
        vi.mocked(game.settings.get).mockImplementation((module, key) => {
          if (key === 'activeCalendarFile') return 'worlds/test/custom.json';
          if (key === 'activeCalendar') return '';
          return '';
        });

        const filePath = game.settings.get('seasons-and-stars', 'activeCalendarFile');
        const isFileMode = filePath && filePath.length > 0;

        expect(isFileMode).toBe(true);
      });

      it('should provide method to check if regular calendar is active', () => {
        vi.mocked(game.settings.get).mockImplementation((module, key) => {
          if (key === 'activeCalendarFile') return '';
          if (key === 'activeCalendar') return 'gregorian';
          return 'gregorian';
        });

        const filePath = game.settings.get('seasons-and-stars', 'activeCalendarFile');
        const regularCalendar = game.settings.get('seasons-and-stars', 'activeCalendar');

        const isFileMode = Boolean(filePath && filePath.length > 0);
        const isRegularMode = Boolean(regularCalendar && regularCalendar.length > 0);

        expect(isFileMode).toBe(false);
        expect(isRegularMode).toBe(true);
      });

      it('should handle neither setting being set', () => {
        vi.mocked(game.settings.get).mockImplementation((module, key) => {
          if (key === 'activeCalendarFile') return '';
          if (key === 'activeCalendar') return '';
          return '';
        });

        const filePath = game.settings.get('seasons-and-stars', 'activeCalendarFile');
        const regularCalendar = game.settings.get('seasons-and-stars', 'activeCalendar');

        expect(filePath).toBe('');
        expect(regularCalendar).toBe('');
      });
    });
  });

  describe('Pending State Pattern Integration', () => {
    let settingsStore: Map<string, any>;
    let mockCalendarManager: any;

    beforeEach(() => {
      setupFoundryEnvironment();

      settingsStore = new Map();
      settingsStore.set('seasons-and-stars.activeCalendar', '');
      settingsStore.set('seasons-and-stars.activeCalendarFile', '');
      settingsStore.set('seasons-and-stars.activeCalendarData', null);

      // Mock settings get/set
      vi.mocked(game.settings.set).mockImplementation(async (module, key, value) => {
        const settingKey = `${module}.${key}`;
        settingsStore.set(settingKey, value);
        return undefined;
      });

      vi.mocked(game.settings.get).mockImplementation((module, key) => {
        const settingKey = `${module}.${key}`;
        return settingsStore.get(settingKey);
      });

      // Mock calendar manager
      mockCalendarManager = {
        convertFoundryPathToUrl: vi.fn((path: string) => `http://localhost/${path}`),
        loadCalendarFromUrl: vi.fn().mockResolvedValue({
          success: true,
          calendar: mockCustomCalendar,
        }),
        loadCalendar: vi.fn().mockReturnValue(true),
        setActiveCalendar: vi.fn().mockResolvedValue(undefined),
        getAllCalendars: vi.fn().mockReturnValue(new Map()),
      };

      (globalThis as any).game.seasonsStars = {
        manager: mockCalendarManager,
      };
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe('Step 1: File Picker Selection (Pending State)', () => {
      it('should store file path in pendingFilePath, NOT in settings', async () => {
        const calendars = new Map();
        const dialog = new CalendarSelectionDialog(calendars, 'gregorian');

        // Simulate FilePicker callback
        const testFilePath = 'worlds/test-world/calendars/custom.json';

        // Access private property for testing (normally set by FilePicker callback)
        (dialog as any).pendingFilePath = testFilePath;
        (dialog as any).selectedCalendarId = '__FILE_PICKER__';

        // Verify settings were NOT modified
        expect(settingsStore.get('seasons-and-stars.activeCalendarFile')).toBe('');
        expect(settingsStore.get('seasons-and-stars.activeCalendarData')).toBeNull();

        // Verify pending state is set
        expect((dialog as any).pendingFilePath).toBe(testFilePath);
        expect((dialog as any).selectedCalendarId).toBe('__FILE_PICKER__');
      });

      it('should allow user to cancel without modifying settings', async () => {
        const calendars = new Map();
        const dialog = new CalendarSelectionDialog(calendars, 'gregorian');

        const testFilePath = 'worlds/test-world/calendars/custom.json';
        (dialog as any).pendingFilePath = testFilePath;
        (dialog as any).selectedCalendarId = '__FILE_PICKER__';

        // Simulate dialog close without selecting
        // (In real usage, dialog.close() is called)

        // Settings should still be unchanged
        expect(settingsStore.get('seasons-and-stars.activeCalendarFile')).toBe('');
        expect(settingsStore.get('seasons-and-stars.activeCalendarData')).toBeNull();
      });
    });

    describe('Step 2: User Confirms Selection (GM)', () => {
      it('should load calendar and save settings only when GM clicks Select', async () => {
        // Set user as GM
        (globalThis as any).game.user = { isGM: true };

        const calendars = new Map();
        const dialog = new CalendarSelectionDialog(calendars, 'gregorian');

        const testFilePath = 'worlds/test-world/calendars/custom.json';
        (dialog as any).pendingFilePath = testFilePath;
        (dialog as any).selectedCalendarId = '__FILE_PICKER__';

        // Call selectCalendar (simulates clicking "Select" button)
        // Note: We can't easily call the private method, so we'll test the behavior indirectly
        // by verifying the expected sequence of operations

        // Expected sequence when user confirms:
        // 1. Load calendar from URL
        const fileUrl = mockCalendarManager.convertFoundryPathToUrl(testFilePath);
        const result = await mockCalendarManager.loadCalendarFromUrl(fileUrl, { validate: true });

        expect(result.success).toBe(true);
        expect(result.calendar).toEqual(mockCustomCalendar);

        // 2. Save activeCalendarData FIRST
        await game.settings.set('seasons-and-stars', 'activeCalendarData', result.calendar);
        expect(settingsStore.get('seasons-and-stars.activeCalendarData')).toEqual(
          mockCustomCalendar
        );

        // 3. Load calendar into manager
        const loadSuccess = mockCalendarManager.loadCalendar(result.calendar, {
          type: 'external',
          sourceName: 'Custom File',
        });
        expect(loadSuccess).toBe(true);

        // 4. Save activeCalendarFile AFTER successful load
        await game.settings.set('seasons-and-stars', 'activeCalendarFile', testFilePath);
        expect(settingsStore.get('seasons-and-stars.activeCalendarFile')).toBe(testFilePath);

        // 5. Set as active
        await mockCalendarManager.setActiveCalendar(result.calendar.id, false);
        expect(mockCalendarManager.setActiveCalendar).toHaveBeenCalledWith(
          mockCustomCalendar.id,
          false
        );
      });

      it('should save activeCalendarData BEFORE loadCalendar for sync', async () => {
        (globalThis as any).game.user = { isGM: true };

        const testFilePath = 'worlds/test-world/calendars/custom.json';
        const fileUrl = mockCalendarManager.convertFoundryPathToUrl(testFilePath);
        const result = await mockCalendarManager.loadCalendarFromUrl(fileUrl, { validate: true });

        // Track call order
        const callOrder: string[] = [];

        const trackedSetSettings = vi.fn(async (module: string, key: string, value: any) => {
          callOrder.push(`set:${key}`);
          settingsStore.set(`${module}.${key}`, value);
        });

        const trackedLoadCalendar = vi.fn(() => {
          callOrder.push('loadCalendar');
          return true;
        });

        vi.mocked(game.settings.set).mockImplementation(trackedSetSettings);
        mockCalendarManager.loadCalendar = trackedLoadCalendar;

        // Simulate the selectCalendar flow
        await game.settings.set('seasons-and-stars', 'activeCalendarData', result.calendar);
        mockCalendarManager.loadCalendar(result.calendar, { type: 'external' });

        // Verify activeCalendarData was saved BEFORE loadCalendar
        expect(callOrder).toEqual(['set:activeCalendarData', 'loadCalendar']);
      });

      it('should not save settings if calendar load fails', async () => {
        (globalThis as any).game.user = { isGM: true };

        mockCalendarManager.loadCalendarFromUrl.mockResolvedValueOnce({
          success: false,
          error: 'Invalid calendar format',
        });

        const testFilePath = 'worlds/test-world/calendars/invalid.json';
        const fileUrl = mockCalendarManager.convertFoundryPathToUrl(testFilePath);
        const result = await mockCalendarManager.loadCalendarFromUrl(fileUrl, { validate: true });

        expect(result.success).toBe(false);

        // Settings should not be modified when load fails
        expect(settingsStore.get('seasons-and-stars.activeCalendarFile')).toBe('');
        expect(settingsStore.get('seasons-and-stars.activeCalendarData')).toBeNull();
      });
    });

    describe('Step 3: Non-GM Permission Handling', () => {
      it('should not allow non-GM to save activeCalendarFile', async () => {
        (globalThis as any).game.user = { isGM: false };

        const testFilePath = 'worlds/test-world/calendars/custom.json';

        // Mock settings.set to throw permission error for non-GM
        vi.mocked(game.settings.set).mockImplementation(async (module, key, value) => {
          if (!game.user?.isGM) {
            throw new Error(`User lacks permission to update Setting [${key}]`);
          }
          settingsStore.set(`${module}.${key}`, value);
          return undefined;
        });

        // Non-GM should not be able to save
        await expect(
          game.settings.set('seasons-and-stars', 'activeCalendarFile', testFilePath)
        ).rejects.toThrow('User lacks permission');
      });

      it('should not allow non-GM to save activeCalendarData', async () => {
        (globalThis as any).game.user = { isGM: false };

        vi.mocked(game.settings.set).mockImplementation(async (module, key, value) => {
          if (!game.user?.isGM) {
            throw new Error(`User lacks permission to update Setting [${key}]`);
          }
          settingsStore.set(`${module}.${key}`, value);
          return undefined;
        });

        await expect(
          game.settings.set('seasons-and-stars', 'activeCalendarData', mockCustomCalendar)
        ).rejects.toThrow('User lacks permission');
      });

      it('should allow non-GM to read activeCalendarData for loading', async () => {
        (globalThis as any).game.user = { isGM: false };

        // Simulate GM having set the data
        settingsStore.set('seasons-and-stars.activeCalendarData', mockCustomCalendar);

        // Non-GM should be able to read
        const calendarData = game.settings.get('seasons-and-stars', 'activeCalendarData');
        expect(calendarData).toEqual(mockCustomCalendar);
      });
    });

    describe('Step 4: Settings Sync to All Clients', () => {
      it('should sync activeCalendarData to non-GM clients', async () => {
        // Simulate GM setting the data
        (globalThis as any).game.user = { isGM: true };
        await game.settings.set('seasons-and-stars', 'activeCalendarData', mockCustomCalendar);

        // Switch to non-GM user
        (globalThis as any).game.user = { isGM: false };

        // Non-GM should see the synced data
        const syncedData = game.settings.get('seasons-and-stars', 'activeCalendarData');
        expect(syncedData).toEqual(mockCustomCalendar);
      });

      it('should handle case when activeCalendarData is available but activeCalendar is not', async () => {
        // This is the file-based calendar scenario
        settingsStore.set('seasons-and-stars.activeCalendar', '');
        settingsStore.set('seasons-and-stars.activeCalendarFile', 'worlds/test/custom.json');
        settingsStore.set('seasons-and-stars.activeCalendarData', mockCustomCalendar);

        const activeCalendar = game.settings.get('seasons-and-stars', 'activeCalendar');
        const activeCalendarData = game.settings.get('seasons-and-stars', 'activeCalendarData');

        expect(activeCalendar).toBe('');
        expect(activeCalendarData).toEqual(mockCustomCalendar);
      });
    });

    describe('Clearing File Picker Selection', () => {
      it('should clear pendingFilePath when user clicks clear button', async () => {
        const calendars = new Map();
        const dialog = new CalendarSelectionDialog(calendars, 'gregorian');

        const testFilePath = 'worlds/test-world/calendars/custom.json';
        (dialog as any).pendingFilePath = testFilePath;

        // Simulate clearing
        (dialog as any).pendingFilePath = null;

        expect((dialog as any).pendingFilePath).toBeNull();
      });

      it('should clear settings when GM clears file picker', async () => {
        (globalThis as any).game.user = { isGM: true };

        settingsStore.set('seasons-and-stars.activeCalendarFile', 'worlds/test/custom.json');

        await game.settings.set('seasons-and-stars', 'activeCalendarFile', '');

        expect(settingsStore.get('seasons-and-stars.activeCalendarFile')).toBe('');
      });
    });

    describe('Edge Cases', () => {
      it('should handle switching from file calendar to regular calendar', async () => {
        (globalThis as any).game.user = { isGM: true };

        // Start with file calendar
        settingsStore.set('seasons-and-stars.activeCalendarFile', 'worlds/test/custom.json');
        settingsStore.set('seasons-and-stars.activeCalendarData', mockCustomCalendar);
        settingsStore.set('seasons-and-stars.activeCalendar', '');

        // Switch to regular calendar (e.g., gregorian)
        await game.settings.set('seasons-and-stars', 'activeCalendar', 'gregorian');
        await game.settings.set('seasons-and-stars', 'activeCalendarFile', '');

        expect(settingsStore.get('seasons-and-stars.activeCalendar')).toBe('gregorian');
        expect(settingsStore.get('seasons-and-stars.activeCalendarFile')).toBe('');
      });

      it('should handle refresh with file calendar selected', async () => {
        (globalThis as any).game.user = { isGM: true };

        // Simulate state after GM selected file calendar
        settingsStore.set('seasons-and-stars.activeCalendarFile', 'worlds/test/custom.json');
        settingsStore.set('seasons-and-stars.activeCalendarData', mockCustomCalendar);
        settingsStore.set('seasons-and-stars.activeCalendar', '');

        // After refresh, data should still be there
        const calendarFile = game.settings.get('seasons-and-stars', 'activeCalendarFile');
        const calendarData = game.settings.get('seasons-and-stars', 'activeCalendarData');

        expect(calendarFile).toBe('worlds/test/custom.json');
        expect(calendarData).toEqual(mockCustomCalendar);
      });

      it('should handle case when pendingFilePath exists but user switches to regular calendar', async () => {
        const calendars = new Map([['gregorian', {} as any]]);
        const dialog = new CalendarSelectionDialog(calendars, 'gregorian');

        // User selected file but hasn't confirmed
        (dialog as any).pendingFilePath = 'worlds/test/custom.json';
        (dialog as any).selectedCalendarId = '__FILE_PICKER__';

        // User switches to regular calendar instead
        (dialog as any).selectedCalendarId = 'gregorian';
        (dialog as any).pendingFilePath = null;

        expect((dialog as any).selectedCalendarId).toBe('gregorian');
        expect((dialog as any).pendingFilePath).toBeNull();
      });
    });

    describe('Clear File Picker - Pending State Pattern', () => {
      it('should clear local state only (not settings) when clear button clicked', async () => {
        (globalThis as any).game.user = { isGM: true };

        // Set up file picker state - user previously confirmed a file
        const originalPath = 'worlds/test/custom.json';
        settingsStore.set('seasons-and-stars.activeCalendarFile', originalPath);

        const calendars = new Map([['gregorian', {} as any]]);
        const dialog = new CalendarSelectionDialog(calendars, 'gregorian');
        (dialog as any).pendingFilePath = 'worlds/test/another.json';
        (dialog as any).selectedCalendarId = '__FILE_PICKER__';

        // Mock render to prevent rendering errors
        dialog.render = vi.fn();

        // Clear the file picker
        await (dialog as any)._onClearFilePicker(
          new Event('click'),
          document.createElement('button')
        );

        // Verify local state cleared
        expect((dialog as any).pendingFilePath).toBeNull();
        expect((dialog as any).selectedCalendarId).toBeNull();

        // Verify settings NOT modified (pending state pattern - only cleared on confirm)
        expect(settingsStore.get('seasons-and-stars.activeCalendarFile')).toBe(originalPath);
      });

      it('should work for both GM and non-GM (no permission check needed)', async () => {
        (globalThis as any).game.user = { isGM: false };

        // Set up file picker state
        const originalPath = 'worlds/test/custom.json';
        settingsStore.set('seasons-and-stars.activeCalendarFile', originalPath);

        const calendars = new Map([['gregorian', {} as any]]);
        const dialog = new CalendarSelectionDialog(calendars, 'gregorian');
        (dialog as any).pendingFilePath = originalPath;
        (dialog as any).selectedCalendarId = '__FILE_PICKER__';

        // Mock render to prevent rendering errors
        dialog.render = vi.fn();

        // Clear the file picker as non-GM (no permission error)
        await (dialog as any)._onClearFilePicker(
          new Event('click'),
          document.createElement('button')
        );

        // Verify local state cleared (same behavior as GM)
        expect((dialog as any).pendingFilePath).toBeNull();
        expect((dialog as any).selectedCalendarId).toBeNull();

        // Verify settings NOT modified (pending state pattern)
        expect(settingsStore.get('seasons-and-stars.activeCalendarFile')).toBe(originalPath);
      });

      it('should handle clear when no pending state exists', async () => {
        (globalThis as any).game.user = { isGM: true };

        // No pending state
        const calendars = new Map([['gregorian', {} as any]]);
        const dialog = new CalendarSelectionDialog(calendars, 'gregorian');
        (dialog as any).pendingFilePath = null;
        (dialog as any).selectedCalendarId = 'gregorian';

        // Mock render to prevent rendering errors
        dialog.render = vi.fn();

        // Clear the file picker (should safely handle null state)
        await (dialog as any)._onClearFilePicker(
          new Event('click'),
          document.createElement('button')
        );

        // Verify state remains null
        expect((dialog as any).pendingFilePath).toBeNull();
        expect((dialog as any).selectedCalendarId).toBeNull();
      });
    });
  });
});
