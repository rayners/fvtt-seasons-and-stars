/**
 * External calendar caching system with expiration and LRU eviction
 * Enhanced with LocalStorage persistence support
 *
 * LocalStorage Features:
 * - Automatic persistence of cache entries across browser sessions
 * - Configurable storage size limits with automatic cleanup
 * - Cache versioning for compatibility across module updates
 * - Graceful fallback when LocalStorage is unavailable or quota exceeded
 * - Automatic cleanup of expired and corrupted entries
 * - Optional enabling/disabling of LocalStorage persistence
 *
 * LocalStorage is enabled by default but can be disabled via configuration.
 * Cache entries are stored with a configurable prefix and include version
 * information to ensure compatibility across updates.
 */

import type {
  CachedCalendarData,
  ExternalCalendarSource,
  CacheStats,
} from '../types/external-calendar';
import type { SeasonsStarsCalendar } from '../types/calendar';
import { Logger } from './logger';

interface CacheConfiguration {
  maxSize: number;
  defaultTtl: number; // Time to live in milliseconds
  cleanupInterval: number;
  enableLocalStorage?: boolean;
  localStoragePrefix?: string;
  localStorageMaxSizeMB?: number;
}

interface CacheEntry {
  data: CachedCalendarData;
  lastAccessed: number;
}

interface LocalStorageEntry {
  entry: CacheEntry;
  version: string;
  savedAt: number;
}

export class ExternalCalendarCache {
  private cache = new Map<string, CacheEntry>();
  private stats = {
    hits: 0,
    misses: 0,
    totalBytes: 0,
  };

  private config: CacheConfiguration = {
    maxSize: 100,
    defaultTtl: 7 * 24 * 60 * 60 * 1000, // 1 week
    cleanupInterval: 60 * 60 * 1000, // 1 hour
    enableLocalStorage: true,
    localStoragePrefix: 'fvtt-seasons-stars-cache',
    localStorageMaxSizeMB: 10,
  };

  private cleanupTimer: NodeJS.Timeout | null = null;
  private readonly cacheVersion = '1.0.0';
  private localStorageAvailable = false;

  constructor() {
    this.checkLocalStorageAvailability();
    this.loadFromLocalStorage();
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
      etag,
    };

    const entry: CacheEntry = {
      data: cachedData,
      lastAccessed: now,
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

    // Save to LocalStorage
    this.saveToLocalStorage(key, entry);

    this.updateStats();

    Logger.debug(
      `Cached external calendar: ${key} (expires: ${new Date(expiresAt).toISOString()})`
    );
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
      // Remove from LocalStorage
      this.removeFromLocalStorage(key);
      this.updateStats();
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.clearLocalStorage();
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
        this.removeFromLocalStorage(key);
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
      sizeBytes: this.stats.totalBytes,
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
   * Check LocalStorage availability
   */
  private checkLocalStorageAvailability(): void {
    try {
      if (typeof localStorage === 'undefined') {
        this.localStorageAvailable = false;
        return;
      }

      // Test localStorage by writing and reading a test value
      const testKey = `${this.config.localStoragePrefix}-test`;
      localStorage.setItem(testKey, 'test');
      const testValue = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);

      this.localStorageAvailable = testValue === 'test';

      if (this.localStorageAvailable) {
        Logger.debug('LocalStorage is available for cache persistence');
      } else {
        Logger.warn('LocalStorage test failed, cache persistence disabled');
      }
    } catch (error) {
      this.localStorageAvailable = false;
      Logger.warn('LocalStorage is not available, cache persistence disabled', error as Error);
    }
  }

