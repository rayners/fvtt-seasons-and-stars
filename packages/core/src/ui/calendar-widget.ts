/**
 * Calendar Widget - Compact date/time display for Seasons & Stars
 */

import { CalendarLocalization } from '../core/calendar-localization';
import { CalendarSelectionDialog } from './calendar-selection-dialog';
import { CalendarWidgetManager } from './widget-manager';
import { Logger } from '../core/logger';
import { TimeAdvancementService } from '../core/time-advancement-service';
import { SidebarButtonRegistry } from './sidebar-button-registry';
import { loadButtonsFromRegistry } from './sidebar-button-mixin';
import { MOON_PHASE_ICON_MAP, sanitizeColor } from '../core/constants';
import type { CalendarManagerInterface } from '../types/foundry-extensions';
import type { MoonPhaseInfo } from '../types/calendar';
import type { MainWidgetContext } from '../types/widget-types';

export class CalendarWidget extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  private updateInterval: number | null = null;
  private static activeInstance: CalendarWidget | null = null;
  private lastRenderContext?: MainWidgetContext;

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
      width: 320,
      height: 'auto' as const,
    },
    actions: {
      openCalendarSelection: CalendarWidget.prototype._onOpenCalendarSelection,
      openDetailedView: CalendarWidget.prototype._onOpenDetailedView,
      advanceDate: CalendarWidget.prototype._onAdvanceDate,
      clickSidebarButton: CalendarWidget.prototype._onClickSidebarButton,
      switchToMini: CalendarWidget.prototype._onSwitchToMini,
      switchToGrid: CalendarWidget.prototype._onSwitchToGrid,
      toggleTimeAdvancement: CalendarWidget.prototype._onToggleTimeAdvancement,
    },
  };

  static PARTS = {
    main: {
      id: 'main',
      template: 'modules/seasons-and-stars/templates/calendar-widget.hbs',
    },
    moonPhases: {
      id: 'moon-phases',
      template: 'modules/seasons-and-stars/templates/calendar-widget-moon-phases.hbs',
    },
    sidebar: {
      id: 'sidebar',
      template: 'modules/seasons-and-stars/templates/calendar-widget-sidebar.hbs',
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
        canAdvanceTime: false,
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
    let timeAdvancementStatus = 'Paused';
    let pauseOnCombat = true;
    let resumeAfterCombat = false;
    let playPauseButtonClass = '';
    let playPauseButtonIcon = 'fa-play';
    let playPauseButtonText = 'Play';

    if (game.user?.isGM) {
      try {
        const timeService = TimeAdvancementService.getInstance();
        timeAdvancementActive = timeService?.isActive || false;

        const ratio = game.settings?.get('seasons-and-stars', 'timeAdvancementRatio') || 1.0;
        advancementRatioDisplay = `${ratio.toFixed(1)}x speed`;

        // Get settings
        pauseOnCombat = game.settings?.get('seasons-and-stars', 'pauseOnCombat') || true;
        resumeAfterCombat = game.settings?.get('seasons-and-stars', 'resumeAfterCombat') || false;

        // Set status and button state based on advancement activity
        if (timeAdvancementActive) {
          timeAdvancementStatus = 'Active';
          playPauseButtonClass = 'active';
          playPauseButtonIcon = 'fa-pause';
          playPauseButtonText = 'Pause';
        } else {
          timeAdvancementStatus = 'Paused';
          playPauseButtonClass = '';
          playPauseButtonIcon = 'fa-play';
          playPauseButtonText = 'Play';
        }
      } catch (error) {
        Logger.warn('Failed to get time advancement state', error);
      }
    }

    // Get moon phase data
    let moonPhases: Array<{
      moonName: string;
      phaseName: string;
      phaseIcon: string;
      faIcon: string;
      moonColor?: string;
      moonColorIndex: number;
    }> = [];

    try {
      const engine = manager.getActiveEngine();
      if (engine) {
        const moonPhaseInfo = engine.getMoonPhaseInfo(currentDate);
        if (moonPhaseInfo && moonPhaseInfo.length > 0) {
          moonPhases = moonPhaseInfo.map((info: MoonPhaseInfo, index: number) => {
            const faIcon = MOON_PHASE_ICON_MAP[info.phase.icon];
            if (!faIcon) {
              Logger.warn(
                `Unknown moon phase icon '${info.phase.icon}' for moon '${info.moon.name}', using fallback`
              );
            }
            return {
              moonName: info.moon.name,
              phaseName: info.phase.name,
              phaseIcon: info.phase.icon,
              phaseIconUrl: info.phase.iconUrl,
              faIcon: faIcon || 'circle',
              moonColor: sanitizeColor(info.moon.color),
              moonColorIndex: index,
            };
          });
        }
      }
    } catch (error) {
      Logger.debug('Failed to get moon phase data for calendar widget', error);
    }

    const mainContext = Object.assign(context, {
      calendar: calendarInfo,
      currentDate: currentDate.toObject(),
      formattedDate: currentDate.toLongString(),
      shortDate: currentDate.toDateString(),
      timeString: currentDate.toTimeString(),
      isGM: game.user?.isGM || false,
      canAdvanceTime: game.user?.isGM || false,
      hasSmallTime: hasSmallTime,
      showTimeControls: (!hasSmallTime || alwaysShowQuickTimeButtons) && (game.user?.isGM || false),
      // Time advancement context
      timeAdvancementActive: timeAdvancementActive,
      advancementRatioDisplay: advancementRatioDisplay,
      timeAdvancementStatus: timeAdvancementStatus,
      showTimeAdvancementSection: game.user?.isGM || false,
      // Time advancement settings
      pauseOnCombat: pauseOnCombat,
      resumeAfterCombat: resumeAfterCombat,
      // Button states and styling
      playPauseButtonClass: playPauseButtonClass,
      playPauseButtonIcon: playPauseButtonIcon,
      playPauseButtonText: playPauseButtonText,
      // Moon phase data
      moonPhases: moonPhases,
    }) as MainWidgetContext;

    // Cache context for use in _attachPartListeners
    this.lastRenderContext = mainContext;

    return mainContext;
  }

  /**
   * Prepare context for specific parts (sidebar loads buttons from registry)
   */
  async _preparePartContext(
    partId: string,
    context: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const baseContext = await super._preparePartContext!(partId, context);

    if (partId === 'sidebar') {
      const buttons = loadButtonsFromRegistry('main');
      return { ...baseContext, sidebarButtons: buttons };
    }

    return baseContext;
  }

  /**
   * Apply moon phase colors safely via DOM manipulation
   * Prevents XSS by injecting CSS custom properties through TypeScript instead of templates
   * Supports unlimited moons by applying colors directly to elements
   */
  private applyMoonPhaseColors(context: MainWidgetContext): void {
    if (!this.element || !context.moonPhases) return;

    const container = this.element.querySelector('.moon-phases') as HTMLElement;
    if (!container) return;

    // Set moon count for gap calculation
    container.style.setProperty('--moon-count', context.moonPhases.length.toString());

    // Apply color to each moon phase element directly (supports unlimited moons)
    context.moonPhases.forEach((moon, index: number) => {
      const element = container.querySelector(
        `.moon-phase[data-moon-index="${index}"]`
      ) as HTMLElement;
      if (element && moon.moonColor) {
        element.style.color = moon.moonColor;
      }
    });
  }

  /**
   * Attach event listeners to rendered parts
   */
  _attachPartListeners(partId: string, htmlElement: HTMLElement, options: any): void {
    super._attachPartListeners(partId, htmlElement, options);

    // Register this as the active instance
    CalendarWidget.activeInstance = this;

    // Apply moon phase colors safely if rendering moon phases part
    if (partId === 'moonPhases' && this.lastRenderContext) {
      this.applyMoonPhaseColors(this.lastRenderContext);
    }

    // Start auto-update after rendering
    this.startAutoUpdate();
  }

  /**
   * Instance action handler for opening calendar selection dialog
   */
  async _onOpenCalendarSelection(event: Event, _target: HTMLElement): Promise<void> {
    event.preventDefault();
    if (!game.user?.isGM) {
      return;
    }
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

    if (!game.user?.isGM) {
      ui.notifications?.warn('Only GMs can advance time');
      return;
    }

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
   * Handle sidebar button clicks
   */
  async _onClickSidebarButton(event: Event, target: HTMLElement): Promise<void> {
    event.preventDefault();

    const buttonName = target.dataset.buttonName;
    if (!buttonName) {
      Logger.warn('Sidebar button clicked without button name');
      return;
    }

    // Find the button in registry and execute its callback
    const registry = SidebarButtonRegistry.getInstance();
    const buttons = registry.getForWidget('main');
    const button = buttons.find(btn => btn.name === buttonName);

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

    if (!game.user?.isGM) {
      ui.notifications?.warn('Only GMs can control time advancement');
      return;
    }

    try {
      const service = TimeAdvancementService.getInstance();
      if (!service) {
        ui.notifications?.error('Time advancement service not available');
        return;
      }

      // Fix for issue #312: Use isActive instead of shouldShowPauseButton for toggle logic
      // shouldShowPauseButton is for UI display, not toggle decisions
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
   * Handle ratio setting changes from external sources
   */
  _onRatioSettingChanged(newRatio: number): void {
    try {
      const service = TimeAdvancementService.getInstance();
      if (service) {
        service.updateRatio(newRatio);
        Logger.info(`Main widget: Updated time advancement ratio to ${newRatio}`);
      }
    } catch (error) {
      Logger.error('Failed to update time advancement ratio', error as Error);
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

    // Update widget when combat state changes (affects time advancement button state)
    Hooks.on('combatStart', () => {
      if (CalendarWidget.activeInstance?.rendered) {
        CalendarWidget.activeInstance.render();
      }
    });

    Hooks.on('deleteCombat', () => {
      if (CalendarWidget.activeInstance?.rendered) {
        CalendarWidget.activeInstance.render();
      }
    });

    // Update widget when settings change (especially quick time buttons)
    Hooks.on('seasons-stars:settingsChanged', (settingName: string) => {
      if (
        (settingName === 'quickTimeButtons' ||
          settingName === 'miniWidgetQuickTimeButtons' ||
          settingName === 'alwaysShowQuickTimeButtons') &&
        CalendarWidget.activeInstance?.rendered
      ) {
        CalendarWidget.activeInstance.render();
      }
    });

    // Update sidebar when registry buttons change (partial render for performance)
    Hooks.on('seasons-stars:widgetButtonsChanged', () => {
      if (CalendarWidget.activeInstance?.rendered) {
        (CalendarWidget.activeInstance as any).render({ parts: ['sidebar'] });
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
}
