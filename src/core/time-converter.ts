/**
 * Time conversion and Foundry VTT integration for Seasons & Stars
 */

import type {
  CalendarDate as ICalendarDate,
  CalendarDateData,
  SeasonsStarsCalendar,
} from '../types/calendar';
import type { DebugInfo } from '../types/widget-types';
import { CalendarEngine } from './calendar-engine';
import { CalendarDate } from './calendar-date';
import { Logger } from './logger';
import { TIME_CONSTANTS } from './constants';

export class TimeConverter {
  private engine: CalendarEngine;
  private lastKnownTime: number = 0;
  private lastKnownDate: CalendarDate | null = null;
  private pf2eCompatibilityMode: boolean = false;

  constructor(engine: CalendarEngine) {
    this.engine = engine;
    this.detectPF2eCompatibility();
    this.registerFoundryHooks();
  }

  /**
   * Detect if PF2e compatibility mode should be enabled
   */
  private detectPF2eCompatibility(): void {
    const isPF2eSystem = game.system?.id === 'pf2e';
    const hasPF2eModule = game.modules?.get('pf2e')?.active;
    const isGolarionCalendar = this.engine.getCalendar().id === 'golarion-pf2e';

    if ((isPF2eSystem || hasPF2eModule) && isGolarionCalendar) {
      this.pf2eCompatibilityMode = true;
      Logger.info('PF2e compatibility mode enabled for Golarion calendar');
    }
  }

  /**
   * Register hooks to sync with Foundry's time system
   */
  private registerFoundryHooks(): void {
    // Hook into Foundry's world time updates
    Hooks.on('updateWorldTime', this.onWorldTimeUpdate.bind(this));

    // Hook into initial setup
    Hooks.on('ready', this.onFoundryReady.bind(this));
  }

  /**
   * Handle Foundry ready event
   */
  private onFoundryReady(): void {
    // Initialize with current world time
    if (game.time?.worldTime !== undefined) {
      this.lastKnownTime = game.time.worldTime;

      // Check if this is a new world (worldTime = 0) and we're using Gregorian calendar
      if (this.lastKnownTime === 0 && this.engine.getCalendar().id === 'gregorian') {
        // Set to current real-world date for Gregorian calendar
        this.initializeWithRealWorldDate();
      } else {
        const dateResult = this.engine.worldTimeToDate(this.lastKnownTime);
        this.lastKnownDate =
          dateResult instanceof CalendarDate
            ? dateResult
            : new CalendarDate(dateResult, this.engine.getCalendar());
      }
    }
  }

  /**
   * Initialize Gregorian calendar with current real-world date
   */
  private async initializeWithRealWorldDate(): Promise<void> {
    const now = new Date();
    const realWorldDateData: CalendarDateData = {
      year: now.getFullYear(),
      month: now.getMonth() + 1, // JavaScript months are 0-indexed
      day: now.getDate(),
      weekday: 0, // Will be calculated by the engine
      time: {
        hour: now.getHours(),
        minute: now.getMinutes(),
        second: now.getSeconds(),
      },
    };

    const realWorldDate = new CalendarDate(realWorldDateData, this.engine.getCalendar());

    Logger.debug('Initializing Gregorian calendar with current date:', realWorldDate);

    // Only set if user is GM (GMs control world time)
    if (game.user?.isGM) {
      try {
        await this.setCurrentDate(realWorldDate);
      } catch (error) {
        Logger.warn('Could not initialize with real-world date:', error);
        // Fallback to default behavior
        const dateResult = this.engine.worldTimeToDate(this.lastKnownTime);
        this.lastKnownDate =
          dateResult instanceof CalendarDate
            ? dateResult
            : new CalendarDate(dateResult, this.engine.getCalendar());
      }
    } else {
      // For players, just use the default conversion
      const dateResult = this.engine.worldTimeToDate(this.lastKnownTime);
      this.lastKnownDate =
        dateResult instanceof CalendarDate
          ? dateResult
          : new CalendarDate(dateResult, this.engine.getCalendar());
    }
  }

  /**
   * Handle world time updates from Foundry
   */
  private onWorldTimeUpdate(newTime: number, delta: number): void {
    this.lastKnownTime = newTime;
    const dateResult = this.engine.worldTimeToDate(newTime);
    this.lastKnownDate =
      dateResult instanceof CalendarDate
        ? dateResult
        : new CalendarDate(dateResult, this.engine.getCalendar());

    // Emit custom hook for other modules
    Hooks.callAll('seasons-stars:dateChanged', {
      newDate: this.lastKnownDate,
      oldTime: newTime - delta,
      newTime: newTime,
      delta: delta,
    });
  }

