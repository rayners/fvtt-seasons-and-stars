/**
 * Calendar management system for Seasons & Stars
 */

import type { SeasonsStarsCalendar } from '../types/calendar';
import { CalendarEngine } from './calendar-engine';
import { TimeConverter } from './time-converter';
import { CalendarValidator } from './calendar-validator';
import { CalendarDate } from './calendar-date';
import { CalendarLocalization } from './calendar-localization';
import { Logger } from './logger';
import { BUILT_IN_CALENDARS } from '../generated/calendar-list';

export class CalendarManager {
  private calendars: Map<string, SeasonsStarsCalendar> = new Map();
  public engines: Map<string, CalendarEngine> = new Map();
  private timeConverter: TimeConverter | null = null;
  private activeCalendarId: string | null = null;

  /**
   * Initialize the calendar manager
   */
  async initialize(): Promise<void> {
    Logger.debug('Initializing Calendar Manager');

    // Detect PF2e system for special integration
    this.detectPF2eSystem();

    // Load built-in calendars
    await this.loadBuiltInCalendars();

    // Complete initialization after settings are registered
    await this.completeInitialization();
  }

  /**
   * Detect if PF2e system is active and log integration info
   */
  private detectPF2eSystem(): void {
    const pf2eSystem = game.system?.id === 'pf2e';
    const pf2eModule = game.modules?.get('pf2e');

    if (pf2eSystem || (pf2eModule && pf2eModule.active)) {
      Logger.info('PF2e system detected - enabling enhanced compatibility mode');

      // Log PF2e time system information for debugging
      this.logPF2eTimeSystem();

      // Set up PF2e-specific hooks if available
      this.setupPF2eIntegration();
    }
  }

  /**
   * Log PF2e time system information for debugging
   */
  private logPF2eTimeSystem(): void {
    Logger.debug('PF2e Time System Analysis:');
    Logger.debug(`  game.time.worldTime: ${game.time?.worldTime || 'undefined'}`);
    Logger.debug(`  game.system.id: ${game.system?.id || 'undefined'}`);

    // Check for PF2e-specific time properties
    if ((game as any).pf2e) {
      Logger.debug('  PF2e game object found:', Object.keys((game as any).pf2e));
    }

    // Check for PF2e World Clock if it exists
    if ((game as any).worldClock) {
      Logger.debug('  World Clock found:', (game as any).worldClock);
    }

    // Check for common PF2e time-related settings using proper settings API
    const commonPF2eTimeSettings = [
      'pf2e.worldClock',
      'pf2e.timeZone',
      'pf2e.calendar',
      'pf2e.worldTime',
      'pf2e.timeManagement',
    ];

    for (const settingKey of commonPF2eTimeSettings) {
      try {
        const [module, setting] = settingKey.split('.');
        const value = game.settings?.get(module, setting);
        if (value !== undefined) {
          Logger.debug(`  PF2e setting found: ${settingKey}`, value);
        }
      } catch (error) {
        // Setting doesn't exist or not accessible, which is normal
      }
    }
  }

  /**
   * Set up PF2e-specific integration hooks
   */
  private setupPF2eIntegration(): void {
    // Listen for PF2e-specific time updates if they exist
    Hooks.on('renderApplication', (app: any, html: any) => {
      // Check if this is a PF2e World Clock or time-related application
      if (
        app.constructor.name?.includes('WorldClock') ||
        app.constructor.name?.includes('Time') ||
        app.title?.includes('World Clock')
      ) {
        Logger.debug('PF2e time application detected:', {
          name: app.constructor.name,
          title: app.title,
          data: app.data,
        });
      }
    });

    // Listen for any time-related hooks from PF2e
    Hooks.on('updateWorldTime', (newTime: number, delta: number) => {
      Logger.debug('PF2e updateWorldTime hook:', { newTime, delta, source: 'PF2e' });
    });

    // Listen for PF2e-specific time update hooks
    Hooks.on('pf2e:timeChanged', (data: any) => {
      Logger.debug('PF2e time changed hook:', data);
    });

    Hooks.on('worldClockUpdate', (data: any) => {
      Logger.debug('World Clock update hook:', data);
    });

    // Monitor PF2e data changes
    Hooks.on('ready', () => {
      this.monitorPF2eTimeChanges();
    });
  }

