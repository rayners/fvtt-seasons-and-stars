/**
 * Tests for seasons warning state management functions
 *
 * This test focuses specifically on the exposed warning state management functions
 * added in the prevent-seasons-warning-loop branch.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  resetSeasonsWarningState,
  getSeasonsWarningState,
  setSeasonsWarningState,
  setupAPI,
} from '../src/module';
import { Logger } from '../src/core/logger';

// Mock Foundry globals to enable module setup
const mockGame = {
  settings: {
    get: vi.fn(),
  },
  time: {
    worldTime: 86400,
  },
  modules: {
    get: vi.fn().mockReturnValue({ active: true }),
  },
  seasonsStars: {} as any,
} as any;

const mockHooks = {
  on: vi.fn(),
  once: vi.fn(),
  call: vi.fn(),
  callAll: vi.fn(),
};

// Set up global mocks before importing the module
globalThis.game = mockGame;
globalThis.Hooks = mockHooks;

// Mock the calendar manager to avoid complex dependencies
const mockCalendarManager = {
  getActiveCalendar: vi.fn(),
  getCalendar: vi.fn(),
  getActiveEngine: vi.fn(),
  loadBuiltInCalendars: vi.fn().mockResolvedValue(undefined),
  completeInitialization: vi.fn().mockResolvedValue(undefined),
};

// Mock components to prevent side effects during module import
vi.mock('../src/core/calendar-manager', () => ({
  CalendarManager: vi.fn().mockImplementation(() => mockCalendarManager),
}));

vi.mock('../src/core/notes-manager', () => ({
  NotesManager: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../src/ui/calendar-widget', () => ({
  CalendarWidget: {
    registerHooks: vi.fn(),
    getInstance: vi.fn(),
  },
}));

vi.mock('../src/ui/calendar-mini-widget', () => ({
  CalendarMiniWidget: {
    registerHooks: vi.fn(),
    registerSmallTimeIntegration: vi.fn(),
    getInstance: vi.fn(),
  },
}));

vi.mock('../src/ui/calendar-grid-widget', () => ({
  CalendarGridWidget: {
    registerHooks: vi.fn(),
    getInstance: vi.fn(),
  },
}));

vi.mock('../src/ui/calendar-widget-manager', () => ({
  CalendarWidgetManager: {
    registerWidget: vi.fn(),
  },
}));

vi.mock('../src/ui/scene-controls', () => ({
  SeasonsStarsSceneControls: {
    registerControls: vi.fn(),
    registerMacros: vi.fn(),
  },
}));

// Test calendar without seasons
const calendarWithoutSeasons = {
  id: 'test-no-seasons',
  name: 'Test Calendar No Seasons',
  year: { epoch: 0, currentYear: 2024 },
  months: [
    { name: 'January', days: 31 },
    { name: 'February', days: 28 },
  ],
  weekdays: [{ name: 'Sunday' }, { name: 'Monday' }],
  intercalary: [],
  time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
  // No seasons property
};

describe('Seasons Warning State Management Functions', () => {
  beforeEach(() => {
    // Reset state before each test
    resetSeasonsWarningState();

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with warning state false', () => {
    expect(getSeasonsWarningState()).toBe(false);
  });

  it('should allow setting warning state to true', () => {
    setSeasonsWarningState(true);
    expect(getSeasonsWarningState()).toBe(true);
  });

  it('should allow setting warning state to false', () => {
    setSeasonsWarningState(true);
    expect(getSeasonsWarningState()).toBe(true);

    setSeasonsWarningState(false);
    expect(getSeasonsWarningState()).toBe(false);
  });

  it('should reset warning state to false', () => {
    setSeasonsWarningState(true);
    expect(getSeasonsWarningState()).toBe(true);

    resetSeasonsWarningState();
    expect(getSeasonsWarningState()).toBe(false);
  });

  it('should handle multiple rapid state changes', () => {
    // Test multiple state changes
    expect(getSeasonsWarningState()).toBe(false);

    setSeasonsWarningState(true);
    expect(getSeasonsWarningState()).toBe(true);

    resetSeasonsWarningState();
    expect(getSeasonsWarningState()).toBe(false);

    resetSeasonsWarningState(); // Reset when already false
    expect(getSeasonsWarningState()).toBe(false);

    setSeasonsWarningState(true);
    setSeasonsWarningState(false);
    expect(getSeasonsWarningState()).toBe(false);
  });

  it('should test setupAPI function exists and can be called', () => {
    // Test that setupAPI is exported and callable
    expect(setupAPI).toBeDefined();
    expect(typeof setupAPI).toBe('function');

    // Setup minimal mocks needed for setupAPI
    mockGame.seasonsStars = {
      manager: mockCalendarManager,
    };

    // Should be able to call setupAPI without throwing
    expect(() => setupAPI()).not.toThrow();
  });
});
