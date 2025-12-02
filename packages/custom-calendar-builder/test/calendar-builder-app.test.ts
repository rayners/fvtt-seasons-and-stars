/**
 * Tests for Calendar Builder Application
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarBuilderApp } from '../src/calendar-builder-app';

// Mock Foundry globals
const mockFoundry = {
  applications: {
    api: {
      HandlebarsApplicationMixin: vi.fn(base => base),
      ApplicationV2: class ApplicationV2 {
        render = vi.fn();
        close = vi.fn();
      },
      DialogV2: class DialogV2 {
        static confirm = vi.fn().mockResolvedValue(true);
      },
    },
    apps: {
      FilePicker: vi.fn().mockImplementation(function (this: any, _options: any) {
        this.render = vi.fn();
        return this;
      }),
    },
  },
};

const mockGame = {
  i18n: {
    localize: vi.fn((key: string) => key),
    format: vi.fn((key: string, data: any) => `${key}[${JSON.stringify(data)}]`),
  },
  modules: {
    get: vi.fn().mockReturnValue({ active: true }),
  },
};

const mockUI = {
  notifications: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
};

// Setup global mocks
Object.defineProperty(globalThis, 'foundry', {
  value: mockFoundry,
  writable: true,
});

Object.defineProperty(globalThis, 'game', {
  value: mockGame,
  writable: true,
});

Object.defineProperty(globalThis, 'ui', {
  value: mockUI,
  writable: true,
});

Object.defineProperty(globalThis, 'URL', {
  value: {
    createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
    revokeObjectURL: vi.fn(),
  },
  writable: true,
});

const mockElement = {
  click: vi.fn(),
  appendChild: vi.fn(),
  removeChild: vi.fn(),
  href: '',
  download: '',
  set textContent(text: string) {
    // Escape HTML characters like a real div would
    this._innerHTML = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },
  get innerHTML(): string {
    return this._innerHTML || '';
  },
  _innerHTML: '',
};

Object.defineProperty(globalThis, 'document', {
  value: {
    createElement: vi.fn().mockImplementation((tagName: string) => ({
      ...mockElement,
      tagName: tagName.toUpperCase(),
      set textContent(text: string) {
        // Escape HTML characters like a real div would
        this._innerHTML = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      },
      get innerHTML(): string {
        return this._innerHTML || '';
      },
      _innerHTML: '',
    })),
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      classList: {
        contains: vi.fn().mockReturnValue(false),
      },
    },
  },
  writable: true,
});

describe('CalendarBuilderApp', () => {
  let app: CalendarBuilderApp;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new CalendarBuilderApp();
    mockFoundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValue(true);
  });

  describe('initialization', () => {
    it('should create a CalendarBuilderApp instance', () => {
      expect(app).toBeInstanceOf(CalendarBuilderApp);
    });

    it('should have correct default options', () => {
      expect(CalendarBuilderApp.DEFAULT_OPTIONS.id).toBe('calendar-builder-app');
      expect(CalendarBuilderApp.DEFAULT_OPTIONS.classes).toEqual([
        'calendar-builder',
        'standard-form',
      ]);
      expect(CalendarBuilderApp.DEFAULT_OPTIONS.position.width).toBe(1000);
      expect(CalendarBuilderApp.DEFAULT_OPTIONS.position.height).toBe(700);
    });

    it('should have the correct template parts', () => {
      expect(CalendarBuilderApp.PARTS.toolbar).toBeDefined();
      expect(CalendarBuilderApp.PARTS.toolbar.template).toBe(
        'modules/seasons-and-stars-calendar-builder/templates/parts/toolbar.hbs'
      );
    });
  });

  describe('context preparation', () => {
    it('should prepare context with default template initially', async () => {
      const context = await app._prepareContext();

      expect(context.currentJson).toContain('my-custom-calendar');
      expect(context.hasContent).toBe(true);
      expect(context.validationResult).toBeNull();
    });

    it('should prepare context with content when JSON is set', async () => {
      app['currentJson'] = '{"id": "test"}';
      const context = await app._prepareContext();

      expect(context.currentJson).toBe('{"id": "test"}');
      expect(context.hasContent).toBe(true);
    });
  });

  describe('validation', () => {
    it('should handle empty JSON', async () => {
      app['currentJson'] = '';
      await app['_validateCurrentJson']();

      expect(app['lastValidationResult']).toBeNull();
    });

    it('should validate invalid JSON', async () => {
      app['currentJson'] = '{"invalid": json}';
      await app['_validateCurrentJson']();

      expect(app['lastValidationResult']).toEqual({
        isValid: false,
        errors: expect.arrayContaining([expect.stringContaining('Invalid JSON')]),
        warnings: [],
      });
    });

    it('should use basic validation for valid JSON without integration', async () => {
      app['currentJson'] = '{"id": "test", "translations": {}, "months": [], "weekdays": []}';
      await app['_validateCurrentJson']();

      expect(app['lastValidationResult'].isValid).toBe(true);
    });

    it('should use core validator when available', async () => {
      const mockValidator = vi.fn().mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      // Mock the actual API path
      const mockGame = {
        ...(globalThis as any).game,
        seasonsStars: {
          api: {
            validateCalendar: mockValidator,
          },
        },
      };
      Object.defineProperty(globalThis, 'game', { value: mockGame });

      app['currentJson'] = '{"id": "test"}';
      await app['_validateCurrentJson']();

      expect(mockValidator).toHaveBeenCalledWith({ id: 'test' });
    });
  });

  describe('actions', () => {
    it('should create new calendar template', async () => {
      await app._onNewCalendar(new Event('click'), mockElement as any);

      expect(app['currentJson']).toContain('my-custom-calendar');
      expect(mockUI.notifications.info).toHaveBeenCalled();
    });

    it('should handle export JSON', async () => {
      app['currentJson'] = '{"id": "test"}';

      await app._onExportJson(new Event('click'), mockElement as any);

      expect(mockUI.notifications.info).toHaveBeenCalled();
    });

    it('should handle clear editor with confirmation', async () => {
      app['currentJson'] = '{"id": "test"}';
      mockFoundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValue(true);

      await app._onClearEditor(new Event('click'), mockElement as any);

      expect(app['currentJson']).toBe('');
      expect(app['lastValidationResult']).toBeNull();
      expect(mockUI.notifications.info).toHaveBeenCalled();
    });

    it('should not clear editor without confirmation', async () => {
      app['currentJson'] = '{"id": "test"}';
      mockFoundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValue(false);

      await app._onClearEditor(new Event('click'), mockElement as any);

      expect(app['currentJson']).toBe('{"id": "test"}');
    });

    it('should validate JSON on command', async () => {
      app['currentJson'] = '{"id": "test"}';
      const validateSpy = vi.spyOn(app as any, '_validateCurrentJson');

      await app._onValidateJson(new Event('click'), mockElement as any);

      expect(validateSpy).toHaveBeenCalled();
      expect(mockUI.notifications.info).toHaveBeenCalled();
    });

    describe('_onLoadCurrentCalendar', () => {
      beforeEach(() => {
        vi.clearAllMocks();
        // Reset fetch mock
        globalThis.fetch = vi.fn();
      });

      it('should load current calendar successfully', async () => {
        const calendarData = {
          id: 'gregorian',
          translations: { en: { label: 'Gregorian Calendar' } },
          months: [],
          weekdays: [],
          sourceInfo: {
            type: 'external',
            sourceName: 'Custom File',
            description: 'Test calendar',
            icon: 'fa-file',
            url: 'modules/seasons-and-stars/calendars/gregorian.json',
          },
        };
        const calendarJson = JSON.stringify(calendarData);

        // Mock game.seasonsStars.manager.getActiveCalendar() to return calendar with sourceInfo.url
        const mockGameWithManager = {
          ...mockGame,
          seasonsStars: {
            manager: {
              getActiveCalendar: vi.fn().mockReturnValue(calendarData),
            },
          },
        };
        Object.defineProperty(globalThis, 'game', { value: mockGameWithManager, writable: true });

        // Mock successful fetch
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: vi.fn().mockResolvedValue(calendarJson),
        } as any);

        await app._onLoadCurrentCalendar(new Event('click'), mockElement as any);

        expect(globalThis.fetch).toHaveBeenCalledWith(
          'modules/seasons-and-stars/calendars/gregorian.json',
          expect.objectContaining({ cache: 'no-store' })
        );
        expect(app['currentJson']).toBe(calendarJson);
        expect(mockUI.notifications.info).toHaveBeenCalledWith(
          'CALENDAR_BUILDER.app.notifications.current_calendar_loaded'
        );
      });

      it('should handle builtin calendar (not just custom calendars)', async () => {
        const builtinCalendarData = {
          id: 'harptos',
          translations: { en: { label: 'Calendar of Harptos' } },
          months: [],
          weekdays: [],
        };
        const builtinCalendarJson = JSON.stringify(builtinCalendarData, null, 2);

        // Mock builtin calendar without sourceInfo.url (falls back to JSON.stringify)
        const mockGameWithManager = {
          ...mockGame,
          seasonsStars: {
            manager: {
              getActiveCalendar: vi.fn().mockReturnValue(builtinCalendarData),
            },
          },
        };
        Object.defineProperty(globalThis, 'game', { value: mockGameWithManager, writable: true });

        await app._onLoadCurrentCalendar(new Event('click'), mockElement as any);

        // Should NOT fetch (no sourceInfo.url), should use in-memory calendar
        expect(globalThis.fetch).not.toHaveBeenCalled();
        expect(app['currentJson']).toBe(builtinCalendarJson);
        expect(mockUI.notifications.info).toHaveBeenCalled();
      });

      it('should warn when no active calendar is loaded', async () => {
        // Mock manager returning null (no active calendar)
        const mockGameWithManager = {
          ...mockGame,
          seasonsStars: {
            manager: {
              getActiveCalendar: vi.fn().mockReturnValue(null),
            },
          },
        };
        Object.defineProperty(globalThis, 'game', { value: mockGameWithManager, writable: true });

        await app._onLoadCurrentCalendar(new Event('click'), mockElement as any);

        expect(globalThis.fetch).not.toHaveBeenCalled();
        expect(mockUI.notifications.warn).toHaveBeenCalledWith(
          'CALENDAR_BUILDER.app.notifications.no_current_calendar'
        );
      });

      it('should warn when activeCalendarFile setting is empty string', async () => {
        // Updated: Now tests manager returning undefined (same as no calendar)
        const mockGameWithManager = {
          ...mockGame,
          seasonsStars: {
            manager: {
              getActiveCalendar: vi.fn().mockReturnValue(undefined),
            },
          },
        };
        Object.defineProperty(globalThis, 'game', { value: mockGameWithManager, writable: true });

        await app._onLoadCurrentCalendar(new Event('click'), mockElement as any);

        expect(globalThis.fetch).not.toHaveBeenCalled();
        expect(mockUI.notifications.warn).toHaveBeenCalledWith(
          'CALENDAR_BUILDER.app.notifications.no_current_calendar'
        );
      });

      it('should handle HTTP errors', async () => {
        const calendarData = {
          id: 'test',
          sourceInfo: {
            type: 'external',
            sourceName: 'Test',
            description: 'Test',
            icon: 'fa-file',
            url: 'modules/seasons-and-stars/calendars/test.json',
          },
        };
        const mockGameWithManager = {
          ...mockGame,
          seasonsStars: {
            manager: {
              getActiveCalendar: vi.fn().mockReturnValue(calendarData),
            },
          },
        };
        Object.defineProperty(globalThis, 'game', { value: mockGameWithManager, writable: true });

        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as any);

        await app._onLoadCurrentCalendar(new Event('click'), mockElement as any);

        expect(mockUI.notifications.error).toHaveBeenCalledWith(
          'CALENDAR_BUILDER.app.notifications.current_calendar_load_failed'
        );
      });

      it('should handle timeout errors', async () => {
        const calendarData = {
          id: 'test',
          sourceInfo: {
            type: 'external',
            sourceName: 'Test',
            description: 'Test',
            icon: 'fa-file',
            url: 'modules/seasons-and-stars/calendars/test.json',
          },
        };
        const mockGameWithManager = {
          ...mockGame,
          seasonsStars: {
            manager: {
              getActiveCalendar: vi.fn().mockReturnValue(calendarData),
            },
          },
        };
        Object.defineProperty(globalThis, 'game', { value: mockGameWithManager, writable: true });

        // Mock fetch to reject with AbortError
        const abortError = new Error('The operation was aborted');
        abortError.name = 'AbortError';
        globalThis.fetch = vi.fn().mockRejectedValue(abortError);

        await app._onLoadCurrentCalendar(new Event('click'), mockElement as any);

        expect(mockUI.notifications.error).toHaveBeenCalledWith(
          'CALENDAR_BUILDER.app.notifications.timeout'
        );
      });

      it('should handle network errors', async () => {
        const calendarData = {
          id: 'test',
          sourceInfo: {
            type: 'external',
            sourceName: 'Test',
            description: 'Test',
            icon: 'fa-file',
            url: 'modules/seasons-and-stars/calendars/test.json',
          },
        };
        const mockGameWithManager = {
          ...mockGame,
          seasonsStars: {
            manager: {
              getActiveCalendar: vi.fn().mockReturnValue(calendarData),
            },
          },
        };
        Object.defineProperty(globalThis, 'game', { value: mockGameWithManager, writable: true });

        globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        await app._onLoadCurrentCalendar(new Event('click'), mockElement as any);

        expect(mockUI.notifications.error).toHaveBeenCalledWith(
          'CALENDAR_BUILDER.app.notifications.current_calendar_load_failed'
        );
      });

      it('should use cache: no-store to bypass cached data', async () => {
        const calendarData = {
          id: 'test',
          sourceInfo: {
            type: 'external',
            sourceName: 'Test',
            description: 'Test',
            icon: 'fa-file',
            url: 'modules/seasons-and-stars/calendars/test.json',
          },
        };
        const mockGameWithManager = {
          ...mockGame,
          seasonsStars: {
            manager: {
              getActiveCalendar: vi.fn().mockReturnValue(calendarData),
            },
          },
        };
        Object.defineProperty(globalThis, 'game', { value: mockGameWithManager, writable: true });

        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: vi.fn().mockResolvedValue('{}'),
        } as any);

        await app._onLoadCurrentCalendar(new Event('click'), mockElement as any);

        expect(globalThis.fetch).toHaveBeenCalledWith(
          'modules/seasons-and-stars/calendars/test.json',
          expect.objectContaining({
            cache: 'no-store',
            signal: expect.any(Object),
          })
        );
      });

      it('should handle game.settings being undefined gracefully', async () => {
        // Updated: tests manager being undefined
        const mockGameWithoutManager = { ...mockGame };
        Object.defineProperty(globalThis, 'game', {
          value: mockGameWithoutManager,
          writable: true,
        });

        await app._onLoadCurrentCalendar(new Event('click'), mockElement as any);

        expect(mockUI.notifications.warn).toHaveBeenCalledWith(
          'CALENDAR_BUILDER.app.notifications.no_current_calendar'
        );
      });

      it('should validate the loaded calendar after loading', async () => {
        const calendarJson = '{"id": "test"}';
        const calendarData = {
          id: 'test',
          sourceInfo: {
            type: 'external',
            sourceName: 'Test',
            description: 'Test',
            icon: 'fa-file',
            url: 'modules/seasons-and-stars/calendars/test.json',
          },
        };
        const mockGameWithManager = {
          ...mockGame,
          seasonsStars: {
            manager: {
              getActiveCalendar: vi.fn().mockReturnValue(calendarData),
            },
          },
        };
        Object.defineProperty(globalThis, 'game', { value: mockGameWithManager, writable: true });

        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: vi.fn().mockResolvedValue(calendarJson),
        } as any);

        const validateSpy = vi.spyOn(app as any, '_validateCurrentJson');

        await app._onLoadCurrentCalendar(new Event('click'), mockElement as any);

        expect(validateSpy).toHaveBeenCalled();
      });
    });
  });

  describe('utility methods', () => {
    it('should escape HTML correctly', () => {
      const result = app['_escapeHtml']('<script>alert("xss")</script>');
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should perform basic validation', () => {
      const validData = {
        id: 'test',
        translations: {},
        months: [],
        weekdays: [],
      };

      const result = app['_basicValidation'](validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect validation errors in basic validation', () => {
      const invalidData = {};

      const result = app['_basicValidation'](invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should convert text to kebab-case', () => {
      expect(app['_toKebabCase']('My Custom Calendar')).toBe('my-custom-calendar');
      expect(app['_toKebabCase']('Test_Calendar 2')).toBe('test-calendar-2');
      expect(app['_toKebabCase']('Calendar!!!Name')).toBe('calendar-name');
      expect(app['_toKebabCase']('  Spaced  Out  ')).toBe('spaced-out');
      expect(app['_toKebabCase']('UPPERCASE')).toBe('uppercase');
      expect(app['_toKebabCase']('already-kebab-case')).toBe('already-kebab-case');
    });

    it('should get previous calendar name from JSON', () => {
      app['currentJson'] = JSON.stringify({
        id: 'test-cal',
        translations: { en: { label: 'Test Calendar' } },
      });

      const result = app['_getPreviousCalendarName']();
      expect(result).toBe('Test Calendar');
    });

    it('should return empty string for invalid JSON in _getPreviousCalendarName', () => {
      app['currentJson'] = 'invalid json';
      const result = app['_getPreviousCalendarName']();
      expect(result).toBe('');
    });
  });

  describe('form field interactions', () => {
    it('should parse calendar data from JSON', () => {
      app['currentJson'] = JSON.stringify({
        id: 'test',
        translations: { en: { label: 'Test' } },
      });

      const result = app['parseCalendarData']();
      expect(result).toEqual({
        id: 'test',
        translations: { en: { label: 'Test' } },
      });
    });

    it('should return null for empty JSON in parseCalendarData', () => {
      app['currentJson'] = '';
      const result = app['parseCalendarData']();
      expect(result).toBeNull();
    });

    it('should return null for invalid JSON in parseCalendarData', () => {
      app['currentJson'] = 'invalid json';
      const result = app['parseCalendarData']();
      expect(result).toBeNull();
    });

    it('should set nested property with dot notation', () => {
      const obj: any = { translations: { en: {} } };
      app['_setNestedProperty'](obj, 'translations.en.label', 'Test Calendar');
      expect(obj.translations.en.label).toBe('Test Calendar');
    });

    it('should convert numeric strings to numbers for year fields', () => {
      const obj: any = { year: {} };
      app['_setNestedProperty'](obj, 'year.epoch', '2024');
      expect(obj.year.epoch).toBe(2024);
    });

    it('should convert numeric strings to numbers for time fields', () => {
      const obj: any = { time: {} };
      app['_setNestedProperty'](obj, 'time.hoursInDay', '24');
      expect(obj.time.hoursInDay).toBe(24);
    });

    it('should convert sources from newline-separated text to array', () => {
      const obj: any = {};
      app['_setNestedProperty'](
        obj,
        'sources',
        'https://example.com\nhttps://test.com\n\nhttps://third.com'
      );
      expect(obj.sources).toEqual(['https://example.com', 'https://test.com', 'https://third.com']);
    });

    it('should auto-generate ID from calendar name when ID is empty', () => {
      // Setup: Empty calendar
      app['currentJson'] = JSON.stringify({
        id: '',
        translations: { en: { label: '' } },
      });

      // Create mock elements
      const mockIdInput = { value: '' };
      const mockElement = {
        querySelector: vi.fn((selector: string) => {
          if (selector === '#calendar-id') return mockIdInput;
          if (selector === '#calendar-json-editor') return { value: app['currentJson'] };
          return null;
        }),
      };
      app['element'] = mockElement as any;

      // Simulate changing the name field
      const event = new Event('change');
      const target = { name: 'translations.en.label', value: 'My Custom Calendar' } as any;
      Object.defineProperty(event, 'target', { value: target, writable: false });

      app['_onFieldChange'](event);

      // Check that ID was auto-generated
      const calendar = JSON.parse(app['currentJson']);
      expect(calendar.id).toBe('my-custom-calendar');
      expect(mockIdInput.value).toBe('my-custom-calendar');
    });

    it('should update ID when previous ID matches previous auto-generated value', () => {
      // Setup: Calendar with name and matching kebab-case ID
      app['currentJson'] = JSON.stringify({
        id: 'old-calendar-name',
        translations: { en: { label: 'Old Calendar Name' } },
      });

      // Create mock elements
      const mockIdInput = { value: 'old-calendar-name' };
      const mockElement = {
        querySelector: vi.fn((selector: string) => {
          if (selector === '#calendar-id') return mockIdInput;
          if (selector === '#calendar-json-editor') return { value: app['currentJson'] };
          return null;
        }),
      };
      app['element'] = mockElement as any;

      // Simulate changing the name field
      const event = new Event('change');
      const target = { name: 'translations.en.label', value: 'New Calendar Name' } as any;
      Object.defineProperty(event, 'target', { value: target, writable: false });

      app['_onFieldChange'](event);

      // Check that ID was updated
      const calendar = JSON.parse(app['currentJson']);
      expect(calendar.id).toBe('new-calendar-name');
      expect(mockIdInput.value).toBe('new-calendar-name');
    });

    it('should not update ID when user has manually set a custom ID', () => {
      // Setup: Calendar with name and custom (non-matching) ID
      app['currentJson'] = JSON.stringify({
        id: 'custom-user-id',
        translations: { en: { label: 'Old Calendar Name' } },
      });

      // Create mock elements
      const mockIdInput = { value: 'custom-user-id' };
      const mockElement = {
        querySelector: vi.fn((selector: string) => {
          if (selector === '#calendar-id') return mockIdInput;
          if (selector === '#calendar-json-editor') return { value: app['currentJson'] };
          return null;
        }),
      };
      app['element'] = mockElement as any;

      // Simulate changing the name field
      const event = new Event('change');
      const target = { name: 'translations.en.label', value: 'New Calendar Name' } as any;
      Object.defineProperty(event, 'target', { value: target, writable: false });

      app['_onFieldChange'](event);

      // Check that ID was NOT updated (kept custom value)
      const calendar = JSON.parse(app['currentJson']);
      expect(calendar.id).toBe('custom-user-id');
      expect(mockIdInput.value).toBe('custom-user-id');
    });
  });

  describe('Simple Calendar import', () => {
    it('should detect Simple Calendar format', async () => {
      const scExport = {
        exportVersion: 2,
        calendars: [
          {
            id: 'test',
            name: 'Test Calendar',
            months: [{ name: 'January', numberOfDays: 31 }],
            weekdays: [{ name: 'Monday' }],
          },
        ],
      };

      const detectSpy = vi.spyOn(app as any, '_detectAndHandleSimpleCalendar');
      await app['_handleImportedJson'](JSON.stringify(scExport));

      expect(detectSpy).toHaveBeenCalled();
    });

    it('should show dialog for Simple Calendar format', async () => {
      const scExport = {
        exportVersion: 2,
        calendars: [
          {
            id: 'test',
            name: 'Test Calendar',
            months: [],
            weekdays: [],
          },
        ],
      };

      mockFoundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValue(true);
      const dialogSpy = vi.spyOn(mockFoundry.applications.api.DialogV2, 'confirm');

      await app['_handleImportedJson'](JSON.stringify(scExport));

      expect(dialogSpy).toHaveBeenCalled();
    });

    it('should convert Simple Calendar when user confirms', async () => {
      const scExport = {
        exportVersion: 2,
        calendars: [
          {
            id: 'test-cal',
            name: 'Test Calendar',
            months: [{ name: 'January', numberOfDays: 31 }],
            weekdays: [{ name: 'Monday' }],
          },
        ],
      };

      mockFoundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValue(true);

      await app['_handleImportedJson'](JSON.stringify(scExport));

      expect(app['currentJson']).toContain('test-cal');
      expect(app['currentJson']).toContain('January');
    });

    it('should not convert when user cancels', async () => {
      const scExport = {
        exportVersion: 2,
        calendars: [
          {
            id: 'test',
            name: 'Test',
            months: [],
            weekdays: [],
          },
        ],
      };

      mockFoundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValue(false);

      await app['_handleImportedJson'](JSON.stringify(scExport));

      const parsed = JSON.parse(app['currentJson']);
      expect(parsed.exportVersion).toBe(2);
    });

    it('should report warnings after conversion', async () => {
      const scExport = {
        exportVersion: 2,
        calendars: [
          {
            id: 'test',
            name: 'Test',
            months: [],
            weekdays: [],
            years: {
              yearNames: ['Dragon', 'Tiger'],
            },
          },
        ],
      };

      mockFoundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValue(true);
      const consoleSpy = vi.spyOn(console, 'warn');

      await app['_handleImportedJson'](JSON.stringify(scExport));

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should show multi-calendar warning in dialog', async () => {
      const scExport = {
        exportVersion: 2,
        calendars: [
          {
            id: 'calendar1',
            name: 'First Calendar',
            months: [],
            weekdays: [],
          },
          {
            id: 'calendar2',
            name: 'Second Calendar',
            months: [],
            weekdays: [],
          },
          {
            id: 'calendar3',
            name: 'Third Calendar',
            months: [],
            weekdays: [],
          },
        ],
      };

      mockFoundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValue(true);
      const dialogSpy = vi.spyOn(mockFoundry.applications.api.DialogV2, 'confirm');

      await app['_handleImportedJson'](JSON.stringify(scExport));

      expect(dialogSpy).toHaveBeenCalled();
      const dialogContent = dialogSpy.mock.calls[0][0].content;
      expect(dialogContent).toContain('3 calendars');
      expect(dialogContent).toContain('Only the first calendar will be imported');
    });

    it('should import first calendar when multiple calendars present', async () => {
      const scExport = {
        exportVersion: 2,
        calendars: [
          {
            id: 'first-calendar',
            name: 'First Calendar',
            months: [{ name: 'January', numberOfDays: 31 }],
            weekdays: [{ name: 'Monday' }],
          },
          {
            id: 'second-calendar',
            name: 'Second Calendar',
            months: [{ name: 'Month1', numberOfDays: 30 }],
            weekdays: [{ name: 'Day1' }],
          },
        ],
      };

      mockFoundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValue(true);

      await app['_handleImportedJson'](JSON.stringify(scExport));

      expect(app['currentJson']).toContain('first-calendar');
      expect(app['currentJson']).toContain('January');
      expect(app['currentJson']).not.toContain('second-calendar');
      expect(app['currentJson']).not.toContain('Month1');
    });
  });

  describe('weekday management', () => {
    describe('_onAddWeekday', () => {
      it('should add a new weekday with default naming', async () => {
        app['currentJson'] = JSON.stringify({
          id: 'test',
          weekdays: [
            { name: 'Monday', abbreviation: 'Mon' },
            { name: 'Tuesday', abbreviation: 'Tue' },
          ],
        });

        const mockCodeMirror = { value: '' };
        const mockElement = {
          querySelector: vi.fn((selector: string) => {
            if (selector === '#calendar-json-editor') return mockCodeMirror;
            return null;
          }),
        };
        app['element'] = mockElement as any;

        await app._onAddWeekday(new Event('click'), mockElement as any);

        const calendar = JSON.parse(app['currentJson']);
        expect(calendar.weekdays).toHaveLength(3);
        expect(calendar.weekdays[2]).toEqual({
          name: 'Day 3',
          abbreviation: 'D3',
        });
        expect(mockCodeMirror.value).toBe(app['currentJson']);
      });

      it('should initialize weekdays array if it does not exist', async () => {
        app['currentJson'] = JSON.stringify({
          id: 'test',
        });

        const mockCodeMirror = { value: '' };
        const mockElement = {
          querySelector: vi.fn((selector: string) => {
            if (selector === '#calendar-json-editor') return mockCodeMirror;
            return null;
          }),
        };
        app['element'] = mockElement as any;

        await app._onAddWeekday(new Event('click'), mockElement as any);

        const calendar = JSON.parse(app['currentJson']);
        expect(calendar.weekdays).toHaveLength(1);
        expect(calendar.weekdays[0]).toEqual({
          name: 'Day 1',
          abbreviation: 'D1',
        });
      });

      it('should warn if no calendar is loaded', async () => {
        app['currentJson'] = '';

        await app._onAddWeekday(new Event('click'), mockElement as any);

        expect(mockUI.notifications.warn).toHaveBeenCalledWith(
          'Please create or load a calendar first'
        );
      });

      it('should update CodeMirror editor with new JSON', async () => {
        app['currentJson'] = JSON.stringify({
          id: 'test',
          weekdays: [],
        });

        const mockCodeMirror = { value: '' };
        const mockElement = {
          querySelector: vi.fn((selector: string) => {
            if (selector === '#calendar-json-editor') return mockCodeMirror;
            return null;
          }),
        };
        app['element'] = mockElement as any;

        await app._onAddWeekday(new Event('click'), mockElement as any);

        expect(mockCodeMirror.value).toBe(app['currentJson']);
      });
    });

    describe('_onRemoveWeekday', () => {
      it('should remove a weekday at specified index', async () => {
        app['currentJson'] = JSON.stringify({
          id: 'test',
          weekdays: [
            { name: 'Monday', abbreviation: 'Mon' },
            { name: 'Tuesday', abbreviation: 'Tue' },
            { name: 'Wednesday', abbreviation: 'Wed' },
          ],
          year: { epoch: 0, currentYear: 1, prefix: '', suffix: '', startDay: 0 },
        });

        const mockCodeMirror = { value: '' };
        const mockElement = {
          querySelector: vi.fn((selector: string) => {
            if (selector === '#calendar-json-editor') return mockCodeMirror;
            return null;
          }),
        };
        app['element'] = mockElement as any;

        const target = { dataset: { index: '1' } } as any;
        await app._onRemoveWeekday(new Event('click'), target);

        const calendar = JSON.parse(app['currentJson']);
        expect(calendar.weekdays).toHaveLength(2);
        expect(calendar.weekdays[0].name).toBe('Monday');
        expect(calendar.weekdays[1].name).toBe('Wednesday');
        expect(mockUI.notifications.info).toHaveBeenCalledWith('Removed weekday: Tuesday');
      });

      it('should prevent removing the last weekday', async () => {
        app['currentJson'] = JSON.stringify({
          id: 'test',
          weekdays: [{ name: 'Monday', abbreviation: 'Mon' }],
        });

        const target = { dataset: { index: '0' } } as any;
        await app._onRemoveWeekday(new Event('click'), target);

        expect(mockUI.notifications.warn).toHaveBeenCalledWith('Cannot remove the last weekday');
        const calendar = JSON.parse(app['currentJson']);
        expect(calendar.weekdays).toHaveLength(1);
      });

      it('should adjust startDay to 0 when removing the selected weekday', async () => {
        app['currentJson'] = JSON.stringify({
          id: 'test',
          weekdays: [
            { name: 'Monday', abbreviation: 'Mon' },
            { name: 'Tuesday', abbreviation: 'Tue' },
            { name: 'Wednesday', abbreviation: 'Wed' },
          ],
          year: { epoch: 0, currentYear: 1, prefix: '', suffix: '', startDay: 1 },
        });

        const mockCodeMirror = { value: '' };
        const mockElement = {
          querySelector: vi.fn((selector: string) => {
            if (selector === '#calendar-json-editor') return mockCodeMirror;
            return null;
          }),
        };
        app['element'] = mockElement as any;

        const target = { dataset: { index: '1' } } as any;
        await app._onRemoveWeekday(new Event('click'), target);

        const calendar = JSON.parse(app['currentJson']);
        expect(calendar.year.startDay).toBe(0);
      });

      it('should decrement startDay when removing weekday before selected weekday', async () => {
        app['currentJson'] = JSON.stringify({
          id: 'test',
          weekdays: [
            { name: 'Monday', abbreviation: 'Mon' },
            { name: 'Tuesday', abbreviation: 'Tue' },
            { name: 'Wednesday', abbreviation: 'Wed' },
          ],
          year: { epoch: 0, currentYear: 1, prefix: '', suffix: '', startDay: 2 },
        });

        const mockCodeMirror = { value: '' };
        const mockElement = {
          querySelector: vi.fn((selector: string) => {
            if (selector === '#calendar-json-editor') return mockCodeMirror;
            return null;
          }),
        };
        app['element'] = mockElement as any;

        const target = { dataset: { index: '0' } } as any;
        await app._onRemoveWeekday(new Event('click'), target);

        const calendar = JSON.parse(app['currentJson']);
        expect(calendar.year.startDay).toBe(1);
      });

      it('should keep startDay unchanged when removing weekday after selected weekday', async () => {
        app['currentJson'] = JSON.stringify({
          id: 'test',
          weekdays: [
            { name: 'Monday', abbreviation: 'Mon' },
            { name: 'Tuesday', abbreviation: 'Tue' },
            { name: 'Wednesday', abbreviation: 'Wed' },
          ],
          year: { epoch: 0, currentYear: 1, prefix: '', suffix: '', startDay: 0 },
        });

        const mockCodeMirror = { value: '' };
        const mockElement = {
          querySelector: vi.fn((selector: string) => {
            if (selector === '#calendar-json-editor') return mockCodeMirror;
            return null;
          }),
        };
        app['element'] = mockElement as any;

        const target = { dataset: { index: '2' } } as any;
        await app._onRemoveWeekday(new Event('click'), target);

        const calendar = JSON.parse(app['currentJson']);
        expect(calendar.year.startDay).toBe(0);
      });

      it('should initialize year object if it does not exist', async () => {
        app['currentJson'] = JSON.stringify({
          id: 'test',
          weekdays: [
            { name: 'Monday', abbreviation: 'Mon' },
            { name: 'Tuesday', abbreviation: 'Tue' },
          ],
        });

        const mockCodeMirror = { value: '' };
        const mockElement = {
          querySelector: vi.fn((selector: string) => {
            if (selector === '#calendar-json-editor') return mockCodeMirror;
            return null;
          }),
        };
        app['element'] = mockElement as any;

        const target = { dataset: { index: '1' } } as any;
        await app._onRemoveWeekday(new Event('click'), target);

        const calendar = JSON.parse(app['currentJson']);
        expect(calendar.year).toBeDefined();
        expect(calendar.year.startDay).toBe(0);
      });

      it('should handle missing weekday name gracefully', async () => {
        app['currentJson'] = JSON.stringify({
          id: 'test',
          weekdays: [{ name: 'Monday', abbreviation: 'Mon' }, { abbreviation: 'Tue' }],
          year: { epoch: 0, currentYear: 1, prefix: '', suffix: '', startDay: 0 },
        });

        const mockCodeMirror = { value: '' };
        const mockElement = {
          querySelector: vi.fn((selector: string) => {
            if (selector === '#calendar-json-editor') return mockCodeMirror;
            return null;
          }),
        };
        app['element'] = mockElement as any;

        const target = { dataset: { index: '1' } } as any;
        await app._onRemoveWeekday(new Event('click'), target);

        expect(mockUI.notifications.info).toHaveBeenCalledWith('Removed weekday: Unknown');
      });

      it('should ignore invalid index', async () => {
        app['currentJson'] = JSON.stringify({
          id: 'test',
          weekdays: [{ name: 'Monday', abbreviation: 'Mon' }],
        });

        const target = { dataset: {} } as any;
        await app._onRemoveWeekday(new Event('click'), target);

        const calendar = JSON.parse(app['currentJson']);
        expect(calendar.weekdays).toHaveLength(1);
      });
    });

    describe('_setNestedProperty array handling', () => {
      it('should create array when next key is numeric', () => {
        const obj: any = {};
        app['_setNestedProperty'](obj, 'weekdays.0.name', 'Monday');
        expect(Array.isArray(obj.weekdays)).toBe(true);
        expect(obj.weekdays[0].name).toBe('Monday');
      });

      it('should create object when next key is not numeric', () => {
        const obj: any = {};
        app['_setNestedProperty'](obj, 'weekdays.first.name', 'Monday');
        expect(Array.isArray(obj.weekdays)).toBe(false);
        expect(obj.weekdays.first.name).toBe('Monday');
      });

      it('should handle nested array paths', () => {
        const obj: any = {};
        app['_setNestedProperty'](obj, 'weekdays.0.abbreviation', 'Mon');
        expect(obj.weekdays[0].abbreviation).toBe('Mon');
      });
    });
  });
});
