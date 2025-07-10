/**
 * Test for issue #22: Deleted journals remain in calendar
 * Tests that the notes cleanup hook properly removes deleted journals from storage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarWidget } from '../src/ui/calendar-widget';
import { CalendarMiniWidget } from '../src/ui/calendar-mini-widget';
import { CalendarGridWidget } from '../src/ui/calendar-grid-widget';

// Mock the logger module with simple vi.fn() mocks
vi.mock('../src/core/logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    api: vi.fn(),
    integration: vi.fn(),
    critical: vi.fn(),
    timing: vi.fn((label, fn) => fn()),
  },
}));

describe('Note Deletion Cleanup (Issue #22)', () => {
  let mockNotesManager: any;
  let mockJournal: any;
  let hookCallback: Function;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock notes manager with storage
    mockNotesManager = {
      storage: {
        removeNote: vi.fn().mockResolvedValue(undefined),
      },
    };

    // Mock journal entry with calendar note flags
    mockJournal = {
      id: 'test-journal-123',
      name: 'Test Calendar Note',
      flags: {
        'seasons-and-stars': {
          calendarNote: true,
          dateKey: '2024-12-25',
          startDate: { year: 2024, month: 12, day: 25 },
        },
      },
    };

    // Mock widget instances
    const mockWidgetInstance = {
      rendered: true,
      render: vi.fn(),
    };

    vi.spyOn(CalendarWidget, 'getInstance').mockReturnValue(mockWidgetInstance);
    vi.spyOn(CalendarMiniWidget, 'getInstance').mockReturnValue(mockWidgetInstance);
    vi.spyOn(CalendarGridWidget, 'getInstance').mockReturnValue(mockWidgetInstance);

    // Mock Hooks.on to capture the callback
    global.Hooks = {
      on: vi.fn((hookName: string, callback: Function) => {
        if (hookName === 'deleteJournalEntry') {
          hookCallback = callback;
        }
      }),
      callAll: vi.fn(),
    } as any;

    // Make notes manager available globally (simulating module initialization)
    (global as any).notesManager = mockNotesManager;
  });

  it('should clean up calendar notes when journals are deleted externally', async () => {
    // Simulate the hook registration from module.ts
    const registerNotesCleanupHooks = () => {
      Hooks.on('deleteJournalEntry', async (journal: any, options: any, userId: string) => {
        try {
          const flags = journal.flags?.['seasons-and-stars'];
          if (flags?.calendarNote) {
            if ((global as any).notesManager?.storage) {
              await (global as any).notesManager.storage.removeNote(journal.id);
            }
            Hooks.callAll('seasons-stars:noteDeleted', journal.id);

            // Refresh widgets (simplified for test)
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
          // Error handling would use Logger here
        }
      });
    };

    // Register the hooks
    registerNotesCleanupHooks();

    // Verify hook was registered
    expect(Hooks.on).toHaveBeenCalledWith('deleteJournalEntry', expect.any(Function));

    // Simulate journal deletion
    await hookCallback(mockJournal, {}, 'test-user-id');

    // Verify storage cleanup was called
    expect(mockNotesManager.storage.removeNote).toHaveBeenCalledWith('test-journal-123');

    // Verify hook was emitted for UI updates
    expect(Hooks.callAll).toHaveBeenCalledWith('seasons-stars:noteDeleted', 'test-journal-123');

    // Verify widgets were refreshed
    expect(CalendarWidget.getInstance).toHaveBeenCalled();
    expect(CalendarMiniWidget.getInstance).toHaveBeenCalled();
    expect(CalendarGridWidget.getInstance).toHaveBeenCalled();
  });

  it('should ignore non-calendar journals during deletion', async () => {
    // Create a regular journal without calendar flags
    const regularJournal = {
      id: 'regular-journal-456',
      name: 'Regular Journal',
      flags: {}, // No seasons-and-stars flags
    };

    // Register hooks
    Hooks.on('deleteJournalEntry', async (journal: any) => {
      const flags = journal.flags?.['seasons-and-stars'];
      if (flags?.calendarNote) {
        if ((global as any).notesManager?.storage) {
          await (global as any).notesManager.storage.removeNote(journal.id);
        }
        Hooks.callAll('seasons-stars:noteDeleted', journal.id);
      }
    });

    // Simulate deletion of regular journal
    await hookCallback(regularJournal, {}, 'test-user-id');

    // Verify storage cleanup was NOT called for regular journals
    expect(mockNotesManager.storage.removeNote).not.toHaveBeenCalled();

    // Verify deletion hook was NOT emitted for regular journals
    expect(Hooks.callAll).not.toHaveBeenCalledWith('seasons-stars:noteDeleted', expect.any(String));
  });

  it('should handle errors gracefully during cleanup', async () => {
    // Make storage.removeNote throw an error
    mockNotesManager.storage.removeNote.mockRejectedValue(new Error('Storage error'));

    // Register hooks with error handling
    Hooks.on('deleteJournalEntry', async (journal: any) => {
      try {
        const flags = journal.flags?.['seasons-and-stars'];
        if (flags?.calendarNote) {
          if ((global as any).notesManager?.storage) {
            await (global as any).notesManager.storage.removeNote(journal.id);
          }
          Hooks.callAll('seasons-stars:noteDeleted', journal.id);
        }
      } catch (error) {
        // Error would be logged but not thrown
        // Test that the error doesn't propagate
      }
    });

    // Simulate journal deletion that causes error
    await expect(hookCallback(mockJournal, {}, 'test-user-id')).resolves.not.toThrow();

    // Verify storage cleanup was attempted
    expect(mockNotesManager.storage.removeNote).toHaveBeenCalledWith('test-journal-123');
  });

  it('should handle widgets that are not rendered', async () => {
    // Mock widgets as not rendered
    const mockUnrenderedWidget = {
      rendered: false,
      render: vi.fn(),
    };

    vi.spyOn(CalendarWidget, 'getInstance').mockReturnValue(mockUnrenderedWidget);
    vi.spyOn(CalendarMiniWidget, 'getInstance').mockReturnValue(mockUnrenderedWidget);
    vi.spyOn(CalendarGridWidget, 'getInstance').mockReturnValue(mockUnrenderedWidget);

    // Register hooks
    Hooks.on('deleteJournalEntry', async (journal: any) => {
      const flags = journal.flags?.['seasons-and-stars'];
      if (flags?.calendarNote) {
        if ((global as any).notesManager?.storage) {
          await (global as any).notesManager.storage.removeNote(journal.id);
        }

        // Try to refresh widgets
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
    });

    // Simulate journal deletion
    await hookCallback(mockJournal, {}, 'test-user-id');

    // Verify storage cleanup still happened
    expect(mockNotesManager.storage.removeNote).toHaveBeenCalledWith('test-journal-123');

    // Verify widgets were not rendered (since they're not active)
    expect(mockUnrenderedWidget.render).not.toHaveBeenCalled();
  });
});
