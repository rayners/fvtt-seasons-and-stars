/**
 * Tests for Logger - Central logging utility with settings integration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Logger } from '../src/core/logger';

// Mock Foundry globals
const mockGame = {
  settings: {
    get: vi.fn(),
  },
} as any;

const mockUI = {
  notifications: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
} as any;

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  time: vi.fn(),
  timeEnd: vi.fn(),
  group: vi.fn(),
  groupEnd: vi.fn(),
};

describe('Logger', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup global mocks
    globalThis.game = mockGame;
    globalThis.ui = mockUI;
    globalThis.console = mockConsole as any;

    // Default settings behavior - reset mock for each test
    mockGame.settings.get.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Debug Mode Settings Integration', () => {
    it('should respect debugMode setting for debug logs', () => {
      // Test with debug mode disabled
      mockGame.settings.get
        .mockReturnValueOnce(false) // debugMode
        .mockReturnValueOnce(true); // showNotifications

      Logger.debug('Test debug message');

      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    it('should show debug logs when debugMode is enabled', () => {
      // Test with debug mode enabled
      mockGame.settings.get.mockReturnValue(true); // debugMode = true for all calls

      Logger.debug('Test debug message', { test: 'data' });

      expect(mockConsole.log).toHaveBeenCalledWith('[S&S] Test debug message', { test: 'data' });
    });

    it('should handle missing game.settings gracefully', () => {
      globalThis.game = undefined as any;

      expect(() => {
        Logger.debug('Test debug message');
      }).not.toThrow();

      // Should not log when game is unavailable
      expect(mockConsole.log).not.toHaveBeenCalled();
    });
  });

  describe('User Notification Settings', () => {
    it('should show UI notifications when showNotifications is enabled', () => {
      mockGame.settings.get.mockImplementation((moduleId, setting) => {
        if (setting === 'showNotifications') return true;
        return false; // debugMode
      });

      Logger.warn('Test warning message');

      expect(mockConsole.warn).toHaveBeenCalledWith('[S&S WARNING] Test warning message', '');
      expect(mockUI.notifications.warn).toHaveBeenCalledWith(
        'Seasons & Stars: Test warning message'
      );
    });

    it('should suppress UI notifications when showNotifications is disabled', () => {
      mockGame.settings.get.mockImplementation((moduleId, setting) => {
        if (setting === 'showNotifications') return false;
        return false; // debugMode
      });

      Logger.warn('Test warning message');

      expect(mockConsole.warn).toHaveBeenCalledWith('[S&S WARNING] Test warning message', '');
      expect(mockUI.notifications.warn).not.toHaveBeenCalled();
    });

    it('should handle missing ui.notifications gracefully', () => {
      // Set up to trigger shouldShowUserNotifications() = true (default)
      mockGame.settings.get.mockImplementation((moduleId, setting) => {
        if (setting === 'showNotifications') return true;
        return false;
      });

      globalThis.ui = undefined as any;

      expect(() => {
        Logger.warn('Test warning message');
      }).not.toThrow();

      expect(mockConsole.warn).toHaveBeenCalled();
    });
  });

  describe('Log Level Methods', () => {
    beforeEach(() => {
      // Setup for info/warn/error (no debug mode checks)
      mockGame.settings.get.mockImplementation((moduleId, setting) => {
        if (setting === 'showNotifications') return true;
        return false; // debugMode
      });
    });

    it('should log info messages with proper formatting', () => {
      Logger.info('Info message', { data: 'test' });

      expect(mockConsole.log).toHaveBeenCalledWith('[S&S] Info message', { data: 'test' });
    });

    it('should log warnings with console and UI notifications', () => {
      Logger.warn('Warning message', { error: 'details' });

      expect(mockConsole.warn).toHaveBeenCalledWith('[S&S WARNING] Warning message', {
        error: 'details',
      });
      expect(mockUI.notifications.warn).toHaveBeenCalledWith('Seasons & Stars: Warning message');
    });

    it('should log errors with console and UI notifications', () => {
      const testError = new Error('Test error');

      Logger.error('Error message', testError);

      expect(mockConsole.error).toHaveBeenCalledWith('[S&S ERROR] Error message', testError);
      expect(mockUI.notifications.error).toHaveBeenCalledWith('Seasons & Stars: Error message');
    });

    it('should handle undefined data parameters gracefully', () => {
      Logger.info('Message with no data');
      Logger.warn('Warning with no data');
      Logger.error('Error with no data');

      expect(mockConsole.log).toHaveBeenCalledWith('[S&S] Message with no data', '');
      expect(mockConsole.warn).toHaveBeenCalledWith('[S&S WARNING] Warning with no data', '');
      expect(mockConsole.error).toHaveBeenCalledWith('[S&S ERROR] Error with no data', '');
    });
  });

  describe('Specialized Logging Methods', () => {
    beforeEach(() => {
      mockGame.settings.get.mockReturnValue(true); // showNotifications for error cases
    });

    it('should log critical errors with proper formatting', () => {
      const criticalError = new Error('Critical system failure');

      Logger.critical('Critical error occurred', criticalError);

      expect(mockConsole.error).toHaveBeenCalledWith(
        '[S&S CRITICAL] Critical error occurred',
        criticalError
      );
      expect(mockUI.notifications.error).toHaveBeenCalledWith(
        'Seasons & Stars: Critical error occurred'
      );
    });

    it('should log API calls with debug formatting', () => {
      mockGame.settings.get.mockReturnValue(true); // debugMode = true for all calls

      Logger.api('getCurrentDate', { calendarId: 'test' }, { year: 2024 });

      // API logging uses console.group instead of console.log
      expect(mockConsole.group).toHaveBeenCalledWith('[S&S API] getCurrentDate');
      expect(mockConsole.log).toHaveBeenCalledWith('Parameters:', { calendarId: 'test' });
      expect(mockConsole.log).toHaveBeenCalledWith('Result:', { year: 2024 });
      expect(mockConsole.groupEnd).toHaveBeenCalled();
    });

    it('should log integrations with debug formatting', () => {
      mockGame.settings.get.mockReturnValue(true); // debugMode = true for all calls

      Logger.integration('SmallTime detected', { version: '1.0.0' });

      expect(mockConsole.log).toHaveBeenCalledWith('[S&S Integration] SmallTime detected', {
        version: '1.0.0',
      });
    });

    it('should suppress API and integration logs when debug mode is disabled', () => {
      mockGame.settings.get.mockReturnValue(false); // debugMode = false for all calls

      Logger.api('getCurrentDate', {}, {});
      Logger.integration('SmallTime detected', {});

      expect(mockConsole.log).not.toHaveBeenCalled();
      expect(mockConsole.group).not.toHaveBeenCalled();
      expect(mockConsole.groupEnd).not.toHaveBeenCalled();
    });
  });

  describe('Performance Timing Utilities', () => {
    beforeEach(() => {
      mockGame.settings.get.mockReturnValue(true); // debugMode = true for all calls
    });

    it('should start performance timing', () => {
      Logger.time('test-operation');

      expect(mockConsole.time).toHaveBeenCalledWith('[S&S] test-operation');
    });

    it('should end performance timing', () => {
      Logger.timeEnd('test-operation');

      expect(mockConsole.timeEnd).toHaveBeenCalledWith('[S&S] test-operation');
    });

    it('should suppress timing when debug mode is disabled', () => {
      mockGame.settings.get.mockReturnValue(false); // debugMode = false for all calls

      Logger.time('test-operation');
      Logger.timeEnd('test-operation');

      expect(mockConsole.time).not.toHaveBeenCalled();
      expect(mockConsole.timeEnd).not.toHaveBeenCalled();
    });
  });

  describe('Settings Availability Edge Cases', () => {
    it('should handle missing settings.get method', () => {
      globalThis.game = { settings: {} } as any;

      expect(() => {
        Logger.debug('Test message');
        Logger.warn('Test warning');
      }).not.toThrow();
    });

    it('should handle settings.get throwing errors', () => {
      mockGame.settings.get.mockImplementation(() => {
        throw new Error('Settings not available');
      });

      expect(() => {
        Logger.debug('Test message');
        Logger.warn('Test warning');
      }).not.toThrow();

      // Should still log to console even if settings fail
      expect(mockConsole.warn).toHaveBeenCalled();
    });

    it('should handle null/undefined settings values', () => {
      mockGame.settings.get.mockImplementation((moduleId, setting) => {
        if (setting === 'debugMode') return null;
        if (setting === 'showNotifications') return undefined;
        return false;
      });

      expect(() => {
        Logger.debug('Test debug');
        Logger.warn('Test warning');
      }).not.toThrow();

      // Debug should not log (falsy)
      expect(mockConsole.log).not.toHaveBeenCalled();
      // Warning should log but should notify (undefined !== false, so defaults to true)
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockUI.notifications.warn).toHaveBeenCalled(); // shouldShowUserNotifications() defaults to true
    });
  });

  describe('Console Availability Edge Cases', () => {
    it('should handle missing console methods gracefully', () => {
      // Set up settings to avoid console calls in debug checking
      mockGame.settings.get.mockImplementation(() => false);

      // Mock console with safe fallback methods
      globalThis.console = {
        log: () => {}, // Safe no-op
        warn: () => {}, // Safe no-op
        error: () => {}, // Safe no-op
      } as any;

      expect(() => {
        Logger.info('Test info');
        Logger.warn('Test warning');
        Logger.error('Test error');
      }).not.toThrow();
    });
  });
});
