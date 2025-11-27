/**
 * D&D 5e Integration Tests
 *
 * Tests the integration between Seasons & Stars and the D&D 5e system calendar API.
 * Following TDD approach - these tests are written before the implementation.
 *
 * Key integration points:
 * - dnd5e.setupCalendar hook for calendar registration
 * - CONFIG.DND5E.calendar.calendars for calendar definitions
 * - CONFIG.DND5E.calendar.formatters for date/time formatting
 * - seasons-stars:dnd5e:systemDetected for system initialization
 * - seasons-stars:calendarChanged for calendar synchronization
 */

/* eslint-disable @typescript-eslint/triple-slash-reference */
/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference path="../../core/test/test-types.d.ts" />

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setupFoundryEnvironment } from '../../core/test/setup';
import {
  setupDnD5eEnvironment,
  validateDnD5eEnvironment,
  getDnD5eCalendarConfig,
  triggerSetupCalendarHook,
  triggerUpdateWorldTimeHook,
  resetDnD5eEnvironment,
  MockCalendarData5e,
} from './setup-dnd5e';

describe('D&D 5e Integration Tests', () => {
  beforeEach(() => {
    // Set up basic Foundry environment
    setupFoundryEnvironment();

    // Set up D&D 5e environment
    setupDnD5eEnvironment({
      currentWorldTime: 0,
      calendarEnabled: true,
    });

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetDnD5eEnvironment();
  });

  describe('Environment Setup', () => {
    it('validates D&D 5e environment is properly configured', () => {
      expect(validateDnD5eEnvironment()).toBe(true);
    });

    it('has correct system ID', () => {
      expect((globalThis as any).game.system.id).toBe('dnd5e');
    });

    it('has calendar config structure', () => {
      const config = getDnD5eCalendarConfig();
      expect(config).toBeDefined();
      expect(config.calendars).toBeInstanceOf(Array);
      expect(config.formatters).toBeInstanceOf(Array);
      expect(config.application).toBeDefined();
    });

    it('has dnd5e data models available', () => {
      expect((globalThis as any).dnd5e.dataModels.calendar.CalendarData5e).toBeDefined();
    });

    it('has dnd5e calendar applications available', () => {
      expect((globalThis as any).dnd5e.applications.calendar.BaseCalendarHUD).toBeDefined();
      expect((globalThis as any).dnd5e.applications.calendar.CalendarHUD).toBeDefined();
    });
  });

  describe('MockCalendarData5e', () => {
    it('provides default sunrise time', () => {
      const calendarData = new MockCalendarData5e();
      const sunrise = calendarData.sunrise(0);
      expect(sunrise).toBe(21600); // 6:00 AM in seconds
    });

    it('provides default sunset time', () => {
      const calendarData = new MockCalendarData5e();
      const sunset = calendarData.sunset(0);
      expect(sunset).toBe(64800); // 6:00 PM in seconds
    });

    it('accepts time components object', () => {
      const calendarData = new MockCalendarData5e();
      const sunrise = calendarData.sunrise({ hour: 12, minute: 0, second: 0 });
      expect(sunrise).toBe(21600);
    });
  });

  describe('Hook System', () => {
    it('allows registering dnd5e.setupCalendar hook callbacks', () => {
      const callback = vi.fn();
      // MockHooks.on returns the number of registered callbacks
      const result = (globalThis as any).Hooks.on('dnd5e.setupCalendar', callback);
      expect(result).toBeGreaterThan(0);
    });

    it('triggers setupCalendar hook and returns result', () => {
      const result = triggerSetupCalendarHook();
      expect(result).toBe(true);
    });

    it('allows setupCalendar to return false to disable calendar', () => {
      (globalThis as any).Hooks.on('dnd5e.setupCalendar', () => false);
      const result = triggerSetupCalendarHook();
      expect(result).toBe(false);
    });

    it('allows registering updateWorldTime hook callbacks', () => {
      const callback = vi.fn();
      const result = (globalThis as any).Hooks.on('updateWorldTime', callback);
      expect(result).toBeGreaterThan(0);
    });

    it('triggers updateWorldTime with dnd5e deltas', () => {
      const callback = vi.fn();
      (globalThis as any).Hooks.on('updateWorldTime', callback);

      triggerUpdateWorldTimeHook(86400, { midnights: 1, sunrises: 1 });

      expect(callback).toHaveBeenCalledWith(86400, {
        dnd5e: {
          deltas: {
            midnights: 1,
            middays: 0,
            sunrises: 1,
            sunsets: 0,
          },
        },
      });
    });
  });
});

