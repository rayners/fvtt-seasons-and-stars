/**
 * Tests for CalendarManager initialization behavior with non-GM users
 *
 * Verifies that non-GM users cannot trigger world setting modifications during initialization.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use real TestLogger instead of mocks for better testing
import { TestLogger } from './utils/test-logger';
vi.mock('../src/core/logger', () => ({
  Logger: TestLogger,
}));

import { CalendarManager } from '../src/core/calendar-manager';

describe('CalendarManager Non-GM Initialization', () => {
  let manager: CalendarManager;
  let mockSettings: any;

  beforeEach(() => {
    vi.clearAllMocks();
    TestLogger.clearLogs();

    // Mock settings
    mockSettings = {
      get: vi.fn((module, key) => {
        if (key === 'activeCalendarFile') {
          return 'worlds/test/custom-calendar.json';
        }
        if (key === 'activeCalendar') {
          return 'gregorian';
        }
        return null;
      }),
      set: vi.fn(),
    };

    // Set up global game mock
    globalThis.game = {
      user: { isGM: false }, // Non-GM user
      settings: mockSettings,
      i18n: {
        format: vi.fn((key, data) => `${key}: ${JSON.stringify(data)}`),
      },
    } as any;

    globalThis.fetch = vi.fn();
    manager = new CalendarManager();
  });

  describe('completeInitialization() with file-based calendar and non-GM user', () => {
    it('should not attempt to clear activeCalendar setting for non-GM users', async () => {
      // Mock fetch to fail gracefully so we test the settings logic
      (globalThis.fetch as any).mockRejectedValue(new Error('File not found'));

      await manager.completeInitialization();

      // Non-GM should NOT have tried to clear the activeCalendar setting
      expect(mockSettings.set).not.toHaveBeenCalledWith('seasons-and-stars', 'activeCalendar', '');

      // Should have logged the file loading attempt
      expect(TestLogger.getLogsContaining('Loading calendar from file').length).toBeGreaterThan(0);
    });

    it('should not save calendar data for non-GM users', async () => {
      const mockCalendar = {
        id: 'custom-calendar',
        name: 'Custom Calendar',
        months: [{ name: 'Month 1', days: 30 }],
        weekdays: ['Day 1', 'Day 2'],
        year: { epoch: 0 },
      };

      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockCalendar,
      });

      // Mock loadCalendarFromUrl to succeed
      vi.spyOn(manager, 'loadCalendarFromUrl').mockResolvedValue({
        success: true,
        calendar: mockCalendar as any,
      });

      // Mock loadCalendar to succeed
      vi.spyOn(manager, 'loadCalendar').mockReturnValue(true);

      await manager.completeInitialization();

      // Non-GM should NOT have tried to save any settings
      expect(mockSettings.set).not.toHaveBeenCalled();

      // Should have attempted to load the calendar
      expect(manager.loadCalendarFromUrl).toHaveBeenCalled();
    });
  });

  describe('completeInitialization() GM comparison', () => {
    it('should save calendar data for sync when user is GM', async () => {
      // Change user to GM
      globalThis.game.user.isGM = true;

      const mockCalendar = {
        id: 'custom-calendar',
        name: 'Custom Calendar',
        months: [{ name: 'Month 1', days: 30 }],
        weekdays: ['Day 1', 'Day 2'],
        year: { epoch: 0 },
      };

      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockCalendar,
      });

      // Mock loadCalendarFromUrl to succeed
      vi.spyOn(manager, 'loadCalendarFromUrl').mockResolvedValue({
        success: true,
        calendar: mockCalendar as any,
      });

      // Mock loadCalendar to succeed
      vi.spyOn(manager, 'loadCalendar').mockReturnValue(true);

      await manager.completeInitialization();

      // GM should save activeCalendarData for sync to other clients
      expect(mockSettings.set).toHaveBeenCalledWith(
        'seasons-and-stars',
        'activeCalendarData',
        mockCalendar
      );

      // GM should also clear conflicting activeCalendar setting
      expect(mockSettings.set).toHaveBeenCalledWith('seasons-and-stars', 'activeCalendar', '');
    });

    it('should clear conflicting activeCalendar setting when user is GM', async () => {
      // Change user to GM
      globalThis.game.user.isGM = true;

      // Mock fetch to fail so we only test the settings logic
      (globalThis.fetch as any).mockRejectedValue(new Error('File not found'));

      await manager.completeInitialization();

      // GM should have attempted to clear the activeCalendar setting
      expect(mockSettings.set).toHaveBeenCalledWith('seasons-and-stars', 'activeCalendar', '');
    });

    it('should not attempt to clear activeCalendar if it is already empty for GM', async () => {
      // Change user to GM
      globalThis.game.user.isGM = true;

      // Mock activeCalendar as already empty
      mockSettings.get = vi.fn((module, key) => {
        if (key === 'activeCalendarFile') {
          return 'worlds/test/custom-calendar.json';
        }
        if (key === 'activeCalendar') {
          return '';
        }
        return null;
      });

      (globalThis.fetch as any).mockRejectedValue(new Error('File not found'));

      await manager.completeInitialization();

      // Should NOT attempt to clear empty setting
      expect(mockSettings.set).not.toHaveBeenCalled();
    });
  });

  describe('completeInitialization() without file-based calendar', () => {
    it('should proceed with regular calendar loading for non-GM', async () => {
      // No file-based calendar
      mockSettings.get = vi.fn((module, key) => {
        if (key === 'activeCalendarFile') {
          return '';
        }
        if (key === 'activeCalendar') {
          return 'gregorian';
        }
        if (key === 'activeCalendarData') {
          return null;
        }
        return null;
      });

      await manager.completeInitialization();

      // Should not have attempted to modify any settings
      expect(mockSettings.set).not.toHaveBeenCalled();

      // Should proceed with normal calendar loading
      expect(TestLogger.getLogsContaining('Loading calendar from file').length).toBe(0);
    });
  });
});
