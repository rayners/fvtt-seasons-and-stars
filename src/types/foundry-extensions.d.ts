/**
 * Seasons & Stars Specific Type Extensions
 *
 * These extend the base Foundry types with module-specific functionality.
 * Core Foundry types are provided by foundry-v13-essentials.d.ts
 */

import type { SeasonsStarsCalendar, CalendarDate, DateFormatOptions } from './calendar';
import type { SeasonsStarsIntegration } from './bridge-interfaces';
import type { ContextExtensionAPI } from './widget-types';
import type { ProtocolHandler } from './external-calendar';

// Extend the Game interface to include S&S specific properties
declare global {
  interface Game {
    seasonsStars?: {
      api?: SeasonsStarsAPI;
      manager?: unknown; // CalendarManager interface
      notes?: unknown; // NotesManager interface
      categories?: unknown; // Note categories management
      integration?: SeasonsStarsIntegration | null;
      compatibilityManager?: unknown; // Expose for debugging and external access
      widgets?: {
        createContextAPI: (moduleId: string) => ContextExtensionAPI;
      };
      // Warning state functions for debugging and external access
      resetSeasonsWarningState?: () => void;
      getSeasonsWarningState?: () => boolean;
      setSeasonsWarningState?: (warned: boolean) => void;
    };
  }

  interface Window {
    SeasonsStars?: {
      api: SeasonsStarsAPI;
      manager: unknown;
      notes: unknown;
      integration: SeasonsStarsIntegration | null;
      CalendarWidget?: unknown;
      CalendarMiniWidget?: unknown;
      CalendarGridWidget?: unknown;
      CalendarSelectionDialog?: unknown;
      NoteEditingDialog?: unknown;
    };
  }
}

// S&S API interface used by the module
export interface SeasonsStarsAPI {
  getCurrentDate(): CalendarDate | null;
  setCurrentDate(date: CalendarDate): Promise<boolean>;
  advanceTime(amount: number, unit: string): Promise<void>;
  advanceDays(days: number, calendarId?: string): Promise<void>;
  advanceHours(hours: number, calendarId?: string): Promise<void>;
  advanceMinutes(minutes: number, calendarId?: string): Promise<void>;
  advanceWeeks(weeks: number, calendarId?: string): Promise<void>;
  advanceMonths(months: number, calendarId?: string): Promise<void>;
  advanceYears(years: number, calendarId?: string): Promise<void>;
  getActiveCalendar(): SeasonsStarsCalendar | null;
  setActiveCalendar(calendarId: string): Promise<void>;
  getAvailableCalendars(): string[];
  loadCalendar(data: SeasonsStarsCalendar): void;
  getMonthNames(calendarId?: string): string[];
  getWeekdayNames(calendarId?: string): string[];
  getSeasonInfo(date: CalendarDate, calendarId?: string): { name: string; icon: string };
  getSunriseSunset(date: CalendarDate, calendarId?: string): { sunrise: number; sunset: number };
  formatDate(date: CalendarDate, options?: DateFormatOptions): string;
  dateToWorldTime(date: CalendarDate, calendarId?: string): number;
  worldTimeToDate(timestamp: number, calendarId?: string): CalendarDate;

  // External calendar management
  loadExternalCalendar(externalId: string): Promise<boolean>;
  loadExternalCalendarWithOptions(
    externalId: string,
    options?: Record<string, unknown>
  ): Promise<boolean>;
  getExternalSources(): unknown[];
  addExternalSource(source: unknown): void;
  removeExternalSource(externalId: string): void;
  updateExternalSource(externalId: string, updates: unknown): void;
  getExternalCacheStats(): unknown;
  clearExternalCache(): void;

  // Template Context Extensions API
  widgets?: {
    /**
     * Create a context extension API scoped to a specific module.
     * This provides automatic cleanup when the module is disabled.
     *
     * @param moduleId The ID of the module registering extensions
     * @returns A scoped API for registering context extensions and hooks
     *
     * @example
     * ```typescript
     * // In an external module
     * const contextAPI = game.seasonsStars.api.widgets.createContextAPI('my-module');
     *
     * // Register extension to add weather data to all widgets
     * contextAPI.registerExtension({
     *   priority: 10,
     *   widgetTypes: ['*'],
     *   extensionFunction: (context) => ({
     *     ...context,
     *     weather: game.myModule.getCurrentWeather()
     *   }),
     *   metadata: {
     *     name: 'Weather Integration',
     *     description: 'Adds weather data to S&S widgets'
     *   }
     * });
     * ```
     */
    createContextAPI(moduleId: string): ContextExtensionAPI;

    /**
     * Get information about all registered context extensions.
     * Useful for debugging and module compatibility checking.
     */
    getRegisteredExtensions(): Array<{
      id: string;
      moduleId: string;
      priority: number;
      widgetTypes: string[];
      metadata: {
        name: string;
        description?: string;
        version?: string;
        author?: string;
      };
    }>;

    /**
     * Get information about all registered context hooks.
     * Useful for debugging hook execution order.
     */
    getRegisteredHooks(): Array<{
      id: string;
      moduleId: string;
      phase: 'before' | 'after';
      widgetTypes: string[];
    }>;
  };
}