describe('D&D 5e Integration Module', () => {
  beforeEach(() => {
    setupFoundryEnvironment();
    setupDnD5eEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetDnD5eEnvironment();
  });

  describe('DnD5eIntegration Class', () => {
    it('should be a singleton', async () => {
      // Import the module (will be implemented)
      const { DnD5eIntegration } = await import('../src/dnd5e-pack');

      const instance1 = DnD5eIntegration.initialize();
      const instance2 = DnD5eIntegration.initialize();

      expect(instance1).toBe(instance2);

      // Cleanup
      instance1.destroy();
    });

    it('should provide getInstance method', async () => {
      const { DnD5eIntegration } = await import('../src/dnd5e-pack');

      expect(DnD5eIntegration.getInstance()).toBeNull();

      const instance = DnD5eIntegration.initialize();
      expect(DnD5eIntegration.getInstance()).toBe(instance);

      instance.destroy();
      expect(DnD5eIntegration.getInstance()).toBeNull();
    });

    it('should track integration active state', async () => {
      const { DnD5eIntegration } = await import('../src/dnd5e-pack');

      const instance = DnD5eIntegration.initialize();
      expect(instance.isIntegrationActive()).toBe(true);

      instance.destroy();
      expect(instance.isIntegrationActive()).toBe(false);
    });
  });

  describe('Calendar Registration', () => {
    it('should register calendar with dnd5e on setupCalendar hook', async () => {
      const { DnD5eIntegration } = await import('../src/dnd5e-pack');

      const instance = DnD5eIntegration.initialize();

      // Simulate seasons-stars providing calendar data
      const mockCalendar = {
        id: 'gregorian',
        translations: { en: { label: 'Gregorian Calendar' } },
        months: [{ name: 'January', days: 31 }],
        weekdays: [{ name: 'Sunday' }],
      };

      instance.registerCalendar(mockCalendar as any);

      const config = getDnD5eCalendarConfig();
      const registeredCalendar = config.calendars.find(c => c.value === 'seasons-stars:gregorian');

      expect(registeredCalendar).toBeDefined();
      expect(registeredCalendar?.label).toBe('Gregorian Calendar');

      instance.destroy();
    });

    it('should provide CalendarData5e class with sunrise/sunset methods', async () => {
      const { DnD5eIntegration } = await import('../src/dnd5e-pack');

      const instance = DnD5eIntegration.initialize();

      const mockCalendar = {
        id: 'test-calendar',
        translations: { en: { label: 'Test Calendar' } },
        months: [{ name: 'Month1', days: 30 }],
        weekdays: [{ name: 'Day1' }],
        time: {
          sunrise: { hour: 6, minute: 0 },
          sunset: { hour: 18, minute: 0 },
        },
      };

      instance.registerCalendar(mockCalendar as any);

      const config = getDnD5eCalendarConfig();
      const registeredCalendar = config.calendars.find(
        c => c.value === 'seasons-stars:test-calendar'
      );

      expect(registeredCalendar?.class).toBeDefined();

      // Instantiate the custom class
      const CalendarClass = registeredCalendar!.class!;
      const calendarInstance = new CalendarClass(registeredCalendar!.config) as MockCalendarData5e;

      // Should have sunrise/sunset methods
      expect(typeof calendarInstance.sunrise).toBe('function');
      expect(typeof calendarInstance.sunset).toBe('function');

      instance.destroy();
    });

    it('should unregister calendar when destroyed', async () => {
      const { DnD5eIntegration } = await import('../src/dnd5e-pack');

      const instance = DnD5eIntegration.initialize();

      const mockCalendar = {
        id: 'temp-calendar',
        translations: { en: { label: 'Temp Calendar' } },
        months: [{ name: 'Month1', days: 30 }],
        weekdays: [{ name: 'Day1' }],
      };

      instance.registerCalendar(mockCalendar as any);

      let config = getDnD5eCalendarConfig();
      expect(config.calendars.some(c => c.value === 'seasons-stars:temp-calendar')).toBe(true);

      instance.destroy();

      config = getDnD5eCalendarConfig();
      expect(config.calendars.some(c => c.value === 'seasons-stars:temp-calendar')).toBe(false);
    });
  });

  describe('Formatter Registration', () => {
    it('should register date formatter with dnd5e', async () => {
      const { DnD5eIntegration } = await import('../src/dnd5e-pack');

      const instance = DnD5eIntegration.initialize();

      const config = getDnD5eCalendarConfig();
      const dateFormatter = config.formatters.find(f => f.value === 'seasons-stars:date');

      expect(dateFormatter).toBeDefined();
      expect(dateFormatter?.label).toContain('Seasons');

      instance.destroy();
    });

    it('should register time formatter with dnd5e', async () => {
      const { DnD5eIntegration } = await import('../src/dnd5e-pack');

      const instance = DnD5eIntegration.initialize();

      const config = getDnD5eCalendarConfig();
      const timeFormatter = config.formatters.find(f => f.value === 'seasons-stars:time');

      expect(timeFormatter).toBeDefined();

      instance.destroy();
    });

    it('should provide working formatter functions', async () => {
      const { DnD5eIntegration } = await import('../src/dnd5e-pack');

      const instance = DnD5eIntegration.initialize();

      const config = getDnD5eCalendarConfig();
      const dateFormatter = config.formatters.find(f => f.value === 'seasons-stars:date');

      expect(dateFormatter).toBeDefined();
      expect(typeof dateFormatter?.formatter).toBe('function');

      // Call the formatter (should not throw)
      const formatterFn = dateFormatter?.formatter as (time: number) => string;
      expect(() => formatterFn(0)).not.toThrow();

      instance.destroy();
    });
  });

  describe('Seasons & Stars Hook Integration', () => {
    it('should respond to seasons-stars:dnd5e:systemDetected hook', async () => {
      // The module should register a handler for this hook
      const { DnD5eIntegration } = await import('../src/dnd5e-pack');

      // Trigger the system detected hook
      const mockCompatibilityManager = {
        registerDataProvider: vi.fn(),
      };

      (globalThis as any).Hooks.callAll(
        'seasons-stars:dnd5e:systemDetected',
        mockCompatibilityManager
      );

      // The integration should have initialized
      const instance = DnD5eIntegration.getInstance();
      expect(instance).not.toBeNull();

      instance?.destroy();
    });

    it('should handle seasons-stars:calendarChanged hook', async () => {
      const { DnD5eIntegration } = await import('../src/dnd5e-pack');

      const instance = DnD5eIntegration.initialize();

      const hookData = {
        calendarId: 'new-calendar',
        calendar: {
          id: 'new-calendar',
          translations: { en: { label: 'New Calendar' } },
          months: [{ name: 'Month1', days: 30 }],
          weekdays: [{ name: 'Day1' }],
        },
      };

      // Should not throw
      expect(() => {
        (globalThis as any).Hooks.callAll('seasons-stars:calendarChanged', hookData);
      }).not.toThrow();

      // Calendar should be registered
      const config = getDnD5eCalendarConfig();
      expect(config.calendars.some(c => c.value === 'seasons-stars:new-calendar')).toBe(true);

      instance.destroy();
    });

    it('should handle seasons-stars:dateChanged hook', async () => {
      const { DnD5eIntegration } = await import('../src/dnd5e-pack');

      const instance = DnD5eIntegration.initialize();

      const hookData = {
        date: {
          year: 2024,
          month: 6,
          day: 15,
          weekday: 3,
          time: { hour: 14, minute: 30, second: 0 },
        },
        worldTime: 1000000,
      };

      // Should not throw
      expect(() => {
        (globalThis as any).Hooks.callAll('seasons-stars:dateChanged', hookData);
      }).not.toThrow();

      instance.destroy();
    });

    it('should handle seasons-stars:ready hook', async () => {
      const { DnD5eIntegration } = await import('../src/dnd5e-pack');

      const instance = DnD5eIntegration.initialize();

      const hookData = {
        manager: {},
        api: {},
      };

      // Should not throw
      expect(() => {
        (globalThis as any).Hooks.callAll('seasons-stars:ready', hookData);
      }).not.toThrow();

      instance.destroy();
    });
  });

  describe('Disabling System Calendar', () => {
    it('should allow disabling dnd5e calendar system', async () => {
      const { DnD5eIntegration } = await import('../src/dnd5e-pack');

      const instance = DnD5eIntegration.initialize();

      // Disable the system calendar
      instance.disableSystemCalendar();

      const config = getDnD5eCalendarConfig();
      expect(config.application).toBeNull();
      expect(config.calendars).toHaveLength(0);

      instance.destroy();
    });
  });

  describe('Calendar Data Synchronization', () => {
    it('should get current date from Seasons & Stars', async () => {
      const { DnD5eIntegration } = await import('../src/dnd5e-pack');

      const instance = DnD5eIntegration.initialize();

      // Mock the seasons-stars API
      (globalThis as any).game.seasonsStars = {
        api: {
          getCurrentDate: vi.fn().mockReturnValue({
            year: 2024,
            month: 6,
            day: 15,
            weekday: 3,
            time: { hour: 14, minute: 30, second: 0 },
          }),
        },
      };

      const date = instance.getCurrentDate();

      expect(date).toBeDefined();
      expect(date?.year).toBe(2024);
      expect(date?.month).toBe(6);
      expect(date?.day).toBe(15);

      instance.destroy();
    });

    it('should get active calendar from Seasons & Stars', async () => {
      const { DnD5eIntegration } = await import('../src/dnd5e-pack');

      const instance = DnD5eIntegration.initialize();

      // Mock the seasons-stars manager
      (globalThis as any).game.seasonsStars = {
        manager: {
          getActiveCalendar: vi.fn().mockReturnValue({
            id: 'gregorian',
            translations: { en: { label: 'Gregorian' } },
          }),
        },
      };

      const calendar = instance.getActiveCalendar();

      expect(calendar).toBeDefined();
      expect(calendar?.id).toBe('gregorian');

      instance.destroy();
    });
  });
});

