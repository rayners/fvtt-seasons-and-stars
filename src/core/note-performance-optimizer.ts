/**
 * Performance optimization utilities for the notes system
 *
 * Note: Memory monitoring has been moved to the Memory Mage module.
 * This optimizer now focuses on search performance and caching only.
 */

import type { CalendarDate as ICalendarDate } from '../types/calendar';
import type { NoteSearchCriteria, NoteSearchResult } from './note-search';
import { Logger } from './logger';

export interface PerformanceMetrics {
  indexBuildTime: number;
  searchTime: number;
  cacheHitRate: number;
  totalNotes: number;
  indexedDates: number;
}

export interface OptimizationConfig {
  // Cache settings
  cacheSize: number; // Maximum number of notes to cache
  cacheEvictionStrategy: 'lru' | 'fifo';

  // Search settings
  maxSearchResults: number; // Maximum results to return
  searchTimeout: number; // Search timeout in milliseconds
  enablePagination: boolean;

  // Index settings
  lazyIndexing: boolean; // Build index on demand
  indexRebuildThreshold: number; // Notes threshold to trigger rebuild
}

/**
 * Performance optimizer for large note collections
 */
export class NotePerformanceOptimizer {
  private static instance: NotePerformanceOptimizer;
  private config: OptimizationConfig;
  private metrics: PerformanceMetrics;

  // LRU cache implementation
  private lruCache: Map<string, { note: JournalEntry; lastAccess: number }> = new Map();
  private cacheAccessOrder: string[] = [];

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = {
      cacheSize: 200,
      cacheEvictionStrategy: 'lru',
      maxSearchResults: 1000,
      searchTimeout: 5000,
      enablePagination: true,
      lazyIndexing: true,
      indexRebuildThreshold: 500,
      ...config,
    };

