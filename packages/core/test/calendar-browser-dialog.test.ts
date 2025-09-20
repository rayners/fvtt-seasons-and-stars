/**
 * Tests for Calendar Browser Dialog
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarBrowserDialog } from '../src/ui/calendar-browser-dialog';
import { mockStandardCalendar } from './mocks/calendar-mocks';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

describe('CalendarBrowserDialog', () => {
  let mockCalendars: Map<string, SeasonsStarsCalendar>;

  beforeEach(() => {
    // Mock global game environment
    global.game = {
      settings: {
        get: vi.fn().mockReturnValue('gregorian'),
      },
      i18n: {
        localize: vi.fn((key: string) => key),
        format: vi.fn((key: string, data: any) => `${key}: ${JSON.stringify(data)}`),
      },
    } as any;

    global.ui = {
      notifications: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    } as any;

    // Create mock calendars using existing mock
    mockCalendars = new Map();
    mockCalendars.set('gregorian', {
      ...mockStandardCalendar,
      id: 'gregorian',
      name: 'Gregorian Calendar',
      description: 'Standard modern calendar',
      leapYear: { rule: 'gregorian', month: 'february', extraDays: 1 },
      sourceInfo: {
        type: 'builtin',
        sourceName: 'Core',
        description: 'Built-in calendar',
        icon: 'fa-solid fa-calendar',
      },
    });

    mockCalendars.set('custom', {
      ...mockStandardCalendar,
      id: 'custom',
      name: 'Custom Calendar',
      description: 'A test custom calendar',
      leapYear: { rule: 'none' },
      sourceInfo: {
        type: 'module',
        sourceName: 'Test Module',
        description: 'Module-provided calendar',
        icon: 'fa-solid fa-puzzle-piece',
      },
    });

    // Mock Handlebars
    global.Handlebars = {
      helpers: {},
      registerHelper: vi.fn(),
    } as any;
  });

  describe('Constructor', () => {
    it('should initialize with Map of calendars', () => {
      const dialog = new CalendarBrowserDialog(mockCalendars, 'gregorian');
      expect(dialog).toBeDefined();
    });

    it('should initialize with Array of calendars', () => {
      const calendarArray = Array.from(mockCalendars.values());
      const dialog = new CalendarBrowserDialog(calendarArray, 'gregorian');
      expect(dialog).toBeDefined();
    });

    it('should detect file picker as current calendar', () => {
      // Mock file picker active state
      vi.mocked(game.settings!.get)
        .mockReturnValueOnce('path/to/file.json') // activeCalendarFile
        .mockReturnValueOnce(''); // activeCalendar

      const dialog = new CalendarBrowserDialog(mockCalendars, 'gregorian');
      expect(dialog['currentCalendarId']).toBe('__FILE_PICKER__');
    });
  });

  describe('Context Preparation', () => {
    it('should prepare context with calendar list', async () => {
      const dialog = new CalendarBrowserDialog(mockCalendars, 'gregorian');
      const context = await dialog._prepareContext();

      expect(context.calendars).toBeDefined();
      expect(context.calendars).toHaveLength(2);
      expect(context.calendars[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        description: expect.any(String),
        tags: expect.any(Array),
        author: expect.any(String),
        sourceModule: expect.any(String),
        sourceType: expect.any(String),
        preview: expect.any(String),
      });
    });

    it('should mark current calendar correctly', async () => {
      const dialog = new CalendarBrowserDialog(mockCalendars, 'gregorian');
      const context = await dialog._prepareContext();

      const currentCalendar = context.calendars.find(cal => cal.isCurrent);
      expect(currentCalendar).toBeDefined();
      expect(currentCalendar!.id).toBe('gregorian');
    });

    it('should extract calendar tags', async () => {
      const dialog = new CalendarBrowserDialog(mockCalendars, 'gregorian');
      const context = await dialog._prepareContext();

      const gregorianCalendar = context.calendars.find(cal => cal.id === 'gregorian');
      expect(gregorianCalendar?.tags).toContain('leap-years');

      const customCalendar = context.calendars.find(cal => cal.id === 'custom');
      expect(customCalendar?.tags).toContain('short-year');
    });

    it('should provide available filters', async () => {
      const dialog = new CalendarBrowserDialog(mockCalendars, 'gregorian');
      const context = await dialog._prepareContext();

      expect(context.availableFilters).toBeDefined();
      expect(context.availableFilters.tags).toBeInstanceOf(Array);
      expect(context.availableFilters.sourceModules).toBeInstanceOf(Array);
    });
  });

  describe('Filtering and Searching', () => {
    it('should filter by search term', async () => {
      const dialog = new CalendarBrowserDialog(mockCalendars, 'gregorian');
      dialog['searchTerm'] = 'custom';

      const context = await dialog._prepareContext();
      expect(context.calendars).toHaveLength(1);
      expect(context.calendars[0].id).toBe('custom');
    });

    it('should filter by tags', async () => {
      const dialog = new CalendarBrowserDialog(mockCalendars, 'gregorian');
      dialog['activeFilters'].tags = ['leap-years'];

      const context = await dialog._prepareContext();
      expect(context.calendars).toHaveLength(1);
      expect(context.calendars[0].id).toBe('gregorian');
    });

  });

  describe('Static Methods', () => {
    it('should show dialog when manager is ready', async () => {
      // Mock manager and settings
      (global as any).game.seasonsStars = {
        manager: {
          getAllCalendars: vi.fn().mockReturnValue(mockCalendars),
        },
      };

      vi.mocked(game.settings!.get).mockReturnValue('gregorian');

      const renderSpy = vi.fn();
      vi.spyOn(CalendarBrowserDialog.prototype, 'render').mockImplementation(renderSpy);

      await CalendarBrowserDialog.show();

      expect(renderSpy).toHaveBeenCalledWith(true);
    });

    it('should show warning when no calendars available', async () => {
      // Mock empty calendars
      (global as any).game.seasonsStars = {
        manager: {
          getAllCalendars: vi.fn().mockReturnValue(new Map()),
        },
      };

      const warnSpy = vi.fn();
      (global as any).ui.notifications = { warn: warnSpy };

      await CalendarBrowserDialog.show();

      expect(warnSpy).toHaveBeenCalled();
    });

    it('should show error when manager not ready', async () => {
      (global as any).game.seasonsStars = undefined;

      const errorSpy = vi.fn();
      (global as any).ui.notifications = { error: errorSpy };

      await CalendarBrowserDialog.show();

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('Preview Generation', () => {
    it('should generate calendar preview', () => {
      const dialog = new CalendarBrowserDialog(mockCalendars, 'gregorian');
      const calendar = mockCalendars.get('gregorian')!;

      const preview = dialog['generateCalendarPreview'](calendar);
      expect(preview).toContain('2370');
      expect(typeof preview).toBe('string');
      expect(preview.length).toBeGreaterThan(0);
    });
  });
});