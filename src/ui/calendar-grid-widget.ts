/**
 * Calendar Grid Widget - Monthly calendar view for Seasons & Stars
 */

import { CalendarLocalization } from '../core/calendar-localization';
import { CalendarWidgetManager } from './widget-manager';
import { CalendarDate } from '../core/calendar-date';
import { Logger } from '../core/logger';
import type { NoteCategories } from '../core/note-categories';
import type { CreateNoteData } from '../core/notes-manager';
import type {
  CalendarDate as ICalendarDate,
  CalendarDateData,
  SeasonsStarsCalendar,
} from '../types/calendar';
import type { CalendarDayData } from '../types/external-integrations';
import type { CalendarManagerInterface, NotesManagerInterface } from '../types/foundry-extensions';

export class CalendarGridWidget extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  private viewDate: ICalendarDate;
  private static activeInstance: CalendarGridWidget | null = null;
  private sidebarButtons: Array<{
    name: string;
    icon: string;
    tooltip: string;
    callback: Function;
  }> = [];

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

    // Render any existing sidebar buttons
    this.renderExistingSidebarButtons();
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

      // Create enhanced tooltip with note details
      let noteTooltip = '';
      if (hasNotes && noteData) {
        const notesList = noteData.notes
          .map(note => {
            const tagText = note.tags.length > 0 ? ` [${note.tags.join(', ')}]` : '';
            return `${note.title}${tagText}`;
          })
          .join('\n');
        noteTooltip = `${noteCount} note(s) (${noteData.primaryCategory}):\n${notesList}`;
      }

      // Calculate moon phases for this day
      let moonPhases: Array<{
        moonName: string;
        phaseName: string;
        phaseIcon: string;
        moonColor?: string;
        dayInPhase: number;
        daysUntilNext: number;
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
          }));

          // Set primary moon (first moon) for simple display
          const primaryMoon = moonPhaseInfo[0];
          primaryMoonPhase = primaryMoon.phase.icon;
          primaryMoonColor = primaryMoon.moon.color;
          hasMultipleMoons = moonPhaseInfo.length > 1;

          // Create moon tooltip
          if (moonPhaseInfo.length === 1) {
            const moon = moonPhaseInfo[0];
            moonTooltip = `${moon.moon.name}: ${moon.phase.name}`;
            if (moon.daysUntilNext > 0) {
              moonTooltip += ` (${moon.daysUntilNext} days until next phase)`;
            }
          } else {
            moonTooltip = moonPhaseInfo
              .map(info => `${info.moon.name}: ${info.phase.name}`)
              .join('\n');
          }
        }
      } catch (error) {
        // Silently handle moon calculation errors to avoid breaking calendar display
        console.debug('Error calculating moon phases for date:', dayDate, error);
      }

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
        // Additional properties for template
        isSelected: isViewDate,
        isClickable: game.user?.isGM || false,
        weekday: dayDate.weekday,
        fullDate: `${viewDate.year}-${viewDate.month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
        noteCount: noteCount,
        noteMultiple: noteCount > 1,
        categoryClass: categoryClass,
        primaryCategory: noteData?.primaryCategory || 'general',
        noteTooltip: noteTooltip,
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
        canCreateNote: boolean;
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

    // Add intercalary days as separate full-width rows
    const intercalaryDays = engine.getIntercalaryDaysAfterMonth(viewDate.year, viewDate.month);
    for (const intercalary of intercalaryDays) {
      // Find the month that this intercalary day comes after
      const afterMonthIndex = calendar.months.findIndex(m => m.name === intercalary.after);
      const intercalaryMonth = afterMonthIndex >= 0 ? afterMonthIndex + 1 : viewDate.month;

      const intercalaryDateData = {
        year: viewDate.year,
        month: intercalaryMonth, // Use the month it comes after (1-based)
        day: 1, // Intercalary days don't have regular day numbers
        weekday: 0, // Intercalary days don't have weekdays
        time: { hour: 0, minute: 0, second: 0 },
        intercalary: intercalary.name,
      };
      const intercalaryDate = new CalendarDate(intercalaryDateData, calendar);

      const isToday = this.isSameIntercalaryDate(intercalaryDate, currentDate);
      const isViewDate = this.isSameIntercalaryDate(intercalaryDate, viewDate);

      // Create intercalary day row as full-width cell
      const intercalaryRow = [
        {
          day: intercalary.name,
          date: intercalaryDate,
          isToday: isToday,
          isSelected: isViewDate,
          isClickable: game.user?.isGM || false,
          isCurrentMonth: true, // Intercalary days are always part of the current month
          isIntercalary: true,
          intercalaryName: intercalary.name,
          intercalaryDescription: intercalary.description,
          fullDate: `${viewDate.year}-${viewDate.month.toString().padStart(2, '0')}-${intercalary.name}`,
          hasNotes: false, // TODO: Add intercalary note support in future
          noteCount: 0,
          categoryClass: '',
          primaryCategory: 'general',
          noteTooltip: '',
          canCreateNote: this.canCreateNote(),
        },
      ];

      weeks.push(intercalaryRow);
    }

    return {
      weeks: weeks,
      totalDays: monthLength,
      monthName: monthInfo.name,
      monthDescription: monthInfo.description,
      intercalaryDays: intercalaryDays,
    };
  }

  /**
   * Format date as storage key
   */
  private formatDateKey(date: ICalendarDate): string {
    return `${date.year}-${date.month.toString().padStart(2, '0')}-${date.day.toString().padStart(2, '0')}`;
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

    // Default behavior: set date (GM only)
    if (!isGM) {
      ui.notifications?.warn('Only GMs can change the current date');
      return;
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
   * Set year via input dialog
   */
  async _onSetYear(event: Event, _target: HTMLElement): Promise<void> {
    event.preventDefault();

    const engine = (game.seasonsStars?.manager as CalendarManagerInterface)?.getActiveEngine();
    if (!engine) return;

    // Create a simple input dialog
    const currentYear = this.viewDate.year;
    const newYear = await new Promise<number | null>(resolve => {
      new Dialog({
        title: 'Set Year',
        content: `
          <form>
            <div class="form-group">
              <label>Enter Year:</label>
              <input type="number" name="year" value="${currentYear}" min="1" max="99999" step="1" autofocus />
            </div>
          </form>
        `,
        buttons: {
          ok: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Set Year',
            callback: (html: JQuery) => {
              const yearInput = html.find('input[name="year"]').val() as string;
              const year = parseInt(yearInput);
              if (!isNaN(year) && year > 0) {
                resolve(year);
              } else {
                ui.notifications?.error('Please enter a valid year');
                resolve(null);
              }
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(null),
          },
        },
        default: 'ok',
      }).render(true);
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
    const noteData = await this.showCreateNoteDialog(targetDate);
    if (!noteData) return;

    try {
      const note = await notesManager.createNote(noteData);
      ui.notifications?.info(`Created note: ${noteData.title}`);

      // Refresh the calendar to show the new note indicator
      this.render();

      // Emit hook for other modules
      Hooks.callAll('seasons-stars:noteCreated', note);
    } catch (error) {
      Logger.error('Failed to create note', error as Error);
      ui.notifications?.error('Failed to create note');
    }
  }

  /**
   * Show note creation dialog with enhanced category and tag support
   */
  private async showCreateNoteDialog(date: ICalendarDate): Promise<CreateNoteData | null> {
    const categories = game.seasonsStars?.categories as NoteCategories | undefined;
    if (!categories) {
      ui.notifications?.error('Note categories system not available');
      return null;
    }

    return new Promise(resolve => {
      // Ensure we have valid date values
      const safeDate = {
        year: date.year || this.viewDate.year || 2024,
        month: date.month || this.viewDate.month || 1,
        day: date.day || 1,
      };

      // Format date using calendar system
      const manager = game.seasonsStars?.manager as CalendarManagerInterface;
      const activeCalendar = manager?.getActiveCalendar();
      let dateDisplayStr = `${safeDate.year}-${safeDate.month.toString().padStart(2, '0')}-${safeDate.day.toString().padStart(2, '0')}`;
      let calendarInfo = '';

      if (activeCalendar) {
        const monthName =
          activeCalendar.months[safeDate.month - 1]?.name || `Month ${safeDate.month}`;
        const yearPrefix = activeCalendar.year?.prefix || '';
        const yearSuffix = activeCalendar.year?.suffix || '';
        dateDisplayStr = `${safeDate.day} ${monthName}, ${yearPrefix}${safeDate.year}${yearSuffix}`;
        calendarInfo = `<div style="text-align: center; margin-bottom: 16px; padding: 8px; background: rgba(0,0,0,0.1); border-radius: 4px; font-weight: 600; color: var(--color-text-dark-primary);">${dateDisplayStr}</div>`;
      }

      // Build category options from the categories system
      const availableCategories = categories.getCategories();
      const categoryOptions = availableCategories
        .map(cat => `<option value="${cat.id}">${cat.name}</option>`)
        .join('');

      // Get predefined tags for suggestions
      const predefinedTags = categories.getPredefinedTags();
      const tagSuggestions = predefinedTags
        .map(tag => `<span class="tag-suggestion" data-tag="${tag}">${tag}</span>`)
        .join(' ');

      // Get existing tags from notes for autocompletion
      const notesManager = game.seasonsStars?.notes as NotesManagerInterface;
      const existingTags = new Set<string>();
      if (notesManager && notesManager.storage) {
        try {
          // Check if getAllNotes method exists and is callable
          if (typeof notesManager.storage.getAllNotes === 'function') {
            const allNotes = notesManager.storage.getAllNotes() || [];
            allNotes.forEach(note => {
              const noteTags = note.flags?.['seasons-and-stars']?.tags || [];
              noteTags.forEach((tag: string) => existingTags.add(tag));
            });
          } else {
            // Fallback: try to get notes from game.journal if storage method unavailable
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
          // Silent fallback - just use predefined tags if existing tags can't be loaded
          Logger.debug(
            'Could not load existing tags for autocompletion, using predefined tags only',
            error
          );
        }
      }

      // Combine predefined and existing tags for autocompletion
      const allAvailableTags = Array.from(new Set([...predefinedTags, ...existingTags]));

      new Dialog({
        title: `Create Note`,
        content: `
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
          </style>
          <form class="seasons-stars-note-form">
            ${calendarInfo}
            
            <div class="form-group">
              <label>Title:</label>
              <input type="text" name="title" placeholder="Note title" autofocus />
            </div>
            
            <div class="form-group">
              <label>Content:</label>
              <textarea name="content" rows="4" placeholder="Note content"></textarea>
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
                  <input type="checkbox" name="allDay" checked />
                  All Day Event
                </label>
              </div>
            </div>
            
            <div class="form-group">
              <label>Tags (optional):</label>
              <div class="tag-autocomplete">
                <input type="text" name="tags" placeholder="Enter tags separated by commas" class="tags-input" autocomplete="off" />
                <div class="tag-autocomplete-dropdown"></div>
              </div>
              <div class="tag-suggestions">
                <small>Click to add:</small>
                ${tagSuggestions}
              </div>
            </div>
          </form>
          
          <style>
            .seasons-stars-note-form .form-row {
              display: flex;
              gap: 12px;
            }
            .seasons-stars-note-form .half-width {
              flex: 1;
            }
            .seasons-stars-note-form .category-select {
              width: 100%;
            }
            .seasons-stars-note-form .tags-input {
              width: 100%;
              margin-bottom: 5px;
            }
            .seasons-stars-note-form .tag-suggestions {
              display: flex;
              flex-wrap: wrap;
              gap: 4px;
              align-items: flex-start;
              padding-top: 2px;
            }
            .seasons-stars-note-form input[type="checkbox"] {
              margin-right: 6px;
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
            .seasons-stars-note-form .category-select option {
              padding: 4px 8px;
              line-height: 1.4;
              min-height: 20px;
            }
          </style>
        `,
        buttons: {
          create: {
            icon: '<i class="fas fa-plus"></i>',
            label: 'Create Note',
            callback: (html: JQuery) => {
              const form = html.find('form')[0] as HTMLFormElement;
              const formData = new FormData(form);

              const title = formData.get('title') as string;
              const content = formData.get('content') as string;
              const tagsString = formData.get('tags') as string;

              if (!title?.trim()) {
                ui.notifications?.error('Note title is required');
                resolve(null);
                return;
              }

              // Parse tags
              const tags = categories.parseTagString(tagsString);
              const { valid: validTags, invalid: invalidTags } = categories.validateTags(tags);

              if (invalidTags.length > 0) {
                ui.notifications?.warn(`Some tags are not allowed: ${invalidTags.join(', ')}`);
              }

              resolve({
                title: title.trim(),
                content: content || '',
                startDate: date,
                allDay: formData.has('allDay'),
                category:
                  (formData.get('category') as string) || categories.getDefaultCategory().id,
                tags: validTags,
                playerVisible: false, // Default to private
                recurring: undefined, // No recurring support for now
              });
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(null),
          },
        },
        default: 'create',
        resizable: true,
        render: (html: JQuery) => {
          // Add click handlers for tag suggestions
          html.find('.tag-suggestion').on('click', function () {
            const tag = $(this).data('tag');
            const tagsInput = html.find('input[name="tags"]');
            const currentTags = tagsInput.val() as string;

            if (currentTags) {
              tagsInput.val(currentTags + ', ' + tag);
            } else {
              tagsInput.val(tag);
            }
            tagsInput.trigger('input'); // Trigger autocompletion update
          });

          // Update category select styling based on selection
          html.find('.category-select').on('change', function () {
            const selectedCat = categories.getCategory($(this).val() as string);
            if (selectedCat) {
              $(this).css('border-left', `4px solid ${selectedCat.color}`);
            }
          });

          // Tag autocompletion functionality
          const tagsInput = html.find('input[name="tags"]');
          const autocompleteDropdown = html.find('.tag-autocomplete-dropdown');
          let selectedIndex = -1;

          // Smart tag matching function
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
            const fullText = tagsInput.val() as string;
            const beforeCursor = fullText.substring(0, cursorPos);
            const afterCursor = fullText.substring(cursorPos);

            // Find the current tag being typed
            const lastCommaIndex = beforeCursor.lastIndexOf(',');
            const currentTag = beforeCursor.substring(lastCommaIndex + 1).trim();

            return { beforeCursor, afterCursor, currentTag };
          }

          // Function to show autocomplete suggestions
          function showAutocomplete(searchTerm: string) {
            if (searchTerm.length < 1) {
              autocompleteDropdown.hide();
              return;
            }

            const matches: Array<{ tag: string; highlighted: string }> = [];

            allAvailableTags.forEach(tag => {
              const result = matchTag(searchTerm, tag);
              if (result.matches) {
                matches.push({ tag, highlighted: result.highlighted });
              }
            });

            if (matches.length === 0) {
              autocompleteDropdown.hide();
              return;
            }

            // Limit to top 8 matches
            const topMatches = matches.slice(0, 8);

            const dropdownHtml = topMatches
              .map(
                (match, index) =>
                  `<div class="tag-autocomplete-item" data-tag="${match.tag}" data-index="${index}">${match.highlighted}</div>`
              )
              .join('');

            autocompleteDropdown.html(dropdownHtml).show();
            selectedIndex = -1;
          }

          // Function to insert selected tag
          function insertTag(tagToInsert: string) {
            const context = getCurrentTypingContext();
            const beforeCurrentTag = context.beforeCursor.substring(
              0,
              context.beforeCursor.lastIndexOf(',') + 1
            );
            const newValue =
              (beforeCurrentTag ? beforeCurrentTag + ' ' : '') +
              tagToInsert +
              (context.afterCursor.startsWith(',') ? '' : ', ') +
              context.afterCursor;

            tagsInput.val(newValue.replace(/,\\s*$/, '')); // Remove trailing comma
            autocompleteDropdown.hide();
            tagsInput.focus();
          }

          // Input event for autocompletion
          tagsInput.on('input', function () {
            const context = getCurrentTypingContext();
            showAutocomplete(context.currentTag);
          });

          // Keyboard navigation
          tagsInput.on('keydown', function (e) {
            const dropdown = autocompleteDropdown;
            const items = dropdown.find('.tag-autocomplete-item');

            if (!dropdown.is(':visible') || items.length === 0) return;

            switch (e.keyCode) {
              case 38: // Up arrow
                e.preventDefault();
                selectedIndex = selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1;
                break;
              case 40: // Down arrow
                e.preventDefault();
                selectedIndex = selectedIndex >= items.length - 1 ? 0 : selectedIndex + 1;
                break;
              case 13: // Enter
                e.preventDefault();
                if (selectedIndex >= 0) {
                  const selectedTag = items.eq(selectedIndex).data('tag');
                  insertTag(selectedTag);
                }
                return;
              case 27: // Escape
                dropdown.hide();
                return;
            }

            // Update visual selection
            items.removeClass('selected');
            if (selectedIndex >= 0) {
              items.eq(selectedIndex).addClass('selected');
            }
          });

          // Click handlers for autocomplete items
          autocompleteDropdown.on('click', '.tag-autocomplete-item', function () {
            const tagToInsert = $(this).data('tag');
            insertTag(tagToInsert);
          });

          // Hide dropdown when clicking outside
          $(document).on('click', function (e) {
            if (!$(e.target).closest('.tag-autocomplete').length) {
              autocompleteDropdown.hide();
            }
          });

          // Trigger initial styling
          html.find('.category-select').trigger('change');
        },
      }).render(true);
    });
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
        const cleanPreview = preview.replace(/<[^>]*>/g, '').trim() || 'No content';

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

    return new Promise(resolve => {
      new Dialog({
        title: `Notes for ${dateDisplayStr}`,
        content: `
          <style>
            .notes-selection {
              max-width: 500px;
            }
            .note-item {
              border: 1px solid var(--color-border-light);
              border-radius: 4px;
              padding: 10px;
              margin-bottom: 8px;
              cursor: pointer;
              transition: background-color 0.2s ease;
              background: rgba(255, 255, 255, 0.02);
            }
            .note-item:hover {
              background: rgba(255, 255, 255, 0.08);
              border-color: var(--color-border-highlight);
            }
            .note-item:last-child {
              margin-bottom: 0;
            }
            .note-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 4px;
            }
            .note-category {
              font-size: 11px;
              background: var(--color-bg-btn);
              padding: 2px 6px;
              border-radius: 3px;
              color: var(--color-text-light-heading);
            }
            .note-preview {
              font-size: 12px;
              color: var(--color-text-dark-secondary);
              font-style: italic;
            }
          </style>
          <div class="notes-selection">
            <p>Select a note to view/edit:</p>
            ${notesList}
          </div>
        `,
        buttons: {
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(),
          },
        },
        default: 'cancel',
        render: (html: JQuery) => {
          // Add click handlers for note items
          html.find('.note-item').on('click', function () {
            const noteIndex = parseInt($(this).data('index'));
            const note = notes[noteIndex];
            if (note && note.sheet) {
              (note.sheet as any).render(true);
            }
            resolve();
          });
        },
      }).render(true);
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
    // Check if button already exists
    const existingButton = this.sidebarButtons.find(btn => btn.name === name);
    if (existingButton) {
      Logger.debug(`Button "${name}" already exists in grid widget`);
      return;
    }

    // Add to buttons array
    this.sidebarButtons.push({ name, icon, tooltip, callback });
    Logger.debug(`Added sidebar button "${name}" to grid widget`);

    // If widget is rendered, add button to DOM immediately
    if (this.rendered && this.element) {
      this.renderSidebarButton(name, icon, tooltip, callback);
    }
  }

  /**
   * Render a sidebar button in the grid widget header
   */
  private renderSidebarButton(
    name: string,
    icon: string,
    tooltip: string,
    callback: Function
  ): void {
    if (!this.element) return;

    const buttonId = `grid-sidebar-btn-${name.toLowerCase().replace(/\s+/g, '-')}`;

    // Don't add if already exists in DOM
    if (this.element.querySelector(`#${buttonId}`)) {
      return;
    }

    // Find window controls area in header
    let windowControls = this.element.querySelector(
      '.window-header .window-controls'
    ) as HTMLElement;
    if (!windowControls) {
      // Try to find window header and add controls area
      const windowHeader = this.element.querySelector('.window-header');
      if (windowHeader) {
        windowControls = document.createElement('div');
        windowControls.className = 'window-controls';
        windowControls.style.cssText = 'display: flex; align-items: center; margin-left: auto;';
        windowHeader.appendChild(windowControls);
      } else {
        Logger.warn('No window header found for grid widget sidebar button');
        return;
      }
    }

    // Create button element
    const button = document.createElement('button');
    button.id = buttonId;
    button.className = 'grid-sidebar-button';
    button.title = tooltip;
    button.innerHTML = `<i class="fas ${icon}"></i>`;
    button.style.cssText = `
      background: var(--color-bg-btn, #f0f0f0);
      border: 1px solid var(--color-border-dark, #999);
      border-radius: 3px;
      padding: 4px 6px;
      margin-left: 4px;
      cursor: pointer;
      font-size: 12px;
      color: var(--color-text-primary, #000);
      transition: background-color 0.15s ease;
    `;

    // Add click handler
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      try {
        callback();
      } catch (error) {
        Logger.error(`Error in grid widget sidebar button "${name}"`, error as Error);
      }
    });

    // Add hover effects
    button.addEventListener('mouseenter', () => {
      button.style.background = 'var(--color-bg-btn-hover, #e0e0e0)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.background = 'var(--color-bg-btn, #f0f0f0)';
    });

    windowControls.appendChild(button);
    Logger.debug(`Rendered sidebar button "${name}" in grid widget header`);
  }

  /**
   * Render all existing sidebar buttons (called after widget render)
   */
  private renderExistingSidebarButtons(): void {
    this.sidebarButtons.forEach(button => {
      this.renderSidebarButton(button.name, button.icon, button.tooltip, button.callback);
    });
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
