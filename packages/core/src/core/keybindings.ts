/**
 * Keyboard shortcuts for Seasons & Stars
 */

import { CalendarWidget } from '../ui/calendar-widget';
import { CalendarMiniWidget } from '../ui/calendar-mini-widget';
import { CalendarGridWidget } from '../ui/calendar-grid-widget';
import { Logger } from './logger';

export class SeasonsStarsKeybindings {
  /**
   * Register all keyboard shortcuts
   */
  static registerKeybindings(): void {
    if (!game.keybindings) {
      Logger.warn('Keybindings API not available');
      return;
    }

    Logger.info('Registering keyboard shortcuts');

    // Alt+S - Toggle default widget
    game.keybindings.register('seasons-and-stars', 'toggleDefaultWidget', {
      name: 'SEASONS_STARS.keybindings.toggle_default_widget',
      hint: 'SEASONS_STARS.keybindings.toggle_default_widget_hint',
      editable: [
        {
          key: 'KeyS',
          modifiers: ['Alt'],
        },
      ],
      onDown: () => {
        Logger.debug('Default widget toggle shortcut pressed');
        SeasonsStarsKeybindings.toggleDefaultWidget();
        return true;
      },
      restricted: false, // Available to all users
      precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
    });

    // Alt+Shift+S - Toggle mini widget specifically
    game.keybindings.register('seasons-and-stars', 'toggleMiniWidget', {
      name: 'SEASONS_STARS.keybindings.toggle_mini_widget',
      hint: 'SEASONS_STARS.keybindings.toggle_mini_widget_hint',
      editable: [
        {
          key: 'KeyS',
          modifiers: ['Alt', 'Shift'],
        },
      ],
      onDown: () => {
        Logger.debug('Mini widget toggle shortcut pressed');
        CalendarMiniWidget.toggle();
        return true;
      },
      restricted: false,
      precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
    });

    // Alt+Ctrl+S - Toggle grid widget specifically
    game.keybindings.register('seasons-and-stars', 'toggleGridWidget', {
      name: 'SEASONS_STARS.keybindings.toggle_grid_widget',
      hint: 'SEASONS_STARS.keybindings.toggle_grid_widget_hint',
      editable: [
        {
          key: 'KeyS',
          modifiers: ['Alt', 'Control'],
        },
      ],
      onDown: () => {
        Logger.debug('Grid widget toggle shortcut pressed');
        CalendarGridWidget.toggle();
        return true;
      },
      restricted: false,
      precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
    });

    // Alt+Shift+Ctrl+S - Toggle main widget (future calendar management interface)
    game.keybindings.register('seasons-and-stars', 'toggleMainWidget', {
      name: 'SEASONS_STARS.keybindings.toggle_main_widget',
      hint: 'SEASONS_STARS.keybindings.toggle_main_widget_hint',
      editable: [
        {
          key: 'KeyS',
          modifiers: ['Alt', 'Shift', 'Control'],
        },
      ],
      onDown: () => {
        Logger.debug('Main widget toggle shortcut pressed');
        CalendarWidget.toggle();
        return true;
      },
      restricted: false,
      precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
    });

    Logger.info('Keyboard shortcuts registered successfully');
  }

  /**
   * Toggle the default widget based on user settings
   */
  private static toggleDefaultWidget(): void {
    try {
      const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';

      Logger.debug('Toggling default widget', { defaultWidget });

      switch (defaultWidget) {
        case 'none':
          // When 'none' is selected, toggle the main widget
          CalendarWidget.toggle();
          break;
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
        'Failed to toggle default widget',
        error instanceof Error ? error : new Error(String(error))
      );
      // Fallback to main widget
      CalendarWidget.toggle();
    }
  }

  /**
   * Check if keyboard shortcuts are working (for debugging)
   */
  static testKeybindings(): boolean {
    if (!game.keybindings) {
      Logger.warn('Keybindings API not available for testing');
      return false;
    }

    const registeredKeybindings = game.keybindings.actions.get('seasons-and-stars');
    const expectedKeybindings = [
      'toggleDefaultWidget',
      'toggleMiniWidget',
      'toggleGridWidget',
      'toggleMainWidget',
    ];

    const registeredNames = registeredKeybindings ? Array.from(registeredKeybindings.keys()) : [];
    const allRegistered = expectedKeybindings.every(name => registeredNames.includes(name));

    Logger.debug('Keybinding test results', {
      expected: expectedKeybindings,
      registered: registeredNames,
      allRegistered,
    });

    return allRegistered;
  }
}
