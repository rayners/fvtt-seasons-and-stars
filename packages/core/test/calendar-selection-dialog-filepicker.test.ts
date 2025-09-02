/**
 * Tests for FilePicker integration in CalendarSelectionDialog
 *
 * Tests the file picker functionality that allows users to select custom calendar files
 * directly from the calendar selection dialog.
 */

import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { setupFoundryEnvironment } from './setup';
import { CalendarSelectionDialog } from '../src/ui/calendar-selection-dialog';
import * as fs from 'fs';
import * as path from 'path';

// Mock FilePicker class
class MockFilePicker {
  constructor(options: any) {
    this.options = options;
  }

  static create(options: any) {
    return new MockFilePicker(options);
  }

  options: any;
  render = vi.fn().mockResolvedValue(undefined);
}

describe('CalendarSelectionDialog FilePicker Integration', () => {
  let gregorianCalendar: any;

  beforeEach(() => {
    setupFoundryEnvironment();

    // Load real gregorian calendar
    const gregorianPath = path.join(__dirname, '../calendars/gregorian.json');
    gregorianCalendar = JSON.parse(fs.readFileSync(gregorianPath, 'utf-8'));

    // Mock Foundry FilePicker
    (globalThis as any).foundry = {
      ...((globalThis as any).foundry || {}),
      applications: {
        ...((globalThis as any).foundry?.applications || {}),
        apps: {
          FilePicker: MockFilePicker,
        },
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('FilePicker Button Rendering', () => {
    it('should include file picker section in dialog template context', async () => {
      const calendars = new Map();
      calendars.set('gregorian', gregorianCalendar);

      const dialog = new CalendarSelectionDialog(calendars, 'gregorian');
      const context = await dialog._prepareContext();

      expect(context).toHaveProperty('showFilePicker', true);
      expect(context).toHaveProperty('selectedFilePath');
      expect(context).toHaveProperty('filePickerSelected');
    });

    it('should show file picker as selected when it is the active calendar', async () => {
      const testPath = 'worlds/test/calendars/custom.json';
      vi.mocked(game.settings.get).mockImplementation((module, key) => {
        if (key === 'activeCalendarFile') return testPath;
        if (key === 'activeCalendar') return '';
        return '';
      });

      const calendars = new Map();
      calendars.set('gregorian', gregorianCalendar);

      // Create dialog with no current calendar (so file picker becomes current)
      const dialog = new CalendarSelectionDialog(calendars, '');
      const context = await dialog._prepareContext();

      expect(context.filePickerSelected).toBe(true);
      expect(context.filePickerActive).toBe(true);
      expect(context.selectedFilePath).toBe(testPath);
    });

    it('should show currently selected file path when activeCalendarFile is set', async () => {
      const testPath = 'worlds/test/calendars/custom.json';
      vi.mocked(game.settings.get).mockReturnValue(testPath);

      const calendars = new Map();
      const dialog = new CalendarSelectionDialog(calendars, '');
      const context = await dialog._prepareContext();

      expect(context.selectedFilePath).toBe(testPath);
    });
  });

  describe('FilePicker Action Handlers', () => {
    it('should have openFilePicker action defined in DEFAULT_OPTIONS', () => {
      expect(CalendarSelectionDialog.DEFAULT_OPTIONS.actions).toHaveProperty('openFilePicker');
    });

    it('should open FilePicker when button is clicked', async () => {
      const calendars = new Map();
      const dialog = new CalendarSelectionDialog(calendars, 'gregorian');

      // Simulate clicking the file picker button
      const mockEvent = new Event('click');
      const mockTarget = document.createElement('button');
      mockTarget.setAttribute('data-action', 'openFilePicker');

      // Should not throw an error - this indicates FilePicker was created successfully
      await expect(dialog._onOpenFilePicker(mockEvent, mockTarget)).resolves.not.toThrow();
    });

    it('should update settings when file is selected', async () => {
      const testPath = 'worlds/test/custom-calendar.json';
      const calendars = new Map();
      const dialog = new CalendarSelectionDialog(calendars, 'gregorian');

      // Mock settings.set
      const settingsSpy = vi.mocked(game.settings.set);

      // Mock dialog render
      const renderSpy = vi.spyOn(dialog, 'render').mockResolvedValue(undefined);

      // Test the callback function directly
      const filePicker = new MockFilePicker({
        type: 'data',
        extensions: ['.json'],
        callback: async (path: string) => {
          await game.settings.set('seasons-and-stars', 'activeCalendarFile', path);
          dialog.render(true);
        },
      });

      // Simulate file selection
      await filePicker.options.callback(testPath);

      expect(settingsSpy).toHaveBeenCalledWith('seasons-and-stars', 'activeCalendarFile', testPath);
      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe('File Path Display', () => {
    it('should clear file path when clear button is clicked', async () => {
      const calendars = new Map();
      const dialog = new CalendarSelectionDialog(calendars, '');

      // Mock settings.set
      const settingsSpy = vi.mocked(game.settings.set);
      const renderSpy = vi.spyOn(dialog, 'render').mockResolvedValue(undefined);

      // Simulate clicking clear button
      const mockEvent = new Event('click');
      const mockTarget = document.createElement('button');

      await dialog._onClearFilePicker(mockEvent, mockTarget);

      expect(settingsSpy).toHaveBeenCalledWith('seasons-and-stars', 'activeCalendarFile', '');
      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe('Dialog State Management', () => {
    it('should show file picker calendar as selected when active', async () => {
      const testPath = 'worlds/test/custom.json';
      vi.mocked(game.settings.get).mockImplementation((module, key) => {
        if (key === 'activeCalendarFile') return testPath;
        if (key === 'activeCalendar') return '';
        return '';
      });

      const calendars = new Map();
      const dialog = new CalendarSelectionDialog(calendars, '');
      const context = await dialog._prepareContext();

      expect(context.selectedFilePath).toBe(testPath);
      expect(context.filePickerActive).toBe(true);
    });

    it('should not show file picker as active when regular calendar is selected', async () => {
      vi.mocked(game.settings.get).mockImplementation((module, key) => {
        if (key === 'activeCalendarFile') return '';
        if (key === 'activeCalendar') return 'gregorian';
        return 'gregorian';
      });

      const calendars = new Map();
      calendars.set('gregorian', gregorianCalendar);

      const dialog = new CalendarSelectionDialog(calendars, 'gregorian');
      const context = await dialog._prepareContext();

      expect(context.selectedFilePath).toBe('');
      expect(context.filePickerActive).toBe(false);
    });
  });
});
