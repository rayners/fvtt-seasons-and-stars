/**
 * D&D 5e Game System Integration for Seasons & Stars
 *
 * Provides D&D 5e-specific calendar and time management features.
 * Automatically activates when D&D 5e system is detected.
 */

import { Logger } from '../core/logger';

/**
 * D&D 5e Integration Manager
 *
 * Handles D&D 5e-specific calendar features and compatibility.
 * Unlike PF2e, D&D 5e doesn't have complex worldTime transformations,
 * but provides enhanced calendar features and lore integration.
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

    Logger.info('D&D 5e system detected - enabling enhanced calendar features');
    this.isActive = true;
  }

  /**
   * Get default D&D 5e calendar based on world settings or user preference
   * Helps users select appropriate calendar for their campaign setting
   */
  getRecommendedCalendar(): string {
    try {
      // Check if there are any world-specific hints about which calendar to use
      const worldTitle = game.world?.title || '';
      const worldDescription = game.world?.description || '';

      // Simple heuristics to suggest appropriate calendar
      const text = (worldTitle + ' ' + worldDescription).toLowerCase();

      if (text.includes('eberron')) {
        return 'eberron';
      } else if (text.includes('dark sun') || text.includes('athas')) {
        return 'dark-sun';
      } else if (text.includes('greyhawk')) {
        return 'greyhawk';
      } else if (text.includes('exandria') || text.includes('critical role')) {
        return 'exandrian';
      } else if (
        text.includes('sword coast') ||
        text.includes('waterdeep') ||
        text.includes('neverwinter')
      ) {
        return 'dnd5e-sword-coast';
      } else if (text.includes('forgotten realms') || text.includes('faerun')) {
        return 'forgotten-realms';
      }

      // Default to Sword Coast calendar for D&D 5e
      return 'dnd5e-sword-coast';
    } catch {
      Logger.debug('Error determining recommended calendar, using default');
      return 'dnd5e-sword-coast';
    }
  }

  /**
   * Get D&D 5e campaign year suggestions based on common timelines
   */
  getTimelineSuggestions(): Array<{
    year: number;
    description: string;
    era: string;
  }> {
    return [
      {
        year: 1492,
        description: 'Dragon Heist, Dungeon of the Mad Mage (default)',
        era: 'Post-Second Sundering',
      },
      {
        year: 1489,
        description: 'Lost Mine of Phandelver, Hoard of the Dragon Queen',
        era: 'Post-Second Sundering',
      },
      {
        year: 1490,
        description: 'Rise of Tiamat, Elemental Evil',
        era: 'Post-Second Sundering',
      },
      {
        year: 1491,
        description: 'Out of the Abyss, Curse of Strahd',
        era: 'Post-Second Sundering',
      },
      {
        year: 1493,
        description: "Storm King's Thunder",
        era: 'Post-Second Sundering',
      },
      {
        year: 1494,
        description: 'Tomb of Annihilation',
        era: 'Post-Second Sundering',
      },
      {
        year: 1496,
        description: "Baldur's Gate: Descent into Avernus",
        era: 'Post-Second Sundering',
      },
      {
        year: 1485,
        description: "Murder in Baldur's Gate",
        era: 'Early Post-Sundering',
      },
      {
        year: 1479,
        description: 'The Sundering events begin',
        era: 'The Sundering',
      },
    ];
  }

  /**
   * Get information about current calendar settings
   * Provides helpful context for DMs about their calendar choice
   */
  getCalendarInfo(calendarId: string): {
    isDnD5eCalendar: boolean;
    setting: string;
    timelineContext?: string;
    yearRange?: string;
  } {
    const dnd5eCalendars = new Map([
      [
        'dnd5e-sword-coast',
        {
          setting: 'Sword Coast (Forgotten Realms)',
          timelineContext: 'Default D&D 5e timeline, post-Second Sundering',
          yearRange: '1489-1496 DR (most adventures)',
        },
      ],
      [
        'forgotten-realms',
        {
          setting: 'Forgotten Realms (General)',
          timelineContext: 'Classic Forgotten Realms setting',
          yearRange: '1350-1500 DR (various eras)',
        },
      ],
      [
        'eberron',
        {
          setting: 'Eberron',
          timelineContext: 'Post-Last War Eberron setting',
          yearRange: '998 YK onwards',
        },
      ],
      [
        'greyhawk',
        {
          setting: 'Greyhawk',
          timelineContext: 'Classic Greyhawk setting',
          yearRange: '570-600 CY (typical)',
        },
      ],
      [
        'dark-sun',
        {
          setting: 'Dark Sun (Athas)',
          timelineContext: 'Post-apocalyptic desert world',
          yearRange: '190+ Free Year',
        },
      ],
      [
        'exandrian',
        {
          setting: 'Exandria (Critical Role)',
          timelineContext: 'Critical Role campaign setting',
          yearRange: '810-900 PD',
        },
      ],
    ]);

    const info = dnd5eCalendars.get(calendarId);
    if (info) {
      return {
        isDnD5eCalendar: true,
        ...info,
      };
    }

    return {
      isDnD5eCalendar: false,
      setting: 'Generic/Custom Calendar',
    };
  }

  /**
   * Get D&D 5e-specific holidays and events for a given calendar
   * Enhances calendar with lore-appropriate events
   */
  getSeasonalEvents(
    calendarId: string,
    month: number
  ): Array<{
    day: number;
    name: string;
    description: string;
    type: 'holiday' | 'festival' | 'event';
  }> {
    if (calendarId === 'dnd5e-sword-coast' || calendarId === 'forgotten-realms') {
      return this.getForgottenRealmsEvents(month);
    } else if (calendarId === 'eberron') {
      return this.getEberronEvents(month);
    }

    return [];
  }

  /**
   * Get Forgotten Realms seasonal events
   */
  private getForgottenRealmsEvents(month: number): Array<{
    day: number;
    name: string;
    description: string;
    type: 'holiday' | 'festival' | 'event';
  }> {
    const events = new Map([
      [
        1,
        [
          // Hammer (Deepwinter)
          {
            day: 15,
            name: 'Midwinter Feast',
            description: 'Traditional feast during the coldest time',
            type: 'holiday' as const,
          },
        ],
      ],
      [
        3,
        [
          // Ches (Claw of the Sunsets)
          {
            day: 19,
            name: 'Spring Equinox',
            description: "Celebration of spring's arrival",
            type: 'festival' as const,
          },
        ],
      ],
      [
        5,
        [
          // Mirtul (The Melting)
          {
            day: 1,
            name: 'May Day Festivals',
            description: 'Springtime celebrations across the realms',
            type: 'festival' as const,
          },
        ],
      ],
      [
        6,
        [
          // Kythorn (The Time of Flowers)
          {
            day: 20,
            name: 'Summer Solstice',
            description: 'Longest day, sacred to sun deities',
            type: 'holiday' as const,
          },
        ],
      ],
      [
        8,
        [
          // Eleasis (Highsun)
          {
            day: 15,
            name: 'Feast of the Moon',
            description: 'Honor ancestors and the dead',
            type: 'holiday' as const,
          },
        ],
      ],
      [
        9,
        [
          // Eleint (The Fading)
          {
            day: 22,
            name: 'Autumn Equinox',
            description: 'Harvest celebrations begin',
            type: 'festival' as const,
          },
        ],
      ],
      [
        11,
        [
          // Uktar (The Rotting)
          {
            day: 30,
            name: 'Feast of the Dead',
            description: 'Remember the fallen, appease undead',
            type: 'holiday' as const,
          },
        ],
      ],
      [
        12,
        [
          // Nightal (The Drawing Down)
          {
            day: 21,
            name: 'Winter Solstice',
            description: 'Longest night, protection rituals',
            type: 'holiday' as const,
          },
        ],
      ],
    ]);

    return events.get(month) || [];
  }

  /**
   * Get Eberron seasonal events
   */
  private getEberronEvents(month: number): Array<{
    day: number;
    name: string;
    description: string;
    type: 'holiday' | 'festival' | 'event';
  }> {
    // Basic Eberron events - could be expanded with more lore
    const events = new Map([
      [
        1,
        [
          {
            day: 1,
            name: 'New Year Festival',
            description: 'Celebration of the new year',
            type: 'festival' as const,
          },
        ],
      ],
      [
        6,
        [
          {
            day: 15,
            name: "Aureon's Crown",
            description: 'Festival of knowledge and learning',
            type: 'festival' as const,
          },
        ],
      ],
      [
        12,
        [
          {
            day: 25,
            name: 'Long Shadows',
            description: 'Winter celebration and reflection',
            type: 'holiday' as const,
          },
        ],
      ],
    ]);

    return events.get(month) || [];
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

// Main integration entry point - register D&D 5e enhancements with S&S core
Hooks.on(
  'seasons-stars:dnd5e:systemDetected',
  (compatibilityManager: {
    registerDataProvider: (system: string, key: string, provider: () => unknown) => void;
  }) => {
    Logger.debug(
      'D&D 5e system detected - registering calendar enhancements with compatibility manager'
    );

    // Initialize D&D 5e integration
    const integration = DnD5eIntegration.initialize();

    // Register calendar recommendation provider
    compatibilityManager.registerDataProvider('dnd5e', 'recommendedCalendar', () => {
      return integration.getRecommendedCalendar();
    });

    // Register timeline suggestions provider
    compatibilityManager.registerDataProvider('dnd5e', 'timelineSuggestions', () => {
      return integration.getTimelineSuggestions();
    });

    // Register calendar information provider
    compatibilityManager.registerDataProvider('dnd5e', 'calendarInfo', () => {
      return (calendarId: string): ReturnType<typeof integration.getCalendarInfo> =>
        integration.getCalendarInfo(calendarId);
    });

    // Register seasonal events provider
    compatibilityManager.registerDataProvider('dnd5e', 'seasonalEvents', () => {
      return (
        calendarId: string,
        month: number
      ): ReturnType<typeof integration.getSeasonalEvents> =>
        integration.getSeasonalEvents(calendarId, month);
    });

    Logger.info('D&D 5e integration registered - enhanced calendar features available');
  }
);
