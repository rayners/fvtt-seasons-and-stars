/**
 * Tests for GitHub Repository Index System
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { GitHubRepositoryIndex, GitHubCalendarEntry } from '../src/types/external-calendar';
import type { SeasonsStarsCalendar } from '../src/types/calendar';
import { GitHubProtocolHandler } from '../src/core/protocol-handlers/github-handler';

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

// Mock repository index
const mockRepositoryIndex: GitHubRepositoryIndex = {
  name: 'Community Calendar Collection',
  description: 'A curated collection of fantasy calendars',
  version: '1.0.0',
  calendars: [
    {
      id: 'forgotten-realms',
      name: 'Forgotten Realms Calendar',
      description: 'The standard calendar of Faerûn',
      file: 'calendars/forgotten-realms.json',
      tags: ['dnd', 'forgotten-realms', 'official'],
      author: 'WizardsOfTheCoast',
      version: '1.2.0',
      metadata: {
        systems: ['dnd5e'],
        language: 'en',
      },
    },
    {
      id: 'custom-eberron',
      name: 'Custom Eberron Calendar',
      description: 'Modified Eberron calendar with house rules',
      file: 'calendars/eberron-custom.json',
      tags: ['dnd', 'eberron', 'homebrew'],
      author: 'CommunityContributor',
      version: '1.0.1',
    },
  ],
  metadata: {
    lastUpdated: '2024-12-25T10:00:00Z',
    repository: 'https://github.com/test-user/test-calendars',
    license: 'MIT',
    author: 'Test User',
  },
};

// Mock single calendar index
const mockSingleCalendarIndex: GitHubRepositoryIndex = {
  name: 'Single Calendar Repository',
  calendars: [
    {
      id: 'single-calendar',
      name: 'Single Calendar',
      file: 'calendar.json',
    },
  ],
};

// Mock empty index
const mockEmptyIndex: GitHubRepositoryIndex = {
  name: 'Empty Repository',
  calendars: [],
};

describe('GitHubProtocolHandler Repository Index System', () => {
  let handler: GitHubProtocolHandler;
  let fetchSpy: any;

  beforeEach(() => {
    handler = new GitHubProtocolHandler();
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Location Validation', () => {
    it('should handle repository index formats', () => {
      expect(handler.canHandle('user/repo')).toBe(true);
      expect(handler.canHandle('test-user/calendar-collection')).toBe(true);
      expect(handler.canHandle('org/repo.name')).toBe(true);
    });

    it('should handle repository with calendar ID fragments', () => {
      expect(handler.canHandle('user/repo#calendar-id')).toBe(true);
      expect(handler.canHandle('test-user/calendars#forgotten-realms')).toBe(true);
    });

    it('should still handle direct file paths', () => {
      expect(handler.canHandle('user/repo/calendars/test.json')).toBe(true);
      expect(handler.canHandle('user/repo/path/to/calendar')).toBe(true); // Will add .json
    });

    it('should reject invalid formats', () => {
      expect(handler.canHandle('user')).toBe(false); // Not enough parts
      expect(handler.canHandle('user/repo/with?query=params')).toBe(false);
      expect(handler.canHandle('https://github.com/user/repo')).toBe(false);
      expect(handler.canHandle('invalid-user@/repo')).toBe(false);
    });
  });

  describe('Repository Index Loading', () => {
    it('should load repository index and return available calendars info', async () => {
      // Mock index.json fetch
      const indexResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            content: btoa(JSON.stringify(mockRepositoryIndex)),
            encoding: 'base64',
            sha: 'abc123',
          }),
      };

      fetchSpy.mockResolvedValueOnce(indexResponse);

      try {
        await handler.loadCalendar('test-user/test-calendars');
        expect.fail('Should have thrown error for multiple calendars without specifying ID');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('contains multiple calendars');
        expect((error as Error).message).toContain('forgotten-realms (Forgotten Realms Calendar)');
        expect((error as Error).message).toContain('custom-eberron (Custom Eberron Calendar)');
      }

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.github.com/repos/test-user/test-calendars/contents/index.json',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'FoundryVTT/Seasons-and-Stars',
          }),
        })
      );
    });

    it('should load single calendar automatically from index', async () => {
      // Mock index.json fetch
      const indexResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            content: btoa(JSON.stringify(mockSingleCalendarIndex)),
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

      const result = await handler.loadCalendar('test-user/single-calendar-repo');

      expect(result).toEqual(mockCalendar1);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(fetchSpy).toHaveBeenNthCalledWith(
        1,
        'https://api.github.com/repos/test-user/single-calendar-repo/contents/index.json',
        expect.any(Object)
      );
      expect(fetchSpy).toHaveBeenNthCalledWith(
        2,
        'https://api.github.com/repos/test-user/single-calendar-repo/contents/calendar.json',
        expect.any(Object)
      );
    });

    it('should load specific calendar by ID from index', async () => {
      // Mock index.json fetch
      const indexResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            content: btoa(JSON.stringify(mockRepositoryIndex)),
            encoding: 'base64',
            sha: 'abc123',
          }),
      };

      // Mock specific calendar file fetch
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

      const result = await handler.loadCalendar('test-user/test-calendars#forgotten-realms');

      expect(result).toEqual(mockCalendar1);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(fetchSpy).toHaveBeenNthCalledWith(
        2,
        'https://api.github.com/repos/test-user/test-calendars/contents/calendars/forgotten-realms.json',
        expect.any(Object)
      );
    });

    it('should handle calendar ID not found in index', async () => {
      // Mock index.json fetch
      const indexResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            content: btoa(JSON.stringify(mockRepositoryIndex)),
            encoding: 'base64',
            sha: 'abc123',
          }),
      };

      fetchSpy.mockResolvedValueOnce(indexResponse);

      try {
        await handler.loadCalendar('test-user/test-calendars#nonexistent-calendar');
        expect.fail('Should have thrown error for calendar not found');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain(
          `Calendar 'nonexistent-calendar' not found in repository index`
        );
        expect((error as Error).message).toContain('forgotten-realms, custom-eberron');
      }
    });

    it('should handle empty repository index', async () => {
      // Mock index.json fetch
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
        await handler.loadCalendar('test-user/empty-repo');
        expect.fail('Should have thrown error for empty repository');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('index contains no calendars');
      }
    });
  });

  describe('Direct File Access (Backward Compatibility)', () => {
    it('should still support direct file access', async () => {
      const calendarResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            content: btoa(JSON.stringify(mockCalendar1)),
            encoding: 'base64',
            sha: 'def456',
          }),
      };

      fetchSpy.mockResolvedValueOnce(calendarResponse);

      const result = await handler.loadCalendar('test-user/test-repo/calendars/direct.json');

      expect(result).toEqual(mockCalendar1);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.github.com/repos/test-user/test-repo/contents/calendars/direct.json',
        expect.any(Object)
      );
    });

    it('should add .json extension to direct file paths', async () => {
      const calendarResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            content: btoa(JSON.stringify(mockCalendar1)),
            encoding: 'base64',
            sha: 'def456',
          }),
      };

      fetchSpy.mockResolvedValueOnce(calendarResponse);

      await handler.loadCalendar('test-user/test-repo/calendars/direct');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.github.com/repos/test-user/test-repo/contents/calendars/direct.json',
        expect.any(Object)
      );
    });
  });

  describe('Index Validation', () => {
    it('should validate repository index structure', async () => {
      const invalidIndexes = [
        // Missing name
        { calendars: [] },
        // Missing calendars array
        { name: 'Test' },
        // Invalid calendars array
        { name: 'Test', calendars: 'not-an-array' },
        // Invalid calendar entry - missing id
        { name: 'Test', calendars: [{ name: 'Cal', file: 'cal.json' }] },
        // Invalid calendar entry - missing name
        { name: 'Test', calendars: [{ id: 'cal', file: 'cal.json' }] },
        // Invalid calendar entry - missing file
        { name: 'Test', calendars: [{ id: 'cal', name: 'Calendar' }] },
        // Duplicate calendar IDs
        {
          name: 'Test',
          calendars: [
            { id: 'cal', name: 'Calendar 1', file: 'cal1.json' },
            { id: 'cal', name: 'Calendar 2', file: 'cal2.json' },
          ],
        },
      ];

      for (const [index, invalidIndex] of invalidIndexes.entries()) {
        const indexResponse = {
          ok: true,
          json: () =>
            Promise.resolve({
              content: btoa(JSON.stringify(invalidIndex)),
              encoding: 'base64',
              sha: 'abc123',
            }),
        };

        fetchSpy.mockReset().mockResolvedValueOnce(indexResponse);

        try {
          await handler.loadCalendar('test-user/invalid-repo');
          expect.fail(`Invalid index ${index} should have thrown validation error`);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toMatch(/Repository index|Calendar entry|Duplicate/);
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle repository index not found', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      try {
        await handler.loadCalendar('test-user/nonexistent-repo');
        expect.fail('Should have thrown error for repository not found');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Repository index not found');
        expect((error as Error).message).toContain('test-user/nonexistent-repo/index.json');
      }
    });

    it('should handle GitHub rate limiting', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: {
          get: (name: string) => {
            if (name === 'x-ratelimit-remaining') return '0';
            if (name === 'x-ratelimit-reset') return '1735142400'; // Example timestamp
            return null;
          },
        },
      });

      try {
        await handler.loadCalendar('test-user/test-repo');
        expect.fail('Should have thrown error for rate limiting');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('GitHub rate limit exceeded');
      }
    });

    it('should handle private repository access', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: {
          get: () => null, // No rate limit headers
        },
      });

      try {
        await handler.loadCalendar('test-user/private-repo');
        expect.fail('Should have thrown error for private repository');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Access forbidden to repository index');
        expect((error as Error).message).toContain('private repository');
      }
    });

    it('should handle invalid JSON in index', async () => {
      const indexResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            content: btoa('invalid json content'),
            encoding: 'base64',
            sha: 'abc123',
          }),
      };

      fetchSpy.mockResolvedValueOnce(indexResponse);

      try {
        await handler.loadCalendar('test-user/invalid-json-repo');
        expect.fail('Should have thrown error for invalid JSON');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain(
          'Invalid JSON content in GitHub repository index'
        );
      }
    });
  });

  describe('Update Checking', () => {
    it('should check for updates to repository index', async () => {
      const updateResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            sha: 'new-sha-123',
          }),
      };

      fetchSpy.mockResolvedValueOnce(updateResponse);

      const hasUpdates = await handler.checkForUpdates('test-user/test-repo', 'old-sha-456');

      expect(hasUpdates).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.github.com/repos/test-user/test-repo/contents/index.json',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should check for updates to direct files', async () => {
      const updateResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            sha: 'same-sha-123',
          }),
      };

      fetchSpy.mockResolvedValueOnce(updateResponse);

      const hasUpdates = await handler.checkForUpdates(
        'test-user/test-repo/calendar.json',
        'same-sha-123'
      );

      expect(hasUpdates).toBe(false);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.github.com/repos/test-user/test-repo/contents/calendar.json',
        expect.any(Object)
      );
    });

    it('should check for updates with calendar ID fragments', async () => {
      const updateResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            sha: 'new-sha-123',
          }),
      };

      fetchSpy.mockResolvedValueOnce(updateResponse);

      const hasUpdates = await handler.checkForUpdates(
        'test-user/test-repo#calendar-id',
        'old-sha-456'
      );

      expect(hasUpdates).toBe(true);
      // Should check the index.json file, not the specific calendar
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.github.com/repos/test-user/test-repo/contents/index.json',
        expect.any(Object)
      );
    });
  });
});
