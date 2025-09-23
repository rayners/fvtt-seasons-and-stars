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

export class CalendarSelectionDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  private selectedCalendarId: string | null = null;
  private calendars: Map<string, SeasonsStarsCalendar>;
  private collectionEntries: Map<string, CalendarCollectionEntry>;
  private externalSources: Map<string, ExternalCalendarSource>;
  private currentCalendarId: string;

  constructor(
    calendars: Map<string, SeasonsStarsCalendar> | SeasonsStarsCalendar[],
    currentCalendarId: string,
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
      this.currentCalendarId = currentCalendarId;
      this.selectedCalendarId = currentCalendarId;
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
      width: 960,
      height: 720,
    },
    actions: {
      selectCalendar: CalendarSelectionDialog.prototype._onSelectCalendar,
      previewCalendar: CalendarSelectionDialog.prototype._onPreviewCalendar,
      chooseCalendar: CalendarSelectionDialog.prototype._onChooseCalendar,
      cancel: CalendarSelectionDialog.prototype._onCancel,
      openFilePicker: CalendarSelectionDialog.prototype._onOpenFilePicker,
      clearFilePicker: CalendarSelectionDialog.prototype._onClearFilePicker,
    },
  };

  static PARTS = {
    main: {
      id: 'main',
      template: 'modules/seasons-and-stars/templates/calendar-selection-dialog.hbs',
      scrollable: ['.calendar-list', '.calendar-details'],
    },
  };

  /** @override */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async _prepareContext(options = {}): Promise<any> {
    const context = await super._prepareContext(options);

    // Get file picker state
    const selectedFilePath =
      (game.settings?.get('seasons-and-stars', 'activeCalendarFile') as string) || '';
    const activeCalendarSetting =
      (game.settings?.get('seasons-and-stars', 'activeCalendar') as string) || '';

    // File picker is active if there's a file path AND no regular calendar setting
    const filePickerActive = selectedFilePath !== '' && activeCalendarSetting === '';

    // Update current calendar ID based on actual settings (dynamic detection)
    if (filePickerActive) {
      this.currentCalendarId = '__FILE_PICKER__';
    } else if (activeCalendarSetting) {
      this.currentCalendarId = activeCalendarSetting;
    }
    const showFilePicker = true;

    const fallbackSourceLabel = this.localize(
      'SEASONS_STARS.dialog.calendar_selection.unknown_source'
    );
    const fallbackAuthor = this.localize('SEASONS_STARS.dialog.calendar_selection.unknown_author');

    const calendarsData = Array.from(this.calendars.entries()).map(([id, calendar]) => {
      const label = CalendarLocalization.getCalendarLabel(calendar);
      const localizedDescription = CalendarLocalization.getCalendarDescription(calendar);
      const setting = CalendarLocalization.getCalendarSetting(calendar);

      // Check if this is a calendar variant
      const isVariant = id.includes('(') && id.includes(')');
      let variantInfo = '';
      let baseCalendarId = id;

      if (isVariant) {
        // Extract base calendar ID and variant name
        const match = id.match(/^(.+)\((.+)\)$/);
        if (match) {
          baseCalendarId = match[1];
          const variantId = match[2];
          const variantName = variantId
            .replace(/[-_]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\b\w/g, letter => letter.toUpperCase());
          variantInfo = this.format('SEASONS_STARS.dialog.calendar_selection.variant_label', {
            variant: variantName,
          });
        }
      }

      // Determine the source type and metadata
      const sourceInfo = this.getCalendarSourceInfo(id);

      // Use collection preview if available, otherwise generate sample date
      const collectionEntry = this.collectionEntries.get(id);
      const sampleDate = collectionEntry?.preview || this.generateSampleDate(calendar);

      // Generate mini widget preview (use collection preview for consistency if available)
      const miniPreview = collectionEntry?.preview || this.generateMiniWidgetPreview(calendar);

      const description = collectionEntry?.description || localizedDescription;
      const tags = collectionEntry?.tags || [];
      const author = collectionEntry?.author || calendar.sourceInfo?.sourceName || fallbackAuthor;

      return {
        id,
        label,
        description,
        detailDescription: description,
        setting,
        sampleDate,
        miniPreview,
        tags,
        author,
        isCurrent: id === this.currentCalendarId,
        isSelected: id === this.selectedCalendarId,
        isVariant,
        variantInfo,
        baseCalendarId,
        sourceType: sourceInfo.type,
        sourceIcon: sourceInfo.icon,
        sourceLabel: sourceInfo.label || fallbackSourceLabel,
        sourceDescription: sourceInfo.description,
        isModuleSource: sourceInfo.type === 'module',
        isBuiltinSource: sourceInfo.type === 'builtin',
        isExternalSource: sourceInfo.type === 'external',
      };
    });

    // Group calendars hierarchically by base calendar
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hierarchyGroups = new Map<string, { base: any | null; variants: any[] }>();

    for (const calendar of calendarsData) {
      if (!hierarchyGroups.has(calendar.baseCalendarId)) {
        hierarchyGroups.set(calendar.baseCalendarId, { base: null, variants: [] });
      }

      const group = hierarchyGroups.get(calendar.baseCalendarId);
      if (!group) continue;
      if (calendar.isVariant) {
        group.variants.push(calendar);
      } else {
        group.base = calendar;
      }
    }

    // Sort groups with Gregorian first, then alphabetically
    const sortedGroups = Array.from(hierarchyGroups.entries()).sort(
      ([aId, aGroup], [bId, bGroup]) => {
        // Gregorian calendar always comes first
        if (aId === 'gregorian') return -1;
        if (bId === 'gregorian') return 1;

        // All other calendars sorted alphabetically by display label
        const labelA = aGroup.base ? aGroup.base.label : aId;
        const labelB = bGroup.base ? bGroup.base.label : bId;
        return labelA.localeCompare(labelB);
      }
    );

    // Build hierarchical calendar list
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sortedCalendars: any[] = [];
    for (const [, group] of sortedGroups) {
      // Add base calendar first
      if (group.base) {
        sortedCalendars.push(group.base);
      }

      // Sort variants alphabetically and add with hierarchy indicator
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      group.variants.sort((a: any, b: any) => a.label.localeCompare(b.label));
      for (const variant of group.variants) {
        // Add visual hierarchy level for CSS styling
        variant.hierarchyLevel = 1;
        sortedCalendars.push(variant);
      }
    }

    // Determine if file picker should be considered "selected"
    // Only show as selected if there's actually a file selected AND it's either the selected ID or is currently active
    const resultsCount = sortedCalendars.length;

    // Group calendars by source for master-detail layout
    const groupMap = new Map<
      string,
      {
        id: string;
        label: string;
        icon: string;
        sourceType: string;
        calendars: typeof sortedCalendars;
      }
    >();

    for (const calendar of sortedCalendars) {
      const groupId = calendar.sourceLabel || calendar.sourceType;
      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, {
          id: groupId,
          label: calendar.sourceLabel || fallbackSourceLabel,
          icon: calendar.sourceIcon || 'fa-solid fa-calendar-alt',
          sourceType: calendar.sourceType,
          calendars: [],
        });
      }

      const group = groupMap.get(groupId);
      group?.calendars.push(calendar);
    }

    const customGroupId = 'custom-files';
    let filePickerCalendar: (typeof sortedCalendars)[number] | null = null;

    if (showFilePicker) {
      const customGroupLabel = this.localize(
        'SEASONS_STARS.dialog.calendar_selection.custom_group_label'
      );
      const customGroupDescription = this.localize(
        'SEASONS_STARS.dialog.calendar_selection.custom_group_description'
      );

      const filePickerLabel = selectedFilePath
        ? selectedFilePath.split('/').pop() ||
          this.localize('SEASONS_STARS.dialog.calendar_selection.custom_file')
        : this.localize('SEASONS_STARS.dialog.calendar_selection.custom_file');
      const filePickerDescription = selectedFilePath
        ? this.localize('SEASONS_STARS.dialog.calendar_selection.file_loaded')
        : this.localize('SEASONS_STARS.dialog.calendar_selection.custom_file_hint');

      const customTag = this.localize('SEASONS_STARS.dialog.calendar_selection.tag_custom');

      filePickerCalendar = {
        id: '__FILE_PICKER__',
        label: filePickerLabel,
        description: filePickerDescription,
        detailDescription: filePickerDescription,
        setting: selectedFilePath,
        sampleDate:
          selectedFilePath ||
          this.localize('SEASONS_STARS.dialog.calendar_selection.click_to_select'),
        miniPreview: selectedFilePath || '',
        tags: selectedFilePath ? [customTag] : [],
        author: fallbackAuthor,
        isCurrent: filePickerActive,
        isSelected: this.selectedCalendarId === '__FILE_PICKER__',
        isVariant: false,
        variantInfo: '',
        baseCalendarId: '__FILE_PICKER__',
        sourceType: 'external',
        sourceIcon: 'fa-solid fa-file-alt',
        sourceLabel: customGroupLabel,
        sourceDescription: customGroupDescription,
        isModuleSource: false,
        isBuiltinSource: false,
        isExternalSource: true,
        hasFile: selectedFilePath !== '',
        isFilePicker: true,
      } as (typeof sortedCalendars)[number] & { hasFile: boolean; isFilePicker: boolean };

      if (!groupMap.has(customGroupId)) {
        groupMap.set(customGroupId, {
          id: customGroupId,
          label: customGroupLabel,
          icon: 'fa-solid fa-file-alt',
          sourceType: 'external',
          calendars: [],
        });
      }

      const customGroup = groupMap.get(customGroupId);
      customGroup?.calendars.push(filePickerCalendar);
    }

    const sourceGroups = Array.from(groupMap.values()).map(group => ({
      id: group.id,
      label: group.label,
      icon: group.icon,
      sourceType: group.sourceType,
      calendars: group.calendars,
      calendarCount: group.calendars.length,
    }));

    const allCalendarsForDetails = [...sortedCalendars];
    if (filePickerCalendar) {
      allCalendarsForDetails.push(filePickerCalendar);
    }

    const activeCalendarForDetails =
      allCalendarsForDetails.find(calendar => calendar.id === this.selectedCalendarId) ||
      allCalendarsForDetails.find(calendar => calendar.id === this.currentCalendarId) ||
      null;

    const selectedCalendarDetails = activeCalendarForDetails
      ? activeCalendarForDetails.id === '__FILE_PICKER__'
        ? {
            id: activeCalendarForDetails.id,
            label: activeCalendarForDetails.label,
            description: activeCalendarForDetails.detailDescription,
            sampleDate: activeCalendarForDetails.sampleDate,
            miniPreview: activeCalendarForDetails.miniPreview,
            sourceIcon: activeCalendarForDetails.sourceIcon,
            sourceLabel: activeCalendarForDetails.sourceLabel,
            tags: activeCalendarForDetails.tags,
            isCurrent: activeCalendarForDetails.isCurrent,
            isSelected: activeCalendarForDetails.isSelected,
            isFilePicker: true,
            hasFile: (activeCalendarForDetails as any).hasFile,
            selectedFilePath,
            canPreview: false,
          }
        : {
            id: activeCalendarForDetails.id,
            label: activeCalendarForDetails.label,
            description: activeCalendarForDetails.detailDescription,
            sampleDate: activeCalendarForDetails.sampleDate,
            miniPreview: activeCalendarForDetails.miniPreview,
            sourceIcon: activeCalendarForDetails.sourceIcon,
            sourceLabel: activeCalendarForDetails.sourceLabel,
            sourceDescription: activeCalendarForDetails.sourceDescription,
            tags: activeCalendarForDetails.tags,
            author: activeCalendarForDetails.author,
            setting: activeCalendarForDetails.setting,
            isCurrent: activeCalendarForDetails.isCurrent,
            isSelected: activeCalendarForDetails.isSelected,
            isVariant: activeCalendarForDetails.isVariant,
            variantInfo: activeCalendarForDetails.variantInfo,
            canPreview: true,
          }
      : null;

    const filePickerSelected =
      selectedFilePath !== '' &&
      (this.selectedCalendarId === '__FILE_PICKER__' || filePickerActive);

    return Object.assign(context, {
      calendars: sortedCalendars,
      calendarGroups: sourceGroups,
      selectedCalendar: this.selectedCalendarId,
      selectedCalendarDetails,
      currentCalendar: this.currentCalendarId,
      showFilePicker,
      selectedFilePath,
      filePickerActive,
      filePickerSelected,
      resultsCount: resultsCount + (filePickerCalendar ? 1 : 0),
      filtersActive: false,
      searchQuery: '',
      tagFilter: '',
    });
  }

  /** @override */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _attachPartListeners(partId: string, htmlElement: HTMLElement, options: any): void {
    super._attachPartListeners(partId, htmlElement, options);

    Logger.debug('Attaching part listeners', { partId, element: htmlElement });
    Logger.debug(
      'Scrollable elements',
      htmlElement.querySelectorAll('.calendar-list, .calendar-details')
    );

    // Add action buttons to window and update button state after rendering
    this.addActionButtons($(htmlElement));
    this.updateSelectButton($(htmlElement));

    // Debug: Check if scrolling is working
    const scrollableList = htmlElement.querySelector('.calendar-list');
    if (scrollableList) {
      const style = getComputedStyle(scrollableList);
      Logger.debug('Found scrollable list', {
        overflowY: style.overflowY,
        clientHeight: scrollableList.clientHeight,
        scrollHeight: scrollableList.scrollHeight,
      });
    }
  }

  /**
   * Add action buttons to the dialog
   */
  private addActionButtons(html: JQuery): void {
    const cancelLabel = this.localize('SEASONS_STARS.dialog.calendar_selection.cancel');
    const selectLabel = this.localize('SEASONS_STARS.dialog.calendar_selection.select');
    const footer = $(`
      <div class="dialog-buttons flexrow">
        <button data-action="cancel" type="button" class="button">
          <i class="fas fa-times"></i>
          ${cancelLabel}
        </button>
        <button data-action="chooseCalendar" type="button" class="button ss-button primary" id="select-calendar">
          <i class="fas fa-check"></i>
          ${selectLabel}
        </button>
      </div>
    `);

    html.append(footer);
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
    if (!selectButton.length) {
      return;
    }
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
          ? selectedFilePath.split('/').pop() ||
            this.localize('SEASONS_STARS.dialog.calendar_selection.custom_file')
          : this.localize('SEASONS_STARS.dialog.calendar_selection.custom_file');
        label = fileName;
      } else {
        // Handle regular calendar case
        const calendar = this.calendars.get(this.selectedCalendarId);
        label = calendar
          ? CalendarLocalization.getCalendarLabel(calendar)
          : this.selectedCalendarId;
      }

      const switchLabel = this.format('SEASONS_STARS.dialog.calendar_selection.switch_to', {
        calendar: label,
      });

      selectButton.empty();
      selectButton.append($('<i class="fas fa-check"></i>'));
      selectButton.append(document.createTextNode(` ${switchLabel}`));
    } else {
      const selectLabel = this.localize('SEASONS_STARS.dialog.calendar_selection.select');
      selectButton.empty();
      selectButton.append($('<i class="fas fa-check"></i>'));
      selectButton.append(document.createTextNode(` ${selectLabel}`));
    }
  }

  private static localizeKey(key: string): string {
    const localizeFn = game.i18n?.localize;
    if (typeof localizeFn === 'function') {
      return localizeFn.call(game.i18n, key);
    }
    return key;
  }

  private static formatKey(key: string, data: Record<string, unknown>): string {
    const formatFn = game.i18n?.format;
    if (typeof formatFn === 'function') {
      const formatted = formatFn.call(game.i18n, key, data);
      if (typeof formatted === 'string' && formatted !== key && !formatted.startsWith(`${key} `)) {
        return formatted;
      }
    }

    const localizedTemplate = CalendarSelectionDialog.localizeKey(key);
    const fallbackTemplates: Record<string, string> = {
      'SEASONS_STARS.dialog.calendar_selection.variant_label': 'Variant: {variant}',
      'SEASONS_STARS.dialog.calendar_selection.switch_to': 'Switch to {calendar}',
    };
    const template =
      localizedTemplate !== key ? localizedTemplate : (fallbackTemplates[key] ?? key);
    return CalendarSelectionDialog.replacePlaceholders(template, data);
  }

  private localize(key: string): string {
    return CalendarSelectionDialog.localizeKey(key);
  }

  private format(key: string, data: Record<string, unknown>): string {
    return CalendarSelectionDialog.formatKey(key, data);
  }

  private static replacePlaceholders(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{([^}]+)\}/g, (_, token: string) => {
      const value = data[token as keyof typeof data];
      return value !== undefined ? String(value) : '';
    });
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
          <h4>${this.localize('SEASONS_STARS.dialog.calendar_selection.sample_dates')}</h4>
          ${samples.map(sample => `<div class="sample-date">${sample}</div>`).join('')}
        </div>
        <div class="preview-structure">
          <h4>${this.localize('SEASONS_STARS.dialog.calendar_selection.structure')}</h4>
          <div class="structure-info">
            <div><strong>${this.localize('SEASONS_STARS.calendar.months')}:</strong> ${calendar.months.length}</div>
            <div><strong>${this.localize('SEASONS_STARS.calendar.days_per_week')}:</strong> ${calendar.weekdays.length}</div>
            ${calendar.leapYear ? `<div><strong>${this.localize('SEASONS_STARS.calendar.leap_year')}:</strong> ${this.localize('SEASONS_STARS.calendar.enabled')}</div>` : ''}
          </div>
        </div>
      </div>
    `;

    new foundry.applications.api.DialogV2({
      window: {
        title: this.format('SEASONS_STARS.dialog.calendar_preview.title', { calendar: label }),
      },
      content,
      buttons: [
        {
          action: 'close',
          icon: 'fas fa-times',
          label: this.localize('SEASONS_STARS.dialog.close'),
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
        // Handle file picker selection
        const selectedFilePath =
          (game.settings?.get('seasons-and-stars', 'activeCalendarFile') as string) || '';

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

          // Add the calendar to the manager's calendar map
          const loadSuccess = calendarManager.loadCalendar(result.calendar, fileSourceInfo);

          if (loadSuccess) {
            // Clear regular calendar setting if it's currently set
            const currentActiveCalendar =
              (game.settings?.get('seasons-and-stars', 'activeCalendar') as string) || '';
            if (currentActiveCalendar) {
              await game.settings?.set('seasons-and-stars', 'activeCalendar', '');
            }

            // Set the calendar as active, but don't save to activeCalendar setting
            await calendarManager.setActiveCalendar(result.calendar.id, false);
            Logger.info('Successfully loaded and activated calendar from file:', selectedFilePath);

            // Notify user
            ui.notifications?.info(
              this.format('SEASONS_STARS.notifications.calendar_changed', {
                calendar: `Custom File: ${selectedFilePath.split('/').pop()}`,
              })
            );
          } else {
            Logger.error(
              'Failed to load calendar into manager:',
              new Error(`Validation failed for ${selectedFilePath}`)
            );
            ui.notifications?.error(
              this.format('SEASONS_STARS.errors.calendar_file_load_failed', {
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
            this.format('SEASONS_STARS.errors.calendar_file_load_failed', {
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
          this.format('SEASONS_STARS.notifications.calendar_changed', { calendar: label })
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
      const filePicker = new foundry.applications.apps.FilePicker({
        type: 'data',
        extensions: ['.json'],
        callback: async (path: string): Promise<void> => {
          Logger.debug('File selected', { path });

          // Store the selected file path in settings - this triggers onChange handler
          await game.settings.set('seasons-and-stars', 'activeCalendarFile', path);

          // Update dialog state immediately - file picker is now selected
          this.selectedCalendarId = '__FILE_PICKER__';

          // Re-render dialog to show updated state
          this.render(true);
        },
      });

      await filePicker.render(true);
    } catch (error) {
      Logger.error('Failed to open file picker:', error as Error);
      ui.notifications?.error(this.localize('SEASONS_STARS.errors.file_picker_failed'));
    }
  }

  /**
   * Instance action handler for clearing file picker selection
   */
  async _onClearFilePicker(event: Event, target: HTMLElement): Promise<void> {
    Logger.debug('Clear file picker button clicked', { event, target });

    try {
      // Clear the file picker setting
      await game.settings.set('seasons-and-stars', 'activeCalendarFile', '');

      // Re-render dialog to show updated state
      this.render(true);
    } catch (error) {
      Logger.error('Failed to clear file picker:', error as Error);
      ui.notifications?.error(this.localize('SEASONS_STARS.errors.clear_file_failed'));
    }
  }

  /**
   * Static method to show the calendar selection dialog
   */
  static async show(): Promise<void> {
    if (!game.seasonsStars?.manager) {
      ui.notifications?.error(this.localizeKey('SEASONS_STARS.errors.manager_not_ready'));
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

    if (calendars.size === 0) {
      ui.notifications?.warn(this.localizeKey('SEASONS_STARS.warnings.no_calendars_available'));
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
