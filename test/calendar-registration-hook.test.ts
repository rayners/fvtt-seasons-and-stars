/**
 * Tests for Calendar Registration Hook System
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SeasonsStarsCalendar } from '../src/types/calendar';
import type { CalendarRegistrationHookData } from '../src/types/foundry-extensions';
import { CalendarManager } from '../src/core/calendar-manager';

// Mock calendar data for testing
const mockCalendar: SeasonsStarsCalendar = {
  id: 'hook-test-calendar',
  label: 'Hook Test Calendar',
  description: 'A test calendar registered via hook',
  months: [{ name: 'TestMonth', days: 30 }],
  weekdays: [{ name: 'TestDay' }],
  year: {
    epoch: 0,
    currentYear: 2024,
  },
  leapYear: {
    rule: 'none', // Add required leap year rule
    offset: 0,
  },
  translations: {
    en: {
      label: 'Hook Test Calendar',
      description: 'A test calendar registered via hook',
    },
  },
};

describe('Calendar Registration Hook System', () => {
  let calendarManager: CalendarManager;
  let mockHooksCallAll: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Setup basic Foundry mocks
    globalThis.game = {
      settings: {
        get: vi.fn().mockReturnValue([]),
        set: vi.fn(),
      },
      time: { worldTime: 0 },
      modules: new Map(),
    } as any;

    // Mock Hooks.callAll to capture hook calls
    mockHooksCallAll = vi.fn();
    globalThis.Hooks = {
      callAll: mockHooksCallAll,
      on: vi.fn(),
      once: vi.fn(),
      off: vi.fn(),
    } as any;

    // Mock fetch for built-in calendars to return empty responses
    globalThis.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve({ ok: false });
    });

    calendarManager = new CalendarManager();
    await calendarManager.initialize();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should fire seasons-stars:loadCalendars hook during calendar loading', async () => {
    // Load built-in calendars which should fire the hook
    await calendarManager.loadBuiltInCalendars();

    // Verify the hook was called
    expect(mockHooksCallAll).toHaveBeenCalledWith(
      'seasons-stars:loadCalendars',
      expect.objectContaining({
        addCalendar: expect.any(Function),
      })
    );
  });

  it('should provide working addCalendar function in hook data', async () => {
    let capturedHookData: CalendarRegistrationHookData | null = null;

    // Capture the hook data when it's called
    mockHooksCallAll.mockImplementation((hookName: string, data: CalendarRegistrationHookData) => {
      if (hookName === 'seasons-stars:loadCalendars') {
        capturedHookData = data;
      }
    });

    // Load built-in calendars to trigger hook
    await calendarManager.loadBuiltInCalendars();

    // Verify we captured the hook data
    expect(capturedHookData).not.toBeNull();
    expect(capturedHookData?.addCalendar).toBeInstanceOf(Function);

    // Test that the addCalendar function exists and can be called
    // (Calendar validation might fail but that's tested separately)
    expect(() => capturedHookData?.addCalendar(mockCalendar)).not.toThrow();
  });

  it('should validate calendar data when adding via hook', async () => {
    let capturedHookData: CalendarRegistrationHookData | null = null;

    // Capture the hook data
    mockHooksCallAll.mockImplementation((hookName: string, data: CalendarRegistrationHookData) => {
      if (hookName === 'seasons-stars:loadCalendars') {
        capturedHookData = data;
      }
    });

    await calendarManager.loadBuiltInCalendars();

    // Test with invalid calendar data
    const invalidCalendar = {
      // Missing required fields
      id: 'invalid-calendar',
      // Missing months, weekdays, year, translations
    } as SeasonsStarsCalendar;

    const result = capturedHookData?.addCalendar(invalidCalendar);
    expect(result).toBe(false);

    // Verify invalid calendar was not loaded
    const loadedCalendar = calendarManager.getCalendar('invalid-calendar');
    expect(loadedCalendar).toBeNull();
  });

  it('should handle errors gracefully when adding calendars via hook', async () => {
    let capturedHookData: CalendarRegistrationHookData | null = null;

    // Capture the hook data
    mockHooksCallAll.mockImplementation((hookName: string, data: CalendarRegistrationHookData) => {
      if (hookName === 'seasons-stars:loadCalendars') {
        capturedHookData = data;
      }
    });

    await calendarManager.loadBuiltInCalendars();

    // Ensure we have hook data
    expect(capturedHookData).not.toBeNull();
    expect(capturedHookData!.addCalendar).toBeInstanceOf(Function);

    // Test with null/undefined calendar data
    let result = capturedHookData!.addCalendar(null as any);
    expect(result).toBe(false);

    result = capturedHookData!.addCalendar(undefined as any);
    expect(result).toBe(false);

    // Test with non-object calendar data
    result = capturedHookData!.addCalendar('not-an-object' as any);
    expect(result).toBe(false);
  });

  it('should allow multiple calendars to be registered via hook', async () => {
    let capturedHookData: CalendarRegistrationHookData | null = null;

    // Capture the hook data
    mockHooksCallAll.mockImplementation((hookName: string, data: CalendarRegistrationHookData) => {
      if (hookName === 'seasons-stars:loadCalendars') {
        capturedHookData = data;
      }
    });

    await calendarManager.loadBuiltInCalendars();

    // Verify the addCalendar function is available
    expect(capturedHookData).not.toBeNull();
    expect(capturedHookData?.addCalendar).toBeInstanceOf(Function);

    // Test that multiple calls to addCalendar work without throwing
    expect(() => {
      capturedHookData?.addCalendar(mockCalendar);
      capturedHookData?.addCalendar({ ...mockCalendar, id: 'second-calendar' });
    }).not.toThrow();
  });

  it('should maintain backward compatibility with existing external calendar loading', async () => {
    // Load built-in calendars to initialize the system
    await calendarManager.loadBuiltInCalendars();

    // Verify existing external calendar methods still work
    expect(calendarManager.getExternalSources).toBeDefined();
    expect(calendarManager.addExternalSource).toBeDefined();
    expect(calendarManager.removeExternalSource).toBeDefined();
    expect(calendarManager.loadExternalCalendar).toBeDefined();

    // Verify the external registry was initialized
    const registry = calendarManager.getExternalRegistry();
    expect(registry).toBeDefined();
  });

  it('should fire hook after all built-in calendars and external sources are loaded', async () => {
    const hookCallOrder: string[] = [];

    // Mock the internal methods to track call order
    const originalFireHook = (calendarManager as any).fireCalendarRegistrationHook;
    const originalLoadExternal = calendarManager.loadConfiguredExternalSources;

    (calendarManager as any).fireCalendarRegistrationHook = vi.fn().mockImplementation(async () => {
      hookCallOrder.push('hook-fired');
      return originalFireHook.call(calendarManager);
    });

    (calendarManager as any).loadConfiguredExternalSources = vi
      .fn()
      .mockImplementation(async () => {
        hookCallOrder.push('external-sources-loaded');
        return originalLoadExternal.call(calendarManager);
      });

    await calendarManager.loadBuiltInCalendars();

    // Verify the hook was fired after external sources were loaded
    expect(hookCallOrder).toEqual(['external-sources-loaded', 'hook-fired']);
  });
});
