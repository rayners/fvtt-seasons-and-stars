/**
 * Notes management system for Seasons & Stars calendar integration
 */

import type { CalendarDate as ICalendarDate, CalendarDateData } from '../types/calendar';
import { CalendarDate } from './calendar-date';
import type { CalendarManagerInterface } from '../types/foundry-extensions';
import { NoteStorage } from './note-storage';
import { notePermissions } from './note-permissions';
import { NoteRecurrence, type RecurringPattern } from './note-recurring';
import { NoteSearch, type NoteSearchCriteria, type NoteSearchResult } from './note-search';
import { Logger } from './logger';

export interface CreateNoteData {
  title: string;
  content: string;
  startDate: ICalendarDate;
  endDate?: ICalendarDate;
  allDay: boolean;
  calendarId?: string;
  category?: string;
  tags?: string[];
  playerVisible: boolean;
  recurring?: RecurringPattern;
}

export interface UpdateNoteData {
  title?: string;
  content?: string;
  startDate?: ICalendarDate;
  endDate?: ICalendarDate;
  allDay?: boolean;
  category?: string;
  tags?: string[];
  playerVisible?: boolean;
  recurring?: RecurringPattern;
}

export interface CalendarNoteFlags {
  'seasons-and-stars': {
    calendarNote: true;
    version: string;
    dateKey: string; // "2024-12-25" (1-based storage)
    startDate: ICalendarDate;
    endDate?: ICalendarDate;
    allDay: boolean;
    calendarId: string;
    category?: string;
    tags?: string[];
    recurring?: RecurringPattern; // Recurring pattern if applicable
    isRecurringParent?: boolean; // True if this is the master recurring note
    recurringParentId?: string; // ID of parent note for generated occurrences
    created: number; // timestamp
    modified: number; // timestamp
  };
  [moduleId: string]: unknown; // Module-specific data
}

/**
 * Central coordinator for all calendar note operations
 */
export class NotesManager {
  private initialized: boolean = false;
  private notesFolderId: string | null = null;
  public storage: NoteStorage;

  constructor() {
    this.storage = new NoteStorage();
  }

