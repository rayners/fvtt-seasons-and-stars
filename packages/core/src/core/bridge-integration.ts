/**
 * Bridge Integration Interface for Seasons & Stars
 *
 * Provides a clean, generic API for compatibility bridge modules to integrate
 * with S&S without requiring external calendar system knowledge in the core.
 */

import type {
  CalendarDate,
  CalendarDateData,
  SeasonsStarsCalendar,
  DateFormatOptions,
} from '../types/calendar';
import { CalendarDate as CalendarDateClass } from './calendar-date';
import type { CreateNoteData } from '../types/external-integrations';
import type { CalendarManagerInterface, NotesManagerInterface } from '../types/foundry-extensions';
import { compatibilityManager } from './compatibility-manager';
import type {
  SeasonsStarsAPI,
  SeasonsStarsWidgets,
  SeasonsStarsHooks,
  SeasonsStarsNotesAPI,
} from '../types/bridge-interfaces';
import { isCalendarManager } from '../types/type-guards';
import { CalendarWidget } from '../ui/calendar-widget';
import { CalendarMiniWidget } from '../ui/calendar-mini-widget';
import { CalendarGridWidget } from '../ui/calendar-grid-widget';
import { Logger } from './logger';

// Additional bridge-specific interfaces not in the main bridge-interfaces file

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

// Bridge Calendar Widget interface
export interface BridgeCalendarWidget {
  id: string;
  isVisible: boolean;
  addSidebarButton(name: string, icon: string, tooltip: string, callback: () => void): void;
  removeSidebarButton(name: string): void;
  hasSidebarButton(name: string): boolean;
  getInstance(): any;
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
  private manager: CalendarManagerInterface;
  private widgetManager: IntegrationWidgetManager;
  private hookManager: IntegrationHookManager;

  private constructor(manager: CalendarManagerInterface) {
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
    if (!manager || !isCalendarManager(manager)) {
      return null;
    }

    this.instance = new SeasonsStarsIntegration(manager as CalendarManagerInterface);
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
    return new IntegrationAPI(this.manager) as any; // TODO: Fix interface mismatches
  }

  /**
   * Get widgets interface
   */
  get widgets(): SeasonsStarsWidgets {
    return this.widgetManager as any; // TODO: Fix interface mismatches
  }

