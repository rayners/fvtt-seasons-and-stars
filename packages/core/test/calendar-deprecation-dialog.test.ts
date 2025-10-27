/**
 * Tests for calendar deprecation dialog functionality
 *
 * This test suite covers the calendar pack detection logic that determines
 * whether to show the information dialog to GMs about calendar packs.
 */

import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { setupFoundryEnvironment } from './setup';
import { CalendarDeprecationDialog } from '../src/ui/calendar-deprecation-dialog';

describe('CalendarDeprecationDialog', () => {
  beforeEach(() => {
    setupFoundryEnvironment();

    // Mock user as GM
    vi.mocked(game.user).isGM = true;

    // Mock settings
    vi.mocked(game.settings.get).mockReturnValue(false);

    // Mock game.modules with a proper structure
    (game as any).modules = {
      values: vi.fn(() => []),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Calendar Pack Detection', () => {
    it('should show dialog when no calendar packs are installed', async () => {
      // Mock game.modules with no calendar packs
      const mockModules = [
        { id: 'some-other-module', active: true },
        { id: 'another-module', active: true },
      ];
      vi.mocked(game.modules.values).mockReturnValue(mockModules.values());

      const renderSpy = vi.spyOn(CalendarDeprecationDialog.prototype, 'render');

      await CalendarDeprecationDialog.showWarningIfNeeded();

      expect(renderSpy).toHaveBeenCalledWith(true);
    });

    it('should not show dialog when calendar pack is installed and active', async () => {
      // Mock game.modules with a calendar pack
      const mockModules = [
        { id: 'seasons-and-stars-fantasy-pack', active: true },
        { id: 'some-other-module', active: true },
      ];
      vi.mocked(game.modules.values).mockReturnValue(mockModules.values());

      const renderSpy = vi.spyOn(CalendarDeprecationDialog.prototype, 'render');

      await CalendarDeprecationDialog.showWarningIfNeeded();

      expect(renderSpy).not.toHaveBeenCalled();
    });

    it('should not show dialog when multiple calendar packs are installed', async () => {
      // Mock game.modules with multiple calendar packs
      const mockModules = [
        { id: 'seasons-and-stars-fantasy-pack', active: true },
        { id: 'seasons-and-stars-scifi-pack', active: true },
        { id: 'some-other-module', active: true },
      ];
      vi.mocked(game.modules.values).mockReturnValue(mockModules.values());

      const renderSpy = vi.spyOn(CalendarDeprecationDialog.prototype, 'render');

      await CalendarDeprecationDialog.showWarningIfNeeded();

      expect(renderSpy).not.toHaveBeenCalled();
    });

    it('should show dialog when calendar pack module is present but not active', async () => {
      // Mock game.modules with inactive calendar pack
      const mockModules = [
        { id: 'seasons-and-stars-fantasy-pack', active: false },
        { id: 'some-other-module', active: true },
      ];
      vi.mocked(game.modules.values).mockReturnValue(mockModules.values());

      const renderSpy = vi.spyOn(CalendarDeprecationDialog.prototype, 'render');

      await CalendarDeprecationDialog.showWarningIfNeeded();

      expect(renderSpy).toHaveBeenCalledWith(true);
    });

    it('should detect calendar packs with correct prefix pattern', async () => {
      // Test various calendar pack naming patterns
      const packIds = [
        'seasons-and-stars-fantasy-pack',
        'seasons-and-stars-scifi-pack',
        'seasons-and-stars-pf2e-pack',
        'seasons-and-stars-custom-calendar-builder',
      ];

      for (const packId of packIds) {
        vi.clearAllMocks();

        // Reset game.modules mock
        (game as any).modules = {
          values: vi.fn(() => [{ id: packId, active: true }].values()),
        };

        const renderSpy = vi.spyOn(CalendarDeprecationDialog.prototype, 'render');

        await CalendarDeprecationDialog.showWarningIfNeeded();

        expect(renderSpy).not.toHaveBeenCalled();
      }
    });

    it('should not match modules with similar but incorrect naming', async () => {
      // Mock game.modules with modules that have similar names but shouldn't match
      const mockModules = [
        { id: 'my-seasons-and-stars-pack', active: true },
        { id: 'seasons-stars', active: true },
        { id: 'seasons-and-stars', active: true }, // The main module itself
      ];
      vi.mocked(game.modules.values).mockReturnValue(mockModules.values());

      const renderSpy = vi.spyOn(CalendarDeprecationDialog.prototype, 'render');

      await CalendarDeprecationDialog.showWarningIfNeeded();

      // Should show dialog because the main module itself doesn't count as a pack
      expect(renderSpy).toHaveBeenCalledWith(true);
    });

    it('should explicitly exclude the core module from pack detection', async () => {
      // Explicitly test that the core 'seasons-and-stars' module is excluded
      const mockModules = [
        { id: 'seasons-and-stars', active: true }, // Core module
        { id: 'some-other-module', active: true },
      ];
      vi.mocked(game.modules.values).mockReturnValue(mockModules.values());

      const renderSpy = vi.spyOn(CalendarDeprecationDialog.prototype, 'render');

      await CalendarDeprecationDialog.showWarningIfNeeded();

      // Should show dialog because core module is not a calendar pack
      expect(renderSpy).toHaveBeenCalledWith(true);
    });
  });

  describe('GM Permission Check', () => {
    it('should not show dialog to non-GM users', async () => {
      // Mock user as non-GM
      vi.mocked(game.user).isGM = false;

      const mockModules = [{ id: 'some-other-module', active: true }];
      vi.mocked(game.modules.values).mockReturnValue(mockModules.values());

      const renderSpy = vi.spyOn(CalendarDeprecationDialog.prototype, 'render');

      await CalendarDeprecationDialog.showWarningIfNeeded();

      expect(renderSpy).not.toHaveBeenCalled();
    });
  });

  describe('Dismissal Tracking', () => {
    it('should not show dialog if it was already dismissed', async () => {
      // Mock settings to indicate dialog was dismissed
      vi.mocked(game.settings.get).mockReturnValue(true);

      const mockModules = [{ id: 'some-other-module', active: true }];
      vi.mocked(game.modules.values).mockReturnValue(mockModules.values());

      const renderSpy = vi.spyOn(CalendarDeprecationDialog.prototype, 'render');

      await CalendarDeprecationDialog.showWarningIfNeeded();

      expect(renderSpy).not.toHaveBeenCalled();
    });

    it('should check pack detection before checking dismissal setting', async () => {
      // Calendar pack should take priority over dismissal setting
      const mockModules = [{ id: 'seasons-and-stars-fantasy-pack', active: true }];
      vi.mocked(game.modules.values).mockReturnValue(mockModules.values());

      const getSettingsSpy = vi.mocked(game.settings.get);
      const renderSpy = vi.spyOn(CalendarDeprecationDialog.prototype, 'render');

      await CalendarDeprecationDialog.showWarningIfNeeded();

      // settings.get should not be called for the dismissal setting
      // (it may be called for other settings like debugMode, but not for calendarDeprecationWarningShown)
      expect(getSettingsSpy).not.toHaveBeenCalledWith(
        'seasons-and-stars',
        'calendarDeprecationWarningShown'
      );
      expect(renderSpy).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in pack detection gracefully', async () => {
      // Mock game.modules.values to throw an error
      vi.mocked(game.modules.values).mockImplementation(() => {
        throw new Error('Module iteration failed');
      });

      // Should not throw error
      await expect(CalendarDeprecationDialog.showWarningIfNeeded()).resolves.not.toThrow();
    });

    it('should handle missing game.modules gracefully', async () => {
      // Remove game.modules
      const originalModules = game.modules;
      // @ts-expect-error - Testing missing property
      delete game.modules;

      // Should not throw error
      await expect(CalendarDeprecationDialog.showWarningIfNeeded()).resolves.not.toThrow();

      // Restore
      game.modules = originalModules;
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle the typical first-time user flow', async () => {
      // First-time user: GM, no packs installed, dialog not dismissed
      vi.mocked(game.user).isGM = true;
      vi.mocked(game.settings.get).mockReturnValue(false);

      const mockModules = [{ id: 'some-other-module', active: true }];
      vi.mocked(game.modules.values).mockReturnValue(mockModules.values());

      const renderSpy = vi.spyOn(CalendarDeprecationDialog.prototype, 'render');

      await CalendarDeprecationDialog.showWarningIfNeeded();

      expect(renderSpy).toHaveBeenCalledWith(true);
    });

    it('should handle the upgraded user flow', async () => {
      // User who just installed a pack: GM, pack now installed, dialog was dismissed before
      vi.mocked(game.user).isGM = true;
      vi.mocked(game.settings.get).mockReturnValue(true);

      const mockModules = [{ id: 'seasons-and-stars-fantasy-pack', active: true }];
      vi.mocked(game.modules.values).mockReturnValue(mockModules.values());

      const renderSpy = vi.spyOn(CalendarDeprecationDialog.prototype, 'render');

      await CalendarDeprecationDialog.showWarningIfNeeded();

      // Should not show because pack is installed (takes precedence)
      expect(renderSpy).not.toHaveBeenCalled();
    });
  });
});
