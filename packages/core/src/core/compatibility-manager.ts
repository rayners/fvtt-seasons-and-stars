/**
 * System Compatibility Manager for Seasons & Stars
 *
 * Provides extensible compatibility layer for different game systems that may
 * calculate dates/weekdays differently than the standard fantasy calendar math.
 *
 * Supports both calendar-defined compatibility (in JSON) and hook-based runtime
 * registration for external modules.
 */

import { Logger } from './logger';

export interface SystemCompatibilityAdjustment {
  /** Weekday offset to apply (e.g., +5 to shift weekday calculation) */
  weekdayOffset?: number;

  /** Date formatting adjustments */
  dateFormatting?: {
    monthOffset?: number;
    dayOffset?: number;
  };

  /** Description of what this adjustment does */
  description?: string;

  /** Module/system that provides this compatibility */
  provider?: string;
}

export interface SystemCompatibilityRegistry {
  /** Register compatibility for a specific system and calendar combination */
  register(systemId: string, calendarId: string, adjustment: SystemCompatibilityAdjustment): void;

  /** Get compatibility adjustment for system/calendar combination */
  get(systemId: string, calendarId: string): SystemCompatibilityAdjustment | null;

  /** Check if compatibility exists for system/calendar */
  has(systemId: string, calendarId: string): boolean;

  /** List all registered compatibilities */
  list(): Array<{
    systemId: string;
    calendarId: string;
    adjustment: SystemCompatibilityAdjustment;
  }>;
}

/**
 * Manages system compatibility adjustments for calendar calculations
 */
export class CompatibilityManager {
  private hookRegistry: Map<string, SystemCompatibilityAdjustment> = new Map();

  private timeSourceRegistry: Map<string, () => number | null> = new Map();

  private dataProviderRegistry: Map<string, Map<string, () => any>> = new Map();

  constructor() {
    this.initializeHookSystem();
    this.initializeGenericHooks();
    this.initializeSystemSpecificHooks();
    this.initializeSystemDetection();
  }

  /**
   * Initialize hook system for external module registration
   */
  private initializeHookSystem(): void {
    // Create registry interface for hook callbacks
    const registry: SystemCompatibilityRegistry = {
      register: (
        systemId: string,
        calendarId: string,
        adjustment: SystemCompatibilityAdjustment
      ) => {
        const key = `${systemId}:${calendarId}`;
        this.hookRegistry.set(key, adjustment);
        Logger.debug(`Registered compatibility: ${systemId} + ${calendarId}`, adjustment);
      },

      get: (systemId: string, calendarId: string) => {
        const key = `${systemId}:${calendarId}`;
        return this.hookRegistry.get(key) || null;
      },

      has: (systemId: string, calendarId: string) => {
        const key = `${systemId}:${calendarId}`;
        return this.hookRegistry.has(key);
      },

      list: () => {
        const result: Array<{
          systemId: string;
          calendarId: string;
          adjustment: SystemCompatibilityAdjustment;
        }> = [];
        for (const [key, adjustment] of this.hookRegistry.entries()) {
          const [systemId, calendarId] = key.split(':');
          result.push({ systemId, calendarId, adjustment });
        }
        return result;
      },
    };

    // Emit hook to allow external modules to register compatibility
    Hooks.callAll('seasons-stars:registerCompatibility', registry);
  }

  /**
   * Initialize generic hooks for backward compatibility
   */
  private initializeGenericHooks(): void {
    // Reserved for future generic hooks if needed
  }

  /**
   * Initialize system-specific hooks for compatibility registration
   */
  private initializeSystemSpecificHooks(): void {
    // System-specific hooks are now minimal since we use direct registration
    // Only keeping compatibility hooks for potential future use
  }

  /**
   * Initialize system detection to emit appropriate system-specific hooks
   */
  private initializeSystemDetection(): void {
    // Wait for Foundry to be ready so game.system is available
    Hooks.once('ready', () => {
      const currentSystem = game.system?.id;
      if (currentSystem) {
        Logger.debug(`Detected system: ${currentSystem}, triggering system-specific hooks`);

        // Trigger system-specific hook initialization for detected system
        // Pass the compatibility manager instance for direct registration
        Hooks.callAll(`seasons-stars:${currentSystem}:systemDetected`, this);
      }
    });
  }

  /**
   * Get compatibility adjustment for current system and calendar
   */
  getCompatibilityAdjustment(
    calendar: any,
    systemId?: string
  ): SystemCompatibilityAdjustment | null {
    const currentSystemId = systemId || (typeof game !== 'undefined' && game?.system?.id);
    if (!currentSystemId || !calendar) return null;

    // 1. Check calendar-defined compatibility first
    const calendarCompat = calendar.compatibility?.[currentSystemId];
    if (calendarCompat) {
      return {
        ...calendarCompat,
        provider: 'calendar-defined',
      };
    }

    // 2. Check hook-registered compatibility
    const key = `${currentSystemId}:${calendar.id}`;
    const hookCompat = this.hookRegistry.get(key);
    if (hookCompat) {
      return {
        ...hookCompat,
        provider: hookCompat.provider || 'hook-registered',
      };
    }

    return null;
  }