  /**
   * Check if the notes manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Initialize the notes manager synchronously for immediate API availability
   * Defers folder creation and optimization to async operations
   */
  initializeSync(): void {
    if (this.initialized) return;

    Logger.debug('Initializing Notes Manager synchronously');

    // Initialize storage system (this is synchronous)
    try {
      this.storage.initialize();
    } catch (error) {
      Logger.error(
        'Storage initialization failed during sync init:',
        error instanceof Error ? error : new Error(String(error))
      );
    }

    // Mark as initialized so basic note operations work
    this.initialized = true;

    // Schedule async initialization for folder creation and optimization
    // Use queueMicrotask for better timing guarantees than setTimeout
    queueMicrotask(async () => {
      try {
        await this.initializeNotesFolder();

        // Check if we have a large collection and optimize accordingly
        const noteCount = this.getAllCalendarNotes().length;
        if (noteCount > 500) {
          Logger.info(
            `Large note collection detected (${noteCount} notes) - applying optimizations`
          );
          await this.storage.optimizeForLargeCollections();
        }

        Logger.info('Notes Manager async initialization complete');
      } catch (error) {
        Logger.error(
          'Failed to complete notes manager async initialization:',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    });

    Logger.debug('Notes Manager synchronous initialization complete');
  }

  /**
   * Initialize the notes manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    Logger.info('Initializing Notes Manager');

    // Initialize storage system
    this.storage.initialize();

    // Initialize notes folder
    await this.initializeNotesFolder();

    // Check if we have a large collection and optimize accordingly
    const noteCount = this.getAllCalendarNotes().length;
    if (noteCount > 500) {
      Logger.info(`Large note collection detected (${noteCount} notes) - applying optimizations`);
      await this.storage.optimizeForLargeCollections();
    }

    this.initialized = true;
    Logger.info('Notes Manager initialized');
  }

  /**
   * Create a new calendar note
   */
  async createNote(data: CreateNoteData): Promise<JournalEntry> {
    if (!this.initialized) {
      throw new Error('NotesManager not initialized');
    }

    const noteFolder = await this.getOrCreateNotesFolder();
    const activeCalendar = (
      game.seasonsStars?.manager as CalendarManagerInterface
    )?.getActiveCalendar();
    if (!activeCalendar) {
      throw new Error('No active calendar available');
    }

    // Create the journal entry
    const journal = await JournalEntry.create({
      name: data.title,
      folder: noteFolder.id,
      ownership: data.playerVisible ? { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER } : {},
      flags: {
        'seasons-and-stars': {
          calendarNote: true,
          version: '1.0',
          dateKey: this.formatDateKey(data.startDate),
          startDate: data.startDate,
          endDate: data.endDate,
          allDay: data.allDay,
          calendarId: data.calendarId || activeCalendar.id,
          category: data.category || 'general',
          tags: data.tags || [],
          recurring: data.recurring,
          isRecurringParent: !!data.recurring,
          created: Date.now(),
          modified: Date.now(),
        },
      },
    });

    if (!journal) {
      throw new Error('Failed to create journal entry');
    }

    // Create content page using v13 pages system
    await journal.createEmbeddedDocuments('JournalEntryPage', [
      {
        type: 'text',
        name: 'Content',
        text: { content: data.content },
      },
    ]);

    // Add to storage system
    await this.storage.storeNote(journal, data.startDate);

    // Handle recurring notes - generate initial occurrences
    if (data.recurring) {
      await this.generateRecurringOccurrences(journal, data.recurring, data.startDate);
    }

    // Emit hook for note creation
    Hooks.callAll('seasons-stars:noteCreated', journal);

    Logger.info(`Created note: ${data.title}${data.recurring ? ' (recurring)' : ''}`);
    return journal;
  }

  /**
   * Update an existing calendar note
   */
  async updateNote(noteId: string, data: UpdateNoteData): Promise<JournalEntry> {
    const journal = game.journal?.get(noteId);
    if (!journal) {
      throw new Error(`Note ${noteId} not found`);
    }

    // Verify this is a calendar note
    const flags = journal.flags?.['seasons-and-stars'];
    if (!flags?.calendarNote) {
      throw new Error(`Journal entry ${noteId} is not a calendar note`);
    }

    // Build update object
    const updateData: Record<string, unknown> = {};

    // Update basic properties
    if (data.title !== undefined) {
      updateData.name = data.title;
    }

    // Update flags
    const flagUpdates: Record<string, unknown> = {
      modified: Date.now(),
    };

    if (data.startDate !== undefined) {
      flagUpdates.startDate = data.startDate;
      flagUpdates.dateKey = this.formatDateKey(data.startDate);
    }
    if (data.endDate !== undefined) flagUpdates.endDate = data.endDate;
    if (data.allDay !== undefined) flagUpdates.allDay = data.allDay;
    if (data.category !== undefined) flagUpdates.category = data.category;
    if (data.tags !== undefined) flagUpdates.tags = data.tags;

    updateData['flags.seasons-and-stars'] = flagUpdates;

    // Update ownership if visibility changed
    if (data.playerVisible !== undefined) {
      updateData.ownership = data.playerVisible
        ? { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER }
        : {};
    }

    await journal.update(updateData);

    // Update content if provided
    if (data.content !== undefined) {
      const pages = journal.pages;
      if (pages.size > 0) {
        const contentPage = pages.values().next().value;
        if (contentPage?.update) {
          await contentPage.update({
            'text.content': data.content,
          });
        }
      }
    }

    // Emit hook for note update
    Hooks.callAll('seasons-stars:noteUpdated', journal);

    Logger.info(`Updated note: ${journal.name}`);
    return journal;
  }

  /**
   * Delete a calendar note
   */
  async deleteNote(noteId: string): Promise<void> {
    const journal = game.journal?.get(noteId);
    if (!journal) {
      throw new Error(`Note ${noteId} not found`);
    }

    // Verify this is a calendar note
    const flags = journal.flags?.['seasons-and-stars'];
    if (!flags?.calendarNote) {
      throw new Error(`Journal entry ${noteId} is not a calendar note`);
    }

    // Remove from storage system
    await this.storage.removeNote(noteId);

    await journal.delete();

    // Emit hook for note deletion
    Hooks.callAll('seasons-stars:noteDeleted', noteId);

    Logger.info(`Deleted note: ${journal.name}`);
  }

  /**
   * Get a specific calendar note
   */
  async getNote(noteId: string): Promise<JournalEntry | null> {
    const journal = game.journal?.get(noteId);
    if (!journal) return null;

    // Verify this is a calendar note
    const flags = journal.flags?.['seasons-and-stars'];
    if (!flags?.calendarNote) return null;

    return journal;
  }

  /**
   * Get all notes for a specific date
   */
  async getNotesForDate(date: ICalendarDate): Promise<JournalEntry[]> {
    if (!this.initialized) {
      throw new Error('NotesManager not initialized');
    }

    return await this.storage.findNotesByDate(date);
  }

  /**
   * Get all notes for a date range
   */
  async getNotesForDateRange(start: ICalendarDate, end: ICalendarDate): Promise<JournalEntry[]> {
    if (!this.initialized) {
      throw new Error('NotesManager not initialized');
    }

    return await this.storage.findNotesByDateRange(start, end);
  }

  /**
   * Set module-specific data on a note
   */
  async setNoteModuleData(noteId: string, moduleId: string, data: unknown): Promise<void> {
    const journal = game.journal?.get(noteId);
    if (!journal) {
      throw new Error(`Note ${noteId} not found`);
    }

    await journal.setFlag(moduleId, 'data', data);

    // Update modification timestamp
    await journal.setFlag('seasons-and-stars', 'modified', Date.now());
  }

  /**
   * Get module-specific data from a note
   */
  getNoteModuleData(noteId: string, moduleId: string): unknown {
    const journal = game.journal?.get(noteId);
    if (!journal) return null;

    return journal.getFlag(moduleId, 'data');
  }

  /**
   * Initialize the notes folder if it doesn't exist
   */
  private async initializeNotesFolder(): Promise<void> {
    await this.getOrCreateNotesFolder();
  }

  /**
   * Get or create the notes folder
   */
  async getOrCreateNotesFolder(): Promise<Folder> {
    // Try to find existing folder
    const existingFolder = game.folders?.find(
      f =>
        f.type === 'JournalEntry' &&
        (f as { getFlag?: (scope: string, key: string) => unknown }).getFlag?.(
          'seasons-and-stars',
          'notesFolder'
        ) === true
    );

    if (existingFolder) {
      this.notesFolderId = existingFolder.id;
      return existingFolder;
    }

    // Create new folder
    const folder = await Folder.create({
      name: 'Calendar Notes',
      type: 'JournalEntry',
      flags: {
        'seasons-and-stars': {
          notesFolder: true,
          version: '1.0',
        },
      },
    });

    if (!folder) {
      throw new Error('Failed to create notes folder');
    }

    this.notesFolderId = folder.id;
    Logger.info('Created Calendar Notes folder');
    return folder;
  }

  /**
   * Format a date as a key for storage (YYYY-MM-DD format, 1-based)
   */
  private formatDateKey(date: ICalendarDate): string {
    const year = date.year.toString().padStart(4, '0');
    const month = date.month.toString().padStart(2, '0');
    const day = date.day.toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Check if a date is within a range (inclusive)
   */
  private isDateInRange(date: ICalendarDate, start: ICalendarDate, end: ICalendarDate): boolean {
    return this.compareDates(date, start) >= 0 && this.compareDates(date, end) <= 0;
  }

  /**
   * Compare two dates
   */
  private compareDates(a: ICalendarDate, b: ICalendarDate): number {
    if (a.year !== b.year) return a.year - b.year;
    if (a.month !== b.month) return a.month - b.month;
    return a.day - b.day;
  }

  /**
   * Rebuild storage index (useful after bulk operations)
   */
  rebuildStorageIndex(): void {
    if (!this.initialized) return;
    this.storage.rebuildIndex();
  }

  /**
   * Get storage statistics for debugging
   */
  getStorageStats(): { totalNotes: number; indexSize: number; cacheSize: number } | null {
    if (!this.initialized) return null;

    const stats = this.storage.getCacheStats();
    return {
      totalNotes: stats.size || 0,
      indexSize: stats.maxSize || 0,
      cacheSize: stats.size || 0,
    };
  }

  /**
   * Check if current user can create notes
   */
  canCreateNote(): boolean {
    return notePermissions.canCreateNote(game.user!);
  }

  /**
   * Check if current user can edit a note
   */
  canEditNote(noteId: string): boolean {
    const journal = game.journal?.get(noteId);
    if (!journal) return false;
    return notePermissions.canEditNote(game.user!, journal);
  }

  /**
   * Check if current user can delete a note
   */
  canDeleteNote(noteId: string): boolean {
    const journal = game.journal?.get(noteId);
    if (!journal) return false;
    return notePermissions.canDeleteNote(game.user!, journal);
  }

  /**
   * Check if current user can view a note
   */
  canViewNote(noteId: string): boolean {
    const journal = game.journal?.get(noteId);
    if (!journal) return false;
    return notePermissions.canViewNote(game.user!, journal);
  }

  /**
   * Get all notes the current user can view
   */
  getUserViewableNotes(): JournalEntry[] {
    return notePermissions.getViewableNotes(game.user!);
  }

  /**
   * Get all notes the current user can edit
   */
  getUserEditableNotes(): JournalEntry[] {
    return notePermissions.getEditableNotes(game.user!);
  }

  /**
   * Search notes based on criteria
   */
  async searchNotes(criteria: NoteSearchCriteria): Promise<NoteSearchResult> {
    if (!this.initialized) {
      throw new Error('NotesManager not initialized');
    }

    return await NoteSearch.searchNotes(criteria);
  }

  /**
   * Get search suggestions based on existing notes
   */
  getSearchSuggestions(): { categories: string[]; tags: string[]; authors: string[] } {
    return NoteSearch.getSearchSuggestions();
  }

  /**
   * Get predefined search presets
   */
  getSearchPresets(): Record<string, NoteSearchCriteria> {
    return NoteSearch.getSearchPresets();
  }

  /**
   * Quick search for notes by text
   */
  async quickSearch(query: string, limit: number = 10): Promise<JournalEntry[]> {
    const result = await this.searchNotes({
      query,
      limit,
      sortBy: 'created',
      sortOrder: 'desc',
    });

    return result.notes;
  }

  /**
   * Get notes for a specific category
   */
  async getNotesByCategory(category: string, limit?: number): Promise<JournalEntry[]> {
    const result = await this.searchNotes({
      categories: [category],
      limit,
      sortBy: 'date',
      sortOrder: 'asc',
    });

    return result.notes;
  }

  /**
   * Get notes with specific tags
   */
  async getNotesByTags(
    tags: string[],
    matchAll: boolean = true,
    limit?: number
  ): Promise<JournalEntry[]> {
    const searchCriteria: NoteSearchCriteria = {
      limit,
      sortBy: 'date',
      sortOrder: 'asc',
    };

    if (matchAll) {
      searchCriteria.tags = tags;
    } else {
      searchCriteria.anyTags = tags;
    }

    const result = await this.searchNotes(searchCriteria);
    return result.notes;
  }

  /**
   * Get upcoming notes (from current date forward)
   */
  async getUpcomingNotes(limit: number = 20): Promise<JournalEntry[]> {
    const currentDate = (game.seasonsStars?.manager as CalendarManagerInterface)?.getCurrentDate();
    if (!currentDate) return [];

    const result = await this.searchNotes({
      dateFrom: currentDate,
      limit,
      sortBy: 'date',
      sortOrder: 'asc',
    });

    return result.notes;
  }

  /**
   * Get recent notes (by creation date)
   */
  async getRecentNotes(limit: number = 10): Promise<JournalEntry[]> {
    const result = await this.searchNotes({
      limit,
      sortBy: 'created',
      sortOrder: 'desc',
    });

    return result.notes;
  }

  /**
   * Generate recurring occurrences for a note
   */
  private async generateRecurringOccurrences(
    parentNote: JournalEntry,
    pattern: RecurringPattern,
    startDate: ICalendarDate
  ): Promise<void> {
    const engine = (game.seasonsStars?.manager as CalendarManagerInterface)?.getActiveEngine();
    if (!engine) {
      Logger.warn('No calendar engine available for recurring note generation');
      return;
    }

    // Generate occurrences for next 2 years to start
    const currentDate = (game.seasonsStars?.manager as CalendarManagerInterface)?.getCurrentDate();
    if (!currentDate) return;

    const rangeStart = currentDate;
    const rangeEndData: CalendarDateData = {
      year: rangeStart.year + 2,
      month: rangeStart.month,
      day: rangeStart.day,
      weekday: rangeStart.weekday,
      time: rangeStart.time,
    };

    const calendar = (game.seasonsStars?.manager as CalendarManagerInterface)?.getActiveCalendar();
    const rangeEnd = calendar ? new CalendarDate(rangeEndData, calendar) : rangeStart;

    const occurrences = NoteRecurrence.generateOccurrences(
      startDate,
      pattern,
      rangeStart,
      rangeEnd,
      engine
    );

    Logger.info(`Generating ${occurrences.length} recurring occurrences`);

    // Create notes for each occurrence (except exceptions)
    for (const occurrence of occurrences) {
      if (occurrence.isException || occurrence.index === 0) {
        continue; // Skip exceptions and the original note
      }

      await this.createRecurringOccurrence(parentNote, occurrence.date);
    }
  }

  /**
   * Create a single recurring occurrence note
   */
  private async createRecurringOccurrence(
    parentNote: JournalEntry,
    occurrenceDate: ICalendarDate
  ): Promise<JournalEntry> {
    const noteFolder = await this.getOrCreateNotesFolder();
    const parentFlags = parentNote.flags['seasons-and-stars'];
    const parentContent = parentNote.pages.values().next().value?.text?.content || '';

    // Create the occurrence note
    const journal = await JournalEntry.create({
      name: `${parentNote.name} (${this.formatDateKey(occurrenceDate)})`,
      folder: noteFolder.id,
      ownership: parentNote.ownership,
      flags: {
        'seasons-and-stars': {
          calendarNote: true,
          version: '1.0',
          dateKey: this.formatDateKey(occurrenceDate),
          startDate: occurrenceDate,
          endDate: parentFlags.endDate,
          allDay: parentFlags.allDay,
          calendarId: parentFlags.calendarId,
          category: parentFlags.category,
          tags: parentFlags.tags,
          recurringParentId: parentNote.id,
          isRecurringParent: false,
          created: Date.now(),
          modified: Date.now(),
        },
      },
    });

    if (!journal) {
      throw new Error('Failed to create recurring occurrence');
    }

    // Create content page
    await journal.createEmbeddedDocuments('JournalEntryPage', [
      {
        type: 'text',
        name: 'Content',
        text: { content: parentContent },
      },
    ]);

    // Add to storage system
    await this.storage.storeNote(journal, occurrenceDate);

    return journal;
  }

  /**
   * Get all recurring occurrences for a parent note
   */
  getRecurringOccurrences(parentNoteId: string): JournalEntry[] {
    return game.journal.filter(journal => {
      const flags = journal.flags?.['seasons-and-stars'];
      return flags?.calendarNote && flags?.recurringParentId === parentNoteId;
    });
  }

  /**
   * Delete recurring note and all its occurrences
   */
  async deleteRecurringNote(parentNoteId: string): Promise<void> {
    const parentNote = game.journal?.get(parentNoteId);
    if (!parentNote) {
      throw new Error(`Parent note ${parentNoteId} not found`);
    }

    // Check permissions
    if (!notePermissions.canDeleteNote(game.user!, parentNote)) {
      throw new Error('Insufficient permissions to delete recurring note');
    }

    // Get all occurrences
    const occurrences = this.getRecurringOccurrences(parentNoteId);

    // Delete all occurrences first
    for (const occurrence of occurrences) {
      await this.deleteNote(occurrence.id);
    }

    // Delete the parent note
    await this.deleteNote(parentNoteId);

    Logger.info(`Deleted recurring note and ${occurrences.length} occurrences`);
  }

  /**
   * Update recurring pattern for a note
   */
  async updateRecurringPattern(parentNoteId: string, newPattern: RecurringPattern): Promise<void> {
    const parentNote = game.journal?.get(parentNoteId);
    if (!parentNote) {
      throw new Error(`Parent note ${parentNoteId} not found`);
    }

    // Check permissions
    if (!notePermissions.canEditNote(game.user!, parentNote)) {
      throw new Error('Insufficient permissions to update recurring note');
    }

    // Update the parent note's pattern
    await parentNote.setFlag('seasons-and-stars', 'recurring', newPattern);
    await parentNote.setFlag('seasons-and-stars', 'modified', Date.now());

    // Delete existing occurrences
    const existingOccurrences = this.getRecurringOccurrences(parentNoteId);
    for (const occurrence of existingOccurrences) {
      await this.deleteNote(occurrence.id);
    }

    // Generate new occurrences
    const startDate = parentNote.flags['seasons-and-stars'].startDate;
    await this.generateRecurringOccurrences(parentNote, newPattern, startDate);

    Logger.info('Updated recurring pattern and regenerated occurrences');
  }

  /**
   * Check if a note is a recurring parent
   */
  isRecurringParent(noteId: string): boolean {
    const journal = game.journal?.get(noteId);
    if (!journal) return false;

    const flags = journal.flags?.['seasons-and-stars'];
    return flags?.calendarNote && flags?.isRecurringParent === true;
  }

  /**
   * Check if a note is a recurring occurrence
   */
  isRecurringOccurrence(noteId: string): boolean {
    const journal = game.journal?.get(noteId);
    if (!journal) return false;

    const flags = journal.flags?.['seasons-and-stars'];
    return flags?.calendarNote && !!flags?.recurringParentId;
  }

  /**
   * Get the parent note for a recurring occurrence
   */
  getRecurringParent(occurrenceId: string): JournalEntry | null {
    const occurrence = game.journal?.get(occurrenceId);
    if (!occurrence) return null;

    const parentId = occurrence.flags?.['seasons-and-stars']?.recurringParentId;
    if (!parentId) return null;

    return game.journal?.get(parentId) || null;
  }

  /**
   * Get all calendar notes in the system
   */
  private getAllCalendarNotes(): JournalEntry[] {
    if (!game.journal) return [];

    return game.journal.filter(journal => {
      const flags = journal.flags?.['seasons-and-stars'];
      return flags?.calendarNote === true;
    });
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics(): object | null {
    return this.storage.getPerformanceMetrics();
  }

  /**
   * Optimize the notes system for better performance
   */
  async optimizePerformance(): Promise<void> {
    Logger.info('Starting notes system optimization...');

    await this.storage.optimizeForLargeCollections();

    // Clean up any orphaned data
    await this.cleanupOrphanedData();

    Logger.info('Notes system optimization completed');
  }

  /**
   * Clean up orphaned data
   */
  private async cleanupOrphanedData(): Promise<void> {
    const allNotes = this.getAllCalendarNotes();
    let orphanedCount = 0;

    for (const note of allNotes) {
      const flags = note.flags?.['seasons-and-stars'];

      // Check for recurring orphans
      if (flags?.recurringParentId) {
        const parent = game.journal?.get(flags.recurringParentId);
        if (!parent) {
          Logger.warn(`Found orphaned recurring note: ${note.id}`);
          // Could optionally clean up or convert to standalone note
          orphanedCount++;
        }
      }
    }

    if (orphanedCount > 0) {
      Logger.info(`Found ${orphanedCount} orphaned notes during cleanup`);
    }
  }
}
