/**
 * Calendar management system for Seasons & Stars
 */

import type { SeasonsStarsCalendar, CalendarVariant } from '../types/calendar';
import { CalendarEngine } from './calendar-engine';
import { TimeConverter } from './time-converter';
import { CalendarValidator } from './calendar-validator';
import { CalendarDate } from './calendar-date';
import { CalendarLocalization } from './calendar-localization';
import { Logger } from './logger';
import { BUILT_IN_CALENDARS } from '../generated/calendar-list';

export class CalendarManager {
  public calendars: Map<string, SeasonsStarsCalendar> = new Map();
  public engines: Map<string, CalendarEngine> = new Map();
  private timeConverter: TimeConverter | null = null;
  private activeCalendarId: string | null = null;

  /**
   * Initialize the calendar manager
   */
  async initialize(): Promise<void> {
    Logger.debug('Initializing Calendar Manager');

    // Load built-in calendars
    await this.loadBuiltInCalendars();

    // Complete initialization after settings are registered
    await this.completeInitialization();
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

    // First, load all base calendars (excluding external variant files)
    for (const calendarId of builtInCalendars) {
      // Skip external variant files - they'll be loaded separately
      if (calendarId.includes('-variants')) {
        continue;
      }

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

    // Then, load external variant files
    await this.loadExternalVariantFiles();
  }

  /**
   * Load a calendar from data
   */
  loadCalendar(calendarData: SeasonsStarsCalendar): boolean {
    // Validate the calendar data (using synchronous legacy validation for performance)
    const validation = CalendarValidator.validateWithHelp(calendarData);

    if (!validation.isValid) {
      Logger.error(`Invalid calendar data for ${calendarData.id}: ${validation.errors.join(', ')}`);
      return false;
    }

    // Warn about potential issues
    if (validation.warnings.length > 0) {
      Logger.debug(`Calendar info for ${calendarData.id}: ${validation.warnings.join(', ')}`);
    }

    // Store the base calendar
    this.calendars.set(calendarData.id, calendarData);

    // Create engine for base calendar
    const engine = new CalendarEngine(calendarData);
    this.engines.set(calendarData.id, engine);

    // Expand variants if they exist
    if (calendarData.variants) {
      this.expandCalendarVariants(calendarData);
    }

    const label = CalendarLocalization.getCalendarLabel(calendarData);
    Logger.debug(`Loaded calendar: ${label} (${calendarData.id})`);
    return true;
  }

  /**
   * Set the active calendar
   */
  async setActiveCalendar(calendarId: string): Promise<boolean> {
    // Resolve default variant if setting base calendar with variants
    const resolvedCalendarId = this.resolveDefaultVariant(calendarId);

    if (!this.calendars.has(resolvedCalendarId)) {
      Logger.error(`Calendar not found: ${resolvedCalendarId}`);
      return false;
    }

    this.activeCalendarId = resolvedCalendarId;

    // Update time converter with new engine
    const engine = this.engines.get(resolvedCalendarId);
    if (!engine) {
      Logger.error(`Engine not found for calendar: ${resolvedCalendarId}`);
      return false;
    }

    if (this.timeConverter) {
      this.timeConverter.updateEngine(engine);
    } else {
      this.timeConverter = new TimeConverter(engine);
    }

    // Save to settings
    if (game.settings) {
      await game.settings.set('seasons-and-stars', 'activeCalendar', resolvedCalendarId);
    }

    // Emit hook for calendar change
    Hooks.callAll('seasons-stars:calendarChanged', {
      newCalendarId: resolvedCalendarId,
      calendar: this.calendars.get(resolvedCalendarId),
    });

    Logger.debug(`Active calendar set to: ${resolvedCalendarId}`);
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
   * Get the active calendar ID
   */
  getActiveCalendarId(): string | null {
    return this.activeCalendarId;
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
  getAvailableCalendars(): SeasonsStarsCalendar[] {
    return Array.from(this.calendars.values());
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async setCurrentDate(date: any): Promise<void> {
    if (!this.timeConverter) {
      throw new Error('No active calendar set');
    }

    await this.timeConverter.setCurrentDate(date);
  }

  /**
   * Get debug information
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validateAllCalendars(): { [calendarId: string]: any } {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: { [calendarId: string]: any } = {};

    for (const [calendarId, calendar] of this.calendars.entries()) {
      results[calendarId] = CalendarValidator.validateWithHelp(calendar);
    }

    return results;
  }

  /**
   * Resolve a calendar ID to its default variant if applicable
   */
  private resolveDefaultVariant(calendarId: string): string {
    // If the ID already includes a variant (contains parentheses), return as-is
    if (calendarId.includes('(') && calendarId.includes(')')) {
      return calendarId;
    }

    // First, check for inline variants in the base calendar
    const baseCalendar = this.calendars.get(calendarId);
    if (baseCalendar?.variants) {
      // Find the default variant in inline variants
      for (const [variantId, variant] of Object.entries(baseCalendar.variants)) {
        if (variant.default) {
          return `${calendarId}(${variantId})`;
        }
      }
    }

    // Note: External variants are not checked for automatic defaults
    // They represent themed collections intended for specific campaign types
    // and should be explicitly selected by users, not automatic defaults

    // Return the original ID if no default variant found
    return calendarId;
  }

  /**
   * Expand calendar variants into separate calendar entries
   */
  private expandCalendarVariants(baseCalendar: SeasonsStarsCalendar): void {
    if (!baseCalendar.variants) return;

    for (const [variantId, variant] of Object.entries(baseCalendar.variants)) {
      const variantCalendar = this.applyVariantOverrides(baseCalendar, variantId, variant);
      const variantCalendarId = `${baseCalendar.id}(${variantId})`;

      // Store the variant calendar
      this.calendars.set(variantCalendarId, variantCalendar);

      // Create engine for variant calendar
      const variantEngine = new CalendarEngine(variantCalendar);
      this.engines.set(variantCalendarId, variantEngine);

      Logger.debug(`Created calendar variant: ${variantCalendarId}`);
    }
  }

  /**
   * Apply variant overrides to a base calendar
   */
  private applyVariantOverrides(
    baseCalendar: SeasonsStarsCalendar,
    variantId: string,
    variant: CalendarVariant
  ): SeasonsStarsCalendar {
    // Deep clone the base calendar
    const variantCalendar: SeasonsStarsCalendar = JSON.parse(JSON.stringify(baseCalendar));

    // Update ID to include variant
    variantCalendar.id = `${baseCalendar.id}(${variantId})`;

    // Update translations to show variant name
    for (const translation of Object.values(variantCalendar.translations)) {
      translation.label = `${translation.label} (${variant.name})`;
    }

    // Apply overrides
    if (variant.overrides) {
      // Apply year overrides
      if (variant.overrides.year) {
        Object.assign(variantCalendar.year, variant.overrides.year);
      }

      // Apply month overrides
      if (variant.overrides.months) {
        for (const [monthName, monthOverrides] of Object.entries(variant.overrides.months)) {
          const monthIndex = variantCalendar.months.findIndex(m => m.name === monthName);
          if (monthIndex !== -1) {
            Object.assign(variantCalendar.months[monthIndex], monthOverrides);
          }
        }
      }

      // Apply weekday overrides
      if (variant.overrides.weekdays) {
        for (const [weekdayName, weekdayOverrides] of Object.entries(variant.overrides.weekdays)) {
          const weekdayIndex = variantCalendar.weekdays.findIndex(w => w.name === weekdayName);
          if (weekdayIndex !== -1) {
            Object.assign(variantCalendar.weekdays[weekdayIndex], weekdayOverrides);
          }
        }
      }

      // Apply dateFormats overrides
      if (variant.overrides.dateFormats) {
        // Deep merge dateFormats to preserve base calendar formats while adding variant-specific ones
        variantCalendar.dateFormats = {
          ...variantCalendar.dateFormats,
          ...variant.overrides.dateFormats,
          // Merge nested objects like widgets
          ...(variantCalendar.dateFormats?.widgets || variant.overrides.dateFormats?.widgets
            ? {
                widgets: {
                  ...variantCalendar.dateFormats?.widgets,
                  ...variant.overrides.dateFormats?.widgets,
                },
              }
            : {}),
        };
      }

      // Apply moon overrides
      if (variant.overrides.moons !== undefined) {
        variantCalendar.moons = variant.overrides.moons;
      }
    }

    return variantCalendar;
  }

  /**
   * Load external variant files that reference existing calendars
   */
  private async loadExternalVariantFiles(): Promise<void> {
    const builtInCalendars = BUILT_IN_CALENDARS;

    // Find all variant files in the calendar list
    const variantFiles = builtInCalendars.filter(calendarId => calendarId.includes('-variants'));

    for (const variantFileId of variantFiles) {
      await this.loadExternalVariantFile(variantFileId);
    }
  }

  /**
   * Load a specific external variant file
   */
  private async loadExternalVariantFile(variantFileId: string): Promise<void> {
    try {
      const response = await fetch(`modules/seasons-and-stars/calendars/${variantFileId}.json`);

      if (!response.ok) {
        Logger.debug(`External variant file not found: ${variantFileId}`);
        return;
      }

      const variantFileData = await response.json();

      // Validate external variant file structure
      if (!this.validateExternalVariantFile(variantFileData)) {
        Logger.error(`Invalid external variant file: ${variantFileId}`);
        return;
      }

      // Check if base calendar exists
      const baseCalendar = this.calendars.get(variantFileData.baseCalendar);
      if (!baseCalendar) {
        Logger.warn(
          `Base calendar '${variantFileData.baseCalendar}' not found for variant file: ${variantFileId}`
        );
        return;
      }

      // Apply external variants to the base calendar
      this.applyExternalVariants(baseCalendar, variantFileData);

      Logger.debug(
        `Loaded external variant file: ${variantFileId} (${Object.keys(variantFileData.variants).length} variants)`
      );
    } catch (error) {
      Logger.error(`Error loading external variant file ${variantFileId}`, error as Error);
    }
  }

  /**
   * Validate external variant file structure
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private validateExternalVariantFile(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.id === 'string' &&
      typeof data.baseCalendar === 'string' &&
      typeof data.variants === 'object' &&
      data.variants !== null
    );
  }

  /**
   * Apply external variants to a base calendar
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyExternalVariants(baseCalendar: SeasonsStarsCalendar, variantFileData: any): void {
    for (const [variantId, variant] of Object.entries(variantFileData.variants)) {
      const variantCalendar = this.applyVariantOverrides(
        baseCalendar,
        variantId,
        variant as CalendarVariant
      );
      const variantCalendarId = `${baseCalendar.id}(${variantId})`;

      // Store the variant calendar
      this.calendars.set(variantCalendarId, variantCalendar);

      // Create engine for variant calendar
      const variantEngine = new CalendarEngine(variantCalendar);
      this.engines.set(variantCalendarId, variantEngine);

      // Note: External variants with default=true are only defaults within their
      // themed context, not automatic defaults for the base calendar

      Logger.debug(`Created external calendar variant: ${variantCalendarId}`);
    }
  }
}