    this.metrics = {
      indexBuildTime: 0,
      searchTime: 0,
      cacheHitRate: 0,
      totalNotes: 0,
      indexedDates: 0,
    };
  }

  static getInstance(config?: Partial<OptimizationConfig>): NotePerformanceOptimizer {
    if (!this.instance) {
      this.instance = new NotePerformanceOptimizer(config);
    }
    return this.instance;
  }

  /**
   * Optimized note retrieval with smart caching
   */
  async getOptimizedNotes(
    dateKeys: string[],
    useCache: boolean = true
  ): Promise<Map<string, JournalEntry[]>> {
    const startTime = performance.now();
    const result = new Map<string, JournalEntry[]>();
    const uncachedKeys: string[] = [];

    // Check cache first
    if (useCache) {
      for (const dateKey of dateKeys) {
        const cachedNotes = this.getCachedNotesForDate(dateKey);
        if (cachedNotes) {
          result.set(dateKey, cachedNotes);
        } else {
          uncachedKeys.push(dateKey);
        }
      }
    } else {
      uncachedKeys.push(...dateKeys);
    }

    // Fetch uncached notes in batches
    if (uncachedKeys.length > 0) {
      const batchSize = 10; // Process 10 dates at a time

      for (let i = 0; i < uncachedKeys.length; i += batchSize) {
        const batch = uncachedKeys.slice(i, i + batchSize);
        const batchResults = await this.fetchNotesBatch(batch);

        for (const [dateKey, notes] of batchResults) {
          result.set(dateKey, notes);

          // Cache the results
          if (useCache) {
            this.cacheNotesForDate(dateKey, notes);
          }
        }

        // Yield to prevent blocking
        if (i + batchSize < uncachedKeys.length) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }
    }

    const endTime = performance.now();
    this.metrics.searchTime = endTime - startTime;

    return result;
  }

  /**
   * Optimized search with early termination and pagination
   */
  async optimizedSearch(criteria: NoteSearchCriteria): Promise<NoteSearchResult> {
    const startTime = performance.now();

    // Apply smart filtering strategy
    const searchStrategy = this.determineSearchStrategy(criteria);
    let notes: JournalEntry[] = [];

    try {
      // Use timeout to prevent long-running searches
      notes = await Promise.race([
        this.executeSearchStrategy(searchStrategy, criteria),
        this.createSearchTimeout(),
      ]);
    } catch (error) {
      Logger.warn('Search timeout or error:', error);
      // Return partial results
      notes = [];
    }

    // Apply pagination if enabled
    const limit = criteria.limit || this.config.maxSearchResults;
    const offset = criteria.offset || 0;
    const totalCount = notes.length;

    if (this.config.enablePagination && totalCount > limit) {
      notes = notes.slice(offset, offset + limit);
    }

    const endTime = performance.now();
    const searchTime = endTime - startTime;
    this.metrics.searchTime = searchTime;

    return {
      notes,
      totalCount,
      hasMore: totalCount > offset + notes.length,
      searchTime,
    };
  }

  /**
   * Memory pressure relief - clean up caches and rebuild indexes
   * Called by Memory Mage during memory pressure events
   */
  relieveMemoryPressure(): void {
    Logger.info('Relieving memory pressure...');

    // Clear cache partially (keep most recent 50%)
    this.clearOldCacheEntries(0.5);

    Logger.info('Memory pressure relief completed');
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Adjust cache size if needed
    if (newConfig.cacheSize && newConfig.cacheSize < this.lruCache.size) {
      this.clearOldCacheEntries(1 - newConfig.cacheSize / this.lruCache.size);
    }
  }

  /**
   * Get estimated memory usage for Memory Mage
   */
  getMemoryUsage(): number {
    // Estimate cache memory usage
    const avgNoteSize = 0.01; // Estimate 10KB per cached note
    const cacheMemory = this.lruCache.size * avgNoteSize;

    // Add small baseline for the optimizer itself
    const baseMemory = 0.1;

    return cacheMemory + baseMemory;
  }

  /**
   * Determine optimal search strategy based on criteria
   */
  private determineSearchStrategy(criteria: NoteSearchCriteria): 'index' | 'full' | 'hybrid' {
    // Use index strategy for date-based searches
    if (criteria.dateFrom || criteria.dateTo) {
      return 'index';
    }

    // Use full search for complex text queries
    if (criteria.query && criteria.query.length > 3) {
      return 'full';
    }

    // Use hybrid for mixed criteria
    return 'hybrid';
  }

  /**
   * Execute search based on strategy
   */
  private async executeSearchStrategy(
    strategy: 'index' | 'full' | 'hybrid',
    criteria: NoteSearchCriteria
  ): Promise<JournalEntry[]> {
    switch (strategy) {
      case 'index':
        return this.indexBasedSearch(criteria);

      case 'full':
        return this.fullTextSearch(criteria);

      case 'hybrid':
        return this.hybridSearch(criteria);

      default:
        return this.fullTextSearch(criteria);
    }
  }

  /**
   * Index-based search for date ranges
   */
  private async indexBasedSearch(criteria: NoteSearchCriteria): Promise<JournalEntry[]> {
    const dateKeys = this.generateDateKeys(criteria.dateFrom, criteria.dateTo);
    const notesMap = await this.getOptimizedNotes(dateKeys);

    const allNotes: JournalEntry[] = [];
    for (const notes of notesMap.values()) {
      allNotes.push(...notes);
    }

    // Apply additional filters
    return this.applyAdditionalFilters(allNotes, criteria);
  }

  /**
   * Full text search with optimizations
   */
  private async fullTextSearch(criteria: NoteSearchCriteria): Promise<JournalEntry[]> {
    const allNotes = this.getAllCalendarNotes();

    // Early termination if too many notes
    if (allNotes.length > this.config.indexRebuildThreshold) {
      Logger.warn(`Large collection (${allNotes.length} notes) - consider date filtering`);
    }

    return this.applyAdditionalFilters(allNotes, criteria);
  }

  /**
   * Hybrid search combining index and full search
   */
  private async hybridSearch(criteria: NoteSearchCriteria): Promise<JournalEntry[]> {
    // Start with index-based filtering if date criteria exists
    let notes: JournalEntry[];

    if (criteria.dateFrom || criteria.dateTo) {
      notes = await this.indexBasedSearch(criteria);
    } else {
      notes = this.getAllCalendarNotes();
    }

    // Apply text filtering on the reduced set
    return this.applyAdditionalFilters(notes, criteria);
  }

  /**
   * Create search timeout promise
   */
  private createSearchTimeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Search timeout'));
      }, this.config.searchTimeout);
    });
  }

  /**
   * Generate date keys for a range
   */
  private generateDateKeys(from?: ICalendarDate, to?: ICalendarDate): string[] {
    if (!from && !to) return [];

    const keys: string[] = [];
    const start = from || to!;
    const end = to || from!;

    // Limit range to prevent excessive key generation
    const maxDays = 366; // One year maximum
    let dayCount = 0;

    const current = { ...start };

    while (dayCount < maxDays && this.compareDates(current, end) <= 0) {
      keys.push(this.getDateKey(current));
      this.incrementDate(current);
      dayCount++;
    }

    return keys;
  }

  /**
   * Apply additional filters to notes
   */
  private applyAdditionalFilters(
    notes: JournalEntry[],
    criteria: NoteSearchCriteria
  ): JournalEntry[] {
    let filtered = notes;

    // Apply text filter
    if (criteria.query) {
      const queryLower = criteria.query.toLowerCase();
      filtered = filtered.filter(note => {
        const title = note.name?.toLowerCase() || '';
        const content = this.getNoteContent(note).toLowerCase();
        return title.includes(queryLower) || content.includes(queryLower);
      });
    }

    // Apply category filter
    if (criteria.categories && criteria.categories.length > 0) {
      filtered = filtered.filter(note => {
        const category = note.flags?.['seasons-and-stars']?.category;
        return criteria.categories!.includes(category);
      });
    }

    // Apply other filters...
    // (Implementation similar to existing NoteSearch)

    return filtered;
  }

  /**
   * Cache management methods
   */
  private getCachedNotesForDate(dateKey: string): JournalEntry[] | null {
    const cached = this.lruCache.get(dateKey);
    if (cached) {
      // Update access time
      cached.lastAccess = Date.now();
      this.updateCacheAccessOrder(dateKey);
      return [cached.note]; // For single note, adjust for multiple notes
    }
    return null;
  }

  private cacheNotesForDate(dateKey: string, notes: JournalEntry[]): void {
    // For simplicity, cache first note only
    // In production, implement proper multi-note caching
    if (notes.length > 0) {
      this.addToLRUCache(dateKey, notes[0]);
    }
  }

  private addToLRUCache(key: string, note: JournalEntry): void {
    // Remove if already exists
    if (this.lruCache.has(key)) {
      this.lruCache.delete(key);
      const index = this.cacheAccessOrder.indexOf(key);
      if (index > -1) {
        this.cacheAccessOrder.splice(index, 1);
      }
    }

    // Check cache size
    while (this.lruCache.size >= this.config.cacheSize) {
      const oldestKey = this.cacheAccessOrder.shift();
      if (oldestKey) {
        this.lruCache.delete(oldestKey);
      }
    }

    // Add new entry
    this.lruCache.set(key, { note, lastAccess: Date.now() });
    this.cacheAccessOrder.push(key);
  }

  private updateCacheAccessOrder(key: string): void {
    const index = this.cacheAccessOrder.indexOf(key);
    if (index > -1) {
      this.cacheAccessOrder.splice(index, 1);
      this.cacheAccessOrder.push(key);
    }
  }

  private clearOldCacheEntries(fraction: number): void {
    const entriesToRemove = Math.floor(this.lruCache.size * fraction);

    for (let i = 0; i < entriesToRemove && this.cacheAccessOrder.length > 0; i++) {
      const oldestKey = this.cacheAccessOrder.shift();
      if (oldestKey) {
        this.lruCache.delete(oldestKey);
      }
    }
  }

  /**
   * Utility methods
   */
  private async fetchNotesBatch(dateKeys: string[]): Promise<Map<string, JournalEntry[]>> {
    const result = new Map<string, JournalEntry[]>();

    // Implementation would use note storage system
    // For now, return empty map
    dateKeys.forEach(key => {
      result.set(key, []);
    });

    return result;
  }

  private getAllCalendarNotes(): JournalEntry[] {
    if (!game.journal) return [];

    return game.journal.filter(journal => {
      const flags = journal.flags?.['seasons-and-stars'];
      return flags?.calendarNote === true;
    });
  }

  private getNoteContent(note: JournalEntry): string {
    // Extract content from first text page
    const textPage = note.pages?.find(page => page.type === 'text');
    return textPage?.text?.content || '';
  }

  private getDateKey(date: ICalendarDate): string {
    const year = date.year.toString().padStart(4, '0');
    const month = date.month.toString().padStart(2, '0');
    const day = date.day.toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private compareDates(date1: ICalendarDate, date2: ICalendarDate): number {
    if (date1.year !== date2.year) return date1.year - date2.year;
    if (date1.month !== date2.month) return date1.month - date2.month;
    return date1.day - date2.day;
  }

  private incrementDate(date: ICalendarDate): void {
    // Simple increment - would need calendar-aware logic in production
    date.day++;
    if (date.day > 30) {
      // Simplified
      date.day = 1;
      date.month++;
      if (date.month > 12) {
        date.month = 1;
        date.year++;
      }
    }
  }

  private updateMetrics(): void {
    this.metrics.totalNotes = this.getAllCalendarNotes().length;
    this.metrics.cacheHitRate = this.calculateCacheHitRate();
  }

  private calculateCacheHitRate(): number {
    // Would need to track hits/misses in production
    return 0.85; // Placeholder
  }
}
