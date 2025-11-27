/**
 * D&D 5e Environment Setup for Testing
 *
 * This utility sets up an environment for D&D 5e integration testing.
 * Mocks the dnd5e system calendar API for authentic testing.
 */

/* eslint-disable @typescript-eslint/triple-slash-reference */

/// <reference path="../../core/test/test-types.d.ts" />

/**
 * Configuration for D&D 5e test environment
 */
export interface DnD5eEnvironmentConfig {
  /** Current world time in seconds */
  currentWorldTime?: number;
  /** Whether the calendar system should be enabled */
  calendarEnabled?: boolean;
  /** Initial calendars to register */
  initialCalendars?: DnD5eCalendarConfig[];
  /** Initial formatters to register */
  initialFormatters?: DnD5eFormatterConfig[];
}

/**
 * D&D 5e calendar configuration structure
 * Based on CONFIG.DND5E.calendar.calendars entries
 */
export interface DnD5eCalendarConfig {
  /** Unique calendar identifier */
  value: string;
  /** Display name (supports localization keys) */
  label: string;
  /** Default CalendarData5e options */
  config: Record<string, unknown>;
  /** Optional custom CalendarData5e class */
  class?: new (...args: unknown[]) => unknown;
}

/**
 * D&D 5e formatter configuration structure
 * Based on CONFIG.DND5E.calendar.formatters entries
 */
export interface DnD5eFormatterConfig {
  /** Unique formatter identifier */
  value: string;
  /** Display name (supports localization keys) */
  label: string;
  /** Format method or calendar method reference */
  formatter: ((time: number) => string) | string;
  /** Optional section grouping */
  group?: string;
}

/**
 * Mock CalendarData5e class for testing
 */
export class MockCalendarData5e {
  config: Record<string, unknown>;

  constructor(config: Record<string, unknown> = {}) {
    this.config = config;
  }

  /**
   * Get sunrise time for a given timestamp
   * @param time - World time in seconds or TimeComponents object
   * @returns Sunrise time in seconds since midnight
   */
  sunrise(_time: number | { hour: number; minute: number; second: number }): number {
    // Default sunrise at 6:00 AM (6 * 3600 = 21600 seconds)
    return 21600;
  }

  /**
   * Get sunset time for a given timestamp
   * @param time - World time in seconds or TimeComponents object
   * @returns Sunset time in seconds since midnight
   */
  sunset(_time: number | { hour: number; minute: number; second: number }): number {
    // Default sunset at 6:00 PM (18 * 3600 = 64800 seconds)
    return 64800;
  }
}

/**
 * Mock BaseCalendarHUD class for testing
 */
export class MockBaseCalendarHUD {
  onUpdateSettings(_changed: Record<string, unknown>): void {
    // Base implementation does nothing
  }
}

/**
 * Mock CalendarHUD class for testing
 */
export class MockCalendarHUD extends MockBaseCalendarHUD {
  render(_force?: boolean): void {
    // Mock render
  }
}

/**
 * Captured hook callbacks for testing
 */
export interface CapturedHooks {
  setupCalendar: Array<() => boolean | void>;
  updateWorldTime: Array<
    (
      worldTime: number,
      options: {
        dnd5e?: {
          deltas?: { midnights: number; middays: number; sunrises: number; sunsets: number };
        };
      }
    ) => void
  >;
}

/**
 * Set up a comprehensive D&D 5e environment for testing
 * Note: This function expects Hooks to already be set up by setupFoundryEnvironment()
 */
export function setupDnD5eEnvironment(config: DnD5eEnvironmentConfig = {}): CapturedHooks {
  const {
    currentWorldTime = 0,
    calendarEnabled = true,
    initialCalendars = [],
    initialFormatters = [],
  } = config;

  // Captured hook callbacks for assertions - these are populated by test code manually
  // Note: We don't intercept the global Hooks from core setup
  const capturedHooks: CapturedHooks = {
    setupCalendar: [],
    updateWorldTime: [],
  };

  // Set up dnd5e system ID
  (globalThis as any).game = (globalThis as any).game || {};
  (globalThis as any).game.system = { id: 'dnd5e' };

  // Set up Foundry world time
  (globalThis as any).game.time = {
    worldTime: currentWorldTime,
  };

  // Set up CONFIG.DND5E.calendar structure
  (globalThis as any).CONFIG = (globalThis as any).CONFIG || {};
  (globalThis as any).CONFIG.DND5E = (globalThis as any).CONFIG.DND5E || {};
  (globalThis as any).CONFIG.DND5E.calendar = {
    application: calendarEnabled ? MockCalendarHUD : null,
    calendars: [...initialCalendars],
    formatters: [...initialFormatters],
  };

  // Set up dnd5e namespace for data models and applications
  (globalThis as any).dnd5e = {
    dataModels: {
      calendar: {
        CalendarData5e: MockCalendarData5e,
      },
    },
    applications: {
      calendar: {
        BaseCalendarHUD: MockBaseCalendarHUD,
        CalendarHUD: MockCalendarHUD,
      },
    },
  };

  return capturedHooks;
}

