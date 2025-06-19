/**
 * Bridge Integration Interface for Seasons & Stars
 *
 * Provides a clean, generic API for compatibility bridge modules to integrate
 * with S&S without requiring external calendar system knowledge in the core.
 */

import type { CalendarDate, SeasonsStarsCalendar, DateFormatOptions } from '../types/calendar';
import type { CreateNoteData } from '../types/external-integrations';
import { CalendarManager } from './calendar-manager';
import { CalendarWidget } from '../ui/calendar-widget';
import { CalendarMiniWidget } from '../ui/calendar-mini-widget';
import { CalendarGridWidget } from '../ui/calendar-grid-widget';
import { CalendarDate as CalendarDateClass } from './calendar-date';
import { Logger } from './logger';

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

  // Time advancement (GM only)
  advanceDays(days: number, calendarId?: string): Promise<void>;
  advanceHours(hours: number, calendarId?: string): Promise<void>;
  advanceMinutes(minutes: number, calendarId?: string): Promise<void>;

  // Calendar metadata
  getMonthNames(calendarId?: string): string[];
  getWeekdayNames(calendarId?: string): string[];

  // Enhanced features (basic implementations available)
  getSunriseSunset(date: CalendarDate, calendarId?: string): TimeOfDay;
  getSeasonInfo(date: CalendarDate, calendarId?: string): SeasonInfo;

  // Notes API - Phase 2 addition
  notes: SeasonsStarsNotesAPI;
}

export interface SeasonsStarsNotesAPI {
  // Simple Calendar API compatibility
  addNote(
    title: string,
    content: string,
    startDate: CalendarDate,
    endDate?: CalendarDate,
    allDay?: boolean,
    playerVisible?: boolean
  ): Promise<JournalEntry>;
  removeNote(noteId: string): Promise<void>;
  getNotesForDay(year: number, month: number, day: number, calendarId?: string): JournalEntry[];

  // Enhanced notes functionality
  createNote(data: CreateNoteData): Promise<JournalEntry>;
  updateNote(noteId: string, data: UpdateNoteData): Promise<JournalEntry>;
  deleteNote(noteId: string): Promise<void>;
  getNote(noteId: string): Promise<JournalEntry | null>;
  getNotesForDate(date: CalendarDate, calendarId?: string): Promise<JournalEntry[]>;
  getNotesForDateRange(
    start: CalendarDate,
    end: CalendarDate,
    calendarId?: string
  ): Promise<JournalEntry[]>;

  // Module integration
  setNoteModuleData(noteId: string, moduleId: string, data: any): Promise<void>;
  getNoteModuleData(noteId: string, moduleId: string): any;
}

export interface SeasonsStarsWidgets {
  readonly main: BridgeCalendarWidget | null;
  readonly mini: BridgeCalendarWidget | null;
  readonly grid: BridgeCalendarWidget | null;

  getPreferredWidget(preference?: WidgetPreference): BridgeCalendarWidget | null;
  onWidgetChange(callback: (widgets: SeasonsStarsWidgets) => void): void;
  offWidgetChange(callback: (widgets: SeasonsStarsWidgets) => void): void;
}

export interface BridgeCalendarWidget {
  readonly id: string;
  readonly isVisible: boolean;

  addSidebarButton(name: string, icon: string, tooltip: string, callback: Function): void;
  removeSidebarButton(name: string): void;
  hasSidebarButton(name: string): boolean;
  getInstance(): unknown;
}

export interface SeasonsStarsHooks {
  onDateChanged(callback: (event: DateChangeEvent) => void): void;
  onCalendarChanged(callback: (event: CalendarChangeEvent) => void): void;
  onReady(callback: (event: ReadyEvent) => void): void;
  off(hookName: string, callback: Function): void;
}

// Event types
export interface DateChangeEvent {
  newDate: CalendarDate;
  oldDate: CalendarDate;
  worldTime: number;
  calendarId: string;
}

export interface CalendarChangeEvent {
  newCalendarId: string;
  oldCalendarId: string;
  calendar: Calendar;
}

export interface ReadyEvent {
  api: SeasonsStarsAPI;
  widgets: SeasonsStarsWidgets;
  version: string;
}

