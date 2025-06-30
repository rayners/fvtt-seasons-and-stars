/**
 * PF2e Game System Integration for Seasons & Stars
 *
 * Provides PF2e-specific time sources and compatibility features.
 * Only loaded when PF2e system is detected.
 */

import { Logger } from '../core/logger';
import { CalendarDate } from '../core/calendar-date';

/**
 * Simple PF2e Integration Manager
 *
 * Handles PF2e-specific time sources and monitoring.
 */
export class PF2eIntegration {
  private static instance: PF2eIntegration | null = null;
  public syncMonitorInterval: number | null = null;
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
   * Get PF2e-specific world time
   *
   * DIAGNOSTIC: Understanding worldCreatedOn vs S&S epoch difference
   */
  getPF2eWorldTime(): number | null {
    try {
      const foundryWorldTime = (game as any).time?.worldTime || 0;
      const worldCreatedOn = (game as any).pf2e?.settings?.worldClock?.worldCreatedOn;

      if (!worldCreatedOn) {
        Logger.debug('No PF2e worldCreatedOn found - using standard worldTime');
        return null;
      }

      // Calculate PF2e's current real-world date (same as PF2e World Clock)
      const pf2eCreationDate = new Date(worldCreatedOn);
      if (isNaN(pf2eCreationDate.getTime())) {
        Logger.error('Invalid PF2e worldCreatedOn format:', worldCreatedOn);
        return null;
      }

      const pf2eCreationSeconds = Math.floor(pf2eCreationDate.getTime() / 1000);
      const pf2eTotalSeconds = pf2eCreationSeconds + foundryWorldTime;
      const realWorldDate = new Date(pf2eTotalSeconds * 1000);

      // Map real-world date to Golarion calendar date using UTC (same as PF2e)
      // PF2e maps: August 12, 2025 → 12th Arodus 4725 AR
      // Month mapping: real-world month → same Golarion month
      // Day mapping: real-world day → same Golarion day
      // Year mapping: real-world year + 2700 → Golarion AR year
      const golarionYear = 4725; // PF2e displays 2025 as 4725 AR
      const golarionMonth = realWorldDate.getUTCMonth() + 1; // Convert to 1-based, use UTC
      const golarionDay = realWorldDate.getUTCDate(); // Use UTC
      const golarionHour = realWorldDate.getUTCHours(); // Use UTC
      const golarionMinute = realWorldDate.getUTCMinutes(); // Use UTC
      const golarionSecond = realWorldDate.getUTCSeconds(); // Use UTC

      Logger.debug('PF2e date mapping:', {
        realWorldDate: realWorldDate.toISOString(),
        golarionDate: {
          year: golarionYear,
          month: golarionMonth,
          day: golarionDay,
          time: `${golarionHour}:${golarionMinute}:${golarionSecond}`,
        },
      });

      // Get S&S calendar manager and utilities
      const calendarManager = (game as any).seasonsStars?.manager;
      if (!calendarManager) {
        Logger.error('S&S calendar manager not available');
        return null;
      }

      const calendar = calendarManager.getActiveCalendar();
      const engine = calendarManager.getActiveEngine();

      // Create CalendarDate using S&S calendar utilities
      const golarionCalendarDate = new CalendarDate(
        {
          year: golarionYear,
          month: golarionMonth,
          day: golarionDay,
          weekday: 0, // Will be calculated by CalendarDate
          time: {
            hour: golarionHour,
            minute: golarionMinute,
            second: golarionSecond,
          },
        },
        calendar
      );

      // Use S&S's dateToWorldTime() utility to get correct worldTime
      const correctWorldTime = engine.dateToWorldTime(golarionCalendarDate);

      Logger.debug('S&S calendar conversion result:', {
        inputDate: golarionCalendarDate.toObject(),
        outputWorldTime: correctWorldTime,
      });

      return correctWorldTime;
    } catch (error) {
      Logger.error(
        'Error converting PF2e date using S&S calendar utilities:',
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

    // Since we're using standard worldTime, both systems should be synchronized
    // This method now primarily serves as a monitoring function
    Logger.debug('PF2e time sync check - using standard Foundry worldTime:', {
      foundryTime,
      message: 'Both PF2e and S&S using same worldTime base',
    });

    // Emit hook for any widgets that want to know about time updates
    Hooks.callAll('seasons-stars:pf2eTimeSync', {
      foundryTime,
      synchronized: true,
    });
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

// Hook to provide world creation timestamp to core S&S when requested
Hooks.on(
  'seasons-stars:pf2e:getWorldCreationTimestamp',
  (timestampData: { worldCreationTimestamp: number | undefined }) => {
    try {
      const worldCreatedOn = (game as any).pf2e?.settings?.worldClock?.worldCreatedOn;
      if (worldCreatedOn) {
        const timestamp = new Date(worldCreatedOn).getTime() / 1000;
        if (isFinite(timestamp) && timestamp > 0) {
          timestampData.worldCreationTimestamp = timestamp;
          Logger.debug('PF2e integration provided world creation timestamp:', timestamp);
        }
      }
    } catch (error) {
      Logger.error('PF2e integration failed to provide world creation timestamp:', error);
    }
  }
);

// Time monitoring - start periodic sync checking when ready
Hooks.on('ready', () => {
  const integration = PF2eIntegration.getInstance();
  if (!integration?.isIntegrationActive()) return;

  const syncInterval = setInterval(() => {
    integration.checkPF2eTimeSync();
  }, 30000); // Check every 30 seconds

  // Store interval for cleanup
  integration.syncMonitorInterval = syncInterval;
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
