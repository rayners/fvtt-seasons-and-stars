/**
 * Utility functions for protocol handlers
 */

/**
 * Normalize a location by adding .json extension if no extension is present
 */
export function normalizeCalendarLocation(location: string): string {
  // If location already has an extension, return as-is
  if (hasFileExtension(location)) {
    return location;
  }
  
  // Add .json extension
  return `${location}.json`;
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