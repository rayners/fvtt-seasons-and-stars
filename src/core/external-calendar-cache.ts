/**
 * External calendar caching system with expiration and LRU eviction
 */

import type { 
  CachedCalendarData, 
  ExternalCalendarSource,
  CacheStats 
} from '../types/external-calendar';
import type { SeasonsStarsCalendar } from '../types/calendar';
import { Logger } from './logger';

interface CacheConfiguration {
  maxSize: number;
  defaultTtl: number; // Time to live in milliseconds
  cleanupInterval: number;
}

interface CacheEntry {
  data: CachedCalendarData;
  lastAccessed: number;
}

export class ExternalCalendarCache {
  private cache = new Map<string, CacheEntry>();
  private stats = {
    hits: 0,
    misses: 0,
    totalBytes: 0
  };
  
  private config: CacheConfiguration = {
    maxSize: 100,
    defaultTtl: 7 * 24 * 60 * 60 * 1000, // 1 week
    cleanupInterval: 60 * 60 * 1000 // 1 hour
  };

  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Store calendar data in cache
   */
  set(
    key: string, 
    calendar: SeasonsStarsCalendar, 
    source: ExternalCalendarSource, 
    expiresAt: number,
    etag?: string
  ): void {
    const now = Date.now();
    
    const cachedData: CachedCalendarData = {
      calendar,
      cachedAt: now,
      expiresAt,
      source,
      etag
    };

    const entry: CacheEntry = {
      data: cachedData,
      lastAccessed: now
    };

    // If key already exists, just update it
    if (this.cache.has(key)) {
      this.cache.set(key, entry);
    } else {
      // If at capacity, evict least recently used before adding new entry
      if (this.cache.size >= this.config.maxSize) {
        this.evictLRU();
      }
      this.cache.set(key, entry);
    }

    this.updateStats();
    
    Logger.debug(`Cached external calendar: ${key} (expires: ${new Date(expiresAt).toISOString()})`);
  }

  /**
   * Retrieve calendar data from cache
   */
  get(key: string, options: { includeExpired?: boolean } = {}): CachedCalendarData | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiration unless explicitly requesting expired entries
    if (!options.includeExpired && this.isEntryExpired(entry.data)) {
      this.stats.misses++;
      return null;
    }

    // Update access time for LRU
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    
    return entry.data;
  }

  /**
   * Check if cache entry exists
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isEntryExpired(entry.data);
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateStats();
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, totalBytes: 0 };
    Logger.debug('External calendar cache cleared');
  }

  /**
   * Get cache size (number of entries)
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if specific cache entry is expired
   */
  isExpired(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? this.isEntryExpired(entry.data) : true;
  }

  /**
   * Clean up expired entries
   */
  cleanupExpired(): void {
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isEntryExpired(entry.data)) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.updateStats();
      Logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      totalCached: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      sizeBytes: this.stats.totalBytes
    };
  }

  /**
   * Configure cache settings
   */
  configure(config: Partial<CacheConfiguration>): void {
    const oldMaxSize = this.config.maxSize;
    
    this.config = { ...this.config, ...config };

    // If max size changed, enforce new limit
    if (config.maxSize !== undefined && config.maxSize !== oldMaxSize) {
      this.enforceMaxSize();
    }

    Logger.debug('External calendar cache configured', this.config);
  }

  /**
   * Get current configuration
   */
  getConfiguration(): CacheConfiguration {
    return { ...this.config };
  }

  /**
   * Check if cached ETag matches provided ETag
   */
  hasValidETag(key: string, etag: string): boolean {
    const entry = this.cache.get(key);
    return entry?.data.etag === etag;
  }

  /**
   * Destroy cache and cleanup timers
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }

  /**
   * Check if cache entry is expired
   */
  private isEntryExpired(data: CachedCalendarData): boolean {
    return Date.now() > data.expiresAt;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Number.MAX_SAFE_INTEGER;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      Logger.debug(`Evicted LRU cache entry: ${oldestKey}`);
    }
  }

  /**
   * Enforce maximum cache size by evicting oldest entries
   */
  private enforceMaxSize(): void {
    while (this.cache.size > this.config.maxSize) {
      this.evictLRU();
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    // Estimate total bytes (rough approximation)
    let totalBytes = 0;
    for (const entry of this.cache.values()) {
      // Rough estimate: JSON stringify the calendar data
      totalBytes += JSON.stringify(entry.data.calendar).length * 2; // UTF-16 chars
    }
    this.stats.totalBytes = totalBytes;
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.config.cleanupInterval);
  }
}