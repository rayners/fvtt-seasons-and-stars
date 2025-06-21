/**
 * Type guard functions for Seasons & Stars interfaces
 */

import type { CalendarManagerInterface, NotesManagerInterface } from './foundry-extensions';

export function isCalendarManager(obj: unknown): obj is CalendarManagerInterface {
  return !!(
    obj &&
    typeof obj === 'object' &&
    'getCurrentDate' in obj &&
    'getActiveCalendar' in obj
  );
}

export function isNotesManager(obj: unknown): obj is NotesManagerInterface {
  return !!(obj && typeof obj === 'object' && 'createNote' in obj && 'storage' in obj);
}
