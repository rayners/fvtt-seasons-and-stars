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
    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'FoundryVTT/Seasons-and-Stars',
        ...options.headers,
      },
    };

    // Add timeout if specified
    if (options.timeout) {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), options.timeout);
      fetchOptions.signal = controller.signal;
    }

    // Fetch the data
    try {
      return await fetch(url, fetchOptions);
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error(`Request timeout: Failed to load from ${url}`);
      }
      throw fetchError;
    }
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
      const response = await fetch(url, {
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
