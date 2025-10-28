/**
 * Calendar Pack Migration Dialog for Seasons & Stars
 * Informs GMs that calendars have been moved to separate calendar packs
 */

import { Logger } from '../core/logger';

export class CalendarDeprecationDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static override DEFAULT_OPTIONS = {
    tag: 'div',
    window: {
      frame: true,
      positioned: true,
      title: 'Seasons & Stars - Calendar Packs Available',
      icon: 'fas fa-info-circle',
      minimizable: false,
      resizable: false,
    },
    position: {
      width: 500,
      height: 650,
    },
  };

  static override PARTS = {
    content: {
      id: 'content',
      template: 'modules/seasons-and-stars/templates/calendar-deprecation-warning.hbs',
    },
  };

  /**
   * Show the calendar pack information dialog if it hasn't been dismissed by the GM
   */
  static async showWarningIfNeeded(): Promise<void> {
    try {
      // Only show to GMs
      if (!game.user?.isGM) {
        return;
      }

      // Check if any calendar packs are already installed
      const calendarPackModules = Array.from(game.modules.values()).filter(
        module =>
          module.id.startsWith('seasons-and-stars-') &&
          module.id !== 'seasons-and-stars' &&
          module.active
      );

      if (calendarPackModules.length > 0) {
        Logger.debug(
          `Calendar pack(s) already installed (${calendarPackModules.map(m => m.id).join(', ')}), skipping information dialog`
        );
        return;
      }

      // Check if dialog was already shown and dismissed
      const warningShown = game.settings?.get(
        'seasons-and-stars',
        'calendarDeprecationWarningShown'
      );
      if (warningShown) {
        Logger.debug('Calendar pack information dialog already dismissed, skipping');
        return;
      }

      Logger.info('Showing calendar pack information dialog to GM');
      new CalendarDeprecationDialog().render(true);
    } catch (error) {
      Logger.error(
        'Failed to show calendar pack information dialog',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  override async _prepareContext(_options: unknown): Promise<Record<string, unknown>> {
    return {
      isGM: game.user?.isGM,
      moduleName: 'Seasons & Stars',
    };
  }

  override _attachPartListeners(partId: string, htmlElement: HTMLElement, options: any): void {
    super._attachPartListeners(partId, htmlElement, options);

    // Add click handler to the dismiss button
    htmlElement.querySelector('.dismiss-button')?.addEventListener('click', async () => {
      try {
        // Check if "don't remind" is checked
        const checkbox = htmlElement.querySelector('input[name="dontRemind"]') as HTMLInputElement;
        const dontRemind = checkbox?.checked === true;

        if (dontRemind) {
          // Mark the dialog as shown so it won't appear again
          await game.settings?.set('seasons-and-stars', 'calendarDeprecationWarningShown', true);
          Logger.info('Calendar pack information dialog dismissed by GM');
        }

        // Close this dialog
        await this.close();
      } catch (error) {
        Logger.error(
          'Failed to save calendar pack information dialog preference',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    });
  }
}
