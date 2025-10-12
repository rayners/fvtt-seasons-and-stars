/**
 * Calendar management system for Seasons & Stars
 */

import type { SeasonsStarsCalendar, CalendarVariant, CalendarSourceInfo } from '../types/calendar';
import { CalendarEngine } from './calendar-engine';
import { EventsManager } from './events-manager';
import { TimeConverter } from './time-converter';
import { CalendarValidator } from './calendar-validator';
import { CalendarDate } from './calendar-date';
import { CalendarLocalization } from './calendar-localization';
import { CalendarLoader, type ExternalCalendarSource, type LoadResult } from './calendar-loader';
import { Logger } from './logger';
import {
  saveCalendarDataForSync,
  clearConflictingCalendarSetting,
} from '../ui/calendar-file-helpers.js';
// Calendar list is now loaded dynamically from calendars/index.json

export class CalendarManager {
  public calendars: Map<string, SeasonsStarsCalendar> = new Map();
  public engines: Map<string, CalendarEngine> = new Map();
  public eventsManagers: Map<string, EventsManager> = new Map();
  private timeConverter: TimeConverter | null = null;
  private activeCalendarId: string | null = null;
  private calendarLoader: CalendarLoader = new CalendarLoader();

  /**
   * Initialize the calendar manager synchronously from cached data
   * This method loads only cached calendar data and is used during the init hook
   * to ensure calendars are available immediately for compatibility bridges
   */
  initializeSync(): boolean {
    Logger.debug('Initializing Calendar Manager synchronously from cached data');

    // Try to load active calendar from cached settings data
    const savedCalendarId = game.settings?.get('seasons-and-stars', 'activeCalendar') as string;
    const cachedCalendarData = game.settings?.get(
      'seasons-and-stars',
      'activeCalendarData'
    ) as SeasonsStarsCalendar | null;

    if (savedCalendarId && cachedCalendarData && cachedCalendarData.id === savedCalendarId) {
      Logger.debug('Loading calendar synchronously from cached data:', savedCalendarId);

      // Load the calendar into the manager
      const sourceInfo: CalendarSourceInfo = {
        type: 'builtin',
        sourceName: 'Seasons & Stars',
        description: 'Built-in calendar from cached data',
        icon: 'fa-solid fa-calendar',
      };

      const success = this.loadCalendar(cachedCalendarData, sourceInfo);
      if (success) {
        // Set active calendar synchronously
        const activateSuccess = this.setActiveCalendarSync(savedCalendarId);
        if (activateSuccess) {
          Logger.debug('Successfully initialized calendar synchronously:', savedCalendarId);
          return true;
        }
      }
    }

    Logger.debug('No cached calendar data available for synchronous initialization');
    return false;
  }

  /**
   * Initialize the calendar manager
   */
  async initialize(): Promise<void> {
    Logger.debug('Initializing Calendar Manager');

    // Load built-in calendars
    await this.loadBuiltInCalendars();

    // Fire hook to allow external modules to register calendars
    this.fireExternalCalendarRegistrationHook();

    // Complete initialization after settings are registered
    await this.completeInitialization();
  }

