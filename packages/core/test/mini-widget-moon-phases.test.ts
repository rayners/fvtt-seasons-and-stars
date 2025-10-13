/**
 * Tests for CalendarMiniWidget moon phase display
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { CalendarMiniWidget } from '../src/ui/calendar-mini-widget';
import { CalendarDate } from '../src/core/calendar-date';
import { mockStandardCalendar } from './mocks/calendar-mocks';
import type { SeasonsStarsCalendar, MoonPhaseInfo } from '../src/types/calendar';

vi.mock('../src/core/time-advancement-service', () => ({
  TimeAdvancementService: {
    getInstance: vi.fn(() => ({
      isActive: false,
      shouldShowPauseButton: false,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
    })),
  },
}));

vi.mock('../src/ui/base-widget-manager', () => ({
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
      // Accept hex colors and common named colors for testing
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

describe('CalendarMiniWidget - Moon Phase Display', () => {
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

  it('should handle calendars without moons', async () => {
    const mockEngine = {
      getMoonPhaseInfo: vi.fn().mockReturnValue([]),
    };

    (global.game.seasonsStars.manager.getActiveEngine as Mock).mockReturnValue(mockEngine);

    const context = await widget._prepareContext({});

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

  it('should handle missing engine gracefully', async () => {
    (global.game.seasonsStars.manager.getActiveEngine as Mock).mockReturnValue(null);

    const context = await widget._prepareContext({});

    expect(context.showMoonPhases).toBe(true);
    expect(context.moonPhases.length).toBe(0);
  });
});
