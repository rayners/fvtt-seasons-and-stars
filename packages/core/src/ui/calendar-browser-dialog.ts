/**
 * Modern Calendar Browser Dialog for Seasons & Stars
 * A compact, searchable, and filterable calendar selection interface using ApplicationV2
 */

import { CalendarLocalization } from '../core/calendar-localization';
import { Logger } from '../core/logger';
import { CalendarDate } from '../core/calendar-date';
import type { SeasonsStarsCalendar } from '../types/calendar';
import type { CalendarCollectionEntry, ExternalCalendarSource } from '../core/calendar-loader';

interface CalendarListItem {
  id: string;
  name: string;
  description: string;
  tags: string[];
  author: string;
  sourceModule: string;
  sourceType: 'builtin' | 'module' | 'external';
  sourceIcon: string;
  sourceLabel: string;
  isCurrent: boolean;
  calendar: SeasonsStarsCalendar;
  preview: string;
}

interface CalendarBrowserContext extends Record<string, unknown> {
  calendars: CalendarListItem[];
  selectedCalendar: CalendarListItem | null;
  searchTerm: string;
  filters: {
    tags: string[];
    sourceModules: string[];
  };
  availableFilters: {
    tags: string[];
    sourceModules: string[];
  };
  showFilePicker: boolean;
  hasCustomFile: boolean;
  customFilePath: string;
}

