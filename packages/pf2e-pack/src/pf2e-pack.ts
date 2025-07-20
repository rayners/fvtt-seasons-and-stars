/**
 * Seasons & Stars - Pathfinder 2e Integration Pack
 *
 * Provides PF2e-specific time sources and compatibility features.
 * Requires the main Seasons & Stars module to be installed and active.
 */

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

    console.log(
      'Seasons & Stars PF2e Pack: PF2e system detected - enabling enhanced compatibility mode'
    );
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
      console.error(
        'Seasons & Stars PF2e Pack: Error accessing PF2e worldCreatedOn:',
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
        console.log('Seasons & Stars PF2e Pack: No PF2e worldCreatedOn found');
        return null;
      }

      const pf2eCreationDate = new Date(worldCreatedOn);
      if (isNaN(pf2eCreationDate.getTime())) {
        console.error(
          'Seasons & Stars PF2e Pack: Invalid PF2e worldCreatedOn format:',
          new Error(`Invalid date format: ${worldCreatedOn}`)
        );
        return null;
      }

      // Get the active calendar to use its structure
      const calendarManager = game.seasonsStars?.manager as any;
      if (!calendarManager) {
        console.error(
          'Seasons & Stars PF2e Pack: Calendar manager not available for PF2e date mapping'
        );
        return null;
      }

      const activeCalendar = calendarManager.getActiveCalendar();
      if (!activeCalendar || activeCalendar.id !== 'golarion-pf2e') {
        console.log(
          'Seasons & Stars PF2e Pack: PF2e integration only works with Golarion calendar'
        );
        return null;
      }

      // PF2e maps real-world dates directly to Golarion calendar
      // January = Abadius (month 1), June = Sarenith (month 6), etc.
      const golarionYear = activeCalendar.year?.currentYear || 4725;
      const golarionMonth = pf2eCreationDate.getUTCMonth() + 1; // 1-based
      const golarionDay = pf2eCreationDate.getUTCDate();

      // Validate month is within calendar bounds
      if (golarionMonth < 1 || golarionMonth > activeCalendar.months.length) {
        console.error(
          `Seasons & Stars PF2e Pack: Invalid month ${golarionMonth} for calendar with ${activeCalendar.months.length} months`
        );
        return null;
      }

      const monthName = activeCalendar.months[golarionMonth - 1]?.name || 'Unknown';

      console.log('Seasons & Stars PF2e Pack: PF2e base date calculation:', {
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
      console.error(
        'Seasons & Stars PF2e Pack: Error calculating PF2e base date:',
        error instanceof Error ? error : undefined
      );
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
        console.log('Seasons & Stars PF2e Pack: No PF2e worldCreatedOn found');
        return null;
      }

      const pf2eCreationDate = new Date(worldCreatedOn);
      if (isNaN(pf2eCreationDate.getTime())) {
        console.error(
          'Seasons & Stars PF2e Pack: Invalid PF2e worldCreatedOn format:',
          new Error(`Invalid date format: ${worldCreatedOn}`)
        );
        return null;
      }

      const timestamp = Math.floor(pf2eCreationDate.getTime() / 1000);
      console.log('Seasons & Stars PF2e Pack: PF2e world creation timestamp:', {
        worldCreatedOn,
        timestamp,
        readableDate: pf2eCreationDate.toISOString(),
      });

      return timestamp;
    } catch (error) {
      console.error(
        'Seasons & Stars PF2e Pack: Error getting PF2e world creation timestamp:',
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
    console.log(
      'Seasons & Stars PF2e Pack: PF2e system detected - registering time source and data providers with compatibility manager'
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

    /**
     * Register worldTime transformation function for PF2e-aware date calculations.
     *
     * This transformation solves the critical bug where clicking calendar dates in S&S
     * caused PF2e to jump 2000+ years due to different worldTime interpretations:
     * - S&S: worldTime=0 represents calendar epoch (e.g., 2700 AR for Golarion)
     * - PF2e: worldTime=0 represents real-world creation date + 0 seconds elapsed
     *
     * The transform provides PF2e's worldCreationTimestamp as system time offset,
     * enabling proper synchronization between S&S calendar and PF2e time displays.
     *
     * @see docs/SYSTEM-INTEGRATION.md for implementation details and examples
     */
    compatibilityManager.registerDataProvider('pf2e', 'worldTimeTransform', () => {
      return (worldTime: number, defaultOffset?: number): [number, number | undefined] => {
        // Return worldTime and PF2e world creation timestamp as system time offset
        const systemTimeOffset = integration.getWorldCreationTimestamp();
        return [worldTime, systemTimeOffset || defaultOffset];
      };
    });
  }
);

// Initialize when ready
Hooks.once('ready', () => {
  console.log('Seasons & Stars PF2e Pack: Module loaded and ready');
});
