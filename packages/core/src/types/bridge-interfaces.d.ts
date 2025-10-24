/**
 * Bridge Integration Interface Types
 *
 * Separated from foundry-extensions.d.ts to avoid circular dependencies
 */

import type { SeasonsStarsCalendar, CalendarDate, DateFormatOptions } from './calendar';
import type { CreateNoteData, SeasonInfo } from './external-integrations';
import type { ValidationResult } from '../core/calendar-validator';
import type { SidebarButtonConfig, WidgetType } from './widget-types';
export type { ValidationResult };

/**
 * Note document interface for Seasons & Stars notes
 */
export interface NoteDocument {
  id: string;
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
  flags?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Date reference for note operations
 */
export interface NoteDateReference {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
}

/**
 * Note update data
 */
export interface NoteUpdateData {
  title?: string;
  content?: string;
  startDate?: NoteDateReference;
  endDate?: NoteDateReference;
  allDay?: boolean;
  playerVisible?: boolean;
  category?: string;
  tags?: string[];
  [key: string]: unknown;
}

/**
 * Module-specific data attached to notes
 */
export interface NoteModuleData {
  [moduleId: string]: Record<string, unknown>;
}

// Forward declaration to avoid circular dependency
export interface SeasonsStarsIntegration {
  hasFeature(feature: string): boolean;
  getFeatureVersion(feature: string): string | null;
  readonly api: SeasonsStarsAPI;
  readonly widgets: SeasonsStarsWidgets;
  readonly hooks: SeasonsStarsHooks;
  readonly version: string;
  readonly isAvailable: boolean;
  readonly buttonRegistry: SidebarButtonRegistryAPI;
  cleanup(): void;
}

export interface SidebarButtonRegistryAPI {
  register(config: SidebarButtonConfig): void;
  update(config: SidebarButtonConfig): boolean;
  unregister(name: string): void;
  has(name: string): boolean;
  get(name: string): SidebarButtonConfig | undefined;
  getForWidget(widgetType: WidgetType): SidebarButtonConfig[];
  getAll(): SidebarButtonConfig[];
  clear(): void;
  readonly count: number;
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
  getSeasonInfo(date: CalendarDate, calendarId?: string): SeasonInfo | null;
  getSunriseSunset(date: CalendarDate, calendarId?: string): { sunrise: string; sunset: string };

  // Time advancement
  advanceDays(days: number): Promise<void>;
  advanceHours(hours: number): Promise<void>;
  advanceMinutes(minutes: number): Promise<void>;
  advanceWeeks(weeks: number): Promise<void>;
  advanceMonths(months: number): Promise<void>;
  advanceYears(years: number): Promise<void>;
  validateCalendar(calendarData: unknown): Promise<ValidationResult>;
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
  addSidebarButton(widget: 'main' | 'mini' | 'grid', config: SidebarButtonConfig): void;
  removeSidebarButton(widget: 'main' | 'mini' | 'grid', buttonId: string): void;
  hasSidebarButton(widget: 'main' | 'mini' | 'grid', buttonId: string): boolean;

  // Preferred widget helpers (new registry-aware API)
  readonly main?: BridgeCalendarWidget | null;
  readonly mini?: BridgeCalendarWidget | null;
  readonly grid?: BridgeCalendarWidget | null;
  getPreferredWidget?(preference?: WidgetPreference): BridgeCalendarWidget | null;
  onWidgetChange?(callback: (widgets: SeasonsStarsWidgets) => void): void;
  offWidgetChange?(callback: (widgets: SeasonsStarsWidgets) => void): void;
}

export type WidgetPreference = WidgetType | 'any';

export interface BridgeCalendarWidget {
  id: string;
  isVisible: boolean;
  addSidebarButton(name: string, icon: string, tooltip: string, callback: () => void): void;
  removeSidebarButton(name: string): void;
  hasSidebarButton(name: string): boolean;
  getInstance<T = unknown>(): T | null;
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
    startDate: NoteDateReference,
    endDate?: NoteDateReference,
    allDay?: boolean,
    playerVisible?: boolean
  ): Promise<NoteDocument>;
  removeNote(noteId: string): Promise<void>;
  getNotesForDay(year: number, month: number, day: number, calendarId?: string): NoteDocument[];

  // Enhanced notes functionality (S&S native)
  createNote(data: CreateNoteData): Promise<NoteDocument>;
  updateNote(noteId: string, data: NoteUpdateData): Promise<NoteDocument>;
  deleteNote(noteId: string): Promise<void>;
  getNote(noteId: string): Promise<NoteDocument | null>;
  getNotesForDate(date: CalendarDate, calendarId?: string): Promise<NoteDocument[]>;
  getNotesForDateRange(start: CalendarDate, end: CalendarDate, calendarId?: string): Promise<NoteDocument[]>;

  // Module integration methods
  setNoteModuleData(noteId: string, moduleId: string, data: Record<string, unknown>): Promise<void>;
  getNoteModuleData(noteId: string, moduleId: string): Record<string, unknown> | null;

  // Display formatting for compatibility
  formatNoteDisplay(note: NoteDocument): {
    title: string;
    content: string;
    date: string;
    time?: string;
    category?: string;
    tags?: string[];
  };
}
