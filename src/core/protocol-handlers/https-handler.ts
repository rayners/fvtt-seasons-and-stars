/**
 * HTTPS Protocol Handler for External Calendar Loading
 * Handles loading calendars from HTTPS URLs with CORS support
 */

import type {
  ProtocolHandler,
  LoadCalendarOptions,
  CalendarProtocol,
  CalendarLocation,
  CalendarCollectionIndex,
} from '../../types/external-calendar';
import type { SeasonsStarsCalendar } from '../../types/calendar';
import { Logger } from '../logger';
import { devEnvironment } from '../dev-environment-detector';
import {
  normalizeCalendarLocation,
  parseLocationWithCalendarId,
  validateCalendarCollectionIndex,
  selectCalendarFromIndex,
} from './utils';

export class HttpsProtocolHandler implements ProtocolHandler {
  readonly protocol: CalendarProtocol = 'https';

  /**
   * Check if this handler can process the given location
   */
  canHandle(location: CalendarLocation): boolean {
    // Handle explicit HTTPS URLs
    if (location.startsWith('https://')) {
      return true;
    }

    // Handle URLs without protocol (assume HTTPS)
    if (
      (location.includes('.') && !location.includes('://') && !location.includes('/')) ||
      location.includes('/')
    ) {
      // Check if it looks like a domain or URL path
      const urlPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}([/].*)?$/;
      return urlPattern.test(location);
    }

