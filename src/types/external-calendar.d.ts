/**
 * Type definitions for external calendar loading system
 */

import type { SeasonsStarsCalendar } from './calendar';

/**
 * Protocol identifier for external calendar sources
 * Examples: 'https', 'github', 'module', 'local'
 */
export type CalendarProtocol = string;

/**
 * Location identifier for external calendar sources
 * Examples: 'example.com/calendar.json', 'user/repo/calendar.json', 'module-name/calendars/calendar.json'
 */
export type CalendarLocation = string;

/**
 * Full external calendar identifier in protocol:location format
 * Examples: 'https://example.com/calendar.json', 'github:user/repo/calendar.json'
 */
export type ExternalCalendarId = string;

/**
 * External calendar source configuration
 */
export interface ExternalCalendarSource {
  /** Protocol for this source (https, github, module, etc.) */
  protocol: CalendarProtocol;
  /** Location within the protocol (URL path, module path, etc.) */
  location: CalendarLocation;
  /** Human-readable label for this source */
  label?: string;
  /** Description of this calendar source */
  description?: string;
  /** When this source was last checked for updates */
  lastChecked?: number;
  /** Whether this source is enabled */
  enabled?: boolean;
  /** Trust level for this source */
  trusted?: boolean;
}

/**
 * Cached external calendar data
 */
export interface CachedCalendarData {
  /** The calendar data */
  calendar: SeasonsStarsCalendar;
  /** When this was cached (timestamp) */
  cachedAt: number;
  /** When this cache expires (timestamp) */
  expiresAt: number;
  /** The source this came from */
  source: ExternalCalendarSource;
  /** ETag or version for cache validation */
  etag?: string;
}

/**
 * Protocol handler interface for loading calendars from different sources
 */
export interface ProtocolHandler {
  /** The protocol this handler supports (e.g., 'https', 'github') */
  readonly protocol: CalendarProtocol;
  
  /**
   * Check if this handler can process the given location
   */
  canHandle(location: CalendarLocation): boolean;
  
  /**
   * Load a calendar from the given location
   */
  loadCalendar(location: CalendarLocation, options?: LoadCalendarOptions): Promise<SeasonsStarsCalendar>;
  
  /**
   * Check if a calendar at the location has been updated
   */
  checkForUpdates?(location: CalendarLocation, lastEtag?: string): Promise<boolean>;
}

/**
 * Options for loading external calendars
 */
export interface LoadCalendarOptions {
  /** Whether to use cached data if available */
  useCache?: boolean;
  /** Force refresh even if cached data is valid */
  forceRefresh?: boolean;
  /** Timeout for the request in milliseconds */
  timeout?: number;
  /** Additional headers for the request */
  headers?: Record<string, string>;
}

/**
 * Result of external calendar loading operation
 */
export interface LoadCalendarResult {
  /** Whether the operation was successful */
  success: boolean;
  /** The loaded calendar data (if successful) */
  calendar?: SeasonsStarsCalendar;
  /** Error message (if failed) */
  error?: string;
  /** Whether the data came from cache */
  fromCache?: boolean;
  /** The source this came from */
  source?: ExternalCalendarSource;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  /** Total number of cached calendars */
  totalCached: number;
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Cache hit rate (hits / (hits + misses)) */
  hitRate: number;
  /** Total cache size in bytes (approximate) */
  sizeBytes: number;
}

/**
 * External calendar registry configuration
 */
export interface ExternalCalendarConfig {
  /** Default cache duration in milliseconds (default: 1 week) */
  defaultCacheDuration?: number;
  /** Maximum cache size (number of calendars) */
  maxCacheSize?: number;
  /** Request timeout in milliseconds */
  requestTimeout?: number;
  /** Whether to enable automatic updates */
  autoUpdate?: boolean;
  /** How often to check for updates (milliseconds) */
  updateInterval?: number;
}

/**
 * Event data for external calendar events
 */
export interface ExternalCalendarEvent {
  /** Type of event */
  type: 'loaded' | 'cached' | 'updated' | 'error' | 'expired';
  /** The external calendar ID */
  calendarId: ExternalCalendarId;
  /** The calendar data (if applicable) */
  calendar?: SeasonsStarsCalendar;
  /** Error message (if applicable) */
  error?: string;
  /** Additional event data */
  data?: any;
}