  /**
   * Get the current calendar date based on Foundry world time
   */
  getCurrentDate(): CalendarDate {
    let worldTime = game.time?.worldTime || 0;

    // Check for PF2e-specific time source if in compatibility mode
    if (this.pf2eCompatibilityMode) {
      const pf2eWorldTime = this.getPF2eWorldTime();
      if (pf2eWorldTime !== null) {
        Logger.debug(`Using PF2e world time: ${pf2eWorldTime} (Foundry: ${worldTime})`);
        worldTime = pf2eWorldTime;
      }
    }

    const result = this.engine.worldTimeToDate(worldTime);
    // If the engine returns a CalendarDate instance, use it directly
    if (result instanceof CalendarDate) {
      return result;
    }
    // Otherwise, create a new instance from the data
    return new CalendarDate(result, this.engine.getCalendar());
  }

  /**
   * Get PF2e-specific world time if available
   */
  private getPF2eWorldTime(): number | null {
    // Try various possible PF2e time sources

    // Check if PF2e system has its own time management
    if ((game as any).pf2e?.worldClock?.currentTime) {
      return (game as any).pf2e.worldClock.currentTime;
    }

    // Check for PF2e World Clock module time
    if ((game as any).worldClock?.currentTime) {
      return (game as any).worldClock.currentTime;
    }

    // Check PF2e settings for time values
    const pf2eTimeSettings = [
      'pf2e.worldClock.currentTime',
      'pf2e.time.worldTime',
      'pf2e.calendar.currentTime',
      'world-clock.currentTime',
    ];

    for (const settingKey of pf2eTimeSettings) {
      try {
        const timeValue = game.settings?.get('pf2e', settingKey.split('.')[1]);
        if (typeof timeValue === 'number') {
          Logger.debug(`Found PF2e time in setting ${settingKey}: ${timeValue}`);
          return timeValue;
        }
      } catch (error) {
        // Setting doesn't exist, continue to next
      }
    }

    // Check for any PF2e time data in game object
    if ((game as any).pf2e) {
      const pf2eData = (game as any).pf2e;
      if (pf2eData.time || pf2eData.worldTime || pf2eData.currentTime) {
        const timeValue = pf2eData.time || pf2eData.worldTime || pf2eData.currentTime;
        Logger.debug(`Found PF2e time in game.pf2e: ${timeValue}`);
        return timeValue;
      }
    }

    // If no PF2e-specific time found, return null to use default
    return null;
  }

  /**
   * Set the current date by updating Foundry world time
   */
  async setCurrentDate(date: CalendarDate): Promise<void> {
    const worldTime = this.engine.dateToWorldTime(date);

    if (game.user?.isGM) {
      await game.time?.advance(worldTime - (game.time?.worldTime || 0));
    } else {
      ui.notifications?.warn('Only GMs can change the world time.');
    }
  }

  /**
   * Advance time by a number of days
   */
  async advanceDays(days: number): Promise<void> {
    const currentDate = this.getCurrentDate();
    const newDate = this.engine.addDays(currentDate, days);
    await this.setCurrentDate(newDate);
  }

  /**
   * Advance time by a number of hours
   */
  async advanceHours(hours: number): Promise<void> {
    const secondsPerHour =
      this.engine.getCalendar().time.minutesInHour * this.engine.getCalendar().time.secondsInMinute;
    const deltaSeconds = hours * secondsPerHour;

    if (game.user?.isGM) {
      await game.time?.advance(deltaSeconds);
    } else {
      ui.notifications?.warn('Only GMs can change the world time.');
    }
  }

  /**
   * Advance time by a number of minutes
   */
  async advanceMinutes(minutes: number): Promise<void> {
    const deltaSeconds = minutes * this.engine.getCalendar().time.secondsInMinute;

    if (game.user?.isGM) {
      await game.time?.advance(deltaSeconds);
    } else {
      ui.notifications?.warn('Only GMs can change the world time.');
    }
  }

  /**
   * Advance time by a number of weeks
   */
  async advanceWeeks(weeks: number): Promise<void> {
    const currentDate = this.getCurrentDate();
    const weekLength = this.engine.getCalendar().weekdays.length;
    const days = weeks * weekLength; // Convert weeks to days using dynamic week length
    const newDate = this.engine.addDays(currentDate, days);
    await this.setCurrentDate(newDate);
  }

  /**
   * Advance time by a number of months
   */
  async advanceMonths(months: number): Promise<void> {
    const currentDate = this.getCurrentDate();
    const newDate = this.engine.addMonths(currentDate, months);
    await this.setCurrentDate(newDate);
  }

  /**
   * Advance time by a number of years
   */
  async advanceYears(years: number): Promise<void> {
    const currentDate = this.getCurrentDate();
    const newDate = this.engine.addYears(currentDate, years);
    await this.setCurrentDate(newDate);
  }

