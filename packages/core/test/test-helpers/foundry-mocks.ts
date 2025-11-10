/**
 * Properly typed Foundry VTT mock objects for testing
 *
 * This module provides type-safe mock factories that eliminate the need for `as any`
 * casts in test files.
 */

import { vi } from 'vitest';
import type { CalendarManager } from '../../src/core/calendar-manager';

/**
 * Creates a properly typed mock Game object for testing
 */
export function createMockGame(
  options: {
    isGM?: boolean;
    systemId?: string;
    worldTime?: number;
    manager?: CalendarManager;
  } = {}
): Game {
  const { isGM = true, systemId = 'generic', worldTime = 0, manager = undefined } = options;

  const mockSettings = new Map<string, unknown>();

  return {
    settings: {
      get: vi.fn((module: string, key: string) => mockSettings.get(`${module}.${key}`)),
      set: vi.fn((module: string, key: string, value: unknown) => {
        mockSettings.set(`${module}.${key}`, value);
        return Promise.resolve(value);
      }),
      register: vi.fn(),
      registerMenu: vi.fn(),
    },
    user: {
      id: 'test-user',
      name: 'Test User',
      isGM,
    },
    system: {
      id: systemId,
      version: '1.0.0',
    },
    time: {
      worldTime,
      advance: vi.fn(async (delta: number) => {
        (global.game.time as GameTime).worldTime += delta;
      }),
    },
    seasonsStars: manager ? { manager } : {},
    i18n: {
      lang: 'en',
      localize: vi.fn((key: string) => key),
      format: vi.fn((key: string) => key),
    },
    modules: new Map(),
    users: {} as FoundryCollection<FoundryUser>,
    journal: {} as FoundryCollection<FoundryJournalEntry>,
    paused: false,
  };
}

/**
 * Creates a properly typed mock Hooks object for testing
 */
export function createMockHooks(): typeof Hooks {
  return {
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    call: vi.fn(),
    callAll: vi.fn(),
  };
}

/**
 * Creates a properly typed mock UI object for testing
 */
export function createMockUI(): UI {
  return {
    notifications: {
      notify: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
}

/**
 * Creates a mock user object with configurable GM status
 */
export function createMockUser(isGM: boolean): FoundryUser {
  return {
    id: 'test-user',
    name: 'Test User',
    isGM,
  };
}