// Supporting types
export interface TimeOfDay {
  sunrise: number;
  sunset: number;
}

export interface SeasonInfo {
  name: string;
  icon: string;
  description?: string;
}

// UpdateNoteData is defined here as it's bridge-specific
export interface UpdateNoteData {
  title?: string;
  content?: string;
  startDate?: CalendarDate;
  endDate?: CalendarDate;
  allDay?: boolean;
  category?: string;
  tags?: string[];
  playerVisible?: boolean;
}

export enum WidgetPreference {
  MAIN = 'main',
  MINI = 'mini',
  GRID = 'grid',
  ANY = 'any',
}

/**
 * Main integration class that bridges use to interact with S&S
 */
export class SeasonsStarsIntegration {
  private static instance: SeasonsStarsIntegration | null = null;
  private manager: CalendarManager;
  private widgetManager: IntegrationWidgetManager;
  private hookManager: IntegrationHookManager;

  private constructor(manager: CalendarManager) {
    this.manager = manager;
    this.widgetManager = new IntegrationWidgetManager();
    this.hookManager = new IntegrationHookManager(manager);
  }

  /**
   * Detect and create integration instance
   */
  static detect(): SeasonsStarsIntegration | null {
    if (this.instance) {
      return this.instance;
    }

    // Check if S&S is available
    const module = game.modules.get('seasons-and-stars');
    if (!module?.active) {
      return null;
    }

    // Check if manager is available
    const manager = game.seasonsStars?.manager;
    if (!manager) {
      return null;
    }

    this.instance = new SeasonsStarsIntegration(manager);
    return this.instance;
  }

  /**
   * Get current version
   */
  get version(): string {
    const module = game.modules.get('seasons-and-stars');
    return module?.version || '0.0.0';
  }

  /**
   * Check if integration is available
   */
  get isAvailable(): boolean {
    return !!(this.manager && this.api);
  }

  /**
   * Get API interface
   */
  get api(): SeasonsStarsAPI {
    return new IntegrationAPI(this.manager);
  }

  /**
   * Get widgets interface
   */
  get widgets(): SeasonsStarsWidgets {
    return this.widgetManager;
  }

  /**
   * Get hooks interface
   */
  get hooks(): SeasonsStarsHooks {
    return this.hookManager;
  }

  /**
   * Check if specific feature is available
   */
  hasFeature(feature: string): boolean {
    return this.getFeatureVersion(feature) !== null;
  }

  /**
   * Get feature version for compatibility checking
   */
  getFeatureVersion(feature: string): string | null {
    const version = this.version;

    // Use capability detection instead of version comparison for better compatibility
    switch (feature) {
      case 'basic-api':
        return this.manager ? version : null;

      case 'widget-system':
        return this.widgetManager.main || this.widgetManager.mini ? version : null;

      case 'sidebar-buttons':
        // Check if widgets have addSidebarButton method
        const mainWidget = this.widgetManager.main;
        return mainWidget && typeof mainWidget.addSidebarButton === 'function' ? version : null;

      case 'mini-widget':
        return this.widgetManager.mini ? version : null;

      case 'time-advancement':
        return typeof this.manager.advanceDays === 'function' &&
          typeof this.manager.advanceHours === 'function'
          ? version
          : null;

      case 'multiple-calendars':
        return this.manager.getAvailableCalendars().length > 1 ? version : null;

      case 'grid-widget':
        return this.widgetManager.grid ? version : null;

      case 'bridge-interface':
        // This feature is available if we have the integration class
        return version;

      case 'notes-system':
        // Check if notes manager is available
        return game.seasonsStars?.notes ? version : null;

      case 'simple-calendar-notes-api':
        // Check if notes API methods are available
        const notesManager = game.seasonsStars?.notes;
        return notesManager &&
          typeof notesManager.createNote === 'function' &&
          typeof notesManager.setNoteModuleData === 'function'
          ? version
          : null;

      default:
        return null;
    }
  }

  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;

      if (v1Part !== v2Part) {
        return v1Part - v2Part;
      }
    }

    return 0;
  }

  /**
   * Clean up integration resources
   */
  cleanup(): void {
    this.hookManager.cleanup();
    this.widgetManager.cleanup();
    SeasonsStarsIntegration.instance = null;
  }
}

