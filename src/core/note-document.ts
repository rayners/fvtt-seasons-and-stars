/**
 * Calendar-specific JournalEntry wrapper for easier note management
 */

import type { CalendarDate as ICalendarDate } from '../types/calendar';
import type { CalendarManagerInterface } from '../types/foundry-extensions';
import { CalendarDate } from './calendar-date';

/**
 * Wrapper class for calendar notes with enhanced functionality
 */
export class CalendarNote {
  constructor(private journal: JournalEntry) {
    if (!this.isValidCalendarNote()) {
      throw new Error('JournalEntry is not a valid calendar note');
    }
  }

  /**
   * Get the underlying JournalEntry
   */
  get journalEntry(): JournalEntry {
    return this.journal;
  }

  /**
   * Get the note ID
   */
  get id(): string {
    return this.journal.id;
  }

  /**
   * Get the note title
   */
  get title(): string {
    return this.journal.name;
  }

  /**
   * Get the note content
   */
  get content(): string {
    const pages = this.journal.pages;
    if (pages.size === 0) return '';

    const firstPage = pages.values().next().value;
    return firstPage?.text?.content || '';
  }

  /**
   * Get the start date of the note
   */
  get startDate(): ICalendarDate | null {
    const flags = this.journal.flags?.['seasons-and-stars'];
    return flags?.startDate || null;
  }

  /**
   * Get the end date of the note (if any)
   */
  get endDate(): ICalendarDate | null {
    const flags = this.journal.flags?.['seasons-and-stars'];
    return flags?.endDate || null;
  }

  /**
   * Check if this is an all-day event
   */
  get isAllDay(): boolean {
    const flags = this.journal.flags?.['seasons-and-stars'];
    return flags?.allDay || false;
  }

  /**
   * Get the calendar ID this note belongs to
   */
  get calendarId(): string {
    const flags = this.journal.flags?.['seasons-and-stars'];
    return flags?.calendarId || 'default';
  }

  /**
   * Get the note category
   */
  get category(): string {
    const flags = this.journal.flags?.['seasons-and-stars'];
    return flags?.category || 'general';
  }

  /**
   * Get the note tags
   */
  get tags(): string[] {
    const flags = this.journal.flags?.['seasons-and-stars'];
    return flags?.tags || [];
  }

  /**
   * Get the creation timestamp
   */
  get created(): number {
    const flags = this.journal.flags?.['seasons-and-stars'];
    return flags?.created || 0;
  }

  /**
   * Get the last modified timestamp
   */
  get modified(): number {
    const flags = this.journal.flags?.['seasons-and-stars'];
    return flags?.modified || 0;
  }

  /**
   * Get the date key for indexing
   */
  get dateKey(): string {
    const flags = this.journal.flags?.['seasons-and-stars'];
    return flags?.dateKey || '';
  }

  /**
   * Check if the note spans multiple days
   */
  get isMultiDay(): boolean {
    const start = this.startDate;
    const end = this.endDate;

    if (!start || !end) return false;

    return start.year !== end.year || start.month !== end.month || start.day !== end.day;
  }

  /**
   * Get formatted date string
   */
  getFormattedDate(): string {
    const startDate = this.startDate;
    if (!startDate) return 'Unknown Date';

    const activeCalendar = (
      game.seasonsStars?.manager as CalendarManagerInterface
    )?.getActiveCalendar();
    if (!activeCalendar) return this.dateKey;

    const calendarDate = new CalendarDate(startDate, activeCalendar);

    if (this.isAllDay) {
      return calendarDate.toDateString();
    } else {
      return calendarDate.toLongString();
    }
  }

  /**
   * Update the note content
   */
  async updateContent(content: string): Promise<void> {
    const pages = this.journal.pages;
    if (pages.size === 0) {
      // Create first page if none exists
      await this.journal.createEmbeddedDocuments('JournalEntryPage', [
        {
          type: 'text',
          name: 'Content',
          text: { content },
        },
      ]);
    } else {
      // Update existing page
      const firstPage = pages.values().next().value;
      if (firstPage?.update) {
        await firstPage.update({
          'text.content': content,
        });
      }
    }

    // Update modified timestamp
    await this.updateModified();
  }

  /**
   * Update the note title
   */
  async updateTitle(title: string): Promise<void> {
    await this.journal.update({ name: title });
    await this.updateModified();
  }

  /**
   * Update the note dates
   */
  async updateDates(startDate: ICalendarDate, endDate?: ICalendarDate): Promise<void> {
    const updateData = {
      'flags.seasons-and-stars.startDate': startDate,
      'flags.seasons-and-stars.dateKey': this.formatDateKey(startDate),
      'flags.seasons-and-stars.modified': Date.now(),
    };

    if (endDate) {
      updateData['flags.seasons-and-stars.endDate'] = endDate;
    }

    await this.journal.update(updateData);
  }

  /**
   * Update the note category
   */
  async updateCategory(category: string): Promise<void> {
    await this.journal.update({
      'flags.seasons-and-stars.category': category,
      'flags.seasons-and-stars.modified': Date.now(),
    });
  }

  /**
   * Update the note tags
   */
  async updateTags(tags: string[]): Promise<void> {
    await this.journal.update({
      'flags.seasons-and-stars.tags': tags,
      'flags.seasons-and-stars.modified': Date.now(),
    });
  }

  /**
   * Set a module-specific flag
   */
  async setModuleFlag(moduleId: string, key: string, data: any): Promise<void> {
    await this.journal.setFlag(moduleId, key, data);
    await this.updateModified();
  }

