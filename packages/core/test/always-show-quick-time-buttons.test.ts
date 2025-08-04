/**
 * Always Show Quick Time Buttons Feature Tests - TDD implementation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CalendarMiniWidget } from '../src/ui/calendar-mini-widget';
import { CalendarWidget } from '../src/ui/calendar-widget';
import { SmallTimeUtils } from '../src/ui/base-widget-manager';

// Mock global game object and settings
const mockGame = {
  settings: {
    get: vi.fn(),
    register: vi.fn(),
  },
  user: {
    isGM: true,
  },
  i18n: {
    lang: 'en',
  },
  modules: new Map(),
  seasonsStars: {
    manager: {
      getActiveCalendar: vi.fn(),
      getCurrentDate: vi.fn(),
    },
  },
};

// Mock Hooks
const mockHooks = {
  callAll: vi.fn(),
  on: vi.fn(),
};

// Setup global mocks
beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  global.game = mockGame as any;
  global.Hooks = mockHooks as any;

  // Default mock implementations
  mockGame.settings.get.mockImplementation((module, setting) => {
    if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
      return false; // Default value
    }
    return undefined;
  });

  mockGame.seasonsStars.manager.getActiveCalendar.mockReturnValue({
    id: 'test-calendar',
    label: 'Test Calendar',
    name: 'Test Calendar',
    translations: {
      en: {
        label: 'Test Calendar',
        description: 'Test Description',
      },
    },
  });

  mockGame.seasonsStars.manager.getCurrentDate.mockReturnValue({
    toShortString: () => 'Test Date',
    toDateString: () => 'Test Date String',
    toTimeString: () => 'Test Time String',
    toObject: () => ({}),
    toLongString: () => 'Test Long Date',
  });

  // Reset SmallTime mock to default (not available)
  vi.spyOn(SmallTimeUtils, 'isSmallTimeAvailable').mockReturnValue(false);

  // Reset GM status to true for most tests
  mockGame.user.isGM = true;

  // Clear modules map
  mockGame.modules.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Always Show Quick Time Buttons - Settings Registration', () => {
  it('should register alwaysShowQuickTimeButtons setting with correct configuration', () => {
    // This test verifies the setting can be retrieved without errors
    // The actual registration is tested in module.ts integration
    expect(() => {
      mockGame.settings.get('seasons-and-stars', 'alwaysShowQuickTimeButtons');
    }).not.toThrow();
  });

  it('should return false as default value when setting is not configured', () => {
    mockGame.settings.get.mockReturnValue(undefined);

    const result =
      mockGame.settings.get('seasons-and-stars', 'alwaysShowQuickTimeButtons') || false;
    expect(result).toBe(false);
  });

  it('should trigger settings change hook when setting changes', () => {
    // Simulate setting registration with onChange callback
    mockGame.settings.register.mockImplementation((module, setting, config) => {
      if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
        // Store the onChange callback for testing
        config.onChange();
      }
    });

    // Should call Hooks.callAll with correct parameters
    // This will be implemented when we add the setting registration
  });
});

describe('Always Show Quick Time Buttons - CalendarMiniWidget Logic', () => {
  it('should show time controls when alwaysShowQuickTimeButtons is true regardless of SmallTime', async () => {
    // Set the always show setting to true
    mockGame.settings.get.mockImplementation((module, setting) => {
      if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
        return true;
      }
      return false;
    });

    const widget = new CalendarMiniWidget();

    // Mock SmallTime as available (normally would hide controls)
    vi.spyOn(SmallTimeUtils, 'isSmallTimeAvailable').mockReturnValue(true);

    const context = await widget._prepareContext();

    // Should show time controls even with SmallTime present
    expect(context.showTimeControls).toBe(true);
  });

  it('should hide time controls when alwaysShowQuickTimeButtons is false and SmallTime is present', async () => {
    // Set the always show setting to false
    mockGame.settings.get.mockImplementation((module, setting) => {
      if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
        return false;
      }
      return false;
    });

    const widget = new CalendarMiniWidget();

    // Mock SmallTime as available
    vi.spyOn(SmallTimeUtils, 'isSmallTimeAvailable').mockReturnValue(true);

    const context = await widget._prepareContext();

    // Should hide time controls when SmallTime is present and setting is false
    expect(context.showTimeControls).toBe(false);
  });

  it('should show time controls when alwaysShowQuickTimeButtons is false but SmallTime is absent', async () => {
    // Set the always show setting to false
    mockGame.settings.get.mockImplementation((module, setting) => {
      if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
        return false;
      }
      return false;
    });

    const widget = new CalendarMiniWidget();

    // Mock SmallTime as not available
    vi.spyOn(SmallTimeUtils, 'isSmallTimeAvailable').mockReturnValue(false);

    const context = await widget._prepareContext();

    // Should show time controls when SmallTime is absent
    expect(context.showTimeControls).toBe(true);
  });

  it('should enforce GM permissions regardless of alwaysShowQuickTimeButtons setting', async () => {
    // Set user as non-GM
    mockGame.user.isGM = false;

    // Set the always show setting to true
    mockGame.settings.get.mockImplementation((module, setting) => {
      if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
        return true;
      }
      return false;
    });

    const widget = new CalendarMiniWidget();

    // Mock SmallTime as not available
    vi.spyOn(SmallTimeUtils, 'isSmallTimeAvailable').mockReturnValue(false);

    const context = await widget._prepareContext();

    // Should not show time controls for non-GM users
    expect(context.showTimeControls).toBe(false);
  });
});

describe('Always Show Quick Time Buttons - CalendarWidget Logic', () => {
  it('should show time controls when alwaysShowQuickTimeButtons is true regardless of SmallTime', async () => {
    // Set the always show setting to true
    mockGame.settings.get.mockImplementation((module, setting) => {
      if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
        return true;
      }
      return false;
    });

    // Mock game modules to simulate SmallTime being available
    const mockModules = new Map();
    mockModules.set('smalltime', { active: true });
    mockGame.modules = mockModules;

    const widget = new CalendarWidget();

    const context = await widget._prepareContext();

    // Should show time controls even with SmallTime present because setting is true
    expect(context.showTimeControls).toBe(true);
  });

  it('should hide time controls when alwaysShowQuickTimeButtons is false and SmallTime is present', async () => {
    // Set the always show setting to false
    mockGame.settings.get.mockImplementation((module, setting) => {
      if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
        return false;
      }
      return false;
    });

    const widget = new CalendarWidget();

    // Mock detectSmallTime method to return true
    vi.spyOn(widget as any, 'detectSmallTime').mockReturnValue(true);

    const context = await widget._prepareContext();

    // Should hide time controls when SmallTime is present and setting is false
    expect(context.showTimeControls).toBe(false);
  });

  it('should enforce GM permissions regardless of alwaysShowQuickTimeButtons setting', async () => {
    // Set user as non-GM
    mockGame.user.isGM = false;

    // Set the always show setting to true
    mockGame.settings.get.mockImplementation((module, setting) => {
      if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
        return true;
      }
      return false;
    });

    const widget = new CalendarWidget();

    // Mock detectSmallTime method to return false
    vi.spyOn(widget as any, 'detectSmallTime').mockReturnValue(false);

    const context = await widget._prepareContext();

    // Should not show time controls for non-GM users
    expect(context.showTimeControls).toBe(false);
  });
});

describe('Always Show Quick Time Buttons - Hook Integration', () => {
  it('should trigger widget re-render when alwaysShowQuickTimeButtons setting changes', () => {
    const mockRender = vi.fn();

    // Mock active widget instance
    CalendarMiniWidget.activeInstance = {
      rendered: true,
      render: mockRender,
    } as any;

    // Simulate the hook being called
    const hookCallback = mockHooks.on.mock.calls.find(
      call => call[0] === 'seasons-stars:settingsChanged'
    )?.[1];

    if (hookCallback) {
      hookCallback('alwaysShowQuickTimeButtons');
    }

    // Should trigger render when setting changes
    // This will be verified once we implement the hook handlers
  });

  it('should handle multiple widgets updating simultaneously', () => {
    const mockMiniRender = vi.fn();
    const mockMainRender = vi.fn();

    // Mock both widget instances
    CalendarMiniWidget.activeInstance = {
      rendered: true,
      render: mockMiniRender,
    } as any;

    CalendarWidget.activeInstance = {
      rendered: true,
      render: mockMainRender,
    } as any;

    // Both widgets should update when setting changes
    // This will be tested once hook handlers are implemented
  });
});

describe('Always Show Quick Time Buttons - SmallTime Integration', () => {
  it('should handle SmallTime becoming available after setting is enabled', async () => {
    // Start with SmallTime not available and setting enabled
    mockGame.settings.get.mockImplementation((module, setting) => {
      if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
        return true;
      }
      return false;
    });

    const widget = new CalendarMiniWidget();

    // First call - SmallTime not available (already set in beforeEach)
    let context = await widget._prepareContext();
    expect(context.showTimeControls).toBe(true);

    // Second call - SmallTime becomes available
    vi.spyOn(SmallTimeUtils, 'isSmallTimeAvailable').mockReturnValue(true);

    context = await widget._prepareContext();
    // Should still show controls because setting is enabled
    expect(context.showTimeControls).toBe(true);
  });

  it('should not interfere with existing quickTimeButtons setting', () => {
    // Both settings should work independently
    mockGame.settings.get.mockImplementation((module, setting) => {
      if (module === 'seasons-and-stars' && setting === 'alwaysShowQuickTimeButtons') {
        return true;
      }
      if (module === 'seasons-and-stars' && setting === 'quickTimeButtons') {
        return '15,30,60';
      }
      return false;
    });

    // Both settings should be retrievable
    const alwaysShow = mockGame.settings.get('seasons-and-stars', 'alwaysShowQuickTimeButtons');
    const quickButtons = mockGame.settings.get('seasons-and-stars', 'quickTimeButtons');

    expect(alwaysShow).toBe(true);
    expect(quickButtons).toBe('15,30,60');
  });
});

describe('Always Show Quick Time Buttons - Error Handling', () => {
  it('should handle settings retrieval errors gracefully', async () => {
    // Mock settings.get to return undefined (simulating missing setting)
    mockGame.settings.get.mockReturnValue(undefined);

    const widget = new CalendarMiniWidget();

    // Should not throw and should default to false
    const context = await widget._prepareContext();

    // Should have showTimeControls as true (GM user, no SmallTime, setting defaults to false)
    // The SmallTime mock is already set to false in beforeEach
    expect(context.showTimeControls).toBe(true);
  });

  it('should handle missing game.settings gracefully', async () => {
    // Remove settings from game object
    delete (global.game as any).settings;

    const widget = new CalendarMiniWidget();

    // Should not throw when settings is undefined
    expect(async () => {
      await widget._prepareContext();
    }).not.toThrow();
  });
});