/**
 * API implementation that wraps the calendar manager
 */
class IntegrationAPI implements SeasonsStarsAPI {
  constructor(private manager: CalendarManager) {}

  getCurrentDate(_calendarId?: string): CalendarDate {
    // The actual manager method doesn't take a calendarId
    const currentDate = this.manager.getCurrentDate();
    if (!currentDate) {
      throw new Error('No active calendar or current date available');
    }
    return currentDate;
  }

  worldTimeToDate(timestamp: number, _calendarId?: string): CalendarDate {
    // Use engine to convert world time to date
    const engine = this.manager.getActiveEngine();
    if (!engine) {
      throw new Error('No active calendar engine');
    }
    return engine.worldTimeToDate(timestamp);
  }

  dateToWorldTime(date: CalendarDate, _calendarId?: string): number {
    // Use engine to convert date to world time
    const engine = this.manager.getActiveEngine();
    if (!engine) {
      throw new Error('No active calendar engine');
    }
    return engine.dateToWorldTime(date);
  }

  formatDate(date: CalendarDate, options?: DateFormatOptions): string {
    // Use CalendarDate class to format date
    const calendar = this.manager.getActiveCalendar();
    if (!calendar) {
      throw new Error('No active calendar');
    }
    const calendarDate = new CalendarDateClass(date, calendar);
    return calendarDate.format(options || {});
  }

  getActiveCalendar(): SeasonsStarsCalendar {
    const calendar = this.manager.getActiveCalendar();
    if (!calendar) {
      throw new Error('No active calendar');
    }
    return calendar;
  }

  async setActiveCalendar(calendarId: string): Promise<void> {
    const success = await this.manager.setActiveCalendar(calendarId);
    if (!success) {
      throw new Error(`Failed to set active calendar: ${calendarId}`);
    }
  }

  getAvailableCalendars(): string[] {
    return this.manager.getAvailableCalendars();
  }

  async advanceDays(days: number, _calendarId?: string): Promise<void> {
    return this.manager.advanceDays(days);
  }

  async advanceHours(hours: number, _calendarId?: string): Promise<void> {
    return this.manager.advanceHours(hours);
  }

  async advanceMinutes(minutes: number, _calendarId?: string): Promise<void> {
    return this.manager.advanceMinutes(minutes);
  }

  getMonthNames(calendarId?: string): string[] {
    const calendar = calendarId
      ? this.manager.getCalendar(calendarId)
      : this.manager.getActiveCalendar();

    if (!calendar) {
      throw new Error('No calendar available');
    }

    return calendar.months.map(month => month.name);
  }

  getWeekdayNames(calendarId?: string): string[] {
    const calendar = calendarId
      ? this.manager.getCalendar(calendarId)
      : this.manager.getActiveCalendar();

    if (!calendar) {
      throw new Error('No calendar available');
    }

    return calendar.weekdays.map(weekday => weekday.name);
  }

  getSunriseSunset(_date: CalendarDate, _calendarId?: string): TimeOfDay {
    // Default implementation - can be enhanced with calendar-specific data
    return {
      sunrise: 6, // 6 AM
      sunset: 18, // 6 PM
    };
  }

  getSeasonInfo(date: CalendarDate, _calendarId?: string): SeasonInfo {
    // Default seasonal calculation - can be enhanced with calendar-specific data
    const month = date.month;

    if (month >= 3 && month <= 5) {
      return { name: 'Spring', icon: 'spring' };
    } else if (month >= 6 && month <= 8) {
      return { name: 'Summer', icon: 'summer' };
    } else if (month >= 9 && month <= 11) {
      return { name: 'Fall', icon: 'fall' };
    } else {
      return { name: 'Winter', icon: 'winter' };
    }
  }

  get notes(): SeasonsStarsNotesAPI {
    return new IntegrationNotesAPI(this.manager);
  }
}

/**
 * Widget manager for bridge integration
 */
class IntegrationWidgetManager implements SeasonsStarsWidgets {
  private changeCallbacks: ((widgets: SeasonsStarsWidgets) => void)[] = [];

