/// <reference path="../../core/src/types/foundry-v13-essentials.d.ts" />

/**
 * Seasons & Stars - D&D 5th Edition Integration Pack
 *
 * Provides integration with the dnd5e system calendar API (v4.0+).
 * Requires the main Seasons & Stars module to be installed and active.
 */

/**
 * Type definitions for D&D 5e calendar API
 */
interface DnD5eCalendarConfig {
  value: string;
  label: string;
  config: Record<string, unknown>;
  class?: new (config: Record<string, unknown>) => unknown;
}

interface DnD5eFormatterConfig {
  value: string;
  label: string;
  formatter: ((time: number) => string) | string;
  group?: string;
}

interface DnD5eCalendarConfiguration {
  application: (new (...args: unknown[]) => unknown) | null;
  calendars: DnD5eCalendarConfig[];
  formatters: DnD5eFormatterConfig[];
}

interface SeasonsStarsCalendar {
  id: string;
  translations?: {
    en?: {
      label?: string;
      description?: string;
    };
  };
  months: Array<{ name: string; days: number }>;
  weekdays: Array<{ name: string }>;
  time?: {
    sunrise?: { hour: number; minute?: number };
    sunset?: { hour: number; minute?: number };
    hoursInDay?: number;
    minutesInHour?: number;
    secondsInMinute?: number;
  };
}

interface CalendarDateData {
  year: number;
  month: number;
  day: number;
  weekday: number;
  time?: {
    hour: number;
    minute: number;
    second: number;
  };
}

/**
 * Custom CalendarData5e class for Seasons & Stars calendars
 * Extends the base dnd5e calendar data model to provide sunrise/sunset times
 */
export class SeasonsStarsCalendarData5e {
  config: Record<string, unknown>;
  private sunriseSeconds: number;
  private sunsetSeconds: number;
  private secondsInMinute: number;
  private minutesInHour: number;

  constructor(config: Record<string, unknown>) {
    this.config = config;

    // Extract sunrise/sunset from config
    const sunrise = config.sunrise as { hour: number; minute?: number } | undefined;
    const sunset = config.sunset as { hour: number; minute?: number } | undefined;

    // Extract time constants from config (calendar-dependent)
    const timeConfig = config.timeConfig as { secondsInMinute?: number; minutesInHour?: number } | undefined;
    this.secondsInMinute = timeConfig?.secondsInMinute ?? 60;
    this.minutesInHour = timeConfig?.minutesInHour ?? 60;

    // Default to 6:00 AM / 6:00 PM if not specified
    const sunriseHour = sunrise?.hour ?? 6;
    const sunriseMinute = sunrise?.minute ?? 0;
    const sunsetHour = sunset?.hour ?? 18;
    const sunsetMinute = sunset?.minute ?? 0;

    // Convert to seconds since midnight using calendar-specific constants
    const secondsInHour = this.minutesInHour * this.secondsInMinute;
    this.sunriseSeconds = sunriseHour * secondsInHour + sunriseMinute * this.secondsInMinute;
    this.sunsetSeconds = sunsetHour * secondsInHour + sunsetMinute * this.secondsInMinute;
  }

  /**
   * Get sunrise time for a given timestamp
   * @param _time - World time in seconds or TimeComponents object (currently unused, for API compatibility)
   * @returns Sunrise time in seconds since midnight
   */
  sunrise(_time: number | { hour: number; minute: number; second: number }): number {
    return this.sunriseSeconds;
  }

  /**
   * Get sunset time for a given timestamp
   * @param _time - World time in seconds or TimeComponents object (currently unused, for API compatibility)
   * @returns Sunset time in seconds since midnight
   */
  sunset(_time: number | { hour: number; minute: number; second: number }): number {
    return this.sunsetSeconds;
  }
}

/**
 * D&D 5e Integration Manager
 *
 * Handles integration between Seasons & Stars and the dnd5e system calendar API.
 */
export class DnD5eIntegration {
  private static instance: DnD5eIntegration | null = null;
  private isActive: boolean = false;
  private registeredCalendars: Set<string> = new Set();
  private registeredFormatters: Set<string> = new Set();

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Initialize D&D 5e integration (called when dnd5e system is detected)
   */
  static initialize(): DnD5eIntegration {
    if (DnD5eIntegration.instance) {
      return DnD5eIntegration.instance;
    }

    DnD5eIntegration.instance = new DnD5eIntegration();
    DnD5eIntegration.instance.activate();
    return DnD5eIntegration.instance;
  }

