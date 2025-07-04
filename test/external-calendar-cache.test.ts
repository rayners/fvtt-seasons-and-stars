/**
 * Tests for ExternalCalendarCache - TDD implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { 
  CachedCalendarData, 
  ExternalCalendarSource,
  CacheStats
} from '../src/types/external-calendar';
import type { SeasonsStarsCalendar } from '../src/types/calendar';
import { ExternalCalendarCache } from '../src/core/external-calendar-cache';

// Mock calendar data for testing
const mockCalendar: SeasonsStarsCalendar = {
  id: 'test-cached-calendar',
  label: 'Test Cached Calendar',
  description: 'A test calendar for cache testing',
  months: [
    { name: 'CacheMonth', days: 30 }
  ],
  weekdays: [
    { name: 'CacheDay' }
  ],
  year: {
    epoch: 0,
    currentYear: 2024
  },
  translations: {
    en: {
      label: 'Test Cached Calendar',
      description: 'A test calendar'
    }
  }
};

const mockSource: ExternalCalendarSource = {
  protocol: 'https',
  location: 'example.com/calendar.json',
  label: 'Test Source'
};

describe('ExternalCalendarCache', () => {
  let cache: ExternalCalendarCache;

  beforeEach(() => {
    cache = new ExternalCalendarCache();

    // Mock Date.now for consistent testing
    vi.spyOn(Date, 'now').mockReturnValue(1000000000); // Fixed timestamp
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Cache Operations', () => {
    it('should store calendar data in cache', () => {
      expect(cache).toBeDefined();
      
      const cacheKey = 'https:example.com/calendar.json';
      const expiresAt = Date.now() + 86400000; // 24 hours
      
      expect(() => cache.set(cacheKey, mockCalendar, mockSource, expiresAt)).not.toThrow();
    });

    it('should retrieve cached calendar data', () => {
      const cacheKey = 'https:example.com/calendar.json';
      const expiresAt = Date.now() + 86400000; // 24 hours
      
      cache.set(cacheKey, mockCalendar, mockSource, expiresAt);
      
      const cached: CachedCalendarData | null = cache.get(cacheKey);
      expect(cached).toBeDefined();
      expect(cached?.calendar.id).toBe('test-cached-calendar');
      expect(cached?.source).toEqual(mockSource);
      expect(cached?.expiresAt).toBe(expiresAt);
    });

    it('should return null for non-existent cache entries', () => {
      const cached = cache.get('non-existent:key');
      expect(cached).toBeNull();
    });

    it('should check if cache entry exists', () => {
      const cacheKey = 'https:example.com/exists.json';
      
      expect(cache.has(cacheKey)).toBe(false);
      
      cache.set(cacheKey, mockCalendar, mockSource, Date.now() + 86400000);
      
      expect(cache.has(cacheKey)).toBe(true);
    });

    it('should delete cache entries', () => {
      const cacheKey = 'https:example.com/deletable.json';
      
      cache.set(cacheKey, mockCalendar, mockSource, Date.now() + 86400000);
      expect(cache.has(cacheKey)).toBe(true);
      
      cache.delete(cacheKey);
      expect(cache.has(cacheKey)).toBe(false);
    });

    it('should clear all cache entries', () => {
      cache.set('key1', mockCalendar, mockSource, Date.now() + 86400000);
      cache.set('key2', mockCalendar, mockSource, Date.now() + 86400000);
      
      expect(cache.size()).toBe(2);
      
      cache.clear();
      
      expect(cache.size()).toBe(0);
    });
  });

  describe('Cache Expiration', () => {
    it('should return expired cache entries when explicitly requested', () => {
      const cacheKey = 'https:example.com/expired.json';
      const expiredTime = Date.now() - 1000; // Expired 1 second ago
      
      cache.set(cacheKey, mockCalendar, mockSource, expiredTime);
      
      // Should return the entry even if expired when explicitly requested
      const cached = cache.get(cacheKey, { includeExpired: true });
      expect(cached).toBeDefined();
      expect(cached?.expiresAt).toBe(expiredTime);
    });

    it('should not return expired cache entries by default', () => {
      const cacheKey = 'https:example.com/expired-default.json';
      const expiredTime = Date.now() - 1000; // Expired 1 second ago
      
      cache.set(cacheKey, mockCalendar, mockSource, expiredTime);
      
      // Should not return expired entry by default
      const cached = cache.get(cacheKey);
      expect(cached).toBeNull();
    });

    it('should identify expired cache entries', () => {
      const cacheKey = 'https:example.com/check-expired.json';
      const expiredTime = Date.now() - 1000; // Expired 1 second ago
      
      cache.set(cacheKey, mockCalendar, mockSource, expiredTime);
      
      expect(cache.isExpired(cacheKey)).toBe(true);
    });

    it('should identify non-expired cache entries', () => {
      const cacheKey = 'https:example.com/check-valid.json';
      const futureTime = Date.now() + 86400000; // Expires in 24 hours
      
      cache.set(cacheKey, mockCalendar, mockSource, futureTime);
      
      expect(cache.isExpired(cacheKey)).toBe(false);
    });

    it('should clean up expired entries', () => {
      // Add expired entry
      cache.set('expired:entry', mockCalendar, mockSource, Date.now() - 1000);
      
      // Add valid entry
      cache.set('valid:entry', mockCalendar, mockSource, Date.now() + 86400000);
      
      expect(cache.size()).toBe(2);
      
      cache.cleanupExpired();
      
      expect(cache.size()).toBe(1);
      expect(cache.has('expired:entry')).toBe(false);
      expect(cache.has('valid:entry')).toBe(true);
    });
  });

  describe('Cache Size Management', () => {
    it('should respect maximum cache size', () => {
      const maxSize = 3;
      cache.configure({ maxSize });
      
      // Add entries up to the limit
      for (let i = 0; i < maxSize + 2; i++) {
        cache.set(`key${i}`, mockCalendar, mockSource, Date.now() + 86400000);
      }
      
      // Should not exceed max size
      expect(cache.size()).toBe(maxSize);
    });

    it('should evict least recently used entries when full', () => {
      const maxSize = 2;
      cache.configure({ maxSize });
      
      const baseTime = 1000000000;
      
      // Add two entries with different timestamps
      vi.spyOn(Date, 'now').mockReturnValue(baseTime);
      cache.set('key1', mockCalendar, mockSource, baseTime + 86400000);
      
      vi.spyOn(Date, 'now').mockReturnValue(baseTime + 1000);
      cache.set('key2', mockCalendar, mockSource, baseTime + 86400000);
      
      // Access key1 to make it more recently used
      vi.spyOn(Date, 'now').mockReturnValue(baseTime + 2000);
      cache.get('key1');
      
      // Add third entry (should evict key2, which is least recently used)
      vi.spyOn(Date, 'now').mockReturnValue(baseTime + 3000);
      cache.set('key3', mockCalendar, mockSource, baseTime + 86400000);
      
      expect(cache.has('key1')).toBe(true); // Most recently used (accessed at baseTime + 2000)
      expect(cache.has('key2')).toBe(false); // Should be evicted (last accessed at baseTime + 1000)
      expect(cache.has('key3')).toBe(true); // Newly added (created at baseTime + 3000)
    });

    it('should provide accurate size count', () => {
      expect(cache.size()).toBe(0);
      
      cache.set('item1', mockCalendar, mockSource, Date.now() + 86400000);
      expect(cache.size()).toBe(1);
      
      cache.set('item2', mockCalendar, mockSource, Date.now() + 86400000);
      expect(cache.size()).toBe(2);
      
      cache.delete('item1');
      expect(cache.size()).toBe(1);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', () => {
      cache.set('tracked:hit', mockCalendar, mockSource, Date.now() + 86400000);
      
      // Hit
      cache.get('tracked:hit');
      // Miss
      cache.get('tracked:miss');
      
      const stats: CacheStats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5); // 50%
    });

    it('should calculate cache hit rate correctly', () => {
      cache.set('rate:test', mockCalendar, mockSource, Date.now() + 86400000);
      
      // 3 hits, 1 miss = 75% hit rate
      cache.get('rate:test'); // hit
      cache.get('rate:test'); // hit  
      cache.get('rate:test'); // hit
      cache.get('rate:nonexistent'); // miss
      
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0.75);
    });

    it('should track total cached items', () => {
      const stats1 = cache.getStats();
      expect(stats1.totalCached).toBe(0);
      
      cache.set('stats:item1', mockCalendar, mockSource, Date.now() + 86400000);
      cache.set('stats:item2', mockCalendar, mockSource, Date.now() + 86400000);
      
      const stats2 = cache.getStats();
      expect(stats2.totalCached).toBe(2);
    });

    it('should estimate cache size in bytes', () => {
      const stats1 = cache.getStats();
      expect(stats1.sizeBytes).toBe(0);
      
      cache.set('size:test', mockCalendar, mockSource, Date.now() + 86400000);
      
      const stats2 = cache.getStats();
      expect(stats2.sizeBytes).toBeGreaterThan(0);
    });

    it('should reset statistics when cache is cleared', () => {
      cache.set('reset:test', mockCalendar, mockSource, Date.now() + 86400000);
      cache.get('reset:test'); // Generate some stats
      cache.get('reset:nonexistent');
      
      cache.clear();
      
      const stats = cache.getStats();
      expect(stats.totalCached).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sizeBytes).toBe(0);
    });
  });

  describe('Advanced Cache Hit/Miss Scenarios', () => {
    it('should handle mixed hit/miss patterns correctly', () => {
      // Set up test data
      cache.set('item1', mockCalendar, mockSource, Date.now() + 86400000);
      cache.set('item2', mockCalendar, mockSource, Date.now() + 86400000);
      cache.set('item3', mockCalendar, mockSource, Date.now() + 86400000);
      
      // Mixed access pattern: hit, miss, hit, miss, hit
      const result1 = cache.get('item1'); // hit
      const result2 = cache.get('nonexistent1'); // miss
      const result3 = cache.get('item2'); // hit
      const result4 = cache.get('nonexistent2'); // miss
      const result5 = cache.get('item3'); // hit
      
      expect(result1).toBeDefined();
      expect(result2).toBeNull();
      expect(result3).toBeDefined();
      expect(result4).toBeNull();
      expect(result5).toBeDefined();
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0.6); // 60%
    });
    
    it('should distinguish between expired entries and missing entries in statistics', () => {
      // Add valid entry
      cache.set('valid', mockCalendar, mockSource, Date.now() + 86400000);
      
      // Add expired entry
      cache.set('expired', mockCalendar, mockSource, Date.now() - 1000);
      
      // Access patterns
      cache.get('valid'); // hit
      cache.get('expired'); // miss (expired)
      cache.get('nonexistent'); // miss (doesn't exist)
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(1/3); // ~33%
    });
    
    it('should handle cache updates vs new entries in statistics', () => {
      // Initial set
      cache.set('updateable', mockCalendar, mockSource, Date.now() + 86400000);
      
      // First access - hit
      const result1 = cache.get('updateable');
      expect(result1).toBeDefined();
      
      // Update same key (should not change cache size)
      cache.set('updateable', { ...mockCalendar, label: 'Updated Calendar' }, mockSource, Date.now() + 86400000);
      
      // Second access - still hit, but updated data
      const result2 = cache.get('updateable');
      expect(result2).toBeDefined();
      expect(result2?.calendar.label).toBe('Updated Calendar');
      
      const stats = cache.getStats();
      expect(stats.totalCached).toBe(1); // Still only one entry
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(1.0); // 100%
    });
    
    it('should maintain accurate statistics during LRU eviction', () => {
      // Configure small cache for testing eviction
      cache.configure({ maxSize: 2 });
      
      // Fill cache to capacity
      cache.set('first', mockCalendar, mockSource, Date.now() + 86400000);
      cache.set('second', mockCalendar, mockSource, Date.now() + 86400000);
      
      // Access first to make it more recently used
      cache.get('first'); // hit
      
      // Add third entry (should evict 'second')
      cache.set('third', mockCalendar, mockSource, Date.now() + 86400000);
      
      // Test access patterns after eviction
      cache.get('first'); // hit (still cached)
      cache.get('second'); // miss (evicted)
      cache.get('third'); // hit (recently added)
      
      const stats = cache.getStats();
      expect(stats.totalCached).toBe(2); // Cache size maintained
      expect(stats.hits).toBe(3); // first, first again, third
      expect(stats.misses).toBe(1); // second (evicted)
      expect(stats.hitRate).toBe(0.75); // 75%
    });
    
    it('should handle rapid cache access patterns', () => {
      // Set up multiple entries
      for (let i = 0; i < 5; i++) {
        cache.set(`rapid${i}`, mockCalendar, mockSource, Date.now() + 86400000);
      }
      
      let expectedHits = 0;
      let expectedMisses = 0;
      
      // Rapid access pattern - multiple hits on same entries
      for (let round = 0; round < 3; round++) {
        for (let i = 0; i < 5; i++) {
          const result = cache.get(`rapid${i}`);
          expect(result).toBeDefined();
          expectedHits++;
        }
        
        // Also try some misses
        cache.get(`nonexistent${round}`);
        expectedMisses++;
      }
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(expectedHits); // 15 hits (3 rounds × 5 items)
      expect(stats.misses).toBe(expectedMisses); // 3 misses
      expect(stats.hitRate).toBe(expectedHits / (expectedHits + expectedMisses));
    });
    
    it('should handle ETags in cache hit/miss scenarios', () => {
      const etag1 = 'W/"version1"';
      const etag2 = 'W/"version2"';
      
      // Set entry with ETag
      cache.set('tagged', mockCalendar, mockSource, Date.now() + 86400000, etag1);
      
      // Hit with correct ETag
      const result1 = cache.get('tagged');
      expect(result1).toBeDefined();
      expect(result1?.etag).toBe(etag1);
      
      // Check ETag validation
      expect(cache.hasValidETag('tagged', etag1)).toBe(true);
      expect(cache.hasValidETag('tagged', etag2)).toBe(false);
      expect(cache.hasValidETag('nonexistent', etag1)).toBe(false);
      
      // Update with new ETag
      cache.set('tagged', mockCalendar, mockSource, Date.now() + 86400000, etag2);
      
      // Verify ETag updated
      const result2 = cache.get('tagged');
      expect(result2?.etag).toBe(etag2);
      expect(cache.hasValidETag('tagged', etag2)).toBe(true);
      expect(cache.hasValidETag('tagged', etag1)).toBe(false);
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(0);
    });
  });

  describe('Cache Configuration', () => {
    it('should accept configuration options', () => {
      const config = {
        maxSize: 50,
        defaultTtl: 3600000, // 1 hour
        cleanupInterval: 300000 // 5 minutes
      };
      
      expect(() => cache.configure(config)).not.toThrow();
    });

    it('should use default configuration values', () => {
      const config = cache.getConfiguration();
      expect(config.maxSize).toBeGreaterThan(0);
      expect(config.defaultTtl).toBeGreaterThan(0);
    });

    it('should apply new configuration immediately', () => {
      // Fill cache beyond new limit
      for (let i = 0; i < 5; i++) {
        cache.set(`config${i}`, mockCalendar, mockSource, Date.now() + 86400000);
      }
      
      // Configure smaller max size
      cache.configure({ maxSize: 2 });
      
      // Should immediately enforce new limit
      expect(cache.size()).toBe(2);
    });
  });

  describe('ETags and Validation', () => {
    it('should store and retrieve ETags', () => {
      const cacheKey = 'https:example.com/etag-test.json';
      const etag = 'W/"abc123"';
      
      cache.set(cacheKey, mockCalendar, mockSource, Date.now() + 86400000, etag);
      
      const cached = cache.get(cacheKey);
      expect(cached?.etag).toBe(etag);
    });

    it('should update ETag when calendar is re-cached', () => {
      const cacheKey = 'https:example.com/etag-update.json';
      const oldEtag = 'W/"old123"';
      const newEtag = 'W/"new456"';
      
      cache.set(cacheKey, mockCalendar, mockSource, Date.now() + 86400000, oldEtag);
      cache.set(cacheKey, mockCalendar, mockSource, Date.now() + 86400000, newEtag);
      
      const cached = cache.get(cacheKey);
      expect(cached?.etag).toBe(newEtag);
    });

    it('should check if cached ETag matches provided ETag', () => {
      const cacheKey = 'https:example.com/etag-match.json';
      const etag = 'W/"match123"';
      
      cache.set(cacheKey, mockCalendar, mockSource, Date.now() + 86400000, etag);
      
      expect(cache.hasValidETag(cacheKey, etag)).toBe(true);
      expect(cache.hasValidETag(cacheKey, 'W/"different"')).toBe(false);
    });
  });
});