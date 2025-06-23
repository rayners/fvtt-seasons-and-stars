/**
 * PF2e Game System Integration for Seasons & Stars
 *
 * Provides PF2e-specific time sources and compatibility features.
 * Only loaded when PF2e system is detected.
 */

import { Logger } from '../core/logger';

/**
 * Simple PF2e Integration Manager
 *
 * Handles PF2e-specific time sources and monitoring.
 */
export class PF2eIntegration {
  private static instance: PF2eIntegration | null = null;
  private syncMonitorInterval: number | null = null;
  private isActive: boolean = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Initialize PF2e integration (called only when PF2e system is detected)
   */
  static initialize(): PF2eIntegration {
    if (PF2eIntegration.instance) {
      return PF2eIntegration.instance;
    }

    PF2eIntegration.instance = new PF2eIntegration();
    PF2eIntegration.instance.activate();
    return PF2eIntegration.instance;
  }

  /**
   * Activate PF2e integration
   */
  private activate(): void {
    if (this.isActive) return;

    Logger.info('PF2e system detected - enabling enhanced compatibility mode');
    this.isActive = true;

    // Register time source if hooks are available (runtime only)
    if (typeof Hooks !== 'undefined' && typeof Hooks.call === 'function') {
      this.registerTimeSource();
    }
  }

  /**
   * Register PF2e time source directly with compatibility manager
   */
  private registerTimeSource(): void {
    // Use a hook-based approach to avoid circular dependencies
    Hooks.call('seasons-stars:registerTimeSource', {
      systemId: 'pf2e',
      sourceFunction: (): number | null => {
        const time = this.getPF2eWorldTime();
        if (time !== null) {
          Logger.debug(`PF2e time source providing: ${time}`);
        }
        return time;
      },
    });

    Logger.debug('PF2e time source registration hook called');
  }

  /**
   * Get PF2e-specific world time if available
   */
  getPF2eWorldTime(): number | null {
    // Debug: Log what time sources are available
    const pf2eWorldClock = (game as any).pf2e?.worldClock?.currentTime;
    const worldClock = (game as any).worldClock?.currentTime;
    const foundryTime = (game as any).time?.worldTime;

    Logger.debug('PF2e Time Source Detection:', {
      'game.pf2e.worldClock.currentTime': pf2eWorldClock,
      'game.worldClock.currentTime': worldClock,
      'game.time.worldTime (Foundry)': foundryTime,
      'pf2e object available': !!(game as any).pf2e,
      'worldClock available': !!(game as any).worldClock,
    });

    // Try common PF2e time sources
    const timeSources = [() => pf2eWorldClock || null, () => worldClock || null];

    for (const source of timeSources) {
      const timeValue = source();
      if (timeValue !== null) {
        Logger.debug(`PF2e time source found: ${timeValue} (vs Foundry: ${foundryTime})`);
        return timeValue;
      }
    }

    // Check for any PF2e time data in game object
    if ((game as any).pf2e) {
      const pf2eData = (game as any).pf2e;
      if (pf2eData.time || pf2eData.worldTime || pf2eData.currentTime) {
        return pf2eData.time || pf2eData.worldTime || pf2eData.currentTime;
      }
    }

    return null;
  }

  /**
   * Check for time synchronization issues between Foundry and PF2e
   */
  checkPF2eTimeSync(): void {
    const foundryTime = game.time?.worldTime || 0;
    const pf2eTime = this.getPF2eWorldTime();

    if (pf2eTime !== null && pf2eTime !== foundryTime) {
      Logger.debug('PF2e time sync status:', {
        foundryTime,
        pf2eTime,
        difference: pf2eTime - foundryTime,
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
   * Get the active PF2e integration instance
   */
  static getInstance(): PF2eIntegration | null {
    return PF2eIntegration.instance;
  }

  /**
   * Check if PF2e integration is active
   */
  isIntegrationActive(): boolean {
    return this.isActive;
  }

  /**
   * Simple debug method for worldTime interpretation (for testing)
   */
  getDebugWorldTimeInterpretation(engine: any, worldTime: number): any {
    const result = engine.worldTimeToDate(worldTime);
    const calendar = engine.getCalendar();
    const worldTimeConfig = calendar.worldTime;

    // Basic calculations for compatibility with tests
    const adjustedWorldTime = engine.adjustWorldTimeForInterpretation
      ? engine.adjustWorldTimeForInterpretation(worldTime)
      : worldTime;

    return {
      input: {
        worldTime,
        calendarId: calendar.id,
        interpretation: worldTimeConfig?.interpretation || 'epoch-based',
        epochYear: worldTimeConfig?.epochYear || calendar.year.epoch,
        currentYear: worldTimeConfig?.currentYear || calendar.year.currentYear,
      },
      calculations: {
        adjustedWorldTime,
        adjustmentDelta: adjustedWorldTime - worldTime,
        // Add minimal epoch calculation if needed
        epochCalculation:
          worldTimeConfig?.interpretation === 'year-offset'
            ? {
                yearDifference:
                  (worldTimeConfig.currentYear || calendar.year.currentYear) -
                  (worldTimeConfig.epochYear || calendar.year.epoch),
              }
            : undefined,
      },
      result: {
        year: result.year,
        month: result.month,
        day: result.day,
        weekday: result.weekday,
        formattedDate: `${result.day} ${calendar.months[result.month - 1]?.name}, ${result.year}`,
      },
    };
  }

  /**
   * Simple comparison method for PF2e calculation (for testing)
   */
  getCompareWithPF2eCalculation(engine: any, worldTime: number): any {
    const ssResult = this.getDebugWorldTimeInterpretation(engine, worldTime);

    // Very simplified PF2e approximation for testing
    const currentRealYear = new Date().getFullYear();
    const approximateYear = currentRealYear + 2700;

    return {
      worldTime,
      seasonsStars: ssResult.result,
      approximatePF2e: { year: approximateYear },
      differences: { yearDiff: Math.abs(ssResult.result.year - approximateYear) },
    };
  }

  /**
   * Cleanup integration when module is disabled
   */
  destroy(): void {
    if (this.syncMonitorInterval) {
      clearInterval(this.syncMonitorInterval);
      this.syncMonitorInterval = null;
    }
    this.isActive = false;
  }
}

// Time monitoring - start periodic sync checking when ready
Hooks.on('ready', () => {
  const integration = PF2eIntegration.getInstance();
  if (!integration?.isIntegrationActive()) return;

  const syncInterval = setInterval(() => {
    integration.checkPF2eTimeSync();
  }, 30000); // Check every 30 seconds

  (integration as any).syncMonitorInterval = syncInterval;
});

// Main integration entry point - register time source with S&S core
Hooks.on('seasons-stars:pf2e:systemDetected', (compatibilityManager: any) => {
  Logger.debug('PF2e system detected - registering time source with compatibility manager');

  // Initialize PF2e integration
  const integration = PF2eIntegration.initialize();

  // Create time source function that uses the integration's logic
  const pf2eTimeSourceFunction = (): number | null => {
    return integration.getPF2eWorldTime();
  };

  // Register with the compatibility manager
  compatibilityManager.registerTimeSource('pf2e', pf2eTimeSourceFunction);
});
