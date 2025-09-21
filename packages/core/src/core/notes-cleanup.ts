import { Logger } from './logger';
import { CalendarWidget } from '../ui/calendar-widget';
import { CalendarMiniWidget } from '../ui/calendar-mini-widget';
import { CalendarGridWidget } from '../ui/calendar-grid-widget';
import type { NotesManager } from './notes-manager';

type HooksSystem = Pick<typeof Hooks, 'on' | 'callAll'> & Partial<Pick<typeof Hooks, 'off'>>;

/**
 * Register hooks to clean up notes when their journal entries are deleted externally.
 */
export function registerNotesCleanupHooks(
  notesManager: NotesManager,
  hooks: HooksSystem = Hooks
): () => void {
  const handleJournalDeletion = async (
    journal: JournalEntry,
    _options: Record<string, unknown>,
    _userId: string
  ) => {
    Logger.debug('Journal deletion detected', {
      journalId: journal.id,
      journalName: journal.name,
      isCalendarNote: !!journal.flags?.['seasons-and-stars']?.calendarNote,
    });

    try {
      // Check if this was a calendar note
      const flags = journal.flags?.['seasons-and-stars'];
      if (flags?.calendarNote) {
        Logger.info('Calendar note deleted externally, cleaning up storage', {
          noteId: journal.id,
          noteName: journal.name,
        });

        // Remove from our storage system
        if (notesManager?.storage) {
          await notesManager.storage.removeNote(journal.id);
          Logger.debug('Note removed from storage');
        }

        // Emit our own deletion hook for UI updates
        hooks.callAll('seasons-stars:noteDeleted', journal.id);

        // Refresh calendar widgets to remove the note from display
        const calendarWidget = CalendarWidget.getInstance?.();
        if (calendarWidget?.rendered) {
          calendarWidget.render();
        }
        const miniWidget = CalendarMiniWidget.getInstance?.();
        if (miniWidget?.rendered) {
          miniWidget.render();
        }
        const gridWidget = CalendarGridWidget.getInstance?.();
        if (gridWidget?.rendered) {
          gridWidget.render();
        }
      }
    } catch (error) {
      Logger.error(
        'Failed to clean up deleted calendar note',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  };

  hooks.on('deleteJournalEntry', handleJournalDeletion);
  Logger.debug('Notes cleanup hooks registered');

  return () => {
    if (hooks.off) {
      hooks.off('deleteJournalEntry', handleJournalDeletion);
    }
  };
}
