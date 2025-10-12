/**
 * External Integration Type Definitions
 *
 * This file contains type definitions for external modules and APIs that
 * Seasons & Stars integrates with, replacing generic 'any' types.
 */

// Errors & Echoes Module API
export interface ErrorsAndEchoesAPI {
  register(config: ErrorsAndEchoesConfig): void;
}

export interface ErrorsAndEchoesConfig {
  moduleId: string;
  contextProvider?: () => Record<string, unknown>;
  formatStackTrace?: (error: Error) => string[];
  submitError?: (error: Error, context: Record<string, unknown>) => Promise<void>;
  errorFilter?: (error: Error) => boolean;
}

// Simple Calendar Module Types
export interface SimpleCalendarAPI {
  api: {
    getCurrentDate(): SimpleCalendarDate;
    setDate(date: SimpleCalendarDate): Promise<boolean>;
    changeDate(interval: SimpleCalendarInterval): Promise<boolean>;
    timestampToDate(timestamp: number): SimpleCalendarDate;
    dateToTimestamp(date: SimpleCalendarDate): number;
  };
}

export interface SimpleCalendarDate {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
}

export interface SimpleCalendarInterval {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  second?: number;
}

// About Time Module Types
export interface AboutTimeAPI {
  DTMod: {
    addTime(seconds: number): void;
    setTime(timestamp: number): void;
    getTimeString(): string;
    isGM(): boolean;
  };
}

// SmallTime Module Types
export interface SmallTimeAPI {
  isRunning: boolean;
  increment: number;
  _updateDisplay(): void;
  setPos(): void;
}

// Generic Module API Structure
export interface ModuleAPI {
  version?: string;
  active?: boolean;
  api?: Record<string, unknown>;
  [key: string]: unknown;
}

// Foundry Module Data Structure
export interface FoundryModule {
  id: string;
  api?: ModuleAPI;
  active: boolean;
  [key: string]: unknown;
}

// Generic function type for callbacks and handlers
export type CallbackFunction = (...args: unknown[]) => unknown;

// Generic event handler type
export type EventHandler = (event: Event, ...args: unknown[]) => void;

// Generic Foundry Hook callback
export type HookCallback = (...args: unknown[]) => void | boolean | Promise<void | boolean>;

// Document data interfaces
export interface DocumentData {
  _id: string;
  [key: string]: unknown;
}

export interface JournalEntryData extends DocumentData {
  name: string;
  content?: string;
  folder?: string;
  sort?: number;
  ownership?: Record<string, number>;
  flags?: Record<string, Record<string, unknown>>;
}

// Scene Configuration Integration Types
export interface SceneConfigRenderData {
  object: any;
  html: JQuery<HTMLElement>;
  data: Record<string, unknown>;
}

export interface HandlebarsContext {
  [key: string]: unknown;
}

// Settings and Configuration Types
export interface ModuleSettings {
  [key: string]: unknown;
}

export interface SettingsConfig {
  name: string;
  hint?: string;
  scope: 'world' | 'client';
  config: boolean;
  type: typeof String | typeof Number | typeof Boolean | typeof Object;
  default?: unknown;
  choices?: Record<string, string>;
  range?: {
    min: number;
    max: number;
    step: number;
  };
  onChange?: (value: unknown) => void;
}

// Time and Date Utilities
export interface TimeOfDay {
  sunrise: number;
  sunset: number;
  hour?: number;
  minute?: number;
}

export interface SeasonInfo {
  name: string;
  icon?: string;
  color?: string;
  description?: string;
}

// Note Creation and Management Types
export interface CreateNoteData {
  title: string;
  content: string;
  startDate: {
    year: number;
    month: number;
    day: number;
  };
  endDate?: {
    year: number;
    month: number;
    day: number;
  };
  allDay?: boolean;
  playerVisible?: boolean;
  calendarId?: string;
  category?: string;
  tags?: string[];
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: {
      year: number;
      month: number;
      day: number;
    };
  };
}

// UI Widget Types
export interface WidgetPosition {
  left: number;
  top: number;
  width?: number;
  height?: number;
}

