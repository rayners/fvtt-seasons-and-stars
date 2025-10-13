/**
 * Scene controls integration for Seasons & Stars
 */

import { CalendarWidgetManager } from './widget-manager';
import { Logger } from '../core/logger';
import { isCalendarManager } from '../types/type-guards';
import type { SceneControl } from '../types/widget-types';

export class SeasonsStarsSceneControls {
  /**
   * Register scene controls
   */
  static registerControls(): void {
    Logger.debug(
      'SeasonsStarsSceneControls.registerControls() called - registering getSceneControlButtons hook'
    );

    Hooks.on('getSceneControlButtons', (controls: Record<string, SceneControl>) => {
      Logger.debug('getSceneControlButtons hook fired', {
        userExists: !!game.user,
        isGM: game.user?.isGM,
        controlsType: typeof controls,
        controlsKeys: Object.keys(controls),
        notesExists: !!controls.notes,
        notesToolsExists: !!controls.notes?.tools,
        notesToolsType: typeof controls.notes?.tools,
        notesToolsKeys: controls.notes?.tools ? Object.keys(controls.notes.tools) : null,
      });

      // Calendar button is now available to all users (GMs and players)
      // Individual widget functions will handle permission checks

      // Access notes controls directly (controls is an object, not array)
      if (controls.notes?.tools) {
        Logger.debug('Adding S&S scene control to notes.tools');

        // Use SmallTime's pattern of direct property assignment
        controls.notes.tools['seasons-stars-widget'] = {
          name: 'seasons-stars-widget',
          title: 'SEASONS_STARS.calendar.toggle_calendar',
          icon: 'fas fa-calendar-alt',
          onChange: (): void => SeasonsStarsSceneControls.toggleDefaultWidget(),
          button: true,
        };

        Logger.debug(
          'Added S&S scene control button, updated tools:',
          Object.keys(controls.notes.tools)
        );
      } else {
        Logger.warn('Notes controls not available for scene button', {
          notesExists: !!controls.notes,
          notesToolsExists: !!controls.notes?.tools,
          fullControlsStructure: controls,
        });
      }
    });

    // Update button state based on widget manager state
    Hooks.on('seasons-stars:widgetStateChanged', () => {
      const hasVisibleWidget = CalendarWidgetManager.getVisibleWidgets().length > 0;
      SeasonsStarsSceneControls.updateControlState(hasVisibleWidget);
    });
  }

  /**
   * Show the default widget based on user settings
   */
  private static showDefaultWidget(): void {
    try {
      const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';

      Logger.debug('Showing default widget', { defaultWidget });

      switch (defaultWidget) {
        case 'mini':
          CalendarWidgetManager.showWidget('mini');
          break;
        case 'grid':
          CalendarWidgetManager.showWidget('grid');
          break;
        case 'main':
        default:
          CalendarWidgetManager.showWidget('main');
          break;
      }
    } catch (error) {
      Logger.error(
        'Failed to show default widget',
        error instanceof Error ? error : new Error(String(error))
      );
      // Fallback to main widget
      CalendarWidgetManager.showWidget('main');
    }
  }

  /**
   * Hide the default widget based on user settings
   */
  private static hideDefaultWidget(): void {
    try {
      const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';

      Logger.debug('Hiding default widget', { defaultWidget });

      switch (defaultWidget) {
        case 'mini':
          CalendarWidgetManager.hideWidget('mini');
          break;
        case 'grid':
          CalendarWidgetManager.hideWidget('grid');
          break;
        case 'main':
        default:
          CalendarWidgetManager.hideWidget('main');
          break;
      }
    } catch (error) {
      Logger.error(
        'Failed to hide default widget',
        error instanceof Error ? error : new Error(String(error))
      );
      // Fallback to main widget
      CalendarWidgetManager.hideWidget('main');
    }
  }

  /**
   * Toggle the default widget based on user settings
   */
  private static toggleDefaultWidget(): void {
    try {
      const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';

      Logger.debug('Scene control toggling default widget', { defaultWidget });

      switch (defaultWidget) {
        case 'mini':
          CalendarWidgetManager.toggleWidget('mini');
          break;
        case 'grid':
          CalendarWidgetManager.toggleWidget('grid');
          break;
        case 'main':
        default:
          CalendarWidgetManager.toggleWidget('main');
          break;
      }
    } catch (error) {
      Logger.error(
        'Failed to toggle default widget from scene control',
        error instanceof Error ? error : new Error(String(error))
      );
      // Fallback to main widget
      CalendarWidgetManager.toggleWidget('main');
    }
  }

