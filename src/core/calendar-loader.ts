/**
 * CalendarLoader - Handles loading calendars from external URLs and local sources
 *
 * Extends the existing calendar loading system to support:
 * - URL-based calendar loading with validation
 * - Caching and error handling
 * - CORS and security considerations
 * - Collection and variant loading
 */

import { Logger } from './logger';
import { CalendarValidator, type ValidationResult } from './calendar-validator';
import { protocolHandlers } from './protocol-handler';
import type { SeasonsStarsCalendar } from '../types/calendar';

export interface LoaderOptions {
  /** Maximum request timeout in milliseconds */
  timeout?: number;
  /** Whether to validate the calendar after loading */
  validate?: boolean;
  /** Whether to cache the loaded calendar */
  cache?: boolean;
  /** Custom headers for the request */
  headers?: Record<string, string>;
}

export interface LoadResult {
  /** Whether the load operation was successful */
  success: boolean;
  /** The loaded calendar data (if successful) */
  calendar?: SeasonsStarsCalendar;
  /** Validation result (if validation was performed) */
  validation?: ValidationResult;
  /** Error message (if failed) */
  error?: string;
  /** Whether the result came from cache */
  fromCache?: boolean;
  /** URL that was loaded from */
  sourceUrl?: string;
}

export interface ExternalCalendarSource {
  /** Unique identifier for this source */
  id: string;
  /** Display name for the source */
  name: string;
  /** URL to load from */
  url: string;
  /** Whether this source is enabled */
  enabled: boolean;
  /** Last successful load timestamp */
  lastLoaded?: number;
  /** Last load error (if any) */
  lastError?: string;
  /** Source type (single calendar, collection, or variants) */
  type: 'calendar' | 'collection' | 'variants';
}

/**
 * Calendar loading and caching system for external sources
 */
export class CalendarLoader {
  private static readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  private static readonly CACHE_KEY = 'seasons-stars.external-calendars';
  private static readonly SOURCES_KEY = 'seasons-stars.external-sources';

  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private sources = new Map<string, ExternalCalendarSource>();

  constructor() {
    this.loadCacheFromStorage();
    this.loadSourcesFromStorage();
  }