  /**
   * Get the active D&D 5e integration instance
   */
  static getInstance(): DnD5eIntegration | null {
    return DnD5eIntegration.instance;
  }

  /**
   * Activate D&D 5e integration
   */
  private activate(): void {
    if (this.isActive) return;

    console.log(
      'Seasons & Stars D&D 5e Pack: D&D 5e system detected - enabling calendar integration'
    );

    this.isActive = true;
    this.registerDefaultFormatters();
    this.setupHookListeners();
  }

  /**
   * Set up listeners for Seasons & Stars hooks
   */
  private setupHookListeners(): void {
    // Listen for calendar changes from Seasons & Stars
    Hooks.on('seasons-stars:calendarChanged', (hookData: { calendarId: string; calendar: SeasonsStarsCalendar }) => {
      this.handleCalendarChanged(hookData);
    });

    // Listen for date changes from Seasons & Stars
    Hooks.on('seasons-stars:dateChanged', (hookData: { date: CalendarDateData; worldTime: number }) => {
      this.handleDateChanged(hookData);
    });

    // Listen for Seasons & Stars ready
    Hooks.on('seasons-stars:ready', (hookData: { manager: unknown; api: unknown }) => {
      this.handleSeasonsStarsReady(hookData);
    });
  }

  /**
   * Handle calendar change events from Seasons & Stars
   */
  private handleCalendarChanged(hookData: { calendarId: string; calendar: SeasonsStarsCalendar }): void {
    if (!hookData?.calendar?.id) {
      console.warn('Seasons & Stars D&D 5e Pack: Invalid calendar data in hook', hookData);
      return;
    }

    // Register the new calendar with dnd5e
    this.registerCalendar(hookData.calendar);

    console.log(
      `Seasons & Stars D&D 5e Pack: Calendar changed to ${hookData.calendarId}`
    );
  }

  /**
   * Handle date change events from Seasons & Stars
   */
  private handleDateChanged(_hookData: { date: CalendarDateData; worldTime: number }): void {
    // Date changes are automatically handled by dnd5e's updateWorldTime hook
    // No additional action needed here, but hook is available for future use
  }

  /**
   * Handle Seasons & Stars ready event
   */
  private handleSeasonsStarsReady(_hookData: { manager: unknown; api: unknown }): void {
    // Register current calendar when S&S is ready
    const calendar = this.getActiveCalendar();
    if (calendar) {
      this.registerCalendar(calendar);
    }

    console.log('Seasons & Stars D&D 5e Pack: Seasons & Stars ready, calendar integration active');
  }

  /**
   * Register a Seasons & Stars calendar with the dnd5e calendar API
   */
  registerCalendar(calendar: SeasonsStarsCalendar): void {
    if (!calendar?.id) return;

    const calendarConfig = this.getDnD5eCalendarConfig();
    if (!calendarConfig) {
      console.warn('Seasons & Stars D&D 5e Pack: D&D 5e calendar config not available');
      return;
    }

    const calendarValue = `seasons-stars:${calendar.id}`;
    const calendarLabel = calendar.translations?.en?.label || calendar.id;

    // Remove existing registration if present
    if (this.registeredCalendars.has(calendarValue)) {
      calendarConfig.calendars = calendarConfig.calendars.filter(
        (c: DnD5eCalendarConfig) => c.value !== calendarValue
      );
    }

    // Create custom CalendarData5e class for this calendar
    const calendarClassConfig = {
      sunrise: calendar.time?.sunrise,
      sunset: calendar.time?.sunset,
      timeConfig: {
        secondsInMinute: calendar.time?.secondsInMinute,
        minutesInHour: calendar.time?.minutesInHour,
      },
      calendarId: calendar.id,
    };

    // Create a new class that extends SeasonsStarsCalendarData5e with this specific config
    const CalendarClass = class extends SeasonsStarsCalendarData5e {
      constructor(config: Record<string, unknown>) {
        super({ ...calendarClassConfig, ...config });
      }
    };

    // Register the calendar
    const dnd5eCalendar: DnD5eCalendarConfig = {
      value: calendarValue,
      label: calendarLabel,
      config: calendarClassConfig,
      class: CalendarClass,
    };

    calendarConfig.calendars.push(dnd5eCalendar);
    this.registeredCalendars.add(calendarValue);

    console.log(
      `Seasons & Stars D&D 5e Pack: Registered calendar "${calendarLabel}" with dnd5e`
    );
  }

