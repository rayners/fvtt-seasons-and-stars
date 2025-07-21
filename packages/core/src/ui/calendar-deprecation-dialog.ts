/**
 * Calendar Deprecation Warning Dialog for Seasons & Stars
 * Shows a warning to GMs about upcoming calendar removal in favor of calendar packs
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
      title: 'Seasons & Stars - Important Update',
      icon: 'fas fa-exclamation-triangle',
      minimizable: false,
      resizable: false,
    },
    position: {
      width: 500,
      height: 650,
    },
    form: {
      handler: CalendarDeprecationDialog.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  static override PARTS = {
    form: {
      template: 'modules/seasons-and-stars/templates/calendar-deprecation-warning.hbs',
    },
  };

  /**
   * Show the deprecation warning if it hasn't been dismissed by the GM
   */
  static async showWarningIfNeeded(): Promise<void> {
    try {
      // Only show to GMs
      if (!game.user?.isGM) {
        return;
      }

      // Check if warning was already shown and dismissed
      const warningShown = game.settings?.get(
        'seasons-and-stars',
        'calendarDeprecationWarningShown'
      );
      if (warningShown) {
        Logger.debug('Calendar deprecation warning already dismissed, skipping');
        return;
      }

      Logger.info('Showing calendar deprecation warning to GM');
      new CalendarDeprecationDialog().render(true);
    } catch (error) {
      Logger.error(
        'Failed to show calendar deprecation warning',
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

  /**
   * Handle form submission (dismiss button clicked)
   */
  static async #onSubmit(
    event: Event,
    form: HTMLFormElement,
    formData: FormDataExtended
  ): Promise<void> {
    try {
      const dontRemind = formData.object.dontRemind === true;

      if (dontRemind) {
        // Mark the warning as shown so it won't appear again
        await game.settings?.set('seasons-and-stars', 'calendarDeprecationWarningShown', true);
        Logger.info('Calendar deprecation warning dismissed by GM');
      }
    } catch (error) {
      Logger.error(
        'Failed to save calendar deprecation warning preference',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}
