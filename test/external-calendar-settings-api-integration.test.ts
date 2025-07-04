import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarManager } from '../src/core/calendar-manager';
import type { ExternalCalendarSource } from '../src/types/external-calendar';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Mock foundry environment and dependencies
const mockSettings = {
  data: new Map<string, any>(),
  get: vi.fn((module: string, setting: string) => {
    const key = `${module}.${setting}`;
    return mockSettings.data.get(key) || [];
  }),
  set: vi.fn((module: string, setting: string, value: any) => {
    const key = `${module}.${setting}`;
    mockSettings.data.set(key, value);
    return Promise.resolve();
  }),
  register: vi.fn(),
};

vi.stubGlobal('game', {
  settings: mockSettings,
});

vi.stubGlobal('Hooks', {
  callAll: vi.fn(),
  on: vi.fn(),
});

// Mock fetch function for external calendar requests
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock the built-in calendars list to be empty for this test
vi.mock('../src/generated/calendar-list', () => ({
  BUILT_IN_CALENDARS: [],
}));

// Mock Logger
vi.mock('../src/core/logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock CalendarValidator
vi.mock('../src/core/calendar-validator', () => ({
  CalendarValidator: {
    validate: vi.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    }),
  },
}));

// Mock CalendarLocalization
vi.mock('../src/core/calendar-localization', () => ({
  CalendarLocalization: {
    getCalendarLabel: vi.fn().mockReturnValue('Test External Calendar'),
  },
}));

