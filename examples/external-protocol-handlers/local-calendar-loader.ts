/**
 * External Local Protocol Handler Example
 * 
 * This file demonstrates how to register a custom protocol handler for loading
 * calendars from local file system. This handler is registered via the 
 * seasons-stars:registerCalendarLoaders hook and operates independently of the core code.
 * 
 * @example Usage in your module:
 * ```typescript
 * import { LocalCalendarLoader } from './path/to/local-calendar-loader';
 * 
 * Hooks.on('seasons-stars:registerCalendarLoaders', ({ registerHandler }) => {
 *   registerHandler(new LocalCalendarLoader());
 * });
 * ```
 */

import type {
  ProtocolHandler,
  LoadCalendarOptions,
  CalendarProtocol,
  CalendarLocation,
  CalendarCollectionIndex,
} from '../../src/types/external-calendar';
import type { SeasonsStarsCalendar } from '../../src/types/calendar';

export class LocalCalendarLoader implements ProtocolHandler {
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
      return !this.hasFileExtension(location) || this.hasSupportedExtension(location);
    }

    // Check for Windows-style paths
    if (/^[A-Za-z]:[\\//]/.test(location)) {
      return !this.hasFileExtension(location) || this.hasSupportedExtension(location);
    }

    // Check for relative paths
    if (location.startsWith('./') || location.startsWith('../')) {
      return !this.hasFileExtension(location) || this.hasSupportedExtension(location);
    }

    // For other cases, check if it could be a local file path
    // Must have supported extension or no extension (will add .json)
    if (this.hasFileExtension(location)) {
      if (!this.hasSupportedExtension(location)) {
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
   * Check if location has a file extension
   */
  private hasFileExtension(location: CalendarLocation): boolean {
    const lastDotIndex = location.lastIndexOf('.');
    const lastSlashIndex = Math.max(location.lastIndexOf('/'), location.lastIndexOf('\\'));
    return lastDotIndex > lastSlashIndex && lastDotIndex > 0;
  }

  /**
   * Check if location has a supported file extension
   */
  private hasSupportedExtension(location: CalendarLocation): boolean {
    const supportedExtensions = ['.json'];
    return supportedExtensions.some(ext => location.toLowerCase().endsWith(ext));
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
      const { basePath, calendarId } = this.parseLocationWithCalendarId(location);
      const normalizedLocation = this.normalizeCalendarLocation(basePath);

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
        console.error(`Failed to load calendar from local file: ${location}`, error);
        throw error;
      } else {
        const errorMessage = `Unknown error loading calendar from local file: ${location}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }
    }
  }

  /**
   * Parse location with calendar ID fragment
   */
  private parseLocationWithCalendarId(location: CalendarLocation): {
    basePath: string;
    calendarId?: string;
  } {
    const hashIndex = location.indexOf('#');
    if (hashIndex === -1) {
      return { basePath: location };
    }

    return {
      basePath: location.substring(0, hashIndex),
      calendarId: location.substring(hashIndex + 1),
    };
  }

  /**
   * Normalize calendar location (add .json if needed)
   */
  private normalizeCalendarLocation(location: CalendarLocation): CalendarLocation {
    // If it's a directory path (ends with / or \), add index.json
    if (location.endsWith('/') || location.endsWith('\\')) {
      return `${location}index.json`;
    }

    // If it doesn't have an extension, add .json
    if (!this.hasFileExtension(location)) {
      return `${location}.json`;
    }

    return location;
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
    const selectionResult = this.selectCalendarFromIndex(
      index,
      calendarId,
      `Local directory ${indexPath}`
    );

    if (selectionResult.error) {
      throw new Error(selectionResult.error);
    }

    if (selectionResult.selectedEntry) {
      console.debug(
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
   * Select calendar from collection index
   */
  private selectCalendarFromIndex(
    index: CalendarCollectionIndex,
    calendarId?: string,
    sourceName?: string
  ): {
    selectedEntry?: any;
    error?: string;
  } {
    if (index.calendars.length === 0) {
      return { error: `No calendars found in ${sourceName || 'collection'}` };
    }

    if (index.calendars.length === 1) {
      // Single calendar - use it regardless of calendarId
      return { selectedEntry: index.calendars[0] };
    }

    // Multiple calendars - require calendarId
    if (!calendarId) {
      const availableIds = index.calendars.map(cal => cal.id).join(', ');
      return {
        error: `Multiple calendars found in ${sourceName || 'collection'}. Specify calendar ID: ${availableIds}`
      };
    }

    const selectedEntry = index.calendars.find(cal => cal.id === calendarId);
    if (!selectedEntry) {
      const availableIds = index.calendars.map(cal => cal.id).join(', ');
      return {
        error: `Calendar '${calendarId}' not found in ${sourceName || 'collection'}. Available: ${availableIds}`
      };
    }

    return { selectedEntry };
  }

  /**
   * Load collection index file
   */
  private async loadCollectionIndex(
    indexPath: string,
    options: LoadCalendarOptions = {}
  ): Promise<CalendarCollectionIndex> {
    console.debug(`Loading collection index from local file: ${indexPath}`);

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
    this.validateCalendarCollectionIndex(indexData);

    console.info(
      `Successfully loaded collection index: ${indexData.name} (${indexData.calendars.length} calendars)`
    );
    return indexData;
  }

  /**
   * Basic validation of calendar collection index
   */
  private validateCalendarCollectionIndex(index: CalendarCollectionIndex): void {
    if (!index || typeof index !== 'object') {
      throw new Error('Invalid collection index: not a valid JSON object');
    }

    if (!index.name || typeof index.name !== 'string') {
      throw new Error('Invalid collection index: missing or invalid name field');
    }

    if (!Array.isArray(index.calendars)) {
      throw new Error('Invalid collection index: calendars field must be an array');
    }

    // Validate each calendar entry
    for (const calendar of index.calendars) {
      if (!calendar.id || !calendar.name || !calendar.file) {
        throw new Error('Invalid collection index: calendar entries must have id, name, and file fields');
      }
    }
  }

  /**
   * Load specific calendar file
   */
  private async loadDirectFile(
    filePath: string,
    options: LoadCalendarOptions = {}
  ): Promise<SeasonsStarsCalendar> {
    console.debug(`Loading calendar from local file: ${filePath}`);

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

    console.info(`Successfully loaded calendar from local file: ${calendarData.id}`);
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

    console.debug(`Normalized local file URL: ${fileUrl}`);

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...options.headers,
      },
    };

    // Use timeout
    const timeout = options.timeout || 10000; // Default 10 seconds for local files

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    fetchOptions.signal = controller.signal;

    // Attempt to fetch the local file
    try {
      const response = await fetch(fileUrl, fetchOptions);
      clearTimeout(timeoutId);
      return response;
    } catch (fetchError) {
      clearTimeout(timeoutId);

      // Handle common local file access errors
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          throw new Error(
            `Request timeout: Failed to load from ${fileUrl} (timeout: ${timeout}ms)`
          );
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
      const normalizedLocation = this.normalizeCalendarLocation(location);
      console.debug(`Checking for updates in local file: ${normalizedLocation}`);

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
          console.warn(`Failed to check local file for updates: ${location}`);
          return false;
        }

        // Check Last-Modified header
        const currentModified = response.headers.get('last-modified');
        if (!currentModified) {
          // No Last-Modified header available, assume potential update
          console.debug(
            `No Last-Modified header for local file ${location}, assuming potential update`
          );
          return true;
        }

        if (!lastModified) {
          // No previous modification time recorded, assume potential update
          console.debug(
            `No previous modification time for local file ${location}, assuming potential update`
          );
          return true;
        }

        const hasUpdates = currentModified !== lastModified;
        console.debug(
          `Last-Modified comparison for local file ${location}: ${lastModified} -> ${currentModified} (updated: ${hasUpdates})`
        );

        return hasUpdates;
      } catch (fetchError) {
        console.warn(`Error checking local file for updates: ${location}`, fetchError);
        return false;
      }
    } catch (error) {
      console.error(`Error checking for updates in local file ${location}:`, error);
      // On error, assume no updates to avoid unnecessary re-downloads
      return false;
    }
  }
}