/**
 * Seasons & Stars - Main Module Entry Point
 * A clean calendar and timekeeping module for Foundry VTT v13+
 */

// Import styles
import './styles/seasons-and-stars.scss';

import { Logger } from './core/logger';
import { UI_CONSTANTS, SETTINGS_KEYS } from './core/constants';
import { CalendarManager } from './core/calendar-manager';
import { NotesManager } from './core/notes-manager';
import { compatibilityManager } from './core/compatibility-manager';
import { noteCategories, initializeNoteCategories } from './core/note-categories';
import { CalendarDate } from './core/calendar-date';
import { SunriseSunsetCalculator } from './core/sunrise-sunset-calculator';
import { EventsAPI } from './core/events-api';
import { CalendarWidget } from './ui/calendar-widget';
import { CalendarMiniWidget } from './ui/calendar-mini-widget';
import { CalendarGridWidget } from './ui/calendar-grid-widget';
import { CalendarSelectionDialog } from './ui/calendar-selection-dialog';
import { getTargetWidgetType, getSafeDefaultWidgetOption } from './ui/widget-type-resolver';
import { CalendarDeprecationDialog } from './ui/calendar-deprecation-dialog';
// Note editing dialog imported when needed
import { SeasonsStarsSceneControls } from './ui/scene-controls';
import { SeasonsStarsKeybindings } from './core/keybindings';
import { CalendarWidgetManager, WidgetWrapper, type WidgetInstance } from './ui/widget-manager';
import { SeasonsStarsIntegration } from './core/bridge-integration';
import { ValidationUtils } from './core/validation-utils';
import { APIWrapper } from './core/api-wrapper';
import type { ValidationResult } from './core/calendar-validator';
import { registerQuickTimeButtonsHelper } from './core/quick-time-buttons';
import { TimeAdvancementService } from './core/time-advancement-service';
import type { MemoryMageAPI } from './types/external-integrations';
import { registerSettingsPreviewHooks } from './core/settings-preview';
import { handleCalendarSelection } from './core/calendar-selection-handler';
import { registerErrorsAndEchoesIntegration } from './core/errors-echoes-integration';
import type { SeasonsStarsAPI } from './types/foundry-extensions';
import type { ExtendedNotesManager, ExtendedCalendarManager } from './types/external-integrations';
import type {
  CalendarDate as ICalendarDate,
  DateFormatOptions,
  SeasonsStarsCalendar,
  CalendarSourceInfo,
} from './types/calendar';
import { SidebarButtonRegistry } from './ui/sidebar-button-registry';
import {
  initializeFoundryCalendarClass,
  updateFoundryCalendarConfig,
} from './core/foundry-calendar-integration';

// Import integrations (they register their own hooks independently)
// PF2e integration moved to separate pf2e-pack module

// Module instances
let calendarManager: CalendarManager;
let notesManager: NotesManager;
let eventsAPI: EventsAPI;

// Track if we've already warned about missing seasons for the current active calendar
let hasWarnedAboutMissingSeasons = false;

// Track last date we checked for events (prevents duplicate hook fires on startup)
let lastEventCheckDate: { year: number; month: number; day: number } | null = null;

/**
 * Reset the seasons warning state - exposed for testing and external calendar changes
 * This is called automatically when the seasons-stars:calendarChanged hook fires
 */
export function resetSeasonsWarningState(): void {
  hasWarnedAboutMissingSeasons = false;
}

/**
 * Get the current seasons warning state - exposed for testing
 * @returns true if we've already warned about missing seasons for the active calendar
 */
export function getSeasonsWarningState(): boolean {
  return hasWarnedAboutMissingSeasons;
}

/**
 * Set the seasons warning state - exposed for testing
 * @param warned true if we should consider the warning as having been shown
 */
export function setSeasonsWarningState(warned: boolean): void {
  hasWarnedAboutMissingSeasons = warned;
}

// Register scene controls at top level (critical timing requirement)
SeasonsStarsSceneControls.registerControls();

/**
 * Module initialization - MUST be synchronous to block until calendars are loaded
 */