describe('D&D 5e Sunrise/Sunset Integration', () => {
  beforeEach(() => {
    setupFoundryEnvironment();
    setupDnD5eEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetDnD5eEnvironment();
  });

  it('should provide calendar-specific sunrise times', async () => {
    const { DnD5eIntegration } = await import('../src/dnd5e-pack');

    const instance = DnD5eIntegration.initialize();

    // Create calendar with specific sunrise
    const mockCalendar = {
      id: 'early-sunrise-calendar',
      translations: { en: { label: 'Early Sunrise Calendar' } },
      months: [{ name: 'Month1', days: 30 }],
      weekdays: [{ name: 'Day1' }],
      time: {
        sunrise: { hour: 5, minute: 30 },
        sunset: { hour: 19, minute: 45 },
      },
    };

    instance.registerCalendar(mockCalendar as any);

    // Get the registered calendar class
    const config = getDnD5eCalendarConfig();
    const registeredCalendar = config.calendars.find(
      c => c.value === 'seasons-stars:early-sunrise-calendar'
    );

    expect(registeredCalendar?.class).toBeDefined();

    const CalendarClass = registeredCalendar!.class!;
    const calendarInstance = new CalendarClass(registeredCalendar!.config) as MockCalendarData5e;

    // Check sunrise: 5:30 AM = 5 * 3600 + 30 * 60 = 19800 seconds
    expect(calendarInstance.sunrise(0)).toBe(19800);

    // Check sunset: 7:45 PM = 19 * 3600 + 45 * 60 = 71100 seconds
    expect(calendarInstance.sunset(0)).toBe(71100);

    instance.destroy();
  });

  it('should use default sunrise/sunset when calendar has no time config', async () => {
    const { DnD5eIntegration } = await import('../src/dnd5e-pack');

    const instance = DnD5eIntegration.initialize();

    // Create calendar without time config
    const mockCalendar = {
      id: 'no-time-calendar',
      translations: { en: { label: 'No Time Calendar' } },
      months: [{ name: 'Month1', days: 30 }],
      weekdays: [{ name: 'Day1' }],
    };

    instance.registerCalendar(mockCalendar as any);

    const config = getDnD5eCalendarConfig();
    const registeredCalendar = config.calendars.find(
      c => c.value === 'seasons-stars:no-time-calendar'
    );

    const CalendarClass = registeredCalendar!.class!;
    const calendarInstance = new CalendarClass(registeredCalendar!.config) as MockCalendarData5e;

    // Default sunrise: 6:00 AM = 21600 seconds
    expect(calendarInstance.sunrise(0)).toBe(21600);

    // Default sunset: 6:00 PM = 64800 seconds
    expect(calendarInstance.sunset(0)).toBe(64800);

    instance.destroy();
  });
});

