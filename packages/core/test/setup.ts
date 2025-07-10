/**
 * Test setup for Seasons & Stars
 */

import { vi, beforeEach } from 'vitest';
import { DateFormatter } from '../src/core/date-formatter';

// Mock Foundry globals
(globalThis as any).game = {
  settings: undefined,
  time: undefined,
  user: undefined,
  i18n: {
    lang: 'en',
  },
};

(globalThis as any).ui = {
  notifications: undefined,
};

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
};

// Mock ApplicationV2 directly for imports
(globalThis as any).ApplicationV2 = (globalThis as any).foundry.applications.api.ApplicationV2;

// Basic Handlebars mock for tests that don't set up their own
// Individual test files can override this with more specific mocks
(globalThis as any).Handlebars = {
  compile: vi.fn().mockReturnValue(vi.fn().mockReturnValue('mock-template-result')),
  registerHelper: vi.fn(),
};

/**
 * Set up basic Foundry environment for testing
 */
export function setupFoundryEnvironment(): void {
  // Ensure game object exists
  (global as any).game = (global as any).game || {};

  // Set up basic game properties
  global.game.settings = global.game.settings || {
    get: vi.fn(),
    set: vi.fn(),
    register: vi.fn(),
  };

  global.game.time = global.game.time || {
    worldTime: 0,
  };

  global.game.user = global.game.user || {
    isGM: true,
  };

  global.game.i18n = global.game.i18n || {
    lang: 'en',
    localize: vi.fn((key: string) => key),
    format: vi.fn((key: string, data?: any) => key),
  };

  global.game.system = global.game.system || {
    id: 'pf2e',
  };

  // Set up UI
  (global as any).ui = (global as any).ui || {
    notifications: {
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    },
  };

  // Set up Hooks
  (global as any).Hooks = (global as any).Hooks || {
    on: vi.fn(),
    callAll: vi.fn(),
  };
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
      } catch (error) {
        console.warn(`Hook callback error for ${event}:`, error);
      }
    }
    return result;
  }

  static clear(): void {
    this.hooks.clear();
  }
}

// Override the Hooks system from foundry-test-utils with our enhanced version
(globalThis as any).Hooks = MockHooks;

// Mock Logger for integration modules
class MockLogger {
  static debug(...args: any[]): void {
    // Silent in tests
  }
  static info(...args: any[]): void {
    // Silent in tests
  }
  static warn(...args: any[]): void {
    console.warn(...args);
  }
  static error(...args: any[]): void {
    console.error(...args);
  }
}

// Make Logger available for imports
(globalThis as any).__mockLogger = MockLogger;

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
    (globalThis as any).game = {};
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
