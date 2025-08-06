/**
 * Time Advancement Service - Centralized automatic time advancement with combat integration
 * Implements singleton pattern with proper resource management and type safety
 */

import { Logger } from './logger';
import type { CalendarManagerInterface } from '../types/foundry-extensions';

/**
 * Centralized service for managing automatic time advancement in Seasons & Stars
 * Features smart interval calculation, combat auto-pause, and comprehensive error handling
 */
export class TimeAdvancementService {
  private static instance: TimeAdvancementService | null = null;
  private _isActive: boolean = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private advancementRatio: number = 1;
  private lastAdvancement: number = 0;
  /**
   * Private constructor to enforce singleton pattern
   * Registers combat hooks immediately - they'll check settings when called
   */
  private constructor() {
    Logger.debug('TimeAdvancementService instance created');
    
    // Register combat hooks once - they'll check settings when triggered
    Hooks.on('combatStart', this.handleCombatStart.bind(this));
    Hooks.on('deleteCombat', this.handleCombatEnd.bind(this));
  }

  /**
   * Get the singleton instance of TimeAdvancementService
   * @returns The TimeAdvancementService instance
   */
  static getInstance(): TimeAdvancementService {
    if (!TimeAdvancementService.instance) {
      TimeAdvancementService.instance = new TimeAdvancementService();
    }
    return TimeAdvancementService.instance;
  }

  /**
   * Reset the singleton instance (for testing purposes)
   * @internal
   */
  static resetInstance(): void {
    if (TimeAdvancementService.instance) {
      TimeAdvancementService.instance.destroy();
      TimeAdvancementService.instance = null;
    }
  }

  /**
   * Get the current active state
   */
  get isActive(): boolean {
    return this._isActive;
  }

  /**
   * Initialize the service (hooks are already registered in constructor)
   */
  initialize(): void {
    Logger.debug('TimeAdvancementService ready (hooks already registered)');
  }

  /**
   * Start automatic time advancement
   * @throws Error if game is not ready or manager is unavailable
   */
  async play(): Promise<void> {
    if (!this.validateState() || this._isActive) {
      return;
    }

    try {
      Logger.info('Starting time advancement');
      this._isActive = true;
      await this.startAdvancement();
      this.callHookSafely('seasons-stars:timeAdvancementStarted', this.advancementRatio);
    } catch (error) {
      this._isActive = false;
      ui.notifications?.error('Failed to start time advancement');
      Logger.error('Failed to start time advancement', error as Error);
      throw error;
    }
  }

  /**
   * Pause automatic time advancement
   */
  pause(): void {
    if (!this._isActive) {
      return;
    }

    Logger.info('Pausing time advancement');
    this._isActive = false;
    this.stopAdvancement();
    this.callHookSafely('seasons-stars:timeAdvancementPaused');
  }

  /**
   * Update the advancement ratio and restart if currently active
   * @param ratio The new ratio (game seconds per real second)
   */
  updateRatio(ratio: number): void {
    const wasActive = this._isActive;
    
    if (wasActive) {
      this.pause();
    }
    
    this.advancementRatio = Math.max(0.1, Math.min(100, ratio));
    Logger.debug(`Updated advancement ratio to ${this.advancementRatio}`);
    
    if (wasActive) {
      this.play().catch(error => {
        Logger.error('Failed to restart after ratio update', error as Error);
      });
    }
  }

  /**
   * Clean up all resources (hooks remain registered)
   */
  destroy(): void {
    Logger.debug('Destroying TimeAdvancementService');
    
    this.stopAdvancement();
    this._isActive = false;
  }

  /**
   * Calculate optimal interval based on advancement ratio
   * Ensures minimum 1000ms real time and at least 1 second game time advancement
   * @param ratio The advancement ratio (game seconds per real second)
   * @returns Interval in milliseconds
   * @private
   */
  private calculateOptimalInterval(ratio: number): number {
    // Formula: Math.max(1000, Math.ceil(1000 / ratio))
    // This ensures:
    // - Never advance more frequently than every 1000ms real time
    // - Always advance at least 1 second of game time per interval
    return Math.max(1000, Math.ceil(1000 / ratio));
  }

