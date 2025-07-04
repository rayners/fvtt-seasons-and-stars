/**
 * External calendar registry for managing different protocol handlers and external calendar sources
 */

import type {
  ProtocolHandler,
  ExternalCalendarSource,
  LoadCalendarResult,
  LoadCalendarOptions,
  ExternalCalendarConfig,
  ExternalCalendarEvent,
  CalendarProtocol,
  CalendarLocation,
  ExternalCalendarId,
} from '../types/external-calendar';
import { ExternalCalendarCache } from './external-calendar-cache';
import { Logger } from './logger';

type EventListener = (event: ExternalCalendarEvent) => void;

export class ExternalCalendarRegistry {
  private handlers = new Map<CalendarProtocol, ProtocolHandler>();
  private cache: ExternalCalendarCache;
  private externalSources: ExternalCalendarSource[] = [];
  private eventListeners = new Map<string, EventListener[]>();

  private config: ExternalCalendarConfig = {
    defaultCacheDuration: 7 * 24 * 60 * 60 * 1000, // 1 week
    maxCacheSize: 100,
    requestTimeout: 30000,
    autoUpdate: false,
    updateInterval: 24 * 60 * 60 * 1000, // 24 hours
  };

  constructor() {
    this.cache = new ExternalCalendarCache();
  }

  /**
   * Register a protocol handler
   */
  registerHandler(handler: ProtocolHandler): void {
    if (this.handlers.has(handler.protocol)) {
      throw new Error(`Protocol ${handler.protocol} already registered`);
    }

    this.handlers.set(handler.protocol, handler);
    Logger.debug(`Registered protocol handler: ${handler.protocol}`);
  }

  /**
   * Unregister a protocol handler
   */
  unregisterHandler(protocol: CalendarProtocol): void {
    const deleted = this.handlers.delete(protocol);
    if (deleted) {
      Logger.debug(`Unregistered protocol handler: ${protocol}`);
    }
  }

  /**
   * Check if protocol handler is registered
   */
  hasHandler(protocol: CalendarProtocol): boolean {
    return this.handlers.has(protocol);
  }