  /**
   * Load cache data from LocalStorage on startup
   */
  private loadFromLocalStorage(): void {
    if (!this.config.enableLocalStorage || !this.localStorageAvailable) {
      return;
    }

    try {
      const keys = this.getLocalStorageKeys();
      let loadedCount = 0;
      let skippedCount = 0;

      for (const key of keys) {
        try {
          const stored = localStorage.getItem(key);
          if (!stored) continue;

          const parsed: LocalStorageEntry = JSON.parse(stored);

          // Check version compatibility
          if (parsed.version !== this.cacheVersion) {
            Logger.debug(`Skipping incompatible cache entry version: ${parsed.version}`);
            localStorage.removeItem(key);
            skippedCount++;
            continue;
          }

          // Check if entry is expired
          if (this.isEntryExpired(parsed.entry.data)) {
            Logger.debug(`Removing expired cache entry: ${key}`);
            localStorage.removeItem(key);
            skippedCount++;
            continue;
          }

          // Extract cache key from localStorage key
          const cacheKey = key.replace(`${this.config.localStoragePrefix}-`, '');

          // Load into memory cache
          this.cache.set(cacheKey, parsed.entry);
          loadedCount++;
        } catch (entryError) {
          Logger.warn(`Failed to load cache entry from localStorage: ${key}`, entryError as Error);
          // Remove corrupted entry
          try {
            localStorage.removeItem(key);
          } catch {
            // Ignore removal errors
          }
          skippedCount++;
        }
      }

      if (loadedCount > 0 || skippedCount > 0) {
        Logger.debug(
          `Loaded ${loadedCount} cache entries from localStorage, skipped ${skippedCount}`
        );
      }

      this.updateStats();
    } catch (error) {
      Logger.error('Failed to load cache from localStorage', error as Error);
    }
  }

