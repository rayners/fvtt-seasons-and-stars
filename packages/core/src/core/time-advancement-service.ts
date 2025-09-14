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
 *
 * ## Multi-Source Pause Management
 *
 * This service coordinates multiple pause sources to provide comprehensive control:
 *
 * ### Pause Sources:
 * 1. **Game Pause**: Foundry's global pause button (controlled by `syncWithGamePause` setting)
 * 2. **Combat Pause**: Automatic pause when combat starts (controlled by `pauseOnCombat` setting)
 *
 * ### Pause Interaction Matrix:
 * ```
 * Game Paused | Combat Active | Time Advancement State
 * ------------|---------------|---------------------
 * No          | No            | ✅ Can run normally
 * No          | Yes           | ❌ Paused (combat)
 * Yes         | No            | ❌ Paused (game)
 * Yes         | Yes           | ❌ Paused (both)
 * ```
 *
 * ### Resume Logic:
 * - **Game Unpause**: Resumes only if no combat active and was previously running
 * - **Combat End**: Resumes only if game not paused and was previously running
 * - **Both Clear**: Resumes if was previously running (GM permission required)
 *
 * ### Permission Model:
 * - **Pause**: Any user can pause via combat start or game pause
 * - **Resume**: Only GMs can trigger automatic resume for security
 * - **Manual**: GMs can always manually start/stop via UI
 *
 * ### Settings Control:
 * - `syncWithGamePause` (default: true): Enable/disable game pause synchronization
 * - `pauseOnCombat` (default: true): Enable/disable combat pause
 * - `resumeAfterCombat` (default: false): Enable/disable combat resume
 */
