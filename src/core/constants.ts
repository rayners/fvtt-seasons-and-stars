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
  ESTIMATED_MINI_HEIGHT: 32,
  POSITIONING_RETRY_DELAY: 100,
  MAX_POSITIONING_ATTEMPTS: 10,
  FADE_ANIMATION_DURATION: 200,
  STANDALONE_BOTTOM_OFFSET: 150,
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
} as const;

// Development environment detection constants
export const DEV_CONSTANTS = {
  LOCALHOST_PATTERNS: [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1', // IPv6 localhost
  ],
  DEV_PORTS: [
    3000,
    3001,
    3002,
    3003, // Common React/Node dev ports
    4000,
    4001,
    4002,
    4003, // Common dev server ports
    5000,
    5001,
    5002,
    5003, // Common Python/Flask dev ports
    8000,
    8001,
    8002,
    8003, // Common dev ports
    8080,
    8081,
    8082,
    8083, // Common alternative HTTP ports
    9000,
    9001,
    9002,
    9003, // Common dev ports
    30000, // Foundry VTT default port
  ] as number[],
  DEV_HOSTNAMES: [
    'dev.',
    'development.',
    'test.',
    'testing.',
    'staging.',
    'local.',
    '.local',
    '.test',
    '.dev',
  ],
  DEV_INDICATORS: ['dev', 'development', 'test', 'testing', 'staging', 'local', 'debug'],
} as const;
