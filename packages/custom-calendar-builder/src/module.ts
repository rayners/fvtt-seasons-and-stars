/**
 * Calendar Builder Module for Seasons & Stars
 * Provides a user interface for creating and editing custom calendar JSON files
 */

// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../core/src/types/foundry-v13-essentials.d.ts" />

import './styles/calendar-builder.scss';
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

  // Register sidebar button using the new registry system
  const registry = (game as any).seasonsStars.buttonRegistry;
  registry.register({
    name: 'calendar-builder',
    icon: 'fa-solid fa-hammer',
    tooltip: 'Open Calendar Builder',
    callback: () => {
      calendarBuilderApp?.render({ force: true });
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
    open: () => calendarBuilderApp?.render({ force: true })
  };
});

export { CalendarBuilderApp };