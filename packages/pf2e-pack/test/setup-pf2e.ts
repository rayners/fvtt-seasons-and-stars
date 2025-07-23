/**
 * PF2e Environment Setup for Testing
 *
 * This utility sets up an environment for PF2e integration testing.
 * Uses PF2e-compatible implementation for authentic testing.
 */

/* eslint-disable @typescript-eslint/triple-slash-reference */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
/// <reference path="../../core/test/test-types.d.ts" />

interface PF2eEnvironmentConfig {
  /** World creation timestamp (Date.getTime() / 1000) */
  worldCreationTimestamp: number;
  /** Current world time offset in seconds */
  currentWorldTime: number;
  /** Expected world creation year for validation */
  expectedWorldCreationYear: number;
  /** PF2e date theme (AR, IC, AD, CE) */
  dateTheme?: 'AR' | 'IC' | 'AD' | 'CE';
  /** Time convention (12 or 24 hour) */
  timeConvention?: 12 | 24;
}

interface PF2eWorldClockData {
  dateTheme: 'AR' | 'IC' | 'AD' | 'CE';
  playersCanView: boolean;
  showClockButton: boolean;
  syncDarkness: boolean;
  timeConvention: 12 | 24;
  worldCreatedOn: string;
}

interface PF2eWorldClockCalculations {
  /** Calculate PF2e year from real-world timestamp */
  calculateYear(worldTime: number, worldCreatedOn: string, dateTheme: string): number;
  /** Format date using PF2e calendar rules */
  formatDate(worldTime: number, worldCreatedOn: string, dateTheme: string): string;
  /** Get month name using PF2e localization */
  getMonthName(worldTime: number, worldCreatedOn: string, dateTheme: string): string;
  /** Calculate weekday using PF2e calendar */
  getWeekday(worldTime: number, worldCreatedOn: string, dateTheme: string): string;
}

/**
 * Set up a comprehensive PF2e environment for testing widget synchronization
 */
export function setupRealPF2eEnvironment(config: PF2eEnvironmentConfig): void {
  const {
    worldCreationTimestamp,
    currentWorldTime,
    expectedWorldCreationYear,
    dateTheme = 'AR',
    timeConvention = 24,
  } = config;

  // Set up PF2e system ID
  (globalThis as any).game = (globalThis as any).game || {};
  (globalThis as any).game.system = { id: 'pf2e' };

  // Set up world creation timestamp
  const worldCreatedOn = new Date(worldCreationTimestamp * 1000).toISOString();

  // Set up PF2e world clock settings
  const worldClockSettings: PF2eWorldClockData = {
    dateTheme,
    playersCanView: true,
    showClockButton: true,
    syncDarkness: false,
    timeConvention,
    worldCreatedOn,
  };

  // Set up PF2e settings structure matching real PF2e
  (globalThis as any).game.pf2e = {
    settings: {
      worldClock: worldClockSettings,
    },
  };

  // Set up Foundry world time
  (globalThis as any).game.time = {
    worldTime: currentWorldTime,
  };

  // Set up PF2e CONFIG constants (simplified for testing)
  (globalThis as any).CONFIG = (globalThis as any).CONFIG || {};
  (globalThis as any).CONFIG.PF2E = {
    worldClock: {
      AR: {
        Era: 'PF2E.WorldClock.AR.Era',
        yearOffset: 2700, // Real PF2e year offset for Absalom Reckoning
        Months: {
          January: 'PF2E.WorldClock.AR.Months.Abadius',
          February: 'PF2E.WorldClock.AR.Months.Calistril',
          March: 'PF2E.WorldClock.AR.Months.Pharast',
          April: 'PF2E.WorldClock.AR.Months.Gozren',
          May: 'PF2E.WorldClock.AR.Months.Desnus',
          June: 'PF2E.WorldClock.AR.Months.Sarenith',
          July: 'PF2E.WorldClock.AR.Months.Erastus',
          August: 'PF2E.WorldClock.AR.Months.Arodus',
          September: 'PF2E.WorldClock.AR.Months.Rova',
          October: 'PF2E.WorldClock.AR.Months.Lamashan',
          November: 'PF2E.WorldClock.AR.Months.Neth',
          December: 'PF2E.WorldClock.AR.Months.Kuthona',
        },
        Weekdays: {
          Sunday: 'PF2E.WorldClock.AR.Weekdays.Sunday',
          Monday: 'PF2E.WorldClock.AR.Weekdays.Moonday',
          Tuesday: 'PF2E.WorldClock.AR.Weekdays.Toilday',
          Wednesday: 'PF2E.WorldClock.AR.Weekdays.Wealday',
          Thursday: 'PF2E.WorldClock.AR.Weekdays.Oathday',
          Friday: 'PF2E.WorldClock.AR.Weekdays.Fireday',
          Saturday: 'PF2E.WorldClock.AR.Weekdays.Starday',
        },
      },
      Date: '{weekday}, {day} {month} {year} {era}',
    },
  };

  // Validate setup
  const actualYear =
    expectedWorldCreationYear + (globalThis as any).CONFIG.PF2E.worldClock.AR.yearOffset;
  if (actualYear !== expectedWorldCreationYear + 2700) {
    throw new Error(
      `PF2e environment setup validation failed: Expected year offset 2700, got ${
        actualYear - expectedWorldCreationYear
      }`
    );
  }

  console.log('✅ PF2e environment setup complete:', {
    worldCreatedOn,
    currentWorldTime,
    dateTheme,
    expectedPF2eYear: actualYear,
  });
}

