/**
 * Custom note editing dialog for calendar notes
 * Provides editing interface with S&S-specific fields and tag management
 */

import type { CalendarDate as ICalendarDate } from '../types/calendar';
import { CalendarDate } from '../core/calendar-date';
import { Logger } from '../core/logger';
import type { UpdateNoteData } from '../core/notes-manager';

export interface NoteEditingData {
  title: string;
  content: string;
  startDate: ICalendarDate;
  endDate?: ICalendarDate;
  allDay: boolean;
  category: string;
  tags: string[];
  playerVisible: boolean;
  recurring?: any; // Future recurring pattern support
}

/**
 * Custom dialog for editing calendar notes with enhanced S&S features
 */
export class NoteEditingDialog {
  private journal: JournalEntry;
  private originalData: NoteEditingData;

  constructor(journal: JournalEntry) {
    this.journal = journal;
    this.originalData = this.extractNoteData();
  }

  /**
   * Extract current note data from journal entry
   */
  private extractNoteData(): NoteEditingData {
    const flags = this.journal.flags?.['seasons-and-stars'];

    // Get content from first page
    let content = '';
    if (this.journal.pages.size > 0) {
      const firstPage = this.journal.pages.values().next().value;
      content = firstPage?.text?.content || '';
    }

    return {
      title: this.journal.name,
      content,
      startDate: flags?.startDate || { year: 2024, month: 1, day: 1 },
      endDate: flags?.endDate,
      allDay: flags?.allDay || true,
      category: flags?.category || 'general',
      tags: flags?.tags || [],
      playerVisible: this.journal.ownership?.default === CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
    };
  }

