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
import type { SeasonsStarsCalendar } from '../types/calendar';

export interface LoaderOptions {
  /** Maximum request timeout in milliseconds */
  timeout?: number;
  /** Whether to validate the calendar after loading */
  validate?: boolean;
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
  /** URL that was loaded from */
  sourceUrl?: string;
  /** Collection entry metadata (if loaded from collection) */
  collectionEntry?: CalendarCollectionEntry;
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

export interface CalendarCollectionEntry {
  /** Unique identifier for the calendar */
  id: string;
  /** Display name for the calendar */
  name: string;
  /** Description of the calendar */
  description?: string;
  /** Filename of the calendar JSON file (relative to index) */
  file?: string;
  /** URL to the calendar JSON file */
  url?: string;
  /** Sample date text showing calendar format */
  preview?: string;
  /** Tags for categorizing the calendar */
  tags?: string[];
  /** Author of the calendar */
  author?: string;
  /** Version of the calendar */
  version?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface CalendarCollection {
  /** Display name for the collection */
  name: string;
  /** Description of the collection */
  description?: string;
  /** Version of the collection */
  version?: string;
  /** Array of calendar definitions */
  calendars: CalendarCollectionEntry[];
  /** Collection metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Calendar loading and caching system for external sources
 */
export class CalendarLoader {
  private static readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  private static readonly SOURCES_KEY = 'seasons-stars.external-sources';

  private sources = new Map<string, ExternalCalendarSource>();

  constructor() {
    this.loadSourcesFromStorage();
  }

  /**
   * Load a calendar from a URL
   */
  async loadFromUrl(url: string, options: LoaderOptions = {}): Promise<LoadResult> {
    Logger.debug(`CalendarLoader: Loading calendar from URL: ${url}`);

    // Validate URL format
    const urlValidation = this.validateUrl(url);
    if (!urlValidation.valid) {
      return {
        success: false,
        error: urlValidation.error,
        sourceUrl: url,
      };
    }

    try {
      // Perform the fetch request
      const response = await this.fetchWithTimeout(url, {
        timeout: options.timeout || CalendarLoader.DEFAULT_TIMEOUT,
        headers: {
          Accept: 'application/json',
          // Note: Content-Type not needed for GET requests and causes CORS issues
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

      Logger.info(`CalendarLoader: Successfully loaded calendar from ${url}`);
      return {
        success: true,
        calendar: calendarData,
        validation,
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

    const collection = collectionResult.calendar as unknown as CalendarCollection;

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
      // Check for URL in entry (either absolute URL or relative file path)
      const calendarUrl = calendarEntry.url || calendarEntry.file;
      if (!calendarUrl) {
        results.push({
          success: false,
          error: `Calendar entry missing URL or file: ${JSON.stringify(calendarEntry)}`,
          sourceUrl: url,
          collectionEntry: calendarEntry,
        });
        continue;
      }

      // Resolve relative URLs against the collection base URL
      const resolvedUrl = this.resolveUrl(calendarUrl, url);
      const result = await this.loadFromUrl(resolvedUrl, options);

      // Add collection entry metadata to the result with sanitized preview
      if (result.success) {
        const sanitizedEntry = { ...calendarEntry };
        if (sanitizedEntry.preview) {
          sanitizedEntry.preview = this.sanitizeHTML(sanitizedEntry.preview);
        }
        result.collectionEntry = sanitizedEntry;
      }

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
   * Validate URL format and security
   */
  private validateUrl(url: string): { valid: boolean; error?: string } {
    try {
      // Handle module:// protocol specially
      if (url.startsWith('module:')) {
        return this.validateModuleUrl(url);
      }

      const parsed = new URL(url);

      // Only allow HTTP/HTTPS protocols for external URLs
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return {
          valid: false,
          error: `Unsupported protocol: ${parsed.protocol}. Only HTTP, HTTPS, and module: are allowed.`,
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
   * Validate module:// URL format
   */
  private validateModuleUrl(url: string): { valid: boolean; error?: string } {
    // Extract module ID from either simple or full format
    let moduleId: string;

    const simpleMatch = url.match(/^module:([a-z0-9-]+)$/);
    const fullMatch = url.match(/^module:([a-z0-9-]+)\/(.+)$/);

    if (simpleMatch) {
      moduleId = simpleMatch[1];
    } else if (fullMatch) {
      moduleId = fullMatch[1];
    } else {
      return {
        valid: false,
        error: 'Invalid module URL format. Expected: module:module-id or module:module-id/path',
      };
    }

    const module = game.modules.get(moduleId);

    if (!module) {
      return {
        valid: false,
        error: `Module '${moduleId}' not found`,
      };
    }

    if (!module.active) {
      return {
        valid: false,
        error: `Module '${moduleId}' is not active`,
      };
    }

    return { valid: true };
  }

  /**
   * Resolve module:// URLs to actual file paths
   */
  private resolveModuleUrl(moduleUrl: string): string {
    // Handle simple module:module-name format (defaults to calendars/index.json)
    const simpleMatch = moduleUrl.match(/^module:([a-z0-9-]+)$/);
    if (simpleMatch) {
      const [, moduleId] = simpleMatch;
      return `modules/${moduleId}/calendars/index.json`;
    }

    // Handle full module:module-name/path format
    const fullMatch = moduleUrl.match(/^module:([a-z0-9-]+)\/(.+)$/);
    if (!fullMatch) {
      throw new Error(
        'Invalid module URL format. Expected: module:module-id or module:module-id/path'
      );
    }

    const [, moduleId, path] = fullMatch;
    // Convert to actual file path - append index.json if path doesn't end with .json
    const fullPath = path.endsWith('.json') ? path : `${path}/index.json`;
    return `modules/${moduleId}/${fullPath}`;
  }

  /**
   * Fetch with timeout support
   */
  private async fetchWithTimeout(
    url: string,
    options: { timeout: number; headers?: Record<string, string> }
  ): Promise<Response> {
    // Handle module URLs by converting to local file paths
    if (url.startsWith('module:')) {
      const localPath = this.resolveModuleUrl(url);
      Logger.debug(`CalendarLoader: Resolving module URL ${url} to ${localPath}`);
      url = localPath;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);

    try {
      // First attempt: CORS mode with headers
      const response = await fetch(url, {
        signal: controller.signal,
        headers: options.headers,
        mode: 'cors',
      });
      clearTimeout(timeoutId);
      return response;
    } catch (corsError) {
      // If CORS fails, try without custom headers (simpler request)
      try {
        Logger.debug(`CORS failed for ${url}, retrying with no-cors mode`);
        const response = await fetch(url, {
          signal: controller.signal,
          mode: 'no-cors',
        });
        clearTimeout(timeoutId);

        // no-cors mode returns opaque responses, so we can't read JSON directly
        // This is a limitation - we'd need to use script tag loading for actual data
        if (response.type === 'opaque') {
          throw new Error(
            'CORS blocked - server does not allow cross-origin requests. Consider using a CORS proxy or hosting the calendar file on a CORS-enabled server.'
          );
        }

        return response;
      } catch {
        clearTimeout(timeoutId);
        if (corsError instanceof Error && corsError.name === 'AbortError') {
          throw new Error(`Request timeout after ${options.timeout}ms`);
        }
        // Throw the original CORS error with helpful message
        throw new Error(
          `CORS error: ${corsError instanceof Error ? corsError.message : 'Unknown error'}. The server hosting this calendar does not allow cross-origin requests. Consider hosting the file on a CORS-enabled service or using a proxy.`
        );
      }
    }
  }

  /**
   * Resolve relative URLs against a base URL
   */
  private resolveUrl(relativeUrl: string, baseUrl: string): string {
    try {
      // Handle module URLs specially - only for simple module:name format
      if (baseUrl.startsWith('module:') && !baseUrl.includes('/')) {
        // Extract module ID from base URL (only simple format like module:seasons-and-stars-test-pack)
        const moduleId = baseUrl.replace('module:', '');
        // Construct module URL for the relative file in the calendars directory
        return `module:${moduleId}/calendars/${relativeUrl}`;
      }

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

  /**
   * Sanitize HTML content using Foundry's stripScripts method
   */
  private sanitizeHTML(html: string): string {
    try {
      // Use Foundry's String.stripScripts method if available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof (String.prototype as any).stripScripts === 'function') {
        return html.stripScripts();
      }

      // If no Foundry methods available, return the original content
      // This is acceptable for calendar descriptions which are typically safe
      return html;
    } catch (error) {
      Logger.warn(
        'CalendarLoader: Failed to sanitize HTML, returning original content',
        error as Error
      );
      return html;
    }
  }
}
