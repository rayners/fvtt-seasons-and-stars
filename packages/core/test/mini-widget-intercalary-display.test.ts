/**
 * Test for mini widget intercalary day display functionality
 * Reproduces issue #236 where intercalary days display incorrectly
 *
 * This test uses REAL CalendarDate objects to demonstrate the actual bug
 * in the formatting system, not mocked objects that hide the issue.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarMiniWidget } from '../src/ui/calendar-mini-widget';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Import test calendar with intercalary days
import testWarhammerCalendar from '../../test-module/calendars/test-warhammer-intercalary.json';

// Mock Foundry globals
const mockSettings = new Map();
global.game = {
  settings: {
    get: vi.fn((module: string, key: string) => mockSettings.get(`${module}.${key}`)),
  },
  user: { isGM: true },
  seasonsStars: {
    manager: {
      getActiveCalendar: vi.fn(),
      getCurrentDate: vi.fn(),
    },
  },
} as any;

describe('Mini Widget Intercalary Day Display', () => {
  let widget: CalendarMiniWidget;
  let calendar: SeasonsStarsCalendar;

  beforeEach(() => {
    // Reset settings
    mockSettings.clear();
    mockSettings.set('seasons-and-stars.miniWidgetShowDayOfWeek', false);
    mockSettings.set('seasons-and-stars.miniWidgetShowTime', false);

    // Use real test calendar with intercalary days (no dateFormats - will trigger bug)
    calendar = testWarhammerCalendar as SeasonsStarsCalendar;

    // Setup mock returns
    (game.seasonsStars.manager.getActiveCalendar as any).mockReturnValue(calendar);

    // Create widget instance
    widget = new CalendarMiniWidget();
  });

  describe('Intercalary Day Display - Real Objects (Reproduces Bug)', () => {
    it('should display intercalary day name instead of regular date (CURRENTLY FAILS)', async () => {
      // Create REAL CalendarDate object for intercalary day
      // This will demonstrate the actual bug in formatting
      const intercalaryDate = new CalendarDate(
        {
          year: 2522,
          month: 1, // Jahrdrung (0-based index: Nachexen=0, Jahrdrung=1, Pflugzeit=2)
          day: 1, // First day of Mitterfruhl intercalary period
          weekday: undefined, // No weekday for non-counting intercalary
          intercalary: 'Mitterfruhl',
          time: { hour: 12, minute: 0, second: 0 },
        },
        calendar
      );

      (game.seasonsStars.manager.getCurrentDate as any).mockReturnValue(intercalaryDate);

      const context = await widget._prepareContext();

      // THESE ASSERTIONS WILL CURRENTLY FAIL due to the bug
      // The formatting will show "Jahrdrung 1, 2522" instead of "Mitterfruhl"
      expect(context.shortDate).toContain('Mitterfruhl'); // Should show intercalary name
      expect(context.shortDate).not.toContain('Jahrdrung'); // Should NOT show month name
      expect(context.formattedDate).toContain('Mitterfruhl'); // Should show intercalary name
      expect(context.currentDate.intercalary).toBe('Mitterfruhl');
    });

    it('should handle normal dates correctly (control test)', async () => {
      // Create REAL CalendarDate object for normal date
      const normalDate = new CalendarDate(
        {
          year: 2522,
          month: 1, // Jahrdrung (0-based index)
          day: 15, // Mid-month
          weekday: 2, // Marktag (0-based: Wellentag=0, Aubentag=1, Marktag=2)
          // NO intercalary property
          time: { hour: 14, minute: 30, second: 0 },
        },
        calendar
      );

      (game.seasonsStars.manager.getCurrentDate as any).mockReturnValue(normalDate);

      const context = await widget._prepareContext();

      // Normal dates should work fine and show month/day
      expect(context.shortDate).toContain('Jahrdrung');
      expect(context.shortDate).toContain('15');
      expect(context.currentDate.intercalary).toBeUndefined();
    });

    // Remove this test - focus on the core formatting issue first
    // Weekday display is secondary to the main intercalary display bug
  });

  // Edge cases will be tested after fixing the core issue

  // Regression tests will be added after the fix
});
