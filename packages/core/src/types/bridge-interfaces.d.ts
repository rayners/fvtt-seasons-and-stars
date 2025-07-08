/**
 * Bridge Integration Interface Types
 *
 * Separated from foundry-extensions.d.ts to avoid circular dependencies
 */

import type { SeasonsStarsCalendar, CalendarDate, DateFormatOptions } from './calendar';
import type { CreateNoteData } from './external-integrations';

// Forward declaration to avoid circular dependency
export interface SeasonsStarsIntegration {
  hasFeature(feature: string): boolean;
  getFeatureVersion(feature: string): string | null;
  readonly api: SeasonsStarsAPI;
  readonly widgets: SeasonsStarsWidgets;
  readonly hooks: SeasonsStarsHooks;
  readonly version: string;
  readonly isAvailable: boolean;
  cleanup(): void;
}

// Core integration interface types
export interface SeasonsStarsAPI {
  // Core date operations
  getCurrentDate(calendarId?: string): CalendarDate;
  worldTimeToDate(timestamp: number, calendarId?: string): CalendarDate;
  dateToWorldTime(date: CalendarDate, calendarId?: string): number;
  formatDate(date: CalendarDate, options?: DateFormatOptions): string;

  // Calendar management
  getActiveCalendar(): SeasonsStarsCalendar;
  setActiveCalendar(calendarId: string): Promise<void>;
  getAvailableCalendars(): string[];
  loadCalendar(calendarId: string): Promise<SeasonsStarsCalendar>;

  // Metadata access
  getMonthNames(calendarId?: string): string[];
  getWeekdayNames(calendarId?: string): string[];
  getSeasonInfo(date: CalendarDate, calendarId?: string): any;
  getSunriseSunset(date: CalendarDate, calendarId?: string): { sunrise: string; sunset: string };

  // Time advancement
  advanceDays(days: number): Promise<void>;
  advanceHours(hours: number): Promise<void>;
  advanceMinutes(minutes: number): Promise<void>;
  advanceWeeks(weeks: number): Promise<void>;
  advanceMonths(months: number): Promise<void>;
  advanceYears(years: number): Promise<void>;
}

export interface SeasonsStarsWidgets {
  // Widget management
  showMainWidget(): Promise<void>;
  hideMainWidget(): Promise<void>;
  toggleMainWidget(): Promise<void>;
  isMainWidgetVisible(): boolean;

  showMiniWidget(): Promise<void>;
  hideMiniWidget(): Promise<void>;
  toggleMiniWidget(): Promise<void>;
  isMiniWidgetVisible(): boolean;

  showGridWidget(): Promise<void>;
  hideGridWidget(): Promise<void>;
  toggleGridWidget(): Promise<void>;
  isGridWidgetVisible(): boolean;

  // Widget button management (for Simple Calendar compatibility)
  addSidebarButton(widget: 'main' | 'mini' | 'grid', config: any): void;
  removeSidebarButton(widget: 'main' | 'mini' | 'grid', buttonId: string): void;
  hasSidebarButton(widget: 'main' | 'mini' | 'grid', buttonId: string): boolean;
}

export interface SeasonsStarsHooks {
  // Hook registration and management
  onDateChanged(callback: (newDate: CalendarDate) => void): void;
  onCalendarChanged(callback: (newCalendar: SeasonsStarsCalendar) => void): void;
  onTimeAdvanced(callback: (amount: number, unit: string) => void): void;

  // Hook emission helpers
  emitDateChanged(date: CalendarDate): void;
  emitCalendarChanged(calendar: SeasonsStarsCalendar): void;
  emitTimeAdvanced(amount: number, unit: string): void;
}

// Notes API interface
export interface SeasonsStarsNotesAPI {
  // Simple Calendar API compatibility methods (legacy signature)
  addNote(
    title: string,
    content: string,
    startDate: any,
    endDate?: any,
    allDay?: boolean,
    playerVisible?: boolean
  ): Promise<any>;
  removeNote(noteId: string): Promise<void>;
  getNotesForDay(year: number, month: number, day: number, calendarId?: string): any[];

  // Enhanced notes functionality (S&S native)
  createNote(data: CreateNoteData): Promise<any>;
  updateNote(noteId: string, data: any): Promise<any>;
  deleteNote(noteId: string): Promise<void>;
  getNote(noteId: string): Promise<any | null>;
  getNotesForDate(date: CalendarDate, calendarId?: string): Promise<any[]>;
  getNotesForDateRange(start: CalendarDate, end: CalendarDate, calendarId?: string): Promise<any[]>;

  // Module integration methods
  setNoteModuleData(noteId: string, moduleId: string, data: any): Promise<void>;
  getNoteModuleData(noteId: string, moduleId: string): any;

  // Display formatting for compatibility
  formatNoteDisplay(note: any): any;
}
