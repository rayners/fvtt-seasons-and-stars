import { Logger } from './logger';
import { CalendarWidget } from '../ui/calendar-widget';
import { CalendarMiniWidget } from '../ui/calendar-mini-widget';
import { CalendarGridWidget } from '../ui/calendar-grid-widget';
import type { ErrorsAndEchoesAPI } from '../types/external-integrations';
import type { CalendarManager } from './calendar-manager';

/**
 * Register Errors & Echoes integration using a calendar manager getter.
 * Keeping this separate reduces clutter in module.ts
 */
export function registerErrorsAndEchoesIntegration(
  getCalendarManager: () => CalendarManager | undefined
): void {
  Hooks.once('errorsAndEchoesReady', (errorsAndEchoesAPI: ErrorsAndEchoesAPI) => {
    try {
      Logger.debug('Registering with Errors and Echoes via hook');

      errorsAndEchoesAPI.register({
        moduleId: 'seasons-and-stars',

        // Context provider - adds useful debugging information
        contextProvider: () => {
          const context: Record<string, unknown> = {};
          const calendarManager = getCalendarManager();

          // Add current calendar information - safe property access
          if (calendarManager) {
            const currentDate = calendarManager.getCurrentDate();
            const activeCalendar = calendarManager.getActiveCalendar();

            context.currentDate = currentDate
              ? `${currentDate.year}-${currentDate.month}-${currentDate.day}`
              : 'unknown';
            context.activeCalendarId = activeCalendar?.id || 'unknown';
            context.calendarEngineAvailable = !!calendarManager.getActiveEngine();
          }

          // Add widget state - simple property checks don't need try-catch
          const activeWidgets: string[] = [];
          if (CalendarWidget.getInstance?.()?.rendered) activeWidgets.push('main');
          if (CalendarMiniWidget.getInstance?.()?.rendered) activeWidgets.push('mini');
          if (CalendarGridWidget.getInstance?.()?.rendered) activeWidgets.push('grid');
          context.activeWidgets = activeWidgets;

          // Add system information - basic property access
          context.gameSystem = game.system?.id || 'unknown';
          context.foundryVersion = game.version || 'unknown';
          context.smallTimeDetected = !!document.querySelector('#smalltime-app');

          return context;
        },

        // Error filter - focus on errors relevant to S&S functionality
        errorFilter: (error: Error) => {
          const stack = error.stack || '';
          const message = error.message || '';

          // Always report errors that mention our module explicitly
          if (
            stack.includes('seasons-and-stars') ||
            message.includes('seasons-and-stars') ||
            message.includes('S&S') ||
            stack.includes('CalendarManager') ||
            stack.includes('CalendarWidget') ||
            stack.includes('CalendarEngine') ||
            stack.includes('NotesManager')
          ) {
            return false; // Don't filter (report this error)
          }

          // Report time/calendar related errors that might affect us
          if (
            message.includes('worldTime') ||
            message.includes('game.time') ||
            message.includes('calendar') ||
            message.includes('dateToWorldTime') ||
            message.includes('worldTimeToDate') ||
            (message.includes('time') && stack.includes('foundry'))
          ) {
            return false; // Don't filter (time system errors affect us)
          }

          // Report widget positioning and UI errors
          if (
            message.includes('widget') ||
            message.includes('SmallTime') ||
            message.includes('player list') ||
            (message.includes('position') && stack.includes('ui')) ||
            message.includes('ApplicationV2')
          ) {
            return false; // Don't filter (UI errors might affect our widgets)
          }

          // Report integration-related errors
          if (
            message.includes('Simple Calendar') ||
            message.includes('simple-calendar') ||
            message.includes('compatibility') ||
            message.includes('bridge') ||
            stack.includes('integration')
          ) {
            return false; // Don't filter (integration errors affect us)
          }

          // Report foundry core time system errors
          if (
            stack.includes('foundry.js') &&
            (message.includes('time') || message.includes('world') || message.includes('scene'))
          ) {
            return false; // Don't filter (core time system issues)
          }

          // Filter out errors from unrelated modules (unless they mention calendar/time)
          const unrelatedModules = [
            'dice-so-nice',
            'lib-wrapper',
            'socketlib',
            'combat-utility-belt',
            'enhanced-terrain-layer',
            'token-action-hud',
            'foundryvtt-forien-quest-log',
          ];

          for (const module of unrelatedModules) {
            if (
              stack.includes(module) &&
              !message.includes('calendar') &&
              !message.includes('time') &&
              !stack.includes('seasons-and-stars')
            ) {
              return true; // Filter out (unrelated module error)
            }
          }

          // Default: filter out most other errors unless they seem time/calendar related
          if (
            message.includes('calendar') ||
            message.includes('time') ||
            message.includes('date')
          ) {
            return false; // Don't filter (might be related)
          }

          return true; // Filter out everything else
        },
      });

      Logger.debug('Successfully registered with Errors and Echoes via hook');
    } catch (error) {
      Logger.error(
        'Failed to register with Errors and Echoes via hook',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  });
}
