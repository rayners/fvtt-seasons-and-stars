/**
 * Time Advancement Service - Centralized automatic time advancement with combat integration
 *
 * This service provides automatic time advancement functionality with the following features:
 * - Singleton pattern ensuring only one advancement service exists
 * - Smart interval calculation based on advancement ratio
 * - Combat integration (auto-pause/resume)
 * - Comprehensive error handling and recovery
 * - Hook-based event system for third-party integration
 *
 * @example Basic usage
 * ```javascript
 * // Get the service instance
 * const timeService = TimeAdvancementService.getInstance();
 *
 * // Start automatic time advancement
 * await timeService.play();
 *
 * // Check if advancement is active
 * console.log('Time advancement active:', timeService.isActive);
 *
 * // Pause advancement
 * timeService.pause();
 *
 * // Update advancement speed (2x speed)
 * timeService.updateRatio(2.0);
 * ```
 *
 * @example Hook integration for third-party modules
 * ```javascript
 * // Listen for time advancement events
 * Hooks.on('seasons-stars:timeAdvancementStarted', (ratio) => {
 *   console.log(`Time advancement started at ${ratio}x speed`);
 *   // Your module logic here
 * });
 *
 * Hooks.on('seasons-stars:timeAdvancementPaused', () => {
 *   console.log('Time advancement paused');
 *   // Your module logic here
 * });
 * ```
 */

import { Logger } from './logger';
import type { CalendarManagerInterface } from '../types/foundry-extensions';

