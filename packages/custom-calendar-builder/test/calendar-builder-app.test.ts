/**
 * Tests for Calendar Builder Application
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarBuilderApp } from '../src/calendar-builder-app';

// Mock Foundry globals
const mockFoundry = {
  applications: {
    api: {
      HandlebarsApplicationMixin: vi.fn((base) => base),
      ApplicationV2: class ApplicationV2 {
        render = vi.fn();
        close = vi.fn();
      },
      DialogV2: {
        confirm: vi.fn().mockResolvedValue(true),
      },
    },
    apps: {
      FilePicker: vi.fn().mockImplementation(function(this: any, _options: any) {
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
  textContent: '',
  innerHTML: '',
};

Object.defineProperty(globalThis, 'document', {
  value: {
    createElement: vi.fn().mockReturnValue(mockElement),
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
  });

  describe('initialization', () => {
    it('should create a CalendarBuilderApp instance', () => {
      expect(app).toBeInstanceOf(CalendarBuilderApp);
    });

    it('should have correct default options', () => {
      expect(CalendarBuilderApp.DEFAULT_OPTIONS.id).toBe('calendar-builder-app');
      expect(CalendarBuilderApp.DEFAULT_OPTIONS.classes).toEqual(['calendar-builder']);
      expect(CalendarBuilderApp.DEFAULT_OPTIONS.position.width).toBe(800);
      expect(CalendarBuilderApp.DEFAULT_OPTIONS.position.height).toBe(600);
    });

    it('should have the correct template parts', () => {
      expect(CalendarBuilderApp.PARTS.main.template).toBe(
        'modules/seasons-and-stars-calendar-builder/templates/calendar-builder.hbs'
      );
    });
  });

  describe('integration', () => {
    it('should register core integration', async () => {
      const mockIntegration = {
        CalendarValidator: vi.fn().mockResolvedValue({ validate: vi.fn() }),
        CalendarManager: {},
      };

      await app.registerIntegration(mockIntegration);

      expect(app['coreIntegration']).toBe(mockIntegration);
    });

    it('should load CalendarValidator when provided', async () => {
      const mockValidator = { validate: vi.fn() };
      const mockValidatorLoader = vi.fn().mockResolvedValue(mockValidator);
      const mockIntegration = {
        CalendarValidator: mockValidatorLoader,
        CalendarManager: {},
      };

      await app.registerIntegration(mockIntegration);

      expect(mockValidatorLoader).toHaveBeenCalled();
      expect(app['coreIntegration'].CalendarValidator).toBe(mockValidator);
    });
  });

  describe('context preparation', () => {
    it('should prepare context with empty state initially', async () => {
      const context = await app._prepareContext();

      expect(context.currentJson).toBe('');
      expect(context.hasContent).toBe(false);
      expect(context.validationResult).toBeNull();
    });

    it('should prepare context with content when JSON is set', async () => {
      app['currentJson'] = '{"id": "test"}';
      const context = await app._prepareContext();

      expect(context.currentJson).toBe('{"id": "test"}');
      expect(context.hasContent).toBe(true);
    });
  });

  describe('theming support', () => {
    it('should detect Foundry theming support', () => {
      const result = app['supportsFoundryTheming']();
      expect(result).toBe(false); // No theming classes in mock
    });

    it('should detect light theme', () => {
      const mockDocument = {
        body: {
          classList: {
            contains: vi.fn((className: string) => className === 'theme-light'),
          },
        },
      };
      Object.defineProperty(globalThis, 'document', { value: mockDocument, writable: true });

      const result = app['supportsFoundryTheming']();
      expect(result).toBe(true);
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
      const mockValidator = {
        validate: vi.fn().mockResolvedValue({ isValid: true, errors: [], warnings: [] }),
      };
      app['coreIntegration'] = { CalendarValidator: mockValidator };

      app['currentJson'] = '{"id": "test"}';
      await app['_validateCurrentJson']();

      expect(mockValidator.validate).toHaveBeenCalledWith({ id: 'test' });
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
  });

  describe('utility methods', () => {
    it('should escape HTML correctly', () => {
      const result = app['_escapeHtml']('<script>alert("xss")</script>');
      expect(result).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
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
  });
});