/**
 * Add a calendar to the D&D 5e calendar configuration
 */
export function addDnD5eCalendar(calendar: DnD5eCalendarConfig): void {
  if (!(globalThis as any).CONFIG?.DND5E?.calendar?.calendars) {
    throw new Error('D&D 5e environment not set up. Call setupDnD5eEnvironment first.');
  }
  (globalThis as any).CONFIG.DND5E.calendar.calendars.push(calendar);
}

/**
 * Add a formatter to the D&D 5e calendar configuration
 */
export function addDnD5eFormatter(formatter: DnD5eFormatterConfig): void {
  if (!(globalThis as any).CONFIG?.DND5E?.calendar?.formatters) {
    throw new Error('D&D 5e environment not set up. Call setupDnD5eEnvironment first.');
  }
  (globalThis as any).CONFIG.DND5E.calendar.formatters.push(formatter);
}

/**
 * Clear all D&D 5e calendars
 */
export function clearDnD5eCalendars(): void {
  if ((globalThis as any).CONFIG?.DND5E?.calendar?.calendars) {
    (globalThis as any).CONFIG.DND5E.calendar.calendars = [];
  }
}

/**
 * Clear all D&D 5e formatters
 */
export function clearDnD5eFormatters(): void {
  if ((globalThis as any).CONFIG?.DND5E?.calendar?.formatters) {
    (globalThis as any).CONFIG.DND5E.calendar.formatters = [];
  }
}

/**
 * Simulate the dnd5e.setupCalendar hook being called
 * Uses the global Hooks from core test setup (MockHooks class which uses static methods)
 */
export function triggerSetupCalendarHook(): boolean {
  // MockHooks uses callAll which returns boolean based on callback returns
  const result = (globalThis as any).Hooks?.callAll('dnd5e.setupCalendar');
  return result !== false;
}

/**
 * Simulate the updateWorldTime hook with dnd5e deltas
 */
export function triggerUpdateWorldTimeHook(
  worldTime: number,
  deltas: { midnights?: number; middays?: number; sunrises?: number; sunsets?: number } = {}
): void {
  const options = {
    dnd5e: {
      deltas: {
        midnights: deltas.midnights ?? 0,
        middays: deltas.middays ?? 0,
        sunrises: deltas.sunrises ?? 0,
        sunsets: deltas.sunsets ?? 0,
      },
    },
  };
  (globalThis as any).Hooks?.callAll('updateWorldTime', worldTime, options);
}

/**
 * Validate that D&D 5e environment is properly set up
 */
export function validateDnD5eEnvironment(): boolean {
  try {
    // Check required game objects
    if (!(globalThis as any).game?.system?.id || (globalThis as any).game.system.id !== 'dnd5e') {
      throw new Error('D&D 5e system ID not set');
    }

    if (!(globalThis as any).CONFIG?.DND5E?.calendar) {
      throw new Error('D&D 5e calendar config not set');
    }

    if ((globalThis as any).game?.time?.worldTime === undefined) {
      throw new Error('Foundry world time not set');
    }

    if (!(globalThis as any).dnd5e?.dataModels?.calendar?.CalendarData5e) {
      throw new Error('D&D 5e CalendarData5e class not set');
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get the current D&D 5e calendar configuration
 */
export function getDnD5eCalendarConfig(): {
  application: typeof MockCalendarHUD | null;
  calendars: DnD5eCalendarConfig[];
  formatters: DnD5eFormatterConfig[];
} {
  return (
    (globalThis as any).CONFIG?.DND5E?.calendar ?? {
      application: null,
      calendars: [],
      formatters: [],
    }
  );
}

/**
 * Reset the D&D 5e environment to initial state
 */
export function resetDnD5eEnvironment(): void {
  if ((globalThis as any).CONFIG?.DND5E?.calendar) {
    (globalThis as any).CONFIG.DND5E.calendar = {
      application: MockCalendarHUD,
      calendars: [],
      formatters: [],
    };
  }
  if ((globalThis as any).game?.time) {
    (globalThis as any).game.time.worldTime = 0;
  }
}