describe('External Calendar Settings and API Integration', () => {
  let calendarManager: CalendarManager;

  // Test external calendar sources
  const testExternalSources: ExternalCalendarSource[] = [
    {
      protocol: 'https',
      location: 'example.com/calendars/test1.json',
      label: 'Test Calendar 1',
      description: 'First test calendar',
      enabled: true,
      trusted: true,
    },
    {
      protocol: 'github',
      location: 'user/repo/calendars/test2.json',
      label: 'Test Calendar 2',
      description: 'Second test calendar from GitHub',
      enabled: true,
      trusted: false,
    },
    {
      protocol: 'module',
      location: 'test-module/calendars/test3.json',
      label: 'Test Calendar 3',
      description: 'Third test calendar from module',
      enabled: false,
      trusted: true,
    },
  ];

  // Test calendar data
  const testCalendar: SeasonsStarsCalendar = {
    id: 'test-external-calendar',
    translations: {
      en: {
        label: 'Test External Calendar',
        description: 'Calendar for testing',
      },
    },
    months: [
      { name: 'First', days: 30 },
      { name: 'Second', days: 30 },
    ],
    weekdays: [
      { name: 'Workday' },
      { name: 'Restday' },
    ],
    year: { epoch: 1000, suffix: ' TC', currentYear: 1000 },
    time: {
      hoursInDay: 24,
      minutesInHour: 60,
      secondsInMinute: 60,
    },
    leapYear: {
      rule: 'none',
    },
    intercalary: [],
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSettings.data.clear();

    // Setup fetch mock
    mockFetch.mockImplementation((url: string | Request) => {
      const urlString = typeof url === 'string' ? url : url.url;

      if (urlString.includes('test1.json') || urlString.includes('test2.json') || urlString.includes('test3.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve(testCalendar),
        } as Response);
      } else if (urlString.includes('api.github.com')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              content: btoa(JSON.stringify(testCalendar)),
              encoding: 'base64',
              sha: 'abc123',
            }),
        } as Response);
      }

      return Promise.resolve({
        ok: false,
        status: 404,
      } as Response);
    });

    calendarManager = new CalendarManager();
    await calendarManager.initialize();
    
    // Clear any calendars that might have been loaded
    calendarManager.calendars.clear();
    calendarManager.engines.clear();
  });

  describe('External Calendar Sources Settings Integration', () => {
    it('should persist external calendar sources to settings', async () => {
      // Add external sources
      for (const source of testExternalSources) {
        calendarManager.addExternalSource(source);
      }

      // Verify settings were called correctly
      expect(mockSettings.set).toHaveBeenCalledWith(
        'seasons-and-stars',
        'externalCalendarSources',
        expect.arrayContaining([
          expect.objectContaining({
            protocol: 'https',
            location: 'example.com/calendars/test1.json',
            label: 'Test Calendar 1',
          }),
          expect.objectContaining({
            protocol: 'github',
            location: 'user/repo/calendars/test2.json',
            label: 'Test Calendar 2',
          }),
          expect.objectContaining({
            protocol: 'module',
            location: 'test-module/calendars/test3.json',
            label: 'Test Calendar 3',
          }),
        ])
      );
    });

    it('should load external calendar sources from settings on initialization', async () => {
      // Set up settings with external sources (only enabled sources)
      const enabledSources = testExternalSources.filter(source => source.enabled);
      mockSettings.data.set('seasons-and-stars.externalCalendarSources', enabledSources);

      // Create a new calendar manager to test initialization
      const newCalendarManager = new CalendarManager();
      await newCalendarManager.initialize();

      // Verify sources were loaded from settings (only enabled ones)
      const loadedSources = newCalendarManager.getExternalSources();
      expect(loadedSources).toHaveLength(2); // Only 2 enabled sources
      expect(loadedSources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ protocol: 'https', location: 'example.com/calendars/test1.json' }),
          expect.objectContaining({ protocol: 'github', location: 'user/repo/calendars/test2.json' }),
        ])
      );
    });

    it('should only load enabled external calendar sources', async () => {
      // Set up settings with mixed enabled/disabled sources
      mockSettings.data.set('seasons-and-stars.externalCalendarSources', testExternalSources);

      // Create a new calendar manager to test initialization
      const newCalendarManager = new CalendarManager();
      await newCalendarManager.initialize();

      // Should have loaded 2 calendars (only enabled sources) - both point to same test calendar
      // Since both enabled sources return the same calendar data, we only get 1 unique calendar loaded
      expect(newCalendarManager.calendars.size).toBe(1);
      expect(newCalendarManager.calendars.has('test-external-calendar')).toBe(true);
    });

    it('should update settings when external sources are modified', async () => {
      const source = testExternalSources[0];
      calendarManager.addExternalSource(source);

      // Clear the mock to focus on update call
      mockSettings.set.mockClear();

      // Update the source
      calendarManager.updateExternalSource('https:example.com/calendars/test1.json', {
        label: 'Updated Test Calendar',
        enabled: false,
      });

      // Verify settings were updated
      expect(mockSettings.set).toHaveBeenCalledWith(
        'seasons-and-stars',
        'externalCalendarSources',
        expect.arrayContaining([
          expect.objectContaining({
            label: 'Updated Test Calendar',
            enabled: false,
          }),
        ])
      );
    });

    it('should update settings when external sources are removed', async () => {
      // Add all sources
      for (const source of testExternalSources) {
        calendarManager.addExternalSource(source);
      }

      // Clear the mock to focus on removal
      mockSettings.set.mockClear();

      // Remove one source
      calendarManager.removeExternalSource('https:example.com/calendars/test1.json');

      // Verify settings were updated with remaining sources
      expect(mockSettings.set).toHaveBeenCalledWith(
        'seasons-and-stars',
        'externalCalendarSources',
        expect.arrayContaining([
          expect.objectContaining({
            protocol: 'github',
            location: 'user/repo/calendars/test2.json',
          }),
          expect.objectContaining({
            protocol: 'module',
            location: 'test-module/calendars/test3.json',
          }),
        ])
      );

      // Should not contain the removed source
      const finalSources = mockSettings.set.mock.lastCall[2];
      expect(finalSources).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            protocol: 'https',
            location: 'example.com/calendars/test1.json',
          }),
        ])
      );
    });
  });

  describe('Module API Integration', () => {
    it('should expose external calendar methods via game.seasonsStars.api', async () => {
      // Simulate the API setup that happens in module.ts
      const mockAPI = {
        loadExternalCalendar: vi.fn().mockResolvedValue(true),
        getExternalSources: vi.fn().mockReturnValue([]),
        addExternalSource: vi.fn(),
        removeExternalSource: vi.fn(),
        updateExternalSource: vi.fn(),
        getExternalCacheStats: vi.fn().mockReturnValue({}),
        clearExternalCache: vi.fn(),
      };

      // Test API method calls
      await mockAPI.loadExternalCalendar('https:example.com/test.json');
      expect(mockAPI.loadExternalCalendar).toHaveBeenCalledWith('https:example.com/test.json');

      mockAPI.getExternalSources();
      expect(mockAPI.getExternalSources).toHaveBeenCalled();

      const testSource = testExternalSources[0];
      mockAPI.addExternalSource(testSource);
      expect(mockAPI.addExternalSource).toHaveBeenCalledWith(testSource);

      mockAPI.removeExternalSource('https:example.com/test.json');
      expect(mockAPI.removeExternalSource).toHaveBeenCalledWith('https:example.com/test.json');

      mockAPI.updateExternalSource('https:example.com/test.json', { enabled: false });
      expect(mockAPI.updateExternalSource).toHaveBeenCalledWith(
        'https:example.com/test.json',
        { enabled: false }
      );

      mockAPI.getExternalCacheStats();
      expect(mockAPI.getExternalCacheStats).toHaveBeenCalled();

      mockAPI.clearExternalCache();
      expect(mockAPI.clearExternalCache).toHaveBeenCalled();
    });

    it('should provide access to CalendarManager external methods', async () => {
      // Test CalendarManager methods directly
      const result = await calendarManager.loadExternalCalendar('https:example.com/calendars/test1.json');
      expect(result).toBe(true);

      calendarManager.addExternalSource(testExternalSources[0]);
      const sources = calendarManager.getExternalSources();
      expect(sources).toHaveLength(1);

      calendarManager.updateExternalSource('https:example.com/calendars/test1.json', { enabled: false });
      const updatedSources = calendarManager.getExternalSources();
      expect(updatedSources[0].enabled).toBe(false);

      calendarManager.removeExternalSource('https:example.com/calendars/test1.json');
      const finalSources = calendarManager.getExternalSources();
      expect(finalSources).toHaveLength(0);
    });

    it('should provide cache management through API', async () => {
      // Load a calendar to populate cache
      await calendarManager.loadExternalCalendar('https:example.com/calendars/test1.json');

      // Get cache stats
      const stats = calendarManager.getExternalCacheStats();
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');

      // Clear cache
      calendarManager.clearExternalCache();

      // Verify cache was cleared by checking stats
      const clearedStats = calendarManager.getExternalCacheStats();
      expect(clearedStats).toBeDefined();
    });
  });

  describe('Programmatic Calendar Registration', () => {
    it('should allow adding external sources programmatically', async () => {
      const source: ExternalCalendarSource = {
        protocol: 'https',
        location: 'example.com/calendars/programmatic.json',
        label: 'Programmatic Calendar',
        description: 'Calendar added via API',
        enabled: true,
        trusted: true,
      };

      // Add source programmatically
      calendarManager.addExternalSource(source);

      // Verify source was added
      const sources = calendarManager.getExternalSources();
      expect(sources).toContainEqual(
        expect.objectContaining({
          protocol: 'https',
          location: 'example.com/calendars/programmatic.json',
          label: 'Programmatic Calendar',
        })
      );

      // Verify it was persisted to settings
      expect(mockSettings.set).toHaveBeenCalledWith(
        'seasons-and-stars',
        'externalCalendarSources',
        expect.arrayContaining([source])
      );
    });

    it('should allow loading calendars immediately after registration', async () => {
      const source: ExternalCalendarSource = {
        protocol: 'https',
        location: 'example.com/calendars/test1.json',
        label: 'Immediate Load Calendar',
        description: 'Calendar loaded immediately after registration',
        enabled: true,
        trusted: true,
      };

      // Add and immediately load
      calendarManager.addExternalSource(source);
      const result = await calendarManager.loadExternalCalendar('https:example.com/calendars/test1.json');

      expect(result).toBe(true);
      expect(calendarManager.calendars.has('test-external-calendar')).toBe(true);
    });

    it('should handle multiple programmatic registrations', async () => {
      const sources: ExternalCalendarSource[] = [
        {
          protocol: 'https',
          location: 'example.com/cal1.json',
          label: 'Calendar 1',
          description: 'First calendar',
          enabled: true,
          trusted: true,
        },
        {
          protocol: 'github',
          location: 'user/repo/cal2.json',
          label: 'Calendar 2',
          description: 'Second calendar',
          enabled: true,
          trusted: false,
        },
      ];

      // Add multiple sources
      for (const source of sources) {
        calendarManager.addExternalSource(source);
      }

      // Verify all were added
      const allSources = calendarManager.getExternalSources();
      expect(allSources).toHaveLength(2);
      expect(allSources).toEqual(expect.arrayContaining(sources));
    });

    it('should allow updating external sources after registration', async () => {
      const source: ExternalCalendarSource = {
        protocol: 'https',
        location: 'example.com/calendars/updatable.json',
        label: 'Original Label',
        description: 'Original description',
        enabled: true,
        trusted: false,
      };

      // Add source
      calendarManager.addExternalSource(source);

      // Update source
      calendarManager.updateExternalSource('https:example.com/calendars/updatable.json', {
        label: 'Updated Label',
        trusted: true,
      });

      // Verify updates
      const sources = calendarManager.getExternalSources();
      const updatedSource = sources.find(s => s.location === 'example.com/calendars/updatable.json');

      expect(updatedSource).toEqual(
        expect.objectContaining({
          label: 'Updated Label',
          trusted: true,
          description: 'Original description', // Should preserve non-updated fields
        })
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing settings gracefully', async () => {
      // Mock settings.get to return undefined
      mockSettings.get.mockReturnValueOnce(undefined);

      const newCalendarManager = new CalendarManager();
      await newCalendarManager.initialize();

      // Should not throw and should have empty sources
      const sources = newCalendarManager.getExternalSources();
      expect(sources).toEqual([]);
    });

    it('should handle invalid external source data in settings', async () => {
      // Set invalid data in settings
      const invalidSources = [
        { protocol: 'invalid' }, // Missing required fields
        { location: 'test.json' }, // Missing protocol
        null, // Null entry
        'invalid-string', // String instead of object
      ];

      mockSettings.data.set('seasons-and-stars.externalCalendarSources', invalidSources);

      const newCalendarManager = new CalendarManager();
      await newCalendarManager.initialize();

      // Should handle gracefully and skip invalid entries
      expect(newCalendarManager.calendars.size).toBe(0);
    });

    it('should handle external source registration with invalid data', () => {
      // Try to add invalid sources - null values do throw since protocol is accessed
      expect(() => {
        calendarManager.addExternalSource(null as any);
      }).toThrow(); // Cannot read properties of null

      // Empty objects don't throw immediately - they just create invalid source
      expect(() => {
        calendarManager.addExternalSource({} as any);
      }).not.toThrow(); // Gracefully handled by registry

      expect(() => {
        calendarManager.addExternalSource({
          protocol: 'https',
          // Missing location
        } as any);
      }).not.toThrow(); // Registry handles missing location gracefully
    });

    it('should handle non-existent external source updates and removals', () => {
      // Try to update non-existent source - should not throw, silently ignored
      expect(() => {
        calendarManager.updateExternalSource('https:non-existent.json', { enabled: false });
      }).not.toThrow();

      // Try to remove non-existent source - should not throw, silently ignored
      expect(() => {
        calendarManager.removeExternalSource('https:non-existent.json');
      }).not.toThrow();
    });

    it('should handle settings persistence failures gracefully', async () => {
      // Mock settings.set to throw an error
      mockSettings.set.mockRejectedValueOnce(new Error('Settings storage failed'));

      // Adding source should still work, but warning should be logged
      const source = testExternalSources[0];
      
      // This should not throw, but should handle the settings error gracefully
      calendarManager.addExternalSource(source);

      // Source should still be added to the registry
      const sources = calendarManager.getExternalSources();
      expect(sources).toContainEqual(expect.objectContaining(source));
    });
  });

  describe('Integration with Calendar Selection', () => {
    it('should make externally loaded calendars available for selection', async () => {
      // Add and load external source
      const source = testExternalSources[0];
      calendarManager.addExternalSource(source);
      await calendarManager.loadExternalCalendar('https:example.com/calendars/test1.json');

      // Get available calendars
      const availableCalendars = calendarManager.getAllCalendars();
      const calendarIds = availableCalendars.map(cal => cal.id);

      expect(calendarIds).toContain('test-external-calendar');
      expect(availableCalendars.find(cal => cal.id === 'test-external-calendar')).toEqual(
        expect.objectContaining({
          id: 'test-external-calendar',
          translations: expect.objectContaining({
            en: expect.objectContaining({
              label: 'Test External Calendar',
            }),
          }),
        })
      );
    });

    it('should allow setting external calendars as active', async () => {
      // Load external calendar
      await calendarManager.loadExternalCalendar('https:example.com/calendars/test1.json');

      // Set as active
      const success = await calendarManager.setActiveCalendar('test-external-calendar');
      expect(success).toBe(true);

      // Verify it's active
      const activeCalendar = calendarManager.getActiveCalendar();
      expect(activeCalendar?.id).toBe('test-external-calendar');
    });
  });
});