export class CalendarBrowserDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  private calendars: Map<string, SeasonsStarsCalendar>;
  private collectionEntries: Map<string, CalendarCollectionEntry>;
  private externalSources: Map<string, ExternalCalendarSource>;
  private currentCalendarId: string;
  private selectedCalendar: CalendarListItem | null = null;
  private searchTerm = '';
  private activeFilters = {
    tags: [] as string[],
    sourceModules: [] as string[],
  };

  constructor(
    calendars: Map<string, SeasonsStarsCalendar> | SeasonsStarsCalendar[],
    currentCalendarId: string,
    collectionEntries?: Map<string, CalendarCollectionEntry>,
    externalSources?: Map<string, ExternalCalendarSource>
  ) {
    super();

    // Convert array to Map if needed
    if (Array.isArray(calendars)) {
      this.calendars = new Map();
      calendars.forEach((calendar, index) => {
        const id = calendar.id || String(index);
        this.calendars.set(id, calendar);
      });
    } else if (calendars instanceof Map) {
      this.calendars = calendars;
    } else {
      this.calendars = new Map();
    }

    this.collectionEntries = collectionEntries || new Map();
    this.externalSources = externalSources || new Map();
    this.currentCalendarId = currentCalendarId;

    // Check if file picker is currently active
    const selectedFilePath =
      (game.settings?.get('seasons-and-stars', 'activeCalendarFile') as string) || '';
    const activeCalendarSetting =
      (game.settings?.get('seasons-and-stars', 'activeCalendar') as string) || '';

    const filePickerActive = selectedFilePath !== '' && activeCalendarSetting === '';
    if (filePickerActive) {
      this.currentCalendarId = '__FILE_PICKER__';
    }
  }

  static DEFAULT_OPTIONS = {
    id: 'seasons-stars-calendar-browser',
    classes: ['seasons-stars', 'calendar-browser-dialog'],
    tag: 'div',
    window: {
      frame: true,
      positioned: true,
      title: 'SEASONS_STARS.dialog.calendar_browser.title',
      icon: 'fa-solid fa-calendar-alt',
      minimizable: false,
      resizable: true,
    },
    position: {
      width: 800,
      height: 600,
    },
    actions: {
      clearSearch: CalendarBrowserDialog.prototype._onClearSearch,
      toggleFilter: CalendarBrowserDialog.prototype._onToggleFilter,
      clearFilters: CalendarBrowserDialog.prototype._onClearFilters,
      selectCalendar: CalendarBrowserDialog.prototype._onSelectCalendar,
      confirmSelection: CalendarBrowserDialog.prototype._onConfirmSelection,
      openFilePicker: CalendarBrowserDialog.prototype._onOpenFilePicker,
      clearFilePicker: CalendarBrowserDialog.prototype._onClearFilePicker,
      cancel: CalendarBrowserDialog.prototype._onCancel,
    },
  };

  static PARTS = {
    main: {
      id: 'main',
      template: 'modules/seasons-and-stars/templates/calendar-browser-dialog.hbs',
      scrollable: ['.calendar-list', '.calendar-details'],
    },
  };

  async _prepareContext(options: any = {}): Promise<CalendarBrowserContext> {
    const context = await super._prepareContext(options);

    // Register handlebars helper for array includes check
    if (!Handlebars.helpers.includes) {
      Handlebars.registerHelper('includes', function (array: unknown[], value: unknown) {
        return Array.isArray(array) && array.includes(value);
      });
    }

    // Convert calendars to list items
    const calendarItems: CalendarListItem[] = [];
    for (const [id, calendar] of this.calendars.entries()) {
      const sourceInfo = this.getCalendarSourceInfo(id, calendar);
      const tags = this.extractCalendarTags(calendar);

      calendarItems.push({
        id,
        name: CalendarLocalization.getCalendarLabel(calendar),
        description: CalendarLocalization.getCalendarDescription(calendar) || '',
        tags,
        author: sourceInfo.author,
        sourceModule: sourceInfo.moduleId || sourceInfo.label,
        sourceType: sourceInfo.type as 'builtin' | 'module' | 'external',
        sourceIcon: sourceInfo.icon,
        sourceLabel: sourceInfo.label,
        isCurrent: id === this.currentCalendarId,
        calendar,
        preview: this.generateCalendarPreview(calendar),
      });
    }

    // Filter and sort calendars
    const filteredCalendars = this.filterAndSortCalendars(calendarItems);

    // Calculate available filters
    const availableFilters = this.calculateAvailableFilters(calendarItems);

    // Get file picker state
    const customFilePath =
      (game.settings?.get('seasons-and-stars', 'activeCalendarFile') as string) || '';
    const hasCustomFile = customFilePath !== '';

    return Object.assign(context, {
      calendars: filteredCalendars,
      selectedCalendar: this.selectedCalendar,
      searchTerm: this.searchTerm,
      filters: this.activeFilters,
      availableFilters,
      showFilePicker: true,
      hasCustomFile,
      customFilePath,
    });
  }

  protected override async _onRender(
    context: Record<string, unknown>,
    options: any
  ): Promise<void> {
    await super._onRender(context, options);

    // Set up manual event listener for search input
    const searchInput = this.element?.querySelector('.search-input') as HTMLInputElement;
    if (searchInput) {
      // Remove any existing listeners
      searchInput.removeEventListener('input', this._handleSearchInput);

      // Add new listener
      searchInput.addEventListener('input', this._handleSearchInput);
    }

    // Set up filter toggle button listener
    const filterToggleBtn = this.element?.querySelector('.filter-toggle-btn') as HTMLButtonElement;
    if (filterToggleBtn) {
      // Remove any existing listeners
      filterToggleBtn.removeEventListener('click', this._handleFilterToggle);

      // Add new listener
      filterToggleBtn.addEventListener('click', this._handleFilterToggle);
    }

    // Close filter panel when clicking outside
    document.addEventListener('click', this._handleClickOutside);
  }

  private _handleSearchInput = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value;

    // Instead of re-rendering, filter the existing DOM elements
    this._filterCalendarList();
  };

  private _handleFilterToggle = (event: Event): void => {
    event.stopPropagation();
    const filterPanel = this.element?.querySelector('.filter-panel') as HTMLElement;
    if (filterPanel) {
      filterPanel.classList.toggle('open');
    }
  };

  private _handleClickOutside = (event: Event): void => {
    const target = event.target as Element;
    const filterSection = this.element?.querySelector('.filter-section');

    // Close filter panel if clicking outside of it
    if (filterSection && !filterSection.contains(target)) {
      const filterPanel = this.element?.querySelector('.filter-panel') as HTMLElement;
      if (filterPanel) {
        filterPanel.classList.remove('open');
      }
    }
  };

  private _filterCalendarList(): void {
    const calendarItems = this.element?.querySelectorAll(
      '.calendar-list-item:not(.file-picker-item)'
    );
    if (!calendarItems) return;

    let visibleCount = 0;
    const searchTerm = this.searchTerm.toLowerCase().trim();

    calendarItems.forEach((item: Element) => {
      const htmlItem = item as HTMLElement;
      const calendarId = htmlItem.dataset.calendarId;

      if (!calendarId) {
        htmlItem.style.display = 'none';
        return;
      }

      // Get calendar data
      const calendar = this.calendars.get(calendarId);
      if (!calendar) {
        htmlItem.style.display = 'none';
        return;
      }

      // Apply search filter
      let isVisible = true;
      if (searchTerm) {
        const searchableFields = [calendar.name, calendar.description || '', calendarId];

        // Include translated fields
        if (calendar.translations?.en) {
          searchableFields.push(
            calendar.translations.en.label || '',
            calendar.translations.en.description || '',
            calendar.translations.en.setting || ''
          );
        }

        // Include tags
        const tags = this.extractCalendarTags(calendar);
        searchableFields.push(...tags);

        const searchableText = searchableFields.join(' ').toLowerCase();
        isVisible = searchableText.includes(searchTerm);
      }

      // Apply other filters (tags, source modules)
      if (isVisible && this.activeFilters.tags.length > 0) {
        const calendarTags = this.extractCalendarTags(calendar);
        isVisible = this.activeFilters.tags.some(tag => calendarTags.includes(tag));
      }

      if (isVisible && this.activeFilters.sourceModules.length > 0) {
        const sourceInfo = this.getCalendarSourceInfo(calendarId, calendar);
        const sourceModule = sourceInfo.moduleId || sourceInfo.label;
        isVisible = this.activeFilters.sourceModules.includes(sourceModule);
      }

      htmlItem.style.display = isVisible ? 'block' : 'none';
      if (isVisible) visibleCount++;
    });

    // Update the count display
    const countElement = this.element?.querySelector('.panel-header h4');
    if (countElement) {
      countElement.textContent = `${game.i18n.localize('SEASONS_STARS.dialog.calendar_browser.calendars')} (${visibleCount})`;
    }
  }

  private getCalendarSourceInfo(
    id: string,
    calendar: SeasonsStarsCalendar
  ): {
    type: string;
    icon: string;
    label: string;
    description: string;
    author: string;
    moduleId?: string;
  } {
    if (calendar?.sourceInfo) {
      return {
        type: calendar.sourceInfo.type,
        icon: calendar.sourceInfo.icon,
        label: calendar.sourceInfo.sourceName,
        description: calendar.sourceInfo.description,
        author: (calendar.sourceInfo as any).author || 'Unknown',
        moduleId: (calendar.sourceInfo as any).moduleId,
      };
    }

    // Fallback
    return {
      type: 'builtin',
      icon: 'fa-solid fa-question-circle',
      label: 'Unknown Source',
      description: 'Calendar source information not available',
      author: 'Unknown',
    };
  }

  private extractCalendarTags(calendar: SeasonsStarsCalendar): string[] {
    const tags: string[] = [];

    // Add tags based on calendar features
    if (calendar.leapYear && calendar.leapYear.rule !== 'none') tags.push('leap-years');
    if (calendar.months.length > 12) tags.push('extended-year');
    if (calendar.months.length < 12) tags.push('short-year');
    if (calendar.weekdays.length !== 7) tags.push('custom-week');
    if (calendar.moons && calendar.moons.length > 0) tags.push('moons');
    if (calendar.seasons && calendar.seasons.length > 0) tags.push('seasons');

    // Add system-specific tags if available
    if (calendar.id?.includes('forgotten-realms')) tags.push('forgotten-realms');
    if (calendar.id?.includes('greyhawk')) tags.push('greyhawk');
    if (calendar.id?.includes('eberron')) tags.push('eberron');
    if (calendar.id?.includes('exandria')) tags.push('exandria');

    return tags;
  }

  private filterAndSortCalendars(calendars: CalendarListItem[]): CalendarListItem[] {
    let filtered = calendars;

    // Apply search filter
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        cal =>
          cal.id.toLowerCase().includes(searchLower) ||
          cal.name.toLowerCase().includes(searchLower) ||
          cal.description.toLowerCase().includes(searchLower) ||
          cal.author.toLowerCase().includes(searchLower)
      );
    }

    // Apply filters
    if (this.activeFilters.tags.length > 0) {
      filtered = filtered.filter(cal =>
        this.activeFilters.tags.some(tag => cal.tags.includes(tag))
      );
    }

    if (this.activeFilters.sourceModules.length > 0) {
      filtered = filtered.filter(cal =>
        this.activeFilters.sourceModules.includes(cal.sourceModule)
      );
    }

    // Sort: current first, then by name
    return filtered.sort((a, b) => {
      if (a.isCurrent !== b.isCurrent) {
        return a.isCurrent ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  private calculateAvailableFilters(calendars: CalendarListItem[]) {
    const tags = new Set<string>();
    const sourceModules = new Set<string>();

    for (const cal of calendars) {
      cal.tags.forEach(tag => tags.add(tag));
      sourceModules.add(cal.sourceModule);
    }

    return {
      tags: Array.from(tags).sort(),
      sourceModules: Array.from(sourceModules).sort(),
    };
  }

  private generateCalendarPreview(calendar: SeasonsStarsCalendar): string {
    try {
      const sampleDate = {
        year: 2370,
        month: 1,
        day: 15,
        weekday: 1,
        time: { hour: 12, minute: 0, second: 0 },
      };

      const calendarDate = new CalendarDate(sampleDate, calendar);
      return calendarDate.toLongString();
    } catch (error) {
      Logger.warn('Failed to generate calendar preview:', error);
      return `Sample: 15th of ${calendar.months[0]?.name || 'Month'}, 2370`;
    }
  }

  // Action handlers
  async _onSearch(event: Event, target: HTMLElement): Promise<void> {
    const input = target as HTMLInputElement;
    this.searchTerm = input.value;
    this.render(false);
  }

  async _onClearSearch(_event: Event, _target: HTMLElement): Promise<void> {
    this.searchTerm = '';

    // Clear the search input
    const searchInput = this.element?.querySelector('.search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = '';
    }

    // Re-filter the list
    this._filterCalendarList();
  }

  async _onToggleFilter(event: Event, target: HTMLElement): Promise<void> {
    const filterType = target.dataset.filterType as 'tags' | 'sourceModules';
    const filterValue = target.dataset.filterValue as string;

    if (!filterType || !filterValue) return;

    const filters = this.activeFilters[filterType];
    const index = filters.indexOf(filterValue);

    if (index >= 0) {
      filters.splice(index, 1);
    } else {
      filters.push(filterValue);
    }

    // Re-filter the list instead of re-rendering
    this._filterCalendarList();
  }

  async _onClearFilters(_event: Event, _target: HTMLElement): Promise<void> {
    this.activeFilters = {
      tags: [],
      sourceModules: [],
    };

    // Clear all filter checkboxes
    const filterCheckboxes = this.element?.querySelectorAll(
      '.filter-checkbox input[type="checkbox"]'
    );
    filterCheckboxes?.forEach((checkbox: Element) => {
      (checkbox as HTMLInputElement).checked = false;
    });

    // Re-filter the list instead of re-rendering
    this._filterCalendarList();
  }

  async _onSelectCalendar(event: Event, target: HTMLElement): Promise<void> {
    const calendarId = target.dataset.calendarId;
    if (!calendarId) return;

    // Find the calendar in our filtered list
    const context = await this._prepareContext();
    this.selectedCalendar = context.calendars.find(cal => cal.id === calendarId) || null;

    this.render(false);
  }

  async _onConfirmSelection(_event: Event, target: HTMLElement): Promise<void> {
    if (!this.selectedCalendar) return;

    if (this.selectedCalendar.id === '__FILE_PICKER__') {
      // Handle file picker selection (similar to existing logic)
      const selectedFilePath =
        (game.settings?.get('seasons-and-stars', 'activeCalendarFile') as string) || '';

      if (!selectedFilePath) {
        await this._onOpenFilePicker(_event, target);
        return;
      }

      // Load and activate file-based calendar
      const calendarManager = (game as any).seasonsStars?.manager;
      if (!calendarManager) {
        Logger.error('Calendar manager not available');
        return;
      }

      // Implementation similar to existing file picker logic...
    } else {
      // Switch to regular calendar
      await game.settings?.set('seasons-and-stars', 'activeCalendar', this.selectedCalendar.id);
      await game.settings?.set('seasons-and-stars', 'activeCalendarFile', '');

      ui.notifications?.info(
        game.i18n.format('SEASONS_STARS.notifications.calendar_changed', {
          calendar: this.selectedCalendar.name,
        })
      );
    }

    this.close();
  }

  async _onOpenFilePicker(_event: Event, _target: HTMLElement): Promise<void> {
    try {
      const filePicker = new (foundry as any).applications.apps.FilePicker({
        type: 'data',
        extensions: ['.json'],
        callback: async (path: string) => {
          await game.settings.set('seasons-and-stars', 'activeCalendarFile', path);
          this.render(false);
        },
      });

      await filePicker.render(true);
    } catch (error) {
      Logger.error('Failed to open file picker:', error as Error);
      ui.notifications?.error(game.i18n.localize('SEASONS_STARS.errors.file_picker_failed'));
    }
  }

  async _onClearFilePicker(_event: Event, _target: HTMLElement): Promise<void> {
    await game.settings.set('seasons-and-stars', 'activeCalendarFile', '');
    this.render(false);
  }

  async _onCancel(_event: Event, _target: HTMLElement): Promise<void> {
    this.close();
  }

  override close(options?: any): Promise<this> {
    // Clean up event listeners
    const searchInput = this.element?.querySelector('.search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.removeEventListener('input', this._handleSearchInput);
    }

    const filterToggleBtn = this.element?.querySelector('.filter-toggle-btn') as HTMLButtonElement;
    if (filterToggleBtn) {
      filterToggleBtn.removeEventListener('click', this._handleFilterToggle);
    }

    document.removeEventListener('click', this._handleClickOutside);

    return super.close(options);
  }

  /**
   * Static method to show the calendar browser dialog
   */
  static async show(): Promise<void> {
    if (!(game as any).seasonsStars?.manager) {
      ui.notifications?.error(game.i18n.localize('SEASONS_STARS.errors.manager_not_ready'));
      return;
    }

    const calendars = ((game as any).seasonsStars.manager as any).getAllCalendars();
    const currentCalendarId = game.settings?.get('seasons-and-stars', 'activeCalendar') as string;

    if (calendars.size === 0) {
      ui.notifications?.warn(game.i18n.localize('SEASONS_STARS.warnings.no_calendars_available'));
      return;
    }

    // Get collection entries and external sources
    const calendarLoader = ((game as any).seasonsStars as any)?.calendarLoader;
    let collectionEntries: Map<string, CalendarCollectionEntry> | undefined;
    let externalSources: Map<string, ExternalCalendarSource> | undefined;

    if (calendarLoader) {
      try {
        const sources = calendarLoader.getSources();
        externalSources = new Map();
        for (const source of sources) {
          externalSources.set(source.id, source);
        }
        collectionEntries = new Map();
      } catch (error) {
        Logger.warn('Failed to get external sources from calendar loader:', error);
      }
    }

    const dialog = new CalendarBrowserDialog(
      calendars,
      currentCalendarId,
      collectionEntries,
      externalSources
    );
    dialog.render(true);
  }
}
