/**
 * Test setup for Seasons & Stars
 */

/* eslint-disable @typescript-eslint/triple-slash-reference */

/// <reference path="test-types.d.ts" />

import { vi, beforeEach, afterEach } from 'vitest';

// Preserve the original console for restoration between tests
const originalConsole = globalThis.console;
let logSpy: ReturnType<typeof vi.spyOn>;
let infoSpy: ReturnType<typeof vi.spyOn>;
let debugSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

// Silence console output during tests to keep logs clean
beforeEach(() => {
  globalThis.console = originalConsole;
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  logSpy.mockRestore();
  infoSpy.mockRestore();
  debugSpy.mockRestore();
  warnSpy.mockRestore();
  errorSpy.mockRestore();
});
import { DateFormatter } from '../src/core/date-formatter';

// Mock Foundry globals
(globalThis as any).game = {
  settings: undefined,
  time: undefined,
  user: undefined,
  i18n: {
    lang: 'en',
  },
} as any;

(globalThis as any).ui = {
  notifications: undefined,
} as any;

// Mock Foundry application framework
(globalThis as any).foundry = {
  applications: {
    api: {
      ApplicationV2: class MockApplicationV2 {
        static DEFAULT_OPTIONS = {};
        static PARTS = {};
        constructor() {}
        render() {
          return Promise.resolve();
        }
        close() {
          return Promise.resolve();
        }
      },
      HandlebarsApplicationMixin: (base: any) =>
        class extends base {
          _prepareContext() {
            return {};
          }
          _onRender() {
            return Promise.resolve();
          }
        },
    },
  },
  utils: {
    debounce: vi.fn((callback: Function, _delay: number) => {
      // Mock debounce that just returns the original function for testing
      return callback;
    }),
  },
} as any;

// Mock ApplicationV2 directly for imports
(global as any).ApplicationV2 = (globalThis as any).foundry.applications.api.ApplicationV2;

// Basic Handlebars mock for tests that don't set up their own
// Individual test files can override this with more specific mocks
(global as any).Handlebars = {
  compile: vi.fn().mockReturnValue(vi.fn().mockReturnValue('mock-template-result')),
  registerHelper: vi.fn(),
};

/**
 * Set up basic Foundry environment for testing
 */
export function setupFoundryEnvironment(): void {
  // Ensure game object exists
  (globalThis as any).game = (globalThis as any).game || ({} as any);

  // Set up basic game properties
  (globalThis as any).game.settings = (globalThis as any).game.settings || {
    get: vi.fn(),
    set: vi.fn(),
    register: vi.fn(),
  };

  (globalThis as any).game.time = (globalThis as any).game.time || {
    worldTime: 0,
  };

  (globalThis as any).game.user = (globalThis as any).game.user || {
    isGM: true,
  };

  (globalThis as any).game.i18n = (globalThis as any).game.i18n || {
    lang: 'en',
    localize: vi.fn((key: string) => key),
    format: vi.fn((key: string, _data?: any) => key),
  };

  (globalThis as any).game.system = (globalThis as any).game.system || {
    id: 'pf2e',
  };

  // Set up UI
  (globalThis as any).ui =
    (globalThis as any).ui ||
    ({
      notifications: {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
      },
    } as any);

  // Set up Hooks
  (globalThis as any).Hooks =
    (globalThis as any).Hooks ||
    ({
      on: vi.fn(),
      callAll: vi.fn(),
    } as any);
}

// Enhanced Hook system mock that actually registers and executes callbacks
class MockHooks {
  private static hooks: Map<string, Function[]> = new Map();

  static once(event: string, callback: Function): number {
    const callbacks = this.hooks.get(event) || [];
    const wrappedCallback = (...args: any[]) => {
      const result = callback(...args);
      this.off(event, wrappedCallback);
      return result;
    };
    callbacks.push(wrappedCallback);
    this.hooks.set(event, callbacks);
    return callbacks.length;
  }

  static on(event: string, callback: Function): number {
    const callbacks = this.hooks.get(event) || [];
    callbacks.push(callback);
    this.hooks.set(event, callbacks);
    return callbacks.length;
  }

  static off(event: string, callback?: Function): void {
    if (!callback) {
      this.hooks.delete(event);
      return;
    }
    const callbacks = this.hooks.get(event) || [];
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  static callAll(event: string, ...args: any[]): boolean {
    const callbacks = this.hooks.get(event) || [];
    let result = true;
    for (const callback of callbacks) {
      try {
        const callbackResult = callback(...args);
        if (callbackResult === false) {
          result = false;
        }
      } catch {
        // Ignore hook callback errors to keep test output clean
      }
    }
    return result;
  }

  static clear(): void {
    this.hooks.clear();
  }
}

// Override the Hooks system from foundry-test-utils with our enhanced version
(globalThis as any).Hooks = MockHooks as any;

// Mock Logger for integration modules
class MockLogger {
  static debug(..._args: any[]): void {
    // Silent in tests
  }
  static info(..._args: any[]): void {
    // Silent in tests
  }
  static warn(..._args: any[]): void {
    // Silent in tests
  }
  static error(..._args: any[]): void {
    // Silent in tests
  }
}

// Make Logger available for imports
(global as any).__mockLogger = MockLogger;

// PF2e Environment Setup Utility
export function setupPF2eEnvironment(
  options: {
    worldCreationTimestamp?: number;
    currentWorldTime?: number;
    expectedWorldCreationYear?: number;
  } = {}
) {
  const {
    worldCreationTimestamp = 1609459200, // 2021-01-01 00:00:00 UTC
    currentWorldTime = 0,
    expectedWorldCreationYear = 2025,
  } = options;

  // Mock PF2e-specific game object extensions
  if (!(globalThis as any).game) {
    (globalThis as any).game = {} as any;
  }

  // Add PF2e world clock settings
  (globalThis as any).game.pf2e = {
    settings: {
      worldClock: {
        worldCreatedOn: worldCreationTimestamp,
      },
    },
  };

  // Set current world time
  if (!(globalThis as any).game.time) {
    (globalThis as any).game.time = {};
  }
  (globalThis as any).game.time.worldTime = currentWorldTime;

  // Set system ID
  if (!(globalThis as any).game.system) {
    (globalThis as any).game.system = {};
  }
  (globalThis as any).game.system.id = 'pf2e';

  return {
    worldCreationTimestamp,
    currentWorldTime,
    expectedWorldCreationYear,
    verifyPF2eYear: (actualYear: number) => {
      const expectedYear =
        expectedWorldCreationYear + Math.floor(currentWorldTime / (365 * 24 * 60 * 60));
      return actualYear === expectedYear;
    },
  };
}

// Reset DateFormatter helper registration before each test
beforeEach(() => {
  DateFormatter.resetHelpersForTesting();
});