export interface WidgetConfig {
  position: WidgetPosition;
  visible: boolean;
  [key: string]: unknown;
}

// Generic API Response
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Type guards for external modules
export declare function isModuleAPI(obj: unknown): obj is ModuleAPI;
export declare function isFoundryModule(obj: unknown): obj is FoundryModule;
export declare function isSimpleCalendarAPI(obj: unknown): obj is SimpleCalendarAPI;

// Memory Mage integration types
export interface MemoryMageAPI {
  registerModule: (moduleId: string, callback: () => MemoryReport) => void;
  registerCleanupHandler?: (callback: () => void) => void;
  report?: MemoryReport;
  hasConsent?: () => boolean;
  getPrivacyLevel?: () => string;
  getStats?: () => Record<string, unknown>;
}

export interface MemoryReport {
  estimatedMB: number;
  details: Record<string, unknown>;
}

// Performance optimizer interface (optional feature)
export interface PerformanceOptimizer {
  getMemoryUsage(): number;
  getMetrics(): {
    totalNotes?: number;
    cacheHitRate?: number;
  };
  relieveMemoryPressure?(): void;
}

// Extended manager interfaces for optional features
export interface ExtendedNotesManager {
  getPerformanceOptimizer?(): PerformanceOptimizer;
}

export interface ExtendedCalendarManager {
  getLoadedCalendars?(): unknown[];
  clearCaches?(): void;
}

// Calendar Engine interface for recurring notes
export interface CalendarEngineInterface {
  getCalendar(): unknown;
  calculateWeekday(year: number, month: number, day: number): number;
  getMonthLength(month: number, year: number): number;
  dateToWorldTime(date: {
    year: number;
    month: number;
    day: number;
    time?: { hour: number; minute: number; second: number };
  }): number;
  worldTimeToDate(timestamp: number): {
    year: number;
    month: number;
    day: number;
    weekday: number;
    time?: { hour: number; minute: number; second: number };
  };
  // Moon phase methods
  getAllMoons?(date?: unknown): unknown[];
  getMoonPhaseInfo?(date: unknown, moonName?: string): unknown[];
  getCurrentMoonPhases?(worldTime?: number): unknown[];
  getMoonPhaseAtWorldTime?(worldTime: number): unknown[];
}

// Calendar grid day object for UI widgets
export interface CalendarDayData {
  day: number | string;
  date: {
    year: number;
    month: number;
    day: number;
    weekday: number;
  };
  isCurrentMonth: boolean;
  isToday: boolean;
  hasNotes: boolean;
  isEmpty?: boolean;
  notes?: unknown[];
  // Moon phase properties
  moonPhases?: Array<{
    moonName: string;
    phaseName: string;
    phaseIcon: string;
    moonColor?: string;
    dayInPhase: number;
    daysUntilNext: number;
    dayInPhaseExact?: number;
    daysUntilNextExact?: number;
    phaseProgress?: number;
  }>;
  primaryMoonPhase?: string; // Icon for the primary/first moon
  primaryMoonColor?: string; // Color for the primary/first moon
  moonTooltip?: string; // Tooltip text for moon phases
  hasMultipleMoons?: boolean; // True if more than one moon
}

// Hook Payload Types
// These define the data structures passed to Seasons & Stars hook callbacks

/**
 * Reason for calendar change
 * - initialization: Calendar being set during module initialization (silent, no notifications)
 * - user-change: User actively switching calendars (should show notifications)
 * - settings-sync: Calendar synced from settings or file load
 */
export type CalendarChangeReason = 'initialization' | 'user-change' | 'settings-sync';

/**
 * Payload for seasons-stars:calendarChanged hook
 * Fired when the active calendar changes
 */
export interface CalendarChangedHookData {
  /** Previous calendar ID, null if this is initial setup */
  oldCalendarId: string | null;
  /** New active calendar ID */
  newCalendarId: string;
  /** Full calendar data for the new calendar */
  calendar: unknown;
  /** Reason for the calendar change */
  reason: CalendarChangeReason;
}