export function init(): void {
  try {
    Logger.debug('Initializing module (BLOCKING)');

    // Initialize Foundry calendar class (must be early so Foundry can instantiate it)
    initializeFoundryCalendarClass();

    // Register module settings
    registerSettings();

    // Register Handlebars helpers
    registerQuickTimeButtonsHelper();

    // Register settings preview functionality
    registerSettingsPreviewHooks();

    // Register keyboard shortcuts (must be in init hook)
    Logger.debug('Registering keyboard shortcuts');
    SeasonsStarsKeybindings.registerKeybindings();

    // Note: Note editing hooks temporarily disabled - see KNOWN-ISSUES.md
    // registerNoteEditingHooks();

    // Initialize note categories after settings are available
    initializeNoteCategories();

    // Initialize managers first
    calendarManager = new CalendarManager();
    notesManager = new NotesManager();

    // Expose manager early so SeasonsStarsFoundryCalendar constructor can find it
    // The full API will be set up in ready hook
    if (!game.seasonsStars) {
      game.seasonsStars = {};
    }
    game.seasonsStars.manager = calendarManager;
    Logger.debug(
      'Calendar manager exposed to game.seasonsStars.manager early for Foundry integration'
    );

    // Register Errors and Echoes integration
    // Note: Uses global game.seasonsStars.manager access, so must be called after API setup
    // However, the actual registration happens in the errorsAndEchoesReady hook, so we can
    // register the hook early and it will access the manager when E&E is ready
    registerErrorsAndEchoesIntegration();

    // Load all calendars during init - this MUST complete before setup hook
    Logger.debug('Loading calendars during init (BLOCKING)');

    // Start calendar loading immediately but don't block on it
    // The calendars will be loaded by the time setup runs
    calendarManager
      .loadBuiltInCalendars()
      .then(async () => {
        Logger.debug('Built-in calendars loaded successfully during init');

        // Also load calendar packs so all calendars are available during setup
        try {
          await calendarManager.autoLoadCalendarPacks();
          Logger.debug('Calendar packs loaded successfully during init');
        } catch (error) {
          Logger.error(
            'Failed to load calendar packs during init:',
            error instanceof Error ? error : new Error(String(error))
          );
        }

        // Calendars loaded - selection handled via CalendarSelectionDialog
        Logger.debug('Calendars loaded - available via selection dialog');
      })
      .catch(error => {
        Logger.error(
          'Failed to load calendars during init:',
          error instanceof Error ? error : new Error(String(error))
        );
      });

    Logger.debug('Module initialized - calendar loading initiated');
  } catch (error) {
    Logger.error(
      'Module initialization failed:',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

Hooks.once('init', init);

/**
 * Core module setup during setup - exposes fully functional API before any module's ready hook
 * This ensures compatibility modules can access the S&S API immediately during ready
 * CRITICAL: This must be synchronous and block until complete
 * Calendars are already loaded from init hook - now we activate one and expose API
 */
export function setup(): void {
  try {
    Logger.debug(
      'Core setup during setup - calendars loading asynchronously, setting up API (BLOCKING)'
    );

    // Calendar-specific settings will be registered asynchronously after calendars are loaded
    // (see init hook calendar loading promise)

    // Set active calendar from settings (may use cached data or fall back to gregorian)
    // This creates the time converter needed for getCurrentDate() API calls
    try {
      // Get the active calendar setting and set it directly
      const activeCalendarId =
        game.settings?.get('seasons-and-stars', 'activeCalendar') || 'gregorian';

      // Set the active calendar synchronously (calendars already loaded in init)
      const success = calendarManager.setActiveCalendarSync(activeCalendarId);
      if (success) {
        Logger.debug(`Active calendar set to ${activeCalendarId} during setup`);
        // Update Foundry calendar config after setting active calendar
        updateFoundryCalendarConfig(calendarManager);
      } else {
        Logger.warn(`Failed to set active calendar ${activeCalendarId}, falling back to gregorian`);
        calendarManager.setActiveCalendarSync('gregorian');
        // Update Foundry calendar config with fallback
        updateFoundryCalendarConfig(calendarManager);
      }
    } catch (error) {
      Logger.error(
        'Failed to set active calendar during setup:',
        error instanceof Error ? error : new Error(String(error))
      );
      // Try to fall back to gregorian
      try {
        calendarManager.setActiveCalendarSync('gregorian');
      } catch (fallbackError) {
        Logger.error(
          'Failed to set fallback gregorian calendar:',
          fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError))
        );
      }
    }

    // Initialize time advancement service and register combat hooks
    const timeAdvancementService = TimeAdvancementService.getInstance();
    timeAdvancementService.initialize();

    // Create EventsAPI instance for use in hooks (with visibility filtering)
    eventsAPI = new EventsAPI(() => calendarManager.getActiveEventsManager());

    // Reset seasons warning flag when calendar changes
    // Event occurrence hook integration - fires when events occur on the current date
    Hooks.on('seasons-stars:calendarChanged', () => {
      resetSeasonsWarningState();
      // Reset event check date when calendar changes to allow events to fire on new calendar
      lastEventCheckDate = null;
      // Update Foundry calendar config when active calendar changes
      updateFoundryCalendarConfig(calendarManager);
    });

    Hooks.on(
      'seasons-stars:dateChanged',
      (data: { newDate: ICalendarDate; oldTime: number; newTime: number; delta: number }) => {
        const newDate = {
          year: data.newDate.year,
          month: data.newDate.month,
          day: data.newDate.day,
        };

        // Check if day actually changed (ignore time-of-day changes)
        const dayChanged =
          !lastEventCheckDate ||
          lastEventCheckDate.year !== newDate.year ||
          lastEventCheckDate.month !== newDate.month ||
          lastEventCheckDate.day !== newDate.day;

        if (!dayChanged) {
          return; // Same day, no need to check events
        }

        const previousDate = lastEventCheckDate ? { ...lastEventCheckDate } : undefined;
        lastEventCheckDate = { ...newDate };

        // Get events for the new date with visibility filtering
        const events = eventsAPI.getEventsForDate(newDate.year, newDate.month, newDate.day);

        // Only fire hook if there are events
        if (events.length > 0) {
          Hooks.callAll('seasons-stars:eventOccurs', {
            events,
            date: newDate,
            isStartup: false,
            previousDate,
          });
        }
      }
    );

    // Initialize notes manager synchronously
    try {
      notesManager.initializeSync();
      Logger.debug('Notes manager initialized synchronously during setup');
    } catch (error) {
      Logger.error(
        'Failed to initialize notes manager synchronously:',
        error instanceof Error ? error : new Error(String(error))
      );
      // Continue - notes functionality may be limited but API will still work
    }

    // Register notes cleanup hooks for external journal deletion
    registerNotesCleanupHooks();

    // Register with Memory Mage if available
    registerMemoryMageIntegration();

    // CRITICAL: Expose fully functional API - calendar and time converter should be ready now
    setupAPI();

    // Register UI component hooks
    CalendarWidget.registerHooks();
    CalendarMiniWidget.registerHooks();
    CalendarGridWidget.registerHooks();
    CalendarMiniWidget.registerSmallTimeIntegration();

    // Register widget factories for CalendarWidgetManager
    Logger.debug('Registering widget factories');
    CalendarWidgetManager.registerWidget(
      'main',
      () => new WidgetWrapper(CalendarWidget, 'show', 'hide', 'toggle', 'getInstance', 'rendered')
    );
    CalendarWidgetManager.registerWidget(
      'mini',
      () =>
        new WidgetWrapper(CalendarMiniWidget, 'show', 'hide', 'toggle', 'getInstance', 'rendered')
    );
    CalendarWidgetManager.registerWidget(
      'grid',
      () =>
        new WidgetWrapper(CalendarGridWidget, 'show', 'hide', 'toggle', 'getInstance', 'rendered')
    );

    // Scene controls registered at top level for timing requirements
    Logger.debug('Registering macros');
    SeasonsStarsSceneControls.registerMacros();

    // Fire ready hook for compatibility modules - API is now fully functional
    Hooks.callAll('seasons-stars:ready', {
      manager: calendarManager,
      api: game.seasonsStars?.api,
    });

    Logger.info(
      'Core module fully initialized synchronously during setup - API ready for compatibility modules'
    );
  } catch (error) {
    Logger.error('Module setup failed:', error instanceof Error ? error : new Error(String(error)));
  }
}

Hooks.once('setup', setup);

/**
 * Complete setup after Foundry is ready
 * Core functionality and API are already available, now complete calendar selection
 */
Hooks.once('ready', async () => {
  Logger.debug('Completing setup during ready - setting active calendar from settings');

  // Register defaultWidget setting now that all modules have initialized
  // This allows custom widgets registered by other modules to appear in choices
  registerDefaultWidgetSetting();

  // Migration: Cache existing active calendar data for synchronous loading
  // This is needed for users upgrading to the new settings-based caching system
  try {
    const activeCalendarId = game.settings?.get('seasons-and-stars', 'activeCalendar') as string;
    const cachedCalendarData = game.settings?.get(
      'seasons-and-stars',
      'activeCalendarData'
    ) as SeasonsStarsCalendar | null;

    // If we have an active calendar but no cached data, show migration dialog
    if (
      activeCalendarId &&
      !cachedCalendarData &&
      calendarManager.calendars.has(activeCalendarId)
    ) {
      const calendarData = calendarManager.calendars.get(activeCalendarId);
      if (calendarData && game.user?.isGM) {
        // Show migration dialog to GM
        const confirmed = await new Promise<boolean>(resolve => {
          const dialog = new foundry.applications.api.DialogV2({
            window: {
              title: 'Seasons & Stars: Calendar Data Migration',
            },
            content: `
              <h3>Calendar Data Migration Required</h3>
              <p>Seasons & Stars has been updated to improve compatibility with other calendar modules.</p>
              <p>This requires migrating your current calendar data to a new storage format.</p>
              <p><strong>This migration is safe and will not affect your calendar configuration.</strong></p>
              <p><em>A reload will be required after migration to activate compatibility improvements.</em></p>
              <p>Would you like to proceed with the migration now?</p>
            `,
            buttons: [
              {
                action: 'yes',
                icon: 'fas fa-check',
                label: 'Migrate Now',
                callback: () => resolve(true),
              },
              {
                action: 'no',
                icon: 'fas fa-times',
                label: 'Cancel',
                callback: () => resolve(false),
              },
            ],
            default: 'yes',
            close: () => resolve(false),
          });
          dialog.render(true);
        });

        if (confirmed) {
          await game.settings.set('seasons-and-stars', 'activeCalendarData', calendarData);
          Logger.info(`Migration: Successfully cached calendar data for ${activeCalendarId}`);

          // Log calendar data structure for debugging
          Logger.debug('Calendar data structure:', calendarData);

          const calendarName = calendarData.name || calendarData.id || 'Unknown Calendar';
          ui.notifications?.info(
            `Calendar data migration completed for "${calendarName}". Please reload Foundry for compatibility improvements to take effect.`
          );
        } else {
          Logger.warn('Migration declined by user - calendar data not cached');
          ui.notifications?.warn(
            'Calendar data migration was declined. Some compatibility features may not work until migration is completed.'
          );
        }
      } else if (calendarData && !game.user?.isGM) {
        // Non-GM users just see a notification
        Logger.debug(`Migration needed for ${activeCalendarId} but user is not GM`);
        ui.notifications?.info(
          'A GM needs to complete a calendar data migration for full compatibility with other modules.'
        );
      }
    }
  } catch (error) {
    Logger.warn(
      'Migration failed to cache calendar data:',
      error instanceof Error ? error : new Error(String(error))
    );
    ui.notifications?.error(
      'Calendar data migration failed. Please check the console for details.'
    );
  }

  // Complete calendar manager initialization (read settings and set active calendar)
  // This must happen during ready hook since it sets world-level settings
  await calendarManager.completeInitialization();

  // Check for events on startup (fire hook if current date has events)
  try {
    const currentDate = calendarManager.getCurrentDate();
    if (currentDate) {
      // Get events for current date with visibility filtering
      const events = eventsAPI.getEventsForDate(
        currentDate.year,
        currentDate.month,
        currentDate.day
      );

      if (events.length > 0) {
        Hooks.callAll('seasons-stars:eventOccurs', {
          events,
          date: {
            year: currentDate.year,
            month: currentDate.month,
            day: currentDate.day,
          },
          isStartup: true,
          // No previousDate on startup
        });

        // Update lastEventCheckDate to prevent duplicate hook fire on first dateChanged
        lastEventCheckDate = {
          year: currentDate.year,
          month: currentDate.month,
          day: currentDate.day,
        };
      }
    }
  } catch (error) {
    Logger.warn(
      'Failed to check for events on startup:',
      error instanceof Error ? error : new Error(String(error))
    );
  }

  // Show default widget if enabled in settings
  if (game.settings?.get('seasons-and-stars', 'showTimeWidget')) {
    const settingValue = game.settings?.get('seasons-and-stars', 'defaultWidget');
    const defaultWidget = getSafeDefaultWidgetOption(settingValue);
    const targetWidget = getTargetWidgetType(defaultWidget, 'show');

    if (targetWidget) {
      CalendarWidgetManager.showWidget(targetWidget);
    }
    // If targetWidget is null (for 'none' setting), don't show any widget
  }

  // Show deprecation warning to GMs
  await CalendarDeprecationDialog.showWarningIfNeeded();

  Logger.info('UI setup complete - module fully ready');

  // Signal that core module is ready for integrations
  Hooks.callAll('seasons-and-stars.ready');
});

/**
 * Register module settings
 */
function registerSettings(): void {
  if (!game.settings) return;

  // === CORE CALENDAR SETTINGS ===

  // Calendar selection menu - opens dialog to browse and select calendars
  game.settings.registerMenu('seasons-and-stars', 'calendarSelectionMenu', {
    name: 'SEASONS_STARS.settings.calendar_selection',
    label: 'SEASONS_STARS.settings.select_calendar_button',
    hint: 'SEASONS_STARS.settings.calendar_selection_hint',
    icon: 'fa-solid fa-calendar-alt',
    type: CalendarSelectionDialog,
    restricted: true, // GM only
  });

  // Calendar setting - hidden from UI, managed via dialog
  game.settings.register('seasons-and-stars', 'activeCalendar', {
    name: 'SEASONS_STARS.settings.active_calendar',
    hint: 'SEASONS_STARS.settings.active_calendar_hint',
    scope: 'world',
    config: false, // Hidden from settings UI - use menu button instead
    type: String,
    default: 'gregorian',
    onChange: async (value: string) => {
      if (value && value.trim() !== '' && calendarManager) {
        await handleCalendarSelection(value, calendarManager);
      }
    },
  });

  // Store the full calendar JSON for the active calendar (for synchronous loading)
  game.settings.register('seasons-and-stars', 'activeCalendarData', {
    name: 'Active Calendar Data',
    hint: 'Cached calendar data for immediate loading',
    scope: 'world',
    config: false, // Hidden setting
    type: Object,
    default: null,
    onChange: async (calendarData: unknown) => {
      // When calendar data changes, reload it for all clients without page refresh
      if (calendarData && calendarManager) {
        const calendar = calendarData as SeasonsStarsCalendar;
        Logger.debug('Calendar data changed, reloading calendar:', calendar.id);

        // Always ensure calendar is loaded (loadCalendar is idempotent)
        const sourceInfo: CalendarSourceInfo = {
          type: 'builtin',
          sourceName: 'Seasons & Stars',
          description: 'Built-in calendar from settings update',
          icon: 'fa-solid fa-calendar',
        };

        // Non-GMs should only load the calendar data, not try to set it as active
        // The active calendar will be set by the GM's settings change
        const loadSuccess = calendarManager.loadCalendar(calendar, sourceInfo);

        if (loadSuccess) {
          // Set it as active (don't save to settings again to avoid loop)
          await calendarManager.setActiveCalendar(calendar.id, false);
        }
      }
    },
  });

  // File picker calendar setting - allows users to load custom calendar files
  game.settings.register('seasons-and-stars', 'activeCalendarFile', {
    name: 'SEASONS_STARS.settings.active_calendar_file',
    hint: 'SEASONS_STARS.settings.active_calendar_file_hint',
    scope: 'world',
    config: false, // Hidden from settings UI - managed through dialog
    type: String,
    default: '',
    onChange: async (value: string) => {
      // File picker setting stores the path, but actual loading happens when user clicks "Select" in dialog
      // This ensures the user can preview and confirm their selection before the calendar is activated
      Logger.debug('File picker path updated:', value);
    },
  });

  // === WIDGET DISPLAY SETTINGS ===

  game.settings.register('seasons-and-stars', 'showTimeWidget', {
    name: 'Auto-Show Default Widget',
    hint: 'Automatically show the default calendar widget when the world loads. You can still manually open/close widgets using scene controls or keyboard shortcuts.',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
    onChange: (enabled: boolean) => {
      if (enabled) {
        // Show the default widget
        const defaultWidget = game.settings?.get('seasons-and-stars', 'defaultWidget') || 'main';
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
        Logger.info(`Showing default widget: ${defaultWidget}`);
      } else {
        // Hide all widgets
        CalendarWidget.hide();
        CalendarMiniWidget.hide();
        CalendarGridWidget.hide();
        Logger.info('Hiding all calendar widgets');
      }
    },
  });

  game.settings.register('seasons-and-stars', 'miniWidgetShowTime', {
    name: 'Display Time in Mini Widget',
    hint: 'Show the current time alongside date in the mini calendar widget',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false,
    onChange: () => {
      Hooks.callAll('seasons-stars:settingsChanged', 'miniWidgetShowTime');
    },
  });

  game.settings.register('seasons-and-stars', 'miniWidgetShowDayOfWeek', {
    name: 'Display Day of Week in Mini Widget',
    hint: 'Show abbreviated day name on the left side of the mini calendar widget',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false,
    onChange: () => {
      Hooks.callAll('seasons-stars:settingsChanged', 'miniWidgetShowDayOfWeek');
    },
  });

  game.settings.register('seasons-and-stars', 'miniWidgetPosition', {
    name: 'Mini Widget Position',
    scope: 'client',
    config: false,
    type: Object,
    default: { top: null, left: null },
  });

  game.settings.register('seasons-and-stars', 'miniWidgetPinned', {
    name: 'Mini Widget Pinned',
    scope: 'client',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register('seasons-and-stars', 'miniWidgetCanonicalMode', {
    name: 'Canonical Hours Display Mode',
    hint: 'How to display time when canonical hours are available: Auto (canonical hours when available, exact time otherwise), Canonical Only (hide time when no canonical hour), or Exact Time (always show exact time)',
    scope: 'client',
    config: true,
    type: String,
    choices: {
      auto: 'Auto (canonical or exact)',
      canonical: 'Canonical hours only',
      exact: 'Exact time only',
    },
    default: 'auto',
    onChange: () => {
      Hooks.callAll('seasons-stars:settingsChanged', 'miniWidgetCanonicalMode');
    },
  });

  game.settings.register('seasons-and-stars', 'miniWidgetShowMoonPhases', {
    name: 'Display Moon Phases in Mini Widget',
    hint: 'Show moon phase icons for all moons in the current calendar below the date',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
    onChange: () => {
      Hooks.callAll('seasons-stars:settingsChanged', 'miniWidgetShowMoonPhases');
    },
  });

  game.settings.register('seasons-and-stars', SETTINGS_KEYS.MINI_WIDGET_SHOW_SUNRISE_SUNSET, {
    name: 'Display Sunrise/Sunset in Mini Widget',
    hint: 'Show sunrise and sunset times for the current date',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
    onChange: () => {
      Hooks.callAll('seasons-stars:settingsChanged', SETTINGS_KEYS.MINI_WIDGET_SHOW_SUNRISE_SUNSET);
    },
  });

  game.settings.register('seasons-and-stars', 'miniWidgetShowExtensions', {
    name: 'Display Extension Buttons in Mini Widget',
    hint: 'Show extension buttons added by other modules in the mini widget footer',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
    onChange: () => {
      Hooks.callAll('seasons-stars:settingsChanged', 'miniWidgetShowExtensions');
    },
  });

  game.settings.register('seasons-and-stars', SETTINGS_KEYS.MINI_WIDGET_SHOW_YEAR, {
    name: 'Display Year in Mini Widget',
    scope: 'client',
    config: false,
    type: Boolean,
    default: false,
    onChange: () => {
      Hooks.callAll('seasons-stars:settingsChanged', SETTINGS_KEYS.MINI_WIDGET_SHOW_YEAR);
    },
  });

  // Note: defaultWidget setting is registered later in registerDefaultWidgetSetting()
  // called from ready hook to include custom registered widgets

  game.settings.register('seasons-and-stars', 'calendarClickBehavior', {
    name: 'Calendar Click Behavior',
    hint: 'Choose what happens when you click on a date in the calendar grid. "Set Current Date" immediately changes the world time (current behavior). "View Date Details" shows date information and flavor text without changing the date.',
    scope: 'client',
    config: true,
    type: String,
    default: 'setDate',
    choices: {
      setDate: 'Set Current Date',
      viewDetails: 'View Date Details',
    },
  });

  // === QUICK TIME BUTTONS SETTINGS ===

  game.settings.register('seasons-and-stars', 'quickTimeButtons', {
    name: 'Quick Time Buttons',
    hint: 'Comma-separated time values for quick advancement buttons. Supports: 15, 30m, 1h, 2d, 1w. Negative values go backward. Examples: "10,30,60" or "-1h,15m,30m,1h"',
    scope: 'world',
    config: true,
    type: String,
    default: UI_CONSTANTS.DEFAULT_QUICK_TIME_BUTTONS.join(','),
    onChange: () => {
      // Trigger widget refresh when settings change
      try {
        if (game.seasonsStars?.manager) {
          Hooks.callAll('seasons-stars:settingsChanged', 'quickTimeButtons');
        }
      } catch (error) {
        Logger.warn('Failed to trigger quick time buttons settings refresh:', error);
      }
    },
  });

  game.settings.register('seasons-and-stars', 'miniWidgetQuickTimeButtons', {
    name: 'Mini Widget Quick Time Buttons',
    hint: 'Specific buttons for mini widget (uses same syntax as main buttons). Leave empty to auto-select from main buttons. Example: "15,60" to show only 15 minutes and 1 hour buttons.',
    scope: 'world',
    config: true,
    type: String,
    default: '',
    onChange: () => {
      try {
        if (game.seasonsStars?.manager) {
          Hooks.callAll('seasons-stars:settingsChanged', 'miniWidgetQuickTimeButtons');
        }
      } catch (error) {
        Logger.warn('Failed to trigger mini widget buttons settings refresh:', error);
      }
    },
  });

  game.settings.register('seasons-and-stars', 'alwaysShowQuickTimeButtons', {
    name: 'Always Display Quick Time Buttons',
    hint: 'Display quick time buttons in widgets even when SmallTime is available. Useful if you prefer S&S time controls over SmallTime.',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false,
    onChange: () => {
      Hooks.callAll('seasons-stars:settingsChanged', 'alwaysShowQuickTimeButtons');
    },
  });

  // === TIME ADVANCEMENT SETTINGS ===

  game.settings.register('seasons-and-stars', 'timeAdvancementRatio', {
    name: 'Time Advancement Ratio',
    hint: 'Controls how fast game time progresses relative to real time. Examples: 1.0 = real time (1 real second = 1 game second), 2.0 = accelerated (1 real second = 2 game seconds), 0.5 = slow motion (2 real seconds = 1 game second). Higher values make time pass faster in-game.',
    scope: 'world',
    config: true,
    type: Number,
    default: 1.0,
    range: {
      min: 0.1,
      max: 100.0,
      step: 0.1,
    },
    onChange: (value: number) => {
      try {
        const service = TimeAdvancementService.getInstance();
        service.updateRatio(value);
      } catch (error) {
        Logger.warn('Failed to update time advancement ratio:', error);
      }
    },
  });

  game.settings.register('seasons-and-stars', 'realTimeAdvancementInterval', {
    name: 'Real-Time Advancement Interval',
    hint: 'How often (in seconds) the game time is updated when real-time advancement is active. Lower values = smoother time progression but higher CPU usage. Higher values = less frequent updates but better performance. Recommended: 10 seconds for most games, 5 seconds for precision timing, 30+ seconds for slow computers.',
    scope: 'world',
    config: true,
    type: Number,
    range: {
      min: 1,
      max: 300,
      step: 1,
    },
    default: 10,
  });

  game.settings.register('seasons-and-stars', 'pauseOnCombat', {
    name: 'Pause Time on Combat',
    hint: 'Automatically pause time advancement when combat starts',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register('seasons-and-stars', 'resumeAfterCombat', {
    name: 'Resume Time After Combat',
    hint: 'Automatically resume time advancement when combat ends (if it was running before)',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register('seasons-and-stars', 'syncWithGamePause', {
    name: 'Sync with Game Pause',
    hint: "Automatically pause time advancement when Foundry's game is paused. Works alongside combat pause setting. Time will resume when ALL blocking conditions are cleared.",
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });

  // === NOTES SYSTEM SETTINGS ===

  game.settings.register('seasons-and-stars', 'allowPlayerNotes', {
    name: 'Allow Player Notes',
    hint: 'Allow players to create calendar notes',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register('seasons-and-stars', 'defaultPlayerVisible', {
    name: 'Default Player Visibility',
    hint: 'Make new notes visible to players by default',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register('seasons-and-stars', 'defaultPlayerEditable', {
    name: 'Default Player Editable',
    hint: 'Make new notes editable by players by default',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
  });

  // === EVENTS SYSTEM SETTINGS ===

  // World-level event customizations (GM additions, overrides, disabled events)
  game.settings.register('seasons-and-stars', 'worldEvents', {
    name: 'World Events',
    hint: 'GM customizations for calendar events (hidden setting, managed via API)',
    scope: 'world',
    config: false, // Hidden - managed programmatically
    type: Object,
    default: {
      events: [],
      disabledEventIds: [],
    },
    onChange: (value: unknown) => {
      // Notify that world events have changed
      Hooks.callAll('seasons-stars:worldEventsChanged', value);
    },
  });

  // === GENERAL UI SETTINGS ===

  game.settings.register('seasons-and-stars', 'showNotifications', {
    name: 'Show Notifications',
    hint: 'Display warning and error notifications in the UI',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
  });

  // === INTERNAL SETTINGS (Hidden from UI) ===

  // Note categories configuration - stored as Object for complex data
  game.settings.register('seasons-and-stars', 'noteCategories', {
    name: 'Note Categories Configuration',
    hint: 'Configuration for note categories and tags',
    scope: 'world',
    config: false, // Not shown in config UI, managed by category system
    type: Object,
    default: null,
  });

  // External calendar settings
  game.settings.register('seasons-and-stars', 'seasons-stars.external-calendars', {
    name: 'External Calendar Cache',
    hint: 'Internal cache storage for external calendars',
    scope: 'world',
    config: false, // Hidden from config UI
    type: Object,
    default: {},
  });

  game.settings.register('seasons-and-stars', 'seasons-stars.external-sources', {
    name: 'External Calendar Sources',
    hint: 'Configuration for external calendar sources',
    scope: 'world',
    config: false, // Hidden from config UI
    type: Array,
    default: [],
  });

  // Hidden world settings for internal tracking
  game.settings.register('seasons-and-stars', 'calendarDeprecationWarningShown', {
    name: 'Calendar Deprecation Warning Shown',
    hint: 'Internal setting to track if the GM has dismissed the calendar deprecation warning',
    scope: 'world',
    config: false, // Hidden from config UI
    type: Boolean,
    default: false,
  });

  // === DEVELOPMENT SETTINGS ===

  game.settings.register('seasons-and-stars', 'debugMode', {
    name: 'Debug Mode',
    hint: 'Enable debug logging for troubleshooting (developers only)',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false,
  });
}

/**
 * Register defaultWidget setting with dynamic choices including custom widgets
 * Called from ready hook after all modules have initialized
 */
function registerDefaultWidgetSetting(): void {
  if (!game.settings) return;

  // Build choices including any custom registered widgets
  const widgetChoices: Record<string, string> = {
    none: 'SEASONS_STARS.settings.default_widget_none',
    main: 'SEASONS_STARS.settings.default_widget_main',
    mini: 'SEASONS_STARS.settings.default_widget_mini',
    grid: 'SEASONS_STARS.settings.default_widget_grid',
  };

  // Add any custom registered widgets
  const registeredTypes = CalendarWidgetManager.getRegisteredTypes();
  for (const type of registeredTypes) {
    // Skip built-in types
    if (type !== 'main' && type !== 'mini' && type !== 'grid') {
      // Use capitalized type name as label (custom modules can provide i18n if needed)
      widgetChoices[type] = type.charAt(0).toUpperCase() + type.slice(1);
    }
  }

  Logger.debug('Registering defaultWidget setting with choices', { widgetChoices });

  game.settings.register('seasons-and-stars', 'defaultWidget', {
    name: 'SEASONS_STARS.settings.default_widget',
    hint: 'SEASONS_STARS.settings.default_widget_hint',
    scope: 'client',
    config: true,
    type: String,
    default: 'main',
    choices: widgetChoices,
  });
}

/**
 * Setup the main Seasons & Stars API
 */
export function setupAPI(): void {
  const api: SeasonsStarsAPI = {
    /**
     * Get the current calendar date from the active or specified calendar
     *
     * This is the primary method for retrieving the current game date. It converts
     * the current world time to a structured calendar date object with full date
     * and time information.
     *
     * @param calendarId Optional calendar ID to get date from specific calendar
     * @returns The current calendar date or null if unavailable
     * @throws {Error} If calendar validation fails or calendar not found
     *
     * @example Basic usage - get current date
     * ```javascript
     * // Get current date from active calendar
     * const currentDate = game.seasonsStars.api.getCurrentDate();
     *
     * if (currentDate) {
     *   console.log(`Current date: ${currentDate.year}-${currentDate.month}-${currentDate.day}`);
     *   console.log(`Time: ${currentDate.time?.hour}:${currentDate.time?.minute}`);
     * }
     * ```
     *
     * @example Weather module integration
     * ```javascript
     * class WeatherModule {
     *   updateWeatherDisplay() {
     *     const date = game.seasonsStars.api.getCurrentDate();
     *
     *     if (!date) {
     *       console.warn('No date available for weather calculation');
     *       return;
     *     }
     *
     *     const season = this.calculateSeason(date);
     *     const weather = this.generateWeather(season, date);
     *     this.displayWeather(weather);
     *   }
     * }
     * ```
     *
     * @example Journal entry with current date
     * ```javascript
     * async function createTimestampedEntry(title, content) {
     *   const currentDate = game.seasonsStars.api.getCurrentDate();
     *
     *   if (!currentDate) {
     *     throw new Error('Cannot create timestamped entry: no date available');
     *   }
     *
     *   const formattedDate = game.seasonsStars.api.formatDate(currentDate, {
     *     includeTime: true,
     *     format: 'long'
     *   });
     *
     *   const timestampedContent = `**${formattedDate}**\n\n${content}`;
     *
     *   return await JournalEntry.create({
     *     name: `${title} - ${formattedDate}`,
     *     content: timestampedContent
     *   });
     * }
     * ```
     */
    getCurrentDate: (calendarId?: string): ICalendarDate | null => {
      try {
        Logger.api('getCurrentDate', { calendarId });

        // Input validation using utility
        ValidationUtils.validateCalendarId(calendarId);

        if (calendarId) {
          // Get date from specific calendar
          const calendar = calendarManager.getCalendar(calendarId);
          const engine = calendarManager.getActiveEngine();

          if (!calendar || !engine) {
            const error = new Error(`Calendar not found: ${calendarId}`);
            Logger.error('Calendar not found in getCurrentDate', error);
            throw error;
          }

          const worldTime = game.time?.worldTime || 0;
          const result = engine.worldTimeToDate(worldTime);
          Logger.api('getCurrentDate', { calendarId }, result);
          return result;
        }

        // Get date from active calendar
        const currentDate = calendarManager.getCurrentDate();
        if (!currentDate) {
          Logger.warn('No current date available from calendar manager');
          return null;
        }

        const result = currentDate;
        Logger.api('getCurrentDate', undefined, result.toObject());
        return result;
      } catch (error) {
        Logger.error(
          'Failed to get current date',
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    },

    setCurrentDate: async (date: ICalendarDate): Promise<boolean> => {
      try {
        Logger.api('setCurrentDate', { date });

        // Input validation
        if (!date || typeof date !== 'object') {
          const error = new Error('Date must be a valid CalendarDate object');
          Logger.error('Invalid date parameter', error);
          throw error;
        }

        if (
          typeof date.year !== 'number' ||
          typeof date.month !== 'number' ||
          typeof date.day !== 'number'
        ) {
          const error = new Error('Date must have numeric year, month, and day properties');
          Logger.error('Invalid date structure', error);
          throw error;
        }

        await calendarManager.setCurrentDate(date);
        Logger.api('setCurrentDate', { date }, 'success');
        return true;
      } catch (error) {
        Logger.error(
          'Failed to set current date',
          error instanceof Error ? error : new Error(String(error))
        );
        return false;
      }
    },

    advanceTime: async (amount: number, unit: string): Promise<void> => {
      try {
        Logger.api('advanceTime', { amount, unit });

        // Input validation using utilities
        ValidationUtils.validateFiniteNumber(amount, 'amount');
        ValidationUtils.validateString(unit, 'unit', false); // Don't allow empty strings

        // Route to appropriate method based on unit
        switch (unit.toLowerCase()) {
          case 'day':
          case 'days':
            await calendarManager.advanceDays(amount);
            break;
          case 'hour':
          case 'hours':
            await calendarManager.advanceHours(amount);
            break;
          case 'minute':
          case 'minutes':
            await calendarManager.advanceMinutes(amount);
            break;
          case 'week':
          case 'weeks':
            await calendarManager.advanceWeeks(amount);
            break;
          case 'month':
          case 'months':
            await calendarManager.advanceMonths(amount);
            break;
          case 'year':
          case 'years':
            await calendarManager.advanceYears(amount);
            break;
          default: {
            const error = new Error(`Unsupported time unit: ${unit}`);
            Logger.error('Unsupported time unit', error);
            throw error;
          }
        }

        Logger.api('advanceTime', { amount, unit }, 'success');
      } catch (error) {
        Logger.error(
          'Failed to advance time',
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    },

    /**
     * Advance world time by specified number of days
     *
     * This method advances the game world time by the specified number of days,
     * taking into account the current calendar's day length and structure.
     * The advancement triggers the dateChanged hook for other modules.
     *
     * @param days Number of days to advance (can be negative to go backward)
     * @param calendarId Optional calendar ID (reserved for future use)
     * @throws {Error} If days is not a valid finite number
     * @throws {Error} If calendar operations fail
     *
     * @example Basic time advancement
     * ```javascript
     * // Advance one day
     * await game.seasonsStars.api.advanceDays(1);
     * console.log('Advanced to next day');
     *
     * // Go back three days
     * await game.seasonsStars.api.advanceDays(-3);
     * console.log('Went back 3 days');
     * ```
     *
     * @example Long rest implementation
     * ```javascript
     * class RestModule {
     *   async performLongRest(actor) {
     *     try {
     *       // Advance 8 hours for long rest
     *       await game.seasonsStars.api.advanceHours(8);
     *
     *       // Heal the actor
     *       await this.healActor(actor);
     *
     *       ui.notifications.info('Long rest completed - 8 hours passed');
     *     } catch (error) {
     *       ui.notifications.error('Failed to complete long rest');
     *       console.error(error);
     *     }
     *   }
     * }
     * ```
     *
     * @example Travel time calculation
     * ```javascript
     * async function simulateTravel(distanceMiles, speedMPH = 25) {
     *   const travelHours = distanceMiles / speedMPH;
     *   const travelDays = Math.ceil(travelHours / 8); // 8 hours travel per day
     *
     *   const startDate = game.seasonsStars.api.getCurrentDate();
     *
     *   await game.seasonsStars.api.advanceDays(travelDays);
     *
     *   const endDate = game.seasonsStars.api.getCurrentDate();
     *
     *   ui.notifications.info(
     *     `Travel completed! Departed ${startDate?.day}/${startDate?.month}, ` +
     *     `arrived ${endDate?.day}/${endDate?.month}`
     *   );
     * }
     * ```
     *
     * @fires seasons-stars:dateChanged When time advancement completes
     */
    advanceDays: async (days: number, calendarId?: string): Promise<void> => {
      return APIWrapper.wrapAPIMethod(
        'advanceDays',
        { days, calendarId },
        params => {
          const p = APIWrapper.extractParams(params);
          APIWrapper.validateNumber(p.days, 'Days');
          APIWrapper.validateCalendarId(p.calendarId as string | undefined);
        },
        () => calendarManager.advanceDays(days)
      );
    },

    advanceHours: async (hours: number, calendarId?: string): Promise<void> => {
      return APIWrapper.wrapAPIMethod(
        'advanceHours',
        { hours, calendarId },
        params => {
          const p = APIWrapper.extractParams(params);
          APIWrapper.validateNumber(p.hours, 'Hours');
          APIWrapper.validateCalendarId(p.calendarId as string | undefined);
        },
        () => calendarManager.advanceHours(hours)
      );
    },

    advanceMinutes: async (minutes: number, calendarId?: string): Promise<void> => {
      return APIWrapper.wrapAPIMethod(
        'advanceMinutes',
        { minutes, calendarId },
        params => {
          const p = APIWrapper.extractParams(params);
          APIWrapper.validateNumber(p.minutes, 'Minutes');
          APIWrapper.validateCalendarId(p.calendarId as string | undefined);
        },
        () => calendarManager.advanceMinutes(minutes)
      );
    },

    advanceWeeks: async (weeks: number, calendarId?: string): Promise<void> => {
      return APIWrapper.wrapAPIMethod(
        'advanceWeeks',
        { weeks, calendarId },
        params => {
          const p = APIWrapper.extractParams(params);
          APIWrapper.validateNumber(p.weeks, 'Weeks');
          APIWrapper.validateCalendarId(p.calendarId as string | undefined);
        },
        () => calendarManager.advanceWeeks(weeks)
      );
    },

    advanceMonths: async (months: number, calendarId?: string): Promise<void> => {
      return APIWrapper.wrapAPIMethod(
        'advanceMonths',
        { months, calendarId },
        params => {
          const p = APIWrapper.extractParams(params);
          APIWrapper.validateNumber(p.months, 'Months');
          APIWrapper.validateCalendarId(p.calendarId as string | undefined);
        },
        () => calendarManager.advanceMonths(months)
      );
    },

    advanceYears: async (years: number, calendarId?: string): Promise<void> => {
      return APIWrapper.wrapAPIMethod(
        'advanceYears',
        { years, calendarId },
        params => {
          const p = APIWrapper.extractParams(params);
          APIWrapper.validateNumber(p.years, 'Years');
          APIWrapper.validateCalendarId(p.calendarId as string | undefined);
        },
        () => calendarManager.advanceYears(years)
      );
    },

    formatDate: (date: ICalendarDate, options?: DateFormatOptions): string => {
      try {
        Logger.api('formatDate', { date, options });

        // Input validation using APIWrapper helpers
        APIWrapper.validateCalendarDate(date, 'Date');

        const activeCalendar = calendarManager.getActiveCalendar();
        if (!activeCalendar) {
          throw new Error('No active calendar set');
        }

        const calendarDate = new CalendarDate(date, activeCalendar);
        const result = calendarDate.format(options);
        Logger.api('formatDate', { date, options }, result);
        return result;
      } catch (error) {
        Logger.error(
          'Failed to format date',
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    },

    dateToWorldTime: (date: CalendarDate, calendarId?: string): number => {
      try {
        Logger.api('dateToWorldTime', { date, calendarId });

        // Input validation using APIWrapper helpers
        APIWrapper.validateCalendarDate(date, 'Date');
        APIWrapper.validateOptionalString(calendarId, 'Calendar ID');

        const engine = calendarId
          ? calendarManager.engines?.get(calendarId)
          : calendarManager.getActiveEngine();

        if (!engine) {
          throw new Error(`No engine available for calendar: ${calendarId || 'active'}`);
        }

        const result = engine.dateToWorldTime(date);
        Logger.api(
          'dateToWorldTime',
          {
            date:
              'toObject' in date && typeof date.toObject === 'function' ? date.toObject() : date,
            calendarId,
          },
          result
        );
        return result;
      } catch (error) {
        Logger.error(
          'Failed to convert date to world time',
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    },

    worldTimeToDate: (timestamp: number, calendarId?: string): CalendarDate => {
      try {
        Logger.api('worldTimeToDate', { timestamp, calendarId });

        // Input validation using APIWrapper helpers
        APIWrapper.validateNumber(timestamp, 'Timestamp');
        APIWrapper.validateOptionalString(calendarId, 'Calendar ID');

        const engine = calendarId
          ? calendarManager.engines?.get(calendarId)
          : calendarManager.getActiveEngine();

        if (!engine) {
          throw new Error(`No engine available for calendar: ${calendarId || 'active'}`);
        }

        const result = engine.worldTimeToDate(timestamp);
        Logger.api('worldTimeToDate', { timestamp, calendarId }, result);
        return result;
      } catch (error) {
        Logger.error(
          'Failed to convert world time to date',
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    },

    getActiveCalendar: () => {
      try {
        Logger.api('getActiveCalendar');
        const result = calendarManager.getActiveCalendar();
        Logger.api('getActiveCalendar', undefined, result?.id || 'none');
        return result;
      } catch (error) {
        Logger.error(
          'Failed to get active calendar',
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    },

    setActiveCalendar: async (calendarId: string): Promise<void> => {
      try {
        Logger.api('setActiveCalendar', { calendarId });

        // Input validation
        if (typeof calendarId !== 'string' || calendarId.trim() === '') {
          const error = new Error('Calendar ID must be a non-empty string');
          Logger.error('Invalid calendar ID parameter', error);
          throw error;
        }

        // API calls are typically user-initiated (macros, scripts, console commands)
        await calendarManager.setActiveCalendar(calendarId, true, 'user-change');
        Logger.api('setActiveCalendar', { calendarId }, 'success');
      } catch (error) {
        Logger.error(
          'Failed to set active calendar',
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    },

    getAvailableCalendars: (): string[] => {
      try {
        Logger.api('getAvailableCalendars');
        const calendars = calendarManager.getAvailableCalendars();
        const result = calendars.map(calendar => calendar.id);
        Logger.api('getAvailableCalendars', undefined, result);
        return result;
      } catch (error) {
        Logger.error(
          'Failed to get available calendars',
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    },

    loadCalendar: (data: SeasonsStarsCalendar): void => {
      try {
        Logger.api('loadCalendar', { calendarId: data?.id || 'unknown' });

        // Input validation
        if (!data || typeof data !== 'object') {
          const error = new Error('Calendar data must be a valid object');
          Logger.error('Invalid calendar data parameter', error);
          throw error;
        }

        if (!data.id || typeof data.id !== 'string') {
          const error = new Error('Calendar data must have a valid id string');
          Logger.error('Invalid calendar data structure', error);
          throw error;
        }

        calendarManager.loadCalendar(data);
        Logger.api('loadCalendar', { calendarId: data.id }, 'success');
      } catch (error) {
        Logger.error(
          'Failed to load calendar',
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    },

    // Calendar metadata methods (required for compatibility bridge)
    getMonthNames: (calendarId?: string): string[] => {
      try {
        Logger.api('getMonthNames', { calendarId });

        // Input validation
        if (calendarId !== undefined && typeof calendarId !== 'string') {
          const error = new Error('Calendar ID must be a string');
          Logger.error('Invalid calendar ID parameter', error);
          throw error;
        }

        const calendar = calendarId
          ? calendarManager.getCalendar(calendarId)
          : calendarManager.getActiveCalendar();

        if (!calendar?.months) {
          Logger.warn(`No months found for calendar: ${calendarId || 'active'}`);
          return [];
        }

        const result = calendar.months.map(month => month.name);
        Logger.api('getMonthNames', { calendarId }, result);
        return result;
      } catch (error) {
        Logger.error(
          'Failed to get month names',
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    },

    getWeekdayNames: (calendarId?: string): string[] => {
      try {
        Logger.api('getWeekdayNames', { calendarId });

        // Input validation
        if (calendarId !== undefined && typeof calendarId !== 'string') {
          const error = new Error('Calendar ID must be a string');
          Logger.error('Invalid calendar ID parameter', error);
          throw error;
        }

        const calendar = calendarId
          ? calendarManager.getCalendar(calendarId)
          : calendarManager.getActiveCalendar();

        if (!calendar?.weekdays) {
          Logger.warn(`No weekdays found for calendar: ${calendarId || 'active'}`);
          return [];
        }

        const result = calendar.weekdays.map(day => day.name);
        Logger.api('getWeekdayNames', { calendarId }, result);
        return result;
      } catch (error) {
        Logger.error(
          'Failed to get weekday names',
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    },

    // Optional enhanced features (basic implementations)
    /**
     * Get sunrise and sunset times for a given date
     *
     * @param date - The calendar date to get sunrise/sunset times for
     * @param calendarId - Optional calendar ID (defaults to active calendar)
     * @returns Object containing sunrise and sunset times as **seconds from midnight**
     *          (e.g., 21600 = 6:00 AM, 64800 = 6:00 PM).
     *          Compatible with Simple Calendar's SeasonData.sunriseTime/sunsetTime format.
     *
     * @example
     * ```typescript
     * const times = api.getSunriseSunset(currentDate);
     * // returns: { sunrise: 21600, sunset: 64800 }
     * // 21600 seconds = 6 hours × 3600 seconds/hour
     * // 64800 seconds = 18 hours × 3600 seconds/hour
     * ```
     */
    getSunriseSunset: (
      date: ICalendarDate,
      calendarId?: string
    ): { sunrise: number; sunset: number } => {
      try {
        Logger.api('getSunriseSunset', { date, calendarId });

        // Input validation
        if (!date || typeof date !== 'object') {
          const error = new Error('Date must be a valid ICalendarDate object');
          Logger.error('Invalid date parameter', error);
          throw error;
        }

        if (calendarId !== undefined && typeof calendarId !== 'string') {
          const error = new Error('Calendar ID must be a string');
          Logger.error('Invalid calendar ID parameter', error);
          throw error;
        }

        // Get calendar for date conversion
        const calendar = calendarId
          ? calendarManager.getCalendar(calendarId)
          : calendarManager.getActiveCalendar();

        if (!calendar) {
          // Fallback: 6am and 6pm in seconds (6 × 3600, 18 × 3600)
          const result = { sunrise: 21600, sunset: 64800 };
          Logger.api('getSunriseSunset', { date, calendarId }, result);
          return result;
        }

        // Convert to CalendarDate
        const calendarDate = CalendarDate.fromObject(date, calendar);

        // Get calendar engine for calculations
        const engine = calendarManager.engines.get(calendar.id);
        if (!engine) {
          // Fallback: 6am and 6pm in seconds (6 × 3600, 18 × 3600)
          const result = { sunrise: 21600, sunset: 64800 };
          Logger.api('getSunriseSunset', { date, calendarId }, result);
          return result;
        }

        // Calculate sunrise/sunset times (returns seconds from midnight)
        const result = SunriseSunsetCalculator.calculate(calendarDate, calendar, engine);

        Logger.api('getSunriseSunset', { date, calendarId }, result);
        return result;
      } catch (error) {
        Logger.error(
          'Failed to get sunrise/sunset',
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    },

    getSeasonInfo: (date: ICalendarDate, calendarId?: string): { name: string; icon: string } => {
      try {
        Logger.api('getSeasonInfo', { date, calendarId });

        // Input validation
        if (!date || typeof date !== 'object') {
          const error = new Error('Date must be a valid ICalendarDate object');
          Logger.error('Invalid date parameter', error);
          throw error;
        }

        if (
          typeof date.year !== 'number' ||
          typeof date.month !== 'number' ||
          typeof date.day !== 'number'
        ) {
          const error = new Error('Date must have valid year, month, and day numbers');
          Logger.error('Invalid date structure', error);
          throw error;
        }

        if (calendarId !== undefined && typeof calendarId !== 'string') {
          const error = new Error('Calendar ID must be a string');
          Logger.error('Invalid calendar ID parameter', error);
          throw error;
        }

        const calendar = calendarId
          ? calendarManager.getCalendar(calendarId)
          : calendarManager.getActiveCalendar();

        if (
          !calendar ||
          !(calendar as SeasonsStarsCalendar).seasons ||
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          (calendar as SeasonsStarsCalendar).seasons!.length === 0
        ) {
          // Only log to console once per active calendar to prevent looping warnings
          if (!hasWarnedAboutMissingSeasons && !calendarId) {
            Logger.debug(`No seasons found for calendar: ${calendar?.id || 'active'}`);
            hasWarnedAboutMissingSeasons = true;
          }
          const result = { name: 'Unknown', icon: 'none' };
          Logger.api('getSeasonInfo', { date, calendarId }, result);
          return result;
        }

        // Basic season detection - find season containing this date
        // This is a simple implementation that can be enhanced later
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const currentSeason = (calendar as SeasonsStarsCalendar).seasons!.find(season => {
          // Simple logic: match by rough month ranges
          // This could be enhanced with proper calendar-aware season calculation
          if (season.startMonth && season.endMonth) {
            return date.month >= season.startMonth && date.month <= season.endMonth;
          }
          return false;
        });

        if (currentSeason) {
          const result = {
            name: currentSeason.name,
            icon: currentSeason.icon || currentSeason.name.toLowerCase(),
          };
          Logger.api('getSeasonInfo', { date, calendarId }, result);
          return result;
        }

        // Fallback: use first season or default
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const fallbackSeason = (calendar as SeasonsStarsCalendar).seasons![0];
        const result = {
          name: fallbackSeason?.name || 'Unknown',
          icon: fallbackSeason?.icon || fallbackSeason?.name?.toLowerCase() || 'none',
        };
        Logger.api('getSeasonInfo', { date, calendarId }, result);
        return result;
      } catch (error) {
        Logger.error(
          'Failed to get season info',
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    },

    // External Calendar Loading Methods
    loadCalendarFromUrl: async (url: string, options?: { validate?: boolean; cache?: boolean }) => {
      return APIWrapper.wrapAPIMethod(
        'loadCalendarFromUrl',
        { url, options },
        params => {
          const p = APIWrapper.extractParams(params);
          APIWrapper.validateString(p.url, 'URL');
        },
        () => calendarManager.loadCalendarFromUrl(url, options)
      );
    },

    loadCalendarCollection: async (
      url: string,
      options?: { validate?: boolean; cache?: boolean }
    ) => {
      return APIWrapper.wrapAPIMethod(
        'loadCalendarCollection',
        { url, options },
        params => {
          const p = APIWrapper.extractParams(params);
          APIWrapper.validateString(p.url, 'URL');
        },
        () => calendarManager.loadCalendarCollection(url, options)
      );
    },

    addExternalSource: (source: {
      name: string;
      url: string;
      enabled: boolean;
      type: 'calendar' | 'collection' | 'variants';
    }): string => {
      try {
        Logger.api('addExternalSource', { source });

        if (!source || typeof source !== 'object') {
          throw new Error('Source must be a valid object');
        }
        APIWrapper.validateString(source.name, 'Source name');
        APIWrapper.validateString(source.url, 'Source URL');
        if (typeof source.enabled !== 'boolean') {
          throw new Error('Source enabled must be a boolean');
        }
        if (!['calendar', 'collection', 'variants'].includes(source.type)) {
          throw new Error('Source type must be calendar, collection, or variants');
        }

        const result = calendarManager.addExternalSource(source);
        Logger.api('addExternalSource', { source }, result);
        return result;
      } catch (error) {
        Logger.error(
          'Failed to add external source',
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    },

    removeExternalSource: (sourceId: string): boolean => {
      try {
        Logger.api('removeExternalSource', { sourceId });
        APIWrapper.validateString(sourceId, 'Source ID');

        const result = calendarManager.removeExternalSource(sourceId);
        Logger.api('removeExternalSource', { sourceId }, result);
        return result;
      } catch (error) {
        Logger.error(
          'Failed to remove external source',
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    },

    getExternalSources: () => {
      try {
        Logger.api('getExternalSources');
        const result = calendarManager.getExternalSources();
        Logger.api('getExternalSources', undefined, result.length);
        return result;
      } catch (error) {
        Logger.error(
          'Failed to get external sources',
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    },

    getExternalSource: (sourceId: string) => {
      try {
        Logger.api('getExternalSource', { sourceId });
        APIWrapper.validateString(sourceId, 'Source ID');

        const result = calendarManager.getExternalSource(sourceId);
        Logger.api('getExternalSource', { sourceId }, result ? 'found' : 'not found');
        return result;
      } catch (error) {
        Logger.error(
          'Failed to get external source',
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    },

    refreshExternalCalendar: async (sourceId: string) => {
      return APIWrapper.wrapAPIMethod(
        'refreshExternalCalendar',
        { sourceId },
        params => {
          const p = APIWrapper.extractParams(params);
          APIWrapper.validateString(p.sourceId, 'Source ID');
        },
        () => calendarManager.refreshExternalCalendar(sourceId)
      );
    },

    refreshAllExternalCalendars: async () => {
      return APIWrapper.wrapAPIMethod(
        'refreshAllExternalCalendars',
        {},
        () => {},
        () => calendarManager.refreshAllExternalCalendars()
      );
    },

    clearExternalCalendarCache: (): void => {
      try {
        Logger.api('clearExternalCalendarCache');
        calendarManager.clearExternalCalendarCache();
        Logger.api('clearExternalCalendarCache', undefined, 'success');
      } catch (error) {
        Logger.error(
          'Failed to clear external calendar cache',
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    },

    // Module Calendar Loading Methods
    loadModuleCalendars: async (moduleId: string) => {
      return APIWrapper.wrapAPIMethod(
        'loadModuleCalendars',
        { moduleId },
        params => {
          const p = APIWrapper.extractParams(params);
          APIWrapper.validateString(p.moduleId, 'Module ID');
        },
        () => calendarManager.loadModuleCalendars(moduleId)
      );
    },

    /**
     * Validate calendar JSON data using the schema validator
     *
     * @param calendarData The calendar data to validate
     * @returns Promise<ValidationResult> with validation results
     * @throws {Error} If validation setup fails
     *
     * @example
     * ```javascript
     * const result = await game.seasonsStars.api.validateCalendar(calendarData);
     * if (result.isValid) {
     *   console.log('Calendar is valid');
     * } else {
     *   console.log('Validation errors:', result.errors);
     * }
     * ```
     */
    async validateCalendar(calendarData: unknown): Promise<ValidationResult> {
      return APIWrapper.wrapAPIMethod(
        'validateCalendar',
        { hasData: !!calendarData },
        _params => {
          if (!calendarData) {
            throw new Error('Calendar data is required');
          }
        },
        async () => {
          const { CalendarValidator } = await import('./core/calendar-validator');
          return CalendarValidator.validate(calendarData);
        }
      );
    },

    /**
     * Events API - access calendar events system
     *
     * Provides methods for retrieving calendar events, managing world-level event
     * customizations, and integrating events with journal entries.
     *
     * Events are recurring occasions (holidays, festivals, observances) that occur
     * predictably according to calendar rules. Events can be defined in calendar JSON
     * files or customized at the world level by GMs.
     *
     * @example Get events for current date
     * ```javascript
     * const date = game.seasonsStars.api.getCurrentDate();
     * if (date) {
     *   const events = game.seasonsStars.api.events.getEventsForDate(
     *     date.year,
     *     date.month,
     *     date.day
     *   );
     *   console.log('Events today:', events.map(e => e.name).join(', '));
     * }
     * ```
     *
     * @example Get events in a date range
     * ```javascript
     * // Get all events in January 2024
     * const occurrences = game.seasonsStars.api.events.getEventsInRange(
     *   2024, 1, 1,  // Start: January 1, 2024
     *   2024, 1, 31  // End: January 31, 2024
     * );
     *
     * occurrences.forEach(occ => {
     *   console.log(`${occ.event.name} on ${occ.month}/${occ.day}/${occ.year}`);
     * });
     * ```
     *
     * @example Add custom world event (GM only)
     * ```javascript
     * // Add a custom event for harvest festival
     * await game.seasonsStars.api.events.setWorldEvent({
     *   id: 'harvest-festival',
     *   name: 'Harvest Festival',
     *   description: 'Annual celebration of the harvest',
     *   recurrence: { type: 'fixed', month: 9, day: 15 },
     *   color: '#ff8800',
     *   icon: 'fas fa-wheat'
     * });
     * ```
     *
     * @example Link journal entry to event
     * ```javascript
     * // Create journal entry about Winter Solstice
     * const journal = await JournalEntry.create({
     *   name: 'Winter Solstice Traditions',
     *   content: '<p>The longest night of the year...</p>'
     * });
     *
     * // Link it to the winter solstice event
     * await game.seasonsStars.api.events.setEventJournal(
     *   'winter-solstice',
     *   journal.uuid
     * );
     * ```
     */
    events: new EventsAPI(() => calendarManager.getActiveEventsManager()),
  };

  // Expose API to global game object
  if (game) {
    const seasonsStarsNamespace: typeof game.seasonsStars = {
      api,
      manager: calendarManager,
      notes: notesManager,
      categories: noteCategories, // Will be available by this point since ready runs after init
      integration: null as SeasonsStarsIntegration | null,
      compatibilityManager, // Expose for debugging and external access
      // Expose warning state functions for debugging and external access
      resetSeasonsWarningState,
      getSeasonsWarningState,
      setSeasonsWarningState,
      buttonRegistry: SidebarButtonRegistry.getInstance(),
    };

    game.seasonsStars = seasonsStarsNamespace;

    // Set integration after game.seasonsStars is fully assigned
    seasonsStarsNamespace.integration = SeasonsStarsIntegration.detect();
  }

  // Create widget registration API wrapper
  const widgetAPI = {
    register: (type: string, factory: () => WidgetInstance): void => {
      CalendarWidgetManager.registerWidget(type, factory);
    },
    show: (type: string): Promise<void> => CalendarWidgetManager.showWidget(type),
    hide: (type: string): Promise<void> => CalendarWidgetManager.hideWidget(type),
    toggle: (type: string): Promise<void> => CalendarWidgetManager.toggleWidget(type),
    isVisible: (type: string): boolean => CalendarWidgetManager.isWidgetVisible(type),
    getRegisteredTypes: (): string[] => CalendarWidgetManager.getRegisteredTypes(),
    getInstance: <T = unknown>(type: string): T | null =>
      CalendarWidgetManager.getWidgetInstance<T>(type),
  };

  // Expose API to window for debugging
  window.SeasonsStars = {
    api,
    manager: calendarManager,
    notes: notesManager,
    integration: SeasonsStarsIntegration.detect(),
    buttonRegistry: SidebarButtonRegistry.getInstance(),
    widgets: widgetAPI,
    CalendarWidget,
    CalendarMiniWidget,
    CalendarGridWidget,
    CalendarSelectionDialog,
  };

  Logger.debug('API and bridge integration exposed');

  Logger.debug('Module initialization complete');
}

/**
 * Module cleanup
 */
Hooks.once('destroy', () => {
  Logger.debug('Module shutting down');

  // Clean up global references
  if (game.seasonsStars) {
    delete game.seasonsStars;
  }

  if (window.SeasonsStars) {
    delete window.SeasonsStars;
  }
});

/**
 * Register with Memory Mage module if available
 */
function registerMemoryMageIntegration(): void {
  try {
    // Check if Memory Mage is available (standard Foundry module pattern)
    const memoryMage = game.memoryMage || game.modules?.get('memory-mage')?.api;
    if (!memoryMage) {
      Logger.debug('Memory Mage not available - skipping memory monitoring integration');
      return;
    }

    Logger.debug('Registering with Memory Mage for memory monitoring');
    // Register self-reporting memory usage
    (memoryMage as MemoryMageAPI).registerModule('seasons-and-stars', () => {
      const optimizer = (notesManager as ExtendedNotesManager)?.getPerformanceOptimizer?.();
      const widgetMemory = calculateWidgetMemory();
      const calendarMemory = calculateCalendarMemory();

      return {
        estimatedMB: (optimizer?.getMemoryUsage() || 0) + widgetMemory + calendarMemory,
        details: {
          notesCache: optimizer?.getMetrics()?.totalNotes || 0,
          activeWidgets: getActiveWidgetCount(),
          loadedCalendars:
            (calendarManager as ExtendedCalendarManager)?.getLoadedCalendars?.()?.length || 0,
          cacheSize: optimizer?.getMetrics()?.cacheHitRate || 0,
        },
      };
    });

    // Register cleanup handler for memory pressure
    (memoryMage as MemoryMageAPI).registerCleanupHandler?.(() => {
      Logger.info('Memory Mage triggered cleanup: memory pressure detected');

      // Perform memory cleanup
      const optimizer = (notesManager as ExtendedNotesManager)?.getPerformanceOptimizer?.();
      if (optimizer) {
        optimizer.relieveMemoryPressure?.();
      }

      // Clear other caches if available
      if ((calendarManager as ExtendedCalendarManager)?.clearCaches) {
        (calendarManager as ExtendedCalendarManager).clearCaches?.();
      }

      // Force close widgets if memory is critically low
      (CalendarWidget as unknown as { closeAll?: () => void }).closeAll?.();
      (CalendarGridWidget as unknown as { closeAll?: () => void }).closeAll?.();
    });

    Logger.debug('Memory Mage integration registered successfully');
  } catch (error) {
    Logger.warn(
      'Failed to register with Memory Mage - module will continue without memory monitoring:',
      error
    );
  }
}

/**
 * Calculate estimated memory usage of active widgets
 */
function calculateWidgetMemory(): number {
  let memory = 0;

  // Base widget overhead (small)
  const activeWidgets = getActiveWidgetCount();
  memory += activeWidgets * 0.05; // 50KB per widget

  return memory;
}

/**
 * Calculate estimated memory usage of loaded calendars
 */
function calculateCalendarMemory(): number {
  const loadedCalendars =
    (calendarManager as ExtendedCalendarManager)?.getLoadedCalendars?.()?.length || 0;
  return loadedCalendars * 0.02; // 20KB per calendar
}

/**
 * Get count of active widgets
 */
function getActiveWidgetCount(): number {
  let count = 0;

  if (CalendarWidget.getInstance?.()?.rendered) count++;
  if (CalendarMiniWidget.getInstance?.()?.rendered) count++;
  if (CalendarGridWidget.getInstance?.()?.rendered) count++;

  return count;
}

/**
 * Register hooks to clean up notes when journals are deleted externally
 */
function registerNotesCleanupHooks(): void {
  // Hook into journal deletion to clean up our notes storage
  Hooks.on(
    'deleteJournalEntry',
    async (journal: JournalEntry, _options: Record<string, unknown>, _userId: string) => {
      Logger.debug('Journal deletion detected', {
        journalId: journal.id,
        journalName: journal.name,
        isCalendarNote: !!journal.flags?.['seasons-and-stars']?.calendarNote,
      });

      try {
        // Check if this was a calendar note
        const flags = journal.flags?.['seasons-and-stars'];
        if (flags?.calendarNote) {
          Logger.info('Calendar note deleted externally, cleaning up storage', {
            noteId: journal.id,
            noteName: journal.name,
          });

          // Remove from our storage system
          if (notesManager?.storage) {
            await notesManager.storage.removeNote(journal.id);
            Logger.debug('Note removed from storage');
          }

          // Emit our own deletion hook for UI updates
          Hooks.callAll('seasons-stars:noteDeleted', journal.id);

          // Refresh calendar widgets to remove the note from display
          const calendarWidget = CalendarWidget.getInstance?.();
          if (calendarWidget?.rendered) {
            calendarWidget.render();
          }
          const miniWidget = CalendarMiniWidget.getInstance?.();
          if (miniWidget?.rendered) {
            miniWidget.render();
          }
          const gridWidget = CalendarGridWidget.getInstance?.();
          if (gridWidget?.rendered) {
            gridWidget.render();
          }
        }
      } catch (error) {
        Logger.error(
          'Failed to clean up deleted calendar note',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  );

  Logger.debug('Notes cleanup hooks registered');
}

// Export functions for testing
export { registerSettings };
