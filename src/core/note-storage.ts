/**
 * Efficient date-based storage and retrieval system for calendar notes
 */

import type { CalendarDate as ICalendarDate } from '../types/calendar';
import { NotePerformanceOptimizer } from './note-performance-optimizer';
import { Logger } from './logger';

/**
 * High-performance storage system with date-based indexing
 */
export class NoteStorage {
  private dateIndex: Map<string, Set<string>> = new Map();
  private noteCache: Map<string, JournalEntry> = new Map();
  private cacheSize = 100; // Limit cache size to prevent memory issues
  private indexBuilt = false;
  private performanceOptimizer!: NotePerformanceOptimizer;

  /**
   * Initialize the storage system
   */
  initialize(): void {
    this.performanceOptimizer = NotePerformanceOptimizer.getInstance({
      cacheSize: this.cacheSize,
    });

    this.buildDateIndex();
    this.indexBuilt = true;

    Logger.debug('Note storage initialized with performance optimization');
  }

  /**
   * Store a note with date indexing
   */
  async storeNote(note: JournalEntry, date: ICalendarDate): Promise<void> {
    if (!this.indexBuilt) {
      this.initialize();
    }

    const dateKey = this.getDateKey(date);
    this.addToDateIndex(dateKey, note.id);

    // Add to cache
    this.addToCache(note.id, note);
  }

  /**
   * Remove a note from storage and indexing
   */
  async removeNote(noteId: string): Promise<void> {
    // Remove from all date indices
    for (const [dateKey, noteIds] of this.dateIndex.entries()) {
      if (noteIds.has(noteId)) {
        this.removeFromDateIndex(dateKey, noteId);
      }
    }

    // Remove from cache
    this.noteCache.delete(noteId);
  }

  /**
   * Find notes by specific date (fast retrieval using index)
   */
  async findNotesByDate(date: ICalendarDate): Promise<JournalEntry[]> {
    if (!this.indexBuilt) {
      this.initialize();
    }

    const dateKey = this.getDateKey(date);
    const noteIds = this.dateIndex.get(dateKey) || new Set();

    const notes: JournalEntry[] = [];
    for (const noteId of noteIds) {
      const note = this.getFromCache(noteId) || game.journal?.get(noteId);
      if (note && this.isCalendarNote(note)) {
        notes.push(note);
        // Add to cache if retrieved from game
        if (!this.noteCache.has(noteId)) {
          this.addToCache(noteId, note);
        }
      }
    }

    return this.sortNotesByCreation(notes);
  }

  /**
   * Find notes by specific date (synchronous version for API compatibility)
   */
  findNotesByDateSync(date: ICalendarDate): JournalEntry[] {
    if (!this.indexBuilt) {
      this.initialize();
    }

    const dateKey = this.getDateKey(date);
    const noteIds = this.dateIndex.get(dateKey) || new Set();

    const notes: JournalEntry[] = [];
    for (const noteId of noteIds) {
      const note = this.getFromCache(noteId) || game.journal?.get(noteId);
      if (note && this.isCalendarNote(note)) {
        notes.push(note);
        // Add to cache if retrieved from game
        if (!this.noteCache.has(noteId)) {
          this.addToCache(noteId, note);
        }
      }
    }

    return this.sortNotesByCreation(notes);
  }

  /**
   * Find notes by date range (optimized for ranges)
   */
  async findNotesByDateRange(start: ICalendarDate, end: ICalendarDate): Promise<JournalEntry[]> {
    if (!this.indexBuilt) {
      this.initialize();
    }

    const notes: JournalEntry[] = [];
    const noteIds = new Set<string>();

    // Iterate through date range and collect note IDs
    const startKey = this.getDateKey(start);
    const endKey = this.getDateKey(end);

    for (const [dateKey, dayNoteIds] of this.dateIndex.entries()) {
      if (dateKey >= startKey && dateKey <= endKey) {
        for (const noteId of dayNoteIds) {
          noteIds.add(noteId);
        }
      }
    }

    // Retrieve notes
    for (const noteId of noteIds) {
      const note = this.getFromCache(noteId) || game.journal?.get(noteId);
      if (note && this.isCalendarNote(note)) {
        // Double-check date range for notes that span multiple days
        // Try S&S flags first, then bridge flags
        const ssFlags = note.flags?.['seasons-and-stars'];
        const bridgeFlags = note.flags?.['foundryvtt-simple-calendar-compat'];
        const startDate = ssFlags?.startDate || bridgeFlags?.startDate;

        if (startDate && this.isDateInRange(startDate, start, end)) {
          notes.push(note);
          // Add to cache if retrieved from game
          if (!this.noteCache.has(noteId)) {
            this.addToCache(noteId, note);
          }
        }
      }
    }

    return this.sortNotesByDate(notes);
  }

  /**
   * Rebuild the date index (call when notes are created/updated outside storage)
   *
   * NOTE: This is a workaround for bridge integration synchronization issues.
   * When external modules (like Simple Weather) create notes through the Simple Calendar
   * Compatibility Bridge, those notes don't automatically appear in calendar highlighting
   * until this method is called. See KNOWN-ISSUES.md for details.
   */
  rebuildIndex(): void {
    Logger.debug('Rebuilding note storage index');
    this.dateIndex.clear();
    this.buildDateIndex();
    Logger.debug(`Index rebuilt with ${this.dateIndex.size} date entries`);
  }

  /**
   * Clear the cache to free memory
   */
  clearCache(): void {
    this.noteCache.clear();
    Logger.debug('Note cache cleared');
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.noteCache.size,
      maxSize: this.cacheSize,
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): object | null {
    if (!this.performanceOptimizer) {
      return null;
    }

    return this.performanceOptimizer.getMetrics();
  }

