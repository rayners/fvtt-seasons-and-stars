/**
 * Test CalendarManager.loadModuleCalendars with module flags support
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarManager } from '../src/core/calendar-manager';

// Mock global Foundry objects
global.game = {
  settings: {
    get: vi.fn(),
    set: vi.fn(),
  },
  modules: {
    get: vi.fn(),
  },
} as any;

global.Hooks = {
  callAll: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
} as any;

global.ui = {
  notifications: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
} as any;

describe('CalendarManager.loadModuleCalendars with flags', () => {
  let manager: CalendarManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new CalendarManager();
  });

  it('should skip loading when module has providesCalendars flag set to false', async () => {
    // Mock module with flags.seasons-and-stars.providesCalendars = false
    const mockModule = {
      id: 'test-module',
      title: 'Test Module',
      active: true,
      flags: {
        'seasons-and-stars': {
          providesCalendars: false,
        },
      },
    };

    (global.game.modules.get as any).mockReturnValue(mockModule);

    // Spy on loadCalendarCollection to ensure it's not called
    const loadSpy = vi.spyOn(manager, 'loadCalendarCollection');

    const results = await manager.loadModuleCalendars('test-module');

    expect(results).toEqual([]);
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('should attempt loading when module has providesCalendars flag set to true', async () => {
    // Mock module with flags.seasons-and-stars.providesCalendars = true
    const mockModule = {
      id: 'test-module',
      title: 'Test Module',
      active: true,
      flags: {
        'seasons-and-stars': {
          providesCalendars: true,
        },
      },
    };

    (global.game.modules.get as any).mockReturnValue(mockModule);

    // Mock loadCalendarCollection to return success
    const loadSpy = vi.spyOn(manager, 'loadCalendarCollection').mockResolvedValue([
      {
        success: true,
        calendar: {
          id: 'test-calendar',
          translations: { en: { label: 'Test Calendar' } },
          year: { epoch: 0, currentYear: 2024, prefix: '', suffix: '', startDay: 1 },
          leapYear: { rule: 'none' },
          months: [{ name: 'January', days: 31 }],
          weekdays: [{ name: 'Monday' }],
          intercalary: [],
          time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
        },
      },
    ]);

    await manager.loadModuleCalendars('test-module');

    expect(loadSpy).toHaveBeenCalledWith('module:test-module', { validate: true });
  });

  it('should attempt loading when module has no flags property', async () => {
    // Mock module without flags property
    const mockModule = {
      id: 'test-module',
      title: 'Test Module',
      active: true,
    };

    (global.game.modules.get as any).mockReturnValue(mockModule);

    // Mock loadCalendarCollection
    const loadSpy = vi.spyOn(manager, 'loadCalendarCollection').mockResolvedValue([]);

    await manager.loadModuleCalendars('test-module');

    expect(loadSpy).toHaveBeenCalledWith('module:test-module', { validate: true });
  });

  it('should attempt loading when module has flags but no seasons-and-stars section', async () => {
    // Mock module with flags but no seasons-and-stars key
    const mockModule = {
      id: 'test-module',
      title: 'Test Module',
      active: true,
      flags: {
        'other-module': {
          someFlag: true,
        },
      },
    };

    (global.game.modules.get as any).mockReturnValue(mockModule);

    // Mock loadCalendarCollection
    const loadSpy = vi.spyOn(manager, 'loadCalendarCollection').mockResolvedValue([]);

    await manager.loadModuleCalendars('test-module');

    expect(loadSpy).toHaveBeenCalledWith('module:test-module', { validate: true });
  });

  it('should attempt loading when providesCalendars is undefined', async () => {
    // Mock module with seasons-and-stars flags but providesCalendars undefined
    const mockModule = {
      id: 'test-module',
      title: 'Test Module',
      active: true,
      flags: {
        'seasons-and-stars': {
          otherFlag: 'value',
        },
      },
    };

    (global.game.modules.get as any).mockReturnValue(mockModule);

    // Mock loadCalendarCollection
    const loadSpy = vi.spyOn(manager, 'loadCalendarCollection').mockResolvedValue([]);

    await manager.loadModuleCalendars('test-module');

    expect(loadSpy).toHaveBeenCalledWith('module:test-module', { validate: true });
  });

  it('should return empty array when module is not found', async () => {
    (global.game.modules.get as any).mockReturnValue(undefined);

    const results = await manager.loadModuleCalendars('nonexistent-module');

    expect(results).toEqual([]);
  });

  it('should return empty array when module is not active', async () => {
    const mockModule = {
      id: 'test-module',
      title: 'Test Module',
      active: false,
    };

    (global.game.modules.get as any).mockReturnValue(mockModule);

    const results = await manager.loadModuleCalendars('test-module');

    expect(results).toEqual([]);
  });

  it('should only skip loading when providesCalendars is exactly false', async () => {
    // Test various falsy values that should NOT skip loading
    const falsyValues = [0, '', null, undefined];

    for (const value of falsyValues) {
      const mockModule = {
        id: 'test-module',
        title: 'Test Module',
        active: true,
        flags: {
          'seasons-and-stars': {
            providesCalendars: value,
          },
        },
      };

      (global.game.modules.get as any).mockReturnValue(mockModule);
      const loadSpy = vi.spyOn(manager, 'loadCalendarCollection').mockResolvedValue([]);

      await manager.loadModuleCalendars('test-module');

      expect(loadSpy).toHaveBeenCalled();
      loadSpy.mockClear();
    }
  });
});
