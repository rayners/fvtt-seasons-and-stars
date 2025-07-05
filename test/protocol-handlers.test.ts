/**
 * Tests for Protocol Handlers - TDD implementation
 * Phase 2 Day 2: HTTPS, GitHub, Module, and Local protocol handlers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type {
  ProtocolHandler,
  LoadCalendarOptions,
  CalendarProtocol,
  CalendarLocation,
} from '../src/types/external-calendar';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Protocol handlers to be implemented
import { HttpsProtocolHandler } from '../src/core/protocol-handlers/https-handler';
import { GitHubProtocolHandler } from '../src/core/protocol-handlers/github-handler';
import { ModuleProtocolHandler } from '../src/core/protocol-handlers/module-handler';
import { LocalProtocolHandler } from '../src/core/protocol-handlers/local-handler';

// Mock calendar data for testing
const mockCalendar: SeasonsStarsCalendar = {
  id: 'test-external-calendar',
  label: 'Test External Calendar',
  description: 'A test calendar loaded from external source',
  months: [{ name: 'TestMonth', days: 30 }],
  weekdays: [{ name: 'TestDay' }],
  year: {
    epoch: 0,
    currentYear: 2024,
  },
  translations: {
    en: {
      label: 'Test External Calendar',
      description: 'A test calendar',
    },
  },
};

describe('HTTPS Protocol Handler', () => {
  let handler: HttpsProtocolHandler;

  beforeEach(() => {
    handler = new HttpsProtocolHandler();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Protocol Registration', () => {
    it('should identify itself as HTTPS protocol', () => {
      expect(handler.protocol).toBe('https');
    });

    it('should handle HTTPS URLs', () => {
      expect(handler.canHandle('https://example.com/calendar.json')).toBe(true);
      expect(handler.canHandle('example.com/calendar.json')).toBe(true);
      expect(handler.canHandle('ftp://example.com/calendar.json')).toBe(false);
      expect(handler.canHandle('github:user/repo/calendar.json')).toBe(false);
    });
  });

  describe('Calendar Loading', () => {
    it('should load calendar from HTTPS URL', async () => {
      // Mock fetch response
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockCalendar),
        headers: new Map([['etag', 'W/"abc123"']]),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await handler.loadCalendar('https://example.com/calendar.json');

      expect(result).toEqual(mockCalendar);
      expect(fetch).toHaveBeenCalledWith('https://example.com/calendar.json', expect.any(Object));
    });

    it('should handle 404 errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(handler.loadCalendar('https://example.com/missing.json')).rejects.toThrow(
        'Calendar not found: 404 Not Found'
      );
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(handler.loadCalendar('https://example.com/calendar.json')).rejects.toThrow(
        'Network error'
      );
    });

    it('should respect timeout option', async () => {
      const options: LoadCalendarOptions = { timeout: 100 }; // Short timeout

      global.fetch = vi.fn().mockImplementation(() => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          }, 200); // Longer than timeout
        });
      });

      await expect(
        handler.loadCalendar('https://example.com/calendar.json', options)
      ).rejects.toThrow('timeout');
    }, 2000); // Test timeout of 2 seconds

    it('should include custom headers', async () => {
      const options: LoadCalendarOptions = {
        headers: { Authorization: 'Bearer token123' },
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockCalendar),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await handler.loadCalendar('https://example.com/calendar.json', options);

      expect(fetch).toHaveBeenCalledWith(
        'https://example.com/calendar.json',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token123',
          }),
        })
      );
    });
  });

  describe('Update Checking', () => {
    it('should check for updates using ETag', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([['etag', 'W/"new456"']]),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const hasUpdates = await handler.checkForUpdates!(
        'https://example.com/calendar.json',
        'W/"old123"'
      );

      expect(hasUpdates).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://example.com/calendar.json',
        expect.objectContaining({
          method: 'HEAD',
        })
      );
    });

    it('should return false when ETag unchanged', async () => {
      const etag = 'W/"same123"';
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([['etag', etag]]),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const hasUpdates = await handler.checkForUpdates!('https://example.com/calendar.json', etag);

      expect(hasUpdates).toBe(false);
    });
  });

  describe('Redirect Handling', () => {
    it('should follow 301 permanent redirects', async () => {
      const redirectResponse = {
        ok: false,
        status: 301,
        statusText: 'Moved Permanently',
        headers: new Map([['location', 'https://new-location.com/calendar.json']]),
      };

      const finalResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockCalendar),
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(redirectResponse) // First call returns redirect
        .mockResolvedValueOnce(finalResponse); // Second call returns data

      const result = await handler.loadCalendar('https://example.com/calendar.json');

      expect(result).toEqual(mockCalendar);
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        'https://example.com/calendar.json',
        expect.objectContaining({ redirect: 'manual' })
      );
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        'https://new-location.com/calendar.json',
        expect.objectContaining({ redirect: 'manual' })
      );
    });

    it('should follow 302 temporary redirects', async () => {
      const redirectResponse = {
        ok: false,
        status: 302,
        statusText: 'Found',
        headers: new Map([['location', 'https://temp-location.com/calendar.json']]),
      };

      const finalResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockCalendar),
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(redirectResponse)
        .mockResolvedValueOnce(finalResponse);

      const result = await handler.loadCalendar('https://example.com/calendar.json');

      expect(result).toEqual(mockCalendar);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should follow 307 temporary redirects preserving method', async () => {
      const redirectResponse = {
        ok: false,
        status: 307,
        statusText: 'Temporary Redirect',
        headers: new Map([['location', 'https://temp-location.com/calendar.json']]),
      };

      const finalResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockCalendar),
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(redirectResponse)
        .mockResolvedValueOnce(finalResponse);

      const result = await handler.loadCalendar('https://example.com/calendar.json');

      expect(result).toEqual(mockCalendar);
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        'https://temp-location.com/calendar.json',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should follow 308 permanent redirects preserving method', async () => {
      const redirectResponse = {
        ok: false,
        status: 308,
        statusText: 'Permanent Redirect',
        headers: new Map([['location', 'https://new-permanent.com/calendar.json']]),
      };

      const finalResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockCalendar),
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(redirectResponse)
        .mockResolvedValueOnce(finalResponse);

      const result = await handler.loadCalendar('https://example.com/calendar.json');

      expect(result).toEqual(mockCalendar);
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        'https://new-permanent.com/calendar.json',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should handle relative redirects', async () => {
      const redirectResponse = {
        ok: false,
        status: 302,
        statusText: 'Found',
        headers: new Map([['location', '/new-path/calendar.json']]),
      };

      const finalResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockCalendar),
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(redirectResponse)
        .mockResolvedValueOnce(finalResponse);

      const result = await handler.loadCalendar('https://example.com/old-path/calendar.json');

      expect(result).toEqual(mockCalendar);
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        'https://example.com/new-path/calendar.json',
        expect.anything()
      );
    });

    it('should handle multiple redirects in chain', async () => {
      const redirect1 = {
        ok: false,
        status: 301,
        statusText: 'Moved Permanently',
        headers: new Map([['location', 'https://intermediate.com/calendar.json']]),
      };

      const redirect2 = {
        ok: false,
        status: 302,
        statusText: 'Found',
        headers: new Map([['location', 'https://final.com/calendar.json']]),
      };

      const finalResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockCalendar),
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(redirect1)
        .mockResolvedValueOnce(redirect2)
        .mockResolvedValueOnce(finalResponse);

      const result = await handler.loadCalendar('https://original.com/calendar.json');

      expect(result).toEqual(mockCalendar);
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(fetch).toHaveBeenNthCalledWith(
        3,
        'https://final.com/calendar.json',
        expect.anything()
      );
    });

    it('should limit redirect count to prevent infinite loops', async () => {
      const redirectResponse = {
        ok: false,
        status: 302,
        statusText: 'Found',
        headers: new Map([['location', 'https://example.com/calendar.json']]), // Redirect to self
      };

      global.fetch = vi.fn().mockResolvedValue(redirectResponse);

      await expect(handler.loadCalendar('https://example.com/calendar.json')).rejects.toThrow(
        'Too many redirects'
      );

      expect(fetch).toHaveBeenCalledTimes(10); // Max redirects limit
    });

    it('should reject redirects missing Location header', async () => {
      const redirectResponse = {
        ok: false,
        status: 302,
        statusText: 'Found',
        headers: new Map(), // Missing location header
      };

      global.fetch = vi.fn().mockResolvedValue(redirectResponse);

      await expect(handler.loadCalendar('https://example.com/calendar.json')).rejects.toThrow(
        'Redirect response (302) missing Location header'
      );
    });

    it('should reject insecure HTTP redirects', async () => {
      const redirectResponse = {
        ok: false,
        status: 301,
        statusText: 'Moved Permanently',
        headers: new Map([['location', 'http://insecure.com/calendar.json']]), // HTTP not HTTPS
      };

      global.fetch = vi.fn().mockResolvedValue(redirectResponse);

      await expect(handler.loadCalendar('https://example.com/calendar.json')).rejects.toThrow(
        'Insecure redirect'
      );
    });

    it('should reject suspicious localhost redirects from external URLs', async () => {
      const redirectResponse = {
        ok: false,
        status: 301,
        statusText: 'Moved Permanently',
        headers: new Map([['location', 'https://localhost:8080/calendar.json']]),
      };

      global.fetch = vi.fn().mockResolvedValue(redirectResponse);

      await expect(handler.loadCalendar('https://external.com/calendar.json')).rejects.toThrow(
        'Suspicious redirect'
      );
    });

    it('should allow localhost redirects from localhost URLs (development)', async () => {
      const redirectResponse = {
        ok: false,
        status: 302,
        statusText: 'Found',
        headers: new Map([['location', 'https://localhost:3001/calendar.json']]),
      };

      const finalResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockCalendar),
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(redirectResponse)
        .mockResolvedValueOnce(finalResponse);

      const result = await handler.loadCalendar('https://localhost:3000/calendar.json');

      expect(result).toEqual(mockCalendar);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should remove sensitive headers for 301/302/303 redirects', async () => {
      const redirectResponse = {
        ok: false,
        status: 301,
        statusText: 'Moved Permanently',
        headers: new Map([['location', 'https://new-location.com/calendar.json']]),
      };

      const finalResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockCalendar),
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(redirectResponse)
        .mockResolvedValueOnce(finalResponse);

      const options = {
        headers: {
          Authorization: 'Bearer token123',
          'Content-Type': 'application/json',
          'User-Agent': 'TestAgent',
        },
      };

      await handler.loadCalendar('https://example.com/calendar.json', options);

      // Check that the second call (redirect) doesn't include Authorization or Content-Type
      const secondCallOptions = vi.mocked(fetch).mock.calls[1][1];
      expect(secondCallOptions?.headers).not.toHaveProperty('Authorization');
      expect(secondCallOptions?.headers).not.toHaveProperty('Content-Type');
      expect(secondCallOptions?.headers).toHaveProperty('User-Agent'); // Should preserve safe headers
    });

    it('should preserve all headers for 307/308 redirects', async () => {
      const redirectResponse = {
        ok: false,
        status: 307,
        statusText: 'Temporary Redirect',
        headers: new Map([['location', 'https://new-location.com/calendar.json']]),
      };

      const finalResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockCalendar),
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(redirectResponse)
        .mockResolvedValueOnce(finalResponse);

      const options = {
        headers: {
          Authorization: 'Bearer token123',
          'Content-Type': 'application/json',
          'User-Agent': 'TestAgent',
        },
      };

      await handler.loadCalendar('https://example.com/calendar.json', options);

      // Check that the second call (redirect) preserves all headers for 307
      const secondCallOptions = vi.mocked(fetch).mock.calls[1][1];
      expect(secondCallOptions?.headers).toHaveProperty('Authorization', 'Bearer token123');
      expect(secondCallOptions?.headers).toHaveProperty('Content-Type', 'application/json');
      expect(secondCallOptions?.headers).toHaveProperty('User-Agent', 'TestAgent');
    });

    it('should handle redirects in update checking', async () => {
      const redirectResponse = {
        ok: false,
        status: 301,
        statusText: 'Moved Permanently',
        headers: new Map([['location', 'https://new-location.com/calendar.json']]),
      };

      const finalResponse = {
        ok: true,
        status: 200,
        headers: new Map([['etag', 'W/"new456"']]),
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(redirectResponse)
        .mockResolvedValueOnce(finalResponse);

      const hasUpdates = await handler.checkForUpdates!(
        'https://example.com/calendar.json',
        'W/"old123"'
      );

      expect(hasUpdates).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        'https://example.com/calendar.json',
        expect.objectContaining({ method: 'HEAD' })
      );
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        'https://new-location.com/calendar.json',
        expect.objectContaining({ method: 'HEAD' })
      );
    });
  });
});

describe('GitHub Protocol Handler', () => {
  let handler: GitHubProtocolHandler;

  beforeEach(() => {
    handler = new GitHubProtocolHandler();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Protocol Registration', () => {
    it('should identify itself as GitHub protocol', () => {
      expect(handler.protocol).toBe('github');
    });

    it('should handle GitHub repository paths', () => {
      expect(handler.canHandle('user/repo/calendar.json')).toBe(true);
      expect(handler.canHandle('user/repo/subfolder/calendar.json')).toBe(true);
      expect(handler.canHandle('https://github.com/user/repo')).toBe(false);
      expect(handler.canHandle('https://example.com/calendar.json')).toBe(false);
    });
  });

  describe('Calendar Loading', () => {
    it('should load calendar from GitHub repository', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            content: Buffer.from(JSON.stringify(mockCalendar)).toString('base64'),
            sha: 'abc123',
            encoding: 'base64',
          }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await handler.loadCalendar('user/repo/calendar.json');

      expect(result).toEqual(mockCalendar);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/user/repo/contents/calendar.json',
        expect.any(Object)
      );
    });

    it('should handle private repositories with authentication', async () => {
      const options: LoadCalendarOptions = {
        headers: { Authorization: 'token ghp_xxxxxxxxxxxx' },
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            content: Buffer.from(JSON.stringify(mockCalendar)).toString('base64'),
            sha: 'def456',
            encoding: 'base64',
          }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await handler.loadCalendar('user/private-repo/calendar.json', options);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/user/private-repo/contents/calendar.json',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'token ghp_xxxxxxxxxxxx',
          }),
        })
      );
    });

    it('should handle repository not found errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(handler.loadCalendar('user/nonexistent/calendar.json')).rejects.toThrow(
        'Repository or file not found: 404 Not Found'
      );
    });

    it('should handle rate limiting', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: new Map([
          ['x-ratelimit-remaining', '0'],
          ['x-ratelimit-reset', String(Date.now() / 1000 + 3600)],
        ]),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(handler.loadCalendar('user/repo/calendar.json')).rejects.toThrow(
        'GitHub rate limit exceeded'
      );
    });
  });

  describe('Update Checking', () => {
    it('should check for updates using SHA comparison', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ sha: 'new789' }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const hasUpdates = await handler.checkForUpdates!('user/repo/calendar.json', 'old123');

      expect(hasUpdates).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/user/repo/contents/calendar.json',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });
});

describe('Module Protocol Handler', () => {
  let handler: ModuleProtocolHandler;

  beforeEach(() => {
    handler = new ModuleProtocolHandler();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Protocol Registration', () => {
    it('should identify itself as Module protocol', () => {
      expect(handler.protocol).toBe('module');
    });

    it('should handle module paths', () => {
      expect(handler.canHandle('module-name/calendars/calendar.json')).toBe(true);
      expect(handler.canHandle('my-module/data/custom.json')).toBe(true);
      expect(handler.canHandle('https://example.com/calendar.json')).toBe(false);
      expect(handler.canHandle('user/repo/calendar.json')).toBe(true); // Could be module or github
    });
  });

  describe('Calendar Loading', () => {
    it('should load calendar from active module', async () => {
      // Mock Foundry game.modules
      const mockModule = {
        active: true,
        path: '/modules/test-module',
      };

      global.game = {
        modules: new Map([['test-module', mockModule]]),
      } as any;

      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockCalendar),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await handler.loadCalendar('test-module/calendars/calendar.json');

      expect(result).toEqual(mockCalendar);
      expect(fetch).toHaveBeenCalledWith(
        '/modules/test-module/calendars/calendar.json',
        expect.any(Object)
      );
    });

    it('should handle inactive modules', async () => {
      const mockModule = {
        active: false,
        path: '/modules/inactive-module',
      };

      global.game = {
        modules: new Map([['inactive-module', mockModule]]),
      } as any;

      await expect(handler.loadCalendar('inactive-module/calendar.json')).rejects.toThrow(
        'Module inactive-module is not active'
      );
    });

    it('should handle missing modules', async () => {
      global.game = {
        modules: new Map(),
      } as any;

      await expect(handler.loadCalendar('missing-module/calendar.json')).rejects.toThrow(
        'Module missing-module not found'
      );
    });
  });
});

describe('Local Protocol Handler', () => {
  let handler: LocalProtocolHandler;

  beforeEach(() => {
    handler = new LocalProtocolHandler();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Protocol Registration', () => {
    it('should identify itself as Local protocol', () => {
      expect(handler.protocol).toBe('local');
    });

    it('should handle local file paths', () => {
      expect(handler.canHandle('/path/to/calendar.json')).toBe(true);
      expect(handler.canHandle('relative/path/calendar.json')).toBe(true);
      expect(handler.canHandle('C:\\Windows\\calendar.json')).toBe(true);
      expect(handler.canHandle('https://example.com/calendar.json')).toBe(false);
    });
  });

  describe('Calendar Loading', () => {
    it('should load calendar from local file system', async () => {
      // Note: In actual implementation, this would require Node.js fs module
      // or browser File API depending on the environment
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockCalendar),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await handler.loadCalendar('/local/path/calendar.json');

      expect(result).toEqual(mockCalendar);
    });

    it('should handle file not found errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(handler.loadCalendar('/nonexistent/calendar.json')).rejects.toThrow(
        'Local file not found'
      );
    });

    it('should handle permission errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Permission denied'));

      await expect(handler.loadCalendar('/restricted/calendar.json')).rejects.toThrow(
        'Permission denied'
      );
    });
  });
});

describe('Protocol Handler Integration', () => {
  it('should handle all protocol types consistently', () => {
    const handlers = [
      new HttpsProtocolHandler(),
      new GitHubProtocolHandler(),
      new ModuleProtocolHandler(),
      new LocalProtocolHandler(),
    ];

    handlers.forEach(handler => {
      expect(handler.protocol).toBeDefined();
      expect(typeof handler.canHandle).toBe('function');
      expect(typeof handler.loadCalendar).toBe('function');
    });
  });

  it('should have unique protocol identifiers', () => {
    const handlers = [
      new HttpsProtocolHandler(),
      new GitHubProtocolHandler(),
      new ModuleProtocolHandler(),
      new LocalProtocolHandler(),
    ];

    const protocols = handlers.map(h => h.protocol);
    const uniqueProtocols = new Set(protocols);

    expect(uniqueProtocols.size).toBe(protocols.length);
  });

  it('should provide consistent error handling', async () => {
    const handlers = [
      new HttpsProtocolHandler(),
      new GitHubProtocolHandler(),
      new ModuleProtocolHandler(),
      new LocalProtocolHandler(),
    ];

    // All handlers should throw errors (not return null/undefined) on failure
    for (const handler of handlers) {
      await expect(handler.loadCalendar('invalid-location')).rejects.toThrow();
    }
  });
});
