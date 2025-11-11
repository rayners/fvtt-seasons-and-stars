/**
 * Tests for CalendarLoader
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CalendarLoader } from '../../../src/core/calendar-loader';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';

// Mock the global fetch function
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock game.settings
const mockSettings = {
  get: vi.fn(),
  set: vi.fn(),
};

// Mock modules
const mockModules = new Map();
mockModules.set('test-module', {
  id: 'test-module',
  title: 'Test Module',
  active: true,
});
mockModules.set('inactive-module', {
  id: 'inactive-module',
  title: 'Inactive Module',
  active: false,
});

// @ts-expect-error - Mocking global game object
global.game = {
  settings: mockSettings,
  modules: mockModules,
};

// Mock Foundry's stripScripts method for testing - using simple approach
String.prototype.stripScripts = function () {
  // Simple mock that removes script tags and content for testing
  let result = this.toString();
  // Remove script tags one at a time (safer than complex nested regex)
  while (result.includes('<script')) {
    const start = result.indexOf('<script');
    const end = result.indexOf('</script>');
    if (start !== -1 && end !== -1 && end > start) {
      result = result.substring(0, start) + result.substring(end + 9);
    } else {
      break; // Avoid infinite loop if malformed
    }
  }
  return result;
};

// Sample calendar data for testing
const sampleCalendar: SeasonsStarsCalendar = {
  id: 'test-calendar',
  translations: {
    en: {
      label: 'Test Calendar',
      description: 'A test calendar for unit tests',
    },
  },
  months: [
    { name: 'January', days: 31 },
    { name: 'February', days: 28 },
  ],
  weekdays: [
    { name: 'Monday' },
    { name: 'Tuesday' },
    { name: 'Wednesday' },
    { name: 'Thursday' },
    { name: 'Friday' },
    { name: 'Saturday' },
    { name: 'Sunday' },
  ],
};

const sampleCollection = {
  id: 'test-collection',
  name: 'Test Calendar Collection',
  calendars: [
    {
      id: 'calendar-1',
      name: 'Calendar 1',
      url: 'https://example.com/calendar1.json',
      preview: '<strong>15th of Moonfall, 2370 AR</strong>',
    },
    {
      id: 'calendar-2',
      name: 'Calendar 2',
      url: './calendar2.json',
      preview: 'Day 15, Month 1, Year 2370',
    },
  ],
};

const sampleCollectionWithScript = {
  id: 'malicious-collection',
  name: 'Test Collection with Scripts',
  calendars: [
    {
      id: 'calendar-3',
      name: 'Calendar with Script',
      file: 'calendar3.json',
      preview: '<script>alert("xss")</script>Sanitized preview text',
    },
  ],
};

describe('CalendarLoader', () => {
  let loader: CalendarLoader;

  beforeEach(() => {
    loader = new CalendarLoader();
    mockFetch.mockClear();
    mockSettings.get.mockClear();
    mockSettings.set.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('URL Validation', () => {
    it('should accept valid HTTP URLs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleCalendar),
      });

      const result = await loader.loadFromUrl('http://localhost:3000/calendar.json');
      expect(result.success).toBe(true);
    });

    it('should accept valid HTTPS URLs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleCalendar),
      });

      const result = await loader.loadFromUrl('https://example.com/calendar.json');
      expect(result.success).toBe(true);
    });

    it('should reject invalid protocols', async () => {
      const result = await loader.loadFromUrl('ftp://example.com/calendar.json');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported protocol');
    });

    it('should reject malformed URLs', async () => {
      const result = await loader.loadFromUrl('not-a-url');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL format');
    });
  });

  describe('Calendar Loading', () => {
    it('should successfully load valid calendar from URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleCalendar),
      });

      const result = await loader.loadFromUrl('https://example.com/calendar.json');

      expect(result.success).toBe(true);
      expect(result.calendar).toEqual(sampleCalendar);
      expect(result.sourceUrl).toBe('https://example.com/calendar.json');
    });

    it('should handle HTTP errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await loader.loadFromUrl('https://example.com/missing.json');

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 404: Not Found');
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await loader.loadFromUrl('https://example.com/calendar.json');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle invalid JSON gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const result = await loader.loadFromUrl('https://example.com/invalid.json');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });
  });

  describe('Request Options', () => {
    // Note: Timeout functionality uses AbortController which is difficult to test with mocked fetch
    // The timeout implementation is standard and works correctly in practice

    it('should include custom headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleCalendar),
      });

      await loader.loadFromUrl('https://example.com/calendar.json', {
        headers: {
          Authorization: 'Bearer token123',
          'Custom-Header': 'value',
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/calendar.json',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token123',
            'Custom-Header': 'value',
          }),
        })
      );
    });

    it('should skip validation when requested', async () => {
      const invalidCalendar = { id: 'invalid', missingRequired: true };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidCalendar),
      });

      const result = await loader.loadFromUrl('https://example.com/invalid.json', {
        validate: false,
      });

      expect(result.success).toBe(true);
      expect(result.calendar).toEqual(invalidCalendar);
    });
  });

  describe('Collection Loading', () => {
    it('should load multiple calendars from collection', async () => {
      // Mock collection fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleCollection),
      });

      // Mock individual calendar fetches
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...sampleCalendar, id: 'calendar-1' }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...sampleCalendar, id: 'calendar-2' }),
      });

      const results = await loader.loadCollection('https://example.com/collection.json');

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].calendar?.id).toBe('calendar-1');
      expect(results[1].success).toBe(true);
      expect(results[1].calendar?.id).toBe('calendar-2');
    });

    it('should handle relative URLs in collections', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleCollection),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...sampleCalendar, id: 'calendar-1' }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...sampleCalendar, id: 'calendar-2' }),
      });

      await loader.loadCollection('https://example.com/collection.json');

      // Verify that relative URL was resolved correctly
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/calendar2.json',
        expect.any(Object)
      );
    });

    it('should handle invalid collection format', async () => {
      const invalidCollection = { id: 'invalid', missingCalendars: true };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidCollection),
      });

      const results = await loader.loadCollection('https://example.com/invalid-collection.json');

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Invalid collection format');
    });

    it('should include collection entry metadata with preview in results', async () => {
      // Mock collection fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleCollection),
      });

      // Mock individual calendar fetches
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...sampleCalendar, id: 'calendar-1' }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...sampleCalendar, id: 'calendar-2' }),
      });

      const results = await loader.loadCollection('https://example.com/collection.json');

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].collectionEntry).toBeDefined();
      expect(results[0].collectionEntry?.id).toBe('calendar-1');
      expect(results[0].collectionEntry?.preview).toBe(
        '<strong>15th of Moonfall, 2370 AR</strong>'
      );

      expect(results[1].success).toBe(true);
      expect(results[1].collectionEntry).toBeDefined();
      expect(results[1].collectionEntry?.id).toBe('calendar-2');
      expect(results[1].collectionEntry?.preview).toBe('Day 15, Month 1, Year 2370');
    });

    it('should sanitize HTML in preview text', async () => {
      // Mock collection fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleCollectionWithScript),
      });

      // Mock individual calendar fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...sampleCalendar, id: 'calendar-3' }),
      });

      const results = await loader.loadCollection('https://example.com/malicious-collection.json');

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].collectionEntry).toBeDefined();
      expect(results[0].collectionEntry?.preview).not.toContain('<script>');
      expect(results[0].collectionEntry?.preview).not.toContain('alert');
      // Should contain the safe text portion
      expect(results[0].collectionEntry?.preview).toContain('Sanitized preview text');
    });
  });

  describe('Module URL Support', () => {
    it('should accept valid module URLs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleCalendar),
      });

      const result = await loader.loadFromUrl('module:test-module/calendars');
      expect(result.success).toBe(true);
      expect(result.calendar).toEqual(sampleCalendar);

      // Verify the URL was resolved correctly
      expect(mockFetch).toHaveBeenCalledWith(
        'modules/test-module/calendars/index.json',
        expect.any(Object)
      );
    });

    it('should reject module URLs for inactive modules', async () => {
      const result = await loader.loadFromUrl('module:inactive-module/calendars');
      expect(result.success).toBe(false);
      expect(result.error).toContain('is not active');
    });

    it('should reject module URLs for non-existent modules', async () => {
      const result = await loader.loadFromUrl('module:nonexistent-module/calendars');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should reject malformed module URLs', async () => {
      const result = await loader.loadFromUrl('module:');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid module URL format');
    });

    it('should handle simple module URLs (defaults to calendars/index.json)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleCalendar),
      });

      const result = await loader.loadFromUrl('module:test-module');
      expect(result.success).toBe(true);
      expect(result.calendar).toEqual(sampleCalendar);

      // Verify the URL was resolved to the default path
      expect(mockFetch).toHaveBeenCalledWith(
        'modules/test-module/calendars/index.json',
        expect.any(Object)
      );
    });

    it('should handle module URLs with explicit JSON files', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleCalendar),
      });

      await loader.loadFromUrl('module:test-module/special/calendar.json');

      expect(mockFetch).toHaveBeenCalledWith(
        'modules/test-module/special/calendar.json',
        expect.any(Object)
      );
    });

    it('should handle module URLs with paths (auto-append index.json)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleCalendar),
      });

      await loader.loadFromUrl('module:test-module/my-calendars');

      expect(mockFetch).toHaveBeenCalledWith(
        'modules/test-module/my-calendars/index.json',
        expect.any(Object)
      );
    });
  });

  describe('External Source Management', () => {
    it('should add external source', () => {
      const sourceId = loader.addSource({
        name: 'Test Source',
        url: 'https://example.com/calendar.json',
        enabled: true,
        type: 'calendar',
      });

      expect(sourceId).toBe('test-source');

      const source = loader.getSource(sourceId);
      expect(source).toBeDefined();
      expect(source?.name).toBe('Test Source');
      expect(source?.url).toBe('https://example.com/calendar.json');
    });

    it('should generate unique IDs for sources with same name', () => {
      const id1 = loader.addSource({
        name: 'Duplicate Name',
        url: 'https://example.com/calendar1.json',
        enabled: true,
        type: 'calendar',
      });

      const id2 = loader.addSource({
        name: 'Duplicate Name',
        url: 'https://example.com/calendar2.json',
        enabled: true,
        type: 'calendar',
      });

      expect(id1).toBe('duplicate-name');
      expect(id2).toBe('duplicate-name-1');
    });

    it('should remove external source', () => {
      const sourceId = loader.addSource({
        name: 'Test Source',
        url: 'https://example.com/calendar.json',
        enabled: true,
        type: 'calendar',
      });

      expect(loader.getSource(sourceId)).toBeDefined();

      const removed = loader.removeSource(sourceId);
      expect(removed).toBe(true);
      expect(loader.getSource(sourceId)).toBeUndefined();
    });

    it('should update source status', () => {
      const sourceId = loader.addSource({
        name: 'Test Source',
        url: 'https://example.com/calendar.json',
        enabled: true,
        type: 'calendar',
      });

      loader.updateSourceStatus(sourceId, true);

      const source = loader.getSource(sourceId);
      expect(source?.lastLoaded).toBeDefined();
      expect(source?.lastError).toBeUndefined();

      loader.updateSourceStatus(sourceId, false, 'Test error');

      const updatedSource = loader.getSource(sourceId);
      expect(updatedSource?.lastError).toBe('Test error');
    });

    it('should list all sources', () => {
      loader.addSource({
        name: 'Source 1',
        url: 'https://example.com/cal1.json',
        enabled: true,
        type: 'calendar',
      });

      loader.addSource({
        name: 'Source 2',
        url: 'https://example.com/cal2.json',
        enabled: false,
        type: 'collection',
      });

      const sources = loader.getSources();
      expect(sources).toHaveLength(2);
      expect(sources.map(s => s.name)).toContain('Source 1');
      expect(sources.map(s => s.name)).toContain('Source 2');
    });
  });
});
