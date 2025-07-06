import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use real TestLogger instead of mocks for better testing
import { TestLogger } from './utils/test-logger';
vi.mock('../src/core/logger', () => ({
  Logger: TestLogger,
}));

import { CalendarManager } from '../src/core/calendar-manager';

// Mock foundry environment and dependencies
vi.stubGlobal('game', {
  settings: {
    get: vi.fn(),
    set: vi.fn(),
  },
});
vi.stubGlobal('Hooks', {
  callAll: vi.fn(),
  on: vi.fn(),
});

// Mock fetch to return the actual Golarion calendar
vi.stubGlobal('fetch', vi.fn());

// Mock the built-in calendars list to include golarion-pf2e
vi.mock('../src/generated/calendar-list', () => ({
  BUILT_IN_CALENDARS: ['golarion-pf2e'],
}));

// Mock CalendarValidator
vi.mock('../src/core/calendar-validator', () => ({
  CalendarValidator: {
    validate: vi.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    }),
    validateWithHelp: vi.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    }),
  },
}));

// Mock CalendarLocalization
vi.mock('../src/core/calendar-localization', () => ({
  CalendarLocalization: {
    getCalendarLabel: vi.fn().mockReturnValue('Golarion Calendar (Pathfinder 2e)'),
  },
}));

describe('Golarion Variants Integration', () => {
  let calendarManager: CalendarManager;

  beforeEach(async () => {
    vi.clearAllMocks();
    TestLogger.clearLogs();

    // Mock fetch to return the actual Golarion calendar file
    const golarionCalendarResponse = await import('fs/promises').then(fs =>
      fs.readFile('./calendars/golarion-pf2e.json', 'utf-8')
    );
    const golarionCalendar = JSON.parse(golarionCalendarResponse);

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(golarionCalendar),
    } as any);

    // Create calendar manager
    calendarManager = new CalendarManager();
  });

  it('should load Golarion calendar with all 4 variants plus base calendar', async () => {
    // Load built-in calendars (including golarion-pf2e)
    await calendarManager.loadBuiltInCalendars();

    // Should have 5 calendars: base + 4 variants
    expect(calendarManager.calendars.size).toBe(5);

    // Check base calendar
    expect(calendarManager.calendars.has('golarion-pf2e')).toBe(true);

    // Check all 4 variants
    expect(calendarManager.calendars.has('golarion-pf2e(absalom-reckoning)')).toBe(true);
    expect(calendarManager.calendars.has('golarion-pf2e(imperial-calendar)')).toBe(true);
    expect(calendarManager.calendars.has('golarion-pf2e(varisian-traditional)')).toBe(true);
    expect(calendarManager.calendars.has('golarion-pf2e(earth-historical)')).toBe(true);
  });

  it('should correctly apply imperial calendar overrides', async () => {
    await calendarManager.loadBuiltInCalendars();

    const imperialCalendar = calendarManager.calendars.get('golarion-pf2e(imperial-calendar)');
    expect(imperialCalendar).toBeDefined();

    // Check year suffix override
    expect(imperialCalendar?.year.suffix).toBe(' IC');

    // Check month name overrides
    expect(imperialCalendar?.months[0].name).toBe('First Imperial');
    expect(imperialCalendar?.months[1].name).toBe('Second Imperial');
    expect(imperialCalendar?.months[2].name).toBe('Third Imperial');

    // Check that non-overridden months remain unchanged
    expect(imperialCalendar?.months[3].name).toBe('Gozran');
  });

  it('should correctly apply earth historical overrides', async () => {
    await calendarManager.loadBuiltInCalendars();

    const earthCalendar = calendarManager.calendars.get('golarion-pf2e(earth-historical)');
    expect(earthCalendar).toBeDefined();

    // Check year suffix override
    expect(earthCalendar?.year.suffix).toBe(' AD');

    // Check that all months are renamed to Earth names
    expect(earthCalendar?.months[0].name).toBe('January');
    expect(earthCalendar?.months[1].name).toBe('February');
    expect(earthCalendar?.months[2].name).toBe('March');
    expect(earthCalendar?.months[11].name).toBe('December');
  });

  it('should resolve to default variant when setting base calendar', async () => {
    await calendarManager.loadBuiltInCalendars();

    // Set active calendar to base ID
    await calendarManager.setActiveCalendar('golarion-pf2e');

    // Should resolve to the default variant (absalom-reckoning)
    const activeId = calendarManager.getActiveCalendarId();
    expect(activeId).toBe('golarion-pf2e(absalom-reckoning)');
  });

  it('should allow setting specific variants directly', async () => {
    await calendarManager.loadBuiltInCalendars();

    // Set active calendar to specific variant
    await calendarManager.setActiveCalendar('golarion-pf2e(imperial-calendar)');

    // Should use the specific variant
    const activeId = calendarManager.getActiveCalendarId();
    expect(activeId).toBe('golarion-pf2e(imperial-calendar)');

    const activeCalendar = calendarManager.getActiveCalendar();
    expect(activeCalendar?.year.suffix).toBe(' IC');
  });
});