  /**
   * Get hooks interface
   */
  get hooks(): SeasonsStarsHooks {
    return this.hookManager as any; // TODO: Fix interface mismatches
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

      case 'sidebar-buttons': {
        // Check if widgets have addSidebarButton method
        const mainWidget = this.widgetManager.main;
        return mainWidget && typeof mainWidget.addSidebarButton === 'function' ? version : null;
      }

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

      case 'simple-calendar-notes-api': {
        // Check if notes API methods are available
        const notesManager = game.seasonsStars?.notes;
        return notesManager &&
          typeof (notesManager as NotesManagerInterface).createNote === 'function' &&
          typeof (notesManager as NotesManagerInterface).setNoteModuleData === 'function'
          ? version
          : null;
      }

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
class IntegrationAPI {
  constructor(private manager: CalendarManagerInterface) {}

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

    // Apply system-specific worldTime transformation if available
    let transformedWorldTime = timestamp;
    let systemTimeOffset: number | undefined;

    try {
      const transform = compatibilityManager.getSystemData<
        (worldTime: number, defaultOffset?: number) => [number, number | undefined]
      >(game.system!.id, 'worldTimeTransform');
      if (transform) {
        [transformedWorldTime, systemTimeOffset] = transform(timestamp);
      }
    } catch (error) {
      Logger.warn(`Error applying ${game.system!.id} worldTime transformation:`, error);
    }

    return engine.worldTimeToDate(transformedWorldTime, systemTimeOffset);
  }

  dateToWorldTime(date: CalendarDate, _calendarId?: string): number {
    // Use engine to convert date to world time
    const engine = this.manager.getActiveEngine();
    if (!engine) {
      throw new Error('No active calendar engine');
    }

    // Apply system-specific worldTime transformation if available
    let systemTimeOffset: number | undefined;

    try {
      const transform = compatibilityManager.getSystemData<
        (worldTime: number, defaultOffset?: number) => [number, number | undefined]
      >(game.system!.id, 'worldTimeTransform');
      if (transform) {
        // Get the system time offset (we don't need to transform the input here)
        [, systemTimeOffset] = transform(0);
      }
    } catch (error) {
      Logger.warn(`Error getting ${game.system!.id} system time offset:`, error);
    }

    return engine.dateToWorldTime(date, systemTimeOffset);
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
    return this.manager.getAvailableCalendars().map(calendar => calendar.id);
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
class IntegrationWidgetManager {
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
        callback(this as any); // TODO: Fix interface mismatch
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

  addSidebarButton(name: string, icon: string, tooltip: string, callback: () => void): void {
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
class IntegrationHookManager {
  private hookCallbacks: Map<string, ((...args: unknown[]) => void)[]> = new Map();

  constructor(private manager: CalendarManagerInterface) {
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
    this.addCallback('dateChanged', callback as (...args: unknown[]) => void);
  }

  onCalendarChanged(callback: (event: CalendarChangeEvent) => void): void {
    this.addCallback('calendarChanged', callback as (...args: unknown[]) => void);
  }

  onReady(callback: (event: ReadyEvent) => void): void {
    this.addCallback('ready', callback as (...args: unknown[]) => void);
  }

  off(hookName: string, callback: (...args: unknown[]) => void): void {
    const callbacks = this.hookCallbacks.get(hookName);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private addCallback(hookName: string, callback: (...args: unknown[]) => void): void {
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
  constructor(private manager: CalendarManagerInterface) {}

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

    const note = await (notesManager as NotesManagerInterface).createNote(noteData);

    // Return Simple Calendar compatible object
    return this.convertNoteToSCFormat(note);
  }

  async removeNote(noteId: string): Promise<void> {
    const notesManager = game.seasonsStars?.notes;
    if (!notesManager) {
      throw new Error('Notes system not available');
    }

    await (notesManager as NotesManagerInterface).deleteNote(noteId);
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

    const dateData: CalendarDateData = {
      year: ssYear,
      month: ssMonth,
      day: ssDay,
      weekday,
    };

    const calendar = this.manager.getActiveCalendar();
    if (!calendar) {
      Logger.warn('No active calendar found for note conversion');
      return [];
    }
    const date = new CalendarDateClass(dateData, calendar);

    try {
      // Get notes synchronously from storage
      const storage = (notesManager as NotesManagerInterface).storage;
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

    return (notesManager as NotesManagerInterface).createNote(data);
  }

  async updateNote(noteId: string, data: UpdateNoteData): Promise<JournalEntry> {
    const notesManager = game.seasonsStars?.notes;
    if (!notesManager) {
      throw new Error('Notes system not available');
    }

    return (notesManager as NotesManagerInterface).updateNote(noteId, data);
  }

  async deleteNote(noteId: string): Promise<void> {
    const notesManager = game.seasonsStars?.notes;
    if (!notesManager) {
      throw new Error('Notes system not available');
    }

    return (notesManager as NotesManagerInterface).deleteNote(noteId);
  }

  async getNote(noteId: string): Promise<JournalEntry | null> {
    const notesManager = game.seasonsStars?.notes;
    if (!notesManager) {
      return null;
    }

    return (notesManager as NotesManagerInterface).getNote(noteId);
  }

  async getNotesForDate(date: CalendarDate, _calendarId?: string): Promise<JournalEntry[]> {
    const notesManager = game.seasonsStars?.notes;
    if (!notesManager) {
      return [];
    }

    return (notesManager as NotesManagerInterface).getNotesForDate(date);
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

    return (notesManager as NotesManagerInterface).getNotesForDateRange(start, end);
  }

  // Module integration methods
  async setNoteModuleData(noteId: string, moduleId: string, data: any): Promise<void> {
    const notesManager = game.seasonsStars?.notes;
    if (!notesManager) {
      throw new Error('Notes system not available');
    }

    return (notesManager as NotesManagerInterface).setNoteModuleData(noteId, moduleId, data);
  }

  getNoteModuleData(noteId: string, moduleId: string): any {
    const notesManager = game.seasonsStars?.notes;
    if (!notesManager) {
      return null;
    }

    return (notesManager as NotesManagerInterface).getNoteModuleData(noteId, moduleId);
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

    const dateData: CalendarDateData = {
      year,
      month,
      day,
      weekday,
    };

    const calendar = this.manager.getActiveCalendar();
    if (!calendar) {
      throw new Error('No active calendar found for date conversion');
    }
    return new CalendarDateClass(dateData, calendar);
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

  formatNoteDisplay(note: any): any {
    // Convert note to display format for compatibility
    return this.convertNoteToSCFormat(note);
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