  /**
   * Complete initialization after settings are registered
   *
   * IMPORTANT: During initialization, calendar activation must use saveToSettings: false
   * to prevent circular update loops. We're loading FROM settings, so writing BACK to
   * settings would trigger onChange handlers that could reset the calendar state.
   */
  async completeInitialization(): Promise<void> {
    Logger.debug('Completing Calendar Manager initialization');

    // Check for file-based calendar first
    const activeCalendarFile = game.settings?.get(
      'seasons-and-stars',
      'activeCalendarFile'
    ) as string;
    const activeCalendar = game.settings?.get('seasons-and-stars', 'activeCalendar') as string;
    Logger.debug('Settings check:', { activeCalendarFile, activeCalendar });

    // Prioritize file-based calendars - if there's a file path, use it regardless of activeCalendar setting
    if (activeCalendarFile && activeCalendarFile.trim() !== '') {
      // Ensure activeCalendar is cleared if it's set (defensive cleanup)
      const clearResult = await clearConflictingCalendarSetting();
      if (!clearResult.success && clearResult.error) {
        Logger.error(`Failed to clear conflicting setting during init: ${clearResult.error}`);
      }
      Logger.debug('Loading calendar from file:', activeCalendarFile);

      // Convert Foundry server path to proper URL for fetching
      const fileUrl = this.convertFoundryPathToUrl(activeCalendarFile);
      Logger.debug('Converted path to URL:', fileUrl);

      // Use existing loadCalendarFromUrl method to load from URL
      const result = await this.loadCalendarFromUrl(fileUrl, { validate: true });

      if (result.success && result.calendar) {
        // Create source info for the file-based calendar
        const fileSourceInfo: CalendarSourceInfo = {
          type: 'external',
          sourceName: 'Custom File',
          description: `Calendar loaded from ${activeCalendarFile}`,
          icon: 'fa-solid fa-file',
          url: fileUrl,
        };

        // Add the calendar to the manager's calendar map
        const loadSuccess = this.loadCalendar(result.calendar, fileSourceInfo);

        if (loadSuccess) {
          // Set it as active using the proper method, but don't save to activeCalendar setting
          await this.setActiveCalendar(result.calendar.id, false);

          // Save the calendar data for other clients to load synchronously
          const saveResult = await saveCalendarDataForSync(result.calendar);
          if (!saveResult.success && saveResult.error) {
            Logger.error(`Failed to save calendar data during init: ${saveResult.error}`);
          }

          Logger.info('Successfully loaded and activated calendar from file:', activeCalendarFile);
          return;
        } else {
          Logger.error(
            'Failed to load calendar into manager during initialization:',
            new Error(`Validation failed for ${activeCalendarFile}`)
          );
          // Continue with regular calendar loading as fallback
        }
      } else {
        Logger.warn('Failed to load calendar from file:', result.error);
        ui.notifications?.warn(
          game.i18n.format('SEASONS_STARS.warnings.calendar_file_failed', {
            path: activeCalendarFile,
            error: result.error || 'Unknown error',
          })
        );
        // Continue with regular calendar loading as fallback
      }
    }

    // Load active calendar from settings
    const savedCalendarId = game.settings?.get('seasons-and-stars', 'activeCalendar') as string;
    const cachedCalendarData = game.settings?.get(
      'seasons-and-stars',
      'activeCalendarData'
    ) as SeasonsStarsCalendar | null;

    // Try to load from cached calendar data first (synchronous)
    if (savedCalendarId && cachedCalendarData && cachedCalendarData.id === savedCalendarId) {
      Logger.debug('Loading calendar synchronously from cached data:', savedCalendarId);

      // Load the calendar into the manager if not already present
      if (!this.calendars.has(savedCalendarId)) {
        const sourceInfo: CalendarSourceInfo = {
          type: 'builtin',
          sourceName: 'Seasons & Stars',
          description: 'Built-in calendar from cached data',
          icon: 'fa-solid fa-calendar',
        };
        this.loadCalendar(cachedCalendarData, sourceInfo);
      }

      // Set active calendar synchronously (no settings save needed)
      this.setActiveCalendarSync(savedCalendarId);
    } else if (savedCalendarId && this.calendars.has(savedCalendarId)) {
      // Fall back to async loading if calendar is already loaded but not cached
      // Don't save to settings during initialization to avoid triggering onChange handlers
      await this.setActiveCalendar(savedCalendarId, false);
    } else {
      // Default to first available calendar
      const firstCalendarId = this.calendars.keys().next().value;
      if (firstCalendarId) {
        // Don't save to settings during initialization to avoid triggering onChange handlers
        await this.setActiveCalendar(firstCalendarId, false);
      }
    }

    Logger.debug(`Loaded ${this.calendars.size} calendars`);
  }

  /**
   * Get list of built-in calendar IDs from index.json
   */
  private async getBuiltInCalendarList(): Promise<string[]> {
    try {
      const results = await this.loadCalendarCollection('module:seasons-and-stars', {
        validate: false,
      });
      const successfulResults = results.filter(r => r.success);
      return successfulResults.map(r => r.calendar?.id).filter(Boolean) as string[];
    } catch (error) {
      Logger.error(
        'Failed to load built-in calendar list:',
        error instanceof Error ? error : new Error(String(error))
      );
      // Fallback to known calendars
      return ['gregorian'];
    }
  }