  /**
   * Register default formatters with dnd5e
   */
  private registerDefaultFormatters(): void {
    const calendarConfig = this.getDnD5eCalendarConfig();
    if (!calendarConfig) return;

    // Date formatter
    const dateFormatter: DnD5eFormatterConfig = {
      value: 'seasons-stars:date',
      label: 'Seasons & Stars (Date)',
      formatter: (time: number) => this.formatDate(time),
      group: 'SEASONS_STARS.FormatterGroup',
    };

    // Time formatter
    const timeFormatter: DnD5eFormatterConfig = {
      value: 'seasons-stars:time',
      label: 'Seasons & Stars (Time)',
      formatter: (time: number) => this.formatTime(time),
      group: 'SEASONS_STARS.FormatterGroup',
    };

    // Full date/time formatter
    const fullFormatter: DnD5eFormatterConfig = {
      value: 'seasons-stars:full',
      label: 'Seasons & Stars (Full)',
      formatter: (time: number) => this.formatFull(time),
      group: 'SEASONS_STARS.FormatterGroup',
    };

    calendarConfig.formatters.push(dateFormatter, timeFormatter, fullFormatter);
    this.registeredFormatters.add('seasons-stars:date');
    this.registeredFormatters.add('seasons-stars:time');
    this.registeredFormatters.add('seasons-stars:full');
  }

  /**
   * Format date using Seasons & Stars
   */
  private formatDate(_time: number): string {
    try {
      const date = this.getCurrentDate();
      if (!date) return 'Unknown Date';

      const calendar = this.getActiveCalendar();
      const monthName = calendar?.months[date.month - 1]?.name || `Month ${date.month}`;

      return `${date.day} ${monthName}, ${date.year}`;
    } catch (error) {
      console.warn('Seasons & Stars D&D 5e Pack: Error formatting date', error);
      return 'Unknown Date';
    }
  }

  /**
   * Format time using Seasons & Stars
   */
  private formatTime(_time: number): string {
    try {
      const date = this.getCurrentDate();
      if (!date?.time) return 'Unknown Time';

      const hour = date.time.hour.toString().padStart(2, '0');
      const minute = date.time.minute.toString().padStart(2, '0');

      return `${hour}:${minute}`;
    } catch (error) {
      console.warn('Seasons & Stars D&D 5e Pack: Error formatting time', error);
      return 'Unknown Time';
    }
  }

  /**
   * Format full date and time using Seasons & Stars
   */
  private formatFull(time: number): string {
    return `${this.formatDate(time)} ${this.formatTime(time)}`;
  }

  /**
   * Get the D&D 5e calendar configuration
   */
  private getDnD5eCalendarConfig(): DnD5eCalendarConfiguration | null {
    return (
      (globalThis as { CONFIG?: { DND5E?: { calendar?: DnD5eCalendarConfiguration } } }).CONFIG?.DND5E?.calendar || null
    );
  }

  /**
   * Disable the dnd5e system calendar
   * This allows Seasons & Stars to take full control of calendar display
   */
  disableSystemCalendar(): void {
    const calendarConfig = this.getDnD5eCalendarConfig();
    if (!calendarConfig) return;

    calendarConfig.application = null;
    calendarConfig.calendars = [];

    console.log('Seasons & Stars D&D 5e Pack: D&D 5e system calendar disabled');
  }

  /**
   * Get the current date from Seasons & Stars API
   */
  getCurrentDate(): CalendarDateData | null {
    try {
      const seasonsStars = (game as { seasonsStars?: { api?: { getCurrentDate?: () => CalendarDateData } } })
        .seasonsStars;
      return seasonsStars?.api?.getCurrentDate?.() || null;
    } catch {
      return null;
    }
  }

  /**
   * Get the active calendar from Seasons & Stars
   */
  getActiveCalendar(): SeasonsStarsCalendar | null {
    try {
      const seasonsStars = (
        game as { seasonsStars?: { manager?: { getActiveCalendar?: () => SeasonsStarsCalendar } } }
      ).seasonsStars;
      return seasonsStars?.manager?.getActiveCalendar?.() || null;
    } catch {
      return null;
    }
  }

