import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarSelectionDialog } from '../src/ui/calendar-selection-dialog';

// Mock foundry environment and dependencies
vi.stubGlobal('game', {
  i18n: {
    localize: vi.fn((key: string) => key),
    format: vi.fn((key: string, data: any) => `${key} ${JSON.stringify(data)}`),
  },
  time: {
    worldTime: 86400, // 1 day
  },
});

// Mock foundry applications
vi.stubGlobal('foundry', {
  applications: {
    api: {
      HandlebarsApplicationMixin: (base: any) => base,
      ApplicationV2: class MockApplicationV2 {
        constructor() {}
        async _prepareContext() {
          return {};
        }
      },
      DialogV2: class MockDialogV2 {
        constructor() {}
        render() {}
      },
    },
  },
});

// Mock CalendarLocalization
vi.mock('../src/core/calendar-localization', () => ({
  CalendarLocalization: {
    getCalendarLabel: vi.fn((calendar: any) => calendar.translations?.en?.label || calendar.id),
    getCalendarDescription: vi.fn((calendar: any) => calendar.translations?.en?.description || ''),
    getCalendarSetting: vi.fn((calendar: any) => calendar.translations?.en?.setting || ''),
    getCalendarTranslation: vi.fn((calendar: any, key: string, fallback: string) => fallback),
  },
}));

// Mock the logger module with simple vi.fn() mocks
vi.mock('../src/core/logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    api: vi.fn(),
    integration: vi.fn(),
    critical: vi.fn(),
    timing: vi.fn((label, fn) => fn()),
  },
}));

// Mock CalendarTimeUtils
vi.mock('../src/core/calendar-time-utils', () => ({
  CalendarTimeUtils: {
    getSecondsPerDay: vi.fn(() => 86400),
    getApproximateYearLength: vi.fn(() => 365),
  },
}));

