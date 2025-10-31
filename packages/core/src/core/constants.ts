/**
 * Application-wide constants for Seasons & Stars
 */

import { Logger } from './logger';

// Time-related constants
export const TIME_CONSTANTS = {
  DEFAULT_SUNRISE_HOUR: 6,
  DEFAULT_SUNSET_HOUR: 18,
  DEFAULT_DAWN_HOUR: 6,
  DEFAULT_DUSK_HOUR: 18,
} as const;

// Storage and caching constants
export const STORAGE_CONSTANTS = {
  DEFAULT_CACHE_SIZE: 100,
  MIN_CACHE_SIZE: 200,
  MAX_CACHE_SIZE: 500,
  CACHE_CLEANUP_THRESHOLD: 150,
} as const;

// Widget positioning constants (consolidated from individual widgets)
export const WIDGET_POSITIONING = {
  Z_INDEX: 101,
  ESTIMATED_MINI_HEIGHT: 80, // Fixed inconsistency - now matches general usage
  POSITIONING_RETRY_DELAY: 100,
  MAX_POSITIONING_ATTEMPTS: 10,
  FADE_ANIMATION_DURATION: 200,
  STANDALONE_BOTTOM_OFFSET: 150,
  VIEWPORT_PADDING: 10, // Minimum distance from viewport edges
  // Widget dimensions for consistency
  MINI_WIDGET_WIDTH: 200,
  MINI_WIDGET_HEIGHT: 80,
} as const;

// API and system constants
export const SYSTEM_CONSTANTS = {
  MODULE_ID: 'seasons-and-stars',
  MIN_FOUNDRY_VERSION: '13.0.0',
  CALENDAR_VERSION_FORMAT: '1.0.0',
} as const;

// Hook names for consistent event handling
export const HOOK_NAMES = {
  DATE_CHANGED: 'seasons-stars:dateChanged',
  CALENDAR_CHANGED: 'seasons-stars:calendarChanged',
  NOTE_CREATED: 'seasons-stars:noteCreated',
  NOTE_UPDATED: 'seasons-stars:noteUpdated',
  NOTE_DELETED: 'seasons-stars:noteDeleted',
  READY: 'seasons-stars:ready',
} as const;

// UI constants for consistent styling
export const UI_CONSTANTS = {
  DEFAULT_BUTTON_DEBOUNCE: 300,
  TOOLTIP_DELAY: 500,
  ANIMATION_DURATION: 200,
  NOTIFICATION_DURATION: 5000,
  DEFAULT_QUICK_TIME_BUTTONS: [-15, 15, 30, 60, 240],
} as const;

// Moon phase icon mapping for FontAwesome icons
export const MOON_PHASE_ICON_MAP = {
  new: 'circle',
  'waxing-crescent': 'moon',
  'first-quarter': 'adjust',
  'waxing-gibbous': 'circle',
  full: 'circle',
  'waning-gibbous': 'circle',
  'last-quarter': 'adjust',
  'waning-crescent': 'moon',
} as const;

/**
 * Validate and sanitize a color value for safe use in CSS
 * Uses CSS.supports() to validate against the full CSS color specification
 * Returns undefined if the color is invalid
 */
export function sanitizeColor(color: string | undefined): string | undefined {
  if (!color) return undefined;

  // Use CSS.supports() for comprehensive color validation
  // This handles hex, rgb(), rgba(), hsl(), hsla(), named colors, etc.
  try {
    if (CSS.supports('color', color)) {
      return color;
    }
  } catch (e) {
    // CSS.supports() may throw in some environments
    Logger.debug(`CSS.supports() failed for color validation: ${color}`, e);
  }

  return undefined;
}

/**
 * Validate that a URL is a local path (not a remote URL)
 * Rejects URLs with protocols (http:, https:, ftp:, etc.)
 * Accepts relative and absolute local paths like /modules/my-module/icon.gif
 *
 * @param url - The URL string to validate
 * @returns true if the URL is a valid local path, false otherwise
 */
function isLocalPath(url: string): boolean {
  // Reject empty strings
  if (!url || url.trim() === '') {
    return false;
  }

  // Reject URLs with protocols (http:, https:, ftp:, javascript:, data:, etc.)
  // Check for protocol pattern at the start of the string
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
    return false;
  }

  // Reject protocol-relative URLs (//example.com/path)
  if (url.startsWith('//')) {
    return false;
  }

  // Accept relative paths (starting with ./ or ../) and absolute paths (starting with /)
  return true;
}

/**
 * Escape HTML-sensitive characters in a string to prevent injection attacks
 *
 * @param str - The string to escape
 * @returns The escaped string safe for HTML attribute values
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generate HTML for an icon, supporting both iconUrl (custom image) and icon (FontAwesome class)
 * When iconUrl is provided, it takes precedence over icon.
 *
 * Security: iconUrl must be a local path. Remote URLs (http://, https://, etc.) are rejected.
 * Valid examples: /modules/my-module/icons/icon.gif, ./icons/icon.png
 * Invalid examples: https://remote.site/icon.gif, javascript:alert(1)
 *
 * @param iconUrl - URL to custom icon image (must be local path, optional)
 * @param icon - FontAwesome icon class or identifier (optional)
 * @param width - Width in pixels for image icons (default: 16)
 * @param height - Height in pixels for image icons (default: 16)
 * @param additionalClasses - Additional CSS classes to apply (optional)
 * @returns HTML string for the icon, or empty string if neither is provided or iconUrl is invalid
 */
export function renderIconHtml(
  iconUrl: string | undefined,
  icon: string | undefined,
  width: number = 16,
  height: number = 16,
  additionalClasses: string = ''
): string {
  if (iconUrl) {
    // Validate that iconUrl is a local path, not a remote URL
    if (!isLocalPath(iconUrl)) {
      Logger.warn(
        `Rejected iconUrl with remote protocol or invalid format: ${iconUrl}. Only local paths are allowed (e.g., /modules/my-module/icon.gif)`
      );
      // Fall back to icon if iconUrl is invalid
      if (icon) {
        const escapedIcon = escapeHtml(icon);
        const escapedAdditionalClasses = additionalClasses ? escapeHtml(additionalClasses) : '';
        const classes = escapedAdditionalClasses
          ? `${escapedIcon} ${escapedAdditionalClasses}`
          : escapedIcon;
        return `<i class="${classes}" aria-hidden="true"></i>`;
      }
      return '';
    }

    // Escape URL and classes to prevent HTML injection
    const escapedUrl = escapeHtml(iconUrl);
    const escapedClasses = additionalClasses ? escapeHtml(additionalClasses) : '';
    const classes = escapedClasses ? ` class="${escapedClasses}"` : '';
    return `<img src="${escapedUrl}" width="${width}" height="${height}" alt=""${classes} />`;
  } else if (icon) {
    const escapedIcon = escapeHtml(icon);
    const escapedAdditionalClasses = additionalClasses ? escapeHtml(additionalClasses) : '';
    const classes = escapedAdditionalClasses
      ? `${escapedIcon} ${escapedAdditionalClasses}`
      : escapedIcon;
    return `<i class="${classes}" aria-hidden="true"></i>`;
  }
  return '';
}
