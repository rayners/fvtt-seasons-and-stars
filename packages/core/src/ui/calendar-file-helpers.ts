/**
 * Helper functions for calendar file picker operations
 * Extracted for testability and reusability
 */

import type { SeasonsStarsCalendar } from '../types/calendar.js';
import { Logger } from '../core/logger.js';

/**
 * Result of saving calendar data to settings
 */
export interface CalendarDataSaveResult {
  /** Whether the save was successful */
  success: boolean;
  /** Error message if save failed */
  error?: string;
  /** Whether the user has GM permissions */
  isGM: boolean;
}

/**
 * Save calendar data to settings for synchronization across clients
 * Only GMs can save world settings
 *
 * @param calendar - The calendar data to save
 * @returns Result indicating success/failure and GM status
 */
export async function saveCalendarDataForSync(
  calendar: SeasonsStarsCalendar
): Promise<CalendarDataSaveResult> {
  // Check if settings are available
  if (!game.settings) {
    return {
      success: false,
      error: 'Game settings not available',
      isGM: false,
    };
  }

  // Check if user is GM
  const isGM = game.user?.isGM ?? false;
  if (!isGM) {
    Logger.debug('Skipping calendar data save - user is not GM');
    return {
      success: true, // Not an error - just skipped
      isGM: false,
    };
  }

  try {
    await game.settings.set('seasons-and-stars', 'activeCalendarData', calendar);
    Logger.debug('Cached calendar data for sync to other clients');
    return {
      success: true,
      isGM: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error(`Failed to save calendar data: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage,
      isGM: true,
    };
  }
}

/**
 * Save calendar file path to settings
 * Only GMs can save world settings
 *
 * @param filePath - The file path to save
 * @returns Result indicating success/failure and GM status
 */
export async function saveCalendarFilePath(filePath: string): Promise<CalendarDataSaveResult> {
  // Check if settings are available
  if (!game.settings) {
    return {
      success: false,
      error: 'Game settings not available',
      isGM: false,
    };
  }

  // Check if user is GM
  const isGM = game.user?.isGM ?? false;
  if (!isGM) {
    Logger.debug('Skipping file path save - user is not GM');
    return {
      success: true, // Not an error - just skipped
      isGM: false,
    };
  }

  try {
    await game.settings.set('seasons-and-stars', 'activeCalendarFile', filePath);
    Logger.debug('Saved file path to settings:', filePath);
    return {
      success: true,
      isGM: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error(`Failed to save file path: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage,
      isGM: true,
    };
  }
}

/**
 * Clear conflicting calendar settings
 * When using file-based calendars, the regular activeCalendar setting should be cleared
 * Only GMs can modify world settings
 *
 * @returns Result indicating success/failure and GM status
 */
export async function clearConflictingCalendarSetting(): Promise<CalendarDataSaveResult> {
  // Check if settings are available
  if (!game.settings) {
    return {
      success: false,
      error: 'Game settings not available',
      isGM: false,
    };
  }

  // Check if user is GM
  const isGM = game.user?.isGM ?? false;
  if (!isGM) {
    Logger.debug('Skipping setting clear - user is not GM');
    return {
      success: true, // Not an error - just skipped
      isGM: false,
    };
  }

  try {
    const currentActiveCalendar =
      (game.settings.get('seasons-and-stars', 'activeCalendar') as string) || '';

    if (currentActiveCalendar) {
      await game.settings.set('seasons-and-stars', 'activeCalendar', '');
      Logger.debug('Cleared conflicting activeCalendar setting');
    }

    return {
      success: true,
      isGM: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error(`Failed to clear conflicting setting: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage,
      isGM: true,
    };
  }
}

/**
 * Get the current file path from settings or pending state
 *
 * @param pendingFilePath - Optional pending file path from dialog state
 * @returns The file path to use, or null if none available
 */
export function resolveCalendarFilePath(pendingFilePath: string | null): string | null {
  // Use pending path first (user has selected but not confirmed)
  if (pendingFilePath) {
    return pendingFilePath;
  }

  // Fall back to saved setting
  if (game.settings) {
    const savedPath =
      (game.settings.get('seasons-and-stars', 'activeCalendarFile') as string) || '';
    if (savedPath) {
      return savedPath;
    }
  }

  return null;
}