  /**
   * Get a module-specific flag
   */
  getModuleFlag(moduleId: string, key: string): any {
    return this.journal.getFlag(moduleId, key);
  }

  /**
   * Set multiple module flags at once
   */
  async setModuleFlags(moduleId: string, flags: Record<string, any>): Promise<void> {
    const updates = {};
    for (const [key, value] of Object.entries(flags)) {
      updates[`flags.${moduleId}.${key}`] = value;
    }

    await this.journal.update(updates);
    await this.updateModified();
  }

  /**
   * Check if a user can view this note
   */
  isVisibleToUser(user: User): boolean {
    if (user.isGM) return true;

    const ownership = this.journal.ownership;
    const userLevel =
      ownership[user.id] || ownership.default || CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;

    return userLevel >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
  }

  /**
   * Check if a user can edit this note
   */
  isEditableByUser(user: User): boolean {
    if (user.isGM) return true;

    const ownership = this.journal.ownership;
    const userLevel =
      ownership[user.id] || ownership.default || CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;

    return userLevel >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  }

  /**
   * Update ownership permissions
   */
  async updateOwnership(ownership: any): Promise<void> {
    await this.journal.update({ ownership });
  }

  /**
   * Set player visibility
   */
  async setPlayerVisible(visible: boolean): Promise<void> {
    const ownership = visible ? { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER } : {};

    await this.updateOwnership(ownership);
  }

  /**
   * Clone this note with optional modifications
   */
  async clone(
    modifications: {
      title?: string;
      content?: string;
      startDate?: ICalendarDate;
      endDate?: ICalendarDate;
      category?: string;
      tags?: string[];
    } = {}
  ): Promise<CalendarNote> {
    const cloneData = {
      name: modifications.title || this.title,
      folder: this.journal.folder,
      ownership: this.journal.ownership,
      flags: foundry.utils.deepClone(this.journal.flags),
    };

    // Update calendar-specific flags
    const flags = cloneData.flags['seasons-and-stars'];
    if (modifications.startDate) {
      flags.startDate = modifications.startDate;
      flags.dateKey = this.formatDateKey(modifications.startDate);
    }
    if (modifications.endDate !== undefined) {
      flags.endDate = modifications.endDate;
    }
    if (modifications.category) {
      flags.category = modifications.category;
    }
    if (modifications.tags) {
      flags.tags = modifications.tags;
    }

    // Update timestamps
    flags.created = Date.now();
    flags.modified = Date.now();

    const clonedJournal = await JournalEntry.create(cloneData);
    if (!clonedJournal) {
      throw new Error('Failed to clone note');
    }

    // Copy content with modifications
    const content = modifications.content || this.content;
    if (content) {
      await clonedJournal.createEmbeddedDocuments('JournalEntryPage', [
        {
          type: 'text',
          name: 'Content',
          text: { content },
        },
      ]);
    }

    return new CalendarNote(clonedJournal);
  }

  /**
   * Export note data for backup/migration
   */
  export(): any {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      startDate: this.startDate,
      endDate: this.endDate,
      isAllDay: this.isAllDay,
      calendarId: this.calendarId,
      category: this.category,
      tags: this.tags,
      created: this.created,
      modified: this.modified,
      ownership: this.journal.ownership,
      flags: this.journal.flags,
    };
  }

  /**
   * Create a CalendarNote from exported data
   */
  static async import(data: any): Promise<CalendarNote> {
    const journal = await JournalEntry.create({
      name: data.title,
      ownership: data.ownership,
      flags: data.flags,
    });

    if (!journal) {
      throw new Error('Failed to import note');
    }

    if (data.content) {
      await journal.createEmbeddedDocuments('JournalEntryPage', [
        {
          type: 'text',
          name: 'Content',
          text: { content: data.content },
        },
      ]);
    }

    return new CalendarNote(journal);
  }

  /**
   * Validate that the journal entry is a proper calendar note
   */
  private isValidCalendarNote(): boolean {
    const flags = this.journal.flags?.['seasons-and-stars'];
    return (
      flags?.calendarNote === true && flags?.startDate !== undefined && flags?.dateKey !== undefined
    );
  }

  /**
   * Update the modified timestamp
   */
  private async updateModified(): Promise<void> {
    await this.journal.setFlag('seasons-and-stars', 'modified', Date.now());
  }

  /**
   * Format a date as a key for storage
   */
  private formatDateKey(date: ICalendarDate): string {
    const year = date.year.toString().padStart(4, '0');
    const month = date.month.toString().padStart(2, '0');
    const day = date.day.toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Create a CalendarNote wrapper from a JournalEntry
   */
  static fromJournalEntry(journal: JournalEntry): CalendarNote | null {
    try {
      return new CalendarNote(journal);
    } catch (_error) {
      // Not a valid calendar note
      return null;
    }
  }

  /**
   * Get all calendar notes from the journal collection
   */
  static getAllCalendarNotes(): CalendarNote[] {
    const notes: CalendarNote[] = [];

    game.journal?.forEach(journal => {
      const note = CalendarNote.fromJournalEntry(journal);
      if (note) {
        notes.push(note);
      }
    });

    return notes;
  }

  /**
   * Find calendar notes by category
   */
  static getByCategory(category: string): CalendarNote[] {
    return CalendarNote.getAllCalendarNotes().filter(note => note.category === category);
  }

  /**
   * Find calendar notes by tag
   */
  static getByTag(tag: string): CalendarNote[] {
    return CalendarNote.getAllCalendarNotes().filter(note => note.tags.includes(tag));
  }
}
