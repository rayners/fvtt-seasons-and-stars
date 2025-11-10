/**
 * Feature integration tests for CalendarMiniWidget
 *
 * Consolidated from:
 * - mini-widget-moon-phases.test.ts
 * - mini-widget-sunrise-sunset-click.test.ts
 * - canonical-hours-mini-widget.test.ts
 * - mini-widget-settings-integration.test.ts
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { CalendarMiniWidget } from '../../../src/ui/calendar-mini-widget';
import { CalendarManager } from '../../../src/core/calendar-manager';
import { CalendarDate } from '../../../src/core/calendar-date';
import type { SeasonsStarsCalendar, MoonPhaseInfo } from '../../../src/types/calendar';
import { mockStandardCalendar } from '../../../mocks/calendar-mocks';
import { createMockGame, createMockHooks, createMockUI } from '../../../test-helpers/foundry-mocks';
import {
  getMiniWidgetButtonsFromSettings,
  registerQuickTimeButtonsHelper,
  getQuickTimeButtonsFromSettings,
} from '../../../src/core/quick-time-buttons';
import { registerSettings } from '../../../src/module';

// Mock time advancement service
vi.mock('../../../src/core/time-advancement-service', () => ({
  TimeAdvancementService: {
    getInstance: vi.fn(() => ({
      isActive: false,
      shouldShowPauseButton: false,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
    })),
  },
}));

vi.mock('../../../src/ui/base-widget-manager', () => ({
  SmallTimeUtils: {
    isSmallTimeAvailable: () => false,
    getSmallTimeElement: () => null,
  },
}));

(global as any).foundry = {
  utils: {
    mergeObject: (original: any, other: any) => ({ ...original, ...other }),
  },
  applications: {
    ux: {
      Draggable: vi.fn().mockImplementation(() => ({
        _onDragMouseDown: vi.fn(),
        _onDragMouseUp: vi.fn(),
      })),
    },
  },
};

// Mock CSS.supports for color validation in tests
(global as any).CSS = {
  supports: vi.fn((property: string, value: string) => {
    if (property === 'color') {
      return (
        /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value) ||
        /^(red|blue|green|yellow|orange|purple|pink|brown|black|white|gray|grey|cyan|magenta|lime|navy|teal|olive|maroon|aqua|fuchsia|silver|gold)$/i.test(
          value
        )
      );
    }
    return false;
  }),
};

describe('CalendarMiniWidget - Feature Integration Tests', () => {
  describe('Moon Phase Display', () => {
    let widget: CalendarMiniWidget;
    let mockCalendar: SeasonsStarsCalendar;
    let mockDate: CalendarDate;
    let mockSettings: Map<string, any>;

    const createMockMoonPhaseInfo = (): MoonPhaseInfo[] => [
      {
        moon: {
          name: 'Luna',
          cycleLength: 28,
          firstNewMoon: { year: 2024, month: 1, day: 1 },
          phases: [
            { name: 'New Moon', length: 1, singleDay: true, icon: 'new' },
            { name: 'Waxing Crescent', length: 6, singleDay: false, icon: 'waxing-crescent' },
          ],
          color: '#ffffff',
        },
        phase: { name: 'Full Moon', length: 1, singleDay: true, icon: 'full' },
        phaseIndex: 4,
        dayInPhase: 0,
        dayInPhaseExact: 0,
        daysUntilNext: 1,
        daysUntilNextExact: 1,
        phaseProgress: 0,
      },
      {
        moon: {
          name: 'Celene',
          cycleLength: 14,
          firstNewMoon: { year: 2024, month: 1, day: 1 },
          phases: [{ name: 'New Moon', length: 1, singleDay: true, icon: 'new' }],
          color: '#ffaa00',
        },
        phase: { name: 'First Quarter', length: 3, singleDay: false, icon: 'first-quarter' },
        phaseIndex: 2,
        dayInPhase: 1,
        dayInPhaseExact: 1.5,
        daysUntilNext: 2,
        daysUntilNextExact: 1.5,
        phaseProgress: 0.5,
      },
    ];

    beforeEach(() => {
      vi.clearAllMocks();

      mockSettings = new Map();
      mockSettings.set('seasons-and-stars.miniWidgetShowTime', false);
      mockSettings.set('seasons-and-stars.miniWidgetShowDayOfWeek', false);
      mockSettings.set('seasons-and-stars.alwaysShowQuickTimeButtons', false);
      mockSettings.set('seasons-and-stars.timeAdvancementRatio', 1.0);
      mockSettings.set('seasons-and-stars.defaultWidget', 'main');
      mockSettings.set('seasons-and-stars.miniWidgetShowMoonPhases', true);

      mockCalendar = { ...mockStandardCalendar };
      mockDate = new CalendarDate(
        {
          year: 2024,
          month: 1,
          day: 15,
          weekday: 0,
          time: { hour: 12, minute: 30, second: 0 },
        },
        mockCalendar
      );

      const mockEngine = {
        getMoonPhaseInfo: vi.fn().mockReturnValue(createMockMoonPhaseInfo()),
      };

      global.game = {
        settings: {
          get: vi.fn((module: string, key: string) => mockSettings.get(`${module}.${key}`)),
        },
        user: { isGM: true },
        seasonsStars: {
          manager: {
            getActiveCalendar: vi.fn().mockReturnValue(mockCalendar),
            getCurrentDate: vi.fn().mockReturnValue(mockDate),
            getActiveEngine: vi.fn().mockReturnValue(mockEngine),
          },
        },
      } as any;

      widget = new CalendarMiniWidget();
    });

    it('should display moon phases when setting is enabled', async () => {
      const context = await widget._prepareContext({});

      expect(context.showMoonPhases).toBe(true);
      expect(context.moonPhases).toBeDefined();
      expect(context.moonPhases.length).toBe(2);
    });

    it('should not display moon phases when setting is disabled', async () => {
      mockSettings.set('seasons-and-stars.miniWidgetShowMoonPhases', false);

      const context = await widget._prepareContext({});

      expect(context.showMoonPhases).toBe(false);
      expect(context.moonPhases.length).toBe(0);
    });

    it('should correctly map moon phase data to context', async () => {
      const context = await widget._prepareContext({});

      expect(context.moonPhases[0]).toEqual({
        moonName: 'Luna',
        phaseName: 'Full Moon',
        phaseIcon: 'full',
        faIcon: 'circle',
        moonColor: '#ffffff',
        moonColorIndex: 0,
      });

      expect(context.moonPhases[1]).toEqual({
        moonName: 'Celene',
        phaseName: 'First Quarter',
        phaseIcon: 'first-quarter',
        faIcon: 'adjust',
        moonColor: '#ffaa00',
        moonColorIndex: 1,
      });
    });

    it('should map all moon phase icons correctly', async () => {
      const phaseIconMap = {
        new: 'circle',
        'waxing-crescent': 'moon',
        'first-quarter': 'adjust',
        'waxing-gibbous': 'circle',
        full: 'circle',
        'waning-gibbous': 'circle',
        'last-quarter': 'adjust',
        'waning-crescent': 'moon',
      };

      const mockEngine = {
        getMoonPhaseInfo: vi.fn().mockReturnValue([
          {
            moon: {
              name: 'TestMoon',
              cycleLength: 28,
              firstNewMoon: { year: 2024, month: 1, day: 1 },
              phases: [],
              color: '#ffffff',
            },
            phase: { name: 'New Moon', length: 1, singleDay: true, icon: 'new' },
            phaseIndex: 0,
            dayInPhase: 0,
            dayInPhaseExact: 0,
            daysUntilNext: 1,
            daysUntilNextExact: 1,
            phaseProgress: 0,
          },
        ]),
      };

      (global.game.seasonsStars.manager.getActiveEngine as Mock).mockReturnValue(mockEngine);

      for (const [phaseIcon, expectedFaIcon] of Object.entries(phaseIconMap)) {
        mockEngine.getMoonPhaseInfo.mockReturnValue([
          {
            moon: {
              name: 'TestMoon',
              cycleLength: 28,
              firstNewMoon: { year: 2024, month: 1, day: 1 },
              phases: [],
            },
            phase: { name: 'Test Phase', length: 1, singleDay: true, icon: phaseIcon },
            phaseIndex: 0,
            dayInPhase: 0,
            dayInPhaseExact: 0,
            daysUntilNext: 1,
            daysUntilNextExact: 1,
            phaseProgress: 0,
          },
        ]);

        const context = await widget._prepareContext({});
        expect(context.moonPhases[0].faIcon).toBe(expectedFaIcon);
      }
    });

    it('should handle missing moon phase info gracefully', async () => {
      const mockEngine = {
        getMoonPhaseInfo: vi.fn().mockReturnValue([]),
      };

      (global.game.seasonsStars.manager.getActiveEngine as Mock).mockReturnValue(mockEngine);

      const context = await widget._prepareContext({});

      expect(context.showMoonPhases).toBe(true);
      expect(context.moonPhases.length).toBe(0);
    });

    it('should handle getMoonPhaseInfo errors gracefully', async () => {
      const mockEngine = {
        getMoonPhaseInfo: vi.fn().mockImplementation(() => {
          throw new Error('Test error');
        }),
      };

      (global.game.seasonsStars.manager.getActiveEngine as Mock).mockReturnValue(mockEngine);

      const context = await widget._prepareContext({});

      expect(context.showMoonPhases).toBe(true);
      expect(context.moonPhases.length).toBe(0);
    });

    it('should use fallback icon for unknown phase icons', async () => {
      const mockEngine = {
        getMoonPhaseInfo: vi.fn().mockReturnValue([
          {
            moon: {
              name: 'TestMoon',
              cycleLength: 28,
              firstNewMoon: { year: 2024, month: 1, day: 1 },
              phases: [],
            },
            phase: { name: 'Unknown Phase', length: 1, singleDay: true, icon: 'unknown-icon' },
            phaseIndex: 0,
            dayInPhase: 0,
            dayInPhaseExact: 0,
            daysUntilNext: 1,
            daysUntilNextExact: 1,
            phaseProgress: 0,
          },
        ]),
      };

      (global.game.seasonsStars.manager.getActiveEngine as Mock).mockReturnValue(mockEngine);

      const context = await widget._prepareContext({});

      expect(context.moonPhases[0].faIcon).toBe('circle');
    });
  });

  describe('Sunrise/Sunset Click Functionality', () => {
    let widget: CalendarMiniWidget;
    let manager: CalendarManager;
    let testCalendar: SeasonsStarsCalendar;

    beforeEach(async () => {
      // Reset game.time
      global.game = createMockGame();
      global.Hooks = createMockHooks();
      global.ui = createMockUI();
      global.game.time!.worldTime = 0;
      vi.clearAllMocks();

      // Create a simple test calendar with explicit sunrise/sunset times
      testCalendar = {
        id: 'test-calendar',
        translations: { en: { label: 'Test Calendar' } },
        year: {
          epoch: 2000,
          currentYear: 2024,
          prefix: '',
          suffix: '',
          startDay: 0,
        },
        months: [
          { name: 'Month1', days: 30 },
          { name: 'Month2', days: 30 },
          { name: 'Month3', days: 30 },
          { name: 'Month4', days: 30 },
        ],
        weekdays: [{ name: 'Day1' }, { name: 'Day2' }, { name: 'Day3' }],
        intercalary: [],
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 60,
        },
        seasons: [
          {
            name: 'Season1',
            startMonth: 1,
            endMonth: 2,
            sunrise: '06:00',
            sunset: '18:00',
          },
          {
            name: 'Season2',
            startMonth: 3,
            endMonth: 4,
            sunrise: '05:30',
            sunset: '18:30',
          },
        ],
        leapYear: {
          rule: 'none',
        },
      };

      manager = new CalendarManager();
      manager.loadCalendar(testCalendar);
      await manager.setActiveCalendar('test-calendar');

      game.seasonsStars.manager = manager;
      widget = new CalendarMiniWidget();
    });

    it('should change time when sunrise is clicked', async () => {
      await manager.setCurrentDate(
        new CalendarDate(
          { year: 2024, month: 1, day: 15, weekday: 0, time: { hour: 12, minute: 0, second: 0 } },
          testCalendar
        )
      );

      const initialHour = manager.getCurrentDate()?.time?.hour;

      await widget._onSetTimeToSunrise(new Event('click'));

      const newDate = manager.getCurrentDate();

      expect(newDate?.time?.hour).not.toBe(initialHour);
      expect(newDate?.time?.hour).toBeGreaterThanOrEqual(5);
      expect(newDate?.time?.hour).toBeLessThanOrEqual(7);
      expect(newDate?.day).toBe(15);
      expect(newDate?.month).toBe(1);
      expect(newDate?.year).toBe(2024);
    });

    it('should preserve date when setting time backward to sunrise', async () => {
      await manager.setCurrentDate(
        new CalendarDate(
          { year: 2024, month: 1, day: 15, weekday: 0, time: { hour: 23, minute: 59, second: 0 } },
          testCalendar
        )
      );

      await widget._onSetTimeToSunrise(new Event('click'));

      const newDate = manager.getCurrentDate();

      expect(newDate?.time?.hour).toBeLessThan(12);
      expect(newDate?.day).toBe(15);
      expect(newDate?.month).toBe(1);
      expect(newDate?.year).toBe(2024);
    });

    it('should change time when sunset is clicked', async () => {
      await manager.setCurrentDate(
        new CalendarDate(
          { year: 2024, month: 1, day: 20, weekday: 1, time: { hour: 12, minute: 0, second: 0 } },
          testCalendar
        )
      );

      const initialHour = manager.getCurrentDate()?.time?.hour;

      await widget._onSetTimeToSunset(new Event('click'));

      const newDate = manager.getCurrentDate();

      expect(newDate?.time?.hour).not.toBe(initialHour);
      expect(newDate?.time?.hour).toBeGreaterThanOrEqual(17);
      expect(newDate?.time?.hour).toBeLessThanOrEqual(19);
      expect(newDate?.day).toBe(20);
      expect(newDate?.month).toBe(1);
      expect(newDate?.year).toBe(2024);
    });

    it('should preserve date when setting time backward to sunset', async () => {
      await manager.setCurrentDate(
        new CalendarDate(
          { year: 2024, month: 1, day: 20, weekday: 1, time: { hour: 22, minute: 0, second: 0 } },
          testCalendar
        )
      );

      await widget._onSetTimeToSunset(new Event('click'));

      const newDate = manager.getCurrentDate();

      expect(newDate?.time?.hour).toBeLessThan(22);
      expect(newDate?.day).toBe(20);
      expect(newDate?.month).toBe(1);
      expect(newDate?.year).toBe(2024);
    });
  });

  describe('Canonical Hours Integration', () => {
    let widget: CalendarMiniWidget;
    const mockSettings = new Map();

    // Mock calendar with canonical hours
    const mockCalendarWithCanonical: SeasonsStarsCalendar = {
      id: 'test-canonical',
      translations: { en: { label: 'Test Canonical Calendar' } },
      year: { epoch: 0, currentYear: 2024, prefix: '', suffix: '', startDay: 0 },
      leapYear: { rule: 'none' },
      months: [{ name: 'January', days: 31 }],
      weekdays: [{ name: 'Sunday' }],
      intercalary: [],
      time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
      canonicalHours: [
        { name: "Strange's Bells", startHour: 3, endHour: 6, startMinute: 0, endMinute: 0 },
        { name: "Dawn's Call", startHour: 9, endHour: 11, startMinute: 0, endMinute: 0 },
        {
          name: 'Very Long Canonical Hour Name',
          startHour: 12,
          endHour: 13,
          startMinute: 0,
          endMinute: 0,
        },
      ],
    };

    const mockCalendarWithoutCanonical: SeasonsStarsCalendar = {
      id: 'test-regular',
      translations: { en: { label: 'Test Regular Calendar' } },
      year: { epoch: 0, currentYear: 2024, prefix: '', suffix: '', startDay: 0 },
      leapYear: { rule: 'none' },
      months: [{ name: 'January', days: 31 }],
      weekdays: [{ name: 'Sunday' }],
      intercalary: [],
      time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
    };

    beforeEach(() => {
      (global as any).game = {
        settings: {
          get: vi.fn((module: string, setting: string) => {
            const key = `${module}.${setting}`;
            return mockSettings.get(key);
          }),
          set: vi.fn((module: string, setting: string, value: any) => {
            const key = `${module}.${setting}`;
            mockSettings.set(key, value);
          }),
        },
        user: {
          isGM: false,
        },
      };

      mockSettings.clear();
      mockSettings.set('seasons-and-stars.miniWidgetShowTime', true);
      mockSettings.set('seasons-and-stars.miniWidgetCanonicalMode', 'auto');

      widget = new CalendarMiniWidget();
    });

    describe('getTimeDisplayString method', () => {
      it('should display canonical hour when time matches and mode is auto', () => {
        mockSettings.set('seasons-and-stars.miniWidgetCanonicalMode', 'auto');

        const time = { hour: 4, minute: 30, second: 0 };
        const result = (widget as any).getTimeDisplayString(time, mockCalendarWithCanonical);

        expect(result).toBe("Strange's Bells");
      });

      it('should display exact time when no canonical hour matches and mode is auto', () => {
        mockSettings.set('seasons-and-stars.miniWidgetCanonicalMode', 'auto');

        const time = { hour: 7, minute: 30, second: 0 };
        const result = (widget as any).getTimeDisplayString(time, mockCalendarWithCanonical);

        expect(result).toBe('07:30');
      });

      it('should always display exact time when mode is exact', () => {
        mockSettings.set('seasons-and-stars.miniWidgetCanonicalMode', 'exact');

        const time = { hour: 4, minute: 30, second: 0 };
        const result = (widget as any).getTimeDisplayString(time, mockCalendarWithCanonical);

        expect(result).toBe('04:30');
      });

      it('should hide time when mode is canonical but no canonical hour matches', () => {
        mockSettings.set('seasons-and-stars.miniWidgetCanonicalMode', 'canonical');

        const time = { hour: 7, minute: 30, second: 0 };
        const result = (widget as any).getTimeDisplayString(time, mockCalendarWithCanonical);

        expect(result).toBe('');
      });

      it('should display canonical hour when mode is canonical and hour matches', () => {
        mockSettings.set('seasons-and-stars.miniWidgetCanonicalMode', 'canonical');

        const time = { hour: 9, minute: 30, second: 0 };
        const result = (widget as any).getTimeDisplayString(time, mockCalendarWithCanonical);

        expect(result).toBe("Dawn's Call");
      });

      it('should truncate long canonical hour names for mini widget', () => {
        mockSettings.set('seasons-and-stars.miniWidgetCanonicalMode', 'auto');

        const time = { hour: 12, minute: 30, second: 0 };
        const result = (widget as any).getTimeDisplayString(time, mockCalendarWithCanonical);

        expect(result).toBe('Very Long Canon...');
      });

      it('should fallback to exact time when no calendar provided', () => {
        mockSettings.set('seasons-and-stars.miniWidgetCanonicalMode', 'auto');

        const time = { hour: 4, minute: 30, second: 0 };
        const result = (widget as any).getTimeDisplayString(time);

        expect(result).toBe('04:30');
      });

      it('should fallback to exact time when calendar has no canonical hours', () => {
        mockSettings.set('seasons-and-stars.miniWidgetCanonicalMode', 'auto');

        const time = { hour: 4, minute: 30, second: 0 };
        const result = (widget as any).getTimeDisplayString(time, mockCalendarWithoutCanonical);

        expect(result).toBe('04:30');
      });
    });

    describe('truncateCanonicalName method', () => {
      it('should not truncate short names', () => {
        const result = (widget as any).truncateCanonicalName('Prime');
        expect(result).toBe('Prime');
      });

      it('should not truncate names exactly at limit', () => {
        const result = (widget as any).truncateCanonicalName('Exactly 18 chars!!');
        expect(result).toBe('Exactly 18 chars!!');
      });

      it('should truncate long names with ellipsis', () => {
        const result = (widget as any).truncateCanonicalName(
          'This is a very long canonical hour name'
        );
        expect(result).toBe('This is a very ...');
      });
    });

    describe('formatExactTime method', () => {
      it('should format time with leading zeros', () => {
        const time = { hour: 4, minute: 5, second: 30 };
        const result = (widget as any).formatExactTime(time);
        expect(result).toBe('04:05');
      });

      it('should format time without leading zeros when not needed', () => {
        const time = { hour: 14, minute: 25, second: 30 };
        const result = (widget as any).formatExactTime(time);
        expect(result).toBe('14:25');
      });
    });

    describe('edge cases', () => {
      it('should handle midnight wraparound canonical hours', () => {
        const calendarWithWraparound = {
          ...mockCalendarWithCanonical,
          canonicalHours: [
            { name: 'Night Watch', startHour: 23, endHour: 2, startMinute: 0, endMinute: 0 },
          ],
        };

        mockSettings.set('seasons-and-stars.miniWidgetCanonicalMode', 'auto');

        let time = { hour: 23, minute: 30, second: 0 };
        let result = (widget as any).getTimeDisplayString(time, calendarWithWraparound);
        expect(result).toBe('Night Watch');

        time = { hour: 1, minute: 30, second: 0 };
        result = (widget as any).getTimeDisplayString(time, calendarWithWraparound);
        expect(result).toBe('Night Watch');
      });

      it('should handle empty canonical hours array', () => {
        const calendarWithEmptyCanonical = {
          ...mockCalendarWithCanonical,
          canonicalHours: [],
        };

        mockSettings.set('seasons-and-stars.miniWidgetCanonicalMode', 'auto');

        const time = { hour: 4, minute: 30, second: 0 };
        const result = (widget as any).getTimeDisplayString(time, calendarWithEmptyCanonical);

        expect(result).toBe('04:30');
      });
    });
  });

  describe('Settings Integration', () => {
    const mockSettings = new Map();
    const mockRegisteredSettings = new Map();

    beforeEach(() => {
      globalThis.game = {
        user: { isGM: true },
        settings: {
          get: vi.fn((module: string, key: string) => {
            return mockSettings.get(`${module}.${key}`);
          }),
          set: vi.fn((module: string, key: string, value: any) => {
            mockSettings.set(`${module}.${key}`, value);

            const settingConfig = mockRegisteredSettings.get(`${module}.${key}`);
            if (settingConfig && typeof settingConfig.onChange === 'function') {
              settingConfig.onChange();
            }

            return Promise.resolve();
          }),
          register: vi.fn((module: string, key: string, data: any) => {
            mockRegisteredSettings.set(`${module}.${key}`, data);
          }),
          registerMenu: vi.fn(),
        },
        seasonsStars: {
          manager: {
            getActiveCalendar: vi.fn().mockReturnValue({
              time: { hoursInDay: 24, minutesInHour: 60 },
              weekdays: Array(7).fill({}),
            }),
          },
        },
      } as any;

      globalThis.ui = {
        notifications: {
          warn: vi.fn(),
          error: vi.fn(),
          info: vi.fn(),
        },
      } as any;

      globalThis.Hooks = {
        on: vi.fn(),
        call: vi.fn(),
        callAll: vi.fn(),
      } as any;

      mockSettings.clear();
      mockRegisteredSettings.clear();
      vi.clearAllMocks();

      mockSettings.set('seasons-and-stars.quickTimeButtons', '-15,15,30,60,240');
    });

    describe('Settings Registration', () => {
      it('should register miniWidgetQuickTimeButtons setting', () => {
        registerSettings();

        expect(game.settings.register).toHaveBeenCalledWith(
          'seasons-and-stars',
          'miniWidgetQuickTimeButtons',
          expect.objectContaining({
            name: expect.stringContaining('Mini Widget'),
            hint: expect.stringContaining('mini widget'),
            scope: 'world',
            config: true,
            type: String,
            default: '',
          })
        );
      });

      it('should register setting with proper onChange handler', () => {
        registerSettings();

        const settingConfig = mockRegisteredSettings.get(
          'seasons-and-stars.miniWidgetQuickTimeButtons'
        );
        expect(settingConfig).toBeDefined();
        expect(typeof settingConfig.onChange).toBe('function');

        settingConfig.onChange();
        expect(Hooks.callAll).toHaveBeenCalledWith(
          'seasons-stars:settingsChanged',
          'miniWidgetQuickTimeButtons'
        );
      });
    });

    describe('Settings Change Hooks', () => {
      it('should trigger widget refresh when mini setting changes', async () => {
        registerSettings();

        await game.settings.set('seasons-and-stars', 'miniWidgetQuickTimeButtons', '30,120');

        expect(Hooks.callAll).toHaveBeenCalledWith(
          'seasons-stars:settingsChanged',
          'miniWidgetQuickTimeButtons'
        );
      });

      it('should handle both main and mini setting changes independently', async () => {
        registerSettings();

        await game.settings.set('seasons-and-stars', 'quickTimeButtons', '10,20,30');
        expect(Hooks.callAll).toHaveBeenCalledWith(
          'seasons-stars:settingsChanged',
          'quickTimeButtons'
        );

        await game.settings.set('seasons-and-stars', 'miniWidgetQuickTimeButtons', '10,30');
        expect(Hooks.callAll).toHaveBeenCalledWith(
          'seasons-stars:settingsChanged',
          'miniWidgetQuickTimeButtons'
        );

        expect(Hooks.callAll).toHaveBeenCalledTimes(2);
      });
    });

    describe('Settings Default Values', () => {
      it('should use empty string as default for mini widget setting', () => {
        registerSettings();

        const settingConfig = mockRegisteredSettings.get(
          'seasons-and-stars.miniWidgetQuickTimeButtons'
        );
        expect(settingConfig.default).toBe('');
      });

      it('should not affect main setting default when mini setting is added', () => {
        registerSettings();

        const mainSettingConfig = mockRegisteredSettings.get('seasons-and-stars.quickTimeButtons');
        expect(mainSettingConfig).toBeDefined();
        expect(mainSettingConfig.default).toBe('-15,15,30,60,240');
      });
    });

    describe('Settings Interaction with Existing Code', () => {
      it('should not break existing quick time button integration tests', async () => {
        const mainResult = getQuickTimeButtonsFromSettings(false);
        expect(mainResult).toEqual([
          { amount: -15, unit: 'minutes', label: '-15m' },
          { amount: 15, unit: 'minutes', label: '15m' },
          { amount: 30, unit: 'minutes', label: '30m' },
          { amount: 60, unit: 'minutes', label: '1h' },
          { amount: 240, unit: 'minutes', label: '4h' },
        ]);

        const miniResult = getQuickTimeButtonsFromSettings(true);
        expect(miniResult).toEqual([
          { amount: -15, unit: 'minutes', label: '-15m' },
          { amount: 15, unit: 'minutes', label: '15m' },
          { amount: 30, unit: 'minutes', label: '30m' },
        ]);
      });

      it('should work with existing Handlebars helper registration', () => {
        globalThis.Handlebars = {
          registerHelper: vi.fn(),
        };

        expect(() => registerQuickTimeButtonsHelper()).not.toThrow();

        expect(Handlebars.registerHelper).toHaveBeenCalledWith(
          'getQuickTimeButtons',
          expect.any(Function)
        );
      });
    });

    describe('Error Handling in Settings', () => {
      it('should handle corrupt mini widget setting gracefully', () => {
        mockSettings.set('seasons-and-stars.miniWidgetQuickTimeButtons', null);

        expect(() => {
          const result = getMiniWidgetButtonsFromSettings();
          expect(result).toBeNull();
        }).not.toThrow();
      });

      it('should handle missing game.settings gracefully', () => {
        const originalGame = globalThis.game;
        globalThis.game = undefined as any;

        try {
          expect(() => {
            const result = getMiniWidgetButtonsFromSettings();
            expect(result).toBeNull();
          }).not.toThrow();
        } finally {
          globalThis.game = originalGame;
        }
      });
    });
  });
});
