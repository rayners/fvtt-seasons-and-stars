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

  // Add hook for core module to provide integration points
  Hooks.on('seasons-and-stars.registerCalendarBuilderIntegration', (integration: any) => {
    console.log('Calendar Builder | Registering integration from core module', integration);
    if (calendarBuilderApp) {
      calendarBuilderApp.registerIntegration(integration);
    }
  });
});

/**
 * Hook into core module ready state to register our integration
 */
Hooks.once('seasons-and-stars.ready', () => {
  console.log('Calendar Builder | Core module ready, registering calendar builder integration');

  // Call hook to register calendar builder with core module
  Hooks.callAll('seasons-and-stars.calendarBuilderReady', {
    app: calendarBuilderApp,
    openBuilder: () => {
      if (calendarBuilderApp) {
        calendarBuilderApp.render(true);
      }
    }
  });
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