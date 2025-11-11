/**
 * Simple tests for main module initialization hooks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use real TestLogger instead of mocks for better testing
import { TestLogger } from '../../../utils/test-logger';
vi.mock('../../../src/core/logger', () => ({
  Logger: TestLogger,
}));

// Import the module hook functions
import { init as moduleInit, setup as moduleSetup } from '../../../src/module';

// Mock Foundry globals
const mockSettings = {
  get: vi.fn(),
  set: vi.fn(),
  register: vi.fn(),
  registerMenu: vi.fn(),
};

const mockHooks = {
  on: vi.fn(),
  once: vi.fn(),
  call: vi.fn(),
  callAll: vi.fn(),
};

const mockGame = {
  user: { isGM: true },
  settings: mockSettings,
  time: { worldTime: 86400 },
  modules: { get: vi.fn().mockReturnValue({ active: true }) },
  folders: { find: vi.fn(), create: vi.fn() },
  journal: { find: vi.fn(), forEach: vi.fn(), filter: vi.fn().mockReturnValue([]) },
  ready: true,
} as any;

// Set up global mocks
globalThis.game = mockGame;
globalThis.Hooks = mockHooks;
globalThis.setTimeout = global.setTimeout;
globalThis.queueMicrotask = global.queueMicrotask;
// Mock CONFIG for Foundry calendar integration
(globalThis as any).CONFIG = {
  time: {},
};

describe('Module Initialization Hooks - Simple Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestLogger.clearLogs();
  });

  describe('init hook', () => {
    it('should initialize without throwing errors', () => {
      expect(() => moduleInit()).not.toThrow();
    });

    it('should log initialization messages', () => {
      moduleInit();

      expect(TestLogger.getLogsContaining('Initializing module').length).toBeGreaterThan(0);
    });

    it('should register settings', () => {
      moduleInit();

      expect(mockSettings.register).toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      // Mock settings.register to throw an error
      mockSettings.register.mockImplementation(() => {
        throw new Error('Settings registration failed');
      });

      expect(() => moduleInit()).not.toThrow();

      expect(TestLogger.getLogsContaining('initialization failed').length).toBeGreaterThan(0);
    });
  });

  describe('setup hook', () => {
    beforeEach(() => {
      // Initialize first
      moduleInit();
      vi.clearAllMocks();
      TestLogger.clearLogs();
    });

    it('should setup without throwing errors', () => {
      expect(() => moduleSetup()).not.toThrow();
    });

    it('should log setup messages', () => {
      moduleSetup();

      expect(TestLogger.getLogsContaining('Core setup during setup').length).toBeGreaterThan(0);
    });

    it('should complete setup successfully', () => {
      moduleSetup();

      // Verify setup completed successfully by checking for key log messages
      expect(TestLogger.getLogsContaining('Core setup during setup').length).toBeGreaterThan(0);
    });

    it('should handle setup errors gracefully', () => {
      // Mock settings.get to throw an error
      mockSettings.get.mockImplementation(() => {
        throw new Error('Settings access failed');
      });

      expect(() => moduleSetup()).not.toThrow();

      // With resilient error handling, setup should log specific calendar error, not general setup failure
      expect(
        TestLogger.getLogsContaining('Failed to set active calendar during setup').length
      ).toBeGreaterThan(0);
    });
  });

  describe('full initialization sequence', () => {
    it('should complete init and setup without errors', () => {
      expect(() => {
        moduleInit();
        moduleSetup();
      }).not.toThrow();

      // Verify both phases completed
      expect(TestLogger.getLogsContaining('Initializing module').length).toBeGreaterThan(0);
      expect(TestLogger.getLogsContaining('Core setup during setup').length).toBeGreaterThan(0);
    });
  });
});
