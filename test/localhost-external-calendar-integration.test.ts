/**
 * Integration tests for localhost detection in external calendar loading
 */

import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { ExternalCalendarRegistry } from '../src/core/external-calendar-registry';
import { LocalProtocolHandler } from '../src/core/protocol-handlers/local-handler';
import { HttpsProtocolHandler } from '../src/core/protocol-handlers/https-handler';
import { devEnvironment } from '../src/core/dev-environment-detector';
import { Logger } from '../src/core/logger';
import type { LoadCalendarOptions } from '../src/types/external-calendar';

// Mock window.location for testing
const mockLocation = (hostname: string, port?: string, protocol = 'http:', search = '') => {
  Object.defineProperty(window, 'location', {
    value: {
      hostname,
      port: port || '',
      protocol,
      href: `${protocol}//${hostname}${port ? `:${port}` : ''}`,
      search,
    },
    writable: true,
  });
};

// Mock fetch for external requests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Localhost Detection in External Calendar Loading', () => {
  let registry: ExternalCalendarRegistry;

  beforeAll(() => {
    // Mock console methods to avoid test output noise but enable spying
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock Logger.debug for testing
    vi.spyOn(Logger, 'debug').mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    registry = new ExternalCalendarRegistry();
    registry.registerHandler(new LocalProtocolHandler());
    registry.registerHandler(new HttpsProtocolHandler());

    // Clear dev environment cache
    devEnvironment.clearCache();

    // Reset fetch mock
    mockFetch.mockReset();

    // Clear all spies
    vi.clearAllMocks();
  });

  describe('cache skipping behavior', () => {
    it('should skip cache for local files regardless of environment', async () => {
      mockLocation('example.com', '443'); // Production environment

      const mockCalendar = {
        id: 'test-calendar',
        name: 'Test Calendar',
        months: [],
        weekdays: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCalendar,
      });

      const result = await registry.loadExternalCalendar('local:./test-calendar.json');

      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should skip cache when running on localhost', async () => {
      mockLocation('localhost', '3000'); // Development environment

      const mockCalendar = {
        id: 'test-calendar',
        name: 'Test Calendar',
        months: [],
        weekdays: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCalendar,
        headers: new Map(),
      });

      const result = await registry.loadExternalCalendar('https:example.com/calendar.json');

      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should use cache in production environment', async () => {
      mockLocation('example.com', '443'); // Production environment

      const mockCalendar = {
        id: 'test-calendar',
        name: 'Test Calendar',
        months: [],
        weekdays: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCalendar,
        headers: new Map(),
      });

      // First load
      const result1 = await registry.loadExternalCalendar('https:api.example.com/calendar.json');
      expect(result1.success).toBe(true);
      expect(result1.fromCache).toBe(false);

      // Second load should use cache
      const result2 = await registry.loadExternalCalendar('https:api.example.com/calendar.json');
      expect(result2.success).toBe(true);
      expect(result2.fromCache).toBe(true);

      // Should only have called fetch once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('development mode headers and timeouts', () => {
    it('should use development headers when on localhost', async () => {
      mockLocation('localhost', '3000');

      const mockCalendar = {
        id: 'test-calendar',
        name: 'Test Calendar',
        months: [],
        weekdays: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCalendar,
        headers: new Map(),
      });

      await registry.loadExternalCalendar('https:api.example.com/calendar.json');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/calendar.json',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Development-Mode': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          }),
        })
      );
    });

    it('should use extended timeouts in development', async () => {
      mockLocation('localhost', '3000');

      const mockCalendar = {
        id: 'test-calendar',
        name: 'Test Calendar',
        months: [],
        weekdays: [],
      };

      // Mock a slow response
      mockFetch.mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => mockCalendar,
                headers: new Map(),
              });
            }, 1000); // 1 second delay
          })
      );

      const options: LoadCalendarOptions = {
        timeout: 500, // Short timeout that would normally fail
      };

      // Should succeed because dev mode extends timeout
      const result = await registry.loadExternalCalendar(
        'https:api.example.com/calendar.json',
        options
      );
      expect(result.success).toBe(true);
    });

    it('should not use development headers in production', async () => {
      mockLocation('example.com', '443');

      const mockCalendar = {
        id: 'test-calendar',
        name: 'Test Calendar',
        months: [],
        weekdays: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCalendar,
        headers: new Map(),
      });

      await registry.loadExternalCalendar('https:prod.example.com/calendar.json');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://prod.example.com/calendar.json',
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'X-Development-Mode': expect.anything(),
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          }),
        })
      );
    });
  });

  describe('development URL detection', () => {
    it('should skip cache for development URLs even in production environment', async () => {
      mockLocation('example.com', '443'); // Production environment

      const mockCalendar = {
        id: 'test-calendar',
        name: 'Test Calendar',
        months: [],
        weekdays: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCalendar,
        headers: new Map(),
      });

      // URL contains localhost - should skip cache
      const result = await registry.loadExternalCalendar('https://localhost:8080/calendar.json');

      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(false);
    });
  });

  describe('cache skip reasons', () => {
    it('should log appropriate reasons for cache skipping', async () => {
      const loggerSpy = vi.spyOn(Logger, 'debug');

      mockLocation('localhost', '3000');

      const mockCalendar = {
        id: 'test-calendar',
        name: 'Test Calendar',
        months: [],
        weekdays: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCalendar,
        headers: new Map(),
      });

      await registry.loadExternalCalendar('https:api.example.com/calendar.json');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipping cache for localhost/development environment')
      );
    });

    it('should log local file cache skip reason', async () => {
      const loggerSpy = vi.spyOn(Logger, 'debug');

      mockLocation('example.com', '443'); // Even in production

      const mockCalendar = {
        id: 'test-calendar',
        name: 'Test Calendar',
        months: [],
        weekdays: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCalendar,
      });

      await registry.loadExternalCalendar('local:./test-calendar.json');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipping cache for local file')
      );
    });
  });

  describe('configuration integration', () => {
    it('should respect enableDevMode option', async () => {
      mockLocation('example.com', '443'); // Production environment

      const mockCalendar = {
        id: 'test-calendar',
        name: 'Test Calendar',
        months: [],
        weekdays: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCalendar,
        headers: new Map(),
      });

      const options: LoadCalendarOptions = {
        enableDevMode: true, // Explicitly enable dev mode
      };

      const result = await registry.loadExternalCalendar(
        'https:api.example.com/calendar.json',
        options
      );

      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(false); // Should skip cache due to dev mode
    });
  });

  describe('error handling in development mode', () => {
    it('should provide enhanced error messages in development', async () => {
      mockLocation('localhost', '3000');

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await registry.loadExternalCalendar('https:api.example.com/calendar.json');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should use development timeout in error messages', async () => {
      mockLocation('localhost', '3000');

      const abortError = new Error(
        'Request timeout: Failed to load from https://api.example.com/calendar.json (timeout: 3000ms)'
      );
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const result = await registry.loadExternalCalendar('https:api.example.com/calendar.json', {
        timeout: 1000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout: 3000ms');
    });
  });
});
