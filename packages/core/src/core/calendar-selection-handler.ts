/**
 * Calendar selection handling for settings onChange handlers
 *
 * Extracted from module.ts to improve testability and maintainability.
 * This module handles the logic for when a user selects a calendar from the dropdown.
 */

import { Logger } from './logger';
import type { CalendarManager } from './calendar-manager';
import { saveCalendarDataForSync } from '../ui/calendar-file-helpers';

/**
 * Handle calendar selection from settings onChange handler
 *
 * This function:
 * 1. Clears the activeCalendarFile setting (GM only)
 * 2. Sets the active calendar without re-saving to settings (to avoid recursion)
 * 3. Caches the calendar data for synchronous loading on next reload
 *
 * @param calendarId The calendar ID selected by the user
 * @param manager The calendar manager instance
 * @returns Promise that resolves when the operation is complete
 */
export async function handleCalendarSelection(
  calendarId: string,
  manager: CalendarManager
): Promise<void> {
  // Validate inputs
  if (!calendarId || calendarId.trim() === '') {
    Logger.debug('Empty calendar ID provided to handleCalendarSelection, ignoring');
    return;
  }

  if (!manager) {
    Logger.error('Calendar manager not available in handleCalendarSelection');
    return;
  }

  // Clear file picker calendar when regular calendar is selected (GM only)
  if (game.user?.isGM) {
    try {
      await game.settings.set('seasons-and-stars', 'activeCalendarFile', '');
    } catch (error) {
      Logger.warn(
        'Failed to clear activeCalendarFile setting:',
        error instanceof Error ? error : new Error(String(error))
      );
      // Continue with calendar selection even if file clearing fails
    }
  }

  // Set the active calendar without saving to settings again
  // (we're already in an onChange handler, so saving would trigger recursion)
  await manager.setActiveCalendar(calendarId, false, 'user-change');

  // CRITICAL: Cache the calendar data for synchronous loading on next reload
  // This prevents race conditions where async calendar loading hasn't finished
  // when initializeSync() runs during the init hook
  const calendarData = manager.getCalendar(calendarId);
  if (calendarData && game.user?.isGM) {
    const saveResult = await saveCalendarDataForSync(calendarData);
    if (!saveResult.success && saveResult.error) {
      Logger.error(`Failed to cache calendar data for ${calendarId}: ${saveResult.error}`);
    } else {
      Logger.debug(`Successfully cached calendar data for ${calendarId}`);
    }
  }
}