    return false;
  }

  /**
   * Load a calendar from an HTTPS URL
   */
  async loadCalendar(
    location: CalendarLocation,
    options: LoadCalendarOptions = {}
  ): Promise<SeasonsStarsCalendar> {
    try {
      // Parse location for fragments (calendar IDs)
      const { basePath, calendarId } = parseLocationWithCalendarId(location);
      const normalizedLocation = normalizeCalendarLocation(basePath);

      // Normalize URL - add https:// if missing
      let url = normalizedLocation;
      if (!url.startsWith('https://') && !url.startsWith('http://')) {
        url = `https://${url}`;
      }

      // Check if this is an index.json file (directory loading)
      if (url.endsWith('/index.json')) {
        return await this.loadFromIndex(url, calendarId, options);
      } else {
        return await this.loadDirectFile(url, options);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout: Failed to load calendar from ${location}`);
        }
        Logger.error(`Failed to load calendar from HTTPS: ${location}`, error);
        throw error;
      } else {
        const errorMessage = `Unknown error loading calendar from ${location}`;
        Logger.error(errorMessage);
        throw new Error(errorMessage);
      }
    }
  }

  /**
   * Load calendar from collection index
   */
  private async loadFromIndex(
    indexUrl: string,
    calendarId?: string,
    options: LoadCalendarOptions = {}
  ): Promise<SeasonsStarsCalendar> {
    // Load the collection index
    const index = await this.loadCollectionIndex(indexUrl, options);

    // Use universal selection logic
    const selectionResult = selectCalendarFromIndex(
      index,
      calendarId,
      `HTTPS collection ${indexUrl}`
    );

    if (selectionResult.error) {
      throw new Error(selectionResult.error);
    }

    if (selectionResult.selectedEntry) {
      Logger.debug(
        `Loading calendar from index entry: ${selectionResult.selectedEntry.id} -> ${selectionResult.selectedEntry.file}`
      );

      // Resolve the calendar file URL relative to the index URL
      const baseUrl = indexUrl.substring(0, indexUrl.lastIndexOf('/'));
      let calendarUrl = selectionResult.selectedEntry.file;

      // If the file path is relative (doesn't start with http/https), resolve it relative to base URL
      if (!calendarUrl.startsWith('http://') && !calendarUrl.startsWith('https://')) {
        calendarUrl = `${baseUrl}/${calendarUrl}`;
      }

      return await this.loadDirectFile(calendarUrl, options);
    }

    throw new Error(`Unexpected error in calendar selection from index`);
  }

  /**
   * Load collection index file
   */
  private async loadCollectionIndex(
    indexUrl: string,
    options: LoadCalendarOptions = {}
  ): Promise<CalendarCollectionIndex> {
    Logger.debug(`Loading collection index from HTTPS: ${indexUrl}`);

    const response = await this.fetchWithOptions(indexUrl, options);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Collection index not found: ${indexUrl}`);
      } else if (response.status === 403) {
        throw new Error(
          `Access forbidden to collection index: ${response.status} ${response.statusText}`
        );
      } else if (response.status >= 500) {
        throw new Error(
          `Server error loading collection index: ${response.status} ${response.statusText}`
        );
      } else {
        throw new Error(
          `HTTP error loading collection index: ${response.status} ${response.statusText}`
        );
      }
    }

    // Parse the index JSON
    let indexData: CalendarCollectionIndex;
    try {
      indexData = await response.json();
    } catch {
      throw new Error('Invalid JSON content in collection index');
    }

    // Validate index structure
    validateCalendarCollectionIndex(indexData);

    Logger.info(
      `Successfully loaded collection index: ${indexData.name} (${indexData.calendars.length} calendars)`
    );
    return indexData;
  }

  /**
   * Load specific calendar file
   */
  private async loadDirectFile(
    url: string,
    options: LoadCalendarOptions = {}
  ): Promise<SeasonsStarsCalendar> {
    Logger.debug(`Loading calendar file from HTTPS: ${url}`);

    const response = await this.fetchWithOptions(url, options);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Calendar not found: ${response.status} ${response.statusText}`);
      } else if (response.status === 403) {
        throw new Error(`Access forbidden: ${response.status} ${response.statusText}`);
      } else if (response.status >= 500) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      } else {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }
    }

    // Parse the JSON response
    const calendarData = await response.json();

    // Validate that it's a valid calendar object
    if (!calendarData || typeof calendarData !== 'object') {
      throw new Error('Invalid calendar data: not a valid JSON object');
    }

    if (!calendarData.id || !calendarData.months || !calendarData.weekdays) {
      throw new Error('Invalid calendar data: missing required fields (id, months, weekdays)');
    }

    Logger.info(`Successfully loaded calendar from HTTPS: ${calendarData.id}`);
    return calendarData as SeasonsStarsCalendar;
  }

  /**
   * Execute fetch with standard options and error handling
   */
  private async fetchWithOptions(
    url: string,
    options: LoadCalendarOptions = {}
  ): Promise<Response> {
    // Get development-aware headers based on options and environment
    let shouldUseDevMode: boolean;
    if (options.enableDevMode === true) {
      shouldUseDevMode = true;
    } else if (options.enableDevMode === false) {
      shouldUseDevMode = false;
    } else {
      // enableDevMode is undefined - use environment detection
      shouldUseDevMode = devEnvironment.shouldUseDevMode();
    }

    const devHeaders = shouldUseDevMode ? devEnvironment.getDevHeaders() : {};

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'FoundryVTT/Seasons-and-Stars',
        ...devHeaders,
        ...options.headers,
      },
    };

    // Use development-aware timeout
    const timeout = options.timeout || 30000; // Default 30 seconds
    const devTimeout = devEnvironment.getDevTimeout(timeout);

    if (devTimeout !== timeout) {
      Logger.debug(
        `Using extended timeout for development: ${devTimeout}ms (default: ${timeout}ms)`
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), devTimeout);
    fetchOptions.signal = controller.signal;

    // Log development mode information
    if (devEnvironment.isDevelopment()) {
      Logger.debug(`Loading external calendar in development mode from: ${url}`, {
        devMode: true,
        timeout: devTimeout,
        headers: devHeaders,
      });
    }

    // Fetch with redirect handling
    try {
      const response = await this.fetchWithRedirectHandling(url, fetchOptions);
      clearTimeout(timeoutId);
      return response;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error(`Request timeout: Failed to load from ${url} (timeout: ${devTimeout}ms)`);
      }
      throw fetchError;
    }
  }

  /**
   * Fetch with robust 3xx redirect handling
   */
  private async fetchWithRedirectHandling(
    url: string,
    options: RequestInit,
    redirectCount: number = 0
  ): Promise<Response> {
    const maxRedirects = 10; // Conservative limit to prevent infinite loops

    if (redirectCount >= maxRedirects) {
      throw new Error(
        `Too many redirects (${redirectCount}): Request exceeded maximum redirect limit`
      );
    }

    // Disable automatic redirects to handle them manually
    const fetchOptions: RequestInit = {
      ...options,
      redirect: 'manual',
    };

    try {
      const response = await fetch(url, fetchOptions);

      // Check if this is a redirect response
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');

        if (!location) {
          throw new Error(`Redirect response (${response.status}) missing Location header`);
        }

        // Resolve the redirect URL (handle relative URLs)
        const redirectUrl = this.resolveRedirectUrl(url, location);

        // Validate the redirect URL for security
        this.validateRedirectUrl(url, redirectUrl);

        // Log redirect information for debugging
        Logger.debug(`Following redirect: ${response.status} ${url} -> ${redirectUrl}`, {
          redirectCount: redirectCount + 1,
          maxRedirects,
          responseStatus: response.status,
          originalUrl: url,
          redirectUrl,
        });

        // Prepare headers for the redirected request
        const redirectHeaders = this.prepareRedirectHeaders(
          response.status,
          options.headers as Record<string, string>
        );

        // Determine the method for the redirected request
        const redirectMethod = this.getRedirectMethod(response.status, options.method || 'GET');

        // Follow the redirect
        return await this.fetchWithRedirectHandling(
          redirectUrl,
          {
            ...options,
            method: redirectMethod,
            headers: redirectHeaders,
          },
          redirectCount + 1
        );
      }

      // Not a redirect, return the response
      if (redirectCount > 0) {
        Logger.debug(`Redirect chain completed: Final URL ${url} (${redirectCount} redirects)`);
      }

      return response;
    } catch (fetchError) {
      if (redirectCount > 0) {
        Logger.error(
          `Error during redirect chain at step ${redirectCount + 1}: ${url}`,
          fetchError as Error
        );
      }
      throw fetchError;
    }
  }

  /**
   * Resolve redirect URL handling both absolute and relative URLs
   */
  private resolveRedirectUrl(baseUrl: string, location: string): string {
    try {
      // If location is already absolute, use it
      if (location.startsWith('http://') || location.startsWith('https://')) {
        return location;
      }

      // Resolve relative URL against base URL
      const base = new URL(baseUrl);
      const resolved = new URL(location, base);
      return resolved.toString();
    } catch {
      throw new Error(`Invalid redirect URL: ${location} (base: ${baseUrl})`);
    }
  }

  /**
   * Validate redirect URL for security
   */
  private validateRedirectUrl(originalUrl: string, redirectUrl: string): void {
    try {
      const originalParsed = new URL(originalUrl);
      const redirectParsed = new URL(redirectUrl);

      // Only allow HTTPS redirects (security requirement)
      if (redirectParsed.protocol !== 'https:') {
        throw new Error(
          `Insecure redirect: ${originalUrl} attempted to redirect to non-HTTPS URL ${redirectUrl}`
        );
      }

      // Prevent redirects to localhost/private networks for security
      // (unless original URL was also localhost - for development)
      if (originalParsed.hostname !== 'localhost' && originalParsed.hostname !== '127.0.0.1') {
        if (
          redirectParsed.hostname === 'localhost' ||
          redirectParsed.hostname === '127.0.0.1' ||
          redirectParsed.hostname.startsWith('10.') ||
          redirectParsed.hostname.startsWith('192.168.') ||
          /^172\.(1[6-9]|2\d|3[01])\./.test(redirectParsed.hostname)
        ) {
          throw new Error(
            `Suspicious redirect: ${originalUrl} attempted to redirect to private network ${redirectUrl}`
          );
        }
      }

      // Log security validation for debugging
      Logger.debug(`Redirect security validation passed: ${originalUrl} -> ${redirectUrl}`);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Redirect validation failed: ${originalUrl} -> ${redirectUrl}`);
    }
  }

  /**
   * Prepare headers for redirect request based on redirect type
   */
  private prepareRedirectHeaders(
    statusCode: number,
    originalHeaders: Record<string, string> = {}
  ): Record<string, string> {
    const headers = { ...originalHeaders };

    // For 301, 302, 303: Remove sensitive headers that shouldn't be forwarded
    if (statusCode === 301 || statusCode === 302 || statusCode === 303) {
      // Remove authorization headers for cross-origin redirects
      delete headers.Authorization;
      delete headers.authorization;

      // Remove content-specific headers for method changes
      delete headers['Content-Type'];
      delete headers['content-type'];
      delete headers['Content-Length'];
      delete headers['content-length'];
    }

    // For 307, 308: Preserve all headers (temporary redirects should maintain request integrity)
    // Headers are preserved as-is for these status codes

    Logger.debug(`Prepared headers for ${statusCode} redirect`, {
      statusCode,
      originalHeaderCount: Object.keys(originalHeaders).length,
      finalHeaderCount: Object.keys(headers).length,
      removedHeaders:
        statusCode === 301 || statusCode === 302 || statusCode === 303
          ? ['Authorization', 'Content-Type', 'Content-Length']
          : [],
    });

    return headers;
  }

  /**
   * Determine HTTP method for redirect request
   */
  private getRedirectMethod(statusCode: number, originalMethod: string): string {
    // HEAD requests should always be preserved as HEAD (they serve a specific purpose)
    if (originalMethod === 'HEAD') {
      return 'HEAD';
    }

    // 301, 302, 303: Change to GET (standard behavior for POST/PUT/etc)
    if (statusCode === 301 || statusCode === 302 || statusCode === 303) {
      return 'GET';
    }

    // 307, 308: Preserve original method
    if (statusCode === 307 || statusCode === 308) {
      return originalMethod;
    }

    // Other redirect codes: default to GET
    return 'GET';
  }

  /**
   * Check if a calendar at the location has been updated
   */
  async checkForUpdates(location: CalendarLocation, lastEtag?: string): Promise<boolean> {
    try {
      // Normalize URL
      let url = location;
      if (!url.startsWith('https://') && !url.startsWith('http://')) {
        url = `https://${url}`;
      }

      Logger.debug(`Checking for updates at HTTPS: ${url}`);

      // Use HEAD request to check ETag without downloading content
      // Also handle redirects for update checking
      const response = await this.fetchWithRedirectHandling(url, {
        method: 'HEAD',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'FoundryVTT/Seasons-and-Stars',
        },
      });

      if (!response.ok) {
        Logger.warn(
          `Failed to check for updates at ${url}: ${response.status} ${response.statusText}`
        );
        return false;
      }

      // Check ETag header
      const currentEtag = response.headers.get('etag');
      if (!currentEtag) {
        // No ETag available, assume it might have changed
        Logger.debug(`No ETag available for ${url}, assuming potential update`);
        return true;
      }

      const hasUpdates = currentEtag !== lastEtag;
      Logger.debug(
        `ETag comparison for ${url}: ${lastEtag} -> ${currentEtag} (updated: ${hasUpdates})`
      );

      return hasUpdates;
    } catch (error) {
      Logger.error(`Error checking for updates at ${location}:`, error as Error);
      // On error, assume no updates to avoid unnecessary re-downloads
      return false;
    }
  }
}
