/**
 * Scene controls integration for Seasons & Stars
 */

import { CalendarWidget } from './calendar-widget';
import { CalendarMiniWidget } from './calendar-mini-widget';
import { CalendarGridWidget } from './calendar-grid-widget';
import { Logger } from '../core/logger';
import type { CalendarManagerInterface } from '../types/foundry-extensions';
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

      if (!game.user?.isGM) {
        Logger.debug('User is not GM, skipping scene control registration');
        return;
      }

      // Access notes controls directly (controls is an object, not array)
      if (controls.notes?.tools) {
        Logger.debug('Adding S&S scene control to notes.tools');

        // Use SmallTime's pattern of direct property assignment
        controls.notes.tools['seasons-stars-widget'] = {
          name: 'seasons-stars-widget',
          title: 'SEASONS_STARS.calendar.toggle_calendar',
          icon: 'fas fa-calendar-alt',
          onChange: () => SeasonsStarsSceneControls.toggleDefaultWidget(),
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

    // Update button state when any widget is shown/hidden
    Hooks.on('renderApplication', (app: any) => {
      if (
        app instanceof CalendarWidget ||
        app instanceof CalendarMiniWidget ||
        app instanceof CalendarGridWidget
      ) {
        SeasonsStarsSceneControls.updateControlState(true);
      }
    });

    Hooks.on('closeApplication', (app: any) => {
      if (
        app instanceof CalendarWidget ||
        app instanceof CalendarMiniWidget ||
        app instanceof CalendarGridWidget
      ) {
        SeasonsStarsSceneControls.updateControlState(false);
      }
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
          CalendarMiniWidget.show();
          break;
        case 'grid':
          CalendarGridWidget.show();
          break;
        case 'main':
        default:
          CalendarWidget.show();
          break;
      }
    } catch (error) {
      Logger.error(
        'Failed to show default widget',
        error instanceof Error ? error : new Error(String(error))
      );
      // Fallback to main widget
      CalendarWidget.show();
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
          CalendarMiniWidget.hide();
          break;
        case 'grid':
          CalendarGridWidget.hide();
          break;
        case 'main':
        default:
          CalendarWidget.hide();
          break;
      }
    } catch (error) {
      Logger.error(
        'Failed to hide default widget',
        error instanceof Error ? error : new Error(String(error))
      );
      // Fallback to main widget
      CalendarWidget.hide();
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
          CalendarMiniWidget.toggle();
          break;
        case 'grid':
          CalendarGridWidget.toggle();
          break;
        case 'main':
        default:
          CalendarWidget.toggle();
          break;
      }
    } catch (error) {
      Logger.error(
        'Failed to toggle default widget from scene control',
        error instanceof Error ? error : new Error(String(error))
      );
      // Fallback to main widget
      CalendarWidget.toggle();
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
    if (!(window as any).SeasonsStars) {
      (window as any).SeasonsStars = {};
    }

    // Add macro functions to the existing object
    Object.assign((window as any).SeasonsStars, {
      // Widget controls - respect default widget setting
      showWidget: () => SeasonsStarsSceneControls.showDefaultWidget(),
      hideWidget: () => SeasonsStarsSceneControls.hideDefaultWidget(),
      toggleWidget: () => SeasonsStarsSceneControls.toggleDefaultWidget(),

      // Specific widget controls (for advanced users who want to override default)
      showMainWidget: () => CalendarWidget.show(),
      hideMainWidget: () => CalendarWidget.hide(),
      toggleMainWidget: () => CalendarWidget.toggle(),
      showMiniWidget: () => CalendarMiniWidget.show(),
      hideMiniWidget: () => CalendarMiniWidget.hide(),
      toggleMiniWidget: () => CalendarMiniWidget.toggle(),
      showGridWidget: () => CalendarGridWidget.show(),
      hideGridWidget: () => CalendarGridWidget.hide(),
      toggleGridWidget: () => CalendarGridWidget.toggle(),

      // Mini widget positioning (legacy support)
      positionMiniAboveSmallTime: () => CalendarMiniWidget.positionAboveSmallTime(),
      positionMiniBelowSmallTime: () => CalendarMiniWidget.positionBelowSmallTime(),
      positionMiniBesideSmallTime: () => CalendarMiniWidget.positionBesideSmallTime(),

      // Time advancement functions for macros
      advanceMinutes: async (minutes: number) => {
        const manager = game.seasonsStars?.manager as CalendarManagerInterface;
        if (manager && manager.advanceMinutes) await manager.advanceMinutes(minutes);
      },
      advanceHours: async (hours: number) => {
        const manager = game.seasonsStars?.manager as CalendarManagerInterface;
        if (manager && manager.advanceHours) await manager.advanceHours(hours);
      },
      advanceDays: async (days: number) => {
        const manager = game.seasonsStars?.manager as CalendarManagerInterface;
        if (manager && manager.advanceDays) await manager.advanceDays(days);
      },
      advanceWeeks: async (weeks: number) => {
        const manager = game.seasonsStars?.manager as CalendarManagerInterface;
        if (manager && manager.advanceWeeks) await manager.advanceWeeks(weeks);
      },
      advanceMonths: async (months: number) => {
        const manager = game.seasonsStars?.manager as CalendarManagerInterface;
        if (manager && manager.advanceMonths) await manager.advanceMonths(months);
      },
      advanceYears: async (years: number) => {
        const manager = game.seasonsStars?.manager as CalendarManagerInterface;
        if (manager && manager.advanceYears) await manager.advanceYears(years);
      },
    });

    Logger.debug('Macro functions registered');
  }
}
