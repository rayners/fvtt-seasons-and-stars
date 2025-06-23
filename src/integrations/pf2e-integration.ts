/**
 * PF2e Game System Integration for Seasons & Stars
 *
 * This module contains ALL PF2e-specific logic extracted from the core S&S files.
 * It registers itself via the generic hook system and provides PF2e-specific
 * time sources, debugging utilities, and monitoring capabilities.
 */

import { Logger } from '../core/logger';

/**
 * PF2e-specific time source interface
 */
interface PF2eTimeSource {
  name: string;
  getValue: () => number | null;
  description: string;
}

/**
 * PF2e Integration Manager
 *
 * Handles all PF2e-specific functionality in isolation from core S&S code.
 * Registers capabilities via generic hooks when PF2e system is detected.
 */
export class PF2eIntegration {
  private static instance: PF2eIntegration | null = null;
  private timeSources: PF2eTimeSource[] = [];
  private syncMonitorInterval: number | null = null;
  private isActive: boolean = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Initialize PF2e integration if PF2e system is present
   */
  static initialize(): PF2eIntegration | null {
    if (PF2eIntegration.instance) {
      return PF2eIntegration.instance;
    }

    // Only create if PF2e system is detected
    if (PF2eIntegration.detectPF2eSystem()) {
      PF2eIntegration.instance = new PF2eIntegration();
      PF2eIntegration.instance.activate();
      return PF2eIntegration.instance;
    }

    return null;
  }

  /**
   * Detect if PF2e system is present
   */
  private static detectPF2eSystem(): boolean {
    const pf2eSystem = game.system?.id === 'pf2e';
    const pf2eModule = game.modules?.get('pf2e');

    return pf2eSystem || pf2eModule?.active === true;
  }

  /**
   * Activate PF2e integration and register with S&S core
   */
  private activate(): void {
    if (this.isActive) return;

    Logger.info('PF2e system detected - enabling enhanced compatibility mode');

    // Log PF2e time system information for debugging
    this.logPF2eTimeSystem();

    // Register PF2e time sources with S&S core
    this.registerTimeSources();

    // Set up PF2e-specific hooks
    this.setupPF2eHooks();

    // Start monitoring if needed
    this.startTimeMonitoring();

    this.isActive = true;
  }

  /**
   * Log PF2e time system information for debugging
   */
  private logPF2eTimeSystem(): void {
    Logger.debug('PF2e Time System Analysis:');
    Logger.debug(`  game.time.worldTime: ${game.time?.worldTime || 'undefined'}`);
    Logger.debug(`  game.system.id: ${game.system?.id || 'undefined'}`);

    // Check for PF2e-specific time properties
    if ((game as any).pf2e) {
      Logger.debug('  PF2e game object found:', Object.keys((game as any).pf2e));
    }

    // Check for PF2e World Clock if it exists
    if ((game as any).worldClock) {
      Logger.debug('  World Clock found:', (game as any).worldClock);
    }

    // Check for common PF2e time-related settings using proper settings API
    const commonPF2eTimeSettings = [
      'pf2e.worldClock',
      'pf2e.timeZone',
      'pf2e.calendar',
      'pf2e.worldTime',
      'pf2e.timeManagement',
    ];

    for (const settingKey of commonPF2eTimeSettings) {
      try {
        const [module, setting] = settingKey.split('.');
        const value = game.settings?.get(module, setting);
        if (value !== undefined) {
          Logger.debug(`  PF2e setting found: ${settingKey}`, value);
        }
      } catch (error) {
        // Setting doesn't exist or not accessible, which is normal
      }
    }
  }

  /**
   * Register PF2e time sources with S&S core via generic hook
   */
  private registerTimeSources(): void {
    // Define PF2e time sources
    this.timeSources = [
      {
        name: 'pf2e-world-clock',
        getValue: () => (game as any).pf2e?.worldClock?.currentTime || null,
        description: 'PF2e system world clock',
      },
      {
        name: 'world-clock-module',
        getValue: () => (game as any).worldClock?.currentTime || null,
        description: 'PF2e World Clock module',
      },
    ];

    // Note: Registration now happens via direct method call when system is detected
  }

