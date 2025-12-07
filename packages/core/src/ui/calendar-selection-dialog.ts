/**
 * Calendar Selection Dialog for Seasons & Stars
 * Allows users to browse and switch between available calendars
 */

import { CalendarLocalization } from '../core/calendar-localization';
import { Logger } from '../core/logger';
import { CalendarTimeUtils } from '../core/calendar-time-utils';
import { CalendarDate } from '../core/calendar-date';
import type { SeasonsStarsCalendar, CalendarSourceInfo } from '../types/calendar';
import type { CalendarCollectionEntry, ExternalCalendarSource } from '../core/calendar-loader';
import type { CalendarManagerInterface } from '../types/foundry-extensions';
import {
  saveCalendarDataForSync,
  saveCalendarFilePath,
  clearConflictingCalendarSetting,
  resolveCalendarFilePath,
} from './calendar-file-helpers.js';

/**
 * Represents a calendar item in the list view
 */
interface CalendarListItem {
  id: string;
  label: string;
  description: string | undefined;
  setting: string | undefined;
  sampleDate: string;
  miniPreview: string;
  isCurrent: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
  isVariant: boolean;
  variantInfo: string;
  baseCalendarId: string;
  sourceType: 'builtin' | 'module' | 'external';
  sourceIcon: string;
  sourceLabel: string;
  sourceDescription: string;
  isModuleSource: boolean;
  isBuiltinSource: boolean;
  isExternalSource: boolean;
  tags: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  monthPreview?: any;
}

/**
 * Represents a grouped calendar with its variants
 */
interface GroupedCalendar {
  id: string;
  base: CalendarListItem | null;
  variants: CalendarListItem[];
  isExpanded: boolean;
  hasVariants: boolean;
}