/**
 * Create PF2e-compatible world clock calculations
 * These functions replicate PF2e's actual calendar logic for testing
 */
export function createPF2eCalculations(): PF2eWorldClockCalculations {
  // NOTE: These calculations replicate the logic from the actual PF2e WorldClock class
  // but are simplified to work without full PF2e system dependencies
  const calculations: PF2eWorldClockCalculations = {
    calculateYear(worldTime: number, worldCreatedOn: string, dateTheme: string): number {
      // Replicates: this.worldTime.year + CONFIG.PF2E.worldClock[this.dateTheme].yearOffset
      const creationDate = new Date(worldCreatedOn);
      const currentDate = new Date(creationDate.getTime() + worldTime * 1000);
      const yearOffset = (globalThis as any).CONFIG?.PF2E?.worldClock?.[dateTheme]?.yearOffset || 0;
      return currentDate.getUTCFullYear() + yearOffset;
    },

    formatDate(worldTime: number, worldCreatedOn: string, dateTheme: string): string {
      // Replicate PF2e's date formatting
      const year = calculations.calculateYear(worldTime, worldCreatedOn, dateTheme);
      const monthName = calculations.getMonthName(worldTime, worldCreatedOn, dateTheme);
      const weekday = calculations.getWeekday(worldTime, worldCreatedOn, dateTheme);

      const creationDate = new Date(worldCreatedOn);
      const currentDate = new Date(creationDate.getTime() + worldTime * 1000);
      const day = currentDate.getUTCDate();

      // Add ordinal suffix
      const ordinal = getOrdinalSuffix(day);

      return `${weekday}, ${day}${ordinal} ${monthName} ${year} AR`;
    },

    getMonthName(worldTime: number, worldCreatedOn: string, _dateTheme: string): string {
      const creationDate = new Date(worldCreatedOn);
      const currentDate = new Date(creationDate.getTime() + worldTime * 1000);
      const monthNames = [
        'Abadius',
        'Calistril',
        'Pharast',
        'Gozren',
        'Desnus',
        'Sarenith',
        'Erastus',
        'Arodus',
        'Rova',
        'Lamashan',
        'Neth',
        'Kuthona',
      ];
      return monthNames[currentDate.getUTCMonth()];
    },

    getWeekday(worldTime: number, worldCreatedOn: string, _dateTheme: string): string {
      const creationDate = new Date(worldCreatedOn);
      const currentDate = new Date(creationDate.getTime() + worldTime * 1000);
      const weekdays = ['Sunday', 'Moonday', 'Toilday', 'Wealday', 'Oathday', 'Fireday', 'Starday'];
      return weekdays[currentDate.getUTCDay()];
    },
  };

  return calculations;
}

// Note: Use the actual golarion-pf2e.json calendar file in tests instead of creating duplicate data.
// Import with: import golarionCalendar from '../calendars/golarion-pf2e.json';
// Cast with: const calendar = golarionCalendar as unknown as SeasonsStarsCalendar;

/**
 * Helper function to get ordinal suffix for days
 */
function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  const lastDigit = day % 10;
  switch (lastDigit) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/**
 * Validate that PF2e environment is properly set up
 */
export function validatePF2eEnvironment(): boolean {
  try {
    // Check required game objects
    if (!(globalThis as any).game?.system?.id || (globalThis as any).game.system.id !== 'pf2e') {
      throw new Error('PF2e system ID not set');
    }

    if (!(globalThis as any).game?.pf2e?.settings?.worldClock) {
      throw new Error('PF2e world clock settings not configured');
    }

    if ((globalThis as any).game?.time?.worldTime === undefined) {
      throw new Error('Foundry world time not set');
    }

    if (!(globalThis as any).CONFIG?.PF2E?.worldClock) {
      throw new Error('PF2e CONFIG constants not set');
    }

    return true;
  } catch (error: unknown) {
    console.error('PF2e environment validation failed:', error);
    return false;
  }
}
