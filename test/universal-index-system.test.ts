/**
 * Tests for Universal Index System across all Protocol Handlers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { CalendarCollectionIndex, CalendarIndexEntry } from '../src/types/external-calendar';
import type { SeasonsStarsCalendar } from '../src/types/calendar';
import { HttpsProtocolHandler } from '../src/core/protocol-handlers/https-handler';
import { GitHubProtocolHandler } from '../src/core/protocol-handlers/github-handler';
import { ModuleProtocolHandler } from '../src/core/protocol-handlers/module-handler';
import { LocalProtocolHandler } from '../src/core/protocol-handlers/local-handler';

// Mock calendar data for testing
const mockCalendar1: SeasonsStarsCalendar = {
  id: 'test-calendar-1',
  label: 'Test Calendar 1',
  description: 'First test calendar',
  months: [{ name: 'TestMonth1', days: 30 }],
  weekdays: [{ name: 'TestDay1' }],
  year: {
    epoch: 0,
    currentYear: 2024,
  },
  translations: {
    en: {
      label: 'Test Calendar 1',
      description: 'First test calendar',
    },
  },
};

const mockCalendar2: SeasonsStarsCalendar = {
  id: 'test-calendar-2',
  label: 'Test Calendar 2',
  description: 'Second test calendar',
  months: [{ name: 'TestMonth2', days: 28 }],
  weekdays: [{ name: 'TestDay2' }],
  year: {
    epoch: 0,
    currentYear: 2024,
  },
  translations: {
    en: {
      label: 'Test Calendar 2',
      description: 'Second test calendar',
    },
  },
};

// Mock collection index
const mockCollectionIndex: CalendarCollectionIndex = {
  name: 'Universal Test Collection',
  description: 'A collection for testing universal index support',
  version: '1.0.0',
  calendars: [
    {
      id: 'calendar-1',
      name: 'First Calendar',
      description: 'The first test calendar',
      file: 'calendars/calendar-1.json',
      tags: ['test', 'first'],
      author: 'Test Author',
      version: '1.0.0',
    },
    {
      id: 'calendar-2',
      name: 'Second Calendar',
      description: 'The second test calendar',
      file: 'calendars/calendar-2.json',
      tags: ['test', 'second'],
      author: 'Test Author',
      version: '1.1.0',
    },
  ],
  metadata: {
    lastUpdated: '2025-07-04T21:00:00Z',
    author: 'Test Suite',
    license: 'MIT',
  },
};

// Mock single calendar index
const mockSingleIndex: CalendarCollectionIndex = {
  name: 'Single Calendar Collection',
  calendars: [
    {
      id: 'single-calendar',
      name: 'Single Calendar',
      file: 'calendar.json',
    },
  ],
};

// Mock empty index
const mockEmptyIndex: CalendarCollectionIndex = {
  name: 'Empty Collection',
  calendars: [],
};

describe('Universal Index System', () => {
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('HTTPS Protocol Handler Index Support', () => {
    let handler: HttpsProtocolHandler;

    beforeEach(() => {
      handler = new HttpsProtocolHandler();
    });

    it('should load collection index and require calendar ID for multiple calendars', async () => {
      // Mock index.json response
      const indexResponse = {
        ok: true,
        json: () => Promise.resolve(mockCollectionIndex),
      };

      fetchSpy.mockResolvedValueOnce(indexResponse);

      try {
        await handler.loadCalendar('example.com/calendars/index.json');
        expect.fail('Should have thrown error for multiple calendars without ID');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('contains multiple calendars');
        expect((error as Error).message).toContain('calendar-1 (First Calendar)');
        expect((error as Error).message).toContain('calendar-2 (Second Calendar)');
      }

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://example.com/calendars/index.json',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Accept: 'application/json',
          }),
        })
      );
    });

    it('should load specific calendar by ID from index', async () => {
      // Mock index.json response
      const indexResponse = {
        ok: true,
        json: () => Promise.resolve(mockCollectionIndex),
      };

      // Mock specific calendar file response
      const calendarResponse = {
        ok: true,
        json: () => Promise.resolve(mockCalendar1),
      };

      fetchSpy.mockResolvedValueOnce(indexResponse).mockResolvedValueOnce(calendarResponse);

      const result = await handler.loadCalendar('example.com/calendars/index.json#calendar-1');

      expect(result).toEqual(mockCalendar1);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(fetchSpy).toHaveBeenNthCalledWith(
        1,
        'https://example.com/calendars/index.json',
        expect.any(Object)
      );
      expect(fetchSpy).toHaveBeenNthCalledWith(
        2,
        'https://example.com/calendars/calendars/calendar-1.json',
        expect.any(Object)
      );
    });

    it('should auto-load single calendar from index', async () => {
      // Mock index.json response
      const indexResponse = {
        ok: true,
        json: () => Promise.resolve(mockSingleIndex),
      };

      // Mock calendar file response
      const calendarResponse = {
        ok: true,
        json: () => Promise.resolve(mockCalendar1),
      };

      fetchSpy.mockResolvedValueOnce(indexResponse).mockResolvedValueOnce(calendarResponse);

      const result = await handler.loadCalendar('example.com/calendars/index.json');

      expect(result).toEqual(mockCalendar1);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(fetchSpy).toHaveBeenNthCalledWith(
        2,
        'https://example.com/calendars/calendar.json',
        expect.any(Object)
      );
    });
  });

  describe('GitHub Protocol Handler Index Support', () => {
    let handler: GitHubProtocolHandler;

    beforeEach(() => {
      handler = new GitHubProtocolHandler();
    });

    it('should detect repository index format correctly', () => {
      expect(handler.canHandle('user/repo')).toBe(true);
      expect(handler.canHandle('user/repo#calendar-id')).toBe(true);
      expect(handler.canHandle('user/repo/path/to/file.json')).toBe(true);
    });

    it('should load repository index with calendar selection', async () => {
      // Mock index.json fetch from GitHub API
      const indexResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            content: btoa(JSON.stringify(mockCollectionIndex)),
            encoding: 'base64',
            sha: 'abc123',
          }),
      };

      fetchSpy.mockResolvedValueOnce(indexResponse);

      try {
        await handler.loadCalendar('test-user/test-calendars');
        expect.fail('Should have thrown error for multiple calendars without ID');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('contains multiple calendars');
      }

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.github.com/repos/test-user/test-calendars/contents/index.json',
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/vnd.github.v3+json',
          }),
        })
      );
    });

    it('should load specific calendar from repository index', async () => {
      // Mock index.json fetch
      const indexResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            content: btoa(JSON.stringify(mockCollectionIndex)),
            encoding: 'base64',
            sha: 'abc123',
          }),
      };

      // Mock calendar file fetch
      const calendarResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            content: btoa(JSON.stringify(mockCalendar1)),
            encoding: 'base64',
            sha: 'def456',
          }),
      };

      fetchSpy.mockResolvedValueOnce(indexResponse).mockResolvedValueOnce(calendarResponse);

      const result = await handler.loadCalendar('test-user/test-calendars#calendar-1');

      expect(result).toEqual(mockCalendar1);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(fetchSpy).toHaveBeenNthCalledWith(
        2,
        'https://api.github.com/repos/test-user/test-calendars/contents/calendars/calendar-1.json',
        expect.any(Object)
      );
    });
  });

  describe('Module Protocol Handler Index Support', () => {
    let handler: ModuleProtocolHandler;

    beforeEach(() => {
      handler = new ModuleProtocolHandler();

      // Mock game object for module testing
      (global as any).game = {
        modules: {
          get: (name: string) => {
            if (name === 'test-module') {
              return {
                active: true,
                path: '/modules/test-module',
              };
            }
            return null;
          },
        },
      };
    });

    afterEach(() => {
      delete (global as any).game;
    });

    it('should detect module index format correctly', () => {
      expect(handler.canHandle('test-module/index.json')).toBe(true);
      expect(handler.canHandle('test-module/calendars/specific.json')).toBe(true);
    });

    it('should load module collection index', async () => {
      const indexResponse = {
        ok: true,
        json: () => Promise.resolve(mockCollectionIndex),
      };

      fetchSpy.mockResolvedValueOnce(indexResponse);

      try {
        await handler.loadCalendar('test-module/index.json');
        expect.fail('Should have thrown error for multiple calendars without ID');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('contains multiple calendars');
      }

      expect(fetchSpy).toHaveBeenCalledWith('/modules/test-module/index.json', expect.any(Object));
    });

    it('should load specific calendar from module index', async () => {
      const indexResponse = {
        ok: true,
        json: () => Promise.resolve(mockCollectionIndex),
      };

      const calendarResponse = {
        ok: true,
        json: () => Promise.resolve(mockCalendar1),
      };

      fetchSpy.mockResolvedValueOnce(indexResponse).mockResolvedValueOnce(calendarResponse);

      const result = await handler.loadCalendar('test-module/index.json#calendar-1');

      expect(result).toEqual(mockCalendar1);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(fetchSpy).toHaveBeenNthCalledWith(
        2,
        '/modules/test-module/calendars/calendar-1.json',
        expect.any(Object)
      );
    });
  });

  describe('Local Protocol Handler Index Support', () => {
    let handler: LocalProtocolHandler;

    beforeEach(() => {
      handler = new LocalProtocolHandler();
    });

    it('should detect local index format correctly', () => {
      expect(handler.canHandle('./calendars/index.json')).toBe(true);
      expect(handler.canHandle('../shared/calendars/index.json')).toBe(true);
      expect(handler.canHandle('/absolute/path/calendars/index.json')).toBe(true);
    });

    it('should load local collection index', async () => {
      const indexResponse = {
        ok: true,
        json: () => Promise.resolve(mockCollectionIndex),
      };

      fetchSpy.mockResolvedValueOnce(indexResponse);

      try {
        await handler.loadCalendar('./calendars/index.json');
        expect.fail('Should have thrown error for multiple calendars without ID');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('contains multiple calendars');
      }

      expect(fetchSpy).toHaveBeenCalledWith('./calendars/index.json', expect.any(Object));
    });

    it('should load specific calendar from local index', async () => {
      const indexResponse = {
        ok: true,
        json: () => Promise.resolve(mockCollectionIndex),
      };

      const calendarResponse = {
        ok: true,
        json: () => Promise.resolve(mockCalendar1),
      };

      fetchSpy.mockResolvedValueOnce(indexResponse).mockResolvedValueOnce(calendarResponse);

      const result = await handler.loadCalendar('./calendars/index.json#calendar-1');

      expect(result).toEqual(mockCalendar1);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(fetchSpy).toHaveBeenNthCalledWith(
        2,
        './calendars/calendars/calendar-1.json',
        expect.any(Object)
      );
    });
  });

  describe('Universal Error Handling', () => {
    it('should handle calendar ID not found in index', async () => {
      const handler = new HttpsProtocolHandler();

      const indexResponse = {
        ok: true,
        json: () => Promise.resolve(mockCollectionIndex),
      };

      fetchSpy.mockResolvedValueOnce(indexResponse);

      try {
        await handler.loadCalendar('example.com/calendars/index.json#nonexistent');
        expect.fail('Should have thrown error for nonexistent calendar ID');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain(`Calendar 'nonexistent' not found`);
        expect((error as Error).message).toContain('calendar-1, calendar-2');
      }
    });

    it('should handle empty collection index', async () => {
      const handler = new GitHubProtocolHandler();

      const indexResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            content: btoa(JSON.stringify(mockEmptyIndex)),
            encoding: 'base64',
            sha: 'abc123',
          }),
      };

      fetchSpy.mockResolvedValueOnce(indexResponse);

      try {
        await handler.loadCalendar('user/empty-repo');
        expect.fail('Should have thrown error for empty index');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('index contains no calendars');
      }
    });

    it('should handle invalid index structure', async () => {
      const handler = new LocalProtocolHandler();

      const invalidIndex = {
        name: 'Invalid Index',
        // Missing calendars array
      };

      const indexResponse = {
        ok: true,
        json: () => Promise.resolve(invalidIndex),
      };

      fetchSpy.mockResolvedValueOnce(indexResponse);

      try {
        await handler.loadCalendar('./invalid/index.json');
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('must have a "calendars" array');
      }
    });
  });

  describe('Backward Compatibility', () => {
    it('should still support direct file loading without index', async () => {
      const handler = new HttpsProtocolHandler();

      const calendarResponse = {
        ok: true,
        json: () => Promise.resolve(mockCalendar1),
      };

      fetchSpy.mockResolvedValueOnce(calendarResponse);

      const result = await handler.loadCalendar('example.com/calendar.json');

      expect(result).toEqual(mockCalendar1);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://example.com/calendar.json',
        expect.any(Object)
      );
    });

    it('should add .json extension to directory paths for index loading', async () => {
      const handler = new GitHubProtocolHandler();

      const indexResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            content: btoa(JSON.stringify(mockSingleIndex)),
            encoding: 'base64',
            sha: 'abc123',
          }),
      };

      const calendarResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            content: btoa(JSON.stringify(mockCalendar1)),
            encoding: 'base64',
            sha: 'def456',
          }),
      };

      fetchSpy.mockResolvedValueOnce(indexResponse).mockResolvedValueOnce(calendarResponse);

      // Directory path should become index.json
      const result = await handler.loadCalendar('user/repo');

      expect(result).toEqual(mockCalendar1);
      expect(fetchSpy).toHaveBeenNthCalledWith(
        1,
        'https://api.github.com/repos/user/repo/contents/index.json',
        expect.any(Object)
      );
    });
  });
});