  /**
   * Get list of registered protocols
   */
  getRegisteredProtocols(): CalendarProtocol[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Parse external calendar ID into protocol and location
   */
  parseExternalCalendarId(externalId: ExternalCalendarId): {
    protocol: CalendarProtocol;
    location: CalendarLocation;
  } {
    const colonIndex = externalId.indexOf(':');

    if (colonIndex === -1 || colonIndex === 0 || colonIndex === externalId.length - 1) {
      throw new Error(
        `Invalid external calendar ID format: ${externalId}. Expected format: protocol:location`
      );
    }

    return {
      protocol: externalId.substring(0, colonIndex),
      location: externalId.substring(colonIndex + 1),
    };
  }

  /**
   * Load calendar from external source
   */
  async loadExternalCalendar(
    externalId: ExternalCalendarId,
    options: LoadCalendarOptions = {}
  ): Promise<LoadCalendarResult> {
    try {
      const { protocol, location } = this.parseExternalCalendarId(externalId);

      // Check if handler exists for protocol
      const handler = this.handlers.get(protocol);
      if (!handler) {
        const error = `No handler found for protocol: ${protocol}`;
        this.emitEvent('calendar-error', { type: 'error', calendarId: externalId, error });
        return { success: false, error };
      }

      // Check cache first (unless force refresh or development workflows)
      // Skip caching for local files and development modules to support development workflows
      const skipCache = this.shouldSkipCache(protocol, location, options);
      if (skipCache) {
        const reason = protocol === 'local' ? 'local file' : 'module development mode';
        Logger.debug(`Skipping cache for ${reason}: ${location} (development mode)`);
      }
      if (!options.forceRefresh && options.useCache !== false && !skipCache) {
        const cached = this.cache.get(externalId);
        if (cached) {
          this.emitEvent('calendar-cached', {
            type: 'cached',
            calendarId: externalId,
            calendar: cached.calendar,
          });
          return {
            success: true,
            calendar: cached.calendar,
            fromCache: true,
            source: cached.source,
          };
        }
      }

      // Load from handler
      const calendar = await handler.loadCalendar(location, options);

      // Create source info
      const source: ExternalCalendarSource = {
        protocol,
        location,
        lastChecked: Date.now(),
        enabled: true,
        trusted: true, // TODO: Implement trust system
      };

      // Cache the result (skip caching for local files)
      if (!skipCache) {
        const expiresAt = Date.now() + (this.config.defaultCacheDuration || 604800000); // 1 week default
        this.cache.set(externalId, calendar, source, expiresAt);
      } else {
        Logger.debug(`Not caching local file: ${location} (development mode)`);
      }

      this.emitEvent('calendar-loaded', {
        type: 'loaded',
        calendarId: externalId,
        calendar,
      });

      return {
        success: true,
        calendar,
        fromCache: false,
        source,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Failed to load external calendar ${externalId}`, error as Error);

      this.emitEvent('calendar-error', {
        type: 'error',
        calendarId: externalId,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Add external calendar source
   */
  addExternalSource(source: ExternalCalendarSource): void {
    // Check for duplicates
    const externalId = `${source.protocol}:${source.location}`;
    const existingIndex = this.externalSources.findIndex(
      s => `${s.protocol}:${s.location}` === externalId
    );

    if (existingIndex >= 0) {
      // Update existing source
      this.externalSources[existingIndex] = { ...this.externalSources[existingIndex], ...source };
    } else {
      // Add new source
      this.externalSources.push({ enabled: true, trusted: false, ...source });
    }

    Logger.debug(`Added external calendar source: ${externalId}`);
  }

  /**
   * Remove external calendar source
   */
  removeExternalSource(externalId: ExternalCalendarId): void {
    const { protocol, location } = this.parseExternalCalendarId(externalId);

    const index = this.externalSources.findIndex(
      s => s.protocol === protocol && s.location === location
    );

    if (index >= 0) {
      this.externalSources.splice(index, 1);
      // Also remove from cache
      this.cache.delete(externalId);
      Logger.debug(`Removed external calendar source: ${externalId}`);
    }
  }

  /**
   * Update external source configuration
   */
  updateExternalSource(
    externalId: ExternalCalendarId,
    updates: Partial<ExternalCalendarSource>
  ): void {
    const { protocol, location } = this.parseExternalCalendarId(externalId);

    const source = this.externalSources.find(
      s => s.protocol === protocol && s.location === location
    );

    if (source) {
      Object.assign(source, updates);
      Logger.debug(`Updated external calendar source: ${externalId}`);
    }
  }

  /**
   * Get all external calendar sources
   */
  getExternalSources(): ExternalCalendarSource[] {
    return [...this.externalSources];
  }

  /**
   * Configure the registry
   */
  configure(config: Partial<ExternalCalendarConfig>): void {
    this.config = { ...this.config, ...config };

    // Apply cache configuration
    if (config.maxCacheSize !== undefined || config.defaultCacheDuration !== undefined) {
      this.cache.configure({
        maxSize: config.maxCacheSize !== undefined ? config.maxCacheSize : this.config.maxCacheSize,
        defaultTtl:
          config.defaultCacheDuration !== undefined
            ? config.defaultCacheDuration
            : this.config.defaultCacheDuration,
      });
    }

    Logger.debug('External calendar registry configured', this.config);
  }

  /**
   * Get current configuration
   */
  getConfiguration(): ExternalCalendarConfig {
    return { ...this.config };
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Determine if caching should be skipped for a given protocol and location
   */
  private shouldSkipCache(
    protocol: CalendarProtocol,
    location: CalendarLocation,
    options: LoadCalendarOptions
  ): boolean {
    // Always skip caching for local files
    if (protocol === 'local') {
      return true;
    }

    // Skip caching for modules if explicitly requested
    if (protocol === 'module' && options.skipModuleCache) {
      return true;
    }

    // Skip caching for development modules
    if (protocol === 'module') {
      return this.isModuleDevelopmentVersion(location);
    }

    return false;
  }

  /**
   * Check if a module appears to be a development version
   */
  private isModuleDevelopmentVersion(location: CalendarLocation): boolean {
    try {
      const parts = location.split('/');
      if (parts.length < 2) return false;

      const moduleName = parts[0];

      // Check if game object is available
      if (typeof game === 'undefined' || !game.modules) {
        return false;
      }

      const module = game.modules.get(moduleName);
      if (!module || !module.active) {
        return false;
      }

      // Check for development indicators in version
      const version = module.version || module.manifest?.version || '';
      const isDevelopmentVersion =
        version.includes('dev') ||
        version.includes('beta') ||
        version.includes('alpha') ||
        version.includes('snapshot') ||
        version.includes('pre') ||
        version === '' ||
        version.startsWith('0.0.') ||
        version.includes('-'); // Semantic versioning pre-release indicators

      if (isDevelopmentVersion) {
        Logger.debug(
          `Module ${moduleName} detected as development version (${version}), skipping cache`
        );
      }

      return isDevelopmentVersion;
    } catch (error) {
      // If we can't determine module version, default to caching
      Logger.warn(`Error checking module development version for ${location}:`, error as Error);
      return false;
    }
  }

  /**
   * Register event listener
   */
  on(eventType: string, listener: EventListener): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * Remove event listener
   */
  off(eventType: string, listener: EventListener): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(eventType: string, event: ExternalCalendarEvent): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          Logger.error(`Error in event listener for ${eventType}`, error as Error);
        }
      });
    }
  }

  /**
   * Destroy registry and cleanup resources
   */
  destroy(): void {
    this.cache.destroy();
    this.handlers.clear();
    this.externalSources = [];
    this.eventListeners.clear();
  }
}
