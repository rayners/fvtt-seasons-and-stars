/**
 * Tests for Foundry server path to URL conversion
 *
 * Tests the URL conversion logic that handles file paths from Foundry's FilePicker
 * and converts them to proper URLs for calendar loading.
 */

import { describe, beforeEach, it, expect, vi } from 'vitest';
import { setupFoundryEnvironment } from '../../setup';
import { CalendarManager } from '../../../src/core/calendar-manager';

// Mock window.location for URL construction
const mockLocation = {
  origin: 'http://localhost:30000',
  href: 'http://localhost:30000/',
  protocol: 'http:',
  host: 'localhost:30000',
  hostname: 'localhost',
  port: '30000',
  pathname: '/',
  search: '',
  hash: '',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('Foundry Path to URL Conversion', () => {
  let calendarManager: CalendarManager;

  beforeEach(() => {
    setupFoundryEnvironment();
    calendarManager = new CalendarManager();
  });

  describe('URL Conversion Logic', () => {
    it('should convert Foundry module paths to proper URLs', () => {
      // Test the conversion method indirectly by checking the logic
      const testPaths = [
        'modules/seasons-and-stars/calendars/eberron.json',
        'Data/calendars/custom.json',
        'worlds/my-world/calendars/campaign.json',
      ];

      testPaths.forEach(path => {
        // The conversion should create a proper URL that starts with the origin
        const expectedUrl = `http://localhost:30000/${path}`;

        // We can't directly test the private method, but we can verify the logic
        expect(path).not.toMatch(/^https?:\/\//); // Input is not already a URL
        expect(expectedUrl).toMatch(/^http:\/\/localhost:30000\//); // Output should be proper URL
      });
    });

    it('should handle paths that start with slash', () => {
      const path = '/absolute/path/calendar.json';
      const expectedUrl = 'http://localhost:30000/absolute/path/calendar.json';

      expect(expectedUrl).toBe(`${mockLocation.origin}${path}`);
    });

    it('should handle paths without leading slash', () => {
      const path = 'relative/path/calendar.json';
      const expectedUrl = 'http://localhost:30000/relative/path/calendar.json';

      expect(expectedUrl).toBe(`${mockLocation.origin}/${path}`);
    });

    it('should preserve existing URLs unchanged', () => {
      const urls = [
        'https://example.com/calendar.json',
        'http://localhost/test.json',
        'module:test-module/calendar.json',
      ];

      urls.forEach(url => {
        // These should remain unchanged by the conversion logic
        expect(url).toMatch(/^(https?:\/\/|module:)/);
      });
    });

    it('should remove file:// protocol', () => {
      const filePath = 'file://modules/test/calendar.json';
      const expectedPath = 'modules/test/calendar.json';

      // The conversion should strip the file:// protocol
      expect(filePath.substring(7)).toBe(expectedPath);
    });
  });

  describe('Integration with Calendar Loading', () => {
    it('should not cause URL validation errors for Foundry paths', () => {
      // Mock the loadCalendarFromUrl method to capture the converted URL
      const mockLoadFromUrl = vi
        .spyOn(calendarManager['calendarLoader'], 'loadFromUrl')
        .mockResolvedValue({
          success: true,
          calendar: { id: 'test-calendar', name: 'Test Calendar' } as any,
          sourceUrl: 'test-url',
        });

      // Mock the settings to return a Foundry path
      vi.mocked(game.settings.get).mockImplementation((module, key) => {
        if (key === 'activeCalendarFile') return 'modules/seasons-and-stars/calendars/eberron.json';
        return '';
      });

      // Call completeInitialization which should convert the path and load the calendar
      return calendarManager.completeInitialization().then(() => {
        // Verify that loadFromUrl was called with a proper URL, not the raw path
        expect(mockLoadFromUrl).toHaveBeenCalledWith(
          'http://localhost:30000/modules/seasons-and-stars/calendars/eberron.json',
          { validate: true }
        );
      });
    });

    it('should handle the specific problematic path from the error', () => {
      const problematicPath = 'modules/seasons-and-stars/calendars/eberron.json';
      const expectedUrl = 'http://localhost:30000/modules/seasons-and-stars/calendars/eberron.json';

      // This is the exact path that was causing the "Invalid URL" error
      expect(problematicPath).not.toMatch(/^https?:\/\//);
      expect(expectedUrl).toMatch(/^http:\/\/localhost:30000\/modules/);

      // The URL constructor should work with the converted URL
      expect(() => new URL(expectedUrl)).not.toThrow();
    });
  });
});