  get main(): BridgeCalendarWidget | null {
    const widget = CalendarWidget.getInstance();
    return widget ? new BridgeWidgetWrapper(widget, 'main') : null;
  }

  get mini(): BridgeCalendarWidget | null {
    const widget = CalendarMiniWidget.getInstance();
    return widget ? new BridgeWidgetWrapper(widget, 'mini') : null;
  }

  get grid(): BridgeCalendarWidget | null {
    const widget = CalendarGridWidget.getInstance();
    return widget ? new BridgeWidgetWrapper(widget, 'grid') : null;
  }

  getPreferredWidget(
    preference: WidgetPreference = WidgetPreference.ANY
  ): BridgeCalendarWidget | null {
    switch (preference) {
      case WidgetPreference.MAIN:
        return this.main;
      case WidgetPreference.MINI:
        return this.mini;
      case WidgetPreference.GRID:
        return this.grid;
      case WidgetPreference.ANY:
      default:
        return this.mini || this.main || this.grid;
    }
  }

  onWidgetChange(callback: (widgets: SeasonsStarsWidgets) => void): void {
    this.changeCallbacks.push(callback);
  }

  offWidgetChange(callback: (widgets: SeasonsStarsWidgets) => void): void {
    const index = this.changeCallbacks.indexOf(callback);
    if (index > -1) {
      this.changeCallbacks.splice(index, 1);
    }
  }

  notifyWidgetChange(): void {
    for (const callback of this.changeCallbacks) {
      try {
        callback(this);
      } catch (error) {
        Logger.error(
          'Widget change callback error',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }

  cleanup(): void {
    this.changeCallbacks.length = 0;
  }
}

/**
 * Wrapper for widget instances to provide bridge interface
 */
class BridgeWidgetWrapper implements BridgeCalendarWidget {
  constructor(
    private widget: any,
    private widgetType: string
  ) {}

  get id(): string {
    return `${this.widgetType}-widget`;
  }

  get isVisible(): boolean {
    return this.widget.rendered || false;
  }

  addSidebarButton(name: string, icon: string, tooltip: string, callback: Function): void {
    if (typeof this.widget.addSidebarButton === 'function') {
      this.widget.addSidebarButton(name, icon, tooltip, callback);
    } else {
      throw new Error(`Widget ${this.widgetType} does not support sidebar buttons`);
    }
  }

  removeSidebarButton(name: string): void {
    if (typeof this.widget.removeSidebarButton === 'function') {
      this.widget.removeSidebarButton(name);
    }
  }

  hasSidebarButton(name: string): boolean {
    if (typeof this.widget.hasSidebarButton === 'function') {
      return this.widget.hasSidebarButton(name);
    }
    return false;
  }

  getInstance(): any {
    return this.widget;
  }
}

/**
 * Hook manager for bridge integration
 */
class IntegrationHookManager implements SeasonsStarsHooks {
  private hookCallbacks: Map<string, Function[]> = new Map();

  constructor(private manager: CalendarManager) {
    this.setupHookListeners();
  }

  private setupHookListeners(): void {
    // Listen to internal S&S hooks and translate for bridges
    Hooks.on('seasons-stars:dateChanged', (data: any) => {
      this.emitToCallbacks('dateChanged', data);
    });

    Hooks.on('seasons-stars:calendarChanged', (data: any) => {
      this.emitToCallbacks('calendarChanged', data);
    });

    Hooks.on('seasons-stars:ready', (data: any) => {
      this.emitToCallbacks('ready', data);
    });
  }

  onDateChanged(callback: (event: DateChangeEvent) => void): void {
    this.addCallback('dateChanged', callback);
  }

  onCalendarChanged(callback: (event: CalendarChangeEvent) => void): void {
    this.addCallback('calendarChanged', callback);
  }

  onReady(callback: (event: ReadyEvent) => void): void {
    this.addCallback('ready', callback);
  }

  off(hookName: string, callback: Function): void {
    const callbacks = this.hookCallbacks.get(hookName);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private addCallback(hookName: string, callback: Function): void {
    if (!this.hookCallbacks.has(hookName)) {
      this.hookCallbacks.set(hookName, []);
    }
    this.hookCallbacks.get(hookName)!.push(callback);
  }

  private emitToCallbacks(hookName: string, data: any): void {
    const callbacks = this.hookCallbacks.get(hookName);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(data);
        } catch (error) {
          Logger.error(
            `Hook callback error for ${hookName}`,
            error instanceof Error ? error : new Error(String(error))
          );
        }
      }
    }
  }

  cleanup(): void {
    this.hookCallbacks.clear();
    // Note: We don't remove the Foundry hooks as other parts of S&S may still need them
  }
}

/**
 * Notes API implementation for bridge integration
 * Provides complete Simple Calendar API compatibility with full notes functionality
 */
class IntegrationNotesAPI implements SeasonsStarsNotesAPI {
  constructor(private manager: CalendarManager) {}