export class TimeAdvancementService {
  private static instance: TimeAdvancementService | null = null;
  private _isActive: boolean = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private advancementRatio: number = 1;
  private lastAdvancement: number = 0;
  private wasActiveBeforePause: boolean = false;
  /**
   * Private constructor to enforce singleton pattern
   * Registers hooks immediately - they'll check settings when called
   */
  private constructor() {
    Logger.debug('TimeAdvancementService instance created');

    // Register hooks once - they'll check settings when triggered
    Hooks.on('combatStart', this.handleCombatStart.bind(this));
    Hooks.on('deleteCombat', this.handleCombatEnd.bind(this));
    Hooks.on('pauseGame', this.handleGamePause.bind(this));
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
   * Get the effective UI state - what the user interface should show
   * This differs from isActive when time advancement was running but got auto-paused
   *
   * @returns true if UI should show pause button, false if UI should show play button
   */
  get shouldShowPauseButton(): boolean {
    // If time advancement is active, always show pause button
    if (this._isActive) {
      return true;
    }

    // If time advancement is inactive but was active before being auto-paused,
    // show pause button so user can "lock in" the paused state
    if (this.wasActiveBeforePause) {
      return true;
    }

    // Otherwise show play button
    return false;
  }

  /**
   * Get the current pause state and reason for UI display
   *
   * @returns Object with pause state and human-readable reason
   */
  getPauseState(): { isPaused: boolean; reason: string | null; canResume: boolean } {
    // Check external blocking conditions first, even if not currently active
    if (this.isBlockedByOtherReasons()) {
      const reasons: string[] = [];

      if (this.shouldSyncWithGamePause() && game.paused) {
        reasons.push('Game paused');
      }

      if (this.getSettingValue('pauseOnCombat', true) && (game.combat?.started ?? false)) {
        reasons.push('Combat active');
      }

      return {
        isPaused: true,
        reason: reasons.length > 1 ? reasons.join(' & ') : reasons[0] || 'Blocked',
        canResume: false, // Can't manually resume while blocked by external factors
      };
    }

    if (!this._isActive) {
      return {
        isPaused: true,
        reason: 'Time advancement stopped',
        canResume: game.user?.isGM || false,
      };
    }

    return {
      isPaused: false,
      reason: null,
      canResume: true,
    };
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
      this.callHookSafely('seasons-stars:pauseStateChanged', this.getPauseState());
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
    // Always clear wasActiveBeforePause when user manually pauses
    // This prevents auto-resume even if advancement was already paused by external factors
    this.wasActiveBeforePause = false;

    Logger.debug(
      `Manual pause called: _isActive=${this._isActive}, blocked=${this.isAdvancementBlocked()}`
    );

    if (!this._isActive) {
      // Already paused, but we still cleared the auto-resume flag above
      Logger.info('Time advancement already paused, cleared auto-resume flag');
      this.callHookSafely('seasons-stars:pauseStateChanged', this.getPauseState());
      return;
    }

    // If advancement is active but blocked by external factors (game pause, combat),
    // user clicking pause should fully stop it, not just clear the auto-resume flag
    Logger.info('Pausing time advancement (manual)');
    this._isActive = false;
    this.stopAdvancement();

    this.callHookSafely('seasons-stars:timeAdvancementPaused');
    this.callHookSafely('seasons-stars:pauseStateChanged', this.getPauseState());
  }

  /**
   * Pause time advancement due to automatic/external condition (game pause, combat, etc.)
   * Does NOT clear wasActiveBeforePause flag so auto-resume can work
   * @private
   */
  private pauseAutomatic(): void {
    if (!this._isActive) {
      return;
    }

    Logger.info('Pausing time advancement (automatic)');
    this._isActive = false;
    this.stopAdvancement();

    // DO NOT clear wasActiveBeforePause - needed for auto-resume

    this.callHookSafely('seasons-stars:timeAdvancementPaused');
    this.callHookSafely('seasons-stars:pauseStateChanged', this.getPauseState());
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
    this.wasActiveBeforePause = false; // Reset pause state for clean testing
  }

  /**
   * Calculate optimal interval based on advancement ratio
   * Ensures minimum 10000ms real time and dynamic scaling for slow ratios
   * @param ratio The advancement ratio (game seconds per real second)
   * @returns Interval in milliseconds
   * @private
   */
  private calculateOptimalInterval(ratio: number): number {
    // Formula: Math.max(10000, Math.ceil(1000 / ratio))
    // This ensures:
    // - Never advance more frequently than every 10000ms real time
    // - Always scales appropriately for very slow ratios
    return Math.max(10000, Math.ceil(1000 / ratio));
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
    // Track when the last advancement tick occurred so we can maintain the
    // correct real-time to game-time ratio regardless of interval frequency
    this.lastAdvancement = Date.now();

    this.intervalId = setInterval(() => {
      try {
        // Check if advancement should be blocked before advancing
        if (this.isAdvancementBlocked()) {
          // Logger.debug('Time advancement temporarily blocked, skipping interval');
          // Update the last advancement timestamp so paused time doesn't accumulate
          this.lastAdvancement = Date.now();
          return;
        }

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

    const now = Date.now();
    const elapsedSeconds = (now - this.lastAdvancement) / 1000;
    const secondsToAdvance = this.advancementRatio * elapsedSeconds;
    // Skip debug logging during automatic advancement to reduce console spam
    // Logger.debug(`Advancing ${secondsToAdvance} game seconds over ${elapsedSeconds}s real time`);

    manager.advanceSeconds(secondsToAdvance);
    this.lastAdvancement = now;
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

    // Allow manual start even when game is paused - user should have control
    // Blocking will happen during interval advancement via isAdvancementBlocked()
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
      Hooks.callAll(hookName, ...args);
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
   *
   * **Combat Pause Behavior:**
   * This handler works independently but coordinates with game pause:
   *
   * **When Combat Starts:**
   * - Pauses time advancement if currently active and setting enabled
   * - Sets wasActiveBeforePause flag for potential later resume
   * - Available to all users (GM and players can pause)
   * - Shows notification about combat pause
   *
   * **Interaction with Game Pause:**
   * - If game is already paused: Combat pause adds additional blocking condition
   * - Both sources maintain separate wasActiveBeforePause tracking
   * - Time will only resume when ALL blocking conditions are cleared
   *
   * **Setting Control:**
   * - Controlled by 'pauseOnCombat' world setting
   * - When disabled, combat start/end events are ignored for time advancement
   * - Game pause continues to work independently
   *
   * @param combat The combat that started
   * @param updateData Combat update data
   * @private
   */
  private handleCombatStart = (_combat: Combat, _updateData?: any): void => {
    if (!this.getSettingValue('pauseOnCombat', true)) {
      return;
    }

    if (this._isActive) {
      this.wasActiveBeforePause = true;
      this.pauseAutomatic();
      ui.notifications?.info('Time advancement paused for combat');
      Logger.info('Combat started - pausing time advancement');
    }
    // Notify UI about pause state change when combat starts
    this.callHookSafely('seasons-stars:pauseStateChanged', this.getPauseState());
  };

  /**
   * Handle combat end - resume if configured to do so
   *
   * **Combat Resume Behavior:**
   * This handler coordinates with game pause to ensure proper resume logic:
   *
   * **When Combat Ends:**
   * - Only GMs can trigger auto-resume (security measure)
   * - Checks if time advancement was active before combat started
   * - Only resumes if 'resumeAfterCombat' setting is enabled
   * - Only resumes if NO other blocking conditions exist (game pause, etc.)
   * - Clears wasActiveBeforePause flag to prevent duplicate resumes
   *
   * **Multi-Source Resume Logic:**
   * - Combat end + Game paused: Time remains paused (game pause blocks)
   * - Combat end + Game unpaused + was active before: Time resumes
   * - Uses isBlockedByOtherReasons() to check all blocking conditions
   *
   * **Permission Model:**
   * - Only GMs can auto-resume time advancement for security
   * - Players can pause (via combat start) but cannot auto-resume
   * - Manual resume always available to GMs via UI controls
   *
   * **Setting Control:**
   * - Controlled by 'resumeAfterCombat' world setting
   * - When disabled, combat end never triggers auto-resume
   * - Manual resume still available to GMs
   *
   * @param combat The combat that ended
   * @param options Combat deletion options
   * @param userId The user who ended the combat
   * @private
   */
  private handleCombatEnd = (_combat: Combat, _options?: any, _userId?: string): void => {
    // Only GMs should attempt to resume time advancement
    if (!game.user?.isGM) {
      return;
    }

    if (!this.getSettingValue('resumeAfterCombat', false)) {
      return;
    }

    if (this.wasActiveBeforePause && !this._isActive && !this.isBlockedByOtherReasons()) {
      this.wasActiveBeforePause = false;
      Logger.info('Combat ended - resuming time advancement');
      this.play().catch(error => {
        Logger.error('Failed to resume time advancement after combat', error as Error);
        ui.notifications?.error('Failed to resume time advancement after combat');
      });
    }
    // Notify UI about pause state change after combat ends
    this.callHookSafely('seasons-stars:pauseStateChanged', this.getPauseState());
  };

  /**
   * Check if time advancement should sync with game pause state
   * @returns true if should sync with game pause
   * @private
   */
  private shouldSyncWithGamePause(): boolean {
    return this.getSettingValue('syncWithGamePause', true);
  }

  /**
   * Check if advancement is blocked by other conditions (game pause or combat)
   *
   * **Multi-Source Blocking Logic:**
   * This method ensures that time advancement only resumes when ALL blocking
   * conditions are cleared, preventing premature resume when multiple pause
   * sources are active.
   *
   * **Checked Blocking Conditions:**
   * 1. **Game Pause**: Foundry's global pause state (if sync enabled)
   * 2. **Active Combat**: Any combat encounter in progress
   *
   * **Usage Scenarios:**
   * - Called before auto-resume in game pause handler
   * - Called before auto-resume in combat end handler
   * - Prevents resume when one condition clears but others remain
   *
   * **Examples:**
   * - Game unpauses but combat is active: Returns true (blocked by combat)
   * - Combat ends but game is paused: Returns true (blocked by game pause)
   * - Both game unpaused and no combat: Returns false (not blocked)
   *
   * @returns true if blocked by any condition, false if safe to resume
   * @private
   */
  private isBlockedByOtherReasons(): boolean {
    const gamePauseBlocking = this.shouldSyncWithGamePause() && game.paused;
    const combatBlocking =
      this.getSettingValue('pauseOnCombat', true) && (game.combat?.started ?? false);

    return gamePauseBlocking || combatBlocking;
  }

  /**
   * Check if time advancement should be blocked on current interval tick
   *
   * This method checks real-time blocking conditions that might change between
   * interval ticks, allowing the interval to continue running but skip actual
   * time advancement when temporarily blocked.
   *
   * @returns true if advancement should be skipped this tick, false to proceed
   * @private
   */
  private isAdvancementBlocked(): boolean {
    return this.isBlockedByOtherReasons();
  }

  /**
   * Handle game pause/unpause events
   *
   * **Multi-Source Pause Behavior:**
   * This handler works alongside combat pause to provide comprehensive pause management:
   *
   * **When Game is Paused:**
   * - Pauses time advancement if currently active
   * - Sets wasActiveBeforePause flag for later resume
   * - Shows notification to all users
   *
   * **When Game is Unpaused:**
   * - Only GMs can trigger auto-resume (security measure)
   * - Checks if time advancement was active before the pause
   * - Only resumes if NO other blocking conditions exist (combat, etc.)
   * - Clears wasActiveBeforePause flag to prevent duplicate resumes
   *
   * **Interaction with Combat Pause:**
   * - Game pause + Combat active: Time stays paused until BOTH are cleared
   * - Game unpause while combat active: Time remains paused
   * - Combat end while game paused: Time remains paused
   * - Both conditions cleared: Time resumes automatically (GM only)
   *
   * **Setting Control:**
   * - Controlled by 'syncWithGamePause' world setting
   * - When disabled, game pause/unpause events are ignored
   * - Combat pause continues to work independently
   *
   * @param paused Current pause state (true = game paused, false = game unpaused)
   * @param options Hook options with broadcast and userId info
   * @private
   */
  private handleGamePause = (paused: boolean, options?: any): void => {
    Logger.debug(
      `Game pause hook fired: ${paused ? 'paused' : 'unpaused'}, syncEnabled=${this.shouldSyncWithGamePause()}`,
      options
    );

    if (!this.shouldSyncWithGamePause()) {
      Logger.debug('Ignoring game pause because syncWithGamePause setting is disabled');
      return;
    }

    if (paused) {
      // Game was paused - pause time advancement if it's running
      if (this._isActive) {
        this.wasActiveBeforePause = true;
        this.pauseAutomatic();
        ui.notifications?.info('Time advancement paused (game paused)');
        Logger.info('Time advancement paused due to game pause');
      }
      // Notify UI about pause state change even if time advancement wasn't active
      this.callHookSafely('seasons-stars:pauseStateChanged', this.getPauseState());
    } else {
      // Game was unpaused - resume if was active before and no other blocks
      if (!game.user?.isGM) {
        Logger.debug('Non-GM user cannot auto-resume time advancement');
        return;
      }

      if (this.wasActiveBeforePause && !this._isActive && !this.isBlockedByOtherReasons()) {
        this.wasActiveBeforePause = false;
        this.play().catch(error => {
          Logger.error('Failed to resume time advancement after game unpause', error as Error);
          ui.notifications?.error('Failed to resume time advancement after game unpause');
        });
        ui.notifications?.info('Time advancement resumed (game unpaused)');
        Logger.info('Time advancement resumed after game unpause');
      }
      // Notify UI about pause state change
      this.callHookSafely('seasons-stars:pauseStateChanged', this.getPauseState());
    }
  };
}