  /**
   * Set up PF2e-specific hooks (only called when PF2e is detected)
   */
  private setupPF2eHooks(): void {
    // PF2e-specific setup complete - monitoring hooks are registered at module level
    Logger.debug('PF2e-specific hook setup complete');
  }

  /**
   * Start time monitoring for PF2e synchronization
   */
  private startTimeMonitoring(): void {
    // Time monitoring is handled at module level for better independence
    Logger.debug('PF2e time monitoring enabled');
  }

  /**
   * Check and log PF2e time synchronization status
   */
  checkPF2eTimeSync(): void {
    const foundryTime = game.time?.worldTime || 0;
    let pf2eTime: number | null = null;

    // Check various PF2e time sources
    for (const source of this.timeSources) {
      const timeValue = source.getValue();
      if (timeValue !== null) {
        pf2eTime = timeValue;
        break;
      }
    }

    // Also check for PF2e settings
    const pf2eTimeSettings = [
      'pf2e.worldClock.currentTime',
      'pf2e.time.worldTime',
      'pf2e.calendar.currentTime',
      'world-clock.currentTime',
    ];

    if (pf2eTime === null) {
      for (const settingKey of pf2eTimeSettings) {
        try {
          const timeValue = game.settings?.get('pf2e', settingKey.split('.')[1]);
          if (typeof timeValue === 'number') {
            Logger.debug(`Found PF2e time in setting ${settingKey}: ${timeValue}`);
            pf2eTime = timeValue;
            break;
          }
        } catch (error) {
          // Setting doesn't exist, continue to next
        }
      }
    }

    if (pf2eTime !== null && pf2eTime !== foundryTime) {
      Logger.debug('PF2e time sync status:', {
        foundryTime,
        pf2eTime,
        difference: pf2eTime - foundryTime,
        percentDiff: Math.abs((pf2eTime - foundryTime) / Math.max(foundryTime, 1)) * 100,
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
   * Debug worldTime interpretation - comprehensive diagnostics
   * (Moved from calendar-engine.ts)
   */
  private debugWorldTimeInterpretation(engine: any, worldTime: number): any {
    const calendar = engine.getCalendar();
    const worldTimeConfig = calendar.worldTime;

    const debugInfo = {
      input: {
        worldTime,
        calendarId: calendar.id,
        interpretation: worldTimeConfig?.interpretation || 'epoch-based',
        epochYear: worldTimeConfig?.epochYear || calendar.year.epoch,
        currentYear: worldTimeConfig?.currentYear || calendar.year.currentYear,
      },
      calculations: {} as any,
      result: {} as any,
    };

    // Step 1: Show worldTime adjustment calculation
    const adjustedWorldTime = engine.adjustWorldTimeForInterpretation(worldTime);
    debugInfo.calculations.adjustedWorldTime = adjustedWorldTime;
    debugInfo.calculations.adjustmentDelta = adjustedWorldTime - worldTime;

    // Step 2: Convert to total seconds and calculate days
    const totalSeconds = Math.abs(adjustedWorldTime);
    const secondsPerDay =
      calendar.time.hoursInDay * calendar.time.minutesInHour * calendar.time.secondsInMinute;
    const totalDays = Math.floor(totalSeconds / secondsPerDay);
    const secondsInDay = totalSeconds % secondsPerDay;

    debugInfo.calculations.totalSeconds = totalSeconds;
    debugInfo.calculations.secondsPerDay = secondsPerDay;
    debugInfo.calculations.totalDays = totalDays;
    debugInfo.calculations.secondsInDay = secondsInDay;

    // Step 3: Convert to date and get final result
    const result = engine.worldTimeToDate(worldTime);
    debugInfo.result = {
      year: result.year,
      month: result.month,
      day: result.day,
      weekday: result.weekday,
      formattedDate: `${result.day} ${calendar.months[result.month - 1]?.name}, ${result.year}`,
    };

    // Step 4: Add epoch calculation if using year-offset interpretation
    if (worldTimeConfig?.interpretation === 'year-offset') {
      const epochYear = worldTimeConfig.epochYear || calendar.year.epoch;
      const currentYear = worldTimeConfig.currentYear || calendar.year.currentYear;
      const yearDifference = currentYear - epochYear;

      debugInfo.calculations.epochCalculation = {
        yearDifference,
        totalEpochOffsetSeconds: yearDifference * 365.25 * secondsPerDay, // Approximate
        yearLengths: [], // Simplified for debug purposes
      };
    }

    return debugInfo;
  }

  /**
   * Compare S&S calculation with expected PF2e calculation
   * (Moved from calendar-engine.ts)
   */
  private compareWithPF2eCalculation(engine: any, worldTime: number): any {
    const ssResult = this.debugWorldTimeInterpretation(engine, worldTime);

    // Simplified PF2e calculation (based on typical Golarion setup)
    const currentRealYear = new Date().getFullYear();
    const pf2eYear = currentRealYear + 2700; // Common PF2e offset

    // Basic PF2e-style calculation (simplified)
    const secondsPerDay = 86400; // Standard 24-hour day
    const days = Math.floor(Math.abs(worldTime) / secondsPerDay);
    const timeInDay = Math.abs(worldTime) % secondsPerDay;
    const hours = Math.floor(timeInDay / 3600);
    const minutes = Math.floor((timeInDay % 3600) / 60);
    const seconds = timeInDay % 60;

    // Approximate PF2e date calculation (very simplified)
    const approximateYear = pf2eYear;
    const approximateMonth = days % 365 > 300 ? 12 : Math.floor((days % 365) / 30) + 1;
    const approximateDay = (days % 30) + 1;

    const approximatePF2e = {
      year: approximateYear,
      month: approximateMonth,
      day: approximateDay,
      hours,
      minutes,
      seconds,
      formattedDate: `${approximateDay} Month${approximateMonth}, ${approximateYear}`,
    };

    // Calculate differences
    const differences = {
      yearDiff: Math.abs(ssResult.result.year - approximatePF2e.year),
      monthDiff: Math.abs(ssResult.result.month - approximatePF2e.month),
      dayDiff: Math.abs(ssResult.result.day - approximatePF2e.day),
      hourDiff: 0, // Simplified
    };

    return {
      worldTime,
      seasonsStars: ssResult.result,
      approximatePF2e,
      differences,
      ssDebugInfo: ssResult,
    };
  }

  /**
   * Get PF2e-specific world time if available
   */
  getPF2eWorldTime(): number | null {
    // Try all registered PF2e time sources
    for (const source of this.timeSources) {
      const timeValue = source.getValue();
      if (timeValue !== null) {
        return timeValue;
      }
    }

    // Check for any PF2e time data in game object
    if ((game as any).pf2e) {
      const pf2eData = (game as any).pf2e;
      if (pf2eData.time || pf2eData.worldTime || pf2eData.currentTime) {
        const timeValue = pf2eData.time || pf2eData.worldTime || pf2eData.currentTime;
        Logger.debug(`Found PF2e time in game.pf2e: ${timeValue}`);
        return timeValue;
      }
    }

    // If no PF2e-specific time found, return null to use default
    return null;
  }

  /**
   * Public access to debug methods for testing
   */
  getDebugWorldTimeInterpretation(engine: any, worldTime: number): any {
    return this.debugWorldTimeInterpretation(engine, worldTime);
  }

  /**
   * Public access to comparison method for testing
   */
  getCompareWithPF2eCalculation(engine: any, worldTime: number): any {
    return this.compareWithPF2eCalculation(engine, worldTime);
  }

  /**
   * Check if PF2e integration is active
   */
  static isActive(): boolean {
    return PF2eIntegration.instance?.isActive || false;
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

// Register independent hooks for PF2e integration
// These operate completely independently of core S&S module and are no-ops in non-PF2e games

// Listen for PF2e-specific time updates (no-op if PF2e not present)
Hooks.on('renderApplication', (app: any, html: any) => {
  // Only log if PF2e integration is active
  const integration = PF2eIntegration.getInstance();
  if (!integration?.isIntegrationActive()) return;

  // Check if this is a PF2e World Clock or time-related application
  if (
    app.constructor.name?.includes('WorldClock') ||
    app.constructor.name?.includes('Time') ||
    app.title?.includes('World Clock')
  ) {
    Logger.debug('PF2e time application detected:', {
      name: app.constructor.name,
      title: app.title,
      data: app.data,
    });
  }
});

// Listen for any time-related hooks (harmless in non-PF2e games)
Hooks.on('updateWorldTime', (newTime: number, delta: number) => {
  const integration = PF2eIntegration.getInstance();
  if (!integration?.isIntegrationActive()) return;

  Logger.debug('PF2e updateWorldTime hook:', { newTime, delta, source: 'PF2e' });
});

// Listen for PF2e-specific time update hooks (no-op if not PF2e)
Hooks.on('pf2e:timeChanged', (data: any) => {
  const integration = PF2eIntegration.getInstance();
  if (!integration?.isIntegrationActive()) return;

  Logger.debug('PF2e time changed hook:', data);
});

// Listen for World Clock updates (no-op if World Clock not present)
Hooks.on('worldClockUpdate', (data: any) => {
  const integration = PF2eIntegration.getInstance();
  if (!integration?.isIntegrationActive()) return;

  Logger.debug('World Clock update hook:', data);
});

// Start time monitoring when ready (only if PF2e integration is active)
Hooks.on('ready', () => {
  const integration = PF2eIntegration.getInstance();
  if (!integration?.isIntegrationActive()) return;

  // Start periodic time sync checking
  const syncInterval = setInterval(() => {
    integration.checkPF2eTimeSync();
  }, 30000); // Check every 30 seconds

  // Store interval for cleanup
  (integration as any).syncMonitorInterval = syncInterval;
});

// Register independent init hook for PF2e integration
Hooks.once('init', () => {
  // Initialize PF2e integration when game.system is available
  PF2eIntegration.initialize();
});

// Register PF2e-specific hooks when system is detected
// Core S&S passes the compatibility manager instance for direct registration
Hooks.on('seasons-stars:pf2e:systemDetected', (compatibilityManager: any) => {
  Logger.debug('PF2e system detected - registering directly with compatibility manager');

  // Register PF2e time source directly with the compatibility manager
  const pf2eTimeSourceFunction = (): number | null => {
    // Try all PF2e time sources in order
    const timeSources = [
      () => (game as any).pf2e?.worldClock?.currentTime || null,
      () => (game as any).worldClock?.currentTime || null,
    ];

    for (const source of timeSources) {
      const timeValue = source();
      if (timeValue !== null) {
        return timeValue;
      }
    }

    // Check PF2e settings for time values
    const pf2eTimeSettings = [
      'pf2e.worldClock.currentTime',
      'pf2e.time.worldTime',
      'pf2e.calendar.currentTime',
      'world-clock.currentTime',
    ];

    for (const settingKey of pf2eTimeSettings) {
      try {
        const timeValue = game.settings?.get('pf2e', settingKey.split('.')[1]);
        if (typeof timeValue === 'number') {
          return timeValue;
        }
      } catch (error) {
        // Setting doesn't exist, continue to next
      }
    }

    return null;
  };

  // Register directly with the compatibility manager (no hooks needed)
  compatibilityManager.registerTimeSource('pf2e', pf2eTimeSourceFunction);
});