  /**
   * Monitor PF2e time changes for synchronization
   */
  private monitorPF2eTimeChanges(): void {
    // Set up periodic monitoring of PF2e time sources
    setInterval(() => {
      this.checkPF2eTimeSync();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Check and log PF2e time synchronization status
   */
  private checkPF2eTimeSync(): void {
    const foundryTime = game.time?.worldTime || 0;
    let pf2eTime: number | null = null;

    // Check various PF2e time sources
    if ((game as any).pf2e?.worldClock?.currentTime) {
      pf2eTime = (game as any).pf2e.worldClock.currentTime;
    } else if ((game as any).worldClock?.currentTime) {
      pf2eTime = (game as any).worldClock.currentTime;
    }

    if (pf2eTime !== null && pf2eTime !== foundryTime) {
      Logger.debug('PF2e time sync status:', {
        foundryTime,
        pf2eTime,
        difference: pf2eTime - foundryTime,
        percentDiff: Math.abs((pf2eTime - foundryTime) / Math.max(foundryTime, 1)) * 100,
      });

      // Emit custom hook for widgets to update
      Hooks.callAll('seasons-stars:pf2eTimeMismatch', {
        foundryTime,
        pf2eTime,
        difference: pf2eTime - foundryTime,
      });
    }
  }

  /**
   * Complete initialization after settings are registered
   */
  async completeInitialization(): Promise<void> {
    Logger.debug('Completing Calendar Manager initialization');

    // Load active calendar from settings
    const savedCalendarId = game.settings?.get('seasons-and-stars', 'activeCalendar') as string;

    if (savedCalendarId && this.calendars.has(savedCalendarId)) {
      await this.setActiveCalendar(savedCalendarId);
    } else {
      // Default to first available calendar
      const firstCalendarId = this.calendars.keys().next().value;
      if (firstCalendarId) {
        await this.setActiveCalendar(firstCalendarId);
      }
    }

    Logger.debug(`Loaded ${this.calendars.size} calendars`);
  }

  /**
   * Load built-in calendar definitions
   */
  async loadBuiltInCalendars(): Promise<void> {
    const builtInCalendars = BUILT_IN_CALENDARS;

    for (const calendarId of builtInCalendars) {
      try {
        // Try to load from module's calendars directory
        const response = await fetch(`modules/seasons-and-stars/calendars/${calendarId}.json`);

        if (response.ok) {
          const calendarData = await response.json();
          this.loadCalendar(calendarData);
        } else {
          Logger.warn(`Could not load built-in calendar: ${calendarId}`);
        }
      } catch (error) {
        Logger.error(`Error loading calendar ${calendarId}`, error as Error);
      }
    }
  }

  /**
   * Load a calendar from data
   */
  loadCalendar(calendarData: SeasonsStarsCalendar): boolean {
    // Validate the calendar data
    const validation = CalendarValidator.validate(calendarData);

    if (!validation.isValid) {
      Logger.error(`Invalid calendar data for ${calendarData.id}: ${validation.errors.join(', ')}`);
      return false;
    }

    // Warn about potential issues
    if (validation.warnings.length > 0) {
      Logger.warn(`Calendar warnings for ${calendarData.id}: ${validation.warnings.join(', ')}`);
    }

    // Store the calendar
    this.calendars.set(calendarData.id, calendarData);

    // Create engine for this calendar
    const engine = new CalendarEngine(calendarData);
    this.engines.set(calendarData.id, engine);

    const label = CalendarLocalization.getCalendarLabel(calendarData);
    Logger.debug(`Loaded calendar: ${label} (${calendarData.id})`);
    return true;
  }

  /**
   * Set the active calendar
   */
  async setActiveCalendar(calendarId: string): Promise<boolean> {
    if (!this.calendars.has(calendarId)) {
      Logger.error(`Calendar not found: ${calendarId}`);
      return false;
    }

    this.activeCalendarId = calendarId;

    // Update time converter with new engine
    const engine = this.engines.get(calendarId);
    if (!engine) {
      Logger.error(`Engine not found for calendar: ${calendarId}`);
      return false;
    }

    if (this.timeConverter) {
      this.timeConverter.updateEngine(engine);
    } else {
      this.timeConverter = new TimeConverter(engine);
    }

    // Save to settings
    if (game.settings) {
      await game.settings.set('seasons-and-stars', 'activeCalendar', calendarId);
    }

    // Emit hook for calendar change
    Hooks.callAll('seasons-stars:calendarChanged', {
      newCalendarId: calendarId,
      calendar: this.calendars.get(calendarId),
    });

    Logger.debug(`Active calendar set to: ${calendarId}`);
    return true;
  }

  /**
   * Get the active calendar
   */
  getActiveCalendar(): SeasonsStarsCalendar | null {
    if (!this.activeCalendarId) return null;
    return this.calendars.get(this.activeCalendarId) || null;
  }

  /**
   * Get the active calendar engine
   */
  getActiveEngine(): CalendarEngine | null {
    if (!this.activeCalendarId) return null;
    return this.engines.get(this.activeCalendarId) || null;
  }

  /**
   * Get the time converter
   */
  getTimeConverter(): TimeConverter | null {
    return this.timeConverter;
  }

  /**
   * Get all available calendar IDs
   */
  getAvailableCalendars(): string[] {
    return Array.from(this.calendars.keys());
  }

  /**
   * Get all calendar objects
   */
  getAllCalendars(): SeasonsStarsCalendar[] {
    return Array.from(this.calendars.values());
  }

  /**
   * Get calendar data by ID
   */
  getCalendar(calendarId: string): SeasonsStarsCalendar | null {
    return this.calendars.get(calendarId) || null;
  }

  /**
   * Import a calendar from JSON file
   */
  async importCalendarFromFile(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      const calendarData = JSON.parse(text);

      return this.loadCalendar(calendarData);
    } catch (error) {
      Logger.error('Error importing calendar', error as Error);
      ui.notifications?.error(`Failed to import calendar: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Export a calendar to JSON
   */
  exportCalendar(calendarId: string): string | null {
    const calendar = this.calendars.get(calendarId);

    if (!calendar) {
      Logger.error(`Calendar not found for export: ${calendarId}`);
      return null;
    }

    try {
      return JSON.stringify(calendar, null, 2);
    } catch (error) {
      Logger.error('Error exporting calendar', error as Error);
      return null;
    }
  }

  /**
   * Remove a calendar (built-in calendars cannot be removed)
   */
  removeCalendar(calendarId: string): boolean {
    const builtInCalendars = ['gregorian', 'vale-reckoning'];

    if (builtInCalendars.includes(calendarId)) {
      Logger.warn(`Cannot remove built-in calendar: ${calendarId}`);
      return false;
    }

    if (!this.calendars.has(calendarId)) {
      Logger.warn(`Calendar not found: ${calendarId}`);
      return false;
    }

    // Don't remove if it's the active calendar
    if (this.activeCalendarId === calendarId) {
      Logger.warn(`Cannot remove active calendar: ${calendarId}`);
      return false;
    }

    this.calendars.delete(calendarId);
    this.engines.delete(calendarId);

    Logger.debug(`Removed calendar: ${calendarId}`);
    return true;
  }

  /**
   * Get current date from active calendar
   */
  getCurrentDate(): CalendarDate | null {
    if (!this.timeConverter) return null;
    return this.timeConverter.getCurrentDate();
  }

  /**
   * Advance time by days using active calendar
   */
  async advanceDays(days: number): Promise<void> {
    if (!this.timeConverter) {
      throw new Error('No active calendar set');
    }

    await this.timeConverter.advanceDays(days);
  }

  /**
   * Advance time by hours using active calendar
   */
  async advanceHours(hours: number): Promise<void> {
    if (!this.timeConverter) {
      throw new Error('No active calendar set');
    }

    await this.timeConverter.advanceHours(hours);
  }

  /**
   * Advance time by weeks using active calendar
   */
  async advanceWeeks(weeks: number): Promise<void> {
    if (!this.timeConverter) {
      throw new Error('No active calendar set');
    }

    await this.timeConverter.advanceWeeks(weeks);
  }

  /**
   * Advance time by months using active calendar
   */
  async advanceMonths(months: number): Promise<void> {
    if (!this.timeConverter) {
      throw new Error('No active calendar set');
    }

    await this.timeConverter.advanceMonths(months);
  }

  /**
   * Advance time by years using active calendar
   */
  async advanceYears(years: number): Promise<void> {
    if (!this.timeConverter) {
      throw new Error('No active calendar set');
    }

    await this.timeConverter.advanceYears(years);
  }

  /**
   * Advance time by minutes using active calendar
   */
  async advanceMinutes(minutes: number): Promise<void> {
    if (!this.timeConverter) {
      throw new Error('No active calendar set');
    }

    await this.timeConverter.advanceMinutes(minutes);
  }

  /**
   * Set current date using active calendar
   */
  async setCurrentDate(date: any): Promise<void> {
    if (!this.timeConverter) {
      throw new Error('No active calendar set');
    }

    await this.timeConverter.setCurrentDate(date);
  }

  /**
   * Get debug information
   */
  getDebugInfo(): any {
    return {
      activeCalendarId: this.activeCalendarId,
      availableCalendars: this.getAvailableCalendars(),
      currentDate: this.getCurrentDate()?.toLongString(),
      timeConverter: this.timeConverter?.getDebugInfo(),
    };
  }

  /**
   * Validate all loaded calendars
   */
  validateAllCalendars(): { [calendarId: string]: any } {
    const results: { [calendarId: string]: any } = {};

    for (const [calendarId, calendar] of this.calendars.entries()) {
      results[calendarId] = CalendarValidator.validateWithHelp(calendar);
    }

    return results;
  }
}
