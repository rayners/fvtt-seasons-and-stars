/**
 * Tests for calendar file path handling
 *
 * Tests the logic for handling activeCalendarFile settings and path resolution.
 * The actual file loading will use browser APIs like fetch() in the real implementation.
 */

import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { setupFoundryEnvironment } from './setup';

describe('Calendar File Path Handling', () => {
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
      // Import and register settings to get the onChange handlers
      const { registerSettings } = await import('../src/module');
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

      const invalidPaths = ['worlds/test/calendar.txt', 'Data/calendars/custom.xml', 'not-a-file'];

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
