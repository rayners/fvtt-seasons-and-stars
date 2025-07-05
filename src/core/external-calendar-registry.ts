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
import { devEnvironment, DevEnvironmentDetector } from './dev-environment-detector';

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
   * Supports multiple namespace formats:
   * - protocol:namespace/calendar-id (slash-separated namespace)
   * - protocol:namespace:calendar-id (colon-separated namespace)
   * - protocol:github.com/user/repo/calendar-id (URL-based namespace)
   */
  parseExternalCalendarId(externalId: ExternalCalendarId): {
    protocol: CalendarProtocol;
    location: CalendarLocation;
    namespace?: string;
    calendarId?: string;
  } {
    const colonIndex = externalId.indexOf(':');

    if (colonIndex === -1 || colonIndex === 0 || colonIndex === externalId.length - 1) {
      throw new Error(
        `Invalid external calendar ID format: ${externalId}. Expected format: protocol:location`
      );
    }

    const protocol = externalId.substring(0, colonIndex);
    const locationPart = externalId.substring(colonIndex + 1);

    // Parse namespace from location part
    const parsedLocation = this.parseLocationWithNamespace(locationPart);

    return {
      protocol,
      location: locationPart,
      namespace: parsedLocation.namespace,
      calendarId: parsedLocation.calendarId,
    };
  }

  /**
   * Parse location part to extract namespace and calendar ID
   * Supports multiple namespace formats:
   * - namespace/calendar-id (slash-separated)
   * - namespace:calendar-id (colon-separated)
   * - github.com/user/repo/calendar-id (URL-based)
   */
  private parseLocationWithNamespace(location: CalendarLocation): {
    namespace?: string;
    calendarId?: string;
  } {
    // Check for slash-separated namespace (most common)
    const slashIndex = location.indexOf('/');
    if (slashIndex > 0 && slashIndex < location.length - 1) {
      // Handle URL-based namespaces (e.g., github.com/user/repo/calendar-id)
      if (location.includes('://') || location.includes('.com/') || location.includes('.org/')) {
        // This is likely a URL-based namespace
        const lastSlashIndex = location.lastIndexOf('/');
        if (lastSlashIndex > slashIndex) {
          return {
            namespace: location.substring(0, lastSlashIndex),
            calendarId: location.substring(lastSlashIndex + 1),
          };
        }
      }

      // For multi-part paths like user/repo/calendar.json, find the last slash
      // to get the calendar filename, and use everything before as namespace
      const lastSlashIndex = location.lastIndexOf('/');
      if (lastSlashIndex > slashIndex) {
        // Multiple slashes - use last slash to separate calendar from namespace
        return {
          namespace: location.substring(0, lastSlashIndex),
          calendarId: location.substring(lastSlashIndex + 1),
        };
      } else {
        // Simple namespace/calendar-id format
        return {
          namespace: location.substring(0, slashIndex),
          calendarId: location.substring(slashIndex + 1),
        };
      }
    }

    // Check for colon-separated namespace
    const colonIndex = location.indexOf(':');
    if (colonIndex > 0 && colonIndex < location.length - 1) {
      return {
        namespace: location.substring(0, colonIndex),
        calendarId: location.substring(colonIndex + 1),
      };
    }

    // No namespace found - this is a simple calendar ID
    return {
      namespace: undefined,
      calendarId: location,
    };
  }

  /**
   * Generate a unique calendar ID from external source information
   * Uses namespace to reduce collision likelihood
   */
  generateUniqueCalendarId(externalId: ExternalCalendarId, baseCalendarId: string): string {
    const parsed = this.parseExternalCalendarId(externalId);

    // If there's a namespace, use it as a prefix
    if (parsed.namespace) {
      // Convert namespace to a safe identifier format
      const safeNamespace = this.sanitizeNamespace(parsed.namespace);
      return `${safeNamespace}/${baseCalendarId}`;
    }

    // No namespace - use the original calendar ID
    return baseCalendarId;
  }

  /**
   * Convert namespace to a safe identifier format
   * Handles different namespace formats consistently
   */
  private sanitizeNamespace(namespace: string): string {
    // Remove protocols and common domains for cleaner namespaces
    let sanitized = namespace
      .replace(/^https?:\/\//, '')
      .replace(/^github\.com\//, 'gh/')
      .replace(/^gitlab\.com\//, 'gl/')
      .replace(/\.git$/, '');

    // Replace invalid characters with safe alternatives
    sanitized = sanitized
      .replace(/[^a-zA-Z0-9\-._/]/g, '-') // Replace invalid chars with hyphens
      .replace(/\/+/g, '/') // Collapse multiple slashes
      .replace(/^\/|\/$/g, ''); // Remove leading/trailing slashes

    return sanitized;
  }

  /**
   * Check if a namespaced calendar ID would conflict with existing calendars
   * Returns the calendar ID to use (may be modified to avoid conflicts)
   */
  resolveCalendarIdConflict(proposedId: string, existingCalendarIds: Set<string>): string {
    let resolvedId = proposedId;
    let counter = 1;

    // Keep incrementing counter until we find a unique ID
    while (existingCalendarIds.has(resolvedId)) {
      resolvedId = `${proposedId}-${counter}`;
      counter++;
    }

    if (resolvedId !== proposedId) {
      Logger.warn(`Calendar ID conflict resolved: ${proposedId} -> ${resolvedId}`);
    }

    return resolvedId;
  }

  /**
   * Extract namespace from an external calendar ID for display purposes
   */
  getNamespaceDisplayName(externalId: ExternalCalendarId): string | null {
    const parsed = this.parseExternalCalendarId(externalId);

    if (!parsed.namespace) {
      return null;
    }

    // Convert technical namespaces to user-friendly display names
    let displayName = parsed.namespace;

    // Handle common patterns based on original namespace before sanitization
    if (displayName.startsWith('github.com/')) {
      // Extract user/repo from github.com/user/repo
      const userRepo = displayName.substring('github.com/'.length);
      displayName = `GitHub: ${userRepo}`;
    } else if (displayName.startsWith('gitlab.com/')) {
      // Extract user/repo from gitlab.com/user/repo
      const userRepo = displayName.substring('gitlab.com/'.length);
      displayName = `GitLab: ${userRepo}`;
    } else if (displayName.startsWith('gh/')) {
      displayName = `GitHub: ${displayName.substring(3)}`;
    } else if (displayName.startsWith('gl/')) {
      displayName = `GitLab: ${displayName.substring(3)}`;
    } else {
      // Generic namespace - just add prefix
      displayName = `Source: ${displayName}`;
    }

    return displayName;
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
      // Skip caching for local files, development modules, and localhost environments
      const skipCache = this.shouldSkipCache(protocol, location, options);
      if (skipCache) {
        const reason = this.getCacheSkipReason(protocol, location, options);
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

    // Parse namespace information if not already provided
    let parsedLocation: { namespace?: string; calendarId?: string } = {
      namespace: undefined,
      calendarId: undefined,
    };
    if (source.location) {
      parsedLocation = this.parseLocationWithNamespace(source.location);
    }

    const enrichedSource = {
      enabled: true,
      trusted: false,
      ...source,
      namespace: source.namespace || parsedLocation.namespace,
      calendarId: source.calendarId || parsedLocation.calendarId,
    };

    if (existingIndex >= 0) {
      // Update existing source
      this.externalSources[existingIndex] = {
        ...this.externalSources[existingIndex],
        ...enrichedSource,
      };
    } else {
      // Add new source
      this.externalSources.push(enrichedSource);
    }

    Logger.debug(
      `Added external calendar source: ${externalId}` +
        (enrichedSource.namespace ? ` (namespace: ${enrichedSource.namespace})` : '')
    );
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
    if (
      config.maxCacheSize !== undefined ||
      config.defaultCacheDuration !== undefined ||
      config.enableLocalStorage !== undefined ||
      config.localStoragePrefix !== undefined ||
      config.localStorageMaxSizeMB !== undefined
    ) {
      this.cache.configure({
        maxSize: config.maxCacheSize !== undefined ? config.maxCacheSize : this.config.maxCacheSize,
        defaultTtl:
          config.defaultCacheDuration !== undefined
            ? config.defaultCacheDuration
            : this.config.defaultCacheDuration,
        enableLocalStorage:
          config.enableLocalStorage !== undefined ? config.enableLocalStorage : true,
        localStoragePrefix:
          config.localStoragePrefix !== undefined
            ? config.localStoragePrefix
            : 'fvtt-seasons-stars-cache',
        localStorageMaxSizeMB:
          config.localStorageMaxSizeMB !== undefined ? config.localStorageMaxSizeMB : 10,
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
   * Get LocalStorage cache information
   */
  getLocalStorageInfo() {
    return this.cache.getLocalStorageInfo();
  }

  /**
   * Manually trigger LocalStorage cleanup
   */
  cleanupLocalStorage(): void {
    this.cache.cleanupLocalStorageManually();
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

    // Skip caching if dev mode is explicitly enabled
    if (options.enableDevMode === true) {
      return true;
    }

    // Skip caching if we're in a development environment, unless explicitly disabled
    if (options.enableDevMode === undefined && devEnvironment.shouldDisableCaching()) {
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

    // Skip caching for URLs that appear to be development URLs
    if ((protocol === 'https' || protocol === 'http') && this.isDevUrl(location)) {
      return true;
    }

    return false;
  }

  /**
   * Get a human-readable reason for why caching was skipped
   */
  private getCacheSkipReason(
    protocol: CalendarProtocol,
    location: CalendarLocation,
    options?: LoadCalendarOptions
  ): string {
    if (protocol === 'local') {
      return 'local file';
    }
    if (options?.enableDevMode) {
      return 'explicitly enabled development mode';
    }
    if (devEnvironment.shouldDisableCaching()) {
      return 'localhost/development environment';
    }
    if (protocol === 'module' && this.isModuleDevelopmentVersion(location)) {
      return 'module development version';
    }
    if ((protocol === 'https' || protocol === 'http') && this.isDevUrl(location)) {
      return 'development URL';
    }
    return 'development mode';
  }

  /**
   * Check if a URL appears to be a development URL
   */
  private isDevUrl(location: CalendarLocation): boolean {
    // For external calendar locations that are actually URLs within the location string
    if (location.includes('://')) {
      return DevEnvironmentDetector.isDevUrl(location);
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
   * Get development environment information (useful for debugging)
   */
  getDevEnvironmentInfo() {
    return devEnvironment.getEnvironmentInfo();
  }

  /**
   * Check if currently in development mode
   */
  isInDevelopmentMode(): boolean {
    return devEnvironment.isDevelopment();
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