  /**
   * Optimize storage for large collections
   */
  async optimizeForLargeCollections(): Promise<void> {
    if (!this.performanceOptimizer) {
      Logger.warn('Performance optimizer not initialized');
      return;
    }

    Logger.debug('Optimizing storage for large collections...');

    // Clear cache and rebuild index
    this.clearCache();
    this.rebuildIndex();

    // Update configuration for large collections
    this.performanceOptimizer.updateConfig({
      cacheSize: Math.min(500, Math.max(200, this.dateIndex.size * 2)),
      maxSearchResults: 500,
      enablePagination: true,
    });

    Logger.debug('Storage optimization completed');
  }

  /**
   * Build the date index from existing journal entries
   */
  private buildDateIndex(): void {
    this.dateIndex.clear();

    if (!game.journal) {
      Logger.warn('Game journal not available for indexing');
      return;
    }

    let indexedCount = 0;

    game.journal.forEach(journal => {
      if (this.isCalendarNote(journal)) {
        // Try to get dateKey from S&S flags first, then bridge flags
        const ssFlags = journal.flags?.['seasons-and-stars'];
        const bridgeFlags = journal.flags?.['foundryvtt-simple-calendar-compat'];
        const dateKey = ssFlags?.dateKey || bridgeFlags?.dateKey;

        if (dateKey) {
          this.addToDateIndex(dateKey, journal.id);
          indexedCount++;
        }
      }
    });

    Logger.debug(`Built date index for ${indexedCount} calendar notes`);
  }

  /**
   * Generate a date key for indexing (YYYY-MM-DD format)
   */
  private getDateKey(date: ICalendarDate): string {
    const year = date.year.toString().padStart(4, '0');
    const month = date.month.toString().padStart(2, '0');
    const day = date.day.toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Add a note to the date index
   */
  private addToDateIndex(dateKey: string, noteId: string): void {
    if (!this.dateIndex.has(dateKey)) {
      this.dateIndex.set(dateKey, new Set());
    }
    this.dateIndex.get(dateKey)!.add(noteId);
  }

  /**
   * Remove a note from the date index
   */
  private removeFromDateIndex(dateKey: string, noteId: string): void {
    const noteIds = this.dateIndex.get(dateKey);
    if (noteIds) {
      noteIds.delete(noteId);
      // Clean up empty date entries
      if (noteIds.size === 0) {
        this.dateIndex.delete(dateKey);
      }
    }
  }

  /**
   * Add note to cache with size management
   */
  private addToCache(noteId: string, note: JournalEntry): void {
    // Manage cache size
    if (this.noteCache.size >= this.cacheSize) {
      // Remove oldest entry (FIFO)
      const firstKey = this.noteCache.keys().next().value;
      if (firstKey) {
        this.noteCache.delete(firstKey);
      }
    }

    this.noteCache.set(noteId, note);
  }

  /**
   * Get note from cache
   */
  private getFromCache(noteId: string): JournalEntry | null {
    return this.noteCache.get(noteId) || null;
  }

  /**
   * Check if a journal entry is a calendar note
   */
  private isCalendarNote(journal: JournalEntry): boolean {
    // Check for native S&S flags
    const ssFlags = journal.flags?.['seasons-and-stars'];
    if (ssFlags?.calendarNote === true) {
      return true;
    }

    // Check for bridge flags (Simple Calendar compatibility)
    const bridgeFlags = journal.flags?.['foundryvtt-simple-calendar-compat'];
    return bridgeFlags?.isCalendarNote === true;
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
   * Sort notes by creation time
   */
  private sortNotesByCreation(notes: JournalEntry[]): JournalEntry[] {
    return notes.sort((a, b) => {
      // Try S&S flags first, then bridge flags
      const aSSFlags = a.flags?.['seasons-and-stars'];
      const aBridgeFlags = a.flags?.['foundryvtt-simple-calendar-compat'];
      const bSSFlags = b.flags?.['seasons-and-stars'];
      const bBridgeFlags = b.flags?.['foundryvtt-simple-calendar-compat'];

      const aCreated = aSSFlags?.created || aBridgeFlags?.created || 0;
      const bCreated = bSSFlags?.created || bBridgeFlags?.created || 0;

      return aCreated - bCreated;
    });
  }

  /**
   * Sort notes by date, then creation time
   */
  private sortNotesByDate(notes: JournalEntry[]): JournalEntry[] {
    return notes.sort((a, b) => {
      // Try S&S flags first, then bridge flags
      const aSSFlags = a.flags?.['seasons-and-stars'];
      const aBridgeFlags = a.flags?.['foundryvtt-simple-calendar-compat'];
      const bSSFlags = b.flags?.['seasons-and-stars'];
      const bBridgeFlags = b.flags?.['foundryvtt-simple-calendar-compat'];

      const aDate = aSSFlags?.startDate || aBridgeFlags?.startDate;
      const bDate = bSSFlags?.startDate || bBridgeFlags?.startDate;

      if (aDate && bDate) {
        const comparison = this.compareDates(aDate, bDate);
        if (comparison !== 0) return comparison;
      }

      const aCreated = aSSFlags?.created || aBridgeFlags?.created || 0;
      const bCreated = bSSFlags?.created || bBridgeFlags?.created || 0;

      return aCreated - bCreated;
    });
  }
}

/**
 * Singleton instance for global access
 */
export const noteStorage = new NoteStorage();
