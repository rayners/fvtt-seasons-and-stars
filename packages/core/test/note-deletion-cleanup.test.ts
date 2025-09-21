/**
 * Test for issue #22: Deleted journals remain in calendar
 * Tests that the notes cleanup hook properly removes deleted journals from storage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CalendarWidget } from '../src/ui/calendar-widget';
import { CalendarMiniWidget } from '../src/ui/calendar-mini-widget';
import { CalendarGridWidget } from '../src/ui/calendar-grid-widget';
import { registerNotesCleanupHooks } from '../src/core/notes-cleanup';

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
  let hookCallback: (journal: any, options: any, userId: string) => Promise<void> | void;
  let mockHooks: {
    on: ReturnType<typeof vi.fn>;
    callAll: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
  };
  let disposeHook: (() => void) | undefined;

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

    hookCallback = async () => {};

    // Mock hook system to capture callbacks
    mockHooks = {
      on: vi.fn((hookName: string, callback: typeof hookCallback) => {
        if (hookName === 'deleteJournalEntry') {
          hookCallback = callback;
        }
        return 0;
      }),
      callAll: vi.fn(),
      off: vi.fn(),
    };

    disposeHook = undefined;
  });

  afterEach(() => {
    if (disposeHook) {
      disposeHook();
      disposeHook = undefined;
    }
    vi.restoreAllMocks();
  });

  it('should clean up calendar notes when journals are deleted externally', async () => {
    disposeHook = registerNotesCleanupHooks(mockNotesManager, mockHooks as any);

    // Verify hook was registered
    expect(mockHooks.on).toHaveBeenCalledWith('deleteJournalEntry', expect.any(Function));

    // Simulate journal deletion
    await hookCallback(mockJournal, {}, 'test-user-id');

    // Verify storage cleanup was called
    expect(mockNotesManager.storage.removeNote).toHaveBeenCalledWith('test-journal-123');

    // Verify hook was emitted for UI updates
    expect(mockHooks.callAll).toHaveBeenCalledWith('seasons-stars:noteDeleted', 'test-journal-123');

    // Verify widgets were refreshed
    expect(CalendarWidget.getInstance).toHaveBeenCalled();
    expect(CalendarMiniWidget.getInstance).toHaveBeenCalled();
    expect(CalendarGridWidget.getInstance).toHaveBeenCalled();

    // Dispose removes the hook when supported
    disposeHook();
    disposeHook = undefined;
    expect(mockHooks.off).toHaveBeenCalledWith('deleteJournalEntry', expect.any(Function));
  });

  it('should ignore non-calendar journals during deletion', async () => {
    const regularJournal = {
      id: 'regular-journal-456',
      name: 'Regular Journal',
      flags: {},
    };

    disposeHook = registerNotesCleanupHooks(mockNotesManager, mockHooks as any);

    await hookCallback(regularJournal, {}, 'test-user-id');

    expect(mockNotesManager.storage.removeNote).not.toHaveBeenCalled();
    expect(mockHooks.callAll).not.toHaveBeenCalledWith(
      'seasons-stars:noteDeleted',
      expect.any(String)
    );
  });

  it('should handle errors gracefully during cleanup', async () => {
    mockNotesManager.storage.removeNote.mockRejectedValue(new Error('Storage error'));

    disposeHook = registerNotesCleanupHooks(mockNotesManager, mockHooks as any);

    await expect(hookCallback(mockJournal, {}, 'test-user-id')).resolves.not.toThrow();
    expect(mockNotesManager.storage.removeNote).toHaveBeenCalledWith('test-journal-123');
  });

  it('should handle widgets that are not rendered', async () => {
    const mockUnrenderedWidget = {
      rendered: false,
      render: vi.fn(),
    };

    vi.spyOn(CalendarWidget, 'getInstance').mockReturnValue(mockUnrenderedWidget);
    vi.spyOn(CalendarMiniWidget, 'getInstance').mockReturnValue(mockUnrenderedWidget);
    vi.spyOn(CalendarGridWidget, 'getInstance').mockReturnValue(mockUnrenderedWidget);

    disposeHook = registerNotesCleanupHooks(mockNotesManager, mockHooks as any);

    await hookCallback(mockJournal, {}, 'test-user-id');

    expect(mockNotesManager.storage.removeNote).toHaveBeenCalledWith('test-journal-123');
    expect(mockUnrenderedWidget.render).not.toHaveBeenCalled();
  });
});
