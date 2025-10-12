/**
 * Calendar Mini Widget - Compact date display that pairs with SmallTime
 */

import { CalendarWidgetManager } from './widget-manager';
import { Logger } from '../core/logger';
import { SmallTimeUtils } from './base-widget-manager';
import { WIDGET_POSITIONING, MOON_PHASE_ICON_MAP, sanitizeColor } from '../core/constants';
import { TimeAdvancementService } from '../core/time-advancement-service';
import { DateFormatter } from '../core/date-formatter';
import { SidebarButtonRegistry } from './sidebar-button-registry';
import {
  addSidebarButton as registerSidebarButton,
  removeSidebarButton as unregisterSidebarButton,
  hasSidebarButton as registryHasSidebarButton,
  loadButtonsFromRegistry,
} from './sidebar-button-mixin';
import type { MiniWidgetContext, WidgetRenderOptions } from '../types/widget-types';
import type { CalendarManagerInterface } from '../types/foundry-extensions';
import type { MoonPhaseInfo } from '../types/calendar';

export class CalendarMiniWidget extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  private static activeInstance: CalendarMiniWidget | null = null;
  private isClosing: boolean = false;
  private hasBeenPositioned: boolean = false;

  constructor(options: any = {}) {
    // Check if widget is pinned and get saved position
    const pinned = game.settings?.get('seasons-and-stars', 'miniWidgetPinned');
    const pos = game.settings?.get('seasons-and-stars', 'miniWidgetPosition') as
      | { top: number; left: number }
      | undefined;

    // If pinned and we have a valid position, apply it to options
    if (
      pinned &&
      pos &&
      typeof pos.top === 'number' &&
      typeof pos.left === 'number' &&
      Number.isFinite(pos.top) &&
      Number.isFinite(pos.left)
    ) {
      options = (foundry.utils as any).mergeObject(options, {
        position: {
          top: pos.top,
          left: pos.left,
        },
      });
    }

    super(options);
  }

  static DEFAULT_OPTIONS = {
    id: 'seasons-stars-mini-widget',
    classes: ['seasons-stars', 'calendar-mini-widget'],
    tag: 'div',
    window: {
      frame: false,
      positioned: true,
      minimizable: false,
      resizable: false,
    },
    position: {
      width: WIDGET_POSITIONING.MINI_WIDGET_WIDTH,
      height: 'auto' as const,
      top: 100, // Start within viewport
      left: 20,
    },
    actions: {
      advanceTime: CalendarMiniWidget.prototype._onAdvanceTime,
      openCalendarSelection: CalendarMiniWidget.prototype._onOpenCalendarSelection,
      openLargerView: CalendarMiniWidget.prototype._onOpenLargerView,
      toggleTimeAdvancement: CalendarMiniWidget.prototype._onToggleTimeAdvancement,
      clickSidebarButton: CalendarMiniWidget.prototype._onClickSidebarButton,
    },
  };

  static PARTS = {
    main: {
      id: 'main',
      template: 'modules/seasons-and-stars/templates/calendar-mini-widget.hbs',
    },
    moonPhases: {
      id: 'moon-phases',
      template: 'modules/seasons-and-stars/templates/calendar-mini-widget-moon-phases.hbs',
    },
  };

  /**
   * Prepare rendering context for template
   */
  async _prepareContext(options: WidgetRenderOptions = {}): Promise<MiniWidgetContext> {
    const context = (await super._prepareContext(options)) as Record<string, unknown>;

    const manager = game.seasonsStars?.manager as CalendarManagerInterface;

    if (!manager) {
      return Object.assign(context, {
        error: 'Calendar not available',
        shortDate: 'N/A',
        hasSmallTime: false,
        showTimeControls: false,
        calendar: null,
        currentDate: null,
        formattedDate: 'N/A',
        isGM: game.user?.isGM || false,
      }) as MiniWidgetContext;
    }

    const activeCalendar = manager.getActiveCalendar();
    const currentDate = manager.getCurrentDate();

    if (!activeCalendar || !currentDate) {
      return Object.assign(context, {
        error: 'No calendar active',
        shortDate: 'N/A',
        hasSmallTime: false,
        showTimeControls: false,
        calendar: null,
        currentDate: null,
        formattedDate: 'N/A',
        isGM: game.user?.isGM || false,
      }) as MiniWidgetContext;
    }

    // Check if SmallTime is available and active
    const hasSmallTime = SmallTimeUtils.isSmallTimeAvailable();

    // Check if time should be displayed in mini widget
    const showTime = game.settings?.get('seasons-and-stars', 'miniWidgetShowTime') || false;

    // Check if day of week should be displayed in mini widget
    const showDayOfWeek =
      game.settings?.get('seasons-and-stars', 'miniWidgetShowDayOfWeek') || false;

    // Get weekday name/abbreviation with enhanced null safety
    // Don't show weekday for intercalary days that don't count for weekdays
    let weekdayDisplay = '';
    if (
      showDayOfWeek &&
      activeCalendar?.weekdays?.length > 0 &&
      currentDate.weekday !== undefined &&
      currentDate.countsForWeekdays()
    ) {
      const weekdayIndex = currentDate.weekday;
      if (weekdayIndex >= 0 && weekdayIndex < activeCalendar.weekdays.length) {
        const weekday = activeCalendar.weekdays[weekdayIndex];
        weekdayDisplay = weekday?.abbreviation || weekday?.name?.substring(0, 3) || '';
      }
    }

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

    // Determine if compact mode should be applied based on active features
    const showTimeControlsValue =
      (!hasSmallTime || alwaysShowQuickTimeButtons) && (game.user?.isGM || false);
    const compactMode = showDayOfWeek && showTimeControlsValue;

    // Check if moon phases should be displayed
    const showMoonPhases =
      game.settings?.get('seasons-and-stars', 'miniWidgetShowMoonPhases') ?? true;

    // Get moon phase data if enabled
    let moonPhases: Array<{
      moonName: string;
      phaseName: string;
      phaseIcon: string;
      faIcon: string;
      moonColor?: string;
    }> = [];

    if (showMoonPhases) {
      try {
        const engine = manager.getActiveEngine();
        if (engine) {
          const moonPhaseInfo = engine.getMoonPhaseInfo(currentDate);
          if (moonPhaseInfo && moonPhaseInfo.length > 0) {
            moonPhases = moonPhaseInfo.map((info: MoonPhaseInfo) => ({
              moonName: info.moon.name,
              phaseName: info.phase.name,
              phaseIcon: info.phase.icon,
              faIcon: MOON_PHASE_ICON_MAP[info.phase.icon] || 'circle',
              moonColor: sanitizeColor(info.moon.color),
            }));
          }
        }
      } catch (error) {
        Logger.debug('Failed to get moon phase data for mini widget', error);
      }
    }

    return Object.assign(context, {
      shortDate: currentDate.toShortString(),
      hasSmallTime: hasSmallTime,
      showTimeControls: showTimeControlsValue,
      isGM: game.user?.isGM || false,
      showTime: showTime,
      timeString:
        showTime && currentDate.time
          ? this.getTimeDisplayString(currentDate.time, activeCalendar)
          : '',
      showDayOfWeek: showDayOfWeek,
      weekdayDisplay: weekdayDisplay,
      timeAdvancementActive: timeAdvancementActive,
      advancementRatioDisplay: advancementRatioDisplay,
      compactMode: compactMode,
      calendar: {
        id: activeCalendar.id || 'unknown',
        label: activeCalendar.label || activeCalendar.name || 'Unknown Calendar',
        description: activeCalendar.description,
      },
      currentDate: currentDate,
      formattedDate: currentDate.toLongString(),
      sidebarButtons: loadButtonsFromRegistry('mini'),
      showMoonPhases: showMoonPhases,
      moonPhases: moonPhases,
    }) as MiniWidgetContext;
  }

  /**
   * Format time for compact display in mini widget - supports canonical hours
   */
  private getTimeDisplayString(
    time: { hour: number; minute: number; second: number },
    calendar?: import('../types/calendar').SeasonsStarsCalendar
  ): string {
    // Get canonical mode setting
    const canonicalMode =
      game.settings?.get('seasons-and-stars', 'miniWidgetCanonicalMode') || 'auto';

    // If exact mode or no calendar, always show exact time
    if (canonicalMode === 'exact' || !calendar) {
      return this.formatExactTime(time);
    }

    // Check for canonical hours
    const canonicalHours = calendar.canonicalHours;
    if (!canonicalHours || canonicalHours.length === 0) {
      return this.formatExactTime(time);
    }

    // Look for matching canonical hour
    const canonicalHour = this.findCanonicalHour(canonicalHours, time.hour, time.minute, calendar);

    if (canonicalHour) {
      // Truncate long names for mini widget space constraints
      return this.truncateCanonicalName(canonicalHour.name);
    }

    // No canonical hour found
    if (canonicalMode === 'canonical') {
      // Hide time when canonical mode is forced but no canonical hour available
      return '';
    }

    // Fallback to exact time for auto mode
    return this.formatExactTime(time);
  }

  /**
   * Format exact time as HH:MM
   */
  private formatExactTime(time: { hour: number; minute: number; second: number }): string {
    const hour = time.hour.toString().padStart(2, '0');
    const minute = time.minute.toString().padStart(2, '0');
    return `${hour}:${minute}`;
  }

  /**
   * Find canonical hour that matches the given time
   */
  private findCanonicalHour(
    canonicalHours: import('../types/calendar').CalendarCanonicalHour[],
    hour: number,
    minute: number,
    calendar: import('../types/calendar').SeasonsStarsCalendar
  ): import('../types/calendar').CalendarCanonicalHour | null {
    // Use DateFormatter's static method for consistency
    return (DateFormatter as any).findCanonicalHour(canonicalHours, hour, minute, calendar);
  }

  /**
   * Truncate canonical hour names for mini widget display
   */
  private truncateCanonicalName(name: string): string {
    // Allow longer names (18 chars) since canonical hours are more meaningful than exact time
    if (name.length <= 18) {
      return name;
    }
    return name.substring(0, 15) + '...';
  }

  /**
   * Simple post-render positioning like SmallTime
   */
  async _onRender(context: any, options: any): Promise<void> {
    await super._onRender(context, options);

    // Register this as the active instance
    CalendarMiniWidget.activeInstance = this;

    // Fire hook for external integrations (e.g., Simple Calendar Compatibility Bridge)
    if (this.element) {
      Hooks.callAll('seasons-stars:renderCalendarWidget', this, this.element, 'mini');
    }

    // Add click handlers for mini-date element
    const miniDateElement = this.element?.querySelector('.mini-date');
    if (miniDateElement) {
      // Handle single click
      miniDateElement.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();

        Logger.debug('Mini widget: Single click - opening larger view');
        this._onOpenLargerView(event, miniDateElement as HTMLElement);
      });

      // Handle double click (browser automatically handles timing and cancellation)
      miniDateElement.addEventListener('dblclick', event => {
        event.preventDefault();
        event.stopPropagation();

        Logger.debug('Mini widget: Double-click detected, opening calendar selection');
        this._onOpenCalendarSelection(event, miniDateElement as HTMLElement);
      });
    }

    this.element?.addEventListener('contextmenu', event => {
      event.preventDefault();
      if (game.settings?.get('seasons-and-stars', 'miniWidgetPinned')) {
        this.unpin();
      }
    });

    const pinned = game.settings?.get('seasons-and-stars', 'miniWidgetPinned');

    if (pinned) {
      this.applyPinnedPosition();
    } else {
      this.positionWidget();
    }

    // Setup dragging after positioning
    this.setupDragging();
  }

  /**
   * Position widget - simplified approach like SmallTime
   */
  private positionWidget(): void {
    if (!this.element || this.isClosing) {
      if (this.isClosing) {
        Logger.debug('Mini widget: Skipping positioning during close');
      }
      return;
    }

    // Skip repositioning if already positioned (reduces spam during time advancement)
    if (this.hasBeenPositioned) {
      return;
    }

    Logger.debug('Mini widget: Positioning widget');
    const smallTimeElement = SmallTimeUtils.getSmallTimeElement();

    if (smallTimeElement) {
      // Check if SmallTime is pinned/docked in DOM or floating
      if (this.isSmallTimeDocked(smallTimeElement)) {
        Logger.debug('Mini widget: SmallTime is docked - using DOM positioning');
        this.dockAboveSmallTime(smallTimeElement);
      } else {
        Logger.debug('Mini widget: SmallTime is floating - using fixed positioning');
        this.positionAboveSmallTime(smallTimeElement);
      }
    } else if (document.getElementById('players')) {
      Logger.debug('Mini widget: No SmallTime - docking to player list');
      this.dockToPlayerList();
    } else {
      Logger.debug('Mini widget: No SmallTime or player list - using standalone positioning');
      this.positionStandalone();
    }

    // Mark as positioned to avoid repeated repositioning during time advancement
    this.hasBeenPositioned = true;
  }

  /**
   * Apply pinned position styling
   */
  private applyPinnedPosition(): void {
    if (!this.element) return;

    // ApplicationV2 has the position but doesn't automatically apply it to the DOM
    // We need to manually apply the position from ApplicationV2's position property
    if (this.position.top !== undefined && this.position.left !== undefined) {
      this.element.style.position = 'fixed';
      this.element.style.top = `${this.position.top}px`;
      this.element.style.left = `${this.position.left}px`;
    }

    // Apply the visual styling for pinned mode
    this.element.style.zIndex = WIDGET_POSITIONING.Z_INDEX.toString();
    this.element.classList.add('standalone-mode');
    this.element.classList.remove(
      'docked-mode',
      'above-smalltime',
      'below-smalltime',
      'beside-smalltime'
    );

    this.hasBeenPositioned = true;
  }

  /**
   * Setup dragging using Foundry's built-in Draggable class
   */
  private setupDragging(): void {
    if (!this.element) return;

    // Create a Draggable instance and wrap the drag end method
    const draggable = new (foundry.applications.ux.Draggable as any)(
      this, // app
      this.element, // element (outer)
      this.element, // handle (drag element - use the whole widget)
      false // resizable
    );

    // Store the original drag start method and wrap it
    const originalOnDragMouseDown = draggable._onDragMouseDown;
    draggable._onDragMouseDown = function (event: MouseEvent) {
      // Switch to fixed positioning for free dragging
      const rect = this.app.element.getBoundingClientRect();
      this.app.element.style.position = 'fixed';
      this.app.element.style.top = `${rect.top}px`;
      this.app.element.style.left = `${rect.left}px`;
      this.app.element.style.margin = '0';

      return originalOnDragMouseDown.call(this, event);
    };

    // Store the original drag end method and wrap it
    const originalOnDragMouseUp = draggable._onDragMouseUp;
    draggable._onDragMouseUp = async function (event: MouseEvent) {
      // Call the original method first
      const result = originalOnDragMouseUp.call(this, event);

      // Apply pinned styling and save position
      const rect = this.app.element.getBoundingClientRect();

      this.app.element.style.zIndex = WIDGET_POSITIONING.Z_INDEX.toString();
      this.app.element.classList.add('standalone-mode');
      this.app.element.classList.remove(
        'docked-mode',
        'above-smalltime',
        'below-smalltime',
        'beside-smalltime'
      );

      await game.settings?.set('seasons-and-stars', 'miniWidgetPinned', true);
      await game.settings?.set('seasons-and-stars', 'miniWidgetPosition', {
        top: rect.top,
        left: rect.left,
      });

      return result;
    };
  }

  /**
   * Unpin the widget and reset to automatic positioning
   */
  private async unpin(): Promise<void> {
    await game.settings?.set('seasons-and-stars', 'miniWidgetPinned', false);
    await game.settings?.set('seasons-and-stars', 'miniWidgetPosition', {
      top: null,
      left: null,
    });
    this.hasBeenPositioned = false;
    this.positionWidget();
  }

  /**
   * Attach event listeners to rendered parts
   */
  _attachPartListeners(partId: string, htmlElement: HTMLElement, options: any): void {
    super._attachPartListeners(partId, htmlElement, options);

    // Add proper action handling for data-action elements
    htmlElement.addEventListener('click', this._onClickAction.bind(this));
  }

  /**
   * Handle click actions on elements with data-action attributes
   */
  private _onClickAction(event: Event): void {
    const target = event.target as HTMLElement;
    const actionElement = target.closest('[data-action]') as HTMLElement;

    if (!actionElement) return;

    const action = actionElement.dataset.action;
    if (!action) return;

    // Skip openCalendarSelection on mini-date to let double-click handler manage it
    if (action === 'openCalendarSelection' && actionElement.classList.contains('mini-date')) {
      return; // Let the custom double-click handler manage mini-date clicks
    }

    // Prevent default for all other actions
    event.preventDefault();
    event.stopPropagation();

    Logger.debug(`Mini widget action triggered: ${action}`);

    // Call the appropriate action handler
    switch (action) {
      case 'advanceTime':
        this._onAdvanceTime(event, actionElement);
        break;
      case 'toggleTimeAdvancement':
        this._onToggleTimeAdvancement(event, actionElement);
        break;
      case 'openCalendarSelection':
        this._onOpenCalendarSelection(event, actionElement);
        break;
      case 'openLargerView':
        this._onOpenLargerView(event, actionElement);
        break;
      case 'clickSidebarButton':
        this._onClickSidebarButton(event, actionElement);
        break;
      default:
        Logger.warn(`Unknown action: ${action}`);
        break;
    }
  }

  /**
   * Hide widget with smooth animation (SmallTime approach)
   */
  hideWithAnimation(): void {
    if (!this.element || !this.rendered || this.isClosing) return;

    Logger.debug('Mini widget: Starting hide animation');

    // Mark as closing to prevent positioning changes
    this.isClosing = true;

    // Capture current position before animation to prevent movement
    const rect = this.element.getBoundingClientRect();
    Logger.debug('Mini widget: Captured position before hide', {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });

    // Lock the position using fixed positioning
    this.element.style.position = 'fixed';
    this.element.style.top = `${rect.top}px`;
    this.element.style.left = `${rect.left}px`;
    this.element.style.width = `${rect.width}px`;
    this.element.style.height = `${rect.height}px`;

    // Stop any existing animations and apply custom fade-out
    $(this.element).stop();
    $(this.element).css({
      animation: 'seasons-stars-fade-out 0.2s ease-out',
      opacity: '0',
    });

    // Delay the actual close until after fade completes
    setTimeout(() => {
      Logger.debug('Mini widget: Animation complete, closing');
      this.close();
    }, WIDGET_POSITIONING.FADE_ANIMATION_DURATION);
  }

  /**
   * Handle closing the widget
   */
  async close(options: any = {}): Promise<this> {
    // Clear active instance if this is it
    if (CalendarMiniWidget.activeInstance === this) {
      CalendarMiniWidget.activeInstance = null;
    }

    // Clean up mutation observer
    const observer = (this as any)._playerListObserver;
    if (observer) {
      observer.disconnect();
      delete (this as any)._playerListObserver;
    }

    // Reset closing flag and positioning state
    this.isClosing = false;
    this.hasBeenPositioned = false;

    return super.close(options);
  }

  /**
   * Handle Foundry hooks for real-time updates
   */
  static registerHooks(): void {
    // Update widget when date changes
    Hooks.on('seasons-stars:dateChanged', () => {
      if (CalendarMiniWidget.activeInstance?.rendered) {
        CalendarMiniWidget.activeInstance.render();
      }
    });

    // Update widget when calendar changes
    Hooks.on('seasons-stars:calendarChanged', () => {
      if (CalendarMiniWidget.activeInstance?.rendered) {
        CalendarMiniWidget.activeInstance.render();
      }
    });

    // Update widget when combat state changes (affects time advancement button state)
    Hooks.on('combatStart', () => {
      if (CalendarMiniWidget.activeInstance?.rendered) {
        CalendarMiniWidget.activeInstance.render();
      }
    });

    Hooks.on('deleteCombat', () => {
      if (CalendarMiniWidget.activeInstance?.rendered) {
        CalendarMiniWidget.activeInstance.render();
      }
    });

    // Update widget when settings change (especially quick time buttons and time display)
    Hooks.on('seasons-stars:settingsChanged', (settingName: string) => {
      if (
        (settingName === 'quickTimeButtons' ||
          settingName === 'miniWidgetQuickTimeButtons' ||
          settingName === 'miniWidgetShowTime' ||
          settingName === 'miniWidgetShowDayOfWeek' ||
          settingName === 'miniWidgetCanonicalMode' ||
          settingName === 'miniWidgetShowMoonPhases' ||
          settingName === 'alwaysShowQuickTimeButtons') &&
        CalendarMiniWidget.activeInstance?.rendered
      ) {
        CalendarMiniWidget.activeInstance.render();
      }
    });

    Hooks.on('seasons-stars:widgetButtonsChanged', () => {
      if (CalendarMiniWidget.activeInstance?.rendered) {
        (CalendarMiniWidget.activeInstance as any).render({ parts: ['main'] });
      }
    });
  }

  /**
   * Show the mini widget
   * Creates a new instance if none exists, or renders existing instance if not already visible.
   * The widget will automatically position itself relative to SmallTime or the player list.
   *
   * @example
   * ```typescript
   * CalendarMiniWidget.show();
   * ```
   */
  static show(): void {
    if (CalendarMiniWidget.activeInstance) {
      if (!CalendarMiniWidget.activeInstance.rendered) {
        CalendarMiniWidget.activeInstance.render(true);
      }
    } else {
      new CalendarMiniWidget().render(true);
    }
  }

  /**
   * Hide the mini widget with smooth animation
   * Uses a fade-out animation before closing to provide visual feedback.
   * Safe to call even if no widget is currently displayed.
   *
   * @example
   * ```typescript
   * CalendarMiniWidget.hide();
   * ```
   */
  static hide(): void {
    if (CalendarMiniWidget.activeInstance?.rendered) {
      CalendarMiniWidget.activeInstance.hideWithAnimation();
    }
  }

  /**
   * Get the current active instance of the mini widget
   * Returns null if no widget is currently instantiated.
   * Useful for external modules that need to interact with the widget.
   *
   * @returns The active CalendarMiniWidget instance, or null if none exists
   * @example
   * ```typescript
   * const widget = CalendarMiniWidget.getInstance();
   * if (widget) {
   *   widget.addSidebarButton('my-button', 'fas fa-cog', 'Settings', () => {});
   * }
   * ```
   */
  static getInstance(): CalendarMiniWidget | null {
    return CalendarMiniWidget.activeInstance;
  }

  /**
   * Add a sidebar button to the mini widget
   * Provides generic API for integration with other modules via compatibility bridges
   */
  addSidebarButton(name: string, icon: string, tooltip: string, callback: () => void): void {
    registerSidebarButton('mini', { name, icon, tooltip, callback });
    Logger.debug(`Requested sidebar button "${name}" registration for mini widget`);
  }

  /**
   * Remove a sidebar button by name
   */
  removeSidebarButton(name: string): void {
    unregisterSidebarButton('mini', name);
    Logger.debug(`Requested sidebar button "${name}" removal for mini widget`);
  }

  /**
   * Check if a sidebar button exists
   */
  hasSidebarButton(name: string): boolean {
    return registryHasSidebarButton('mini', name);
  }

  /**
   * Toggle mini widget visibility
   * Shows the widget if hidden, hides it if currently displayed.
   * This is the primary method used by keyboard shortcuts and scene controls.
   *
   * @example
   * ```typescript
   * // Toggle widget from a macro or keybinding
   * CalendarMiniWidget.toggle();
   *
   * // Can also be called from the global API
   * game.seasonsStars.widgets.toggleMini();
   * ```
   */
  static toggle(): void {
    if (CalendarMiniWidget.activeInstance?.rendered) {
      CalendarMiniWidget.activeInstance.hideWithAnimation();
    } else {
      CalendarMiniWidget.show();
    }
  }

  /**
   * Instance action handler for time advancement
   */
  async _onAdvanceTime(event: Event, target: HTMLElement): Promise<void> {
    event.preventDefault();

    if (!game.user?.isGM) {
      ui.notifications?.warn('Only GMs can advance time');
      return;
    }

    const amount = parseInt(target.dataset.amount || '0');
    const unit = target.dataset.unit || 'hours';

    const manager = game.seasonsStars?.manager as CalendarManagerInterface;
    if (!manager) return;

    Logger.info(`Mini widget advancing time: ${amount} ${unit}`);

    try {
      switch (unit) {
        case 'minutes':
          await manager.advanceMinutes(amount);
          break;
        case 'hours':
          await manager.advanceHours(amount);
          break;
        default:
          Logger.warn(`Unknown time unit: ${unit}`);
          return;
      }
    } catch (error) {
      Logger.error('Error advancing time', error as Error);
      ui.notifications?.error('Failed to advance time');
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
        Logger.info('Mini widget: Paused time advancement');
      } else {
        await service.play();
        Logger.info('Mini widget: Started time advancement');
      }

      // Re-render to update button state
      this.render();
    } catch (error) {
      ui.notifications?.error('Failed to toggle time advancement');
      Logger.error('Mini widget time advancement toggle failed', error as Error);
    }
  }

  /**
   * Handle sidebar button clicks dispatched from template actions
   */
  async _onClickSidebarButton(event: Event, target: HTMLElement): Promise<void> {
    event.preventDefault();

    const buttonName = target.dataset.buttonName;
    console.log('🌟 Sidebar button clicked:', buttonName);

    if (!buttonName) {
      Logger.warn('Mini widget sidebar button clicked without button name');
      return;
    }

    const registry = SidebarButtonRegistry.getInstance();
    const allButtons = registry.getForWidget('mini');
    console.log('🌟 All buttons for mini widget:', allButtons);

    const button = allButtons.find(config => config.name === buttonName);
    console.log('🌟 Found button config:', button);

    if (button && typeof button.callback === 'function') {
      console.log('🌟 Executing callback for button:', buttonName);
      try {
        button.callback();
        console.log('🌟 Callback executed successfully');
      } catch (error) {
        Logger.error(`Error executing mini widget sidebar button "${buttonName}"`, error as Error);
      }
    } else {
      console.log('🌟 Button not found or invalid callback:', {
        found: !!button,
        callbackType: typeof button?.callback,
      });
      Logger.warn(`Mini widget sidebar button "${buttonName}" not found or has invalid callback`);
    }
  }

  /**
   * Handle opening calendar selection dialog
   */
  async _onOpenCalendarSelection(event: Event, _target: HTMLElement): Promise<void> {
    event.preventDefault();

    if (!game.user?.isGM) {
      ui.notifications?.warn('Only GMs can change the active calendar');
      return;
    }

    const manager = game.seasonsStars?.manager as CalendarManagerInterface;
    if (!manager) return;

    try {
      const calendars = manager.getAllCalendars();
      const activeCalendar = manager.getActiveCalendar();
      const currentCalendarId = activeCalendar?.id || 'gregorian';

      const { CalendarSelectionDialog } = await import('./calendar-selection-dialog');
      new CalendarSelectionDialog(calendars, currentCalendarId).render(true);
    } catch (error) {
      Logger.error('Error opening calendar selection', error as Error);
      ui.notifications?.error('Failed to open calendar selection');
    }
  }

  /**
   * Detect if SmallTime module is available and active
   */

  /**
   * Auto-position the mini widget relative to SmallTime or find optimal standalone position
   */
  private autoPositionRelativeToSmallTime(): void {
    if (this.isClosing) return;
    if (game.settings?.get('seasons-and-stars', 'miniWidgetPinned')) {
      this.applyPinnedPosition();
      return;
    }

    // Reset positioning flag to force repositioning when SmallTime moves
    this.hasBeenPositioned = false;

    // Wait for both our element and SmallTime to be ready
    const attemptPositioning = (attempts = 0) => {
      if (this.isClosing) return; // Check again in case close started during attempts

      const maxAttempts = WIDGET_POSITIONING.MAX_POSITIONING_ATTEMPTS;
      const smallTimeElement = SmallTimeUtils.getSmallTimeElement();

      if (smallTimeElement && this.element && this.rendered) {
        // Both elements exist and we're rendered, proceed with positioning
        Logger.debug(
          `Auto-positioning mini widget relative to SmallTime (attempt ${attempts + 1})`
        );
        this.positionRelativeToSmallTime('above'); // Default to above instead of below
      } else if (attempts < maxAttempts) {
        // Retry after a short delay
        Logger.debug(`Retrying positioning (attempt ${attempts + 1} of ${maxAttempts})`);
        setTimeout(
          () => attemptPositioning(attempts + 1),
          WIDGET_POSITIONING.POSITIONING_RETRY_DELAY
        );
      } else {
        // SmallTime not found - use standalone positioning
        Logger.debug('SmallTime not found, using standalone positioning');
        this.positionStandalone();
      }
    };

    // Start the positioning attempt
    requestAnimationFrame(() => attemptPositioning());
  }

  /**
   * Position mini widget in standalone mode (when SmallTime is not available)
   * First try to dock to player list, then fallback to fixed positioning
   */
  private positionStandalone(): void {
    if (!this.element) return;

    // First attempt: Try SmallTime-style docking to player list
    const playerList = document.getElementById('players');
    if (playerList) {
      this.positionRelativeToPlayerList();
      return;
    }

    // Fallback: Fixed positioning if player list not found
    let position = this.getFallbackPosition();

    // Check if fallback position is within viewport bounds
    const bounds = this.isPositionOutsideViewport(position);
    if (bounds.outsideTop || bounds.outsideBottom || bounds.outsideLeft || bounds.outsideRight) {
      position = this.correctPositionForViewport(position);
    }

    // Apply the fixed position as last resort
    this.element.style.position = 'fixed';
    this.element.style.top = `${position.top}px`;
    this.element.style.left = `${position.left}px`;
    this.element.style.zIndex = WIDGET_POSITIONING.Z_INDEX.toString();
    this.element.style.margin = '0';

    // Add a class to indicate standalone mode
    this.element.classList.add('standalone-mode');
    this.element.classList.remove(
      'above-smalltime',
      'below-smalltime',
      'beside-smalltime',
      'docked-mode'
    );
  }

  /**
   * Find SmallTime element using multiple strategies
   */

  /**
   * Position the mini widget relative to SmallTime
   */
  private positionRelativeToSmallTime(position: 'above' | 'below' | 'beside' = 'below'): void {
    const smallTimeElement = SmallTimeUtils.getSmallTimeElement();
    if (!smallTimeElement || !this.element) {
      Logger.debug('SmallTime not found, using standalone positioning');
      // Use standalone positioning instead of basic fallback
      this.positionStandalone();
      return;
    }

    Logger.debug(`Found SmallTime, positioning mini widget ${position}`);

    // Wait for the mini widget to be properly rendered before getting dimensions
    requestAnimationFrame(() => {
      const smallTimeRect = smallTimeElement.getBoundingClientRect();

      const { height: estimatedMiniHeight } = this.getMiniDimensions();

      Logger.debug('SmallTime rect', smallTimeRect);
      Logger.debug(`Using estimated mini height: ${estimatedMiniHeight}`);

      let newPosition: { top: number; left: number };

      switch (position) {
        case 'above':
          newPosition = {
            top: smallTimeRect.top - estimatedMiniHeight - 8,
            left: smallTimeRect.left,
          };
          this.element?.classList.add('above-smalltime');
          this.element?.classList.remove('below-smalltime', 'beside-smalltime');
          break;

        case 'beside':
          newPosition = {
            top: smallTimeRect.top,
            left: smallTimeRect.right + 8,
          };
          this.element?.classList.add('beside-smalltime');
          this.element?.classList.remove('above-smalltime', 'below-smalltime');
          break;

        case 'below':
        default:
          newPosition = {
            top: smallTimeRect.bottom + 8,
            left: smallTimeRect.left,
          };
          this.element?.classList.add('below-smalltime');
          this.element?.classList.remove('above-smalltime', 'beside-smalltime');
          break;
      }

      // Check if calculated position would be outside viewport
      const bounds = this.isPositionOutsideViewport(newPosition);
      if (bounds.outsideTop || bounds.outsideBottom || bounds.outsideLeft || bounds.outsideRight) {
        newPosition = this.correctPositionForViewport(newPosition);
      }

      Logger.debug('Positioning mini widget at', newPosition);

      // Apply positioning directly via CSS (more reliable than setPosition for frameless windows)
      if (this.element) {
        this.element.style.position = 'fixed';
        this.element.style.top = `${newPosition.top}px`;
        this.element.style.left = `${newPosition.left}px`;
        this.element.style.zIndex = WIDGET_POSITIONING.Z_INDEX.toString();

        // Try to match SmallTime's actual background color
        this.matchSmallTimeBackground(smallTimeElement);

        Logger.debug('Applied CSS positioning directly');

        // Verify final position
        setTimeout(() => {
          const finalRect = this.element?.getBoundingClientRect();
          Logger.debug('Final position', finalRect);
        }, WIDGET_POSITIONING.POSITIONING_RETRY_DELAY);
      }
    });
  }

  /**
   * Match SmallTime's actual background styling
   */
  private matchSmallTimeBackground(smallTimeElement: HTMLElement): void {
    try {
      // Find SmallTime's content area
      const smallTimeContent =
        smallTimeElement.querySelector('.window-content') ||
        smallTimeElement.querySelector('form') ||
        smallTimeElement;

      if (smallTimeContent && this.element) {
        const computedStyle = getComputedStyle(smallTimeContent as HTMLElement);
        const miniContent = this.element.querySelector('.calendar-mini-content') as HTMLElement;

        if (miniContent) {
          // Try to match the background
          const background = computedStyle.backgroundColor;
          const backgroundImage = computedStyle.backgroundImage;

          Logger.debug('SmallTime background', { background, backgroundImage });

          if (background && background !== 'rgba(0, 0, 0, 0)') {
            miniContent.style.background = background;
          }
          if (backgroundImage && backgroundImage !== 'none') {
            miniContent.style.backgroundImage = backgroundImage;
          }
        }
      }
    } catch (error) {
      Logger.debug('Could not match SmallTime background', error);
    }
  }

  /**
   * Public positioning methods
   */
  static positionAboveSmallTime(): void {
    if (CalendarMiniWidget.activeInstance?.rendered) {
      CalendarMiniWidget.activeInstance.positionRelativeToSmallTime('above');
    }
  }

  static positionBelowSmallTime(): void {
    if (CalendarMiniWidget.activeInstance?.rendered) {
      CalendarMiniWidget.activeInstance.positionRelativeToSmallTime('below');
    }
  }

  static positionBesideSmallTime(): void {
    if (CalendarMiniWidget.activeInstance?.rendered) {
      CalendarMiniWidget.activeInstance.positionRelativeToSmallTime('beside');
    }
  }

  /**
   * Listen for SmallTime position changes and update accordingly
   */
  static registerSmallTimeIntegration(): void {
    // Listen for SmallTime app rendering/movement
    Hooks.on('renderApplication', (app: any) => {
      if (
        app.id === 'smalltime-app' &&
        CalendarMiniWidget.activeInstance?.rendered &&
        !CalendarMiniWidget.activeInstance.isClosing
      ) {
        // Delay to ensure SmallTime positioning is complete
        setTimeout(() => {
          CalendarMiniWidget.activeInstance?.autoPositionRelativeToSmallTime();
        }, WIDGET_POSITIONING.POSITIONING_RETRY_DELAY);
      }
    });

    // Listen for player list changes that might affect positioning
    Hooks.on('renderPlayerList', () => {
      if (
        CalendarMiniWidget.activeInstance?.rendered &&
        !CalendarMiniWidget.activeInstance.isClosing
      ) {
        setTimeout(() => {
          CalendarMiniWidget.activeInstance?.handlePlayerListChange();
        }, 50);
      }
    });

    // Also listen for general UI updates that might affect player list
    Hooks.on('renderSidebar', () => {
      if (
        CalendarMiniWidget.activeInstance?.rendered &&
        !CalendarMiniWidget.activeInstance.isClosing
      ) {
        setTimeout(() => {
          CalendarMiniWidget.activeInstance?.handlePlayerListChange();
        }, WIDGET_POSITIONING.POSITIONING_RETRY_DELAY);
      }
    });

    // Use MutationObserver to watch for player list changes in real-time
    const playerList = document.getElementById('players');
    if (playerList && CalendarMiniWidget.activeInstance) {
      const observer = new MutationObserver(() => {
        if (
          CalendarMiniWidget.activeInstance?.rendered &&
          !CalendarMiniWidget.activeInstance.isClosing
        ) {
          CalendarMiniWidget.activeInstance.handlePlayerListChange();
        }
      });

      observer.observe(playerList, {
        attributes: true,
        attributeFilter: ['class', 'style'],
        childList: true,
        subtree: true,
      });

      // Store observer for cleanup
      (CalendarMiniWidget.activeInstance as any)._playerListObserver = observer;
    }

    // Listen for window resize to maintain positioning
    window.addEventListener('resize', () => {
      if (
        CalendarMiniWidget.activeInstance?.rendered &&
        !CalendarMiniWidget.activeInstance.isClosing
      ) {
        // Re-evaluate positioning on resize
        CalendarMiniWidget.activeInstance.autoPositionRelativeToSmallTime();
      }
    });
  }

  /**
   * Measure the rendered mini widget, with fallbacks to constants
   */
  private getMiniDimensions(): { width: number; height: number } {
    try {
      const el = this.element?.querySelector?.('.calendar-mini-content') as HTMLElement | null;
      if (el) {
        const rect = el.getBoundingClientRect();
        // Guard against 0 width before paint
        const width = rect.width > 0 ? rect.width : WIDGET_POSITIONING.MINI_WIDGET_WIDTH;
        const height = rect.height > 0 ? rect.height : WIDGET_POSITIONING.MINI_WIDGET_HEIGHT;
        return { width, height };
      }
    } catch {
      // Silently handle any errors during element measurement
    }
    return {
      width: WIDGET_POSITIONING.MINI_WIDGET_WIDTH,
      height: WIDGET_POSITIONING.MINI_WIDGET_HEIGHT,
    };
  }

  /**
   * Check if a position would place the widget outside viewport boundaries
   */
  isPositionOutsideViewport(position: { top: number; left: number }): {
    outsideTop: boolean;
    outsideBottom: boolean;
    outsideLeft: boolean;
    outsideRight: boolean;
  } {
    if (!window) {
      return { outsideTop: false, outsideBottom: false, outsideLeft: false, outsideRight: false };
    }

    // Use standardized widget dimensions
    const { width: widgetWidth, height: widgetHeight } = this.getMiniDimensions();

    const viewportHeight = window.innerHeight || 768;
    const viewportWidth = window.innerWidth || 1024;

    return {
      outsideTop: position.top < 0,
      outsideBottom: position.top + widgetHeight > viewportHeight,
      outsideLeft: position.left < 0,
      outsideRight: position.left + widgetWidth > viewportWidth,
    };
  }

  /**
   * Correct a position to ensure it stays within viewport boundaries
   */
  correctPositionForViewport(position: { top: number; left: number }): {
    top: number;
    left: number;
  } {
    if (!window) {
      return position;
    }

    // Handle invalid values
    if (!Number.isFinite(position.top) || !Number.isFinite(position.left)) {
      return this.getFallbackPosition();
    }

    const padding = WIDGET_POSITIONING.VIEWPORT_PADDING;
    const { width: widgetWidth, height: widgetHeight } = this.getMiniDimensions();

    const viewportHeight = window.innerHeight || 768;
    const viewportWidth = window.innerWidth || 1024;

    let correctedTop = position.top;
    let correctedLeft = position.left;

    // Correct top boundary
    if (correctedTop < padding) {
      correctedTop = padding;
    }

    // Correct bottom boundary
    if (correctedTop + widgetHeight > viewportHeight - padding) {
      correctedTop = Math.max(padding, viewportHeight - widgetHeight - padding);
    }

    // Correct left boundary
    if (correctedLeft < padding) {
      correctedLeft = padding;
    }

    // Correct right boundary
    if (correctedLeft + widgetWidth > viewportWidth - padding) {
      correctedLeft = Math.max(padding, viewportWidth - widgetWidth - padding);
    }

    return { top: correctedTop, left: correctedLeft };
  }

  /**
   * Get a sensible fallback position for the widget
   */
  getFallbackPosition(): { top: number; left: number } {
    if (!window) {
      return { top: 80, left: 20 };
    }

    const viewportHeight = window.innerHeight || 768;

    // Position in lower-left area, typical for UI widgets
    return {
      top: viewportHeight - WIDGET_POSITIONING.STANDALONE_BOTTOM_OFFSET,
      left: 20,
    };
  }

  /**
   * Handle player list expansion/contraction
   */
  private handlePlayerListChange(): void {
    if (this.isClosing) return;
    if (game.settings?.get('seasons-and-stars', 'miniWidgetPinned')) return;

    const playerList = document.getElementById('players');

    // Check if player list is expanded using the same approach as SmallTime
    const isExpanded = playerList?.classList.contains('expanded') || false;

    if (this.element) {
      this.element.classList.toggle('player-list-expanded', isExpanded);

      // Use SmallTime-style positioning - insert before player list when not with SmallTime
      if (!SmallTimeUtils.getSmallTimeElement()) {
        this.positionRelativeToPlayerList();
      }
    }
  }

  /**
   * Position widget relative to player list using SmallTime approach
   */
  private positionRelativeToPlayerList(): void {
    if (!this.element) return;

    const playerList = document.getElementById('players');
    if (!playerList) return;

    try {
      // Check if player list position would put widget outside viewport
      const playerListRect = playerList.getBoundingClientRect();
      const testPosition = {
        top: playerListRect.top - WIDGET_POSITIONING.MINI_WIDGET_HEIGHT,
        left: playerListRect.left,
      };

      const bounds = this.isPositionOutsideViewport(testPosition);
      if (bounds.outsideTop || bounds.outsideLeft) {
        // Player list position would be outside viewport, using fallback
        this.positionStandalone();
        return;
      }

      // Use SmallTime's approach: insert before the player list in the DOM
      // This automatically moves with player list expansion/contraction
      const uiLeft = document.getElementById('ui-left');
      if (uiLeft && !uiLeft.contains(this.element)) {
        // Move to ui-left container and position before players list
        playerList.parentElement?.insertBefore(this.element, playerList);

        // Style as pinned/docked (similar to SmallTime)
        this.element.style.position = 'relative';
        this.element.style.top = 'auto';
        this.element.style.left = 'auto';
        this.element.style.zIndex = WIDGET_POSITIONING.Z_INDEX.toString();
        this.element.style.margin = '0 0 8px 0'; // Small gap above player list

        this.element.classList.add('docked-mode');
        this.element.classList.remove(
          'standalone-mode',
          'above-smalltime',
          'below-smalltime',
          'beside-smalltime'
        );

        Logger.debug('Mini widget docked above player list (SmallTime style)');
      }
    } catch (error) {
      Logger.warn('Error docking to player list, using fallback positioning', error);
      this.positionStandalone();
    }
  }

  /**
   * Simple positioning above SmallTime (like SmallTime's pinApp)
   */
  private positionAboveSmallTime(smallTimeElement: HTMLElement): void {
    if (!this.element) return;

    const smallTimeRect = smallTimeElement.getBoundingClientRect();
    const { height: estimatedMiniHeight } = this.getMiniDimensions();

    // Calculate position above SmallTime
    let position = {
      top: smallTimeRect.top - estimatedMiniHeight - 8,
      left: smallTimeRect.left,
    };

    // Check if position would be outside viewport
    const bounds = this.isPositionOutsideViewport(position);
    if (bounds.outsideTop || bounds.outsideBottom || bounds.outsideLeft || bounds.outsideRight) {
      // Position above SmallTime would be outside viewport, using fallback
      position = this.getFallbackPosition();
      position = this.correctPositionForViewport(position);
    }

    // Apply position
    this.element.style.position = 'fixed';
    this.element.style.top = `${position.top}px`;
    this.element.style.left = `${position.left}px`;
    this.element.style.zIndex = WIDGET_POSITIONING.Z_INDEX.toString();

    this.element.classList.add('above-smalltime');
    this.element.classList.remove(
      'below-smalltime',
      'beside-smalltime',
      'standalone-mode',
      'docked-mode'
    );
  }

  /**
   * Check if SmallTime is docked/pinned in the DOM hierarchy
   */
  private isSmallTimeDocked(smallTimeElement: HTMLElement): boolean {
    // SmallTime adds 'pinned' class when docked
    if (smallTimeElement.classList.contains('pinned')) {
      return true;
    }

    // Also check if it's positioned in ui-left (where pinned widgets go)
    const uiLeft = document.getElementById('ui-left');
    if (uiLeft && uiLeft.contains(smallTimeElement)) {
      return true;
    }

    // Check if position is relative (docked) vs fixed (floating)
    const computedStyle = getComputedStyle(smallTimeElement);
    return computedStyle.position === 'relative';
  }

  /**
   * Dock above SmallTime in the DOM (when SmallTime is also docked)
   */
  private dockAboveSmallTime(smallTimeElement: HTMLElement): void {
    if (!this.element) return;

    // Insert before SmallTime in the DOM (like SmallTime does with players)
    $(smallTimeElement).before(this.element);

    // Style for docked mode above SmallTime
    this.element.style.position = 'relative';
    this.element.style.top = 'auto';
    this.element.style.left = 'auto';
    this.element.style.zIndex = WIDGET_POSITIONING.Z_INDEX.toString();
    this.element.style.margin = '0 0 8px 0'; // Small gap below us, above SmallTime

    this.element.classList.add('above-smalltime', 'docked-mode');
    this.element.classList.remove('below-smalltime', 'beside-smalltime', 'standalone-mode');
  }

  /**
   * Simple docking to player list (exactly like SmallTime's pinApp)
   */
  private dockToPlayerList(): void {
    if (!this.element) return;

    const playerList = document.getElementById('players');
    if (!playerList) return;

    // Exactly like SmallTime: $('#players').before(app.element)
    $(playerList).before(this.element);

    // Style for docked mode
    this.element.style.position = 'relative';
    this.element.style.top = 'auto';
    this.element.style.left = 'auto';
    this.element.style.zIndex = WIDGET_POSITIONING.Z_INDEX.toString();
    this.element.style.margin = '0 0 8px 0';

    this.element.classList.add('docked-mode');
    this.element.classList.remove(
      'standalone-mode',
      'above-smalltime',
      'below-smalltime',
      'beside-smalltime'
    );
  }

  /**
   * Open larger calendar view (default widget or grid based on setting)
   */
  async _onOpenLargerView(event: Event, _target: HTMLElement): Promise<void> {
    event.preventDefault();
    Logger.info('Opening larger view from mini widget');

    try {
      const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';
      Logger.info(`Default widget setting: ${defaultWidget}`);

      // Open either the default widget or grid widget (both are larger than mini)
      if (defaultWidget === 'grid') {
        Logger.info('Opening grid widget');
        CalendarWidgetManager.showWidget('grid');
      } else {
        // For 'main' or anything else, show the main widget
        Logger.info('Opening main calendar widget');
        CalendarWidgetManager.showWidget('main');
      }
    } catch (error) {
      Logger.error(
        'Failed to open larger view',
        error instanceof Error ? error : new Error(String(error))
      );
      // Fallback to main widget
      Logger.info('Fallback: Opening main calendar widget');
      CalendarWidgetManager.showWidget('main');
    }
  }
}