  /**
   * Set a specific time of day while keeping the date
   */
  async setTimeOfDay(hour: number, minute: number = 0, second: number = 0): Promise<void> {
    const currentDate = this.getCurrentDate();
    const currentDateData = currentDate.toObject();

    // Update the time component
    currentDateData.time = { hour, minute, second };

    // Create new CalendarDate instance
    const calendar = this.engine.getCalendar();
    const newDate = new CalendarDate(currentDateData, calendar);
    await this.setCurrentDate(newDate);
  }

  /**
   * Get the time as a percentage of the day (0.0 to 1.0)
   */
  getDayProgress(): number {
    const currentDate = this.getCurrentDate();

    if (!currentDate.time) {
      return 0;
    }

    const calendar = this.engine.getCalendar();
    const totalSecondsInDay =
      calendar.time.hoursInDay * calendar.time.minutesInHour * calendar.time.secondsInMinute;

    const currentSecondsInDay =
      currentDate.time.hour * calendar.time.minutesInHour * calendar.time.secondsInMinute +
      currentDate.time.minute * calendar.time.secondsInMinute +
      currentDate.time.second;

    return currentSecondsInDay / totalSecondsInDay;
  }

  /**
   * Check if it's currently daytime (between dawn and dusk by default)
   */
  isDaytime(
    dawnHour: number = TIME_CONSTANTS.DEFAULT_DAWN_HOUR,
    duskHour: number = TIME_CONSTANTS.DEFAULT_DUSK_HOUR
  ): boolean {
    const currentDate = this.getCurrentDate();

    if (!currentDate.time) {
      return true; // Default to daytime if no time component
    }

    return currentDate.time.hour >= dawnHour && currentDate.time.hour < duskHour;
  }

  /**
   * Get the current season (0-3 for spring, summer, autumn, winter)
   * This is a simple implementation - can be enhanced later
   */
  getCurrentSeason(): number {
    const currentDate = this.getCurrentDate();
    const calendar = this.engine.getCalendar();

    // Simple approximation: divide year into 4 equal seasons
    const monthsPerSeason = calendar.months.length / 4;
    return Math.floor((currentDate.month - 1) / monthsPerSeason);
  }

  /**
   * Calculate the difference between two dates in days
   */
  daysBetween(date1: CalendarDate, date2: CalendarDate): number {
    const time1 = this.engine.dateToWorldTime(date1);
    const time2 = this.engine.dateToWorldTime(date2);

    const secondsPerDay =
      this.engine.getCalendar().time.hoursInDay *
      this.engine.getCalendar().time.minutesInHour *
      this.engine.getCalendar().time.secondsInMinute;

    return Math.floor((time2 - time1) / secondsPerDay);
  }

  /**
   * Convert real-world time to game time based on time ratio
   */
  realTimeToGameTime(realSeconds: number, timeRatio: number = 1): number {
    return realSeconds * timeRatio;
  }

  /**
   * Convert game time to real-world time based on time ratio
   */
  gameTimeToRealTime(gameSeconds: number, timeRatio: number = 1): number {
    return gameSeconds / timeRatio;
  }

  /**
   * Schedule a callback for a specific calendar date
   */
  scheduleCallback(targetDate: CalendarDate, callback: () => void): void {
    const targetTime = this.engine.dateToWorldTime(targetDate);
    const currentTime = game.time?.worldTime || 0;

    if (targetTime <= currentTime) {
      // Target is in the past or now, execute immediately
      callback();
      return;
    }

    // Set up a one-time hook to watch for the target time
    const hookId = Hooks.on('updateWorldTime', (newTime: number) => {
      if (newTime >= targetTime) {
        callback();
        Hooks.off('updateWorldTime', hookId);
      }
    });
  }

  /**
   * Update the calendar engine (when calendar configuration changes)
   */
  updateEngine(engine: CalendarEngine): void {
    this.engine = engine;

    // Recalculate current date with new calendar
    if (game.time?.worldTime !== undefined) {
      this.lastKnownTime = game.time.worldTime;
      const dateResult = this.engine.worldTimeToDate(this.lastKnownTime);
      this.lastKnownDate =
        dateResult instanceof CalendarDate
          ? dateResult
          : new CalendarDate(dateResult, this.engine.getCalendar());
    }
  }

  /**
   * Get debug information about time conversion
   */
  getDebugInfo(): DebugInfo {
    const currentDate = this.getCurrentDate();
    const worldTime = game.time?.worldTime || 0;

    return {
      worldTime,
      calendarDate: currentDate,
      formattedDate: currentDate.toLongString(),
      dayProgress: this.getDayProgress(),
      isDaytime: this.isDaytime(),
      season: this.getCurrentSeason(),
      lastKnownTime: this.lastKnownTime,
      lastKnownDate: this.lastKnownDate,
    };
  }
}