describe('D&D 5e Error Handling', () => {
  beforeEach(() => {
    setupFoundryEnvironment();
    setupDnD5eEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetDnD5eEnvironment();
  });

  it('should handle missing seasons-stars API gracefully', async () => {
    const { DnD5eIntegration } = await import('../src/dnd5e-pack');

    const instance = DnD5eIntegration.initialize();

    // No game.seasonsStars set up
    (globalThis as any).game.seasonsStars = undefined;

    // Should not throw
    expect(() => instance.getCurrentDate()).not.toThrow();
    expect(instance.getCurrentDate()).toBeNull();

    expect(() => instance.getActiveCalendar()).not.toThrow();
    expect(instance.getActiveCalendar()).toBeNull();

    instance.destroy();
  });

  it('should handle missing dnd5e config gracefully', async () => {
    // Remove dnd5e config
    (globalThis as any).CONFIG.DND5E = undefined;

    const { DnD5eIntegration } = await import('../src/dnd5e-pack');

    const instance = DnD5eIntegration.initialize();

    // Should not throw when registering calendar
    const mockCalendar = {
      id: 'test',
      translations: { en: { label: 'Test' } },
      months: [],
      weekdays: [],
    };

    expect(() => instance.registerCalendar(mockCalendar as any)).not.toThrow();

    instance.destroy();
  });

  it('should handle calendar registration errors', async () => {
    const { DnD5eIntegration } = await import('../src/dnd5e-pack');

    const instance = DnD5eIntegration.initialize();

    // Try to register invalid calendar
    expect(() => instance.registerCalendar(null as any)).not.toThrow();
    expect(() => instance.registerCalendar(undefined as any)).not.toThrow();

    instance.destroy();
  });
});
