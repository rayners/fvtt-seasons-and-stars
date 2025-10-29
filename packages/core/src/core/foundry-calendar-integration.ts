/**
 * Foundry Calendar Integration
 *
 * Coordinates the integration between Seasons & Stars and Foundry's native calendar system.
 * Sets CONFIG.time.worldCalendarConfig and CONFIG.time.worldCalendarClass.
 */

import type { CalendarManager } from './calendar-manager';
import { SeasonsStarsFoundryCalendar } from './foundry-calendar-class';
import { convertToFoundryCalendarConfig } from './foundry-calendar-config';
import { Logger } from './logger';

// Global reference to the calendar class instance
let globalCalendarInstance: SeasonsStarsFoundryCalendar | null = null;

/**
 * Initialize Foundry calendar integration
 *
 * This should be called as early as possible (during init hook) to set up
 * CONFIG.time.worldCalendarClass so Foundry can instantiate it.
 *
 * @example
 * ```typescript
 * // In init hook
 * initializeFoundryCalendarClass();
 * ```
 */
export function initializeFoundryCalendarClass(): void {
  Logger.debug('Setting CONFIG.time.worldCalendarClass');

  // Set the calendar class - Foundry will instantiate it
  const config = CONFIG as any;
  if (!config.time) {
    config.time = {};
  }
  config.time.worldCalendarClass = SeasonsStarsFoundryCalendar;

  Logger.debug('Foundry calendar class configured');
}

/**
 * Update Foundry calendar configuration with the active calendar
 *
 * This should be called:
 * 1. After the active calendar is set during initialization
 * 2. When the calendar changes
 *
 * @param manager - The calendar manager instance
 *
 * @example
 * ```typescript
 * // After setting active calendar
 * await manager.setActiveCalendar('gregorian');
 * updateFoundryCalendarConfig(manager);
 *
 * // In calendar changed hook
 * Hooks.on('seasons-stars:calendarChanged', () => {
 *   updateFoundryCalendarConfig(manager);
 * });
 * ```
 */
export function updateFoundryCalendarConfig(manager: CalendarManager): void {
  const calendar = manager.getActiveCalendar();
  if (!calendar) {
    Logger.warn('No active calendar to update Foundry config');
    return;
  }

  Logger.debug(`Updating CONFIG.time.worldCalendarConfig for calendar: ${calendar.id}`);

  // Convert S&S calendar to Foundry format
  const foundryConfig = convertToFoundryCalendarConfig(calendar);

  // Set the config
  const config = CONFIG as any;
  if (!config.time) {
    config.time = {};
  }
  config.time.worldCalendarConfig = foundryConfig;

  Logger.debug('Foundry calendar config updated:', foundryConfig.name);

  // Also update the calendar class instance with the manager reference
  // Foundry may have already instantiated the calendar class
  if (config.time.calendar instanceof SeasonsStarsFoundryCalendar) {
    config.time.calendar.setManager(manager);
    globalCalendarInstance = config.time.calendar;
    Logger.debug('Calendar class instance updated with manager reference');
  } else {
    // If Foundry hasn't instantiated it yet, create one and set the manager
    if (!globalCalendarInstance) {
      globalCalendarInstance = new SeasonsStarsFoundryCalendar();
    }
    globalCalendarInstance.setManager(manager);
    config.time.calendar = globalCalendarInstance;
    Logger.debug('Calendar class instance created and configured');
  }
}

/**
 * Get the global calendar instance
 * Useful for testing and debugging
 *
 * @returns The global calendar instance or null
 */
export function getGlobalCalendarInstance(): SeasonsStarsFoundryCalendar | null {
  return globalCalendarInstance;
}
