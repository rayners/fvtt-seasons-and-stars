/**
 * Calendar Selection Dialog for Seasons & Stars
 * Allows users to browse and switch between available calendars
 */

import { CalendarLocalization } from '../core/calendar-localization';
import { Logger } from '../core/logger';
import { CalendarTimeUtils } from '../core/calendar-time-utils';
import { CalendarDate } from '../core/calendar-date';
import type { SeasonsStarsCalendar } from '../types/calendar';

export class CalendarSelectionDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  private selectedCalendarId: string | null = null;
  private calendars: Map<string, SeasonsStarsCalendar>;
  private currentCalendarId: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(calendars: any, currentCalendarId: string) {
    super();

    Logger.debug('CalendarSelectionDialog constructor', {
      type: typeof calendars,
      isMap: calendars instanceof Map,
      calendars,
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

    this.currentCalendarId = currentCalendarId;
    this.selectedCalendarId = currentCalendarId;
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
      width: 600,
      height: 750,
    },
    actions: {
      selectCalendar: CalendarSelectionDialog.prototype._onSelectCalendar,
      previewCalendar: CalendarSelectionDialog.prototype._onPreviewCalendar,
      chooseCalendar: CalendarSelectionDialog.prototype._onChooseCalendar,
      cancel: CalendarSelectionDialog.prototype._onCancel,
    },
  };

  static PARTS = {
    main: {
      id: 'main',
      template: 'modules/seasons-and-stars/templates/calendar-selection-dialog.hbs',
      scrollable: ['.calendar-selection-grid'],
    },
  };

  /** @override */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async _prepareContext(options = {}): Promise<any> {
    const context = await super._prepareContext(options);

    const calendarsData = Array.from(this.calendars.entries()).map(([id, calendar]) => {
      const label = CalendarLocalization.getCalendarLabel(calendar);
      const description = CalendarLocalization.getCalendarDescription(calendar);
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
          variantInfo = `Variant: ${variantId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
        }
      }

      // Generate sample date for preview
      const sampleDate = this.generateSampleDate(calendar);

      // Generate mini widget preview
      const miniPreview = this.generateMiniWidgetPreview(calendar);

      return {
        id,
        label,
        description,
        setting,
        sampleDate,
        miniPreview,
        isCurrent: id === this.currentCalendarId,
        isSelected: id === this.selectedCalendarId,
        isVariant,
        variantInfo,
        baseCalendarId,
      };
    });

    // Group calendars hierarchically by base calendar
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calendarGroups = new Map<string, { base: any | null; variants: any[] }>();

    for (const calendar of calendarsData) {
      if (!calendarGroups.has(calendar.baseCalendarId)) {
        calendarGroups.set(calendar.baseCalendarId, { base: null, variants: [] });
      }

      const group = calendarGroups.get(calendar.baseCalendarId);
      if (!group) continue;
      if (calendar.isVariant) {
        group.variants.push(calendar);
      } else {
        group.base = calendar;
      }
    }

    // Sort groups with Gregorian first, then alphabetically
    const sortedGroups = Array.from(calendarGroups.entries()).sort(
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

    return Object.assign(context, {
      calendars: sortedCalendars,
      selectedCalendar: this.selectedCalendarId,
      currentCalendar: this.currentCalendarId,
    });
  }

  /** @override */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _attachPartListeners(partId: string, htmlElement: HTMLElement, options: any): void {
    super._attachPartListeners(partId, htmlElement, options);

    Logger.debug('Attaching part listeners', { partId, element: htmlElement });
    Logger.debug('Scrollable elements', htmlElement.querySelectorAll('.calendar-selection-grid'));

    // Add action buttons to window and update button state after rendering
    this.addActionButtons($(htmlElement));
    this.updateSelectButton($(htmlElement));

    // Debug: Check if scrolling is working
    const scrollableGrid = htmlElement.querySelector('.calendar-selection-grid');
    if (scrollableGrid) {
      const style = getComputedStyle(scrollableGrid);
      Logger.debug('Found scrollable grid', {
        overflow: style.overflow,
        clientHeight: scrollableGrid.clientHeight,
        scrollHeight: scrollableGrid.scrollHeight,
      });
    }
  }

  /**
   * Add action buttons to the dialog
   */
  private addActionButtons(html: JQuery): void {
    const footer = $(`
      <div class="dialog-buttons flexrow">
        <button data-action="cancel" type="button" class="button">
          <i class="fas fa-times"></i>
          ${game.i18n.localize('SEASONS_STARS.dialog.calendar_selection.cancel')}
        </button>
        <button data-action="chooseCalendar" type="button" class="button ss-button primary" id="select-calendar">
          <i class="fas fa-check"></i>
          ${game.i18n.localize('SEASONS_STARS.dialog.calendar_selection.select')}
        </button>
      </div>
    `);

    html.append(footer);
  }

  /**
   * Select a calendar card
   */
  private selectCalendarCard(calendarId: string): void {
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
      const calendar = this.calendars.get(this.selectedCalendarId);
      const label = calendar
        ? CalendarLocalization.getCalendarLabel(calendar)
        : this.selectedCalendarId;
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
   * Handle calendar selection
   */
  private async selectCalendar(): Promise<void> {
    if (this.selectedCalendarId && this.selectedCalendarId !== this.currentCalendarId) {
      // Switch to the selected calendar
      await game.settings?.set('seasons-and-stars', 'activeCalendar', this.selectedCalendarId);

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

    if (calendars.size === 0) {
      ui.notifications?.warn(game.i18n.localize('SEASONS_STARS.warnings.no_calendars_available'));
      return;
    }

    const dialog = new CalendarSelectionDialog(calendars, currentCalendarId);
    dialog.render(true);
  }
}
