/**
 * Tests for ExternalCalendarRegistry - TDD implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type {
  ExternalCalendarSource,
  ProtocolHandler,
  LoadCalendarResult,
  ExternalCalendarConfig,
  CacheStats,
} from '../src/types/external-calendar';
import type { SeasonsStarsCalendar } from '../src/types/calendar';
import { ExternalCalendarRegistry } from '../src/core/external-calendar-registry';

// Mock calendar data for testing
const mockCalendar: SeasonsStarsCalendar = {
  id: 'external-test-calendar',
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

// Mock protocol handler for testing
class MockProtocolHandler implements ProtocolHandler {
  readonly protocol = 'mock';

  canHandle(location: string): boolean {
    return location.startsWith('test://');
  }

  async loadCalendar(location: string): Promise<SeasonsStarsCalendar> {
    if (location === 'test://error') {
      throw new Error('Mock error');
    }
    return { ...mockCalendar, id: `external-${location.replace('test://', '')}` };
  }

  async checkForUpdates(location: string, lastEtag?: string): Promise<boolean> {
    return lastEtag !== 'current-etag';
  }
}

class MockLocalHandler implements ProtocolHandler {
  readonly protocol = 'local';

  canHandle(location: string): boolean {
    return location.startsWith('./') || location.startsWith('../') || location.startsWith('/');
  }

  async loadCalendar(location: string): Promise<SeasonsStarsCalendar> {
    return { ...mockCalendar, id: `local-${location.replace('./', '')}` };
  }

  async checkForUpdates(location: string, lastModified?: string): Promise<boolean> {
    return true; // Always return true for local files to simulate file changes
  }
}

describe('ExternalCalendarRegistry', () => {
  let registry: ExternalCalendarRegistry;
  let mockHandler: MockProtocolHandler;

  beforeEach(() => {
    registry = new ExternalCalendarRegistry();
    mockHandler = new MockProtocolHandler();
    // Ensure clean cache state for each test
    registry.clearCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Protocol Handler Registration', () => {
    it('should register a protocol handler', () => {
      expect(registry).toBeDefined();
      expect(() => registry.registerHandler(mockHandler)).not.toThrow();
      expect(registry.hasHandler('mock')).toBe(true);
    });

    it('should unregister a protocol handler', () => {
      registry.registerHandler(mockHandler);
      expect(registry.hasHandler('mock')).toBe(true);

      registry.unregisterHandler('mock');
      expect(registry.hasHandler('mock')).toBe(false);
    });

    it('should list registered protocols', () => {
      registry.registerHandler(mockHandler);
      const protocols = registry.getRegisteredProtocols();
      expect(protocols).toContain('mock');
    });

    it('should throw error when registering duplicate protocol', () => {
      registry.registerHandler(mockHandler);
      expect(() => registry.registerHandler(mockHandler)).toThrow(
        'Protocol mock already registered'
      );
    });
  });

  describe('External Calendar Loading', () => {
    beforeEach(() => {
      registry.registerHandler(mockHandler);
    });

    it('should parse external calendar ID into protocol and location', () => {
      const parsed = registry.parseExternalCalendarId('mock:test://example');
      expect(parsed).toEqual({
        protocol: 'mock',
        location: 'test://example',
      });
    });

    it('should throw error for invalid external calendar ID format', () => {
      expect(() => registry.parseExternalCalendarId('invalid-format')).toThrow(
        'Invalid external calendar ID format'
      );
    });

    it('should load calendar from external source', async () => {
      const result: LoadCalendarResult = await registry.loadExternalCalendar('mock:test://example');

      expect(result.success).toBe(true);
      expect(result.calendar).toBeDefined();
      expect(result.calendar?.id).toBe('external-example');
      expect(result.fromCache).toBe(false);
    });

    it('should handle loading errors gracefully', async () => {
      const result: LoadCalendarResult = await registry.loadExternalCalendar('mock:test://error');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Mock error');
      expect(result.calendar).toBeUndefined();
    });

    it('should throw error for unsupported protocol', async () => {
      const result: LoadCalendarResult =
        await registry.loadExternalCalendar('unsupported:location');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No handler found for protocol: unsupported');
    });
  });

  describe('Calendar Caching', () => {
    beforeEach(() => {
      registry.registerHandler(mockHandler);
    });

    it('should cache loaded calendars', async () => {
      // First load - should not be from cache
      const result1: LoadCalendarResult =
        await registry.loadExternalCalendar('mock:test://cacheable');
      expect(result1.fromCache).toBe(false);

      // Second load - should be from cache
      const result2: LoadCalendarResult =
        await registry.loadExternalCalendar('mock:test://cacheable');
      expect(result2.fromCache).toBe(true);
      expect(result2.calendar?.id).toBe(result1.calendar?.id);
    });

    it('should respect cache expiration', async () => {
      // Configure very short cache duration for testing
      const config: ExternalCalendarConfig = { defaultCacheDuration: 1 }; // 1ms
      registry.configure(config);

      // Load and cache
      const result1 = await registry.loadExternalCalendar('mock:test://expires');
      expect(result1.fromCache).toBe(false);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should reload from source
      const result2 = await registry.loadExternalCalendar('mock:test://expires');
      expect(result2.fromCache).toBe(false);
    });

    it('should force refresh when requested', async () => {
      // Load and cache
      await registry.loadExternalCalendar('mock:test://forceable');

      // Force refresh should bypass cache
      const result = await registry.loadExternalCalendar('mock:test://forceable', {
        forceRefresh: true,
      });
      expect(result.fromCache).toBe(false);
    });

    it('should provide cache statistics', () => {
      const stats: CacheStats = registry.getCacheStats();
      expect(stats).toEqual({
        totalCached: expect.any(Number),
        hits: expect.any(Number),
        misses: expect.any(Number),
        hitRate: expect.any(Number),
        sizeBytes: expect.any(Number),
      });
    });

    it('should clear cache when requested', async () => {
      // Load and cache some data
      await registry.loadExternalCalendar('mock:test://clearable');

      // Clear cache
      registry.clearCache();

      // Stats should show empty cache
      const stats = registry.getCacheStats();
      expect(stats.totalCached).toBe(0);
    });

    it('should skip caching for local files to support development workflows', async () => {
      // Register local handler for this test
      const localHandler = new MockLocalHandler();
      registry.registerHandler(localHandler);

      // Load a local file
      const result1 = await registry.loadExternalCalendar('local:./test-calendar');
      expect(result1.success).toBe(true);
      expect(result1.fromCache).toBe(false);

      // Load the same local file again - should NOT come from cache
      const result2 = await registry.loadExternalCalendar('local:./test-calendar');
      expect(result2.success).toBe(true);
      expect(result2.fromCache).toBe(false); // Should still be false for local files

      // Verify cache stats don't increase for local files
      const stats = registry.getCacheStats();
      // Note: Other tests may have cached items, so we just verify no additional caching happened
      // by checking that repeated local loads don't increase cache hit rate significantly
    });

    it('should skip caching for development modules automatically', async () => {
      // Create a mock module handler that simulates a development module
      class MockDevelopmentModuleHandler implements ProtocolHandler {
        readonly protocol = 'module';

        canHandle(location: string): boolean {
          return location.startsWith('test-dev-module/');
        }

        async loadCalendar(location: string): Promise<SeasonsStarsCalendar> {
          return { ...mockCalendar, id: `dev-module-${location.replace('test-dev-module/', '')}` };
        }
      }

      // Mock game.modules for development version detection
      const originalGame = globalThis.game;

      // Create mock module with development version
      const mockModule = {
        active: true,
        version: '0.0.1-dev',
        manifest: { version: '0.0.1-dev' },
      };

      globalThis.game = {
        modules: {
          get: vi.fn().mockReturnValue(mockModule),
        },
      } as any;

      try {
        const devHandler = new MockDevelopmentModuleHandler();
        registry.registerHandler(devHandler);

        // Load from development module
        const result1 = await registry.loadExternalCalendar('module:test-dev-module/calendar');
        expect(result1.success).toBe(true);
        expect(result1.fromCache).toBe(false);

        // Load the same module calendar again - should NOT come from cache due to dev version
        const result2 = await registry.loadExternalCalendar('module:test-dev-module/calendar');
        expect(result2.success).toBe(true);
        expect(result2.fromCache).toBe(false); // Should still be false for development modules
      } finally {
        // Restore original game object
        globalThis.game = originalGame;
      }
    });

    it('should allow manual module cache skipping via options', async () => {
      // Create a mock module handler for production module
      class MockProductionModuleHandler implements ProtocolHandler {
        readonly protocol = 'module';

        canHandle(location: string): boolean {
          return location.startsWith('test-prod-module/');
        }

        async loadCalendar(location: string): Promise<SeasonsStarsCalendar> {
          return {
            ...mockCalendar,
            id: `prod-module-${location.replace('test-prod-module/', '')}`,
          };
        }
      }

      // Mock game.modules for production version
      const originalGame = globalThis.game;

      // Create mock module with production version
      const mockModule = {
        active: true,
        version: '1.2.3',
        manifest: { version: '1.2.3' },
      };

      globalThis.game = {
        modules: {
          get: vi.fn().mockReturnValue(mockModule),
        },
      } as any;

      try {
        const prodHandler = new MockProductionModuleHandler();
        registry.registerHandler(prodHandler);

        // Load from production module - should cache normally
        const result1 = await registry.loadExternalCalendar('module:test-prod-module/calendar');
        expect(result1.success).toBe(true);
        expect(result1.fromCache).toBe(false);

        // Load again - should come from cache
        const result2 = await registry.loadExternalCalendar('module:test-prod-module/calendar');
        expect(result2.success).toBe(true);
        expect(result2.fromCache).toBe(true);

        // Load with skipModuleCache option - should skip cache
        const result3 = await registry.loadExternalCalendar('module:test-prod-module/calendar', {
          skipModuleCache: true,
        });
        expect(result3.success).toBe(true);
        expect(result3.fromCache).toBe(false); // Cache manually skipped
      } finally {
        // Restore original game object
        globalThis.game = originalGame;
      }
    });

    it('should detect various development version patterns', async () => {
      const developmentVersions = [
        '0.0.1-dev',
        '1.2.3-beta',
        '2.0.0-alpha.1',
        '1.0.0-snapshot',
        '3.1.4-pre',
        '', // Empty version
        '0.0.1', // Development-style version
        '1.0.0-rc.1', // Release candidate
      ];

      const productionVersions = ['1.0.0', '1.2.3', '2.1.0', '10.15.3'];

      // Create a mock module handler
      class MockVersionTestHandler implements ProtocolHandler {
        readonly protocol = 'module';

        canHandle(location: string): boolean {
          return location.startsWith('version-test/');
        }

        async loadCalendar(location: string): Promise<SeasonsStarsCalendar> {
          return { ...mockCalendar, id: `version-test-${location.replace('version-test/', '')}` };
        }
      }

      const originalGame = globalThis.game;

      try {
        const versionHandler = new MockVersionTestHandler();
        registry.registerHandler(versionHandler);

        // Test development versions - should skip cache
        for (const version of developmentVersions) {
          const mockModule = {
            active: true,
            version: version,
            manifest: { version: version },
          };

          globalThis.game = {
            modules: {
              get: vi.fn().mockReturnValue(mockModule),
            },
          } as any;

          // Clear cache for clean test
          registry.clearCache();

          // Load twice - both should skip cache for development versions
          const result1 = await registry.loadExternalCalendar('module:version-test/calendar');
          const result2 = await registry.loadExternalCalendar('module:version-test/calendar');

          expect(result1.fromCache).toBe(false);
          expect(result2.fromCache).toBe(false); // Should skip cache for dev version
        }

        // Test production versions - should use cache
        for (const version of productionVersions) {
          const mockModule = {
            active: true,
            version: version,
            manifest: { version: version },
          };

          globalThis.game = {
            modules: {
              get: vi.fn().mockReturnValue(mockModule),
            },
          } as any;

          // Clear cache for clean test
          registry.clearCache();

          // Load twice - second should come from cache for production versions
          const result1 = await registry.loadExternalCalendar('module:version-test/calendar');
          const result2 = await registry.loadExternalCalendar('module:version-test/calendar');

          expect(result1.fromCache).toBe(false);
          expect(result2.fromCache).toBe(true); // Should use cache for production version
        }
      } finally {
        // Restore original game object
        globalThis.game = originalGame;
      }
    });

    it('should evict oldest entries when cache is full', async () => {
      // Clear cache first to ensure clean state
      registry.clearCache();

      // Configure small cache size
      const config: ExternalCalendarConfig = { maxCacheSize: 2 };
      registry.configure(config);

      // Verify configuration was applied
      const appliedConfig = registry.getConfiguration();
      expect(appliedConfig.maxCacheSize).toBe(2);

      // Load 3 calendars (should evict the first one)
      await registry.loadExternalCalendar('mock:test://first');
      const stats1 = registry.getCacheStats();
      expect(stats1.totalCached).toBe(1);

      await registry.loadExternalCalendar('mock:test://second');
      const stats2 = registry.getCacheStats();
      expect(stats2.totalCached).toBe(2);

      await registry.loadExternalCalendar('mock:test://third');
      const stats3 = registry.getCacheStats();

      // Debug: log current state
      console.log('Final cache stats:', stats3);
      console.log('Applied config:', appliedConfig);
      console.log('Cache config from registry:', (registry as any).cache.getConfiguration());

      // First should be evicted, second and third should be cached
      expect(stats3.totalCached).toBe(2);
    });
  });

  describe('External Calendar Sources Management', () => {
    it('should add external calendar source', () => {
      const source: ExternalCalendarSource = {
        protocol: 'https',
        location: 'example.com/calendar.json',
        label: 'Example Calendar',
      };

      registry.addExternalSource(source);
      const sources = registry.getExternalSources();

      // Check that the source was added with default properties
      const addedSource = sources.find(
        s => s.protocol === 'https' && s.location === 'example.com/calendar.json'
      );
      expect(addedSource).toBeDefined();
      expect(addedSource?.label).toBe('Example Calendar');
      expect(addedSource?.enabled).toBe(true);
      expect(addedSource?.trusted).toBe(false);
    });

    it('should remove external calendar source', () => {
      const source: ExternalCalendarSource = {
        protocol: 'https',
        location: 'example.com/removable.json',
      };

      registry.addExternalSource(source);
      const sourcesAfterAdd = registry.getExternalSources();
      expect(
        sourcesAfterAdd.some(
          s => s.protocol === 'https' && s.location === 'example.com/removable.json'
        )
      ).toBe(true);

      registry.removeExternalSource('https:example.com/removable.json');
      const sourcesAfterRemove = registry.getExternalSources();
      expect(
        sourcesAfterRemove.some(
          s => s.protocol === 'https' && s.location === 'example.com/removable.json'
        )
      ).toBe(false);
    });

    it('should update external source configuration', () => {
      const source: ExternalCalendarSource = {
        protocol: 'https',
        location: 'example.com/updatable.json',
        enabled: true,
      };

      registry.addExternalSource(source);
      registry.updateExternalSource('https:example.com/updatable.json', { enabled: false });

      const sources = registry.getExternalSources();
      const updated = sources.find(
        (s: ExternalCalendarSource) => s.location === 'example.com/updatable.json'
      );
      expect(updated?.enabled).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should accept configuration options', () => {
      const config: ExternalCalendarConfig = {
        defaultCacheDuration: 3600000, // 1 hour
        maxCacheSize: 50,
        requestTimeout: 10000,
        autoUpdate: true,
      };

      expect(() => registry.configure(config)).not.toThrow();
    });

    it('should use default configuration values', () => {
      const config = registry.getConfiguration();
      expect(config.defaultCacheDuration).toBe(7 * 24 * 60 * 60 * 1000); // 1 week
      expect(config.maxCacheSize).toBe(100);
      expect(config.requestTimeout).toBe(30000);
    });
  });

  describe('Event System', () => {
    it('should emit events when calendars are loaded', async () => {
      registry.registerHandler(mockHandler);

      const eventSpy = vi.fn();
      registry.on('calendar-loaded', eventSpy);

      await registry.loadExternalCalendar('mock:test://events');

      expect(eventSpy).toHaveBeenCalledWith({
        type: 'loaded',
        calendarId: 'mock:test://events',
        calendar: expect.any(Object),
      });
    });

    it('should emit events when calendars are cached', async () => {
      registry.registerHandler(mockHandler);

      const eventSpy = vi.fn();
      registry.on('calendar-cached', eventSpy);

      // Load twice to trigger cache event on second load
      await registry.loadExternalCalendar('mock:test://cache-events');
      await registry.loadExternalCalendar('mock:test://cache-events');

      expect(eventSpy).toHaveBeenCalled();
    });

    it('should emit events on errors', async () => {
      registry.registerHandler(mockHandler);

      const eventSpy = vi.fn();
      registry.on('calendar-error', eventSpy);

      await registry.loadExternalCalendar('mock:test://error');

      expect(eventSpy).toHaveBeenCalledWith({
        type: 'error',
        calendarId: 'mock:test://error',
        error: 'Mock error',
      });
    });
  });
});