/**
 * Centralized service for managing automatic time advancement in Seasons & Stars
 *
 * The TimeAdvancementService provides automated time progression with intelligent
 * interval calculation, combat awareness, and robust error handling. It follows
 * the singleton pattern to ensure only one instance manages time advancement.
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
   *
   * This method ensures only one instance of the TimeAdvancementService exists
   * throughout the application lifetime. The instance is created lazily on first access.
   *
   * @returns The singleton TimeAdvancementService instance
   *
   * @example Getting the service instance
   * ```javascript
   * // Always use getInstance() - never instantiate directly
   * const timeService = TimeAdvancementService.getInstance();
   *
   * // The same instance is returned on subsequent calls
   * const sameInstance = TimeAdvancementService.getInstance();
   * console.log(timeService === sameInstance); // true
   * ```
   *
   * @example Checking service availability
   * ```javascript
   * // Check if the service is available before using
   * try {
   *   const timeService = TimeAdvancementService.getInstance();
   *   if (timeService.isActive) {
   *     console.log('Time advancement is currently running');
   *   }
   * } catch (error) {
   *   console.error('TimeAdvancementService not available:', error);
   * }
   * ```
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
   *
   * Begins automated time progression using the current advancement ratio setting.
   * The service will advance game time at regular intervals until paused or stopped.
   * Combat integration will automatically pause advancement if configured.
   *
   * @throws {Error} If game is not ready or calendar manager is unavailable
   * @throws {Error} If time advancement fails to start due to system state
   *
   * @example Basic time advancement
   * ```javascript
   * const timeService = TimeAdvancementService.getInstance();
   *
   * try {
   *   await timeService.play();
   *   console.log('Time advancement started successfully');
   * } catch (error) {
   *   console.error('Failed to start time advancement:', error);
   * }
   * ```
   *
   * @example Starting with custom ratio
   * ```javascript
   * const timeService = TimeAdvancementService.getInstance();
   *
   * // Set 2x speed before starting
   * timeService.updateRatio(2.0);
   * await timeService.play();
   * console.log('Time advancing at 2x speed');
   * ```
   *
   * @example Integration with module controls
   * ```javascript
   * // In your module's control panel
   * class TimeControlPanel {
   *   async startTimeAdvancement() {
   *     const timeService = TimeAdvancementService.getInstance();
   *
   *     if (timeService.isActive) {
   *       ui.notifications.warn('Time advancement already active');
   *       return;
   *     }
   *
   *     try {
   *       await timeService.play();
   *       this.updateButtonStates();
   *       ui.notifications.info('Time advancement started');
   *     } catch (error) {
   *       ui.notifications.error('Failed to start time advancement');
   *     }
   *   }
   * }
   * ```
   *
   * @fires seasons-stars:timeAdvancementStarted When advancement starts successfully
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
   *
   * Stops the current time advancement without destroying the service.
   * The advancement can be resumed later by calling play() again.
   * This method is safe to call even if advancement is not currently active.
   *
   * @example Basic pause operation
   * ```javascript
   * const timeService = TimeAdvancementService.getInstance();
   *
   * // Pause advancement (safe even if not running)
   * timeService.pause();
   * console.log('Time advancement paused');
   * ```
   *
   * @example Toggle advancement state
   * ```javascript
   * const timeService = TimeAdvancementService.getInstance();
   *
   * if (timeService.isActive) {
   *   timeService.pause();
   *   ui.notifications.info('Time advancement paused');
   * } else {
   *   await timeService.play();
   *   ui.notifications.info('Time advancement started');
   * }
   * ```
   *
   * @example Module integration with cleanup
   * ```javascript
   * // In your module's shutdown/cleanup code
   * class WeatherModule {
   *   onModuleDisable() {
   *     const timeService = TimeAdvancementService.getInstance();
   *
   *     // Ensure time advancement is paused when module is disabled
   *     if (timeService.isActive) {
   *       timeService.pause();
   *       console.log('Weather module disabled - time advancement paused');
   *     }
   *   }
   * }
   * ```
   *
   * @fires seasons-stars:timeAdvancementPaused When advancement is successfully paused
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
   *
   * Changes the speed of time advancement. The ratio represents game seconds
   * advanced per real-world second. Values are clamped between 0.1 and 100.
   * If advancement is currently active, it will be restarted with the new ratio.
   *
   * @param ratio The new ratio (game seconds per real second)
   *   - 1.0 = real time (1 game second per real second)
   *   - 2.0 = double speed (2 game seconds per real second)
   *   - 0.5 = half speed (0.5 game seconds per real second)
   *   - Clamped to range [0.1, 100]
   *
   * @example Setting different advancement speeds
   * ```javascript
   * const timeService = TimeAdvancementService.getInstance();
   *
   * // Real-time advancement
   * timeService.updateRatio(1.0);
   *
   * // Double speed for fast travel
   * timeService.updateRatio(2.0);
   *
   * // Slow motion for detailed events
   * timeService.updateRatio(0.1);
   *
   * // Very fast for long rests (10x speed)
   * timeService.updateRatio(10.0);
   * ```
   *
   * @example Dynamic speed adjustment
   * ```javascript
   * class TimeControlWidget {
   *   setupSpeedControls() {
   *     const timeService = TimeAdvancementService.getInstance();
   *
   *     // Speed selector
   *     const speeds = [0.1, 0.5, 1.0, 2.0, 5.0, 10.0];
   *     speeds.forEach(speed => {
   *       const button = document.createElement('button');
   *       button.textContent = `${speed}x`;
   *       button.onclick = () => {
   *         timeService.updateRatio(speed);
   *         this.updateActiveSpeed(speed);
   *       };
   *       this.speedContainer.appendChild(button);
   *     });
   *   }
   * }
   * ```
   *
   * @example Integration with settings
   * ```javascript
   * // Sync with Foundry settings
   * game.settings.register('my-module', 'timeSpeed', {
   *   name: 'Time Advancement Speed',
   *   scope: 'world',
   *   config: true,
   *   type: Number,
   *   default: 1.0,
   *   onChange: (value) => {
   *     const timeService = TimeAdvancementService.getInstance();
   *     timeService.updateRatio(value);
   *   }
   * });
   * ```
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
    Logger.debug(
      `Starting advancement with ${interval}ms interval (ratio: ${this.advancementRatio})`
    );

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
