/**
 * Module Protocol Handler for External Calendar Loading
 * Handles loading calendars from other Foundry VTT modules
 */

import type { 
  ProtocolHandler, 
  LoadCalendarOptions,
  CalendarProtocol,
  CalendarLocation
} from '../../types/external-calendar';
import type { SeasonsStarsCalendar } from '../../types/calendar';
import { Logger } from '../logger';
import { normalizeCalendarLocation, hasFileExtension } from './utils';

export class ModuleProtocolHandler implements ProtocolHandler {
  readonly protocol: CalendarProtocol = 'module';

  /**
   * Check if this handler can process the given location
   */
  canHandle(location: CalendarLocation): boolean {
    // Module paths should be in format: module-name/path/to/file.json
    // Must have at least module-name/file pattern
    const parts = location.split('/');
    
    // Exclude obvious URLs
    if (location.startsWith('https://') || location.startsWith('http://') || location.includes('://')) {
      return false;
    }

    // Must have at least 2 parts (module-name, filename)
    if (parts.length < 2) {
      return false;
    }

    // First part should look like a module name (alphanumeric, hyphens, underscores)
    const moduleNamePattern = /^[a-zA-Z0-9_-]+$/;
    if (!moduleNamePattern.test(parts[0])) {
      return false;
    }

    // Check if the filename has a supported extension or no extension
    // (we'll add .json automatically if no extension)
    const filename = parts[parts.length - 1];
    if (hasFileExtension(filename)) {
      // If it has an extension, it should be .json, .yml, or .yaml
      const supportedExtensions = ['json', 'yml', 'yaml'];
      const extension = filename.split('.').pop()?.toLowerCase();
      if (!extension || !supportedExtensions.includes(extension)) {
        return false;
      }
    }

    // This could also be a GitHub path, but we'll handle it
    // The registry will try different handlers in order
    return true;
  }

  /**
   * Load a calendar from a Foundry module
   */
  async loadCalendar(location: CalendarLocation, options: LoadCalendarOptions = {}): Promise<SeasonsStarsCalendar> {
    try {
      // Normalize location - add .json extension if no extension specified
      const normalizedLocation = normalizeCalendarLocation(location);
      
      // Parse module path
      const parts = normalizedLocation.split('/');
      if (parts.length < 2) {
        throw new Error(`Invalid module path format: ${normalizedLocation}. Expected: module-name/path/to/file.json`);
      }

      const moduleName = parts[0];
      const filePath = parts.slice(1).join('/');

      Logger.debug(`Loading calendar from module: ${moduleName}/${filePath}`);

      // Check if game object is available
      if (typeof game === 'undefined' || !game.modules) {
        throw new Error('Foundry game object not available - cannot load from modules');
      }

      // Get the module
      const module = game.modules.get(moduleName);
      if (!module) {
        throw new Error(`Module ${moduleName} not found`);
      }

      // Check if module is active
      if (!module.active) {
        throw new Error(`Module ${moduleName} is not active`);
      }

      // Get module path
      const modulePath = module.path || `/modules/${moduleName}`;
      const fullUrl = `${modulePath}/${filePath}`;

      Logger.debug(`Loading from module URL: ${fullUrl}`);

      // Prepare fetch options
      const fetchOptions: RequestInit = {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...options.headers
        }
      };

      // Add timeout if specified
      if (options.timeout) {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), options.timeout);
        fetchOptions.signal = controller.signal;
      }

      // Fetch the calendar data from the module
      const response = await fetch(fullUrl, fetchOptions);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Calendar file not found in module ${moduleName}: ${filePath}`);
        } else if (response.status === 403) {
          throw new Error(`Access forbidden to module file: ${moduleName}/${filePath}`);
        } else {
          throw new Error(`Error loading from module ${moduleName}: ${response.status} ${response.statusText}`);
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

      Logger.info(`Successfully loaded calendar from module: ${calendarData.id} (${moduleName})`);
      return calendarData as SeasonsStarsCalendar;

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout: Failed to load calendar from module: ${location}`);
        }
        Logger.error(`Failed to load calendar from module: ${location}`, error);
        throw error;
      } else {
        const errorMessage = `Unknown error loading calendar from module: ${location}`;
        Logger.error(errorMessage);
        throw new Error(errorMessage);
      }
    }
  }

  /**
   * Check if a calendar in a module has been updated
   * For modules, we can check the module version or file modification time
   */
  async checkForUpdates(location: CalendarLocation, lastVersion?: string): Promise<boolean> {
    try {
      // Parse module path
      const parts = location.split('/');
      if (parts.length < 2) {
        Logger.warn(`Invalid module path for update check: ${location}`);
        return false;
      }

      const moduleName = parts[0];

      Logger.debug(`Checking for updates in module: ${moduleName}`);

      // Check if game object is available
      if (typeof game === 'undefined' || !game.modules) {
        Logger.warn('Foundry game object not available for module update check');
        return false;
      }

      // Get the module
      const module = game.modules.get(moduleName);
      if (!module) {
        Logger.warn(`Module ${moduleName} not found for update check`);
        return false;
      }

      // Check if module is still active
      if (!module.active) {
        Logger.warn(`Module ${moduleName} is no longer active`);
        return false;
      }

      // Use module version for update comparison
      const currentVersion = module.version || module.manifest?.version || '1.0.0';
      
      if (!lastVersion) {
        // No previous version recorded, assume potential update
        Logger.debug(`No previous version for module ${moduleName}, assuming potential update`);
        return true;
      }

      const hasUpdates = currentVersion !== lastVersion;
      Logger.debug(`Version comparison for module ${moduleName}: ${lastVersion} -> ${currentVersion} (updated: ${hasUpdates})`);
      
      return hasUpdates;

    } catch (error) {
      Logger.error(`Error checking for updates in module ${location}:`, error as Error);
      // On error, assume no updates to avoid unnecessary re-downloads
      return false;
    }
  }
}