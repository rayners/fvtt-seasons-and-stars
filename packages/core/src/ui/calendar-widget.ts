/**
 * Calendar Widget - Compact date/time display for Seasons & Stars
 */

import { CalendarLocalization } from '../core/calendar-localization';
import { CalendarSelectionDialog } from './calendar-selection-dialog';
import { CalendarWidgetManager } from './widget-manager';
import { Logger } from '../core/logger';
import { TimeAdvancementService } from '../core/time-advancement-service';
import type { CalendarManagerInterface } from '../types/foundry-extensions';

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
      toggleTimeAdvancement: CalendarWidget.prototype._onToggleTimeAdvancement,
      openAdvancementSettings: CalendarWidget.prototype._onOpenAdvancementSettings,
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
  async _prepareContext(options = {}): Promise<any> {
    const context = await super._prepareContext(options);

    const manager = game.seasonsStars?.manager as CalendarManagerInterface;

    if (!manager) {
      return Object.assign(context, {
        error: 'Calendar manager not initialized',
        calendar: null,
        currentDate: null,
        formattedDate: 'Not Available',
      });
    }

    const activeCalendar = manager.getActiveCalendar();
    const currentDate = manager.getCurrentDate();

    if (!activeCalendar || !currentDate) {
      return Object.assign(context, {
        error: 'No active calendar',
        calendar: null,
        currentDate: null,
        formattedDate: 'No Calendar Active',
      });
    }

    const calendarInfo = CalendarLocalization.getLocalizedCalendarInfo(activeCalendar);

    // Check if SmallTime is available and active
    const hasSmallTime = this.detectSmallTime();

    // Check the always show quick time buttons setting
    const alwaysShowQuickTimeButtons =
      game.settings?.get('seasons-and-stars', 'alwaysShowQuickTimeButtons') || false;

    // Get time advancement state for GM users
    let timeAdvancementActive = false;
    let advancementRatioDisplay = '1.0x speed';
    
    if (game.user?.isGM) {
      try {
        const timeService = TimeAdvancementService.getInstance();
        timeAdvancementActive = timeService?.isActive || false;
        
        const ratio = game.settings?.get('seasons-and-stars', 'timeAdvancementRatio') || 1.0;
        advancementRatioDisplay = `${ratio}x speed`;
      } catch (error) {
        Logger.warn('Failed to get time advancement state', error);
      }
    }

    return Object.assign(context, {
      calendar: calendarInfo,
      currentDate: currentDate.toObject(),
      formattedDate: currentDate.toLongString(),
      shortDate: currentDate.toDateString(),
      timeString: currentDate.toTimeString(),
      isGM: game.user?.isGM || false,
      canAdvanceTime: game.user?.isGM || false,
      hasSmallTime: hasSmallTime,
      showTimeControls: (!hasSmallTime || alwaysShowQuickTimeButtons) && (game.user?.isGM || false),
      timeAdvancementActive: timeAdvancementActive,
      advancementRatioDisplay: advancementRatioDisplay,
      sidebarButtons: this.sidebarButtons, // Include sidebar buttons for template
    });
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
   * Handle toggling time advancement on/off
   */
  async _onToggleTimeAdvancement(event: Event, _target?: HTMLElement): Promise<void> {
    event.preventDefault();

    try {
      const service = TimeAdvancementService.getInstance();
      if (!service) {
        ui.notifications?.error('Time advancement service not available');
        return;
      }

      if (service.isActive) {
        service.pause();
        Logger.info('Main widget: Paused time advancement');
      } else {
        await service.play();
        Logger.info('Main widget: Started time advancement');
      }

      // Re-render to update button state
      this.render();
    } catch (error) {
      ui.notifications?.error('Failed to toggle time advancement');
      Logger.error('Main widget time advancement toggle failed', error as Error);
    }
  }

  /**
   * Handle opening time advancement settings dialog
   */
  async _onOpenAdvancementSettings(event: Event, _target?: HTMLElement): Promise<void> {
    event.preventDefault();

    try {
      // TODO: Implement proper settings dialog
      // For now, show a simple notification
      const ratio = game.settings?.get('seasons-and-stars', 'timeAdvancementRatio') || 1.0;
      const pauseOnCombat = game.settings?.get('seasons-and-stars', 'pauseOnCombat') || true;
      const resumeAfterCombat = game.settings?.get('seasons-and-stars', 'resumeAfterCombat') || false;
      
      const message = `Current Settings:\nRatio: ${ratio}x speed\nPause on Combat: ${pauseOnCombat ? 'Yes' : 'No'}\nResume after Combat: ${resumeAfterCombat ? 'Yes' : 'No'}\n\nUse module configuration to change settings.`;
      ui.notifications?.info(message);
      
      Logger.info('Main widget: Opened time advancement settings');
    } catch (error) {
      ui.notifications?.error('Failed to open settings');
      Logger.error('Main widget settings dialog failed', error as Error);
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
      if (
        (settingName === 'quickTimeButtons' || settingName === 'alwaysShowQuickTimeButtons') &&
        CalendarWidget.activeInstance?.rendered
      ) {
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