  /**
   * Check if D&D 5e integration is active
   */
  isIntegrationActive(): boolean {
    return this.isActive;
  }

  /**
   * Cleanup integration when module is disabled
   */
  destroy(): void {
    // Remove registered calendars
    const calendarConfig = this.getDnD5eCalendarConfig();
    if (calendarConfig) {
      calendarConfig.calendars = calendarConfig.calendars.filter(
        (c: DnD5eCalendarConfig) => !this.registeredCalendars.has(c.value)
      );
      calendarConfig.formatters = calendarConfig.formatters.filter(
        (f: DnD5eFormatterConfig) => !this.registeredFormatters.has(f.value)
      );
    }

    this.registeredCalendars.clear();
    this.registeredFormatters.clear();
    this.isActive = false;
    DnD5eIntegration.instance = null;

    console.log('Seasons & Stars D&D 5e Pack: Integration destroyed');
  }
}

// Main integration entry point - respond to system detection hook
Hooks.on(
  'seasons-stars:dnd5e:systemDetected',
  (compatibilityManager: {
    registerDataProvider: (system: string, key: string, provider: () => unknown) => void;
  }) => {
    console.log(
      'Seasons & Stars D&D 5e Pack: D&D 5e system detected - registering with compatibility manager'
    );

    // Initialize D&D 5e integration
    const integration = DnD5eIntegration.initialize();

    // Register data provider for calendar information
    compatibilityManager.registerDataProvider('dnd5e', 'calendarIntegration', () => {
      return {
        isActive: integration.isIntegrationActive(),
        currentDate: integration.getCurrentDate(),
        activeCalendar: integration.getActiveCalendar()?.id,
      };
    });
  }
);

// Also initialize during dnd5e.setupCalendar hook for early registration
Hooks.on('dnd5e.setupCalendar', () => {
  const seasonsStarsModule = (typeof game !== 'undefined') ? game.modules?.get('seasons-and-stars') : null;
  if (!seasonsStarsModule?.active) {
    console.warn('Seasons & Stars D&D 5e Pack: Seasons & Stars not loaded during setupCalendar hook');
    return undefined;
  }

  console.log(
    'Seasons & Stars D&D 5e Pack: dnd5e.setupCalendar hook fired - preparing integration'
  );

  // Ensure integration is initialized even if systemDetected hasn't fired yet
  if (!DnD5eIntegration.getInstance()) {
    DnD5eIntegration.initialize();
  }

  return undefined;
});

// Initialize when Foundry is ready
Hooks.once('ready', () => {
  console.log('Seasons & Stars D&D 5e Pack: Module loaded and ready');

  // Validate version requirements
  const seasonsStarsModule = game.modules?.get('seasons-and-stars');
  const seasonsStarsVersion = seasonsStarsModule?.version;
  const dnd5eVersion = game.system?.version;

  if (seasonsStarsModule?.active && seasonsStarsVersion && isVersionLessThan(seasonsStarsVersion, '0.8.0')) {
    const message = 'Seasons & Stars D&D 5e Pack requires Seasons & Stars v0.8.0 or later';
    console.error(message);
    if (typeof ui !== 'undefined' && ui.notifications) {
      ui.notifications.error(message);
    }
    return;
  }

  if (game.system?.id === 'dnd5e' && dnd5eVersion && isVersionLessThan(dnd5eVersion, '4.0.0')) {
    const message = 'Seasons & Stars D&D 5e Pack requires D&D 5e System v4.0.0 or later';
    console.error(message);
    if (typeof ui !== 'undefined' && ui.notifications) {
      ui.notifications.error(message);
    }
    return;
  }

  // If dnd5e system is active but systemDetected hasn't fired, initialize now
  if (game.system?.id === 'dnd5e' && !DnD5eIntegration.getInstance()) {
    DnD5eIntegration.initialize();
  }
});

/**
 * Compare semantic versions (simple implementation)
 * Returns true if version1 < version2
 */
function isVersionLessThan(version1: string, version2: string): boolean {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;

    if (v1Part < v2Part) return true;
    if (v1Part > v2Part) return false;
  }

  return false;
}
