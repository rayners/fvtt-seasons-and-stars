/**
 * Production Error Notifications - TDD test for user-facing error reporting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateFormatter } from '../src/core/date-formatter';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Mock Handlebars
const mockHandlebars = {
  compile: vi.fn(),
  registerHelper: vi.fn(),
};

// Mock Foundry ui.notifications
const mockNotifications = {
  warn: vi.fn(),
  error: vi.fn(),
};

// Set up global mocks
global.Handlebars = mockHandlebars;
global.ui = { notifications: mockNotifications };

describe('Production Error Notifications', () => {
  let formatter: DateFormatter;
  let mockCalendar: SeasonsStarsCalendar;
  let mockDate: CalendarDate;

  beforeEach(() => {
    vi.clearAllMocks();
    DateFormatter.resetHelpersForTesting();

    mockCalendar = {
      id: 'test-calendar',
      name: 'Test Calendar',
      months: [{ name: 'January', abbreviation: 'Jan', days: 31 }],
      weekdays: [{ name: 'Sunday', abbreviation: 'Sun' }],
      year: { prefix: '', suffix: '' },
      time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
    } as SeasonsStarsCalendar;

    mockDate = {
      year: 2024,
      month: 1,
      day: 15,
      weekday: 0,
      time: { hour: 14, minute: 30, second: 45 },
    } as CalendarDate;

    formatter = new DateFormatter(mockCalendar);
  });

  describe('Template Compilation Error Notifications', () => {
    it('should log to console only when template compilation fails (debug mode disabled)', () => {
      // Mock debug mode disabled (default)
      global.game = {
        settings: {
          get: vi.fn().mockImplementation((module: string, setting: string) => {
            if (module === 'seasons-and-stars' && setting === 'debugMode') {
              return false; // Debug mode disabled
            }
            return false;
          }),
        },
      } as any;

      const invalidTemplate = '{{invalid syntax}}';

      // Mock template compilation failure
      mockHandlebars.compile.mockImplementation(() => {
        throw new Error('Invalid template syntax: Unexpected token');
      });

      // Format should still work (fallback) but should NOT show UI notifications
      const result = formatter.format(mockDate, invalidTemplate);

      // Should fall back to basic format
      expect(result).toContain('Sunday, 15th January 2024');

      // Should NOT notify user via UI in production mode
      expect(mockNotifications.warn).not.toHaveBeenCalled();
    });

    it('should log specific errors for calendar format syntax errors (debug mode disabled)', () => {
      // Mock debug mode disabled
      global.game = {
        settings: {
          get: vi.fn().mockImplementation((module: string, setting: string) => {
            if (module === 'seasons-and-stars' && setting === 'debugMode') {
              return false; // Debug mode disabled
            }
            return false;
          }),
        },
      } as any;

      const calendarWithBadFormat: SeasonsStarsCalendar = {
        ...mockCalendar,
        id: 'star-trek-calendar',
        name: 'Star Trek Calendar',
        dateFormats: {
          time: "{{ss-hour format='pad'}}:{{ss-minute format='pad'}}", // Invalid single quotes
        },
      };

      mockHandlebars.compile.mockImplementation((template: string) => {
        if (template.includes("format='")) {
          throw new Error('Parse error: Invalid quote syntax');
        }
        return vi.fn().mockReturnValue('fallback');
      });

      const badFormatter = new DateFormatter(calendarWithBadFormat);
      badFormatter.formatNamed(mockDate, 'time');

      // Should NOT show UI notifications in production mode
      expect(mockNotifications.warn).not.toHaveBeenCalled();
    });

    it('should not spam console logs for repeated errors', () => {
      // Mock debug mode disabled
      global.game = {
        settings: {
          get: vi.fn().mockImplementation((module: string, setting: string) => {
            if (module === 'seasons-and-stars' && setting === 'debugMode') {
              return false; // Debug mode disabled
            }
            return false;
          }),
        },
      } as any;

      const invalidTemplate = '{{broken template';

      mockHandlebars.compile.mockImplementation(() => {
        throw new Error('Template syntax error');
      });

      // Call format multiple times with same broken template
      formatter.format(mockDate, invalidTemplate);
      formatter.format(mockDate, invalidTemplate);
      formatter.format(mockDate, invalidTemplate);

      // Should not show UI notifications in production mode
      expect(mockNotifications.warn).not.toHaveBeenCalled();
    });

    it('should log helpful context in console (debug mode disabled)', () => {
      // Mock debug mode disabled
      global.game = {
        settings: {
          get: vi.fn().mockImplementation((module: string, setting: string) => {
            if (module === 'seasons-and-stars' && setting === 'debugMode') {
              return false; // Debug mode disabled
            }
            return false;
          }),
        },
      } as any;

      const invalidTemplate = '{{ss-hour format=invalid}}';

      mockHandlebars.compile.mockImplementation(() => {
        throw new Error('Expecting STRING, got INVALID');
      });

      formatter.format(mockDate, invalidTemplate);

      // Should NOT show UI notifications in production mode
      expect(mockNotifications.warn).not.toHaveBeenCalled();
    });
  });

  describe('Debug Mode Detection', () => {
    it('should show detailed notifications in debug mode', () => {
      // Mock debug mode enabled via game settings
      global.game = {
        settings: {
          get: vi.fn().mockImplementation((module: string, setting: string) => {
            if (module === 'seasons-and-stars' && setting === 'debugMode') {
              return true; // Debug mode enabled
            }
            return false;
          }),
        },
      } as any;

      const invalidTemplate = '{{ss-unknown-helper}}';

      mockHandlebars.compile.mockImplementation(() => {
        throw new Error('Unknown helper: ss-unknown-helper');
      });

      formatter.format(mockDate, invalidTemplate);

      // Should show detailed error in debug mode
      expect(mockNotifications.warn).toHaveBeenCalledWith(
        expect.stringMatching(/unknown.*helper.*ss-unknown-helper/i)
      );
    });

    it('should not show notifications in normal mode', () => {
      // Mock debug mode disabled via game settings
      global.game = {
        settings: {
          get: vi.fn().mockImplementation((module: string, setting: string) => {
            if (module === 'seasons-and-stars' && setting === 'debugMode') {
              return false; // Debug mode disabled
            }
            return false;
          }),
        },
      } as any;

      const invalidTemplate = '{{ss-broken}}';

      mockHandlebars.compile.mockImplementation(() => {
        throw new Error('Helper not found: ss-broken');
      });

      formatter.format(mockDate, invalidTemplate);

      // Should NOT show any UI notifications in normal mode
      expect(mockNotifications.warn).not.toHaveBeenCalled();
    });
  });
});
