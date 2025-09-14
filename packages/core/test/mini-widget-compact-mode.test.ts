/**
 * Test compact mode context logic for mini widget
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CalendarMiniWidget } from '../src/ui/calendar-mini-widget';
import { SmallTimeUtils } from '../src/ui/base-widget-manager';

// Mock Foundry API
const mockGame = {
  settings: {
    get: vi.fn(),
  },
  user: {
    isGM: true,
  },
  seasonsStars: {
    manager: {
      getActiveCalendar: vi.fn().mockReturnValue({
        id: 'test-calendar',
        label: 'Test Calendar',
        description: 'Test calendar description',
        weekdays: [
          { name: 'Monday', abbreviation: 'Mon' },
          { name: 'Tuesday', abbreviation: 'Tue' },
          { name: 'Wednesday', abbreviation: 'Wed' },
          { name: 'Thursday', abbreviation: 'Thu' },
          { name: 'Friday', abbreviation: 'Fri' },
          { name: 'Saturday', abbreviation: 'Sat' },
          { name: 'Sunday', abbreviation: 'Sun' },
        ],
      }),
      getCurrentDate: vi.fn().mockReturnValue({
        day: 1,
        month: 1,
        year: 2024,
        weekday: 0,
        toShortString: vi.fn().mockReturnValue('Jan 1'),
        toLongString: vi.fn().mockReturnValue('January 1, 2024'),
        toObject: vi.fn().mockReturnValue({ day: 1, month: 1, year: 2024 }),
        time: { hour: 12, minute: 0, second: 0 },
      }),
    },
  },
};

// Set up global mocks
globalThis.game = mockGame as any;

vi.mock('../src/core/logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../src/core/date-formatter', () => ({
  DateFormatter: {
    formatDate: vi.fn().mockReturnValue('Formatted Date'),
    formatShortDate: vi.fn().mockReturnValue('Short Date'),
    formatTime: vi.fn().mockReturnValue('12:00'),
    formatWeekday: vi.fn().mockReturnValue('Mon'),
  },
}));

vi.mock('../src/ui/base-widget-manager', () => ({
  SmallTimeUtils: {
    isSmallTimeAvailable: vi.fn().mockReturnValue(false),
  },
  BaseWidgetManager: class {},
}));

vi.mock('../src/core/time-advancement-service', () => ({
  TimeAdvancementService: {
    getInstance: vi.fn().mockReturnValue({
      shouldShowPauseButton: false,
    }),
  },
}));

describe('Mini Widget Compact Mode Context', () => {
  let widget: CalendarMiniWidget;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset SmallTime mock to default
    vi.mocked(SmallTimeUtils.isSmallTimeAvailable).mockReturnValue(false);

    // Create widget instance
    widget = new CalendarMiniWidget();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Context-Based Compact Mode Logic', () => {
    it('should set compactMode true when both weekday and time controls are active', async () => {
      // Mock settings for both features enabled
      mockGame.settings.get.mockImplementation((module: string, setting: string) => {
        if (setting === 'miniWidgetShowDayOfWeek') return true;
        if (setting === 'miniWidgetQuickTimeButtons') return true;
        return false;
      });

      const context = await widget._prepareContext();

      expect(context.compactMode).toBe(true);
    });

    it('should set compactMode false when only weekday is active', async () => {
      // Mock settings for only weekday enabled and SmallTime available
      // so that time controls are not shown
      mockGame.settings.get.mockImplementation((module: string, setting: string) => {
        if (setting === 'miniWidgetShowDayOfWeek') return true;
        if (setting === 'alwaysShowQuickTimeButtons') return false; // Don't force show time controls
        return false;
      });

      // Mock SmallTime as available so time controls won't show
      vi.mocked(SmallTimeUtils.isSmallTimeAvailable).mockReturnValue(true);

      const context = await widget._prepareContext();

      expect(context.compactMode).toBe(false);
      expect(context.showDayOfWeek).toBe(true);
      expect(context.showTimeControls).toBe(false);
    });

    it('should set compactMode false when only time controls are active', async () => {
      // Mock settings for only time controls enabled
      mockGame.settings.get.mockImplementation((module: string, setting: string) => {
        if (setting === 'miniWidgetShowDayOfWeek') return false;
        if (setting === 'miniWidgetQuickTimeButtons') return true;
        return false;
      });

      const context = await widget._prepareContext();

      expect(context.compactMode).toBe(false);
    });

    it('should set compactMode false when neither feature is active', async () => {
      // Mock settings for both features disabled
      mockGame.settings.get.mockImplementation((module: string, setting: string) => {
        if (setting === 'miniWidgetShowDayOfWeek') return false;
        if (setting === 'miniWidgetQuickTimeButtons') return false;
        return false;
      });

      const context = await widget._prepareContext();

      expect(context.compactMode).toBe(false);
    });

    it('should include compactMode in the context structure', async () => {
      // Mock any settings
      mockGame.settings.get.mockReturnValue(false);

      const context = await widget._prepareContext();

      expect(context).toHaveProperty('compactMode');
      expect(typeof context.compactMode).toBe('boolean');
    });
  });

  describe('Context Structure Validation', () => {
    it('should maintain all existing context properties', async () => {
      mockGame.settings.get.mockReturnValue(false);

      const context = await widget._prepareContext();

      // Verify all required MiniWidgetContext properties exist
      expect(context).toHaveProperty('shortDate');
      expect(context).toHaveProperty('hasSmallTime');
      expect(context).toHaveProperty('showTimeControls');
      expect(context).toHaveProperty('showTime');
      expect(context).toHaveProperty('timeString');
      expect(context).toHaveProperty('showDayOfWeek');
      expect(context).toHaveProperty('weekdayDisplay');
      expect(context).toHaveProperty('calendar');
      expect(context).toHaveProperty('currentDate');
      expect(context).toHaveProperty('formattedDate');
      expect(context).toHaveProperty('isGM');
      expect(context).toHaveProperty('compactMode');
    });

    it('should derive compactMode correctly based on feature flags', async () => {
      const testCases = [
        {
          showDayOfWeek: true,
          alwaysShow: true,
          hasSmallTime: false,
          expectedCompact: true,
          expectedShowTimeControls: true,
        },
        {
          showDayOfWeek: true,
          alwaysShow: false,
          hasSmallTime: true, // SmallTime available, so no time controls
          expectedCompact: false,
          expectedShowTimeControls: false,
        },
        {
          showDayOfWeek: false,
          alwaysShow: true,
          hasSmallTime: false,
          expectedCompact: false,
          expectedShowTimeControls: true,
        },
        {
          showDayOfWeek: false,
          alwaysShow: false,
          hasSmallTime: true,
          expectedCompact: false,
          expectedShowTimeControls: false,
        },
      ];

      for (const testCase of testCases) {
        mockGame.settings.get.mockImplementation((module: string, setting: string) => {
          if (setting === 'miniWidgetShowDayOfWeek') return testCase.showDayOfWeek;
          if (setting === 'alwaysShowQuickTimeButtons') return testCase.alwaysShow;
          return false;
        });

        // Mock SmallTime availability for this test case
        vi.mocked(SmallTimeUtils.isSmallTimeAvailable).mockReturnValue(testCase.hasSmallTime);

        const context = await widget._prepareContext();

        expect(context.compactMode).toBe(testCase.expectedCompact);
        expect(context.showDayOfWeek).toBe(testCase.showDayOfWeek);
        expect(context.showTimeControls).toBe(testCase.expectedShowTimeControls);
      }
    });
  });
});