  /**
   * Generate the dialog content HTML
   */
  private generateContent(): string {
    const categories = game.seasonsStars?.categories;
    if (!categories) {
      return '<p style="color: red;">Note categories system not available</p>';
    }

    // Format date display
    const manager = game.seasonsStars?.manager;
    const activeCalendar = manager?.getActiveCalendar();
    let dateDisplayStr = `${this.originalData.startDate.year}-${this.originalData.startDate.month.toString().padStart(2, '0')}-${this.originalData.startDate.day.toString().padStart(2, '0')}`;
    let calendarInfo = '';

    if (activeCalendar) {
      const monthName =
        activeCalendar.months[this.originalData.startDate.month - 1]?.name ||
        `Month ${this.originalData.startDate.month}`;
      const yearPrefix = activeCalendar.year?.prefix || '';
      const yearSuffix = activeCalendar.year?.suffix || '';
      dateDisplayStr = `${this.originalData.startDate.day} ${monthName}, ${yearPrefix}${this.originalData.startDate.year}${yearSuffix}`;
      calendarInfo = `<div style="text-align: center; margin-bottom: 16px; padding: 8px; background: rgba(0,0,0,0.1); border-radius: 4px; font-weight: 600; color: var(--color-text-dark-primary);">${dateDisplayStr}</div>`;
    }

    // Build category options
    const availableCategories = categories.getCategories();
    const categoryOptions = availableCategories
      .map(
        cat =>
          `<option value="${cat.id}" ${cat.id === this.originalData.category ? 'selected' : ''}>${cat.name}</option>`
      )
      .join('');

    // Get predefined tags for suggestions
    const predefinedTags = categories.getPredefinedTags();

    // Get existing tags from all notes for autocompletion
    const notesManager = game.seasonsStars?.notes;
    const existingTags = new Set<string>();
    if (notesManager && notesManager.storage) {
      try {
        if (typeof notesManager.storage.getAllNotes === 'function') {
          const allNotes = notesManager.storage.getAllNotes() || [];
          allNotes.forEach(note => {
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
    }

    // Combine predefined and existing tags for autocompletion
    const allAvailableTags = Array.from(new Set([...predefinedTags, ...existingTags]));

    // Build tag suggestions
    const tagSuggestions = allAvailableTags
      .map(tag => `<span class="tag-suggestion" data-tag="${tag}">${tag}</span>`)
      .join(' ');

    // Format current tags for display in input
    const currentTagsString = this.originalData.tags.join(', ');

    return `
      <style>
        .seasons-stars-note-form {
          max-width: 600px;
          font-family: var(--font-primary);
          overflow: visible;
        }
        .seasons-stars-note-form .form-group {
          margin-bottom: 16px;
        }
        .seasons-stars-note-form .form-row {
          display: flex;
          gap: 12px;
        }
        .seasons-stars-note-form .form-group.half-width {
          flex: 1;
        }
        .seasons-stars-note-form label {
          display: block;
          margin-bottom: 4px;
          font-weight: 600;
          color: var(--color-text-dark-primary);
          font-size: 13px;
        }
        .seasons-stars-note-form input[type="text"],
        .seasons-stars-note-form textarea,
        .seasons-stars-note-form select {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid var(--color-border-dark);
          border-radius: 4px;
          background: var(--color-bg-option);
          color: var(--color-text-dark-primary);
          font-size: 13px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          line-height: 1.4;
          min-height: 36px;
        }
        .seasons-stars-note-form select {
          padding: 6px 10px;
          height: auto;
          min-height: 34px;
        }
        .seasons-stars-note-form input[type="text"]:focus,
        .seasons-stars-note-form textarea:focus,
        .seasons-stars-note-form select:focus {
          border-color: var(--color-border-highlight);
          box-shadow: 0 0 0 2px rgba(var(--color-shadow-highlight), 0.2);
          outline: none;
        }
        .seasons-stars-note-form textarea {
          resize: vertical;
          min-height: 80px;
        }
        .seasons-stars-note-form .tag-suggestions {
          margin-top: 6px;
          max-height: 80px;
          overflow-y: auto;
          border: 1px solid var(--color-border-light);
          border-radius: 4px;
          padding: 8px;
          background: rgba(0, 0, 0, 0.1);
        }
        .seasons-stars-note-form .tag-suggestions small {
          display: block;
          margin-bottom: 6px;
          color: var(--color-text-dark-secondary);
          font-weight: 600;
          font-size: 11px;
        }
        .seasons-stars-note-form .tag-suggestion {
          display: inline-block;
          background: var(--color-bg-btn);
          border: 1px solid var(--color-border-dark);
          border-radius: 12px;
          padding: 4px 10px;
          margin: 2px 4px 2px 0;
          cursor: pointer;
          font-size: 11px;
          font-weight: 500;
          transition: all 0.2s ease;
          user-select: none;
        }
        .seasons-stars-note-form .tag-suggestion:hover {
          background: var(--color-bg-btn-hover);
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .seasons-stars-note-form .tag-autocomplete {
          position: relative;
        }
        .seasons-stars-note-form .tag-autocomplete-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: var(--color-bg-option);
          border: 1px solid var(--color-border-dark);
          border-top: none;
          border-radius: 0 0 4px 4px;
          max-height: 120px;
          overflow-y: auto;
          z-index: 1000;
          display: none;
        }
        .seasons-stars-note-form .tag-autocomplete-item {
          padding: 6px 10px;
          cursor: pointer;
          font-size: 12px;
          border-bottom: 1px solid var(--color-border-light);
          transition: background-color 0.15s ease;
        }
        .seasons-stars-note-form .tag-autocomplete-item:hover,
        .seasons-stars-note-form .tag-autocomplete-item.selected {
          background: var(--color-bg-btn-hover);
        }
        .seasons-stars-note-form .tag-autocomplete-item:last-child {
          border-bottom: none;
        }
        .seasons-stars-note-form .tag-autocomplete-item .tag-match {
          font-weight: 600;
          color: var(--color-text-highlight);
        }
        .seasons-stars-note-form .category-select {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background-image: url('data:image/svg+xml;charset=US-ASCII,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 5"><path fill="%23666" d="M2 0L0 2h4zm0 5L0 3h4z"/></svg>');
          background-repeat: no-repeat;
          background-position: right 8px center;
          background-size: 12px;
          padding-right: 30px !important;
          vertical-align: top;
        }
        .seasons-stars-note-form input[type="checkbox"] {
          margin-right: 6px;
        }
        .seasons-stars-note-form .visibility-section {
          border: 1px solid var(--color-border-light);
          border-radius: 4px;
          padding: 12px;
          background: rgba(0, 0, 0, 0.05);
        }
        .seasons-stars-note-form .visibility-section h4 {
          margin: 0 0 8px 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-dark-primary);
        }
      </style>
      <form class="seasons-stars-note-form">
        ${calendarInfo}
        
        <div class="form-group">
          <label>Title:</label>
          <input type="text" name="title" value="${this.originalData.title}" autofocus />
        </div>
        
        <div class="form-group">
          <label>Content:</label>
          <textarea name="content" rows="6">${this.originalData.content}</textarea>
        </div>
        
        <div class="form-row">
          <div class="form-group half-width">
            <label>Category:</label>
            <select name="category" class="category-select">
              ${categoryOptions}
            </select>
          </div>
          <div class="form-group half-width">
            <label>
              <input type="checkbox" name="allDay" ${this.originalData.allDay ? 'checked' : ''} />
              All Day Event
            </label>
          </div>
        </div>
        
        <div class="form-group">
          <label>Tags (optional):</label>
          <div class="tag-autocomplete">
            <input type="text" name="tags" value="${currentTagsString}" placeholder="Enter tags separated by commas" class="tags-input" autocomplete="off" />
            <div class="tag-autocomplete-dropdown"></div>
          </div>
          <div class="tag-suggestions">
            <small>Click to add:</small>
            ${tagSuggestions}
          </div>
        </div>

        <div class="form-group">
          <div class="visibility-section">
            <h4>Player Visibility</h4>
            <label>
              <input type="checkbox" name="playerVisible" ${this.originalData.playerVisible ? 'checked' : ''} />
              Make visible to players
            </label>
          </div>
        </div>
      </form>
    `;
  }

  /**
   * Setup tag autocompletion functionality
   */
  private setupTagAutocompletion(html: JQuery): void {
    const categories = game.seasonsStars?.categories;
    if (!categories) return;

    const tagsInput = html.find('input[name="tags"]');
    const autocompleteDropdown = html.find('.tag-autocomplete-dropdown');
    let selectedIndex = -1;

    // Get all available tags for autocompletion
    const predefinedTags = categories.getPredefinedTags();
    const notesManager = game.seasonsStars?.notes;
    const existingTags = new Set<string>();

    if (notesManager && notesManager.storage) {
      try {
        if (typeof notesManager.storage.getAllNotes === 'function') {
          const allNotes = notesManager.storage.getAllNotes() || [];
          allNotes.forEach(note => {
            const noteTags = note.flags?.['seasons-and-stars']?.tags || [];
            noteTags.forEach((tag: string) => existingTags.add(tag));
          });
        }
      } catch (error) {
        Logger.debug('Could not load existing tags for autocompletion', error);
      }
    }

    const allAvailableTags = Array.from(new Set([...predefinedTags, ...existingTags]));

    // Tag matching function
    function matchTag(
      searchTerm: string,
      tagToMatch: string
    ): { matches: boolean; highlighted: string } {
      const search = searchTerm.toLowerCase();
      const tag = tagToMatch.toLowerCase();

      // Direct match
      if (tag.includes(search)) {
        const index = tag.indexOf(search);
        const highlighted =
          tagToMatch.substring(0, index) +
          '<span class="tag-match">' +
          tagToMatch.substring(index, index + search.length) +
          '</span>' +
          tagToMatch.substring(index + search.length);
        return { matches: true, highlighted };
      }

      // Colon-separated tag matching
      if (tag.includes(':')) {
        const parts = tag.split(':');
        for (const part of parts) {
          if (part.trim().includes(search)) {
            const partIndex = part.trim().indexOf(search);
            const highlighted = tagToMatch.replace(
              part,
              part.substring(0, partIndex) +
                '<span class="tag-match">' +
                part.substring(partIndex, partIndex + search.length) +
                '</span>' +
                part.substring(partIndex + search.length)
            );
            return { matches: true, highlighted };
          }
        }
      }

      return { matches: false, highlighted: tagToMatch };
    }

    // Function to get current typing context
    function getCurrentTypingContext(): {
      beforeCursor: string;
      afterCursor: string;
      currentTag: string;
    } {
      const inputElement = tagsInput[0] as HTMLInputElement;
      const cursorPos = inputElement.selectionStart || 0;
      const value = inputElement.value;

      const beforeCursor = value.substring(0, cursorPos);
      const afterCursor = value.substring(cursorPos);

      // Find the current tag being typed
      const lastCommaIndex = beforeCursor.lastIndexOf(',');
      const currentTag = beforeCursor.substring(lastCommaIndex + 1).trim();

      return { beforeCursor, afterCursor, currentTag };
    }

    // Function to replace current tag
    function replaceCurrentTag(newTag: string): void {
      const inputElement = tagsInput[0] as HTMLInputElement;
      const cursorPos = inputElement.selectionStart || 0;
      const value = inputElement.value;

      const beforeCursor = value.substring(0, cursorPos);
      const afterCursor = value.substring(cursorPos);

      const lastCommaIndex = beforeCursor.lastIndexOf(',');
      const beforeTag = beforeCursor.substring(0, lastCommaIndex + 1);
      const prefix = beforeTag + (beforeTag.endsWith(',') ? ' ' : '');

      const newValue = prefix + newTag + afterCursor;
      tagsInput.val(newValue);

      // Set cursor position after the inserted tag
      const newCursorPos = prefix.length + newTag.length;
      inputElement.setSelectionRange(newCursorPos, newCursorPos);
    }

    // Input event for autocomplete
    tagsInput.on('input', () => {
      const context = getCurrentTypingContext();

      if (context.currentTag.length < 1) {
        autocompleteDropdown.hide();
        return;
      }

      // Find matching tags
      const matches = allAvailableTags
        .map(tag => ({ tag, ...matchTag(context.currentTag, tag) }))
        .filter(result => result.matches)
        .slice(0, 8); // Limit to 8 suggestions

      if (matches.length === 0) {
        autocompleteDropdown.hide();
        return;
      }

      // Build dropdown content
      const dropdownContent = matches
        .map(
          (match, index) =>
            `<div class="tag-autocomplete-item${index === selectedIndex ? ' selected' : ''}" data-tag="${match.tag}">${match.highlighted}</div>`
        )
        .join('');

      autocompleteDropdown.html(dropdownContent).show();

      // Add click handlers for dropdown items
      autocompleteDropdown.find('.tag-autocomplete-item').on('click', event => {
        const tag = $(event.currentTarget).data('tag');
        replaceCurrentTag(tag);
        autocompleteDropdown.hide();
        selectedIndex = -1;
      });
    });

    // Keyboard navigation for autocomplete
    tagsInput.on('keydown', event => {
      const dropdownItems = autocompleteDropdown.find('.tag-autocomplete-item');

      if (!autocompleteDropdown.is(':visible') || dropdownItems.length === 0) {
        return;
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          selectedIndex = Math.min(selectedIndex + 1, dropdownItems.length - 1);
          dropdownItems.removeClass('selected').eq(selectedIndex).addClass('selected');
          break;

        case 'ArrowUp':
          event.preventDefault();
          selectedIndex = Math.max(selectedIndex - 1, 0);
          dropdownItems.removeClass('selected').eq(selectedIndex).addClass('selected');
          break;

        case 'Enter':
        case 'Tab':
          if (selectedIndex >= 0) {
            event.preventDefault();
            const selectedTag = dropdownItems.eq(selectedIndex).data('tag');
            replaceCurrentTag(selectedTag);
            autocompleteDropdown.hide();
            selectedIndex = -1;
          }
          break;

        case 'Escape':
          autocompleteDropdown.hide();
          selectedIndex = -1;
          break;
      }
    });

    // Hide autocomplete when clicking outside
    $(document).on('click', event => {
      if (!$(event.target).closest('.tag-autocomplete').length) {
        autocompleteDropdown.hide();
        selectedIndex = -1;
      }
    });

    // Hide autocomplete when input loses focus
    tagsInput.on('blur', () => {
      // Delay hiding to allow clicks on dropdown items
      setTimeout(() => autocompleteDropdown.hide(), 150);
      selectedIndex = -1;
    });
  }

  /**
   * Handle saving the note changes
   */
  private async handleSave(html: JQuery): Promise<void> {
    try {
      const form = html.find('form')[0] as HTMLFormElement;
      const formData = new FormData(form);

      const title = formData.get('title') as string;
      const content = formData.get('content') as string;
      const category = formData.get('category') as string;
      const tagsString = formData.get('tags') as string;
      const allDay = formData.has('allDay');
      const playerVisible = formData.has('playerVisible');

      // Validate required fields
      if (!title?.trim()) {
        ui.notifications?.error('Note title is required');
        return;
      }

      // Parse and validate tags
      const categories = game.seasonsStars?.categories;
      if (!categories) {
        ui.notifications?.error('Note categories system not available');
        return;
      }

      const tags = categories.parseTagString(tagsString);
      const { valid: validTags, invalid: invalidTags } = categories.validateTags(tags);

      if (invalidTags.length > 0) {
        ui.notifications?.warn(`Some tags are not allowed: ${invalidTags.join(', ')}`);
      }

      // Prepare update data
      const updateData: UpdateNoteData = {
        title: title.trim(),
        content: content || '',
        allDay,
        category: category || categories.getDefaultCategory().id,
        tags: validTags,
        playerVisible,
      };

      // Update the note
      const notesManager = game.seasonsStars?.notes;
      if (!notesManager) {
        ui.notifications?.error('Notes manager not available');
        return;
      }

      await notesManager.updateNote(this.journal.id, updateData);

      ui.notifications?.info('Note updated successfully');

      // Refresh any open widgets to show the changes
      Hooks.callAll('seasons-stars:noteUpdated', this.journal);
    } catch (error) {
      Logger.error(
        'Failed to save note changes',
        error instanceof Error ? error : new Error(String(error))
      );
      ui.notifications?.error('Failed to save note changes. Please try again.');
    }
  }

  /**
   * Show the edit dialog
   */
  async show(): Promise<void> {
    return new Promise(resolve => {
      const dialog = new foundry.applications.api.DialogV2({
        window: {
          title: `Edit Note: ${this.journal.name}`,
          resizable: true,
        },
        content: this.generateContent(),
        buttons: [
          {
            action: 'save',
            icon: 'fas fa-save',
            label: 'Save Changes',
            callback: async (event: Event, button: HTMLElement, html: HTMLElement) => {
              await this.handleSave($(html));
              resolve();
            },
          },
          {
            action: 'cancel',
            icon: 'fas fa-times',
            label: 'Cancel',
            callback: () => resolve(),
          },
        ],
        default: 'save',
        position: {
          width: 600,
        },
        render: (event: Event, html: HTMLElement) => {
          const $html = $(html);

          // Add click handlers for tag suggestions
          $html.find('.tag-suggestion').on('click', event => {
            const tag = $(event.currentTarget).data('tag');
            const tagsInput = $html.find('input[name="tags"]');
            const currentTags = tagsInput.val() as string;

            if (currentTags) {
              tagsInput.val(currentTags + ', ' + tag);
            } else {
              tagsInput.val(tag);
            }
            tagsInput.trigger('input'); // Trigger autocompletion update
          });

          // Update category select styling based on selection
          $html.find('.category-select').on('change', event => {
            const categories = game.seasonsStars?.categories;
            if (!categories) return;

            const selectedCat = categories.getCategory($(event.currentTarget).val() as string);
            if (selectedCat) {
              $(event.currentTarget).css('border-left', `4px solid ${selectedCat.color}`);
            }
          });

          // Initialize category border
          const categorySelect = $html.find('.category-select');
          const categories = game.seasonsStars?.categories;
          if (categories) {
            const selectedCat = categories.getCategory(categorySelect.val() as string);
            if (selectedCat) {
              categorySelect.css('border-left', `4px solid ${selectedCat.color}`);
            }
          }

          // Setup tag autocompletion
          this.setupTagAutocompletion($html);
        },
      });

      dialog.render(true);
    });
  }

  /**
   * Static method to show the edit dialog for a journal entry
   */
  static async showEditDialog(journal: JournalEntry): Promise<void> {
    // Verify this is a calendar note
    const flags = journal.flags?.['seasons-and-stars'];
    if (!flags?.calendarNote) {
      ui.notifications?.error('This is not a calendar note');
      return;
    }

    try {
      const dialog = new NoteEditingDialog(journal);
      await dialog.show();
    } catch (error) {
      Logger.error(
        'Failed to open note editing dialog',
        error instanceof Error ? error : new Error(String(error))
      );
      ui.notifications?.error('Failed to open note editor. Opening default sheet instead.');

      // Fallback to default sheet
      (journal as any).sheet?.render(true);
    }
  }
}
