import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarSelectionDialog } from '../src/ui/calendar-selection-dialog';

vi.stubGlobal('game', {
  i18n: {
    localize: vi.fn((key: string) => key),
    format: vi.fn((key: string, data: any) => {
      if (key === 'SEASONS_STARS.dialog.calendar_selection.variant_label') {
        return `Variant: ${data.variant}`;
      }
      if (key === 'SEASONS_STARS.dialog.calendar_selection.switch_to') {
        return `Switch to ${data.calendar}`;
      }
      if (key === 'SEASONS_STARS.dialog.calendar_selection.sources_selected') {
        return `${data.count} Sources Selected`;
      }
      return key;
    }),
  },
  settings: {
    get: vi.fn().mockReturnValue(''),
    set: vi.fn(),
  },
  time: {
    worldTime: 0,
  },
});

vi.stubGlobal('foundry', {
  applications: {
    api: {
      HandlebarsApplicationMixin: (base: any) => base,
      ApplicationV2: class MockApplicationV2 {
        async _prepareContext() {
          return {};
        }
        render(): Promise<void> {
          return Promise.resolve();
        }
      },
    },
  },
});

vi.stubGlobal('ui', {
  notifications: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
});

vi.mock('../src/core/calendar-localization', () => ({
  CalendarLocalization: {
    getCalendarLabel: vi.fn((calendar: any) => calendar.translations?.en?.label || calendar.id),
    getCalendarDescription: vi.fn((calendar: any) => calendar.translations?.en?.description || ''),
    getCalendarSetting: vi.fn((calendar: any) => calendar.translations?.en?.setting || ''),
  },
}));

vi.mock('../src/core/logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../src/core/calendar-time-utils', () => ({
  CalendarTimeUtils: {
    getSecondsPerDay: vi.fn(() => 86400),
  },
}));

describe('CalendarSelectionDialog filtering', () => {
  let calendars: Map<string, any>;
  let collectionEntries: Map<string, any>;
  let dialog: CalendarSelectionDialog;

  beforeEach(() => {
    vi.clearAllMocks();

    calendars = new Map([
      [
        'gregorian',
        {
          id: 'gregorian',
          translations: {
            en: {
              label: 'Gregorian Calendar',
              description: 'Standard Earth calendar',
            },
          },
          months: [{ name: 'January', days: 31 }],
          weekdays: [{ name: 'Sunday' }],
          sourceInfo: {
            type: 'builtin',
            sourceName: 'Core Calendars',
            description: 'Built-in calendar',
            icon: 'fas fa-book',
          },
        },
      ],
      [
        'module-calendar',
        {
          id: 'module-calendar',
          translations: {
            en: {
              label: 'Module Calendar',
              description: 'Calendar provided by a module',
            },
          },
          months: [{ name: 'Month One', days: 30 }],
          weekdays: [{ name: 'Day One' }],
          sourceInfo: {
            type: 'module',
            sourceName: 'Test Module',
            description: 'Module source',
            icon: 'fas fa-puzzle-piece',
          },
        },
      ],
    ]);

    collectionEntries = new Map([
      [
        'gregorian',
        {
          id: 'gregorian',
          tags: ['history'],
          author: 'Core Author',
          preview: 'Core Sample',
        },
      ],
      [
        'module-calendar',
        {
          id: 'module-calendar',
          tags: ['fantasy'],
          author: 'Module Author',
          preview: 'Module Sample',
        },
      ],
    ]);

    dialog = new CalendarSelectionDialog(calendars, 'gregorian', collectionEntries);
  });

  it('filters calendars by search term', async () => {
    (dialog as any).searchTerm = 'module';

    const context = await dialog._prepareContext();
    expect(context.resultCount).toBe(1);
    expect(context.calendars[0].id).toBe('module-calendar');
  });

  it('filters calendars by tag input', async () => {
    (dialog as any).activeTagFilters = new Set(['fantasy']);

    const context = await dialog._prepareContext();
    expect(context.resultCount).toBe(1);
    expect(context.calendars[0].id).toBe('module-calendar');
  });

  it('filters calendars by source selection', async () => {
    let context = await dialog._prepareContext();
    const moduleSource = context.sourceModules.find((source: any) => source.name === 'Test Module');
    expect(moduleSource).toBeDefined();

    (dialog as any).activeSourceFilters = new Set([moduleSource.id]);
    context = await dialog._prepareContext();

    expect(context.resultCount).toBe(1);
    expect(context.calendars[0].id).toBe('module-calendar');
  });

  it('clears all filters with clearFilters handler', async () => {
    (dialog as any).searchTerm = 'module';
    (dialog as any).activeTagFilters = new Set(['fantasy']);
    (dialog as any).activeSourceFilters = new Set(['module-test-module']);
    const renderSpy = vi.spyOn(dialog, 'render').mockResolvedValue(undefined);

    await dialog._onClearFilters(new Event('click'), document.createElement('button'));

    expect((dialog as any).searchTerm).toBe('');
    expect((dialog as any).activeTagFilters.size).toBe(0);
    expect((dialog as any).activeSourceFilters.size).toBe(0);
    expect(renderSpy).toHaveBeenCalledWith({ parts: ['controls', 'list'] });
  });
});