  /**
   * Load built-in calendar definitions synchronously for immediate API availability
   * Uses Gregorian defaults as fallback to ensure API works immediately
   */
  loadBuiltInCalendarsSync(): void {
    Logger.debug('Loading calendars synchronously - ensuring immediate API availability');

    // For immediate API availability, we need at least one working calendar
    // Since we can't import synchronously in browser, let's skip the sync approach
    // and just ensure the async loading happens immediately

    // Start async loading but don't block on it
    this.loadBuiltInCalendars().catch(error => {
      Logger.error(
        'Failed to load calendars asynchronously:',
        error instanceof Error ? error : new Error(String(error))
      );
    });

    Logger.debug('Calendar loading initiated asynchronously');
  }

  /**
   * Load built-in calendar definitions
   */
  async loadBuiltInCalendars(): Promise<void> {
    const builtInCalendars = await this.getBuiltInCalendarList();

    // First, load all base calendars (excluding external variant files)
    for (const calendarId of builtInCalendars) {
      // Skip external variant files - they'll be loaded separately
      if (calendarId.includes('-variants')) {
        continue;
      }

      try {
        // Load from module's calendars directory using CalendarLoader
        const result = await this.calendarLoader.loadFromUrl(
          `module:seasons-and-stars/calendars/${calendarId}.json`,
          {
            validate: true, // Keep validation for built-in calendars
          }
        );

        if (result.success && result.calendar) {
          // Tag built-in calendars with source info
          const builtinSourceInfo: CalendarSourceInfo = {
            type: 'builtin',
            sourceName: 'Seasons & Stars',
            description: 'Calendar included with Seasons & Stars',
            icon: 'fa-solid fa-calendar',
            url: `module:seasons-and-stars/calendars/${calendarId}.json`,
          };
          this.loadCalendar(result.calendar, builtinSourceInfo);
        } else {
          Logger.warn(`Could not load built-in calendar: ${calendarId}`, result.error);
        }
      } catch (error) {
        Logger.error(`Error loading calendar ${calendarId}`, error as Error);
      }
    }

    // Then, load external variant files
    await this.loadExternalVariantFiles();

    // Auto-detect and load calendar pack modules
    await this.autoLoadCalendarPacks();
  }

