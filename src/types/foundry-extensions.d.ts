/**
 * Seasons & Stars Specific Type Extensions
 *
 * These extend the base Foundry types with module-specific functionality.
 * Core Foundry types are provided by foundry-v13-essentials.d.ts
 */

import type { SeasonsStarsCalendar, CalendarDate, DateFormatOptions } from './calendar';
import type { SeasonsStarsIntegration } from '../core/bridge-integration';
import type { NoteCategories } from '../core/note-categories';

// Extend the Game interface to include S&S specific properties
declare global {
  interface Game {
    seasonsStars?: {
      api?: SeasonsStarsAPI;
      manager?: CalendarManagerInterface; // CalendarManager interface
      notes?: NotesManagerInterface; // NotesManager interface
      categories?: NoteCategories; // Note categories management
      integration?: SeasonsStarsIntegration | null;
    };
  }

  interface Window {
    SeasonsStars?: {
      api: SeasonsStarsAPI;
      manager: unknown;
      notes: unknown;
      integration: typeof SeasonsStarsIntegration;
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
}

// Type guard functions
export function isCalendarManager(obj: unknown): obj is CalendarManagerInterface {
  return !!(
    obj &&
    typeof obj === 'object' &&
    'getCurrentDate' in obj &&
    'getActiveCalendar' in obj
  );
}

export function isNotesManager(obj: unknown): obj is NotesManagerInterface {
  return !!(obj && typeof obj === 'object' && 'createNote' in obj && 'storage' in obj);
}

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
}

// Calendar Engine interface for date calculations
export interface CalendarEngineInterface {
  getCalendar(): SeasonsStarsCalendar;
  calculateWeekday(year: number, month: number, day: number): number;
  getMonthLength(month: number, year: number): number;
  dateToWorldTime(date: CalendarDate): number;
  worldTimeToDate(timestamp: number): CalendarDate;
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
  getCategories(): any;
  getPredefinedTags(): string[];
  parseTagString(tags: string): string[];
  validateTags(tags: string[]): boolean;
  getDefaultCategory(): any;
  getCategory(categoryId: string): any;
  storage: {
    findNotesByDateSync(date: CalendarDate): JournalEntry[];
    removeNote(noteId: string): Promise<void>;
  };
}
