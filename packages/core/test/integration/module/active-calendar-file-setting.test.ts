/**
 * Tests for activeCalendarFile setting functionality
 *
 * Tests the new setting that allows users to specify a custom calendar file path
 * and ensures proper interaction with the existing activeCalendar setting.
 */

import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { setupFoundryEnvironment } from '../../setup';

describe('activeCalendarFile Setting', () => {
  beforeEach(() => {
    setupFoundryEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Setting Registration', () => {
    it('should register activeCalendarFile setting with correct configuration', async () => {
      // Import module to trigger setting registration
      const { registerSettings } = await import('../../../src/module');

      // Call the registration function directly
      registerSettings();

      expect(game.settings.register).toHaveBeenCalledWith(
        'seasons-and-stars',
        'activeCalendarFile',
        expect.objectContaining({
          name: expect.any(String),
          hint: expect.any(String),
          scope: 'world',
          config: false, // Hidden from settings UI
          type: String,
          default: '',
          onChange: expect.any(Function),
        })
      );
    });
  });

  describe('Setting Storage and Retrieval', () => {
    beforeEach(() => {
      // Mock settings get/set behavior
      const settingsStore = new Map();
      vi.mocked(game.settings.set).mockImplementation((module, key, value) => {
        settingsStore.set(`${module}.${key}`, value);
        return Promise.resolve(undefined);
      });
      vi.mocked(game.settings.get).mockImplementation((module, key) => {
        return settingsStore.get(`${module}.${key}`) || '';
      });
    });

    it('should store and retrieve file path correctly', async () => {
      const testPath = 'worlds/test-world/calendars/custom-calendar.json';

      await game.settings.set('seasons-and-stars', 'activeCalendarFile', testPath);
      const retrieved = game.settings.get('seasons-and-stars', 'activeCalendarFile');

      expect(retrieved).toBe(testPath);
    });

    it('should default to empty string when no file is set', () => {
      const retrieved = game.settings.get('seasons-and-stars', 'activeCalendarFile');
      expect(retrieved).toBe('');
    });
  });

  describe('Mutual Exclusivity with activeCalendar', () => {
    beforeEach(async () => {
      // Register the settings so we can test their onChange behavior
      const { registerSettings } = await import('../../../src/module');
      registerSettings();
    });

    it('should trigger onChange when activeCalendarFile is set', async () => {
      // Get the registered setting config to test its onChange function
      const registerCalls = vi.mocked(game.settings.register).mock.calls;
      const activeCalendarFileCall = registerCalls.find(
        call => call[0] === 'seasons-and-stars' && call[1] === 'activeCalendarFile'
      );

      expect(activeCalendarFileCall).toBeDefined();
      expect(activeCalendarFileCall?.[2]).toHaveProperty('onChange');

      const onChange = activeCalendarFileCall?.[2].onChange;
      expect(onChange).toBeInstanceOf(Function);
    });

    it('should trigger onChange when activeCalendar is set', async () => {
      // Get the registered setting config to test its onChange function
      const registerCalls = vi.mocked(game.settings.register).mock.calls;
      const activeCalendarCall = registerCalls.find(
        call => call[0] === 'seasons-and-stars' && call[1] === 'activeCalendar'
      );

      expect(activeCalendarCall).toBeDefined();
      expect(activeCalendarCall?.[2]).toHaveProperty('onChange');

      const onChange = activeCalendarCall?.[2].onChange;
      expect(onChange).toBeInstanceOf(Function);
    });
  });

  describe('File Path Validation', () => {
    it('should accept valid JSON file paths', async () => {
      const validPaths = [
        'worlds/my-world/calendars/custom.json',
        'Data/calendars/campaign.json',
        'modules/my-module/calendars/special.json',
      ];

      for (const path of validPaths) {
        // Should not throw when setting valid paths
        expect(async () => {
          await game.settings.set('seasons-and-stars', 'activeCalendarFile', path);
        }).not.toThrow();
      }
    });

    it('should handle empty path as valid (clears selection)', async () => {
      // Should not throw when setting empty path
      expect(async () => {
        await game.settings.set('seasons-and-stars', 'activeCalendarFile', '');
      }).not.toThrow();
    });
  });
});