  /**
   * Load a calendar from a URL or protocol URL
   */
  async loadFromUrl(url: string, options: LoaderOptions = {}): Promise<LoadResult> {
    Logger.debug(`CalendarLoader: Loading calendar from URL: ${url}`);

    // Check if this is a custom protocol URL (not HTTP/HTTPS)
    const protocolResult = protocolHandlers.parseUrl(url);
    if (protocolResult && !['http', 'https'].includes(protocolResult.protocol)) {
      Logger.debug(
        `CalendarLoader: Detected custom protocol URL, delegating to protocol handler: ${protocolResult.protocol}`
      );
      return await protocolHandlers.load(url, options);
    }

    // Validate URL format for HTTP/HTTPS URLs
    const urlValidation = this.validateUrl(url);
    if (!urlValidation.valid) {
      return {
        success: false,
        error: urlValidation.error,
        sourceUrl: url,
      };
    }

    // Check cache first if caching is enabled
    if (options.cache !== false) {
      const cached = this.getCached(url);
      if (cached) {
        Logger.debug(`CalendarLoader: Using cached calendar for ${url}`);
        return {
          success: true,
          calendar: cached,
          fromCache: true,
          sourceUrl: url,
        };
      }
    }

    try {
      // Perform the fetch request
      const response = await this.fetchWithTimeout(url, {
        timeout: options.timeout || CalendarLoader.DEFAULT_TIMEOUT,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const calendarData = await response.json();

      // Validate the calendar if requested
      let validation: ValidationResult | undefined;
      if (options.validate !== false) {
        validation = await CalendarValidator.validate(calendarData);
        if (!validation.isValid) {
          return {
            success: false,
            error: `Calendar validation failed: ${validation.errors.join(', ')}`,
            validation,
            sourceUrl: url,
          };
        }
      }

      // Cache the successful result
      if (options.cache !== false) {
        this.setCached(url, calendarData);
      }

      Logger.info(`CalendarLoader: Successfully loaded calendar from ${url}`);
      return {
        success: true,
        calendar: calendarData,
        validation,
        fromCache: false,
        sourceUrl: url,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(`CalendarLoader: Failed to load calendar from ${url}`, error as Error);

      return {
        success: false,
        error: errorMessage,
        sourceUrl: url,
      };
    }
  }

  /**
   * Load multiple calendars from a collection URL
   */
  async loadCollection(url: string, options: LoaderOptions = {}): Promise<LoadResult[]> {
    Logger.debug(`CalendarLoader: Loading calendar collection from URL: ${url}`);

    const collectionResult = await this.loadFromUrl(url, {
      ...options,
      validate: false, // Don't validate collection structure with calendar schema
    });

    if (!collectionResult.success || !collectionResult.calendar) {
      return [collectionResult];
    }

    const collection = collectionResult.calendar as any;

    // Validate collection structure
    if (!collection.calendars || !Array.isArray(collection.calendars)) {
      return [
        {
          success: false,
          error: 'Invalid collection format: missing or invalid calendars array',
          sourceUrl: url,
        },
      ];
    }

    // Load each calendar in the collection
    const results: LoadResult[] = [];
    for (const calendarEntry of collection.calendars) {
      if (!calendarEntry.url) {
        results.push({
          success: false,
          error: `Calendar entry missing URL: ${JSON.stringify(calendarEntry)}`,
          sourceUrl: url,
        });
        continue;
      }

      // Resolve relative URLs against the collection base URL
      const calendarUrl = this.resolveUrl(calendarEntry.url, url);
      const result = await this.loadFromUrl(calendarUrl, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Add an external calendar source
   */
  addSource(source: Omit<ExternalCalendarSource, 'id'>): string {
    const id = this.generateSourceId(source.name);
    const fullSource: ExternalCalendarSource = {
      ...source,
      id,
    };

    this.sources.set(id, fullSource);
    this.saveSourcesToStorage();

    Logger.info(`CalendarLoader: Added external source: ${fullSource.name} (${fullSource.url})`);
    return id;
  }

  /**
   * Remove an external calendar source
   */
  removeSource(id: string): boolean {
    const source = this.sources.get(id);
    if (!source) {
      return false;
    }

    this.sources.delete(id);
    this.saveSourcesToStorage();

    // Clear related cache entries
    this.clearCacheForUrl(source.url);

    Logger.info(`CalendarLoader: Removed external source: ${source.name}`);
    return true;
  }

  /**
   * Get all external sources
   */
  getSources(): ExternalCalendarSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * Get a specific source by ID
   */
  getSource(id: string): ExternalCalendarSource | undefined {
    return this.sources.get(id);
  }

  /**
   * Update the status of an external source after a load attempt
   */
  updateSourceStatus(id: string, success: boolean, error?: string): void {
    const source = this.sources.get(id);
    if (!source) {
      return;
    }

    if (success) {
      source.lastLoaded = Date.now();
      source.lastError = undefined;
    } else {
      source.lastError = error;
    }

    this.sources.set(id, source);
    this.saveSourcesToStorage();
  }

  /**
   * Clear all cached calendars
   */
  clearCache(): void {
    this.cache.clear();
    this.saveCacheToStorage();
    Logger.info('CalendarLoader: Cleared all cached calendars');
  }

  /**
   * Clear cache for a specific URL
   */
  clearCacheForUrl(url: string): void {
    this.cache.delete(url);
    this.saveCacheToStorage();
    Logger.debug(`CalendarLoader: Cleared cache for ${url}`);
  }

  /**
   * Validate URL format and security
   */
  private validateUrl(url: string): { valid: boolean; error?: string } {
    try {
      const parsed = new URL(url);

      // Only allow HTTP/HTTPS protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return {
          valid: false,
          error: `Unsupported protocol: ${parsed.protocol}. Only HTTP and HTTPS are allowed.`,
        };
      }

      // Recommend HTTPS for security
      if (parsed.protocol === 'http:' && parsed.hostname !== 'localhost') {
        Logger.warn(
          `CalendarLoader: Non-HTTPS URL detected: ${url}. HTTPS is recommended for security.`
        );
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Fetch with timeout support
   */
  private async fetchWithTimeout(
    url: string,
    options: { timeout: number; headers?: Record<string, string> }
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: options.headers,
        mode: 'cors',
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${options.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Resolve relative URLs against a base URL
   */
  private resolveUrl(relativeUrl: string, baseUrl: string): string {
    try {
      return new URL(relativeUrl, baseUrl).toString();
    } catch {
      // If URL construction fails, assume it's already absolute
      return relativeUrl;
    }
  }

  /**
   * Generate a unique source ID
   */
  private generateSourceId(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    let id = base;
    let counter = 1;

    while (this.sources.has(id)) {
      id = `${base}-${counter}`;
      counter++;
    }

    return id;
  }

  /**
   * Get cached calendar data
   */
  private getCached(url: string): any | null {
    const cached = this.cache.get(url);
    if (!cached) {
      return null;
    }

    // Check if cache has expired
    if (Date.now() > cached.timestamp + cached.ttl) {
      this.cache.delete(url);
      this.saveCacheToStorage();
      return null;
    }

    return cached.data;
  }

  /**
   * Cache calendar data
   */
  private setCached(url: string, data: any, ttlMs: number = 3600000): void {
    // Default 1 hour TTL
    this.cache.set(url, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
    this.saveCacheToStorage();
  }

  /**
   * Load cache from persistent storage
   */
  private loadCacheFromStorage(): void {
    try {
      const stored = game.settings?.get('seasons-and-stars', CalendarLoader.CACHE_KEY);
      if (stored && typeof stored === 'object') {
        this.cache = new Map(Object.entries(stored));
      }
    } catch (error) {
      Logger.warn('CalendarLoader: Failed to load cache from storage', error as Error);
    }
  }

  /**
   * Save cache to persistent storage
   */
  private saveCacheToStorage(): void {
    try {
      const cacheObj = Object.fromEntries(this.cache);
      game.settings?.set('seasons-and-stars', CalendarLoader.CACHE_KEY, cacheObj);
    } catch (error) {
      Logger.warn('CalendarLoader: Failed to save cache to storage', error as Error);
    }
  }

  /**
   * Load sources from persistent storage
   */
  private loadSourcesFromStorage(): void {
    try {
      const stored = game.settings?.get('seasons-and-stars', CalendarLoader.SOURCES_KEY);
      if (stored && Array.isArray(stored)) {
        for (const source of stored) {
          this.sources.set(source.id, source);
        }
      }
    } catch (error) {
      Logger.warn('CalendarLoader: Failed to load sources from storage', error as Error);
    }
  }

  /**
   * Save sources to persistent storage
   */
  private saveSourcesToStorage(): void {
    try {
      const sourcesArray = Array.from(this.sources.values());
      game.settings?.set('seasons-and-stars', CalendarLoader.SOURCES_KEY, sourcesArray);
    } catch (error) {
      Logger.warn('CalendarLoader: Failed to save sources to storage', error as Error);
    }
  }
}
