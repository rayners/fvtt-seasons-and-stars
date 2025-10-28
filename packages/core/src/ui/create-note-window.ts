/**
 * Create Note Window - ApplicationV2-based window for creating calendar notes
 *
 * This window provides a persistent interface for creating multiple notes without closing.
 * Uses ApplicationV2 instead of DialogV2 to support "Create & Add Another" workflow.
 */

import type { CalendarDate as ICalendarDate } from '../types/calendar';
import { Logger } from '../core/logger';
import type { CreateNoteData } from '../core/notes-manager';
import type { NotesManager } from '../core/notes-manager';
import type { NoteCategories } from '../core/note-categories';
import type { StringTagsElement } from '../types/foundry-elements';
import type { CalendarManagerInterface } from '../types/foundry-extensions';

export interface CreateNoteWindowOptions {
  /** The date to associate with newly created notes */
  date: ICalendarDate;
  /** Optional callback when a note is successfully created */
  onNoteCreated?: (note: JournalEntry) => void;
}

/**
 * Window for creating calendar notes with enhanced category and tag support
 */
export class CreateNoteWindow extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  private date: ICalendarDate;
  private onNoteCreated?: (note: JournalEntry) => void;

  constructor(options: CreateNoteWindowOptions) {
    super({});
    this.date = options.date;
    this.onNoteCreated = options.onNoteCreated;
  }

  static DEFAULT_OPTIONS = {
    id: 'create-note-{id}',
    classes: ['seasons-stars', 'create-note-window'],
    tag: 'div',
    window: {
      frame: true,
      positioned: true,
      title: 'Create Note',
      icon: 'fas fa-calendar-plus',
      minimizable: false,
      resizable: true,
    },
    position: {
      width: 600,
      height: 'auto' as const,
    },
    actions: {
      create: CreateNoteWindow.prototype._onCreate,
      createAnother: CreateNoteWindow.prototype._onCreateAnother,
      close: CreateNoteWindow.prototype._onClose,
    },
  };

  static PARTS = {
    form: {
      id: 'form',
      template: 'modules/seasons-and-stars/templates/create-note-form.hbs',
    },
  };

  /**
   * Prepare rendering context for template
   */
  async _prepareContext(_options = {}): Promise<any> {
    const context = await super._prepareContext(_options);

    const categories = game.seasonsStars?.categories as NoteCategories | undefined;
    if (!categories) {
      return Object.assign(context, {
        error: 'Note categories system not available',
        categories: [],
        predefinedTags: [],
        existingTags: [],
        dateDisplay: '',
        date: this.date,
      });
    }

    const manager = game.seasonsStars?.manager as CalendarManagerInterface | undefined;
    const activeCalendar = manager?.getActiveCalendar?.();

    // Format date display
    let dateDisplay = `${this.date.year}-${this.date.month.toString().padStart(2, '0')}-${this.date.day.toString().padStart(2, '0')}`;

    if (activeCalendar) {
      const monthName =
        activeCalendar.months[this.date.month - 1]?.name || `Month ${this.date.month}`;
      const yearPrefix = activeCalendar.year?.prefix || '';
      const yearSuffix = activeCalendar.year?.suffix || '';
      dateDisplay = `${this.date.day} ${monthName}, ${yearPrefix}${this.date.year}${yearSuffix}`;
    }

    // Get categories for dropdown
    const availableCategories = categories.getCategories();
    const defaultCategory = categories.getDefaultCategory();

    // Get tags for suggestions
    const predefinedTags = categories.getPredefinedTags();
    const existingTags = this._getExistingTags();
    const allTags = Array.from(new Set([...predefinedTags, ...existingTags]));

    return Object.assign(context, {
      dateDisplay,
      date: this.date,
      categories: availableCategories,
      defaultCategory: defaultCategory.id,
      allTags,
    });
  }

  /**
   * Get existing tags from all notes for autocompletion
   */
  private _getExistingTags(): string[] {
    const notesManager = game.seasonsStars?.notes as NotesManager | undefined;
    const existingTags = new Set<string>();

    if (!notesManager) return [];

    try {
      // Try to get notes from storage
      if (typeof (notesManager as any).storage?.getAllNotes === 'function') {
        const allNotes = (notesManager as any).storage.getAllNotes() || [];
        allNotes.forEach((note: any) => {
          const noteTags = note.flags?.['seasons-and-stars']?.tags || [];
          noteTags.forEach((tag: string) => existingTags.add(tag));
        });
      } else {
        // Fallback: get notes from game.journal
        if (game.journal) {
          for (const entry of game.journal.values()) {
            if (entry.flags?.['seasons-and-stars']?.calendarNote === true) {
              const noteTags = entry.flags?.['seasons-and-stars']?.tags || [];
              noteTags.forEach((tag: string) => existingTags.add(tag));
            }
          }
        }
      }
    } catch (error) {
      Logger.debug('Could not load existing tags for autocompletion', error);
    }

    return Array.from(existingTags);
  }

  /**
   * Setup event listeners after render
   */
  _onRender(_context: any, _options: any): void {
    super._onRender(_context, _options);

    const html = this.element;
    if (!html) return;

    // Setup category select styling
    const categorySelect = html.querySelector('select[name="category"]') as HTMLSelectElement;
    if (categorySelect) {
      this._updateCategoryBorder(categorySelect);
      categorySelect.addEventListener('change', () => this._updateCategoryBorder(categorySelect));
    }

    // Setup tag suggestions click handlers for string-tags element
    const tagSuggestions = html.querySelectorAll('.tag-suggestion');
    const stringTagsElement = html.querySelector('string-tags') as StringTagsElement | null;

    if (!stringTagsElement) {
      Logger.warn('string-tags element not found in create note form');
    }

    tagSuggestions.forEach(suggestion => {
      suggestion.addEventListener('click', () => {
        const tag = suggestion.getAttribute('data-tag');
        if (tag && stringTagsElement) {
          // Add tag to string-tags element
          const currentTags = stringTagsElement.value || [];
          if (!currentTags.includes(tag)) {
            stringTagsElement.value = [...currentTags, tag];
          }
        }
      });
    });

    // Focus on title input
    const titleInput = html.querySelector('input[name="title"]') as HTMLInputElement;
    if (titleInput) titleInput.focus();
  }

  /**
   * Update category select border color
   */
  private _updateCategoryBorder(selectElement: HTMLSelectElement): void {
    const categories = game.seasonsStars?.categories as NoteCategories | undefined;
    if (!categories) return;

    const selectedCat = categories.getCategory(selectElement.value);
    if (selectedCat) {
      selectElement.style.borderLeft = `4px solid ${selectedCat.color}`;
    }
  }

  /**
   * Validate and create note from form data
   * Returns true if note was created successfully
   */
  private async _validateAndCreateNote(): Promise<boolean> {
    const form = this.element?.querySelector('form') as HTMLFormElement;
    if (!form) return false;

    const formData = new FormData(form);

    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const category = formData.get('category') as string;
    const allDay = formData.has('allDay');

    // Get tags from string-tags element
    const stringTagsElement = form.querySelector('string-tags') as StringTagsElement | null;
    const tags = stringTagsElement?.value || [];

    // Validate required fields
    if (!title?.trim()) {
      ui.notifications?.error('Note title is required');
      return false;
    }

    const categories = game.seasonsStars?.categories as NoteCategories | undefined;
    if (!categories) {
      ui.notifications?.error('Note categories system not available');
      return false;
    }

    const notesManager = game.seasonsStars?.notes as NotesManager | undefined;
    if (!notesManager) {
      ui.notifications?.error('Notes manager not available');
      return false;
    }

    // Validate tags
    const { valid: validTags, invalid: invalidTags } = categories.validateTags(tags);

    if (invalidTags.length > 0) {
      ui.notifications?.warn(`Some tags are not allowed: ${invalidTags.join(', ')}`);
    }

    // Create note data
    const noteData: CreateNoteData = {
      title: title.trim(),
      content: content || '',
      startDate: this.date,
      allDay,
      category: category || categories.getDefaultCategory().id,
      tags: validTags,
      playerVisible: false,
      recurring: undefined,
    };

    // Create the note
    try {
      const note = await notesManager.createNote(noteData);
      ui.notifications?.info(`Created note: ${noteData.title}`);

      // Call callback if provided
      if (this.onNoteCreated) {
        this.onNoteCreated(note);
      }

      // Emit hook for other modules
      Hooks.callAll('seasons-stars:noteCreated', note);

      return true;
    } catch (error) {
      Logger.error('Failed to create note', error as Error);
      ui.notifications?.error('Failed to create note. Please try again.');
      return false;
    }
  }

  /**
   * Reset form to default values
   */
  private _resetForm(): void {
    const form = this.element?.querySelector('form') as HTMLFormElement;
    if (!form) return;

    const titleInput = form.querySelector('input[name="title"]') as HTMLInputElement | null;
    const contentInput = form.querySelector(
      'textarea[name="content"]'
    ) as HTMLTextAreaElement | null;
    const stringTagsElement = form.querySelector('string-tags') as StringTagsElement | null;
    const allDayInput = form.querySelector('input[name="allDay"]') as HTMLInputElement | null;
    const categorySelect = form.querySelector(
      'select[name="category"]'
    ) as HTMLSelectElement | null;

    if (titleInput) titleInput.value = '';
    if (contentInput) contentInput.value = '';
    if (stringTagsElement) stringTagsElement.value = [];
    if (allDayInput) allDayInput.checked = true;
    if (categorySelect) {
      categorySelect.selectedIndex = 0;
      this._updateCategoryBorder(categorySelect);
    }

    // Focus on title input
    if (titleInput) titleInput.focus();
  }

  /**
   * Action: Create note and close window
   */
  async _onCreate(_event: Event, _target: HTMLElement): Promise<void> {
    const success = await this._validateAndCreateNote();
    if (success) {
      this.close();
    }
  }

  /**
   * Action: Create note and reset form for another
   */
  async _onCreateAnother(_event: Event, _target: HTMLElement): Promise<void> {
    const success = await this._validateAndCreateNote();
    if (success) {
      this._resetForm();
    }
  }

  /**
   * Action: Close window
   */
  async _onClose(_event: Event, _target: HTMLElement): Promise<void> {
    this.close();
  }

  /**
   * Static method to show the create note window
   */
  static async show(options: CreateNoteWindowOptions): Promise<CreateNoteWindow> {
    const window = new CreateNoteWindow(options);
    await window.render(true);
    return window;
  }
}
