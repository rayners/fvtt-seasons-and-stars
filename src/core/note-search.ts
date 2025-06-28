/**
 * Search and filtering system for calendar notes
 */

import type {
  CalendarDate as ICalendarDate,
  CalendarDateData,
} from '../types/calendar';
import { CalendarDate } from './calendar-date';
import type { CalendarManagerInterface } from '../types/foundry-extensions';

export interface NoteSearchCriteria {
  // Text search
  query?: string; // Search in title and content

  // Date filtering
  dateFrom?: ICalendarDate;
  dateTo?: ICalendarDate;

  // Category filtering
  categories?: string[]; // Include only these categories
  excludeCategories?: string[]; // Exclude these categories

  // Tag filtering
  tags?: string[]; // Must have all these tags
  anyTags?: string[]; // Must have any of these tags
  excludeTags?: string[]; // Must not have these tags

  // Content filtering
  playerVisible?: boolean; // Filter by player visibility
  isRecurring?: boolean; // Filter recurring notes

  // User filtering
  author?: string; // Created by specific user

  // Sort options
  sortBy?: 'created' | 'modified' | 'date' | 'title' | 'category';
  sortOrder?: 'asc' | 'desc';

  // Pagination
  limit?: number;
  offset?: number;
}

export interface NoteSearchResult {
  notes: JournalEntry[];
  totalCount: number;
  hasMore: boolean;
  searchTime: number; // milliseconds
}

/**
 * Search and filter calendar notes
 */
export class NoteSearch {
  /**
   * Search notes based on criteria
   */
  static async searchNotes(criteria: NoteSearchCriteria): Promise<NoteSearchResult> {
    const startTime = performance.now();

    // Get all calendar notes
    const allNotes = this.getAllCalendarNotes();

    // Apply filters
    let filteredNotes = allNotes;

    if (criteria.query) {
      filteredNotes = this.filterByText(filteredNotes, criteria.query);
    }

    if (criteria.dateFrom || criteria.dateTo) {
      filteredNotes = this.filterByDateRange(filteredNotes, criteria.dateFrom, criteria.dateTo);
    }

    if (criteria.categories && criteria.categories.length > 0) {
      filteredNotes = this.filterByCategories(filteredNotes, criteria.categories, false);
    }

    if (criteria.excludeCategories && criteria.excludeCategories.length > 0) {
      filteredNotes = this.filterByCategories(filteredNotes, criteria.excludeCategories, true);
    }

    if (criteria.tags && criteria.tags.length > 0) {
      filteredNotes = this.filterByTags(filteredNotes, criteria.tags, 'all');
    }

    if (criteria.anyTags && criteria.anyTags.length > 0) {
      filteredNotes = this.filterByTags(filteredNotes, criteria.anyTags, 'any');
    }

    if (criteria.excludeTags && criteria.excludeTags.length > 0) {
      filteredNotes = this.filterByTags(filteredNotes, criteria.excludeTags, 'exclude');
    }

    if (criteria.playerVisible !== undefined) {
      filteredNotes = this.filterByPlayerVisibility(filteredNotes, criteria.playerVisible);
    }

    if (criteria.isRecurring !== undefined) {
      filteredNotes = this.filterByRecurring(filteredNotes, criteria.isRecurring);
    }

    if (criteria.author) {
      filteredNotes = this.filterByAuthor(filteredNotes, criteria.author);
    }

    // Sort results
    const sortBy = criteria.sortBy || 'created';
    const sortOrder = criteria.sortOrder || 'desc';
    filteredNotes = this.sortNotes(filteredNotes, sortBy, sortOrder);

    // Apply pagination
    const totalCount = filteredNotes.length;
    const offset = criteria.offset || 0;
    const limit = criteria.limit || 50;

    const paginatedNotes = filteredNotes.slice(offset, offset + limit);
    const hasMore = offset + limit < totalCount;

    const searchTime = performance.now() - startTime;

    return {
      notes: paginatedNotes,
      totalCount,
      hasMore,
      searchTime,
    };
  }

