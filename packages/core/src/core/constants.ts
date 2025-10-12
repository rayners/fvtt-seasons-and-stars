/**
 * Application-wide constants for Seasons & Stars
 */

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
export const MOON_PHASE_ICON_MAP: Record<string, string> = {
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
 * Validate and sanitize a color value for safe use in HTML
 * Returns undefined if the color is invalid
 */
export function sanitizeColor(color: string | undefined): string | undefined {
  if (!color) return undefined;

  // Only allow hex colors (#RGB, #RRGGBB, #RRGGBBAA) and named CSS colors
  const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
  const namedColors =
    /^(red|blue|green|yellow|orange|purple|pink|brown|black|white|gray|grey|cyan|magenta|lime|navy|teal|olive|maroon|aqua|fuchsia|silver|gold)$/i;

  if (hexPattern.test(color) || namedColors.test(color)) {
    return color;
  }

  return undefined;
}