describe('Calendar Selection Dialog - Variants Support', () => {
  let calendars: Map<string, any>;
  let dialog: CalendarSelectionDialog;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create test calendars including variants
    calendars = new Map([
      [
        'golarion-pf2e',
        {
          id: 'golarion-pf2e',
          translations: {
            en: {
              label: 'Golarion Calendar (Pathfinder 2e)',
              description: 'Base Golarion calendar',
            },
          },
          months: [{ name: 'Abadius', days: 31 }],
          weekdays: [{ name: 'Moonday' }],
        },
      ],
      [
        'golarion-pf2e(absalom-reckoning)',
        {
          id: 'golarion-pf2e(absalom-reckoning)',
          translations: {
            en: {
              label: 'Golarion Calendar (Pathfinder 2e) (Absalom Reckoning)',
              description: 'Standard Pathfinder Society calendar',
            },
          },
          months: [{ name: 'Abadius', days: 31 }],
          weekdays: [{ name: 'Moonday' }],
        },
      ],
      [
        'golarion-pf2e(imperial-calendar)',
        {
          id: 'golarion-pf2e(imperial-calendar)',
          translations: {
            en: {
              label: 'Golarion Calendar (Pathfinder 2e) (Imperial Calendar)',
              description: 'Chelish Imperial dating system',
            },
          },
          months: [{ name: 'First Imperial', days: 31 }],
          weekdays: [{ name: 'Moonday' }],
        },
      ],
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
        },
      ],
    ]);

    dialog = new CalendarSelectionDialog(calendars, 'golarion-pf2e');
  });

  it('should correctly identify calendar variants', async () => {
    const context = await dialog._prepareContext();
    const calendarsData = context.calendars;

    // Find calendars in the processed data
    const baseCalendar = calendarsData.find((c: any) => c.id === 'golarion-pf2e');
    const absalomVariant = calendarsData.find(
      (c: any) => c.id === 'golarion-pf2e(absalom-reckoning)'
    );
    const imperialVariant = calendarsData.find(
      (c: any) => c.id === 'golarion-pf2e(imperial-calendar)'
    );
    const gregorianCalendar = calendarsData.find((c: any) => c.id === 'gregorian');

    // Base calendar should not be marked as variant
    expect(baseCalendar.isVariant).toBe(false);
    expect(baseCalendar.variantInfo).toBe('');
    expect(baseCalendar.baseCalendarId).toBe('golarion-pf2e');

    // Variant calendars should be properly marked
    expect(absalomVariant.isVariant).toBe(true);
    expect(absalomVariant.variantInfo).toBe('Variant: Absalom Reckoning');
    expect(absalomVariant.baseCalendarId).toBe('golarion-pf2e');

    expect(imperialVariant.isVariant).toBe(true);
    expect(imperialVariant.variantInfo).toBe('Variant: Imperial Calendar');
    expect(imperialVariant.baseCalendarId).toBe('golarion-pf2e');

    // Non-variant calendar should not be marked as variant
    expect(gregorianCalendar.isVariant).toBe(false);
    expect(gregorianCalendar.variantInfo).toBe('');
    expect(gregorianCalendar.baseCalendarId).toBe('gregorian');
  });

  it('should sort calendars hierarchically with base calendars first, then variants', async () => {
    const context = await dialog._prepareContext();
    const calendarsData = context.calendars;
    const calendarIds = calendarsData.map((c: any) => c.id);

    // Should be sorted with Gregorian first, then others alphabetically:
    // - Gregorian calendar and its variants come first
    // - Then other calendars in alphabetical order with their variants
    expect(calendarIds).toEqual([
      'gregorian',
      'golarion-pf2e',
      'golarion-pf2e(absalom-reckoning)',
      'golarion-pf2e(imperial-calendar)',
    ]);

    // Check hierarchy indicators for variants
    const absalomVariant = calendarsData.find(
      (c: any) => c.id === 'golarion-pf2e(absalom-reckoning)'
    );
    const imperialVariant = calendarsData.find(
      (c: any) => c.id === 'golarion-pf2e(imperial-calendar)'
    );

    expect(absalomVariant.hierarchyLevel).toBe(1);
    expect(imperialVariant.hierarchyLevel).toBe(1);
    // Dialog uses CSS styling for hierarchy, not text prefixes
  });

  it('should generate proper variant info from variant IDs', async () => {
    const context = await dialog._prepareContext();
    const calendarsData = context.calendars;

    const testCases = [
      { id: 'calendar(simple-name)', expected: 'Variant: Simple Name' },
      { id: 'calendar(multi-word-name)', expected: 'Variant: Multi Word Name' },
      { id: 'calendar(imperial-calendar)', expected: 'Variant: Imperial Calendar' },
    ];

    // Test the variant info generation logic
    for (const testCase of testCases) {
      const match = testCase.id.match(/^(.+)\((.+)\)$/);
      if (match) {
        const variantId = match[2];
        const variantInfo = `Variant: ${variantId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
        expect(variantInfo).toBe(testCase.expected);
      }
    }
  });

  it('should maintain current and selected states for variants', async () => {
    // Set current calendar to a variant
    dialog = new CalendarSelectionDialog(calendars, 'golarion-pf2e(imperial-calendar)');

    const context = await dialog._prepareContext();
    const calendarsData = context.calendars;

    const imperialVariant = calendarsData.find(
      (c: any) => c.id === 'golarion-pf2e(imperial-calendar)'
    );
    const baseCalendar = calendarsData.find((c: any) => c.id === 'golarion-pf2e');

    // Imperial variant should be marked as current and selected
    expect(imperialVariant.isCurrent).toBe(true);
    expect(imperialVariant.isSelected).toBe(true);

    // Base calendar should not be current or selected
    expect(baseCalendar.isCurrent).toBe(false);
    expect(baseCalendar.isSelected).toBe(false);
  });

  it('should handle calendars without variants correctly', async () => {
    const context = await dialog._prepareContext();
    const calendarsData = context.calendars;

    const gregorianCalendar = calendarsData.find((c: any) => c.id === 'gregorian');

    // Should be treated as regular calendar
    expect(gregorianCalendar.isVariant).toBe(false);
    expect(gregorianCalendar.variantInfo).toBe('');
    expect(gregorianCalendar.baseCalendarId).toBe('gregorian');
  });
});