  /**
   * Start the advancement timer
   * @private
   */
  private async startAdvancement(): Promise<void> {
    // Clear any existing interval first
    this.stopAdvancement();
    
    const interval = this.calculateOptimalInterval(this.advancementRatio);
    Logger.debug(`Starting advancement with ${interval}ms interval (ratio: ${this.advancementRatio})`);
    
    this.intervalId = setInterval(() => {
      try {
        this.advanceTime();
      } catch (error) {
        Logger.error('Time advancement error, auto-pausing', error as Error);
        this.pause();
      }
    }, interval);
  }

  /**
   * Stop the advancement timer
   * @private
   */
  private stopAdvancement(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      Logger.debug('Stopped advancement timer');
    }
  }

  /**
   * Advance time by the current ratio
   * @private
   */
  private advanceTime(): void {
    const manager = game.seasonsStars?.manager as CalendarManagerInterface;
    if (!manager) {
      throw new Error('Calendar manager not available');
    }

    const secondsToAdvance = this.advancementRatio;
    Logger.debug(`Advancing ${secondsToAdvance} game seconds`);
    
    manager.advanceSeconds(secondsToAdvance);
    this.lastAdvancement = Date.now();
  }

  /**
   * Validate that the game state allows time advancement
   * @returns true if advancement is allowed
   * @private
   */
  private validateState(): boolean {
    if (!game.seasonsStars?.manager) {
      Logger.warn('Seasons & Stars manager not available for time advancement');
      return false;
    }

    return true;
  }

  /**
   * Safely call a Foundry hook with error handling
   * @param hookName The hook name to call
   * @param args Arguments to pass to the hook
   * @private
   */
  private callHookSafely(hookName: string, ...args: any[]): void {
    try {
      Hooks.call(hookName, ...args);
    } catch (error) {
      Logger.error(`Failed to call hook ${hookName}`, error as Error);
      // Don't re-throw - hook failures shouldn't break the service
    }
  }

  /**
   * Get a setting value with safe fallback
   * @param key The setting key
   * @param defaultValue The fallback value
   * @returns The setting value or fallback
   * @private
   */
  private getSettingValue<T>(key: string, defaultValue: T): T {
    try {
      const value = game.settings?.get('seasons-and-stars', key);
      return value !== undefined ? value : defaultValue;
    } catch (error) {
      Logger.warn(`Failed to get setting ${key}, using default`, error);
      return defaultValue;
    }
  }

  /**
   * Handle combat start - pause if configured to do so
   * @param combat The combat that started
   * @param updateData Combat update data
   * @private
   */
  private handleCombatStart = (_combat: Combat, _updateData?: any): void => {
    if (!this.shouldPauseOnCombat()) {
      return;
    }

    Logger.info('Combat started - pausing time advancement');
    this.pause();
    ui.notifications?.info('Time advancement paused for combat');
  };

  /**
   * Handle combat end - resume if configured to do so
   * @param combat The combat that ended
   * @param options Combat deletion options
   * @param userId The user who ended the combat
   * @private
   */
  private handleCombatEnd = (_combat: Combat, _options?: any, _userId?: string): void => {
    if (!this.shouldResumeAfterCombat()) {
      return;
    }

    Logger.info('Combat ended - resuming time advancement');
    this.play().catch(error => {
      Logger.error('Failed to resume time advancement after combat', error as Error);
      ui.notifications?.error('Failed to resume time advancement after combat');
    });
  };

  /**
   * Check if time advancement should pause on combat start
   * @returns true if should pause on combat
   * @private
   */
  private shouldPauseOnCombat(): boolean {
    return this._isActive && this.getSettingValue('pauseOnCombat', true);
  }

  /**
   * Check if time advancement should resume after combat
   * @returns true if should resume after combat
   * @private
   */
  private shouldResumeAfterCombat(): boolean {
    return !this._isActive && this.getSettingValue('resumeAfterCombat', false);
  }

}