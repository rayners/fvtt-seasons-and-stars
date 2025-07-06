/**
 * Calendar Widget - Compact date/time display for Seasons & Stars
 */

import { CalendarLocalization } from '../core/calendar-localization';
import { CalendarSelectionDialog } from './calendar-selection-dialog';
import { CalendarWidgetManager } from './widget-manager';
import { Logger } from '../core/logger';
import { DateFormatter } from '../core/date-formatter';
import { CalendarDate } from '../core/calendar-date';
import { TemplateContextExtensions } from '../core/template-context-extensions';
import type { CalendarManagerInterface } from '../types/foundry-extensions';
import type { MainWidgetContext } from '../types/widget-types';

export class CalendarWidget extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  private updateInterval: number | null = null;
  private static activeInstance: CalendarWidget | null = null;
  private sidebarButtons: Array<{
    name: string;
    icon: string;
    tooltip: string;
    callback: Function;
  }> = [];

  static DEFAULT_OPTIONS = {
    id: 'seasons-stars-widget',
    classes: ['seasons-stars', 'calendar-widget'],
    tag: 'div',
    window: {
      frame: true,
      positioned: true,
      title: 'SEASONS_STARS.calendar.current_date',
      icon: 'fa-solid fa-calendar-alt',
      minimizable: false,
      resizable: false,
    },
    position: {
      width: 280,
      height: 'auto' as const,
    },
    actions: {
      openCalendarSelection: CalendarWidget.prototype._onOpenCalendarSelection,
      openDetailedView: CalendarWidget.prototype._onOpenDetailedView,
      advanceDate: CalendarWidget.prototype._onAdvanceDate,
      openBulkAdvance: CalendarWidget.prototype._onOpenBulkAdvance,
      clickSidebarButton: CalendarWidget.prototype._onClickSidebarButton,
      switchToMini: CalendarWidget.prototype._onSwitchToMini,
      switchToGrid: CalendarWidget.prototype._onSwitchToGrid,
    },
  };

  static PARTS = {
    main: {
      id: 'main',
      template: 'modules/seasons-and-stars/templates/calendar-widget.hbs',
    },
  };

  /**
   * Prepare rendering context for template
   */
  async _prepareContext(options = {}): Promise<MainWidgetContext> {
    const baseContext = await super._prepareContext(options);

    const manager = game.seasonsStars?.manager as CalendarManagerInterface;

    if (!manager) {
      const errorContext: MainWidgetContext = Object.assign(baseContext, {
        error: 'Calendar manager not initialized',
        calendar: null,
        currentDate: null,
        formattedDate: 'Not Available',
        shortDate: 'Not Available',
        timeString: 'Not Available',
        isGM: game.user?.isGM || false,
        canAdvanceTime: false,
        hasSmallTime: false,
        sidebarButtons: this.sidebarButtons,
      });

      // Process through extensions even for error states
      return await TemplateContextExtensions.processContext(errorContext, 'main', options);
    }

    const activeCalendar = manager.getActiveCalendar();
    const currentDate = manager.getCurrentDate();

    if (!activeCalendar || !currentDate) {
      const errorContext: MainWidgetContext = Object.assign(baseContext, {
        error: 'No active calendar',
        calendar: null,
        currentDate: null,
        formattedDate: 'No Calendar Active',
        shortDate: 'No Calendar Active',
        timeString: 'No Calendar Active',
        isGM: game.user?.isGM || false,
        canAdvanceTime: false,
        hasSmallTime: false,
        sidebarButtons: this.sidebarButtons,
      });

      // Process through extensions even for error states
      return await TemplateContextExtensions.processContext(errorContext, 'main', options);
    }

    const calendarInfo = CalendarLocalization.getLocalizedCalendarInfo(activeCalendar);

    // Check if SmallTime is available and active
    const hasSmallTime = this.detectSmallTime();

    // Use DateFormatter with widget-specific formats
    const formatter = new DateFormatter(activeCalendar);

    const context: MainWidgetContext = Object.assign(baseContext, {
      calendar: calendarInfo,
      currentDate: currentDate.toObject(),
      formattedDate:
        formatter.formatWidget(currentDate as CalendarDate, 'main') || currentDate.toLongString(),
      shortDate:
        formatter.formatNamed(currentDate as CalendarDate, 'date') || currentDate.toDateString(),
      timeString:
        formatter.formatNamed(currentDate as CalendarDate, 'time') || currentDate.toTimeString(),
      isGM: game.user?.isGM || false,
      canAdvanceTime: game.user?.isGM || false,
      hasSmallTime: hasSmallTime,
      showTimeControls: !hasSmallTime, // Only show time controls if SmallTime is not available
      sidebarButtons: this.sidebarButtons, // Include sidebar buttons for template
    });

    // Process context through extensions system
    return await TemplateContextExtensions.processContext(context, 'main', options);
  }

  /**
   * Attach event listeners to rendered parts
   */
  _attachPartListeners(partId: string, htmlElement: HTMLElement, options: any): void {
    super._attachPartListeners(partId, htmlElement, options);

    // Register this as the active instance
    CalendarWidget.activeInstance = this;

    // Start auto-update after rendering
    this.startAutoUpdate();
  }

  /**
   * Instance action handler for opening calendar selection dialog
   */
  async _onOpenCalendarSelection(event: Event, _target: HTMLElement): Promise<void> {
    event.preventDefault();
    CalendarSelectionDialog.show();
  }

  /**
   * Instance action handler for opening detailed view dialog
   */
  async _onOpenDetailedView(event: Event, _target: HTMLElement): Promise<void> {
    event.preventDefault();

    const manager = game.seasonsStars?.manager as CalendarManagerInterface;
    if (!manager) {
      ui.notifications?.error('Calendar manager not available');
      return;
    }

    // Open the calendar grid widget
    CalendarWidgetManager.showWidget('grid');
  }

  /**
   * Instance action handler for date advancement
   */
  async _onAdvanceDate(event: Event, target: HTMLElement): Promise<void> {
    event.preventDefault();

    const amount = parseInt(target.dataset.amount || '0');
    const unit = target.dataset.unit || 'days';

    const manager = game.seasonsStars?.manager as CalendarManagerInterface;
    if (!manager) return;

    Logger.info(`Advancing date: ${amount} ${unit}`);

    try {
      switch (unit) {
        case 'minutes':
          await manager.advanceMinutes(amount);
          break;
        case 'hours':
          await manager.advanceHours(amount);
          break;
        case 'days':
          await manager.advanceDays(amount);
          break;
        case 'weeks':
          await manager.advanceWeeks(amount);
          break;
        case 'months':
          await manager.advanceMonths(amount);
          break;
        case 'years':
          await manager.advanceYears(amount);
          break;
        default:
          Logger.warn(`Unknown date unit: ${unit}`);
          return;
      }

      // Show success notification for larger advances
      if (
        (unit === 'weeks' && amount >= 2) ||
        (unit === 'months' && amount >= 1) ||
        (unit === 'years' && amount >= 1)
      ) {
        ui.notifications?.info(`Time advanced by ${amount} ${unit}`);
      }
    } catch (error) {
      Logger.error('Error advancing date', error as Error);
      ui.notifications?.error('Failed to advance date');
    }
  }

  /**
   * Instance action handler for opening bulk advance dialog
   */
  async _onOpenBulkAdvance(event: Event, _target: HTMLElement): Promise<void> {
    event.preventDefault();

    // Show placeholder for now - will implement proper dialog later
    ui.notifications?.info('Bulk time advancement coming soon!');
  }

  /**
   * Handle sidebar button clicks
   */
  async _onClickSidebarButton(event: Event, target: HTMLElement): Promise<void> {
    event.preventDefault();

    const buttonName = target.dataset.buttonName;
    if (!buttonName) {
      Logger.warn('Sidebar button clicked without button name');
      return;
    }

    // Find the button in our array and execute its callback
    const button = this.sidebarButtons.find(btn => btn.name === buttonName);
    if (button && typeof button.callback === 'function') {
      try {
        button.callback();
      } catch (error) {
        Logger.error(`Error executing sidebar button "${buttonName}" callback`, error as Error);
      }
    } else {
      Logger.warn(`Sidebar button "${buttonName}" not found or has invalid callback`);
    }
  }

  /**
   * Switch to mini widget
   */
  async _onSwitchToMini(event: Event, _target: HTMLElement): Promise<void> {
    event.preventDefault();
    Logger.debug('Switching from main widget to mini widget');

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

  /**
   * Switch to grid widget
   */
  async _onSwitchToGrid(event: Event, _target: HTMLElement): Promise<void> {
    event.preventDefault();
    Logger.debug('Switching from main widget to grid widget');

    try {
      // Close current widget
      this.close();
      // Open grid widget
      CalendarWidgetManager.showWidget('grid');
    } catch (error) {
      Logger.error(
        'Failed to switch to grid widget',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Detect if SmallTime module is available and active
   */
  private detectSmallTime(): boolean {
    // Check if SmallTime module is installed and enabled
    const smallTimeModule = game.modules?.get('smalltime');
    if (!smallTimeModule?.active) {
      return false;
    }

    // Check if SmallTime UI elements are present in the DOM
    const selectors = [
      '#smalltime-app',
      '.smalltime-app',
      '#timeDisplay',
      '#slideContainer',
      '[id*="smalltime"]',
      '.form:has(#timeDisplay)',
    ];

    for (const selector of selectors) {
      try {
        if (document.querySelector(selector)) {
          return true;
        }
      } catch {
        // Skip invalid selectors
        continue;
      }
    }

    return false;
  }

  /**
   * Start automatic updates
   */
  private startAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Update every 30 seconds
    this.updateInterval = window.setInterval(() => {
      if (this.rendered) {
        this.render();
      }
    }, 30000);
  }

  /**
   * Stop automatic updates
   */
  private stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Handle closing the widget
   */
  async close(options: any = {}): Promise<this> {
    this.stopAutoUpdate();

    // Clear active instance if this is it
    if (CalendarWidget.activeInstance === this) {
      CalendarWidget.activeInstance = null;
    }

    return super.close(options);
  }

  /**
   * Handle Foundry hooks for real-time updates
   */
  static registerHooks(): void {
    // Update widget when time changes
    Hooks.on('seasons-stars:dateChanged', () => {
      if (CalendarWidget.activeInstance?.rendered) {
        CalendarWidget.activeInstance.render();
      }
    });

    // Update widget when calendar changes
    Hooks.on('seasons-stars:calendarChanged', () => {
      if (CalendarWidget.activeInstance?.rendered) {
        CalendarWidget.activeInstance.render();
      }
    });

    // Update widget when settings change (especially quick time buttons)
    Hooks.on('seasons-stars:settingsChanged', (settingName: string) => {
      if (settingName === 'quickTimeButtons' && CalendarWidget.activeInstance?.rendered) {
        CalendarWidget.activeInstance.render();
      }
    });
  }

  /**
   * Toggle widget visibility
   */
  static toggle(): void {
    if (CalendarWidget.activeInstance) {
      if (CalendarWidget.activeInstance.rendered) {
        CalendarWidget.activeInstance.close();
      } else {
        CalendarWidget.activeInstance.render(true);
      }
    } else {
      new CalendarWidget().render(true);
    }
  }

  /**
   * Show the widget
   */
  static show(): void {
    if (CalendarWidget.activeInstance) {
      if (!CalendarWidget.activeInstance.rendered) {
        CalendarWidget.activeInstance.render(true);
      }
    } else {
      new CalendarWidget().render(true);
    }
  }

  /**
   * Hide the widget
   */
  static hide(): void {
    if (CalendarWidget.activeInstance?.rendered) {
      CalendarWidget.activeInstance.close();
    }
  }

  /**
   * Get the current widget instance
   */
  static getInstance(): CalendarWidget | null {
    return CalendarWidget.activeInstance;
  }

  /**
   * Add a sidebar button for integration with other modules (like Simple Weather)
   */
  addSidebarButton(name: string, icon: string, tooltip: string, callback: Function): void {
    // Check if button already exists
    const existingButton = this.sidebarButtons.find(btn => btn.name === name);
    if (existingButton) {
      Logger.debug(`Button "${name}" already exists in widget`);
      return;
    }

    // Store the button
    this.sidebarButtons.push({ name, icon, tooltip, callback });

    // If rendered, re-render to include the new button
    if (this.rendered) {
      this.render();
    }
  }

  /**
   * Remove a sidebar button by name
   */
  removeSidebarButton(name: string): void {
    const index = this.sidebarButtons.findIndex(btn => btn.name === name);
    if (index !== -1) {
      this.sidebarButtons.splice(index, 1);

      // Re-render to remove the button
      if (this.rendered) {
        this.render();
      }
    }
  }

  /**
   * Check if a sidebar button exists
   */
  hasSidebarButton(name: string): boolean {
    return this.sidebarButtons.some(btn => btn.name === name);
  }
}