  /**
   * Load a calendar from data
   */
  loadCalendar(calendarData: SeasonsStarsCalendar, sourceInfo?: CalendarSourceInfo): boolean {
    // Check for duplicate calendar ID and skip if already loaded
    if (this.calendars.has(calendarData.id)) {
      Logger.debug(`Calendar ${calendarData.id} already loaded, skipping duplicate`);
      return true; // Return true since the calendar exists and is usable
    }

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

    // Set source information if provided
    if (sourceInfo) {
      calendarData.sourceInfo = sourceInfo;
    }

    // Store the base calendar
    this.calendars.set(calendarData.id, calendarData);

    // Create engine for base calendar with error handling
    let engine: CalendarEngine;
    try {
      engine = new CalendarEngine(calendarData);
      this.engines.set(calendarData.id, engine);
    } catch (error) {
      // Remove calendar entry if engine creation fails
      this.calendars.delete(calendarData.id);
      Logger.error(
        `Failed to create calendar engine for ${calendarData.id}:`,
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }

    // Create events manager for this calendar
    try {
      const eventsManager = new EventsManager(calendarData, engine);
      this.eventsManagers.set(calendarData.id, eventsManager);

      // Load world event settings if available
      if (game.settings) {
        const worldEvents = game.settings.get('seasons-and-stars', 'worldEvents');
        if (worldEvents) {
          eventsManager.setWorldEventSettings(worldEvents);
        }
      }
    } catch (error) {
      Logger.warn(
        `Failed to create events manager for ${calendarData.id}:`,
        error instanceof Error ? error : new Error(String(error))
      );
      // Don't fail calendar loading if events manager fails
    }

    // Expand variants if they exist
    if (calendarData.variants) {
      this.expandCalendarVariants(calendarData);
    }

    const label = CalendarLocalization.getCalendarLabel(calendarData);
    Logger.debug(`Loaded calendar: ${label} (${calendarData.id})`);
    return true;
  }

  /**
   * Set the active calendar synchronously (calendars must already be loaded)
   */
  setActiveCalendarSync(calendarId: string): boolean {
    Logger.debug(`Setting active calendar synchronously: ${calendarId}`);

    // Resolve default variant if setting base calendar with variants
    const resolvedCalendarId = this.resolveDefaultVariant(calendarId);

    // Check if calendar exists (should be loaded already from init hook)
    if (!this.calendars.has(resolvedCalendarId)) {
      Logger.error(`Calendar not found: ${resolvedCalendarId}`);
      return false;
    }

    // Get the engine for this calendar
    const engine = this.engines.get(resolvedCalendarId);
    if (!engine) {
      Logger.error(`Engine not found for calendar: ${resolvedCalendarId}`);
      return false;
    }

    // Store old calendar ID for hook
    const oldCalendarId = this.activeCalendarId;

    // Update or create time converter
    if (this.timeConverter) {
      this.timeConverter.updateEngine(engine);
    } else {
      this.timeConverter = new TimeConverter(engine);
    }

    // Update active calendar
    this.activeCalendarId = resolvedCalendarId;

    // Note: Synchronous method doesn't save to settings since world settings
    // can't be saved during init hook - only the async version saves settings

    // Get calendar data for hook
    const calendarData = this.calendars.get(resolvedCalendarId);

    // Fire calendar changed event
    Hooks.callAll('seasons-stars:calendarChanged', {
      oldCalendarId,
      newCalendarId: resolvedCalendarId,
      calendar: calendarData,
    });

    Logger.debug(`Active calendar set synchronously: ${resolvedCalendarId}`);
    return true;
  }

  /**
   * Set the active calendar
   * @param calendarId The calendar ID to set as active
   * @param saveToSettings Whether to save the calendar ID to settings (default: true)
   */
  async setActiveCalendar(calendarId: string, saveToSettings: boolean = true): Promise<boolean> {
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

    // Save to settings only if requested (skip for file-based calendars to avoid mutual exclusion)
    // Only GMs can save world settings
    if (saveToSettings && game.settings && game.user?.isGM) {
      await game.settings.set('seasons-and-stars', 'activeCalendar', resolvedCalendarId);

      // Also store the full calendar JSON for synchronous loading
      const calendarData = this.calendars.get(resolvedCalendarId);
      if (calendarData) {
        const saveResult = await saveCalendarDataForSync(calendarData);
        if (!saveResult.success && saveResult.error) {
          Logger.error(
            `Failed to cache calendar data for ${resolvedCalendarId}: ${saveResult.error}`
          );
        }
      }
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
   * Get the active events manager
   */
  getActiveEventsManager(): EventsManager | null {
    if (!this.activeCalendarId) return null;
    return this.eventsManagers.get(this.activeCalendarId) || null;
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
   * Advance time by seconds using active calendar
   */
  async advanceSeconds(seconds: number): Promise<void> {
    if (!this.timeConverter) {
      throw new Error('No active calendar set');
    }

    await this.timeConverter.advanceSeconds(seconds);
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

    // Apply config-based modifications (e.g., yearOffset)
    if (variant.config?.yearOffset !== undefined) {
      const offsetDifference = variant.config.yearOffset - baseCalendar.year.epoch;
      variantCalendar.year.epoch = variant.config.yearOffset;
      variantCalendar.year.currentYear = baseCalendar.year.currentYear + offsetDifference;

      // Also update worldTime if present
      if (variantCalendar.worldTime && baseCalendar.worldTime) {
        variantCalendar.worldTime.epochYear = variant.config.yearOffset;
        variantCalendar.worldTime.currentYear =
          baseCalendar.worldTime.currentYear + offsetDifference;
      }
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

      // Apply canonical hours overrides
      if (variant.overrides.canonicalHours !== undefined) {
        variantCalendar.canonicalHours = variant.overrides.canonicalHours;
      }
    }

    return variantCalendar;
  }

  /**
   * Load external variant files that reference existing calendars
   */
  private async loadExternalVariantFiles(): Promise<void> {
    const builtInCalendars = await this.getBuiltInCalendarList();

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
      // Load external variant file using CalendarLoader
      const result = await this.calendarLoader.loadFromUrl(
        `module:seasons-and-stars/calendars/${variantFileId}.json`,
        {
          validate: false, // External variant files have different structure than calendars
        }
      );

      if (!result.success || !result.calendar) {
        Logger.debug(`External variant file not found: ${variantFileId}`, result.error);
        return;
      }

      // Cast to variant file data since we disabled validation
      const variantFileData = result.calendar as unknown as {
        baseCalendar: string;
        variants: Record<string, CalendarVariant>;
      };

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

  // External Calendar Loading Methods

  /**
   * Load a calendar from an external URL
   */
  async loadCalendarFromUrl(
    url: string,
    options?: { validate?: boolean; cache?: boolean }
  ): Promise<LoadResult> {
    Logger.info(`Loading calendar from URL: ${url}`);

    const result = await this.calendarLoader.loadFromUrl(url, {
      validate: options?.validate !== false,
    });

    if (result.success && result.calendar) {
      // Determine source information based on URL
      const sourceInfo = this.determineSourceInfo(url, result);

      // Load the calendar into the manager with source info
      const loadSuccess = this.loadCalendar(result.calendar, sourceInfo);
      if (!loadSuccess) {
        return {
          ...result,
          success: false,
          error: 'Calendar loaded from URL but failed validation in CalendarManager',
        };
      }

      // Update source status if this was from a registered source
      const sources = this.calendarLoader.getSources();
      const matchingSource = sources.find(s => s.url === url);
      if (matchingSource) {
        this.calendarLoader.updateSourceStatus(matchingSource.id, true);
      }

      Logger.info(`Successfully loaded external calendar: ${result.calendar.id}`);
    } else if (result.error) {
      // Update source status if this was from a registered source
      const sources = this.calendarLoader.getSources();
      const matchingSource = sources.find(s => s.url === url);
      if (matchingSource) {
        this.calendarLoader.updateSourceStatus(matchingSource.id, false, result.error);
      }

      Logger.error(`Failed to load calendar from URL: ${result.error}`);
    }

    return result;
  }

  /**
   * Load multiple calendars from a collection URL
   */
  async loadCalendarCollection(
    url: string,
    options?: { validate?: boolean; cache?: boolean }
  ): Promise<LoadResult[]> {
    Logger.info(`Loading calendar collection from URL: ${url}`);

    const results = await this.calendarLoader.loadCollection(url, {
      validate: options?.validate !== false,
    });

    let successCount = 0;
    let errorCount = 0;

    // Two-pass loading: first regular calendars, then variants

    // Pass 1: Load regular calendars
    for (const result of results) {
      if (result.success && result.calendar) {
        const isVariantFile = result.calendar.id && result.calendar.id.includes('-variants');
        if (isVariantFile) {
          // Skip variants in first pass
          continue;
        }

        // Determine source information based on URL
        const sourceInfo = this.determineSourceInfo(url, result);

        const loadSuccess = this.loadCalendar(result.calendar, sourceInfo);
        if (loadSuccess) {
          successCount++;
        } else {
          result.success = false;
          result.error = 'Calendar loaded from collection but failed validation in CalendarManager';
          errorCount++;
        }
      } else {
        errorCount++;
      }
    }

    // Pass 2: Process variant files as external variants
    for (const result of results) {
      if (result.success && result.calendar) {
        const isVariantFile = result.calendar.id && result.calendar.id.includes('-variants');
        if (isVariantFile) {
          // Process as external variant
          try {
            const variantFileData = result.calendar as unknown as {
              baseCalendar: string;
              variants: Record<string, CalendarVariant>;
            };

            if (this.validateExternalVariantFile(variantFileData)) {
              const baseCalendar = this.calendars.get(variantFileData.baseCalendar);
              if (baseCalendar) {
                this.applyExternalVariants(baseCalendar, variantFileData);
                successCount++;
              } else {
                result.success = false;
                result.error = `Base calendar '${variantFileData.baseCalendar}' not found for variant file`;
                errorCount++;
              }
            } else {
              result.success = false;
              result.error = 'Invalid external variant file structure';
              errorCount++;
            }
          } catch (error) {
            result.success = false;
            result.error = `Error processing variant file: ${(error as Error).message}`;
            errorCount++;
          }
        }
      }
    }

    Logger.info(`Collection load completed: ${successCount} successful, ${errorCount} failed`);
    return results;
  }

  /**
   * Determine source information based on URL and load result
   */
  private determineSourceInfo(url: string, _result: LoadResult): CalendarSourceInfo {
    // Check if this is a module URL
    if (url.startsWith('module:')) {
      const moduleMatch = url.match(/^module:([a-z0-9-]+)/);
      if (moduleMatch) {
        const moduleId = moduleMatch[1];
        const module = game.modules.get(moduleId);

        if (module) {
          return {
            type: 'module',
            sourceName: module.title,
            description: `Calendar provided by the ${module.title} module`,
            icon: 'fa-solid fa-puzzle-piece',
            moduleId,
            url,
          };
        }
      }
    }

    // Check if this came from an external source (tracked by CalendarLoader)
    const externalSources = this.calendarLoader.getSources();
    for (const source of externalSources) {
      if (source.url === url) {
        return {
          type: 'external',
          sourceName: source.name,
          description: `Calendar loaded from external source: ${source.name}`,
          icon: 'fa-solid fa-cloud',
          externalSourceId: source.id,
          url: source.url,
        };
      }
    }

    // Default fallback (shouldn't happen for collections, but safety)
    return {
      type: 'builtin',
      sourceName: 'Unknown Source',
      description: 'Calendar source could not be determined',
      icon: 'fa-solid fa-question-circle',
      url,
    };
  }

  /**
   * Auto-detect and load calendar pack modules
   * Scans for enabled modules starting with 'seasons-and-stars-' and loads their calendars
   */
  async autoLoadCalendarPacks(): Promise<void> {
    Logger.debug('Auto-detecting calendar pack modules');

    // Find all enabled modules that start with 'seasons-and-stars-' (excluding core module)
    const calendarPackModules = Array.from(game.modules.values()).filter(
      module => module.id.startsWith('seasons-and-stars-') && module.active
    );

    if (calendarPackModules.length === 0) {
      Logger.debug('No calendar pack modules found');
      return;
    }

    Logger.info(
      `Found ${calendarPackModules.length} calendar pack modules: ${calendarPackModules.map(m => m.id).join(', ')}`
    );

    for (const module of calendarPackModules) {
      await this.loadModuleCalendars(module.id);
    }
  }

  /**
   * Load calendars from a specific module
   * @param moduleId - The module ID to load calendars from
   */
  async loadModuleCalendars(moduleId: string): Promise<LoadResult[]> {
    Logger.debug(`Loading calendars from module: ${moduleId}`);

    // Check if module is enabled
    const module = game.modules.get(moduleId);
    if (!module?.active) {
      Logger.warn(`Module not found or not enabled: ${moduleId}`);
      return [];
    }

    // Check if module explicitly states it doesn't provide calendars
    const providesCalendars = module.flags?.['seasons-and-stars']?.['providesCalendars'];
    if (providesCalendars === false) {
      Logger.debug(`Module ${moduleId} explicitly does not provide calendars, skipping`);
      return [];
    }

    // Use module URL protocol for proper CalendarLoader handling
    const indexUrl = `module:${moduleId}`;

    try {
      // Try to load the calendar collection from the module
      const results = await this.loadCalendarCollection(indexUrl, {
        validate: true,
      });

      const successfulResults = results.filter(r => r.success);
      const failedResults = results.filter(r => !r.success);

      if (successfulResults.length > 0) {
        Logger.info(
          `Successfully loaded ${successfulResults.length} calendars from module ${moduleId}`
        );
      }

      if (failedResults.length > 0) {
        Logger.warn(`Failed to load ${failedResults.length} calendars from module ${moduleId}`);
        failedResults.forEach(result => {
          if (result.error) {
            Logger.debug(`  - ${result.collectionEntry?.name || 'Unknown'}: ${result.error}`);
          }
        });
      }

      return results;
    } catch (error) {
      Logger.warn(`Failed to load calendar collection from module ${moduleId}:`, error);
      return [];
    }
  }

  /**
   * Add an external calendar source
   */
  addExternalSource(source: Omit<ExternalCalendarSource, 'id'>): string {
    const sourceId = this.calendarLoader.addSource(source);
    Logger.info(`Added external calendar source: ${source.name} (${sourceId})`);
    return sourceId;
  }

  /**
   * Remove an external calendar source and its calendars
   */
  removeExternalSource(sourceId: string): boolean {
    const source = this.calendarLoader.getSource(sourceId);
    if (!source) {
      Logger.warn(`External source not found: ${sourceId}`);
      return false;
    }

    const success = this.calendarLoader.removeSource(sourceId);
    if (success) {
      Logger.info(`Removed external calendar source: ${source.name}`);
    }

    return success;
  }

  /**
   * Get all external calendar sources
   */
  getExternalSources(): ExternalCalendarSource[] {
    return this.calendarLoader.getSources();
  }

  /**
   * Get an external calendar source by ID
   */
  getExternalSource(sourceId: string): ExternalCalendarSource | undefined {
    return this.calendarLoader.getSource(sourceId);
  }

  /**
   * Refresh a calendar from an external source
   */
  async refreshExternalCalendar(sourceId: string): Promise<LoadResult> {
    const source = this.calendarLoader.getSource(sourceId);
    if (!source) {
      return {
        success: false,
        error: `External source not found: ${sourceId}`,
      };
    }

    if (!source.enabled) {
      return {
        success: false,
        error: `External source is disabled: ${source.name}`,
      };
    }

    // Clear cache for this URL to force fresh load

    // Load based on source type
    if (source.type === 'collection') {
      const results = await this.loadCalendarCollection(source.url);
      // Return summary result for collection
      const successCount = results.filter(r => r.success).length;

      return {
        success: successCount > 0,
        error: successCount === 0 ? 'All calendars in collection failed to load' : undefined,
        sourceUrl: source.url,
      };
    } else {
      return await this.loadCalendarFromUrl(source.url);
    }
  }

  /**
   * Refresh all enabled external sources
   */
  async refreshAllExternalCalendars(): Promise<{ [sourceId: string]: LoadResult }> {
    const sources = this.calendarLoader.getSources().filter(s => s.enabled);
    const results: { [sourceId: string]: LoadResult } = {};

    Logger.info(`Refreshing ${sources.length} external calendar sources`);

    for (const source of sources) {
      try {
        results[source.id] = await this.refreshExternalCalendar(source.id);
      } catch (error) {
        results[source.id] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          sourceUrl: source.url,
        };
      }
    }

    const successCount = Object.values(results).filter(r => r.success).length;
    Logger.info(
      `External calendar refresh completed: ${successCount}/${sources.length} successful`
    );

    return results;
  }

  /**
   * Clear external calendar cache
   */
  clearExternalCalendarCache(): void {
    Logger.info('Cache system removed - no operation needed');
  }

  /**
   * Get the CalendarLoader instance for advanced operations
   */
  getCalendarLoader(): CalendarLoader {
    return this.calendarLoader;
  }

  /**
   * Fire hook to allow external modules to register calendars
   */
  private fireExternalCalendarRegistrationHook(): void {
    Logger.debug('Firing external calendar registration hook');

    // Create registration callback that modules can use to add calendars
    const registerCalendar = (
      calendarData: SeasonsStarsCalendar,
      sourceInfo?: CalendarSourceInfo
    ): boolean => {
      // Validate that we have valid calendar data
      if (!calendarData || !calendarData.id) {
        Logger.error('Invalid calendar data provided to registration hook');
        return false;
      }

      // Use existing loadCalendar method for validation and registration
      const success = this.loadCalendar(calendarData, sourceInfo);

      if (success) {
        Logger.info(`External calendar registered: ${calendarData.id}`);
      } else {
        Logger.warn(`Failed to register external calendar: ${calendarData.id}`);
      }

      return success;
    };

    // Fire the hook with registration callback
    Hooks.callAll('seasons-stars:registerExternalCalendars', {
      registerCalendar,
      manager: this,
    });
  }

  /**
   * Convert a Foundry server path to a proper URL for fetching
   */
  public convertFoundryPathToUrl(foundryPath: string): string {
    // If it's already a proper URL, return as-is
    if (
      foundryPath.startsWith('http://') ||
      foundryPath.startsWith('https://') ||
      foundryPath.startsWith('module:')
    ) {
      return foundryPath;
    }

    // Remove file:// protocol if present
    if (foundryPath.startsWith('file://')) {
      foundryPath = foundryPath.substring(7);
    }

    // For Foundry server paths, we need to construct a proper URL
    // The path should be relative to the Foundry installation
    const baseUrl = window.location.origin;
    const cleanPath = foundryPath.startsWith('/') ? foundryPath : `/${foundryPath}`;

    return `${baseUrl}${cleanPath}`;
  }
}
