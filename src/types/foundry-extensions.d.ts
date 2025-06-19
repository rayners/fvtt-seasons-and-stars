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
      api: SeasonsStarsAPI;
      manager: any; // CalendarManager - avoiding circular import
      notes: NotesManagerInterface; // NotesManager interface
      categories: NoteCategories; // Note categories management
      integration: SeasonsStarsIntegration | null;
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
  storage: {
    findNotesByDateSync(date: CalendarDate): JournalEntry[];
  };
}
