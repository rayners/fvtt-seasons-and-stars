/**
 * Tests for calendar file picker helper functions
 * These functions handle GM permission checks and settings synchronization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SeasonsStarsCalendar } from '../src/types/calendar.js';
import {
  saveCalendarDataForSync,
  saveCalendarFilePath,
  clearConflictingCalendarSetting,
  resolveCalendarFilePath,
} from '../src/ui/calendar-file-helpers.js';

describe('Calendar File Helpers', () => {
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
      expect(mockSettings.set).toHaveBeenCalledWith('seasons-and-stars', 'activeCalendarFile', '');
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
