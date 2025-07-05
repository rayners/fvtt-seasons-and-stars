/**
 * Utility functions for protocol handlers
 */

import type { CalendarCollectionIndex } from '../../types/external-calendar';

/**
 * Normalize a location by adding .json extension if no extension is present
 * Special handling for directory-like paths that should load index.json
 */
export function normalizeCalendarLocation(location: string): string {
  // Remove fragment identifier for processing
  const [basePath, fragment] = location.split('#');

  // If location already has an extension, return as-is
  if (hasFileExtension(basePath)) {
    return location;
  }

  // Check if this looks like a directory path
  if (isDirectoryPath(basePath)) {
    // For directory paths, append index.json (preserve fragment)
    return fragment ? `${basePath}/index.json#${fragment}` : `${basePath}/index.json`;
  }

  // Add .json extension to file paths
  return `${basePath}.json${fragment ? `#${fragment}` : ''}`;
}

/**
 * Check if a location string has a file extension
 */
export function hasFileExtension(location: string): boolean {
  // Look for a file extension pattern: .ext at the end or before query parameters/fragments
  const extensionPattern = /\.[a-zA-Z0-9]+(?:[?#].*)?$/;
  return extensionPattern.test(location);
}

/**
 * Get the file extension from a location (without the dot)
 */
export function getFileExtension(location: string): string | null {
  const match = location.match(/\.([a-zA-Z0-9]+)(?:[?#].*)?$/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Check if a location ends with a supported calendar file extension
 */
export function hasSupportedExtension(location: string): boolean {
  const supportedExtensions = ['json', 'yml', 'yaml'];
  const extension = getFileExtension(location);
  return extension ? supportedExtensions.includes(extension) : false;
}

/**
 * Check if a path looks like a directory (not ending with a filename)
 */
export function isDirectoryPath(path: string): boolean {
  // Remove any trailing slashes
  const cleanPath = path.replace(/\/+$/, '');

  // If it has an extension, it's a file
  if (hasFileExtension(cleanPath)) {
    return false;
  }

  // Check for common directory patterns:
  // - No extension and multiple path segments
  // - Ends with common directory names
  const parts = cleanPath.split('/');

  // Single segment without extension could be either - default to file
  if (parts.length === 1) {
    return false;
  }

  // Multiple segments without extension - likely a directory
  // Special cases for GitHub: user/repo is always considered a directory for index loading
  return true;
}

/**
 * Parse a location with optional calendar ID fragment
 */
export function parseLocationWithCalendarId(location: string): {
  basePath: string;
  calendarId?: string;
} {
  const [basePath, calendarId] = location.split('#');
  return {
    basePath,
    calendarId: calendarId || undefined,
  };
}

/**
 * Validate calendar collection index structure
 */
export function validateCalendarCollectionIndex(
  index: any
): asserts index is CalendarCollectionIndex {
  if (!index || typeof index !== 'object') {
    throw new Error('Calendar collection index must be a valid JSON object');
  }

  if (!index.name || typeof index.name !== 'string') {
    throw new Error('Calendar collection index must have a "name" field');
  }

  if (!Array.isArray(index.calendars)) {
    throw new Error('Calendar collection index must have a "calendars" array');
  }

  for (let i = 0; i < index.calendars.length; i++) {
    const calendar = index.calendars[i];
    if (!calendar || typeof calendar !== 'object') {
      throw new Error(`Calendar entry ${i} must be a valid object`);
    }

    if (!calendar.id || typeof calendar.id !== 'string') {
      throw new Error(`Calendar entry ${i} must have a valid "id" field`);
    }

    if (!calendar.name || typeof calendar.name !== 'string') {
      throw new Error(`Calendar entry ${i} must have a valid "name" field`);
    }

    if (!calendar.file || typeof calendar.file !== 'string') {
      throw new Error(`Calendar entry ${i} must have a valid "file" field`);
    }

    // Check for duplicate IDs
    const duplicateIndex = index.calendars.findIndex(
      (c: any, idx: number) => idx !== i && c.id === calendar.id
    );
    if (duplicateIndex !== -1) {
      throw new Error(
        `Duplicate calendar ID "${calendar.id}" found at entries ${i} and ${duplicateIndex}`
      );
    }
  }
}

/**
 * Handle loading from calendar collection index
 */
export function selectCalendarFromIndex(
  index: CalendarCollectionIndex,
  calendarId?: string,
  locationDescription: string = 'collection'
): {
  shouldLoadIndex: boolean;
  selectedEntry?: CalendarCollectionIndex['calendars'][0];
  error?: string;
} {
  if (calendarId) {
    // Load specific calendar from index
    const calendarEntry = index.calendars.find(entry => entry.id === calendarId);
    if (!calendarEntry) {
      const availableCalendars = index.calendars.map(c => c.id).join(', ');
      return {
        shouldLoadIndex: false,
        error: `Calendar '${calendarId}' not found in ${locationDescription} index. Available calendars: ${availableCalendars}`,
      };
    }

    return {
      shouldLoadIndex: false,
      selectedEntry: calendarEntry,
    };
  } else {
    // No specific calendar requested
    if (index.calendars.length === 0) {
      return {
        shouldLoadIndex: false,
        error: `${locationDescription} index contains no calendars`,
      };
    }

    if (index.calendars.length === 1) {
      // Only one calendar - load it automatically
      return {
        shouldLoadIndex: false,
        selectedEntry: index.calendars[0],
      };
    } else {
      // Multiple calendars - user needs to specify which one
      const availableCalendars = index.calendars.map(c => `${c.id} (${c.name})`).join(', ');
      return {
        shouldLoadIndex: false,
        error: `${locationDescription} contains multiple calendars. Please specify one using format 'protocol:location#calendar-id'. Available: ${availableCalendars}`,
      };
    }
  }
}