// Hook event data interfaces
export interface CalendarRegistrationHookData {
  addCalendar: (calendarData: SeasonsStarsCalendar) => boolean;
}

export interface ProtocolHandlerRegistrationHookData {
  registerHandler: (handler: ProtocolHandlerLike) => boolean;
}

// Support both full ProtocolHandler classes and simple functions
export type ProtocolHandlerLike = ProtocolHandler | SimpleProtocolHandler;

export interface SimpleProtocolHandler {
  protocol: string;
  loadCalendar: (location: string) => Promise<SeasonsStarsCalendar>;
}

// Type guard functions (implementations in type-guards.ts)
export declare function isCalendarManager(obj: unknown): obj is CalendarManagerInterface;
export declare function isNotesManager(obj: unknown): obj is NotesManagerInterface;

// Calendar Manager interface for type safety
export interface CalendarManagerInterface {
  getCurrentDate(): CalendarDate | null;
  setCurrentDate(date: CalendarDate): Promise<boolean>;
  getActiveCalendar(): SeasonsStarsCalendar | null;
  getActiveEngine(): CalendarEngineInterface | null;
  getAllCalendars(): SeasonsStarsCalendar[];
  getCalendar(calendarId: string): SeasonsStarsCalendar | null;
  getAvailableCalendars(): string[];
  setActiveCalendar(calendarId: string): Promise<boolean>;
  advanceMinutes(minutes: number): Promise<void>;
  advanceHours(hours: number): Promise<void>;
  advanceDays(days: number): Promise<void>;
  advanceWeeks(weeks: number): Promise<void>;
  advanceMonths(months: number): Promise<void>;
  advanceYears(years: number): Promise<void>;

  // External calendar management
  loadExternalCalendar(externalId: string): Promise<boolean>;
  getExternalSources(): unknown[];
  addExternalSource(source: unknown): void;
  removeExternalSource(externalId: string): void;
  updateExternalSource(externalId: string, updates: unknown): void;
  getExternalCacheStats(): unknown;
  clearExternalCache(): void;
}

// Calendar Engine interface for date calculations
export interface CalendarEngineInterface {
  getCalendar(): SeasonsStarsCalendar;
  calculateWeekday(year: number, month: number, day: number): number;
  getMonthLength(month: number, year: number): number;
  dateToWorldTime(date: CalendarDate, worldCreationTimestamp?: number): number;
  worldTimeToDate(timestamp: number, worldCreationTimestamp?: number): CalendarDate;
  getIntercalaryDaysAfterMonth(month: number, year: number): any[];
  addMonths(date: CalendarDateData, months: number): CalendarDateData;
  addYears(date: CalendarDateData, years: number): CalendarDateData;
}

// Notes Manager interface for type safety
export interface NotesManagerInterface {
  createNote(data: any): Promise<JournalEntry>;
  updateNote(noteId: string, data: any): Promise<JournalEntry>;
  deleteNote(noteId: string): Promise<void>;
  getNote(noteId: string): Promise<JournalEntry | null>;
  getNotesForDate(date: CalendarDate): Promise<JournalEntry[]>;
  getNotesForDateRange(start: CalendarDate, end: CalendarDate): Promise<JournalEntry[]>;
  setNoteModuleData(noteId: string, moduleId: string, data: any): Promise<void>;
  getNoteModuleData(noteId: string, moduleId: string): any;
  canCreateNote(): boolean;
  getCategories(): any;
  getPredefinedTags(): string[];
  parseTagString(tags: string): string[];
  validateTags(tags: string[]): boolean;
  getDefaultCategory(): any;
  getCategory(categoryId: string): any;
  getAllNotes(): JournalEntry[];
  storage: {
    findNotesByDateSync(date: CalendarDate): JournalEntry[];
    removeNote(noteId: string): Promise<void>;
    getAllNotes(): JournalEntry[];
  };
}
