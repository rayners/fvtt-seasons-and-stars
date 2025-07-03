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
   * Get PF2e world creation timestamp
   * Consolidated helper to avoid duplication of worldCreatedOn access
   */
  getWorldCreatedOn(): string | null {
    try {
      const worldCreatedOn = (
        game as { pf2e?: { settings?: { worldClock?: { worldCreatedOn?: string } } } }
      ).pf2e?.settings?.worldClock?.worldCreatedOn;
      return worldCreatedOn || null;
    } catch (error) {
      Logger.error(
        'Error accessing PF2e worldCreatedOn:',
        error instanceof Error ? error : undefined
      );
      return null;
    }
  }

  /**
   * Get PF2e-style base date for calendar calculations
   * Maps real-world creation date to Golarion calendar following PF2e's approach
   */
  getPF2eBaseDate(): {
    year: number;
    month: number;
    day: number;
    hour?: number;
    minute?: number;
    second?: number;
  } | null {
    try {
      const worldCreatedOn = this.getWorldCreatedOn();
      if (!worldCreatedOn) {
        Logger.debug('No PF2e worldCreatedOn found');
        return null;
      }

      const pf2eCreationDate = new Date(worldCreatedOn);
      if (isNaN(pf2eCreationDate.getTime())) {
        Logger.error(
          'Invalid PF2e worldCreatedOn format:',
          new Error(`Invalid date format: ${worldCreatedOn}`)
        );
        return null;
      }

      // Get the active calendar to use its structure
      const calendarManager = game.seasonsStars?.manager as any;
      if (!calendarManager) {
        Logger.error('Calendar manager not available for PF2e date mapping');
        return null;
      }

      const activeCalendar = calendarManager.getActiveCalendar();
      if (!activeCalendar || activeCalendar.id !== 'golarion-pf2e') {
        Logger.debug('PF2e integration only works with Golarion calendar');
        return null;
      }

      // PF2e maps real-world dates directly to Golarion calendar
      // January = Abadius (month 1), June = Sarenith (month 6), etc.
      const golarionYear = activeCalendar.year?.currentYear || 4725;
      const golarionMonth = pf2eCreationDate.getUTCMonth() + 1; // 1-based
      const golarionDay = pf2eCreationDate.getUTCDate();

      // Validate month is within calendar bounds
      if (golarionMonth < 1 || golarionMonth > activeCalendar.months.length) {
        Logger.error(
          `Invalid month ${golarionMonth} for calendar with ${activeCalendar.months.length} months`
        );
        return null;
      }

      const monthName = activeCalendar.months[golarionMonth - 1]?.name || 'Unknown';

      Logger.debug('PF2e base date calculation:', {
        worldCreatedOn,
        realWorldDate: pf2eCreationDate.toISOString(),
        golarionBaseDate: `${golarionDay} ${monthName}, ${golarionYear} AR`,
      });

      // Include the time component from world creation for accurate time matching
      const golarionHour = pf2eCreationDate.getUTCHours();
      const golarionMinute = pf2eCreationDate.getUTCMinutes();
      const golarionSecond = pf2eCreationDate.getUTCSeconds();

      return {
        year: golarionYear,
        month: golarionMonth,
        day: golarionDay,
        hour: golarionHour,
        minute: golarionMinute,
        second: golarionSecond,
      };
    } catch (error) {
      Logger.error('Error calculating PF2e base date:', error instanceof Error ? error : undefined);
      return null;
    }
  }

  /**
   * Get PF2e world creation timestamp as fixed baseline
   * This is the only data PF2e should provide - let S&S handle all date calculations
   */
  getWorldCreationTimestamp(): number | null {
    try {
      const worldCreatedOn = this.getWorldCreatedOn();
      if (!worldCreatedOn) {
        Logger.debug('No PF2e worldCreatedOn found');
        return null;
      }

      const pf2eCreationDate = new Date(worldCreatedOn);
      if (isNaN(pf2eCreationDate.getTime())) {
        Logger.error(
          'Invalid PF2e worldCreatedOn format:',
          new Error(`Invalid date format: ${worldCreatedOn}`)
        );
        return null;
      }

      const timestamp = Math.floor(pf2eCreationDate.getTime() / 1000);
      Logger.debug('PF2e world creation timestamp:', {
        worldCreatedOn,
        timestamp,
        readableDate: pf2eCreationDate.toISOString(),
      });

      return timestamp;
    } catch (error) {
      Logger.error(
        'Error getting PF2e world creation timestamp:',
        error instanceof Error ? error : undefined
      );
      return null;
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
   * Cleanup integration when module is disabled
   */
  destroy(): void {
    this.isActive = false;
  }
}

// Main integration entry point - register time source and data providers with S&S core
Hooks.on(
  'seasons-stars:pf2e:systemDetected',
  (compatibilityManager: {
    registerDataProvider: (system: string, key: string, provider: () => unknown) => void;
  }) => {
    Logger.debug(
      'PF2e system detected - registering time source and data providers with compatibility manager'
    );

    // Initialize PF2e integration
    const integration = PF2eIntegration.initialize();

    // PF2e integration no longer provides external time source
    // Instead, we just provide the world creation timestamp as baseline

    // Register world creation timestamp data provider
    compatibilityManager.registerDataProvider('pf2e', 'worldCreationTimestamp', () => {
      return integration.getWorldCreationTimestamp();
    });

    // Register system base date provider for real-world date mapping
    compatibilityManager.registerDataProvider('pf2e', 'systemBaseDate', () => {
      return integration.getPF2eBaseDate();
    });
  }
);
