/**
 * Seasons & Stars Specific Type Extensions
 *
 * These extend the base Foundry types with module-specific functionality.
 * Core Foundry types are provided by foundry-v13-essentials.d.ts
 */

import type {
  SeasonsStarsCalendar,
  CalendarDate,
  DateFormatOptions,
  CalendarIntercalary,
} from './calendar';
import type { SeasonsStarsIntegration } from './bridge-interfaces';
import type { LoadResult, ExternalCalendarSource } from '../core/calendar-loader';

// Extend the Game interface to include S&S specific properties
declare global {
  interface String {
    stripScripts(): string;
  }

  interface Game {
    ready: boolean;
    seasonsStars?: {
      api?: SeasonsStarsAPI;
      manager?: CalendarManagerInterface; // CalendarManager interface
      notes?: NotesManagerInterface; // NotesManager interface
      categories?: unknown; // Note categories management
      integration?: SeasonsStarsIntegration | null;
      compatibilityManager?: unknown; // Expose for debugging and external access
      // Warning state functions for debugging and external access
      resetSeasonsWarningState?: () => void;
      getSeasonsWarningState?: () => boolean;
      setSeasonsWarningState?: (warned: boolean) => void;
    };
  }

  interface Window {
    SeasonsStars?: {
      api?: SeasonsStarsAPI;
      manager?: CalendarManagerInterface;
      notes?: NotesManagerInterface;
      integration?: SeasonsStarsIntegration | null;
      CalendarWidget?: unknown;
      CalendarMiniWidget?: unknown;
      CalendarGridWidget?: unknown;
      CalendarSelectionDialog?: unknown;
      NoteEditingDialog?: unknown;
      [key: string]: unknown;
    };
  }

  interface Combat {
    id: string;
    [key: string]: unknown;
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
  // External Calendar Loading Methods
  loadCalendarFromUrl(
    url: string,
    options?: { validate?: boolean; cache?: boolean }
  ): Promise<LoadResult>;
  loadCalendarCollection(
    url: string,
    options?: { validate?: boolean; cache?: boolean }
  ): Promise<LoadResult[]>;
  addExternalSource(source: {
    name: string;
    url: string;
    enabled: boolean;
    type: 'calendar' | 'collection' | 'variants';
  }): string;
  removeExternalSource(sourceId: string): boolean;
  getExternalSources(): ExternalCalendarSource[];
  getExternalSource(sourceId: string): ExternalCalendarSource | undefined;
  refreshExternalCalendar(sourceId: string): Promise<LoadResult>;
  refreshAllExternalCalendars(): Promise<{ [sourceId: string]: LoadResult }>;
  clearExternalCalendarCache(): void;
  // Module Calendar Loading Methods
  loadModuleCalendars(moduleId: string): Promise<LoadResult[]>;
}

// Type guard functions (implementations in type-guards.ts)
export declare function isCalendarManager(obj: unknown): obj is CalendarManagerInterface;
export declare function isNotesManager(obj: unknown): obj is NotesManagerInterface;

// Calendar Manager interface for type safety
export interface CalendarManagerInterface {
  getCurrentDate(): CalendarDate | null;
  setCurrentDate(date: CalendarDate): Promise<void>;
  getActiveCalendar(): SeasonsStarsCalendar | null;
  getActiveEngine(): CalendarEngineInterface | null;
  getAllCalendars(): SeasonsStarsCalendar[];
  getCalendar(calendarId: string): SeasonsStarsCalendar | null;
  getAvailableCalendars(): SeasonsStarsCalendar[];
  setActiveCalendar(calendarId: string): Promise<boolean>;
  advanceSeconds(seconds: number): Promise<void>;
  advanceMinutes(minutes: number): Promise<void>;
  advanceHours(hours: number): Promise<void>;
  advanceDays(days: number): Promise<void>;
  advanceWeeks(weeks: number): Promise<void>;
  advanceMonths(months: number): Promise<void>;
  advanceYears(years: number): Promise<void>;
}

// Calendar Engine interface for date calculations
export interface CalendarEngineInterface {
  getCalendar(): SeasonsStarsCalendar;
  calculateWeekday(year: number, month: number, day: number): number;
  getMonthLength(month: number, year: number): number;
  dateToWorldTime(date: CalendarDate, worldCreationTimestamp?: number): number;
  worldTimeToDate(timestamp: number, worldCreationTimestamp?: number): CalendarDate;
  getIntercalaryDaysAfterMonth(month: number, year: number): CalendarIntercalary[];
  addMonths(date: CalendarDate, months: number): CalendarDate;
  addYears(date: CalendarDate, years: number): CalendarDate;
}

// Notes Manager interface for type safety
export interface NotesManagerInterface {
  createNote(data: unknown): Promise<JournalEntry>;
  updateNote(noteId: string, data: unknown): Promise<JournalEntry>;
  deleteNote(noteId: string): Promise<void>;
  getNote(noteId: string): Promise<JournalEntry | null>;
  getNotesForDate(date: CalendarDate): Promise<JournalEntry[]>;
  getNotesForDateRange(start: CalendarDate, end: CalendarDate): Promise<JournalEntry[]>;
  setNoteModuleData(noteId: string, moduleId: string, data: unknown): Promise<void>;
  getNoteModuleData(noteId: string, moduleId: string): unknown;
  canCreateNote(): boolean;
  storage: {
    findNotesByDateSync(date: CalendarDate): JournalEntry[];
    removeNote(noteId: string): Promise<void>;
    getAllNotes?(): JournalEntry[];
  };
}
