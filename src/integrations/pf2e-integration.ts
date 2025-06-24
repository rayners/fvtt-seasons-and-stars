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
  }

  /**
   * Get PF2e-specific world time using exact PF2e World Clock calculation
   *
   * PF2e calculates time as: worldCreatedOn + game.time.worldTime
   * This matches their World Clock app calculation exactly.
   */
  getPF2eWorldTime(): number | null {
    const foundryTime = (game as any).time?.worldTime || 0;

    // Check if PF2e system and settings are available
    const pf2eSettings = (game as any).pf2e?.settings?.worldClock;
    if (!pf2eSettings) {
      Logger.debug('PF2e settings not available for time calculation');
      return null;
    }

    // Get PF2e world creation date (ISO string)
    const worldCreatedOn = pf2eSettings.worldCreatedOn;
    if (!worldCreatedOn) {
      Logger.debug('PF2e worldCreatedOn not set - cannot calculate PF2e time');
      return null;
    }

    try {
      // Calculate PF2e time using their exact method:
      // worldCreatedOn (DateTime) + game.time.worldTime (seconds)
      const creationDate = new Date(worldCreatedOn);

      // Check if date is valid
      if (isNaN(creationDate.getTime())) {
        Logger.error('Invalid worldCreatedOn date format in PF2e settings');
        return null;
      }

      const creationTimeSeconds = Math.floor(creationDate.getTime() / 1000);
      const pf2eWorldTime = creationTimeSeconds + foundryTime;

      Logger.debug('PF2e Time Calculation:', {
        worldCreatedOn,
        creationTimeSeconds,
        foundryWorldTime: foundryTime,
        calculatedPF2eTime: pf2eWorldTime,
        dateTheme: pf2eSettings.dateTheme || 'AR',
      });

      return pf2eWorldTime;
    } catch (error) {
      Logger.error(
        'Failed to calculate PF2e world time:',
        error instanceof Error ? error : undefined
      );
      return null;
    }
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