  // Simple Calendar API compatibility methods
  async addNote(
    title: string,
    content: string,
    startDate: any,
    endDate?: any,
    allDay: boolean = true,
    playerVisible: boolean = true
  ): Promise<any> {
    const notesManager = game.seasonsStars?.notes;
    if (!notesManager) {
      throw new Error('Notes system not available');
    }

    // Convert Simple Calendar format (0-based) to S&S format (1-based)
    const convertedStartDate = this.convertSCDateToSS(startDate);
    const convertedEndDate = endDate ? this.convertSCDateToSS(endDate) : undefined;

    const noteData: CreateNoteData = {
      title,
      content,
      startDate: convertedStartDate,
      endDate: convertedEndDate,
      allDay,
      calendarId: this.manager.getActiveCalendar()?.id || 'default',
      playerVisible,
    };

    const note = await notesManager.createNote(noteData);

    // Return Simple Calendar compatible object
    return this.convertNoteToSCFormat(note);
  }

  async removeNote(noteId: string): Promise<void> {
    const notesManager = game.seasonsStars?.notes;
    if (!notesManager) {
      throw new Error('Notes system not available');
    }

    await notesManager.deleteNote(noteId);
  }

  getNotesForDay(year: number, month: number, day: number, _calendarId?: string): any[] {
    const notesManager = game.seasonsStars?.notes;
    if (!notesManager) {
      return [];
    }

    // Convert 0-based SC format to 1-based S&S format
    const engine = this.manager.getActiveEngine();
    const ssYear = year;
    const ssMonth = month + 1;
    const ssDay = day + 1;
    const weekday = engine ? engine.calculateWeekday(ssYear, ssMonth, ssDay) : 0;

    const date: CalendarDate = {
      year: ssYear,
      month: ssMonth,
      day: ssDay,
      weekday,
    };

    try {
      // Get notes synchronously from storage
      const storage = notesManager.storage;
      const notes = storage.findNotesByDateSync(date);
      return notes.map(note => this.convertNoteToSCFormat(note));
    } catch (error) {
      Logger.error(
        'Error retrieving notes for day',
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }

  // Enhanced notes functionality (async versions)
  async createNote(data: CreateNoteData): Promise<JournalEntry> {
    const notesManager = game.seasonsStars?.notes;
    if (!notesManager) {
      throw new Error('Notes system not available');
    }

    return notesManager.createNote(data);
  }

  async updateNote(noteId: string, data: UpdateNoteData): Promise<JournalEntry> {
    const notesManager = game.seasonsStars?.notes;
    if (!notesManager) {
      throw new Error('Notes system not available');
    }

    return notesManager.updateNote(noteId, data);
  }

  async deleteNote(noteId: string): Promise<void> {
    const notesManager = game.seasonsStars?.notes;
    if (!notesManager) {
      throw new Error('Notes system not available');
    }

    return notesManager.deleteNote(noteId);
  }

  async getNote(noteId: string): Promise<JournalEntry | null> {
    const notesManager = game.seasonsStars?.notes;
    if (!notesManager) {
      return null;
    }

    return notesManager.getNote(noteId);
  }

  async getNotesForDate(date: CalendarDate, _calendarId?: string): Promise<JournalEntry[]> {
    const notesManager = game.seasonsStars?.notes;
    if (!notesManager) {
      return [];
    }

    return notesManager.getNotesForDate(date);
  }

  async getNotesForDateRange(
    start: CalendarDate,
    end: CalendarDate,
    _calendarId?: string
  ): Promise<JournalEntry[]> {
    const notesManager = game.seasonsStars?.notes;
    if (!notesManager) {
      return [];
    }

    return notesManager.getNotesForDateRange(start, end);
  }

  // Module integration methods
  async setNoteModuleData(noteId: string, moduleId: string, data: any): Promise<void> {
    const notesManager = game.seasonsStars?.notes;
    if (!notesManager) {
      throw new Error('Notes system not available');
    }

    return notesManager.setNoteModuleData(noteId, moduleId, data);
  }

  getNoteModuleData(noteId: string, moduleId: string): any {
    const notesManager = game.seasonsStars?.notes;
    if (!notesManager) {
      return null;
    }

    return notesManager.getNoteModuleData(noteId, moduleId);
  }

  // Date conversion utilities
  private convertSCDateToSS(scDate: any): CalendarDate {
    // Simple Calendar uses 0-based months and days
    // Seasons & Stars uses 1-based months and days
    const engine = this.manager.getActiveEngine();
    const year = scDate.year;
    const month = (scDate.month || 0) + 1;
    const day = (scDate.day || 0) + 1;

    // Calculate weekday using engine
    const weekday = engine ? engine.calculateWeekday(year, month, day) : 0;

    return {
      year,
      month,
      day,
      weekday,
    };
  }

  private convertSSDateToSC(ssDate: CalendarDate): any {
    // Convert 1-based S&S format to 0-based SC format
    return {
      year: ssDate.year,
      month: ssDate.month - 1,
      day: ssDate.day - 1,
    };
  }

  private convertNoteToSCFormat(note: JournalEntry): any {
    const flags = note.flags?.['seasons-and-stars'];
    if (!flags?.calendarNote) {
      throw new Error('Invalid calendar note');
    }

    const startDate = flags.startDate;
    const calendar = this.manager.getActiveCalendar();
    const engine = this.manager.getActiveEngine();

    if (!calendar || !engine) {
      throw new Error('No active calendar or engine available');
    }

    // Get month and weekday names
    const monthName =
      startDate.month >= 1 && startDate.month <= calendar.months.length
        ? calendar.months[startDate.month - 1]?.name || ''
        : '';

    // Calculate weekday and get name
    const weekdayIndex = engine.calculateWeekday(startDate.year, startDate.month, startDate.day);
    const weekdayName =
      weekdayIndex >= 0 && weekdayIndex < calendar.weekdays.length
        ? calendar.weekdays[weekdayIndex]?.name || ''
        : '';

    // Get ordinal suffix for day
    const daySuffix = this.getOrdinalSuffix(startDate.day);

    // Convert to 0-based for SC compatibility
    const scDate = this.convertSSDateToSC(startDate);

    return {
      // Core properties (0-based for SC compatibility)
      year: scDate.year,
      month: scDate.month,
      day: scDate.day,

      // Display data
      title: note.name,
      content: this.extractNoteContent(note),
      allDay: flags.allDay,

      // Foundry integration
      journalEntryId: note.id,

      // Enhanced display data (matching SmallTime expectations)
      display: {
        monthName: monthName,
        month: startDate.month.toString(),
        day: startDate.day.toString(),
        year: startDate.year.toString(),
        daySuffix: daySuffix,
        yearPrefix: calendar.year?.prefix || '',
        yearPostfix: calendar.year?.suffix || '',
        date: `${monthName} ${startDate.day}, ${startDate.year}`,
        time: '', // Notes don't have specific times
        weekday: weekdayName,
      },

      // Additional metadata
      startDate: startDate,
      endDate: flags.endDate,
      author: note.author?.name || '',
      playerVisible: note.ownership?.default === CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
    };
  }

  private extractNoteContent(note: JournalEntry): string {
    // Extract content from the first text page
    const textPage = note.pages?.find(page => page.type === 'text');
    return textPage?.text?.content || '';
  }

  private getOrdinalSuffix(day: number): string {
    if (day >= 11 && day <= 13) return 'th';
    const lastDigit = day % 10;
    switch (lastDigit) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  }
}