  /**
   * Update the control button state
   */
  private static updateControlState(active: boolean): void {
    // Look for our tool button in the scene controls
    const control = document.querySelector('[data-tool="seasons-stars-widget"]');
    if (control) {
      control.classList.toggle('active', active);
    }
  }

  /**
   * Add macro support for calendar widget
   */
  static registerMacros(): void {
    // Extend the existing SeasonsStars object with macro functions
    window.SeasonsStars ??= {};

    // Helper interface for legacy mini widget positioning
    interface MiniWidgetPositions {
      positionAboveSmallTime?: () => void;
      positionBelowSmallTime?: () => void;
      positionBesideSmallTime?: () => void;
    }

    // Add macro functions to the existing object
    Object.assign(window.SeasonsStars!, {
      // Widget controls - respect default widget setting
      showWidget: (): void => SeasonsStarsSceneControls.showDefaultWidget(),
      hideWidget: (): void => SeasonsStarsSceneControls.hideDefaultWidget(),
      toggleWidget: (): void => SeasonsStarsSceneControls.toggleDefaultWidget(),

      // Specific widget controls (for advanced users who want to override default)
      showMainWidget: (): void => {
        void CalendarWidgetManager.showWidget('main');
      },
      hideMainWidget: (): void => {
        void CalendarWidgetManager.hideWidget('main');
      },
      toggleMainWidget: (): void => {
        void CalendarWidgetManager.toggleWidget('main');
      },
      showMiniWidget: (): void => {
        void CalendarWidgetManager.showWidget('mini');
      },
      hideMiniWidget: (): void => {
        void CalendarWidgetManager.hideWidget('mini');
      },
      toggleMiniWidget: (): void => {
        void CalendarWidgetManager.toggleWidget('mini');
      },
      showGridWidget: (): void => {
        void CalendarWidgetManager.showWidget('grid');
      },
      hideGridWidget: (): void => {
        void CalendarWidgetManager.hideWidget('grid');
      },
      toggleGridWidget: (): void => {
        void CalendarWidgetManager.toggleWidget('grid');
      },

      // Mini widget positioning (legacy support)
      positionMiniAboveSmallTime: (): void => {
        const miniWidget = CalendarWidgetManager.getWidgetInstance<MiniWidgetPositions>('mini');
        miniWidget?.positionAboveSmallTime?.();
      },
      positionMiniBelowSmallTime: (): void => {
        const miniWidget = CalendarWidgetManager.getWidgetInstance<MiniWidgetPositions>('mini');
        miniWidget?.positionBelowSmallTime?.();
      },
      positionMiniBesideSmallTime: (): void => {
        const miniWidget = CalendarWidgetManager.getWidgetInstance<MiniWidgetPositions>('mini');
        miniWidget?.positionBesideSmallTime?.();
      },

      // Time advancement functions for macros
      advanceMinutes: async (minutes: number) => {
        const manager = game.seasonsStars?.manager;
        if (isCalendarManager(manager)) await manager.advanceMinutes(minutes);
      },
      advanceHours: async (hours: number) => {
        const manager = game.seasonsStars?.manager;
        if (isCalendarManager(manager)) await manager.advanceHours(hours);
      },
      advanceDays: async (days: number) => {
        const manager = game.seasonsStars?.manager;
        if (isCalendarManager(manager)) await manager.advanceDays(days);
      },
      advanceWeeks: async (weeks: number) => {
        const manager = game.seasonsStars?.manager;
        if (isCalendarManager(manager)) await manager.advanceWeeks(weeks);
      },
      advanceMonths: async (months: number) => {
        const manager = game.seasonsStars?.manager;
        if (isCalendarManager(manager)) await manager.advanceMonths(months);
      },
      advanceYears: async (years: number) => {
        const manager = game.seasonsStars?.manager;
        if (isCalendarManager(manager)) await manager.advanceYears(years);
      },
    });

    Logger.debug('Macro functions registered');
  }
}