export class CalendarSelectionDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  private selectedCalendarId: string | null = null;
  private calendars: Map<string, SeasonsStarsCalendar>;
  private collectionEntries: Map<string, CalendarCollectionEntry>;
  private externalSources: Map<string, ExternalCalendarSource>;
  private currentCalendarId: string;
  private pendingFilePath: string | null = null; // Track file selection before confirmation

  // New state for master-detail UI
  private searchQuery: string = '';
  private selectedTags: string[] = [];
  private expandedVariantGroups: Set<string> = new Set();
  private highlightedCalendarId: string | null = null;
  private detailViewMonth: number = 1;
  private detailViewYear: number = 1000;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    calendars?: Map<string, SeasonsStarsCalendar> | SeasonsStarsCalendar[],
    currentCalendarId?: string,
    collectionEntries?: Map<string, CalendarCollectionEntry>,
    externalSources?: Map<string, ExternalCalendarSource>
  ) {
    super();

    Logger.debug('CalendarSelectionDialog constructor', {
      type: typeof calendars,
      isMap: calendars instanceof Map,
      calendars,
      collectionEntries,
    });

    // If no calendars provided, fetch from manager (called by Foundry registerMenu)
    if (!calendars) {
      Logger.debug('No calendars provided, fetching from manager');
      const manager = game.seasonsStars?.manager as CalendarManagerInterface | undefined;
      if (manager) {
        const availableCalendars = manager.getAllCalendars();

        // Convert array to Map
        this.calendars = new Map();
        availableCalendars.forEach((calendar: SeasonsStarsCalendar) => {
          this.calendars.set(calendar.id, calendar);
        });

        currentCalendarId =
          (game.settings?.get('seasons-and-stars', 'activeCalendar') as string) || 'gregorian';
      } else {
        Logger.error('Calendar manager not available');
        this.calendars = new Map();
      }
    } else {
      // Convert array to Map if needed
      if (Array.isArray(calendars)) {
        Logger.debug('Converting array to Map');
        this.calendars = new Map();
        calendars.forEach((calendar, index) => {
          const id = calendar.id || String(index);
          this.calendars.set(id, calendar);
        });
        Logger.debug('Converted calendars Map', this.calendars);
      } else if (calendars instanceof Map) {
        this.calendars = calendars;
      } else {
        Logger.error('Unsupported calendars type', new Error(`Type: ${typeof calendars}`));
        this.calendars = new Map();
      }
    }

    // Store collection entries metadata (if available)
    this.collectionEntries = collectionEntries || new Map();

    // Store external sources metadata (if available)
    this.externalSources = externalSources || new Map();

    // Check if a file picker calendar is currently active
    const selectedFilePath =
      (game.settings?.get('seasons-and-stars', 'activeCalendarFile') as string) || '';
    const activeCalendarSetting =
      (game.settings?.get('seasons-and-stars', 'activeCalendar') as string) || '';

    // File picker is active if there's a file path AND no regular calendar setting
    const filePickerActive = selectedFilePath !== '' && activeCalendarSetting === '';

    if (filePickerActive) {
      // File picker is currently the active mode
      this.currentCalendarId = '__FILE_PICKER__';
      this.selectedCalendarId = '__FILE_PICKER__';
      Logger.debug('Dialog initialized with file picker active:', {
        selectedFilePath,
        activeCalendarSetting,
      });
    } else {
      this.currentCalendarId = currentCalendarId || 'gregorian';
      this.selectedCalendarId = currentCalendarId || 'gregorian';
      Logger.debug('Dialog initialized with regular calendar:', {
        currentCalendarId,
        selectedFilePath,
        activeCalendarSetting,
      });
    }
  }

  static DEFAULT_OPTIONS = {
    id: 'seasons-stars-calendar-selection',
    classes: ['seasons-stars', 'calendar-selection-dialog'],
    tag: 'div',
    window: {
      frame: true,
      positioned: true,
      title: 'SEASONS_STARS.dialog.calendar_selection.title',
      icon: 'fa-solid fa-calendar-alt',
      minimizable: false,
      resizable: true,
    },
    position: {
      width: 850,
      height: 650,
    },
    actions: {
      selectCalendar: CalendarSelectionDialog.prototype._onSelectCalendar,
      previewCalendar: CalendarSelectionDialog.prototype._onPreviewCalendar,
      chooseCalendar: CalendarSelectionDialog.prototype._onChooseCalendar,
      cancel: CalendarSelectionDialog.prototype._onCancel,
      openFilePicker: CalendarSelectionDialog.prototype._onOpenFilePicker,
      clearFilePicker: CalendarSelectionDialog.prototype._onClearFilePicker,
      // New actions for master-detail UI
      highlightCalendar: CalendarSelectionDialog.prototype._onHighlightCalendar,
      toggleVariants: CalendarSelectionDialog.prototype._onToggleVariants,
      browseMonth: CalendarSelectionDialog.prototype._onBrowseMonth,
      clearFilters: CalendarSelectionDialog.prototype._onClearFilters,
    },
  };

  static PARTS = {
    header: {
      id: 'header',
      template: 'modules/seasons-and-stars/templates/calendar-selection/header.hbs',
    },
    list: {
      id: 'list',
      template: 'modules/seasons-and-stars/templates/calendar-selection/list.hbs',
      scrollable: ['.calendar-list-container'],
    },
    detail: {
      id: 'detail',
      template: 'modules/seasons-and-stars/templates/calendar-selection/detail.hbs',
    },
    filePicker: {
      id: 'file-picker',
      template: 'modules/seasons-and-stars/templates/calendar-selection/file-picker.hbs',
    },
    footer: {
      id: 'footer',
      template: 'modules/seasons-and-stars/templates/calendar-selection/footer.hbs',
    },
  };

  /** @override */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async _prepareContext(options = {}): Promise<any> {
    const context = await super._prepareContext(options);

    // Get file picker state - use pending path if available, otherwise check settings
    const selectedFilePath =
      this.pendingFilePath ||
      (game.settings?.get('seasons-and-stars', 'activeCalendarFile') as string) ||
      '';
    const activeCalendarSetting =
      (game.settings?.get('seasons-and-stars', 'activeCalendar') as string) || '';

    // File picker is active if there's a file path (pending or saved) AND no regular calendar setting
    const filePickerActive = selectedFilePath !== '' && activeCalendarSetting === '';

    // Update current calendar ID based on actual settings (dynamic detection)
    if (filePickerActive) {
      this.currentCalendarId = '__FILE_PICKER__';
    } else if (activeCalendarSetting) {
      this.currentCalendarId = activeCalendarSetting;
    }

    // Build calendar list items
    const calendarsData = this.buildCalendarListItems();

    // Get all available tags for the filter dropdown
    const availableTags = this.getAllTags();

    // Apply filters (search query and selected tags)
    const filteredCalendars = this.filterCalendars(calendarsData);

    // Group calendars hierarchically
    const groupedCalendars = this.groupCalendars(filteredCalendars);

    // Get highlighted calendar data for detail pane
    const highlightedCalendar = this.highlightedCalendarId
      ? this.getHighlightedCalendarData(calendarsData)
      : null;

    // Determine if file picker should be considered "selected"
    const filePickerSelected =
      selectedFilePath !== '' &&
      (this.selectedCalendarId === '__FILE_PICKER__' || filePickerActive);

    // Check if there are active filters
    const hasActiveFilters = this.searchQuery !== '' || this.selectedTags.length > 0;

    return Object.assign(context, {
      // List data
      groupedCalendars,
      totalCount: calendarsData.length,
      filteredCount: filteredCalendars.length,

      // Search/filter state
      searchQuery: this.searchQuery,
      selectedTags: this.selectedTags,
      availableTags,
      hasActiveFilters,

      // Detail pane data
      highlightedCalendar,
      highlightedCalendarId: this.highlightedCalendarId,
      detailViewMonth: this.detailViewMonth,
      detailViewYear: this.detailViewYear,

      // Selection state
      selectedCalendar: this.selectedCalendarId,
      currentCalendar: this.currentCalendarId,

      // File picker state
      showFilePicker: true,
      selectedFilePath,
      filePickerActive,
      filePickerSelected,
    });
  }

  /**
   * Build calendar list items from the calendars map
   */
  private buildCalendarListItems(): CalendarListItem[] {
    return Array.from(this.calendars.entries()).map(([id, calendar]) => {
      const label = CalendarLocalization.getCalendarLabel(calendar);
      const description = CalendarLocalization.getCalendarDescription(calendar);
      const setting = CalendarLocalization.getCalendarSetting(calendar);

      // Check if this is a calendar variant
      const isVariant = id.includes('(') && id.includes(')');
      let variantInfo = '';
      let baseCalendarId = id;

      if (isVariant) {
        const match = id.match(/^(.+)\((.+)\)$/);
        if (match) {
          baseCalendarId = match[1];
          const variantId = match[2];
          variantInfo = `Variant: ${variantId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
        }
      }

      // Determine the source type and metadata
      const sourceInfo = this.getCalendarSourceInfo(id);

      // Get collection entry for tags and preview
      const collectionEntry = this.collectionEntries.get(id);
      const sampleDate = collectionEntry?.preview || this.generateSampleDate(calendar);
      const miniPreview = collectionEntry?.preview || this.generateMiniWidgetPreview(calendar);
      const tags = collectionEntry?.tags || [];

      return {
        id,
        label,
        description,
        setting,
        sampleDate,
        miniPreview,
        isCurrent: id === this.currentCalendarId,
        isSelected: id === this.selectedCalendarId,
        isHighlighted: id === this.highlightedCalendarId,
        isVariant,
        variantInfo,
        baseCalendarId,
        sourceType: sourceInfo.type,
        sourceIcon: sourceInfo.icon,
        sourceLabel: sourceInfo.label,
        sourceDescription: sourceInfo.description,
        isModuleSource: sourceInfo.type === 'module',
        isBuiltinSource: sourceInfo.type === 'builtin',
        isExternalSource: sourceInfo.type === 'external',
        tags,
      };
    });
  }

  /**
   * Get all unique tags from all calendars
   */
  private getAllTags(): string[] {
    const tagSet = new Set<string>();
    for (const entry of this.collectionEntries.values()) {
      if (entry.tags) {
        entry.tags.forEach(tag => tagSet.add(tag));
      }
    }
    return Array.from(tagSet).sort();
  }

  /**
   * Filter calendars based on search query and selected tags
   */
  private filterCalendars(calendars: CalendarListItem[]): CalendarListItem[] {
    let filtered = calendars;

    // Apply search query filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(cal => {
        const searchText = `${cal.label} ${cal.description} ${cal.tags.join(' ')}`.toLowerCase();
        return searchText.includes(query);
      });
    }

    // Apply tag filter (any match)
    if (this.selectedTags.length > 0) {
      filtered = filtered.filter(cal => {
        return this.selectedTags.some(tag => cal.tags.includes(tag));
      });
    }

    return filtered;
  }

  /**
   * Group calendars by base calendar with variants nested
   */
  private groupCalendars(calendars: CalendarListItem[]): GroupedCalendar[] {
    const groups = new Map<string, GroupedCalendar>();

    // Build groups
    for (const calendar of calendars) {
      const baseId = calendar.baseCalendarId;

      if (!groups.has(baseId)) {
        // Check if this group should be expanded
        const isExpanded =
          this.expandedVariantGroups.has(baseId) ||
          // Auto-expand if current calendar is in this group
          calendar.isCurrent ||
          // Auto-expand if highlighted calendar is in this group
          calendar.isHighlighted;

        groups.set(baseId, {
          id: baseId,
          base: null,
          variants: [],
          isExpanded,
          hasVariants: false,
        });
      }

      const group = groups.get(baseId)!;
      if (calendar.isVariant) {
        group.variants.push(calendar);
        group.hasVariants = true;
      } else {
        group.base = calendar;
      }

      // Update expansion state based on current/highlighted
      if (calendar.isCurrent || calendar.isHighlighted) {
        group.isExpanded = true;
      }
    }

    // Sort groups with Gregorian first, then alphabetically
    const sortedGroups = Array.from(groups.values()).sort((a, b) => {
      if (a.id === 'gregorian') return -1;
      if (b.id === 'gregorian') return 1;

      const labelA = a.base ? a.base.label : a.id;
      const labelB = b.base ? b.base.label : b.id;
      return labelA.localeCompare(labelB);
    });

    // Sort variants within each group
    for (const group of sortedGroups) {
      group.variants.sort((a, b) => a.label.localeCompare(b.label));
    }

    return sortedGroups;
  }

  /**
   * Get data for the highlighted calendar (for detail pane)
   */
  private getHighlightedCalendarData(calendars: CalendarListItem[]): CalendarListItem | null {
    const highlighted = calendars.find(c => c.id === this.highlightedCalendarId);
    if (!highlighted) return null;

    // Add month preview data for the detail pane
    const calendar = this.calendars.get(highlighted.id);
    if (calendar) {
      // Generate month preview data and add to the highlighted item
      highlighted.monthPreview = this.generateMonthPreviewData(calendar);
    }

    return highlighted;
  }

  /**
   * Generate month preview data for the detail pane
   */
  private generateMonthPreviewData(calendar: SeasonsStarsCalendar): {
    monthName: string;
    year: number;
    days: number[];
    weekdayHeaders: string[];
  } {
    // Ensure month index is valid
    const monthIndex = Math.max(0, Math.min(this.detailViewMonth - 1, calendar.months.length - 1));
    const month = calendar.months[monthIndex];

    // Get localized month name
    const monthName = CalendarLocalization.getCalendarTranslation(
      calendar,
      `months.${month.id || month.name}`,
      month.name
    );

    // Generate weekday headers
    const weekdayHeaders = calendar.weekdays.map(wd =>
      CalendarLocalization.getCalendarTranslation(
        calendar,
        `weekdays.${wd.id || wd.name}`,
        wd.abbreviation || wd.name.substring(0, 2)
      )
    );

    // Generate day numbers for the month
    const days: number[] = [];
    const daysInMonth = month.days;

    // Calculate what weekday the month starts on (simplified - just use first day of first month of year)
    // This is an approximation for the preview
    const startWeekday = 0; // Simplified: assume month starts on first weekday

    // Add empty cells for days before the month starts
    for (let i = 0; i < startWeekday; i++) {
      days.push(0); // 0 represents empty cell
    }

    // Add the actual days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return {
      monthName,
      year: this.detailViewYear,
      days,
      weekdayHeaders,
    };
  }

  /** @override */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _attachPartListeners(partId: string, htmlElement: HTMLElement, options: any): void {
    super._attachPartListeners(partId, htmlElement, options);

    Logger.debug('Attaching part listeners', { partId, element: htmlElement });

    // Handle search input with debouncing (header part)
    if (partId === 'header') {
      const searchInput = htmlElement.querySelector<HTMLInputElement>('.calendar-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', e => {
          const target = e.target as HTMLInputElement;
          this.handleSearchInput(target.value);
        });

        // Restore focus to search input if it had focus before re-render
        if (document.activeElement?.classList.contains('calendar-search-input')) {
          searchInput.focus();
        }
      }

      // Handle tag filter changes
      const tagFilter = htmlElement.querySelector<HTMLSelectElement>('.tag-filter');
      if (tagFilter) {
        tagFilter.addEventListener('change', () => {
          this.handleTagFilterChange(tagFilter);
        });
      }
    }

    // Handle list scrolling and keyboard navigation (list part)
    if (partId === 'list') {
      const listContainer = htmlElement.querySelector('.calendar-list-container');
      if (listContainer) {
        listContainer.addEventListener('keydown', e => this.handleListKeydown(e as KeyboardEvent));
      }
    }

    // Update select button state (footer part)
    if (partId === 'footer') {
      this.updateSelectButton($(htmlElement));
    }
  }

  /**
   * Handle search input with debouncing
   */
  private handleSearchInput(value: string): void {
    // Clear existing debounce timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    // Debounce the search for 300ms
    this.searchDebounceTimer = setTimeout(() => {
      this.searchQuery = value;
      // Re-render only the list part
      this.render({ parts: ['list'] });
    }, 300);
  }

  /**
   * Handle tag filter selection changes
   */
  private handleTagFilterChange(selectElement: HTMLSelectElement): void {
    const selectedOptions = Array.from(selectElement.selectedOptions);
    this.selectedTags = selectedOptions.map(opt => opt.value);
    // Re-render the list
    this.render({ parts: ['list', 'header'] });
  }

  /**
   * Handle keyboard navigation in the list
   */
  private handleListKeydown(event: KeyboardEvent): void {
    const calendars = this.buildCalendarListItems();
    const filtered = this.filterCalendars(calendars);
    const currentIndex = filtered.findIndex(c => c.id === this.highlightedCalendarId);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (currentIndex < filtered.length - 1) {
          this.highlightedCalendarId = filtered[currentIndex + 1].id;
          this.render({ parts: ['list', 'detail'] });
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (currentIndex > 0) {
          this.highlightedCalendarId = filtered[currentIndex - 1].id;
          this.render({ parts: ['list', 'detail'] });
        }
        break;
      case 'Enter':
        event.preventDefault();
        if (this.highlightedCalendarId) {
          this.selectedCalendarId = this.highlightedCalendarId;
          this.render({ parts: ['list', 'footer'] });
        }
        break;
    }
  }

  /**
   * Select a calendar card
   */
  private selectCalendarCard(calendarId: string): void {
    // Special handling for file picker selection
    if (calendarId === '__FILE_PICKER__') {
      const selectedFilePath =
        (game.settings?.get('seasons-and-stars', 'activeCalendarFile') as string) || '';
      if (!selectedFilePath) {
        Logger.warn('Cannot select file picker card - no file selected');
        // Open file picker instead
        this._onOpenFilePicker(new Event('click'), document.createElement('button'));
        return;
      }
    }

    this.selectedCalendarId = calendarId;

    // Re-render to update UI state
    this.render(true);
  }

  /**
   * Update the select button state
   */
  private updateSelectButton(html?: JQuery): void {
    const $html = html || (this.element ? $(this.element) : $());
    const selectButton = $html.find('#select-calendar');
    const isDifferent = this.selectedCalendarId !== this.currentCalendarId;

    selectButton.prop('disabled', !isDifferent);
    selectButton.toggleClass('disabled', !isDifferent);

    if (isDifferent && this.selectedCalendarId) {
      let label: string;

      if (this.selectedCalendarId === '__FILE_PICKER__') {
        // Handle file picker case - show file name
        const selectedFilePath =
          (game.settings?.get('seasons-and-stars', 'activeCalendarFile') as string) || '';
        const fileName = selectedFilePath
          ? selectedFilePath.split('/').pop() || 'Custom File'
          : 'Custom File';
        label = fileName;
      } else {
        // Handle regular calendar case
        const calendar = this.calendars.get(this.selectedCalendarId);
        label = calendar
          ? CalendarLocalization.getCalendarLabel(calendar)
          : this.selectedCalendarId;
      }

      selectButton.html(`<i class="fas fa-check"></i> Switch to ${label}`);
    } else {
      selectButton.html(`<i class="fas fa-check"></i> Select Calendar`);
    }
  }

  /**
   * Show preview for a calendar
   */
  private showPreview(calendarId: string): void {
    const calendar = this.calendars.get(calendarId);
    if (!calendar) return;

    const label = CalendarLocalization.getCalendarLabel(calendar);
    const description = CalendarLocalization.getCalendarDescription(calendar);
    const setting = CalendarLocalization.getCalendarSetting(calendar);

    // Generate multiple sample dates
    const samples = [
      this.generateSampleDate(calendar, 1),
      this.generateSampleDate(calendar, 100),
      this.generateSampleDate(calendar, 365),
    ];

    const content = `
      <div class="calendar-preview">
        <div class="preview-header">
          <h3>${label}</h3>
          <div class="preview-setting">${setting}</div>
        </div>
        <div class="preview-description">${description}</div>
        <div class="preview-samples">
          <h4>${game.i18n.localize('SEASONS_STARS.dialog.calendar_selection.sample_dates')}</h4>
          ${samples.map(sample => `<div class="sample-date">${sample}</div>`).join('')}
        </div>
        <div class="preview-structure">
          <h4>${game.i18n.localize('SEASONS_STARS.dialog.calendar_selection.structure')}</h4>
          <div class="structure-info">
            <div><strong>${game.i18n.localize('SEASONS_STARS.calendar.months')}:</strong> ${calendar.months.length}</div>
            <div><strong>${game.i18n.localize('SEASONS_STARS.calendar.days_per_week')}:</strong> ${calendar.weekdays.length}</div>
            ${calendar.leapYear ? `<div><strong>${game.i18n.localize('SEASONS_STARS.calendar.leap_year')}:</strong> ${game.i18n.localize('SEASONS_STARS.calendar.enabled')}</div>` : ''}
          </div>
        </div>
      </div>
    `;

    new foundry.applications.api.DialogV2({
      window: {
        title: game.i18n.format('SEASONS_STARS.dialog.calendar_preview.title', { calendar: label }),
      },
      content,
      buttons: [
        {
          action: 'close',
          icon: 'fas fa-times',
          label: game.i18n.localize('SEASONS_STARS.dialog.close'),
          callback: (): void => {},
        },
      ],
      default: 'close',
      classes: ['seasons-stars', 'calendar-preview-dialog'],
      position: {
        width: 400,
        height: 'auto',
      },
    }).render(true);
  }

  /**
   * Generate a sample date for preview
   */
  private generateSampleDate(calendar: SeasonsStarsCalendar, dayOffset: number = 1): string {
    // Use current world time if no offset, otherwise use offset from a reasonable base
    let totalDays: number;

    if (dayOffset === 1) {
      // Use current world time for default sample
      const currentTime = game.time?.worldTime || 0;
      Logger.debug(`Using current world time for sample: ${currentTime} seconds`);
      // Use calendar-specific day length instead of hardcoded 86400
      const secondsPerDay = CalendarTimeUtils.getSecondsPerDay(calendar);
      totalDays = Math.floor(currentTime / secondsPerDay);
      Logger.debug(`Converted to total days: ${totalDays}`);
    } else {
      // Use offset for other samples
      totalDays = dayOffset;
      Logger.debug(`Using offset days for sample: ${totalDays}`);
    }

    // Use approximate year calculation for sample generation
    // For accurate date calculation, use the calendar engine, but this is just for preview samples
    const approximateYearLength = CalendarTimeUtils.getApproximateYearLength(calendar);
    const year = 1000 + Math.floor(totalDays / approximateYearLength);
    const dayInYear = totalDays % approximateYearLength;
    Logger.debug('Calculated year and day in year', { year, dayInYear });

    let remainingDays = dayInYear;
    let monthIndex = 0;

    // Find the month
    for (let i = 0; i < calendar.months.length; i++) {
      const monthDays = calendar.months[i].days;
      if (remainingDays <= monthDays) {
        monthIndex = i;
        break;
      }
      remainingDays -= monthDays;
    }

    const month = calendar.months[monthIndex];
    const day = Math.max(1, remainingDays);
    const weekdayIndex = (dayOffset - 1) % calendar.weekdays.length;
    const weekday = calendar.weekdays[weekdayIndex];

    // Create a proper CalendarDate object and use the calendar's dateFormats
    const calendarDate = {
      year: year,
      month: monthIndex + 1, // CalendarDate expects 1-based months
      day: day,
      weekday: weekdayIndex,
      time: { hour: 12, minute: 0, second: 0 }, // Use noon for preview
    };

    try {
      // Use CalendarDate's formatting which respects the calendar's dateFormats
      const calendarDateInstance = new CalendarDate(calendarDate, calendar);
      return calendarDateInstance.toLongString();
    } catch (error) {
      Logger.warn('Failed to use calendar date formatting, falling back to manual format:', error);

      // Fallback to manual formatting if CalendarDate fails
      const monthLabel = CalendarLocalization.getCalendarTranslation(
        calendar,
        `months.${month.id || month.name}`,
        month.name
      );
      const weekdayLabel = CalendarLocalization.getCalendarTranslation(
        calendar,
        `weekdays.${weekday.id || weekday.name}`,
        weekday.name
      );

      return `${weekdayLabel}, ${monthLabel} ${day}, ${year}`;
    }
  }

  /**
   * Determine the source type and metadata for a calendar
   */
  private getCalendarSourceInfo(calendarId: string): {
    type: 'builtin' | 'module' | 'external';
    icon: string;
    label: string;
    description: string;
  } {
    // Get the calendar object to check for source information
    const calendar = this.calendars.get(calendarId);

    // Use the stored source information if available
    if (calendar?.sourceInfo) {
      return {
        type: calendar.sourceInfo.type,
        icon: calendar.sourceInfo.icon,
        label: calendar.sourceInfo.sourceName,
        description: calendar.sourceInfo.description,
      };
    }

    // Fallback for calendars without source information (shouldn't happen with new system)
    Logger.warn(`Calendar ${calendarId} missing source information, using fallback detection`);
    return {
      type: 'builtin',
      icon: 'fa-solid fa-question-circle',
      label: 'Unknown Source',
      description: 'Calendar source information not available',
    };
  }

  /**
   * Generate mini widget preview for calendar selection
   */
  private generateMiniWidgetPreview(calendar: SeasonsStarsCalendar): string {
    // Create a sample CalendarDate to demonstrate mini widget formatting
    const sampleDate = {
      year: 2370,
      month: 1,
      day: 15,
      weekday: 1,
      time: { hour: 12, minute: 0, second: 0 },
    };

    try {
      // Create CalendarDate instance and use toShortString()
      const calendarDateInstance = new CalendarDate(sampleDate, calendar);
      return calendarDateInstance.toShortString();
    } catch (error) {
      Logger.warn('Failed to generate mini widget preview, using fallback:', error);

      // Fallback to basic format
      const monthName = calendar.months?.[0]?.abbreviation || calendar.months?.[0]?.name || 'Jan';
      const yearString = calendar.year?.prefix + sampleDate.year + (calendar.year?.suffix || '');
      return `${sampleDate.day} ${monthName} ${yearString}`;
    }
  }

  /**
   * Update current calendar state based on actual settings
   */
  private async _updateCurrentCalendarState(): Promise<void> {
    const selectedFilePath =
      (game.settings?.get('seasons-and-stars', 'activeCalendarFile') as string) || '';
    const activeCalendarSetting =
      (game.settings?.get('seasons-and-stars', 'activeCalendar') as string) || '';

    Logger.debug('_updateCurrentCalendarState settings:', {
      selectedFilePath,
      activeCalendarSetting,
    });

    // File picker is active if there's a file path AND no regular calendar setting
    const filePickerActive = selectedFilePath !== '' && activeCalendarSetting === '';

    Logger.debug('File picker detection:', { filePickerActive });

    // When file picker is active, we should treat it as the "current" calendar for dialog purposes
    if (filePickerActive) {
      this.currentCalendarId = '__FILE_PICKER__';
    } else if (activeCalendarSetting) {
      this.currentCalendarId = activeCalendarSetting;
    }

    Logger.debug('Updated currentCalendarId to:', this.currentCalendarId);
  }

  /**
   * Handle calendar selection
   */
  private async selectCalendar(): Promise<void> {
    // Ensure dialog state is up-to-date before processing selection
    await this._updateCurrentCalendarState();

    Logger.debug('selectCalendar called:', {
      selectedCalendarId: this.selectedCalendarId,
      currentCalendarId: this.currentCalendarId,
      condition: this.selectedCalendarId && this.selectedCalendarId !== this.currentCalendarId,
    });
    if (this.selectedCalendarId && this.selectedCalendarId !== this.currentCalendarId) {
      if (this.selectedCalendarId === '__FILE_PICKER__') {
        // Handle file picker selection - resolve path from pending or saved state
        const selectedFilePath = resolveCalendarFilePath(this.pendingFilePath);

        if (!selectedFilePath) {
          Logger.debug('No custom calendar file selected, user must select a file first');
          // Open file picker instead of showing error
          await this._onOpenFilePicker(new Event('click'), document.createElement('button'));
          return;
        }

        // Load calendar from file path
        Logger.debug('Loading calendar from file via selectCalendar:', selectedFilePath);
        const calendarManager = game.seasonsStars?.manager as any;
        if (!calendarManager) {
          Logger.error('Calendar manager not available for file loading');
          return;
        }
        const fileUrl = calendarManager.convertFoundryPathToUrl(selectedFilePath);
        const result = await calendarManager.loadCalendarFromUrl(fileUrl, { validate: true });

        if (result.success && result.calendar) {
          // Create source info for the file-based calendar
          const fileSourceInfo: CalendarSourceInfo = {
            type: 'external',
            sourceName: 'Custom File',
            description: `Calendar loaded from ${selectedFilePath}`,
            icon: 'fa-solid fa-file',
            url: fileUrl,
          };

          // Add the calendar to the manager's calendar map and validate
          const loadSuccess = calendarManager.loadCalendar(result.calendar, fileSourceInfo);

          if (loadSuccess) {
            // IMPORTANT: Save calendar data AFTER successful validation
            // This prevents syncing invalid calendars to other clients
            const saveResult = await saveCalendarDataForSync(result.calendar);
            if (!saveResult.success && saveResult.error) {
              Logger.error(`Failed to save calendar data: ${saveResult.error}`);
              // Continue anyway - calendar is still loaded locally
            }

            // Save the file path to settings (GM only)
            const pathSaveResult = await saveCalendarFilePath(selectedFilePath);
            if (!pathSaveResult.success && pathSaveResult.error) {
              Logger.error(`Failed to save file path: ${pathSaveResult.error}`);
              // Continue anyway - calendar is still loaded locally
            }

            // Clear pending file path since we've now committed it
            this.pendingFilePath = null;

            // Clear regular calendar setting if it's currently set (GM only)
            const clearResult = await clearConflictingCalendarSetting();
            if (!clearResult.success && clearResult.error) {
              Logger.error(`Failed to clear conflicting setting: ${clearResult.error}`);
              // Continue anyway - file calendar takes precedence
            }

            // Set the calendar as active, but don't save to activeCalendar setting
            await calendarManager.setActiveCalendar(result.calendar.id, false);

            Logger.info('Successfully loaded and activated calendar from file:', selectedFilePath);

            // Notify user
            ui.notifications?.info(
              game.i18n.format('SEASONS_STARS.notifications.calendar_changed', {
                calendar: `Custom File: ${selectedFilePath.split('/').pop()}`,
              })
            );
          } else {
            Logger.error(
              'Failed to load calendar into manager:',
              new Error(`Validation failed for ${selectedFilePath}`)
            );
            ui.notifications?.error(
              game.i18n.format('SEASONS_STARS.errors.calendar_file_load_failed', {
                path: selectedFilePath,
                error: 'Calendar validation failed',
              })
            );
            return;
          }
        } else {
          Logger.error(
            'Failed to load calendar from file:',
            new Error(result.error || 'Unknown error')
          );
          ui.notifications?.error(
            game.i18n.format('SEASONS_STARS.errors.calendar_file_load_failed', {
              path: selectedFilePath,
              error: result.error || 'Unknown error',
            })
          );
          return;
        }
      } else {
        // Switch to a regular calendar
        await game.settings?.set('seasons-and-stars', 'activeCalendar', this.selectedCalendarId);

        // Clear file picker setting to ensure regular calendar takes precedence
        await game.settings?.set('seasons-and-stars', 'activeCalendarFile', '');

        // Notify user
        const calendar = this.calendars.get(this.selectedCalendarId);
        const label = calendar
          ? CalendarLocalization.getCalendarLabel(calendar)
          : this.selectedCalendarId;

        ui.notifications?.info(
          game.i18n.format('SEASONS_STARS.notifications.calendar_changed', { calendar: label })
        );
      }
    }
  }

  /**
   * Instance action handler for calendar card selection
   */
  async _onSelectCalendar(event: Event, target: HTMLElement): Promise<void> {
    Logger.debug('Calendar card clicked', { event, target });

    const calendarId = target.getAttribute('data-calendar-id');
    Logger.debug(`Found calendar ID for selection: ${calendarId}`);

    if (calendarId) {
      Logger.debug(`Calling selectCalendarCard with ID: ${calendarId}`);
      this.selectCalendarCard(calendarId);
    } else {
      Logger.warn('Selection action failed - no calendar ID found');
    }
  }

  /**
   * Instance action handler for calendar preview
   */
  async _onPreviewCalendar(event: Event, target: HTMLElement): Promise<void> {
    Logger.debug('Preview button clicked', { event, target });
    Logger.debug('Calendars data', {
      type: typeof this.calendars,
      isMap: this.calendars instanceof Map,
      calendars: this.calendars,
    });
    event.stopPropagation();

    const calendarId = target.closest('[data-calendar-id]')?.getAttribute('data-calendar-id');
    Logger.debug(`Found calendar ID: ${calendarId}`);

    if (calendarId) {
      Logger.debug(`Calling showPreview with ID: ${calendarId}`);
      this.showPreview(calendarId);
    } else {
      Logger.warn('Preview action failed - no calendar ID found');
    }
  }

  /**
   * Instance action handler for choosing calendar
   */
  async _onChooseCalendar(event: Event, target: HTMLElement): Promise<void> {
    Logger.debug('Choose calendar clicked', { event, target });
    await this.selectCalendar();
    this.close();
  }

  /**
   * Instance action handler for cancel
   */
  async _onCancel(event: Event, target: HTMLElement): Promise<void> {
    Logger.debug('Cancel clicked', { event, target });
    this.close();
  }

  /**
   * Instance action handler for opening file picker
   */
  async _onOpenFilePicker(event: Event, target: HTMLElement): Promise<void> {
    Logger.debug('File picker action triggered', { event, target });

    // Check if we clicked on the card itself (should select it as the active choice)
    const isCardClick = target.closest('.file-picker-card') && !target.closest('.card-actions');

    if (isCardClick) {
      // If clicking on the file picker card itself, select it (if it has a file path)
      const selectedFilePath =
        (game.settings?.get('seasons-and-stars', 'activeCalendarFile') as string) || '';
      if (selectedFilePath) {
        Logger.debug('File picker card selected with existing path', { selectedFilePath });
        this.selectedCalendarId = '__FILE_PICKER__'; // Special ID for file picker
        this.render(true);
        return;
      }
    }

    // Otherwise, open the file picker dialog
    try {
      // @ts-expect-error - FilePicker is available at runtime but TypeScript types may not reflect the full structure
      const filePicker = new foundry.applications.apps.FilePicker.implementation({
        type: 'data',
        extensions: ['.json'],
        callback: async (path: string): Promise<void> => {
          Logger.debug('File selected in picker', { path });

          // Store the path locally - don't save to settings until user clicks "Select"
          this.pendingFilePath = path;

          // Update dialog state to show file picker is selected
          this.selectedCalendarId = '__FILE_PICKER__';

          // Re-render dialog to show updated state
          this.render(true);
        },
      });

      await filePicker.render(true);
    } catch (error) {
      Logger.error('Failed to open file picker:', error as Error);
      ui.notifications?.error(game.i18n.localize('SEASONS_STARS.errors.file_picker_failed'));
    }
  }

  /**
   * Instance action handler for clearing file picker selection
   */
  async _onClearFilePicker(event: Event, target: HTMLElement): Promise<void> {
    Logger.debug('Clear file picker button clicked', { event, target });

    try {
      // Clear the pending file path (local UI state only)
      // Settings will only be cleared when user clicks "Select" to confirm
      this.pendingFilePath = null;

      // Also clear the selected calendar ID so user must make a new selection
      this.selectedCalendarId = null;

      // Re-render dialog to show updated state
      this.render(true);
    } catch (error) {
      Logger.error('Failed to clear file picker:', error as Error);
      ui.notifications?.error(game.i18n.localize('SEASONS_STARS.errors.clear_file_failed'));
    }
  }

  /**
   * Instance action handler for highlighting a calendar in the list (updates detail pane)
   */
  async _onHighlightCalendar(event: Event, target: HTMLElement): Promise<void> {
    const calendarId = target.getAttribute('data-calendar-id');
    Logger.debug('Highlight calendar', { calendarId });

    if (calendarId) {
      this.highlightedCalendarId = calendarId;

      // Also select this calendar (clicking = selecting)
      this.selectCalendarCard(calendarId);

      // Reset month view when changing calendars
      this.detailViewMonth = 1;

      // Get calendar to set a reasonable default year
      const calendar = this.calendars.get(calendarId);
      if (calendar) {
        // Use a sample year based on the calendar's epoch or default
        this.detailViewYear = 1000;
      }

      // Re-render list (for highlight state), detail pane, and footer
      this.render({ parts: ['list', 'detail', 'footer'] });
    }
  }

  /**
   * Instance action handler for toggling variant group expansion
   */
  async _onToggleVariants(event: Event, target: HTMLElement): Promise<void> {
    event.stopPropagation();

    const baseId = target.getAttribute('data-base-id');
    Logger.debug('Toggle variants', { baseId });

    if (baseId) {
      if (this.expandedVariantGroups.has(baseId)) {
        this.expandedVariantGroups.delete(baseId);
      } else {
        this.expandedVariantGroups.add(baseId);
      }

      // Re-render list only
      this.render({ parts: ['list'] });
    }
  }

  /**
   * Instance action handler for browsing months in the detail pane
   */
  async _onBrowseMonth(event: Event, target: HTMLElement): Promise<void> {
    const direction = target.getAttribute('data-direction');
    Logger.debug('Browse month', { direction });

    if (!this.highlightedCalendarId) return;

    const calendar = this.calendars.get(this.highlightedCalendarId);
    if (!calendar) return;

    const totalMonths = calendar.months.length;

    if (direction === 'prev') {
      this.detailViewMonth--;
      if (this.detailViewMonth < 1) {
        this.detailViewMonth = totalMonths;
        this.detailViewYear--;
      }
    } else if (direction === 'next') {
      this.detailViewMonth++;
      if (this.detailViewMonth > totalMonths) {
        this.detailViewMonth = 1;
        this.detailViewYear++;
      }
    }

    // Re-render detail pane only
    this.render({ parts: ['detail'] });
  }

  /**
   * Instance action handler for clearing search/tag filters
   */
  async _onClearFilters(_event: Event, _target: HTMLElement): Promise<void> {
    Logger.debug('Clear filters');

    this.searchQuery = '';
    this.selectedTags = [];

    // Re-render header (to clear search input) and list
    this.render({ parts: ['header', 'list'] });
  }

  /**
   * Static method to show the calendar selection dialog
   */
  static async show(): Promise<void> {
    if (!game.seasonsStars?.manager) {
      ui.notifications?.error(game.i18n.localize('SEASONS_STARS.errors.manager_not_ready'));
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calendars = (game.seasonsStars.manager as any).getAllCalendars();
    Logger.debug('CalendarSelectionDialog.show() - calendars from manager', {
      type: typeof calendars,
      isMap: calendars instanceof Map,
      calendars,
    });
    const currentCalendarId = game.settings?.get('seasons-and-stars', 'activeCalendar') as string;

    const calendarCount = Array.isArray(calendars) ? calendars.length : calendars.size;
    if (calendarCount === 0) {
      ui.notifications?.warn(game.i18n.localize('SEASONS_STARS.warnings.no_calendars_available'));
      return;
    }

    // Get collection entries and external sources from CalendarLoader if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calendarLoader = (game.seasonsStars as any)?.calendarLoader;
    let collectionEntries: Map<string, CalendarCollectionEntry> | undefined;
    let externalSources: Map<string, ExternalCalendarSource> | undefined;

    if (calendarLoader) {
      try {
        // Get external sources from calendar loader
        const sources = calendarLoader.getSources();
        externalSources = new Map();
        for (const source of sources) {
          externalSources.set(source.id, source);
        }

        // Collection entries would be populated during calendar loading
        // For now, we'll pass an empty map and the source detection will work based on external sources
        collectionEntries = new Map();

        Logger.debug('CalendarSelectionDialog.show() - external sources', {
          sourcesCount: externalSources.size,
          sources: Array.from(externalSources.values()),
        });
      } catch (error) {
        Logger.warn('Failed to get external sources from calendar loader:', error);
      }
    }

    const dialog = new CalendarSelectionDialog(
      calendars,
      currentCalendarId,
      collectionEntries,
      externalSources
    );
    dialog.render(true);
  }
}
