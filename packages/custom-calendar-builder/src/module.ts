/**
 * Calendar Builder Module for Seasons & Stars
 * Provides a user interface for creating and editing custom calendar JSON files
 */

import { CalendarBuilderApp } from './calendar-builder-app';

let calendarBuilderApp: CalendarBuilderApp | null = null;

/**
 * Initialize the Calendar Builder module
 */
Hooks.once('init', () => {
  console.log('Calendar Builder | Initializing');

  // Register the calendar builder application
  calendarBuilderApp = new CalendarBuilderApp();

});

/**
 * Hook into core module ready state to initialize builder integration
 */
Hooks.once('seasons-and-stars.ready', () => {
  console.log('Calendar Builder | Core module ready, setting up calendar builder');

  // Add builder button to calendar widgets via core widget hook
  Hooks.on('seasons-stars:widgetCreated', (widget: any) => {
    if (widget && typeof widget.addSidebarButton === 'function') {
      widget.addSidebarButton(
        'calendar-builder',
        'fa-solid fa-edit',
        'Open Calendar Builder',
        () => {
          if (calendarBuilderApp) {
            calendarBuilderApp.render(true);
          }
        }
      );
    }
  });

  // Add to existing widgets if they exist
  try {
    const GlobalCalendarWidget = (globalThis as any).CalendarWidget;
    if (GlobalCalendarWidget?.getActiveInstance) {
      const activeWidget = GlobalCalendarWidget.getActiveInstance();
      if (activeWidget && typeof activeWidget.addSidebarButton === 'function') {
        activeWidget.addSidebarButton(
          'calendar-builder',
          'fa-solid fa-edit',
          'Open Calendar Builder',
          () => {
            if (calendarBuilderApp) {
              calendarBuilderApp.render(true);
            }
          }
        );
      }
    }
  } catch (error) {
    console.debug('Calendar Builder | Could not add button to existing widget:', error);
  }
});

/**
 * Module ready hook
 */
Hooks.once('ready', () => {
  console.log('Calendar Builder | Module ready');

  // Ensure the app is available globally for debugging
  (globalThis as any).CalendarBuilder = {
    app: calendarBuilderApp,
    open: () => calendarBuilderApp?.render(true)
  };
});

export { CalendarBuilderApp };