  /**
   * Apply weekday compatibility adjustment
   */
  applyWeekdayAdjustment(weekday: number, calendar: any, systemId?: string): number {
    const adjustment = this.getCompatibilityAdjustment(calendar, systemId);

    if (adjustment?.weekdayOffset) {
      const weekdayCount = calendar.weekdays?.length || 7;
      let adjustedWeekday = (weekday + adjustment.weekdayOffset) % weekdayCount;

      // Handle negative results
      if (adjustedWeekday < 0) {
        adjustedWeekday += weekdayCount;
      }

      return adjustedWeekday;
    }

    return weekday;
  }

  /**
   * Apply date formatting adjustments
   */
  applyDateFormatAdjustment(date: any, calendar: any, systemId?: string): any {
    const adjustment = this.getCompatibilityAdjustment(calendar, systemId);

    if (adjustment?.dateFormatting) {
      const formatting = adjustment.dateFormatting;
      return {
        ...date,
        month: formatting.monthOffset ? date.month + formatting.monthOffset : date.month,
        day: formatting.dayOffset ? date.day + formatting.dayOffset : date.day,
      };
    }

    return date;
  }

  /**
   * Get debug information about active compatibility adjustments
   */
  getDebugInfo(calendar: any, systemId?: string): string {
    const currentSystemId = systemId || game.system?.id;
    const adjustment = this.getCompatibilityAdjustment(calendar, currentSystemId);

    if (!adjustment) {
      return `No compatibility adjustments for ${currentSystemId} + ${calendar?.id || 'unknown'}`;
    }

    const parts: string[] = [];
    if (adjustment.weekdayOffset) {
      parts.push(`weekday offset: +${adjustment.weekdayOffset}`);
    }
    if (adjustment.dateFormatting) {
      parts.push('date formatting adjustments');
    }

    return `${currentSystemId} + ${calendar.id}: ${parts.join(', ')} (${adjustment.provider})`;
  }

  /**
   * Register a time source for a specific system (direct registration)
   */
  registerTimeSource(systemId: string, sourceFunction: () => number | null): void {
    this.timeSourceRegistry.set(systemId, sourceFunction);
    Logger.debug(`Registered time source for system: ${systemId}`);
  }

  /**
   * Get external time source value by system ID
   */
  getExternalTimeSource(systemId: string): number | null {
    const timeSourceFunction = this.timeSourceRegistry.get(systemId);
    if (timeSourceFunction) {
      try {
        return timeSourceFunction();
      } catch (error) {
        Logger.warn(`Error getting time from source ${systemId}:`, error);
        return null;
      }
    }
    return null;
  }

  /**
   * Get all available external time sources
   */
  getAvailableTimeSources(): string[] {
    return Array.from(this.timeSourceRegistry.keys());
  }

  /**
   * Register a data provider for a specific system and key
   */
  registerDataProvider<T>(systemId: string, key: string, provider: () => T): void {
    if (!this.dataProviderRegistry.has(systemId)) {
      this.dataProviderRegistry.set(systemId, new Map());
    }
    this.dataProviderRegistry.get(systemId)!.set(key, provider);
    Logger.debug(`Registered data provider: ${systemId}.${key}`);
  }

  /**
   * Get system-specific data by calling the registered provider
   */
  getSystemData<T>(systemId: string, key: string): T | null {
    const systemProviders = this.dataProviderRegistry.get(systemId);
    if (!systemProviders) {
      return null;
    }

    const provider = systemProviders.get(key);
    if (!provider) {
      return null;
    }

    try {
      return provider() as T;
    } catch (error) {
      Logger.warn(`Error getting system data ${systemId}.${key}:`, error);
      return null;
    }
  }

  /**
   * Check if a data provider exists for a system and key
   */
  hasDataProvider(systemId: string, key: string): boolean {
    const systemProviders = this.dataProviderRegistry.get(systemId);
    return systemProviders?.has(key) || false;
  }

  /**
   * Get all available data providers for a system
   */
  getAvailableDataProviders(systemId: string): string[] {
    const systemProviders = this.dataProviderRegistry.get(systemId);
    return systemProviders ? Array.from(systemProviders.keys()) : [];
  }

  /**
   * List all available compatibility adjustments for debugging
   */
  debugListAll(): void {
    Logger.debug('All registered compatibility adjustments:');

    // Hook-registered compatibility
    for (const [key, adjustment] of this.hookRegistry.entries()) {
      Logger.debug(`  Hook: ${key}`, adjustment);
    }

    // Registered time sources
    Logger.debug('Registered time sources:');
    for (const sourceId of this.timeSourceRegistry.keys()) {
      Logger.debug(`  Time source: ${sourceId}`);
    }

    // Registered data providers
    Logger.debug('Registered data providers:');
    for (const [systemId, providers] of this.dataProviderRegistry.entries()) {
      for (const key of providers.keys()) {
        Logger.debug(`  Data provider: ${systemId}.${key}`);
      }
    }

    // Note: Calendar-defined compatibility is checked dynamically per calendar
    Logger.debug('  Calendar-defined compatibility is checked per calendar load');
  }
}

// Global instance
export const compatibilityManager = new CompatibilityManager();