  /**
   * Save cache entry to LocalStorage
   */
  private saveToLocalStorage(key: string, entry: CacheEntry): void {
    if (!this.config.enableLocalStorage || !this.localStorageAvailable) {
      return;
    }

    try {
      const storageKey = `${this.config.localStoragePrefix}-${key}`;
      const storageEntry: LocalStorageEntry = {
        entry,
        version: this.cacheVersion,
        savedAt: Date.now(),
      };

      const serialized = JSON.stringify(storageEntry);

      // Check size before storing
      if (this.wouldExceedStorageLimit(serialized)) {
        Logger.debug(`Skipping localStorage save for ${key}: would exceed size limit`);
        return;
      }

      localStorage.setItem(storageKey, serialized);
    } catch (error) {
      // Handle quota exceeded or other localStorage errors
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        Logger.warn('LocalStorage quota exceeded, attempting cleanup');
        this.cleanupLocalStorage();

        // Try once more after cleanup
        try {
          const storageKey = `${this.config.localStoragePrefix}-${key}`;
          const storageEntry: LocalStorageEntry = {
            entry,
            version: this.cacheVersion,
            savedAt: Date.now(),
          };
          localStorage.setItem(storageKey, JSON.stringify(storageEntry));
        } catch (retryError) {
          Logger.warn('Failed to save to localStorage even after cleanup', retryError as Error);
        }
      } else {
        Logger.warn(`Failed to save cache entry to localStorage: ${key}`, error as Error);
      }
    }
  }

  /**
   * Remove cache entry from LocalStorage
   */
  private removeFromLocalStorage(key: string): void {
    if (!this.config.enableLocalStorage || !this.localStorageAvailable) {
      return;
    }

    try {
      const storageKey = `${this.config.localStoragePrefix}-${key}`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      Logger.warn(`Failed to remove cache entry from localStorage: ${key}`, error as Error);
    }
  }

  /**
   * Get all localStorage keys for this cache
   */
  private getLocalStorageKeys(): string[] {
    if (!this.localStorageAvailable) {
      return [];
    }

    try {
      const keys: string[] = [];
      const prefix = `${this.config.localStoragePrefix}-`;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix) && key !== `${prefix}test`) {
          keys.push(key);
        }
      }

      return keys;
    } catch (error) {
      Logger.warn('Failed to get localStorage keys', error as Error);
      return [];
    }
  }

  /**
   * Check if storing data would exceed the configured size limit
   */
  private wouldExceedStorageLimit(newData: string): boolean {
    if (!this.config.localStorageMaxSizeMB) {
      return false;
    }

    try {
      const currentSize = this.getLocalStorageSize();
      const newDataSize = new Blob([newData]).size;
      const maxSize = this.config.localStorageMaxSizeMB * 1024 * 1024; // Convert MB to bytes

      return currentSize + newDataSize > maxSize;
    } catch {
      // If we can't calculate size, allow the operation
      return false;
    }
  }

  /**
   * Get current localStorage size for this cache
   */
  private getLocalStorageSize(): number {
    if (!this.localStorageAvailable) {
      return 0;
    }

    try {
      let totalSize = 0;
      const keys = this.getLocalStorageKeys();

      for (const key of keys) {
        const data = localStorage.getItem(key);
        if (data) {
          totalSize += new Blob([data]).size;
        }
      }

      return totalSize;
    } catch {
      return 0;
    }
  }

  /**
   * Clean up localStorage by removing expired entries and oldest entries if needed
   */
  private cleanupLocalStorage(): void {
    if (!this.config.enableLocalStorage || !this.localStorageAvailable) {
      return;
    }

    try {
      const keys = this.getLocalStorageKeys();
      const entries: { key: string; entry: LocalStorageEntry; age: number }[] = [];

      // Collect all entries with their age
      for (const key of keys) {
        try {
          const stored = localStorage.getItem(key);
          if (!stored) continue;

          const parsed: LocalStorageEntry = JSON.parse(stored);
          const age = Date.now() - parsed.savedAt;

          // Remove expired entries immediately
          if (this.isEntryExpired(parsed.entry.data)) {
            localStorage.removeItem(key);
            continue;
          }

          // Remove incompatible versions
          if (parsed.version !== this.cacheVersion) {
            localStorage.removeItem(key);
            continue;
          }

          entries.push({ key, entry: parsed, age });
        } catch {
          // Remove corrupted entries
          localStorage.removeItem(key);
        }
      }

      // If still over limit, remove oldest entries
      if (this.config.localStorageMaxSizeMB) {
        const maxSize = this.config.localStorageMaxSizeMB * 1024 * 1024;
        let currentSize = this.getLocalStorageSize();

        // Sort by age (oldest first)
        entries.sort((a, b) => b.age - a.age);

        while (currentSize > maxSize && entries.length > 0) {
          const oldest = entries.pop()!;
          localStorage.removeItem(oldest.key);
          currentSize = this.getLocalStorageSize();
        }
      }

      Logger.debug('LocalStorage cleanup completed');
    } catch (error) {
      Logger.error('Failed to cleanup localStorage', error as Error);
    }
  }

  /**
   * Clear all localStorage entries for this cache
   */
  private clearLocalStorage(): void {
    if (!this.config.enableLocalStorage || !this.localStorageAvailable) {
      return;
    }

    try {
      const keys = this.getLocalStorageKeys();
      for (const key of keys) {
        localStorage.removeItem(key);
      }
      Logger.debug('Cleared all localStorage cache entries');
    } catch (error) {
      Logger.warn('Failed to clear localStorage cache entries', error as Error);
    }
  }

  /**
   * Get LocalStorage cache management utilities
   */
  getLocalStorageInfo(): {
    available: boolean;
    enabled: boolean;
    size: number;
    maxSize: number;
    entryCount: number;
  } {
    return {
      available: this.localStorageAvailable,
      enabled: this.config.enableLocalStorage || false,
      size: this.getLocalStorageSize(),
      maxSize: (this.config.localStorageMaxSizeMB || 0) * 1024 * 1024,
      entryCount: this.getLocalStorageKeys().length,
    };
  }

  /**
   * Manually trigger LocalStorage cleanup
   */
  cleanupLocalStorageManually(): void {
    this.cleanupLocalStorage();
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
      this.removeFromLocalStorage(oldestKey);
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
