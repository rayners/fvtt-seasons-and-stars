/**
 * Settings Menu Application for Calendar Browser
 * This is a minimal ApplicationV2 class that immediately opens the Calendar Browser Dialog
 */

import { CalendarBrowserDialog } from './calendar-browser-dialog';

export class CalendarBrowserMenuApplication extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'calendar-browser-menu',
    classes: ['seasons-stars'],
    window: {
      title: 'SEASONS_STARS.settings.calendar_browser_button',
      frame: false,
    },
    position: {
      width: 1,
      height: 1,
    },
  };

  // Override render to directly open the calendar browser instead of showing a window
  async render(_force?: boolean, _options?: any): Promise<this> {
    // Don't call super.render() - we don't want to show a window
    await CalendarBrowserDialog.show();
    return this;
  }
}
