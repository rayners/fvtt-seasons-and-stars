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