  /**
   * Get all calendar notes
   */
  private static getAllCalendarNotes(): JournalEntry[] {
    return game.journal.filter(journal => {
      const flags = journal.flags?.['seasons-and-stars'];
      return flags?.calendarNote === true;
    });
  }

  /**
   * Filter notes by text search in title and content
   */
  private static filterByText(notes: JournalEntry[], query: string): JournalEntry[] {
    if (!query.trim()) return notes;

    const searchTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 0);

    return notes.filter(note => {
      const title = note.name?.toLowerCase() || '';
      const content = note.pages.values().next().value?.text?.content?.toLowerCase() || '';
      const searchText = `${title} ${content}`;

      // All search terms must be found
      return searchTerms.every(term => searchText.includes(term));
    });
  }

  /**
   * Filter notes by date range
   */
  private static filterByDateRange(
    notes: JournalEntry[],
    dateFrom?: ICalendarDate,
    dateTo?: ICalendarDate
  ): JournalEntry[] {
    return notes.filter(note => {
      const flags = note.flags?.['seasons-and-stars'];
      if (!flags?.startDate) return false;

      const noteDate = flags.startDate;

      if (dateFrom && this.isDateBefore(noteDate, dateFrom)) {
        return false;
      }

      if (dateTo && this.isDateAfter(noteDate, dateTo)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Filter notes by categories
   */
  private static filterByCategories(
    notes: JournalEntry[],
    categories: string[],
    exclude: boolean = false
  ): JournalEntry[] {
    return notes.filter(note => {
      const flags = note.flags?.['seasons-and-stars'];
      const noteCategory = flags?.category || 'general';

      const isInCategory = categories.includes(noteCategory);
      return exclude ? !isInCategory : isInCategory;
    });
  }

  /**
   * Filter notes by tags
   */
  private static filterByTags(
    notes: JournalEntry[],
    tags: string[],
    mode: 'all' | 'any' | 'exclude'
  ): JournalEntry[] {
    return notes.filter(note => {
      const flags = note.flags?.['seasons-and-stars'];
      const noteTags = (flags?.tags || []).map(tag => tag.toLowerCase());
      const searchTags = tags.map(tag => tag.toLowerCase());

      switch (mode) {
        case 'all':
          return searchTags.every(tag => noteTags.includes(tag));
        case 'any':
          return searchTags.some(tag => noteTags.includes(tag));
        case 'exclude':
          return !searchTags.some(tag => noteTags.includes(tag));
        default:
          return true;
      }
    });
  }

  /**
   * Filter notes by player visibility
   */
  private static filterByPlayerVisibility(
    notes: JournalEntry[],
    playerVisible: boolean
  ): JournalEntry[] {
    return notes.filter(note => {
      const isVisible = note.ownership?.default >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
      return isVisible === playerVisible;
    });
  }

  /**
   * Filter notes by recurring status
   */
  private static filterByRecurring(notes: JournalEntry[], isRecurring: boolean): JournalEntry[] {
    return notes.filter(note => {
      const flags = note.flags?.['seasons-and-stars'];
      const noteIsRecurring = flags?.isRecurringParent === true || !!flags?.recurringParentId;
      return noteIsRecurring === isRecurring;
    });
  }

  /**
   * Filter notes by author
   */
  private static filterByAuthor(notes: JournalEntry[], authorId: string): JournalEntry[] {
    return notes.filter(note => note.author?.id === authorId);
  }

  /**
   * Sort notes by criteria
   */
  private static sortNotes(
    notes: JournalEntry[],
    sortBy: string,
    sortOrder: string
  ): JournalEntry[] {
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    return notes.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'title':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;

        case 'category': {
          const catA = a.flags?.['seasons-and-stars']?.category || 'general';
          const catB = b.flags?.['seasons-and-stars']?.category || 'general';
          comparison = catA.localeCompare(catB);
          break;
        }

        case 'date': {
          const dateA = a.flags?.['seasons-and-stars']?.startDate;
          const dateB = b.flags?.['seasons-and-stars']?.startDate;
          if (dateA && dateB) {
            comparison = this.compareDates(dateA, dateB);
          }
          break;
        }

        case 'created': {
          const createdA = a.flags?.['seasons-and-stars']?.created || 0;
          const createdB = b.flags?.['seasons-and-stars']?.created || 0;
          comparison = createdA - createdB;
          break;
        }

        case 'modified': {
          const modifiedA = a.flags?.['seasons-and-stars']?.modified || 0;
          const modifiedB = b.flags?.['seasons-and-stars']?.modified || 0;
          comparison = modifiedA - modifiedB;
          break;
        }
      }

      return comparison * multiplier;
    });
  }

  /**
   * Compare two dates
   */
  private static compareDates(dateA: ICalendarDate, dateB: ICalendarDate): number {
    if (dateA.year !== dateB.year) return dateA.year - dateB.year;
    if (dateA.month !== dateB.month) return dateA.month - dateB.month;
    return dateA.day - dateB.day;
  }

  /**
   * Check if date A is before date B
   */
  private static isDateBefore(dateA: ICalendarDate, dateB: ICalendarDate): boolean {
    return this.compareDates(dateA, dateB) < 0;
  }

  /**
   * Check if date A is after date B
   */
  private static isDateAfter(dateA: ICalendarDate, dateB: ICalendarDate): boolean {
    return this.compareDates(dateA, dateB) > 0;
  }

  /**
   * Get search suggestions based on existing notes
   */
  static getSearchSuggestions(): {
    categories: string[];
    tags: string[];
    authors: string[];
  } {
    const notes = this.getAllCalendarNotes();
    const categories = new Set<string>();
    const tags = new Set<string>();
    const authors = new Set<string>();

    notes.forEach(note => {
      const flags = note.flags?.['seasons-and-stars'];

      // Collect categories
      if (flags?.category) {
        categories.add(flags.category);
      }

      // Collect tags
      if (flags?.tags) {
        flags.tags.forEach((tag: string) => tags.add(tag));
      }

      // Collect authors
      if (note.author?.name) {
        authors.add(note.author.name);
      }
    });

    return {
      categories: Array.from(categories).sort(),
      tags: Array.from(tags).sort(),
      authors: Array.from(authors).sort(),
    };
  }

  /**
   * Create quick search presets
   */
  static getSearchPresets(): Record<string, NoteSearchCriteria> {
    return {
      recent: {
        sortBy: 'created',
        sortOrder: 'desc',
        limit: 10,
      },
      upcoming: {
        dateFrom: this.getCurrentDate(),
        sortBy: 'date',
        sortOrder: 'asc',
        limit: 10,
      },
      recurring: {
        isRecurring: true,
        sortBy: 'title',
        sortOrder: 'asc',
      },
      important: {
        anyTags: ['important', 'urgent'],
        sortBy: 'created',
        sortOrder: 'desc',
      },
      'player-visible': {
        playerVisible: true,
        sortBy: 'date',
        sortOrder: 'asc',
      },
    };
  }

  /**
   * Get current date from calendar manager
   */
  private static getCurrentDate(): ICalendarDate {
    const currentDate = (game.seasonsStars?.manager as CalendarManagerInterface)?.getCurrentDate();
    if (currentDate) {
      return currentDate;
    }

    // Fallback to a reasonable default
    const fallbackData: CalendarDateData = {
      year: 2024,
      month: 1,
      day: 1,
      weekday: 0,
      time: { hour: 0, minute: 0, second: 0 },
    };

    // Create a CalendarDate instance - need calendar for this
    const manager = game.seasonsStars?.manager as CalendarManagerInterface;
    const calendar = manager?.getActiveCalendar();
    if (calendar) {
      return new CalendarDate(fallbackData, calendar);
    }

    // If no calendar available, this shouldn't happen but return the data
    return fallbackData as ICalendarDate;
  }
}
