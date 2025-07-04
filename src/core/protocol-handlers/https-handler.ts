/**
 * HTTPS Protocol Handler for External Calendar Loading
 * Handles loading calendars from HTTPS URLs with CORS support
 */

import type { 
  ProtocolHandler, 
  LoadCalendarOptions,
  CalendarProtocol,
  CalendarLocation
} from '../../types/external-calendar';
import type { SeasonsStarsCalendar } from '../../types/calendar';
import { Logger } from '../logger';
import { normalizeCalendarLocation } from './utils';

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
    if (location.includes('.') && !location.includes('://') && !location.includes('/') || location.includes('/')) {
      // Check if it looks like a domain or URL path
      const urlPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}([/].*)?$/;
      return urlPattern.test(location);
    }
    
    return false;
  }

  /**
   * Load a calendar from an HTTPS URL
   */
  async loadCalendar(location: CalendarLocation, options: LoadCalendarOptions = {}): Promise<SeasonsStarsCalendar> {
    try {
      // Normalize location - add .json extension if no extension specified
      const normalizedLocation = normalizeCalendarLocation(location);
      
      // Normalize URL - add https:// if missing
      let url = normalizedLocation;
      if (!url.startsWith('https://') && !url.startsWith('http://')) {
        url = `https://${url}`;
      }

      Logger.debug(`Loading calendar from HTTPS: ${url}`);

      // Prepare fetch options
      const fetchOptions: RequestInit = {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FoundryVTT/Seasons-and-Stars',
          ...options.headers
        }
      };

      // Add timeout if specified
      if (options.timeout) {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), options.timeout);
        fetchOptions.signal = controller.signal;
      }

      // Fetch the calendar data
      let response: Response;
      try {
        response = await fetch(url, fetchOptions);
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error(`Request timeout: Failed to load calendar from ${location}`);
        }
        throw fetchError;
      }

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
          'Accept': 'application/json',
          'User-Agent': 'FoundryVTT/Seasons-and-Stars'
        }
      });

      if (!response.ok) {
        Logger.warn(`Failed to check for updates at ${url}: ${response.status} ${response.statusText}`);
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
      Logger.debug(`ETag comparison for ${url}: ${lastEtag} -> ${currentEtag} (updated: ${hasUpdates})`);
      
      return hasUpdates;

    } catch (error) {
      Logger.error(`Error checking for updates at ${location}:`, error as Error);
      // On error, assume no updates to avoid unnecessary re-downloads
      return false;
    }
  }
}