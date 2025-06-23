/**
 * System Compatibility Manager for Seasons & Stars
 *
 * Provides extensible compatibility layer for different game systems that may
 * calculate dates/weekdays differently than the standard fantasy calendar math.
 *
 * Supports both calendar-defined compatibility (in JSON) and hook-based runtime
 * registration for external modules.
 */

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
  private engineExtensions: Map<string, Function> = new Map();

  constructor() {
    this.initializeHookSystem();
    this.initializeGenericHooks();
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
        console.log(`[S&S] Registered compatibility: ${systemId} + ${calendarId}`, adjustment);
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
   * Initialize generic hooks for time sources and engine extensions
   */
  private initializeGenericHooks(): void {
    // Hook for registering external time sources
    Hooks.on('seasons-stars:registerTimeSource', (data: any) => {
      if (data.systemId && data.sourceFunction) {
        this.timeSourceRegistry.set(data.systemId, data.sourceFunction);
        console.log(`[S&S] Registered time source for system: ${data.systemId}`);
      }

      if (data.register && typeof data.register === 'function') {
        // Provide the registration function for external use
        data.register = (sourceId: string, sourceFunction: () => number | null) => {
          this.timeSourceRegistry.set(sourceId, sourceFunction);
          console.log(`[S&S] Registered time source: ${sourceId}`);
        };
      }
    });

    // Hook for extending calendar engine with additional methods
    Hooks.on('seasons-stars:extendCalendarEngine', (data: any) => {
      if (data.methodName && data.implementation) {
        this.engineExtensions.set(data.methodName, data.implementation);
        console.log(`[S&S] Registered engine extension: ${data.methodName}`);
      }

      if (data.addMethod && typeof data.addMethod === 'function') {
        // Provide the registration function for external use
        data.addMethod = (methodName: string, implementation: Function) => {
          this.engineExtensions.set(methodName, implementation);
          console.log(`[S&S] Registered engine extension: ${methodName}`);
        };
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
    const currentSystemId = systemId || game.system?.id;
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
   * Get external time source value by system ID
   */
  getExternalTimeSource(systemId: string): number | null {
    const timeSourceFunction = this.timeSourceRegistry.get(systemId);
    if (timeSourceFunction) {
      try {
        return timeSourceFunction();
      } catch (error) {
        console.warn(`[S&S] Error getting time from source ${systemId}:`, error);
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
   * Get engine extension method by name
   */
  getEngineExtension(methodName: string): Function | null {
    return this.engineExtensions.get(methodName) || null;
  }

  /**
   * Get all available engine extensions
   */
  getAvailableEngineExtensions(): string[] {
    return Array.from(this.engineExtensions.keys());
  }

  /**
   * List all available compatibility adjustments for debugging
   */
  debugListAll(): void {
    console.log('[S&S] All registered compatibility adjustments:');

    // Hook-registered compatibility
    for (const [key, adjustment] of this.hookRegistry.entries()) {
      console.log(`  Hook: ${key}`, adjustment);
    }

    // Registered time sources
    console.log('[S&S] Registered time sources:');
    for (const sourceId of this.timeSourceRegistry.keys()) {
      console.log(`  Time source: ${sourceId}`);
    }

    // Registered engine extensions
    console.log('[S&S] Registered engine extensions:');
    for (const methodName of this.engineExtensions.keys()) {
      console.log(`  Engine method: ${methodName}`);
    }

    // Note: Calendar-defined compatibility is checked dynamically per calendar
    console.log('  Calendar-defined compatibility is checked per calendar load');
  }
}

// Global instance
export const compatibilityManager = new CompatibilityManager();
