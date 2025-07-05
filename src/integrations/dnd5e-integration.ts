/**
 * D&D 5e Game System Integration for Seasons & Stars
 *
 * Provides D&D 5e-specific time sources and compatibility features.
 * Only loaded when D&D 5e system is detected.
 */

import { Logger } from '../core/logger';

/**
 * Simple D&D 5e Integration Manager
 *
 * Handles D&D 5e-specific time sources and compatibility features.
 */
export class DnD5eIntegration {
  private static instance: DnD5eIntegration | null = null;
  private isActive: boolean = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Initialize D&D 5e integration (called only when D&D 5e system is detected)
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
   * Activate D&D 5e integration
   */
  private activate(): void {
    if (this.isActive) return;

    Logger.info('D&D 5e system detected - enabling enhanced compatibility mode');
    this.isActive = true;

    // Suggest appropriate calendars for D&D 5e
    this.suggestCalendars();
  }

  /**
   * Suggest appropriate calendars for D&D 5e campaigns
   */
  private suggestCalendars(): void {
    try {
      const calendarManager = game.seasonsStars?.manager as any;
      if (!calendarManager) {
        Logger.debug('Calendar manager not available for D&D 5e calendar suggestions');
        return;
      }

      const availableCalendars = calendarManager.getAvailableCalendars();
      const dnd5eCalendars = availableCalendars.filter(
        (id: string) =>
          id.includes('dnd5e') ||
          id.includes('sword-coast') ||
          id.includes('forgotten-realms') ||
          id.includes('faerun')
      );

      if (dnd5eCalendars.length > 0) {
        Logger.info(`D&D 5e calendars available: ${dnd5eCalendars.join(', ')}`);

        // Auto-suggest Sword Coast calendar if available
        const swordCoastCalendar = dnd5eCalendars.find((id: string) => id.includes('sword-coast'));
        if (swordCoastCalendar) {
          Logger.info(`Consider using ${swordCoastCalendar} calendar for D&D 5e campaigns`);
        }
      }
    } catch (error) {
      Logger.error(
        'Error suggesting D&D 5e calendars:',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get D&D 5e world creation timestamp
   * Check for common D&D 5e time tracking modules or world flags
   */
  getWorldCreatedOn(): string | null {
    try {
      // Check for Simple Calendar compatibility data
      const scWorldCreated = (
        game as {
          settings?: {
            get?: (module: string, key: string) => any;
          };
        }
      ).settings?.get?.('simple-calendar', 'world-created-on');

      if (scWorldCreated) {
        Logger.debug('Found Simple Calendar world creation timestamp:', scWorldCreated);
        return scWorldCreated;
      }

      // Check for world flags that might contain creation timestamp
      const worldFlags = (game as any).world?.flags;
      if (worldFlags) {
        // Check common D&D 5e time tracking flag locations
        const timeFlags =
          worldFlags['dnd5e']?.time ||
          worldFlags['world-time']?.created ||
          worldFlags['calendar']?.created;

        if (timeFlags) {
          Logger.debug('Found D&D 5e time flags:', timeFlags);
          return timeFlags;
        }
      }

      Logger.debug('No D&D 5e world creation timestamp found');
      return null;
    } catch (error) {
      Logger.error(
        'Error accessing D&D 5e world creation data:',
        error instanceof Error ? error : undefined
      );
      return null;
    }
  }

  /**
   * Get D&D 5e-style base date for calendar calculations
   * Maps world creation to Forgotten Realms calendar (Dale Reckoning)
   */
  getDnD5eBaseDate(): {
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
        Logger.debug('No D&D 5e worldCreatedOn found');
        return null;
      }

      const creationDate = new Date(worldCreatedOn);
      if (isNaN(creationDate.getTime())) {
        Logger.error(
          'Invalid D&D 5e worldCreatedOn format:',
          new Error(`Invalid date format: ${worldCreatedOn}`)
        );
        return null;
      }

      // Get the active calendar to use its structure
      const calendarManager = game.seasonsStars?.manager as any;
      if (!calendarManager) {
        Logger.error('Calendar manager not available for D&D 5e date mapping');
        return null;
      }

      const activeCalendar = calendarManager.getActiveCalendar();
      if (
        !activeCalendar ||
        (!activeCalendar.id.includes('dnd5e') && !activeCalendar.id.includes('sword-coast'))
      ) {
        Logger.debug('D&D 5e integration works best with D&D 5e calendars');
        return null;
      }

      // Map to Dale Reckoning - default to 1492 DR (current year in many D&D 5e adventures)
      const dalerekoningYear = activeCalendar.year?.currentYear || 1492;
      const month = creationDate.getUTCMonth() + 1; // 1-based
      const day = creationDate.getUTCDate();

      // Validate month is within calendar bounds
      if (month < 1 || month > activeCalendar.months.length) {
        Logger.error(
          `Invalid month ${month} for calendar with ${activeCalendar.months.length} months`
        );
        return null;
      }

      const monthName = activeCalendar.months[month - 1]?.name || 'Unknown';

      Logger.debug('D&D 5e base date calculation:', {
        worldCreatedOn,
        realWorldDate: creationDate.toISOString(),
        dalerekoningBaseDate: `${day} ${monthName}, ${dalerekoningYear} DR`,
      });

      // Include the time component from world creation for accurate time matching
      const hour = creationDate.getUTCHours();
      const minute = creationDate.getUTCMinutes();
      const second = creationDate.getUTCSeconds();

      return {
        year: dalerekoningYear,
        month: month,
        day: day,
        hour: hour,
        minute: minute,
        second: second,
      };
    } catch (error) {
      Logger.error(
        'Error calculating D&D 5e base date:',
        error instanceof Error ? error : undefined
      );
      return null;
    }
  }

  /**
   * Get D&D 5e world creation timestamp as fixed baseline
   */
  getWorldCreationTimestamp(): number | null {
    try {
      const worldCreatedOn = this.getWorldCreatedOn();
      if (!worldCreatedOn) {
        Logger.debug('No D&D 5e worldCreatedOn found');
        return null;
      }

      const creationDate = new Date(worldCreatedOn);
      if (isNaN(creationDate.getTime())) {
        Logger.error(
          'Invalid D&D 5e worldCreatedOn format:',
          new Error(`Invalid date format: ${worldCreatedOn}`)
        );
        return null;
      }

      const timestamp = Math.floor(creationDate.getTime() / 1000);
      Logger.debug('D&D 5e world creation timestamp:', {
        worldCreatedOn,
        timestamp,
        readableDate: creationDate.toISOString(),
      });

      return timestamp;
    } catch (error) {
      Logger.error(
        'Error getting D&D 5e world creation timestamp:',
        error instanceof Error ? error : undefined
      );
      return null;
    }
  }

  /**
   * Get the active D&D 5e integration instance
   */
  static getInstance(): DnD5eIntegration | null {
    return DnD5eIntegration.instance;
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
    this.isActive = false;
  }
}

// Main integration entry point - register with S&S core when D&D 5e system is detected
Hooks.on(
  'seasons-stars:dnd5e:systemDetected',
  (compatibilityManager: {
    registerDataProvider: (system: string, key: string, provider: () => unknown) => void;
  }) => {
    Logger.debug(
      'D&D 5e system detected - registering time source and data providers with compatibility manager'
    );

    // Initialize D&D 5e integration
    const integration = DnD5eIntegration.initialize();

    // Register world creation timestamp data provider
    compatibilityManager.registerDataProvider('dnd5e', 'worldCreationTimestamp', () => {
      return integration.getWorldCreationTimestamp();
    });

    // Register system base date provider for real-world date mapping
    compatibilityManager.registerDataProvider('dnd5e', 'systemBaseDate', () => {
      return integration.getDnD5eBaseDate();
    });

    /**
     * Register worldTime transformation function for D&D 5e-aware date calculations.
     *
     * Similar to PF2e integration, this handles the synchronization between
     * S&S calendar dates and D&D 5e time tracking systems.
     */
    compatibilityManager.registerDataProvider('dnd5e', 'worldTimeTransform', () => {
      return (worldTime: number, defaultOffset?: number): [number, number | undefined] => {
        // Return worldTime and D&D 5e world creation timestamp as system time offset
        const systemTimeOffset = integration.getWorldCreationTimestamp();
        return [worldTime, systemTimeOffset || defaultOffset];
      };
    });
  }
);
