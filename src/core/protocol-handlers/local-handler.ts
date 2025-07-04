/**
 * Local Protocol Handler for External Calendar Loading
 * Handles loading calendars from local file system
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
  hasFileExtension,
  hasSupportedExtension,
  parseLocationWithCalendarId,
  validateCalendarCollectionIndex,
  selectCalendarFromIndex,
} from './utils';

export class LocalProtocolHandler implements ProtocolHandler {
  readonly protocol: CalendarProtocol = 'local';

  /**
   * Check if this handler can process the given location
   */
  canHandle(location: CalendarLocation): boolean {
    // Exclude URLs
    if (location.includes('://')) {
      return false;
    }

    // Local paths can be:
    // - Absolute paths: /path/to/file.json, C:\path\to\file.json
    // - Relative paths: ./path/to/file.json, ../path/to/file.json, path/to/file.json

    // Check for absolute Unix-style paths
    if (location.startsWith('/')) {
      return !hasFileExtension(location) || hasSupportedExtension(location);
    }

    // Check for Windows-style paths
    if (/^[A-Za-z]:[\\//]/.test(location)) {
      return !hasFileExtension(location) || hasSupportedExtension(location);
    }

    // Check for relative paths
    if (location.startsWith('./') || location.startsWith('../')) {
      return !hasFileExtension(location) || hasSupportedExtension(location);
    }

    // For other cases, check if it could be a local file path
    // Must have supported extension or no extension (will add .json)
    if (hasFileExtension(location)) {
      if (!hasSupportedExtension(location)) {
        return false;
      }

      // Avoid conflicts with module paths (simple heuristic)
      const parts = location.split('/');

      // If it has many path segments or contains dots, it's likely a local path
      if (parts.length > 3 || (location.includes('.') && !location.includes(' '))) {
        return true;
      }

      // If it contains backslashes, it's likely Windows path
      if (location.includes('\\')) {
        return true;
      }
    } else {
      // No extension - check if it looks like a local path
      const parts = location.split('/');

      // If it has many path segments or contains dots, it's likely a local path
      if (parts.length > 3 || (location.includes('.') && !location.includes(' '))) {
        return true;
      }

      // If it contains backslashes, it's likely Windows path
      if (location.includes('\\')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Load a calendar from local file system
   */
  async loadCalendar(
    location: CalendarLocation,
    options: LoadCalendarOptions = {}
  ): Promise<SeasonsStarsCalendar> {
    try {
      // Parse location for fragments (calendar IDs)
      const { basePath, calendarId } = parseLocationWithCalendarId(location);
      const normalizedLocation = normalizeCalendarLocation(basePath);

      // Check if this is an index.json file (directory loading)
      if (normalizedLocation.endsWith('/index.json')) {
        return await this.loadFromIndex(normalizedLocation, calendarId, options);
      } else {
        return await this.loadDirectFile(normalizedLocation, options);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout: Failed to load calendar from local file: ${location}`);
        }
        Logger.error(`Failed to load calendar from local file: ${location}`, error);
        throw error;
      } else {
        const errorMessage = `Unknown error loading calendar from local file: ${location}`;
        Logger.error(errorMessage);
        throw new Error(errorMessage);
      }
    }
  }

  /**
   * Load calendar from collection index
   */
  private async loadFromIndex(
    indexPath: string,
    calendarId?: string,
    options: LoadCalendarOptions = {}
  ): Promise<SeasonsStarsCalendar> {
    // Load the collection index
    const index = await this.loadCollectionIndex(indexPath, options);

    // Use universal selection logic
    const selectionResult = selectCalendarFromIndex(
      index,
      calendarId,
      `Local directory ${indexPath}`
    );

    if (selectionResult.error) {
      throw new Error(selectionResult.error);
    }

    if (selectionResult.selectedEntry) {
      Logger.debug(
        `Loading calendar from index entry: ${selectionResult.selectedEntry.id} -> ${selectionResult.selectedEntry.file}`
      );

      // Resolve the calendar file path relative to the index path
      const basePath = indexPath.substring(0, indexPath.lastIndexOf('/'));
      let calendarPath = selectionResult.selectedEntry.file;

      // If the file path is relative, resolve it relative to base path
      if (
        !calendarPath.startsWith('/') &&
        !calendarPath.startsWith('./') &&
        !calendarPath.startsWith('../')
      ) {
        calendarPath = `${basePath}/${calendarPath}`;
      }

      return await this.loadDirectFile(calendarPath, options);
    }

    throw new Error(`Unexpected error in calendar selection from index`);
  }

  /**
   * Load collection index file
   */
  private async loadCollectionIndex(
    indexPath: string,
    options: LoadCalendarOptions = {}
  ): Promise<CalendarCollectionIndex> {
    Logger.debug(`Loading collection index from local file: ${indexPath}`);

    const response = await this.fetchWithOptions(indexPath, options);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Collection index not found: ${indexPath}`);
      } else if (response.status === 403) {
        throw new Error(`Permission denied accessing local index file: ${indexPath}`);
      } else {
        throw new Error(
          `Error loading local collection index: ${response.status} ${response.statusText}`
        );
      }
    }

    // Parse the index JSON
    let indexData: CalendarCollectionIndex;
    try {
      indexData = await response.json();
    } catch {
      throw new Error('Invalid JSON content in local collection index');
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
    filePath: string,
    options: LoadCalendarOptions = {}
  ): Promise<SeasonsStarsCalendar> {
    Logger.debug(`Loading calendar from local file: ${filePath}`);

    const response = await this.fetchWithOptions(filePath, options);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Local file not found: ${filePath}`);
      } else if (response.status === 403) {
        throw new Error(`Permission denied accessing local file: ${filePath}`);
      } else {
        throw new Error(`Error loading local file: ${response.status} ${response.statusText}`);
      }
    }

    // Parse the JSON response
    let calendarData: SeasonsStarsCalendar;
    try {
      calendarData = await response.json();
    } catch {
      throw new Error(`Invalid JSON in local file: ${filePath}`);
    }

    // Validate that it's a valid calendar object
    if (!calendarData || typeof calendarData !== 'object') {
      throw new Error('Invalid calendar data: not a valid JSON object');
    }

    if (!calendarData.id || !calendarData.months || !calendarData.weekdays) {
      throw new Error('Invalid calendar data: missing required fields (id, months, weekdays)');
    }

    Logger.info(`Successfully loaded calendar from local file: ${calendarData.id}`);
    return calendarData;
  }

  /**
   * Normalize local file path and execute fetch with error handling
   */
  private async fetchWithOptions(
    filePath: string,
    options: LoadCalendarOptions = {}
  ): Promise<Response> {
    // In browser environment, we need to use file:// protocol or relative paths
    // In Node.js environment (for testing), we might use fs module

    let fileUrl = filePath;

    // Normalize path for browser fetch
    if (filePath.startsWith('/')) {
      // Absolute path - in browser context, this would be relative to the server root
      fileUrl = filePath;
    } else if (/^[A-Za-z]:[\\//]/.test(filePath)) {
      // Windows absolute path - convert to file:// URL
      fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
    } else if (filePath.startsWith('./') || filePath.startsWith('../')) {
      // Relative path - use as-is
      fileUrl = filePath;
    } else {
      // Assume relative path
      fileUrl = `./${filePath}`;
    }

    Logger.debug(`Normalized local file URL: ${fileUrl}`);

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...options.headers,
      },
    };

    // Add timeout if specified
    if (options.timeout) {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), options.timeout);
      fetchOptions.signal = controller.signal;
    }

    // Attempt to fetch the local file
    try {
      return await fetch(fileUrl, fetchOptions);
    } catch (fetchError) {
      // Handle common local file access errors
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          throw new Error(`Request timeout: Failed to load from ${fileUrl}`);
        }
        if (
          fetchError.message.includes('Failed to fetch') ||
          fetchError.message.includes('Network request failed')
        ) {
          throw new Error(`Local file not found or not accessible: ${filePath}`);
        } else if (
          fetchError.message.includes('Permission denied') ||
          fetchError.message.includes('Access denied')
        ) {
          throw new Error(`Permission denied accessing local file: ${filePath}`);
        }
      }
      throw fetchError;
    }
  }

  /**
   * Check if a local calendar file has been updated
   * For local files, we can check the Last-Modified header or file stats
   */
  async checkForUpdates(location: CalendarLocation, lastModified?: string): Promise<boolean> {
    try {
      // Normalize location first
      const normalizedLocation = normalizeCalendarLocation(location);
      Logger.debug(`Checking for updates in local file: ${normalizedLocation}`);

      // Normalize path
      let fileUrl = normalizedLocation;
      if (normalizedLocation.startsWith('/')) {
        fileUrl = normalizedLocation;
      } else if (/^[A-Za-z]:[\\//]/.test(normalizedLocation)) {
        fileUrl = `file:///${normalizedLocation.replace(/\\/g, '/')}`;
      } else if (normalizedLocation.startsWith('./') || normalizedLocation.startsWith('../')) {
        fileUrl = normalizedLocation;
      } else {
        fileUrl = `./${normalizedLocation}`;
      }

      // Use HEAD request to check Last-Modified without downloading content
      try {
        const response = await fetch(fileUrl, {
          method: 'HEAD',
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          Logger.warn(`Failed to check local file for updates: ${location}`);
          return false;
        }

        // Check Last-Modified header
        const currentModified = response.headers.get('last-modified');
        if (!currentModified) {
          // No Last-Modified header available, assume potential update
          Logger.debug(
            `No Last-Modified header for local file ${location}, assuming potential update`
          );
          return true;
        }

        if (!lastModified) {
          // No previous modification time recorded, assume potential update
          Logger.debug(
            `No previous modification time for local file ${location}, assuming potential update`
          );
          return true;
        }

        const hasUpdates = currentModified !== lastModified;
        Logger.debug(
          `Last-Modified comparison for local file ${location}: ${lastModified} -> ${currentModified} (updated: ${hasUpdates})`
        );

        return hasUpdates;
      } catch (fetchError) {
        Logger.warn(`Error checking local file for updates: ${location}`, fetchError as Error);
        return false;
      }
    } catch (error) {
      Logger.error(`Error checking for updates in local file ${location}:`, error as Error);
      // On error, assume no updates to avoid unnecessary re-downloads
      return false;
    }
  }
}
