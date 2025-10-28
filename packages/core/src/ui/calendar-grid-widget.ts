/**
 * Calendar Grid Widget - Monthly calendar view for Seasons & Stars
 */

import { CalendarLocalization } from '../core/calendar-localization';
import { CalendarWidgetManager } from './widget-manager';
import { CalendarDate } from '../core/calendar-date';
import { Logger } from '../core/logger';
import { SidebarButtonRegistry } from './sidebar-button-registry';
import {
  addSidebarButton as registerSidebarButton,
  removeSidebarButton as unregisterSidebarButton,
  hasSidebarButton as registryHasSidebarButton,
  loadButtonsFromRegistry,
} from './sidebar-button-mixin';
import { CreateNoteWindow } from './create-note-window';
import type {
  CalendarDate as ICalendarDate,
  CalendarDateData,
  CalendarIntercalary,
  SeasonsStarsCalendar,
} from '../types/calendar';
import type { CalendarDayData } from '../types/external-integrations';
import type { CalendarManagerInterface, NotesManagerInterface } from '../types/foundry-extensions';

export class CalendarGridWidget extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  private viewDate: ICalendarDate;
  private static activeInstance: CalendarGridWidget | null = null;

  constructor(initialDate?: ICalendarDate) {
    super();

    // Use provided date or current date
    const manager = game.seasonsStars?.manager as CalendarManagerInterface;
    if (initialDate) {
      this.viewDate = initialDate;
    } else {
      const currentDate = manager?.getCurrentDate();
      if (currentDate) {
        this.viewDate = currentDate;
      } else {
        // Fallback to default date
        this.viewDate = {
          year: 2024,
          month: 1,
          day: 1,
          weekday: 0,
          time: { hour: 0, minute: 0, second: 0 },
        } as CalendarDate;
      }
    }
  }

  static DEFAULT_OPTIONS = {
    id: 'seasons-stars-grid-widget',
    classes: ['seasons-stars', 'calendar-grid-widget'],
    tag: 'div',
    window: {
      frame: true,
      positioned: true,
      title: 'SEASONS_STARS.calendar.monthly_view',
      icon: 'fa-solid fa-calendar',
      minimizable: false,
      resizable: false,
    },
    position: {
      width: 400,
      height: 'auto' as const,
    },
    actions: {
      previousMonth: CalendarGridWidget.prototype._onPreviousMonth,
      nextMonth: CalendarGridWidget.prototype._onNextMonth,
      previousYear: CalendarGridWidget.prototype._onPreviousYear,
      nextYear: CalendarGridWidget.prototype._onNextYear,
      selectDate: CalendarGridWidget.prototype._onSelectDate,
      goToToday: CalendarGridWidget.prototype._onGoToToday,
      setYear: CalendarGridWidget.prototype._onSetYear,
      createNote: CalendarGridWidget.prototype._onCreateNote,
      viewNotes: CalendarGridWidget.prototype._onViewNotes,
      switchToMain: CalendarGridWidget.prototype._onSwitchToMain,
      switchToMini: CalendarGridWidget.prototype._onSwitchToMini,
      clickSidebarButton: CalendarGridWidget.prototype._onClickSidebarButton,
    },
  };

  static PARTS = {
    main: {
      id: 'main',
      template: 'modules/seasons-and-stars/templates/calendar-grid-widget.hbs',
    },
  };

  /**
   * Handle post-render setup
   */
  async _onRender(
    context: Record<string, unknown>,
    options: ApplicationV2.RenderOptions
  ): Promise<void> {
    await super._onRender(context, options);

    // Register as active instance
    CalendarGridWidget.activeInstance = this;

    // Fire hook for external integrations (e.g., Simple Calendar Compatibility Bridge)
    if (this.element) {
      Hooks.callAll('seasons-stars:renderCalendarWidget', this, this.element, 'grid');
    }
  }

  /**
   * Prepare rendering context for template
   */
  async _prepareContext(options = {}): Promise<Record<string, unknown>> {
    const context = await super._prepareContext(options);

    const manager = game.seasonsStars?.manager as CalendarManagerInterface;

    if (!manager) {
      return Object.assign(context, {
        error: 'Calendar manager not initialized',
      });
    }

    const activeCalendar = manager.getActiveCalendar();
    const currentDate = manager.getCurrentDate();

    if (!activeCalendar || !currentDate) {
      return Object.assign(context, {
        error: 'No active calendar',
      });
    }

    const calendarInfo = CalendarLocalization.getLocalizedCalendarInfo(activeCalendar);
    const monthData = this.generateMonthData(activeCalendar, this.viewDate, currentDate);

    const clickBehavior = game.settings.get('seasons-and-stars', 'calendarClickBehavior') as string;
    const isGM = game.user?.isGM || false;

    // Generate UI hint based on current settings
    let uiHint = '';
    if (isGM) {
      if (clickBehavior === 'viewDetails') {
        uiHint = 'Click dates to view details. Ctrl+Click to set current date.';
      } else {
        uiHint = 'Click dates to set current date.';
      }
    } else {
      uiHint = 'Click dates to view details.';
    }

    return Object.assign(context, {
      calendar: calendarInfo,
      viewDate: this.viewDate,
      currentDate: currentDate.toObject(),
      monthData: monthData,
      monthName: activeCalendar.months[this.viewDate.month - 1]?.name || 'Unknown',
      monthDescription: activeCalendar.months[this.viewDate.month - 1]?.description,
      yearDisplay: `${activeCalendar.year?.prefix || ''}${this.viewDate.year}${activeCalendar.year?.suffix || ''}`,
      isGM: isGM,
      clickBehavior: clickBehavior,
      uiHint: uiHint,
      weekdays: activeCalendar.weekdays.map(wd => ({
        name: wd.name,
        abbreviation: wd.abbreviation,
        description: wd.description,
      })),
      sidebarButtons: loadButtonsFromRegistry('grid'),
    });
  }

  /**
   * Generate calendar month data with day grid and note indicators
   */
  private generateMonthData(
    calendar: SeasonsStarsCalendar,
    viewDate: ICalendarDate,
    currentDate: ICalendarDate
  ) {
    const engine = (game.seasonsStars?.manager as CalendarManagerInterface)?.getActiveEngine();
    if (!engine) return { weeks: [], totalDays: 0 };

    // Get month information
    const monthInfo = calendar.months[viewDate.month - 1];
    if (!monthInfo) return { weeks: [], totalDays: 0 };

    // Calculate month length (considering leap years)
    const monthLength = engine.getMonthLength(viewDate.month, viewDate.year);

    // Find the first day of the month and its weekday
    const firstDayData: CalendarDateData = {
      year: viewDate.year,
      month: viewDate.month,
      day: 1,
      weekday: engine.calculateWeekday(viewDate.year, viewDate.month, 1),
      time: { hour: 0, minute: 0, second: 0 },
    };
    const firstDay = new CalendarDate(firstDayData, calendar);

    // Get notes for this month for note indicators with category and tooltip information
    const notesManager = game.seasonsStars?.notes as NotesManagerInterface;
    const monthNotes = new Map<
      string,
      {
        count: number;
        primaryCategory: string;
        categories: Set<string>;
        notes: Array<{ title: string; tags: string[] }>;
      }
    >(); // dateKey -> note data

    if (notesManager) {
      // Get all notes for the month

      // Get notes synchronously for UI performance
      try {
        for (let day = 1; day <= monthLength; day++) {
          const dayDateData: CalendarDateData = {
            year: viewDate.year,
            month: viewDate.month,
            day: day,
            weekday: 0,
            time: { hour: 0, minute: 0, second: 0 },
          };
          const dayDate = new CalendarDate(dayDateData, calendar);

          const allNotes = notesManager.storage?.findNotesByDateSync(dayDate) || [];
          const notes = allNotes.filter(note => {
            // Use Foundry's native permission checking
            if (!game.user) return false; // No user logged in
            if (game.user.isGM) return true;

            const ownership = note.ownership;
            const userLevel =
              ownership[game.user.id] || ownership.default || CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;

            return userLevel >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
          });
          if (notes.length > 0) {
            const dateKey = this.formatDateKey(dayDate);
            const dayCategories = new Set<string>();
            const noteDetails: Array<{ title: string; tags: string[] }> = [];

            // Gather categories and details from all notes for this day
            notes.forEach(note => {
              const category = note.flags?.['seasons-and-stars']?.category || 'general';
              const tags = note.flags?.['seasons-and-stars']?.tags || [];
              dayCategories.add(category);
              noteDetails.push({
                title: note.name || 'Untitled Note',
                tags: Array.isArray(tags) ? tags : [],
              });
            });

            // Determine primary category (most common, or first if tied)
            const categoryCount = new Map<string, number>();
            notes.forEach(note => {
              const category = note.flags?.['seasons-and-stars']?.category || 'general';
              categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
            });

            const primaryCategory =
              Array.from(categoryCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'general';

            monthNotes.set(dateKey, {
              count: notes.length,
              primaryCategory,
              categories: dayCategories,
              notes: noteDetails,
            });
          }
        }
      } catch (error) {
        Logger.warn('Error loading notes for calendar', error);
      }
    }

    // Build calendar grid
    const weeks: Array<Array<CalendarDayData>> = [];
    let currentWeek: Array<CalendarDayData> = [];

    // Get events manager once for the entire month (performance optimization)
    const manager = game.seasonsStars?.manager as CalendarManagerInterface;
    const eventsManager = manager?.getActiveEventsManager();

    // Fill in empty cells before month starts
    const startWeekday = firstDay.weekday || 0;
    for (let i = 0; i < startWeekday; i++) {
      currentWeek.push({
        day: 0,
        date: { year: 0, month: 0, day: 0, weekday: 0 },
        isCurrentMonth: false,
        isToday: false,
        hasNotes: false,
        isEmpty: true,
      });
    }

    // Add intercalary days that come BEFORE this month as separate full-width rows
    const intercalaryDaysBefore = engine.getIntercalaryDaysBeforeMonth(
      viewDate.year,
      viewDate.month
    );
    const beforeRows = this.createIntercalaryRows(
      intercalaryDaysBefore,
      'before',
      calendar,
      viewDate,
      currentDate
    );
    weeks.push(...beforeRows);

    // Fill in the days of the month
    for (let day = 1; day <= monthLength; day++) {
      const dayDateData = {
        year: viewDate.year,
        month: viewDate.month,
        day: day,
        weekday: engine.calculateWeekday(viewDate.year, viewDate.month, day),
        time: { hour: 0, minute: 0, second: 0 },
      };
      const dayDate = new CalendarDate(dayDateData, calendar);

      const isToday = this.isSameDate(dayDate, currentDate);
      const isViewDate = this.isSameDate(dayDate, viewDate);
      const dateKey = this.formatDateKey(dayDate);
      const noteData = monthNotes.get(dateKey);
      const noteCount = noteData?.count || 0;
      const hasNotes = noteCount > 0;

      // Determine category class for styling
      let categoryClass = '';
      if (hasNotes && noteData) {
        if (noteData.categories.size > 1) {
          categoryClass = 'category-mixed';
        } else {
          categoryClass = `category-${noteData.primaryCategory}`;
        }
      }

      // Get calendar events for this date
      // Note: When multiple events exist on a date, only the first event's icon/color is displayed
      // to maintain visual clarity. The tooltip shows all events.
      const calendarEvents =
        eventsManager?.getEventsForDate(viewDate.year, viewDate.month, day) || [];
      const hasEvents = calendarEvents.length > 0;

      // Create enhanced tooltip with note details (HTML format with XSS protection)
      let noteTooltipHtml = '';
      if (hasNotes && noteData) {
        const notesList = noteData.notes
          .map(note => {
            const escapedTitle = note.title.stripScripts();
            const escapedTags = note.tags.map(tag => tag.stripScripts());
            const tagText = escapedTags.length > 0 ? ` [${escapedTags.join(', ')}]` : '';
            return `<div>${escapedTitle}${tagText}</div>`;
          })
          .join('');
        const escapedCategory = noteData.primaryCategory.stripScripts();
        noteTooltipHtml = `<strong>${noteCount} note(s) (${escapedCategory}):</strong>${notesList}`;
      }

      // Create event tooltip (HTML format with XSS protection)
      let eventTooltipHtml = '';
      if (hasEvents) {
        const eventsList = calendarEvents
          .map(event => {
            const escapedName = event.event.name.stripScripts();
            return `<div>${escapedName}</div>`;
          })
          .join('');
        eventTooltipHtml = `<strong>${calendarEvents.length} event(s):</strong>${eventsList}`;
      }

      // Calculate moon phases for this day
      let moonPhases: Array<{
        moonName: string;
        phaseName: string;
        phaseIcon: string;
        moonColor?: string;
        dayInPhase: number;
        daysUntilNext: number;
        dayInPhaseExact: number;
        daysUntilNextExact: number;
        phaseProgress: number;
      }> = [];
      let primaryMoonPhase: string | undefined;
      let primaryMoonColor: string | undefined;
      let moonTooltip = '';
      let hasMultipleMoons = false;

      try {
        const moonPhaseInfo = (engine as any).getMoonPhaseInfo?.(dayDate);
        if (moonPhaseInfo && moonPhaseInfo.length > 0) {
          moonPhases = moonPhaseInfo.map(info => ({
            moonName: info.moon.name,
            phaseName: info.phase.name,
            phaseIcon: info.phase.icon,
            moonColor: info.moon.color,
            dayInPhase: info.dayInPhase,
            daysUntilNext: info.daysUntilNext,
            dayInPhaseExact: info.dayInPhaseExact,
            daysUntilNextExact: info.daysUntilNextExact,
            phaseProgress: info.phaseProgress,
          }));

          // Set primary moon (first moon) for simple display
          const primaryMoon = moonPhaseInfo[0];
          primaryMoonPhase = primaryMoon.phase.icon;
          primaryMoonColor = primaryMoon.moon.color;
          hasMultipleMoons = moonPhaseInfo.length > 1;

          // Create moon tooltip (HTML format)
          if (moonPhaseInfo.length === 1) {
            const moon = moonPhaseInfo[0];
            moonTooltip = `${moon.moon.name}: ${moon.phase.name}`;
            if (moon.daysUntilNextExact > 0) {
              moonTooltip += ` (${this.formatDaysUntilNext(moon.daysUntilNextExact)} until next phase)`;
            }
          } else {
            const moonList = moonPhaseInfo
              .map(info => {
                const base = `${info.moon.name}: ${info.phase.name}`;
                if (info.daysUntilNextExact > 0) {
                  return `<div>${base} (${this.formatDaysUntilNext(info.daysUntilNextExact)} until next phase)</div>`;
                }
                return `<div>${base}</div>`;
              })
              .join('');
            moonTooltip = moonList;
          }
        }
      } catch (error) {
        // Silently handle moon calculation errors to avoid breaking calendar display
        console.debug('Error calculating moon phases for date:', dayDate, error);
      }

      // Build combined HTML tooltip
      const tooltipParts: string[] = [];

      // Add date
      if (isToday) {
        tooltipParts.push(
          `<strong>Current Date:</strong> ${viewDate.year}-${viewDate.month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
        );
      } else {
        tooltipParts.push(
          `${viewDate.year}-${viewDate.month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
        );
      }

      // Add events
      if (eventTooltipHtml) {
        tooltipParts.push(eventTooltipHtml);
      }

      // Add notes
      if (noteTooltipHtml) {
        tooltipParts.push(noteTooltipHtml);
      }

      // Add moon phases
      if (moonTooltip) {
        tooltipParts.push(moonTooltip);
      }

      // Add click instruction (all days are clickable)
      tooltipParts.push('<em>(Click to set date)</em>');

      const combinedTooltip = tooltipParts.join('<br>');

      currentWeek.push({
        day: day,
        date: {
          year: dayDate.year,
          month: dayDate.month,
          day: dayDate.day,
          weekday: dayDate.weekday,
        },
        isCurrentMonth: true,
        isToday: isToday,
        hasNotes: hasNotes,
        // Moon phase properties
        moonPhases: moonPhases,
        primaryMoonPhase: primaryMoonPhase,
        primaryMoonColor: primaryMoonColor,
        moonTooltip: moonTooltip,
        hasMultipleMoons: hasMultipleMoons,
        // Calendar event properties
        hasEvents: hasEvents,
        eventCount: calendarEvents.length,
        eventTooltip: eventTooltipHtml,
        eventIcon: calendarEvents[0]?.event.icon,
        eventColor: calendarEvents[0]?.event.color,
        // Additional properties for template
        isSelected: isViewDate,
        isClickable: true, // Click handler manages GM-only actions vs player info view
        weekday: dayDate.weekday,
        fullDate: `${viewDate.year}-${viewDate.month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
        noteCount: noteCount,
        noteMultiple: noteCount > 1,
        categoryClass: categoryClass,
        primaryCategory: noteData?.primaryCategory || 'general',
        noteTooltip: noteTooltipHtml,
        combinedTooltip: combinedTooltip,
        canCreateNote: this.canCreateNote(),
      } as CalendarDayData & {
        isSelected: boolean;
        isClickable: boolean;
        weekday: number;
        fullDate: string;
        noteCount: number;
        noteMultiple: boolean;
        categoryClass: string;
        primaryCategory: string;
        noteTooltip: string;
        combinedTooltip: string;
        canCreateNote: boolean;
        hasEvents: boolean;
        eventCount: number;
        eventTooltip: string;
        eventIcon?: string;
        eventColor?: string;
      });

      // Start new week on last day of week
      if (currentWeek.length === calendar.weekdays.length) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill in empty cells after month ends
    if (currentWeek.length > 0) {
      while (currentWeek.length < calendar.weekdays.length) {
        currentWeek.push({
          day: 0,
          date: { year: 0, month: 0, day: 0, weekday: 0 },
          isCurrentMonth: false,
          isToday: false,
          hasNotes: false,
          isEmpty: true,
        });
      }
      weeks.push(currentWeek);
    }

    // Add intercalary days that come AFTER this month as separate full-width rows
    const intercalaryDaysAfter = engine.getIntercalaryDaysAfterMonth(viewDate.year, viewDate.month);
    const afterRows = this.createIntercalaryRows(
      intercalaryDaysAfter,
      'after',
      calendar,
      viewDate,
      currentDate
    );
    weeks.push(...afterRows);

    return {
      weeks: weeks,
      totalDays: monthLength,
      monthName: monthInfo.name,
      monthDescription: monthInfo.description,
      intercalaryDays: [...intercalaryDaysBefore, ...intercalaryDaysAfter],
    };
  }

  /**
   * Create intercalary day rows for calendar grid
   *
   * Generates calendar grid rows for intercalary days that occur before or after
   * specific months. Intercalary days are extra days outside the regular month
   * structure (e.g., leap days, festival days).
   *
   * @param intercalaryDays - Array of intercalary day definitions from calendar
   * @param position - Whether these are 'before' or 'after' intercalary days
   * @param calendar - The calendar definition containing month information
   * @param viewDate - The currently viewed date in the calendar widget
   * @param currentDate - The actual current date for highlighting
   * @returns Array of calendar rows, each containing a single intercalary day
   */
  private createIntercalaryRows(
    intercalaryDays: CalendarIntercalary[],
    position: 'before' | 'after',
    calendar: SeasonsStarsCalendar,
    viewDate: ICalendarDate,
    currentDate: ICalendarDate
  ): Array<Array<CalendarDayData>> {
    const rows: Array<Array<CalendarDayData>> = [];

    for (const intercalary of intercalaryDays) {
      const monthRefName = position === 'before' ? intercalary.before : intercalary.after;

      // Validate that the intercalary day has the expected property
      if (!monthRefName) {
        Logger.warn(
          `Intercalary day "${intercalary.name}" missing ${position} property - skipping`
        );
        continue;
      }
      const monthIndex = calendar.months.findIndex(m => m.name === monthRefName);
      const intercalaryMonth = monthIndex >= 0 ? monthIndex + 1 : viewDate.month;

      const intercalaryDateData = {
        year: viewDate.year,
        month: intercalaryMonth,
        day: 1,
        weekday: 0,
        time: { hour: 0, minute: 0, second: 0 },
        intercalary: intercalary.name,
      };
      const intercalaryDate = new CalendarDate(intercalaryDateData, calendar);

      const isToday = this.isSameIntercalaryDate(intercalaryDate, currentDate);
      const isViewDate = this.isSameIntercalaryDate(intercalaryDate, viewDate);

      const intercalaryRow = [
        {
          day: intercalary.name,
          date: intercalaryDate,
          isToday: isToday,
          isSelected: isViewDate,
          isClickable: true,
          isCurrentMonth: true,
          isIntercalary: true,
          intercalaryName: intercalary.name,
          intercalaryDescription: intercalary.description,
          fullDate: `${viewDate.year}-${viewDate.month.toString().padStart(2, '0')}-${intercalary.name}`,
          hasNotes: false,
          noteCount: 0,
          categoryClass: '',
          primaryCategory: 'general',
          noteTooltip: '',
          canCreateNote: this.canCreateNote(),
        },
      ];

      rows.push(intercalaryRow);
    }

    return rows;
  }

  /**
   * Format date as storage key
   */
  private formatDateKey(date: ICalendarDate): string {
    return `${date.year}-${date.month.toString().padStart(2, '0')}-${date.day.toString().padStart(2, '0')}`;
  }

  private formatDaysUntilNext(days: number): string {
    const safeDays = Math.max(days, 0);
    const rounded = Math.round(safeDays * 10) / 10;
    const hasFraction = Math.abs(rounded - Math.trunc(rounded)) > 1e-9;
    const locale = game.i18n?.lang ?? 'en';
    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: hasFraction ? 1 : 0,
      maximumFractionDigits: hasFraction ? 1 : 0,
    });
    const value = formatter.format(rounded);
    const unit = Math.abs(rounded - 1) < 1e-9 ? 'day' : 'days';
    return `${value} ${unit}`;
  }

  /**
   * Check if current user can create notes
   */
  private canCreateNote(): boolean {
    const notesManager = game.seasonsStars?.notes as NotesManagerInterface;
    if (!notesManager) return false;

    // Use notes manager's canCreateNote method
    return notesManager.canCreateNote();
  }

  /**
   * Check if two dates are the same (ignoring time)
   */
  private isSameDate(date1: ICalendarDate, date2: ICalendarDate): boolean {
    // Basic date comparison
    const sameBasicDate =
      date1.year === date2.year && date1.month === date2.month && date1.day === date2.day;

    // Both must have the same intercalary status
    const bothIntercalary = !!date1.intercalary && !!date2.intercalary;
    const neitherIntercalary = !date1.intercalary && !date2.intercalary;
    const sameIntercalaryStatus = bothIntercalary || neitherIntercalary;

    // If both are intercalary, they must have the same intercalary name
    const sameIntercalaryName = bothIntercalary ? date1.intercalary === date2.intercalary : true;

    return sameBasicDate && sameIntercalaryStatus && sameIntercalaryName;
  }

  /**
   * Add ordinal suffix to a number (1st, 2nd, 3rd, etc.)
   */
  private addOrdinalSuffix(num: number): string {
    const lastDigit = num % 10;
    const lastTwoDigits = num % 100;

    // Handle special cases (11th, 12th, 13th)
    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      return `${num}th`;
    }

    // Handle regular cases
    switch (lastDigit) {
      case 1:
        return `${num}st`;
      case 2:
        return `${num}nd`;
      case 3:
        return `${num}rd`;
      default:
        return `${num}th`;
    }
  }

  /**
   * Format a year with prefix and suffix from calendar configuration
   */
  private formatYear(year: number): string {
    const manager = game.seasonsStars?.manager as CalendarManagerInterface;
    const calendar = manager?.getActiveCalendar();
    if (!calendar) return year.toString();

    const prefix = calendar.year?.prefix || '';
    const suffix = calendar.year?.suffix || '';
    return `${prefix}${year}${suffix}`;
  }

  /**
   * Check if two intercalary dates are the same
   */
  private isSameIntercalaryDate(date1: ICalendarDate, date2: ICalendarDate): boolean {
    return (
      date1.year === date2.year &&
      date1.month === date2.month &&
      date1.intercalary === date2.intercalary &&
      !!date1.intercalary &&
      !!date2.intercalary
    );
  }

  /**
   * Navigate to previous month
   */
  async _onPreviousMonth(event: Event, _target: HTMLElement): Promise<void> {
    event.preventDefault();

    const engine = (game.seasonsStars?.manager as CalendarManagerInterface)?.getActiveEngine();
    if (!engine) return;

    this.viewDate = engine.addMonths(this.viewDate, -1);
    this.render();
  }

  /**
   * Navigate to next month
   */
  async _onNextMonth(event: Event, _target: HTMLElement): Promise<void> {
    event.preventDefault();

    const engine = (game.seasonsStars?.manager as CalendarManagerInterface)?.getActiveEngine();
    if (!engine) return;

    this.viewDate = engine.addMonths(this.viewDate, 1);
    this.render();
  }

  /**
   * Navigate to previous year
   */
  async _onPreviousYear(event: Event, _target: HTMLElement): Promise<void> {
    event.preventDefault();

    const engine = (game.seasonsStars?.manager as CalendarManagerInterface)?.getActiveEngine();
    if (!engine) return;

    this.viewDate = engine.addYears(this.viewDate, -1);
    this.render();
  }

  /**
   * Navigate to next year
   */
  async _onNextYear(event: Event, _target: HTMLElement): Promise<void> {
    event.preventDefault();

    const engine = (game.seasonsStars?.manager as CalendarManagerInterface)?.getActiveEngine();
    if (!engine) return;

    this.viewDate = engine.addYears(this.viewDate, 1);
    this.render();
  }

  /**
   * Select a specific date (GM only - sets world time) or view date details based on setting
   */
  async _onSelectDate(event: Event, target: HTMLElement): Promise<void> {
    event.preventDefault();

    const clickBehavior = game.settings.get('seasons-and-stars', 'calendarClickBehavior') as string;
    const isGM = game.user?.isGM;
    const isCtrlClick = (event as MouseEvent).ctrlKey || (event as MouseEvent).metaKey;

    // Ctrl+Click always sets date (if GM)
    if (isCtrlClick && isGM) {
      return this.setCurrentDate(target);
    }

    // Regular click behavior based on setting
    if (clickBehavior === 'viewDetails') {
      return this.showDateInfo(target);
    }

    // Default behavior: set date (GM only) or show info (players)
    if (!isGM) {
      return this.showDateInfo(target);
    }

    return this.setCurrentDate(target);
  }

  /**
   * Set the current date (extracted from _onSelectDate for reuse)
   */
  private async setCurrentDate(target: HTMLElement): Promise<void> {
    const manager = game.seasonsStars?.manager as CalendarManagerInterface;
    const engine = manager?.getActiveEngine();
    if (!manager || !engine) return;

    try {
      // Check if this is an intercalary day
      const calendarDay = target.closest('.calendar-day');
      const isIntercalary = calendarDay?.classList.contains('intercalary');

      let targetDate: ICalendarDate;
      const currentDate = manager.getCurrentDate();

      if (isIntercalary) {
        // Handle intercalary day selection
        const intercalaryName = target.dataset.day; // For intercalary days, day contains the name
        if (!intercalaryName) return;

        // Find the intercalary day definition to determine which month it comes after
        const calendar = engine.getCalendar();
        const intercalaryDef = calendar.intercalary?.find(i => i.name === intercalaryName);
        if (!intercalaryDef) return;

        // Find the month that this intercalary day comes after
        const afterMonthIndex = calendar.months.findIndex(m => m.name === intercalaryDef.after);
        if (afterMonthIndex === -1) return;

        const targetDateData = {
          year: this.viewDate.year,
          month: afterMonthIndex + 1, // Use the month it comes after (1-based)
          day: 1, // Intercalary days typically use day 1 as a placeholder
          weekday: 0, // Intercalary days don't have weekdays
          time: currentDate?.time || { hour: 0, minute: 0, second: 0 },
          intercalary: intercalaryName,
        };
        targetDate = new CalendarDate(targetDateData, calendar);

        const afterMonthName = calendar.months[afterMonthIndex]?.name || 'Unknown';
        const yearDisplay = this.formatYear(this.viewDate.year);
        ui.notifications?.info(
          `Date set to ${intercalaryName} (intercalary day after ${afterMonthName} ${yearDisplay})`
        );
      } else {
        // Handle regular day selection
        const day = parseInt(target.dataset.day || '0');
        if (day < 1) return;

        const targetDateData = {
          year: this.viewDate.year,
          month: this.viewDate.month,
          day: day,
          weekday: engine.calculateWeekday(this.viewDate.year, this.viewDate.month, day),
          time: currentDate?.time || { hour: 0, minute: 0, second: 0 },
        };
        const calendar = engine.getCalendar();
        targetDate = new CalendarDate(targetDateData, calendar);
        const monthName = calendar.months[targetDate.month - 1]?.name || 'Unknown';
        const dayWithSuffix = this.addOrdinalSuffix(targetDate.day);
        const yearDisplay = this.formatYear(targetDate.year);
        ui.notifications?.info(`Date set to ${dayWithSuffix} of ${monthName}, ${yearDisplay}`);
      }

      // Set the target date
      await manager.setCurrentDate(targetDate);

      // Update view date to selected date
      this.viewDate = targetDate;
      this.render();
    } catch (error) {
      Logger.error('Failed to set date', error as Error);
      ui.notifications?.error('Failed to set date');
    }
  }

  /**
   * Show information about a specific date without setting it
   */
  private showDateInfo(target: HTMLElement): void {
    const manager = game.seasonsStars?.manager as CalendarManagerInterface;
    const engine = manager?.getActiveEngine();
    if (!manager || !engine) return;

    try {
      // Check if this is an intercalary day
      const calendarDay = target.closest('.calendar-day');
      const isIntercalary = calendarDay?.classList.contains('intercalary');
      const calendar = engine.getCalendar();

      let dateInfo = '';

      if (isIntercalary) {
        // Handle intercalary day information
        const intercalaryName = target.dataset.day;
        if (!intercalaryName) return;

        const intercalaryDef = calendar.intercalary?.find(i => i.name === intercalaryName);
        const afterMonthName = intercalaryDef?.after || 'Unknown';
        const yearDisplay = this.formatYear(this.viewDate.year);

        dateInfo = `${intercalaryName} (intercalary day after ${afterMonthName}, ${yearDisplay})`;
        if (intercalaryDef?.description) {
          dateInfo += `\n${intercalaryDef.description}`;
        }
      } else {
        // Handle regular day information
        const day = parseInt(target.dataset.day || '0');
        if (day < 1) return;

        const monthName = calendar.months[this.viewDate.month - 1]?.name || 'Unknown';
        const monthDesc = calendar.months[this.viewDate.month - 1]?.description;
        const dayWithSuffix = this.addOrdinalSuffix(day);
        const yearDisplay = this.formatYear(this.viewDate.year);

        dateInfo = `${dayWithSuffix} of ${monthName}, ${yearDisplay}`;
        if (monthDesc) {
          dateInfo += `\n${monthDesc}`;
        }
      }

      // Show as notification
      ui.notifications?.info(dateInfo);
    } catch (error) {
      Logger.error('Failed to show date info', error as Error);
      ui.notifications?.warn('Failed to load date information');
    }
  }

  /**
   * Go to current date
   */
  async _onGoToToday(event: Event, _target: HTMLElement): Promise<void> {
    event.preventDefault();

    const manager = game.seasonsStars?.manager as CalendarManagerInterface;
    if (!manager) return;

    const currentDate = manager.getCurrentDate();
    if (currentDate) {
      this.viewDate = currentDate;
      this.render();
    }
  }

  /**
   * Handle sidebar button clicks from template actions
   */
  async _onClickSidebarButton(event: Event, target: HTMLElement): Promise<void> {
    event.preventDefault();

    const buttonName = target.dataset.buttonName;
    if (!buttonName) {
      Logger.warn('Grid widget sidebar button clicked without button name');
      return;
    }

    const registry = SidebarButtonRegistry.getInstance();
    const button = registry.getForWidget('grid').find(config => config.name === buttonName);

    if (button && typeof button.callback === 'function') {
      try {
        button.callback();
      } catch (error) {
        Logger.error(`Error executing grid widget sidebar button "${buttonName}"`, error as Error);
      }
    } else {
      Logger.warn(`Grid widget sidebar button "${buttonName}" not found or has invalid callback`);
    }
  }

  /**
   * Set year via input dialog
   */
  async _onSetYear(event: Event, _target: HTMLElement): Promise<void> {
    event.preventDefault();

    const engine = (game.seasonsStars?.manager as CalendarManagerInterface)?.getActiveEngine();
    if (!engine) return;

    const currentYear = this.viewDate.year;
    const newYear = await new Promise<number | null>(resolve => {
      const dialog = new foundry.applications.api.DialogV2({
        window: {
          title: 'Set Year',
        },
        content: `
          <form>
            <div class="form-group">
              <label>Enter Year:</label>
              <input type="number" name="year" value="${currentYear}" min="1" max="99999" step="1" autofocus />
            </div>
          </form>
        `,
        buttons: [
          {
            action: 'ok',
            icon: 'fas fa-check',
            label: 'Set Year',
            callback: (
              _event: Event,
              _button: HTMLElement,
              dialog: foundry.applications.api.DialogV2
            ): void => {
              const form = dialog.element?.querySelector('form');
              if (!form) {
                ui.notifications?.error('Dialog form not found');
                return;
              }
              const formData = new FormData(form as HTMLFormElement);
              const yearInput = formData.get('year') as string;
              const year = parseInt(yearInput);
              if (!isNaN(year) && year > 0) {
                resolve(year);
                dialog.close();
              } else {
                ui.notifications?.error('Please enter a valid year');
              }
            },
          },
          {
            action: 'cancel',
            icon: 'fas fa-times',
            label: 'Cancel',
            callback: (): void => resolve(null),
          },
        ],
        default: 'ok',
        close: () => resolve(null),
      });

      dialog.render(true);
    });

    if (newYear !== null) {
      const viewDateData = this.viewDate.toObject
        ? this.viewDate.toObject()
        : (this.viewDate as any);
      this.viewDate = { ...viewDateData, year: newYear } as CalendarDate;
      this.render();
    }
  }

  /**
   * Create a new note for the selected date
   */
  async _onCreateNote(event: Event, target: HTMLElement): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const notesManager = game.seasonsStars?.notes as NotesManagerInterface;
    if (!notesManager) {
      ui.notifications?.error('Notes system not available');
      return;
    }

    // Check permissions
    if (!this.canCreateNote()) {
      ui.notifications?.error("You don't have permission to create notes");
      return;
    }

    // Get the date from the clicked element
    const dayElement = target.closest('.calendar-day');
    if (!dayElement) return;

    const day = parseInt(dayElement.getAttribute('data-day') || '0');
    if (!day) return;

    const targetDateData: CalendarDateData = {
      year: this.viewDate.year,
      month: this.viewDate.month,
      day: day,
      weekday: 0, // Will be calculated by the engine
      time: { hour: 0, minute: 0, second: 0 },
    };
    const manager = game.seasonsStars?.manager as CalendarManagerInterface;
    const calendar = manager?.getActiveCalendar();
    if (!calendar) return;
    const targetDate = new CalendarDate(targetDateData, calendar);

    // Show note creation dialog
    const noteCreated = await this.showCreateNoteDialog(targetDate);

    // Refresh the calendar if any note was created
    if (noteCreated) {
      await (this as any).render({ parts: ['main'] });
    }
  }

  /**
   * Show note creation window with enhanced category and tag support
   * Returns true if any note was created, false otherwise
   */
  private async showCreateNoteDialog(date: ICalendarDate): Promise<boolean> {
    // Track whether any note was created
    let noteWasCreated = false;

    // Show the create note window
    await CreateNoteWindow.show({
      date,
      onNoteCreated: () => {
        noteWasCreated = true;
      },
    });

    return noteWasCreated;
  }

  /**
   * View/edit notes for a specific date
   */
  async _onViewNotes(event: Event, target: HTMLElement): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const notesManager = game.seasonsStars?.notes as NotesManagerInterface;
    if (!notesManager) {
      ui.notifications?.error('Notes system not available');
      return;
    }

    // Get the date from the clicked element
    const dayElement = target.closest('.calendar-day');
    if (!dayElement) return;

    const day = parseInt(dayElement.getAttribute('data-day') || '0');
    if (!day) return;

    const targetDateData: CalendarDateData = {
      year: this.viewDate.year,
      month: this.viewDate.month,
      day: day,
      weekday: 0, // Will be calculated by the engine
      time: { hour: 0, minute: 0, second: 0 },
    };
    const manager = game.seasonsStars?.manager as CalendarManagerInterface;
    const calendar = manager?.getActiveCalendar();
    if (!calendar) return;
    const targetDate = new CalendarDate(targetDateData, calendar);

    try {
      // Get notes for this date
      const notes = notesManager.storage?.findNotesByDateSync?.(targetDate) || [];

      if (notes.length === 0) {
        ui.notifications?.info('No notes found for this date');
        return;
      }

      if (notes.length === 1) {
        // Single note - open directly
        const note = notes[0];
        (note.sheet as any)?.render(true);
      } else {
        // Multiple notes - show selection dialog
        await this.showNotesSelectionDialog(notes, targetDate);
      }
    } catch (error) {
      Logger.error('Failed to view notes', error as Error);
      ui.notifications?.error('Failed to view notes');
    }
  }

  /**
   * Show selection dialog for multiple notes on the same date
   */
  private async showNotesSelectionDialog(
    notes: JournalEntry[],
    date: ICalendarDate
  ): Promise<void> {
    const manager = game.seasonsStars?.manager as CalendarManagerInterface;
    const activeCalendar = manager?.getActiveCalendar();
    let dateDisplayStr = `${date.year}-${date.month.toString().padStart(2, '0')}-${date.day.toString().padStart(2, '0')}`;

    if (activeCalendar) {
      const monthName = activeCalendar.months[date.month - 1]?.name || `Month ${date.month}`;
      const yearPrefix = activeCalendar.year?.prefix || '';
      const yearSuffix = activeCalendar.year?.suffix || '';
      dateDisplayStr = `${date.day} ${monthName}, ${yearPrefix}${date.year}${yearSuffix}`;
    }

    const notesList = notes
      .map((note, index) => {
        const title = note.name || 'Untitled Note';
        const category = note.flags?.['seasons-and-stars']?.category || 'general';
        const preview = note.pages?.contents?.[0]?.text?.content?.substring(0, 100) || 'No content';
        const cleanPreview = preview.stripScripts().trim();

        return `
        <div class="note-item" data-note-id="${note.id}" data-index="${index}">
          <div class="note-header">
            <strong>${title}</strong>
            <span class="note-category">${category}</span>
          </div>
          <div class="note-preview">${cleanPreview}${cleanPreview.length >= 100 ? '...' : ''}</div>
        </div>
      `;
      })
      .join('');

    const content = `
      <div class="notes-selection">
        <p>Select a note to view/edit:</p>
        ${notesList}
      </div>
    `;

    return new Promise(resolve => {
      const dialog = new foundry.applications.api.DialogV2({
        window: {
          title: `Notes for ${dateDisplayStr}`,
        },
        content,
        buttons: [
          {
            action: 'cancel',
            icon: 'fas fa-times',
            label: 'Cancel',
            callback: (): void => resolve(),
          },
        ],
        default: 'cancel',
        render: (event: Event, html: HTMLElement): void => {
          html.querySelectorAll('.note-item').forEach(item => {
            item.addEventListener('click', function (this: HTMLElement) {
              const noteIndex = parseInt(this.dataset.index || '0');
              const note = notes[noteIndex];
              if (note && note.sheet) {
                (note.sheet as any).render(true);
                dialog.close();
              }
              resolve();
            });
          });
        },
      });

      dialog.render(true);
    });
  }

  /**
   * Attach event listeners
   */
  _attachPartListeners(
    partId: string,
    htmlElement: HTMLElement,
    options: ApplicationV2.RenderOptions
  ): void {
    super._attachPartListeners(partId, htmlElement, options);

    // Register this as the active instance
    CalendarGridWidget.activeInstance = this;
  }

  /**
   * Handle closing the widget
   */
  async close(options: ApplicationV2.CloseOptions = {}): Promise<this> {
    // Clear active instance if this is it
    if (CalendarGridWidget.activeInstance === this) {
      CalendarGridWidget.activeInstance = null;
    }

    return super.close(options);
  }

  /**
   * Handle Foundry hooks for real-time updates
   */
  static registerHooks(): void {
    // Update widget when time changes
    Hooks.on('seasons-stars:dateChanged', () => {
      if (CalendarGridWidget.activeInstance?.rendered) {
        CalendarGridWidget.activeInstance.render();
      }
    });

    // Update widget when calendar changes
    Hooks.on('seasons-stars:calendarChanged', () => {
      if (CalendarGridWidget.activeInstance?.rendered) {
        // Reset to current date when calendar changes
        const manager = game.seasonsStars?.manager as CalendarManagerInterface;
        if (manager) {
          const currentDate = manager.getCurrentDate();
          if (currentDate) {
            CalendarGridWidget.activeInstance!.viewDate = currentDate;
          }
        }
        CalendarGridWidget.activeInstance.render();
      }
    });

    Hooks.on('seasons-stars:widgetButtonsChanged', () => {
      if (CalendarGridWidget.activeInstance?.rendered) {
        (CalendarGridWidget.activeInstance as any).render({ parts: ['main'] });
      }
    });
  }

  /**
   * Show the widget
   */
  static show(initialDate?: ICalendarDate): void {
    if (CalendarGridWidget.activeInstance) {
      if (!CalendarGridWidget.activeInstance.rendered) {
        CalendarGridWidget.activeInstance.render(true);
      }
    } else {
      new CalendarGridWidget(initialDate).render(true);
    }
  }

  /**
   * Toggle widget visibility
   */
  static toggle(initialDate?: ICalendarDate): void {
    if (CalendarGridWidget.activeInstance) {
      if (CalendarGridWidget.activeInstance.rendered) {
        CalendarGridWidget.activeInstance.close();
      } else {
        CalendarGridWidget.activeInstance.render(true);
      }
    } else {
      new CalendarGridWidget(initialDate).render(true);
    }
  }

  /**
   * Hide the widget
   */
  static hide(): void {
    if (CalendarGridWidget.activeInstance?.rendered) {
      CalendarGridWidget.activeInstance.close();
    }
  }

  /**
   * Get the current widget instance
   */
  static getInstance(): CalendarGridWidget | null {
    return CalendarGridWidget.activeInstance;
  }

  /**
   * Add a sidebar button to the grid widget
   * Provides generic API for integration with other modules
   */
  addSidebarButton(name: string, icon: string, tooltip: string, callback: Function): void {
    registerSidebarButton('grid', {
      name,
      icon,
      tooltip,
      callback: callback as () => void,
    });
    Logger.debug(`Requested sidebar button "${name}" registration for grid widget`);
  }

  /**
   * Remove a sidebar button from the grid widget
   */
  removeSidebarButton(name: string): void {
    unregisterSidebarButton('grid', name);
    Logger.debug(`Requested sidebar button "${name}" removal for grid widget`);
  }

  /**
   * Check if sidebar button is registered for grid widget
   */
  hasSidebarButton(name: string): boolean {
    return registryHasSidebarButton('grid', name);
  }

  /**
   * Switch to main widget
   */
  async _onSwitchToMain(event: Event, _target: HTMLElement): Promise<void> {
    event.preventDefault();
    Logger.debug('Switching from grid widget to main widget');

    try {
      // Close current widget
      this.close();
      // Open main widget
      CalendarWidgetManager.showWidget('main');
    } catch (error) {
      Logger.error(
        'Failed to switch to main widget',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Switch to mini widget
   */
  async _onSwitchToMini(event: Event, _target: HTMLElement): Promise<void> {
    event.preventDefault();
    Logger.debug('Switching from grid widget to mini widget');

    try {
      // Close current widget
      this.close();
      // Open mini widget
      CalendarWidgetManager.showWidget('mini');
    } catch (error) {
      Logger.error(
        'Failed to switch to mini widget',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}
