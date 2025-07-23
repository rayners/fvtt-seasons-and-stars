/**
 * Seasons & Stars: Custom Calendar Editor
 * Standalone package for creating, editing, and managing custom calendars
 */

// Import styles
import '../styles/custom-calendar-editor.scss';

import { Logger } from './core/logger';
import { CustomCalendarStorage } from './core/custom-calendar-storage';
import { CalendarEditorApp } from './ui/calendar-editor-app';
import { CalendarImportExport } from './core/calendar-import-export';

// Module instances
let customCalendarStorage: CustomCalendarStorage;
let calendarImportExport: CalendarImportExport;

// Initialize module
Hooks.once('init', async () => {
  Logger.info('Initializing Custom Calendar Editor');
  
  // Check that Seasons & Stars core is available
  if (!game.modules.get('seasons-and-stars')?.active) {
    Logger.error('Custom Calendar Editor requires Seasons & Stars core module to be active');
    ui.notifications?.error('Custom Calendar Editor requires Seasons & Stars core module');
    return;
  }
  
  // Initialize components
  customCalendarStorage = new CustomCalendarStorage();
  calendarImportExport = new CalendarImportExport();
  
  // Register settings
  registerSettings();
  
  Logger.info('Custom Calendar Editor initialized');
});

// Listen for Seasons & Stars to be ready
Hooks.once('seasons-stars:ready', async (data: any) => {
  Logger.info('Custom Calendar Editor responding to S&S ready hook');
  
  if (!data?.api) {
    Logger.error('S&S ready hook fired but no API provided');
    ui.notifications?.error('Custom Calendar Editor: S&S API not available');
    return;
  }
  
  Logger.info('Seasons & Stars API confirmed available, proceeding with initialization');
  
  try {
    // Load custom calendars
    await customCalendarStorage.loadCustomCalendars();
    Logger.debug('Custom calendars loaded');
    
    // Register custom calendars with S&S
    await registerCustomCalendars();
    Logger.debug('Custom calendars registered with S&S');
    
    // Enhance calendar selection dialog
    enhanceCalendarSelection();
    Logger.debug('Calendar selection enhancement hook registered');
    
    Logger.info('Custom Calendar Editor ready');
  } catch (error) {
    Logger.error('Failed to initialize Custom Calendar Editor:', error);
    ui.notifications?.error('Failed to initialize Custom Calendar Editor');
  }
});

// Fallback ready hook for safety
Hooks.once('ready', async () => {
  Logger.info('Custom Calendar Editor ready hook fired');
  
  // If S&S is already available (late hook registration), initialize now
  if ((game as any).seasonsStars?.api && !customCalendarStorage) {
    Logger.info('S&S already available, initializing directly');
    
    try {
      customCalendarStorage = new CustomCalendarStorage();
      calendarImportExport = new CalendarImportExport();
      
      await customCalendarStorage.loadCustomCalendars();
      await registerCustomCalendars();
      enhanceCalendarSelection();
      
      Logger.info('Custom Calendar Editor ready (fallback initialization)');
    } catch (error) {
      Logger.error('Failed to initialize Custom Calendar Editor (fallback):', error);
      ui.notifications?.error('Failed to initialize Custom Calendar Editor');
    }
  }
});

/**
 * Register module settings
 */
function registerSettings(): void {
  game.settings.register('seasons-and-stars-custom-calendar-editor', 'customCalendars', {
    name: 'custom-calendar-editor.settings.custom-calendars',
    hint: 'custom-calendar-editor.settings.custom-calendars-hint',
    scope: 'world',
    config: false,
    type: Object,
    default: {}
  });
}

/**
 * Register custom calendars with S&S core using hook-based registration
 */
async function registerCustomCalendars(): Promise<void> {
  // Register hook to load custom calendars when S&S requests external calendars
  Hooks.on('seasons-stars:registerExternalCalendars', ({ registerCalendar, manager }) => {
    Logger.info('S&S requesting external calendar registration');
    
    const customCalendars = customCalendarStorage.getCustomCalendars();
    let registeredCount = 0;
    
    for (const [calendarId, calendar] of Object.entries(customCalendars)) {
      try {
        const sourceInfo = {
          type: 'module',
          sourceName: 'Custom Calendar Editor',
          description: `User-created custom calendar: ${calendar.name || calendar.id}`,
          icon: 'fa-solid fa-calendar-plus',
          moduleId: 'seasons-and-stars-custom-calendar-editor'
        };
        
        const success = registerCalendar(calendar, sourceInfo);
        if (success) {
          registeredCount++;
          Logger.debug(`Registered custom calendar: ${calendarId}`);
        }
      } catch (error) {
        Logger.error(`Failed to register custom calendar ${calendarId}:`, error);
      }
    }
    
    Logger.info(`Registered ${registeredCount} custom calendars with S&S`);
  });
  
  // Also load calendars directly if S&S is already ready
  try {
    const customCalendars = customCalendarStorage.getCustomCalendars();
    const manager = (game as any).seasonsStars?.manager;
    
    if (manager) {
      for (const [calendarId, calendar] of Object.entries(customCalendars)) {
        try {
          const sourceInfo = {
            type: 'module',
            sourceName: 'Custom Calendar Editor',
            description: `User-created custom calendar: ${calendar.name || calendar.id}`,
            icon: 'fa-solid fa-calendar-plus',
            moduleId: 'seasons-and-stars-custom-calendar-editor'
          };
          
          const success = manager.loadCalendar(calendar, sourceInfo);
          if (success) {
            Logger.debug(`Loaded custom calendar: ${calendarId}`);
          }
        } catch (error) {
          Logger.debug(`Could not load custom calendar ${calendarId}:`, error);
        }
      }
      
      // Note: No need to fire hooks here since this is initialization.
      // The calendars are loaded into the manager and will be available
      // when the calendar selection dialog is next opened.
    }
  } catch (error) {
    Logger.debug('Direct calendar loading failed, will rely on hook registration');
  }
}

/**
 * Enhance the calendar selection dialog with custom calendar tools
 */
function enhanceCalendarSelection(): void {
  // Hook into calendar selection dialog render (v13 compatible)
  Hooks.on('renderApplication', (app: any, html: HTMLElement) => {
    Logger.debug(`renderApplication hook fired for: ${app.constructor.name}`, { 
      appId: app.id, 
      appElement: app.element?.id,
      htmlClasses: html.className 
    });
    
    if (app.constructor.name !== 'CalendarSelectionDialog') return;
    
    Logger.info('CalendarSelectionDialog render detected, proceeding with enhancement...');
    enhanceDialog(app, html);
  });
  
  // Also try with more specific hook patterns
  Hooks.on('renderCalendarSelectionDialog', (app: any, html: HTMLElement) => {
    Logger.info('renderCalendarSelectionDialog hook fired');
    enhanceDialog(app, html);
  });
  
  // Check for the dialog using a different approach - monitor for the dialog element
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          if (element.id === 'seasons-stars-calendar-selection' || 
              element.classList?.contains('calendar-selection-dialog')) {
            Logger.info('Calendar selection dialog detected via DOM observer');
            enhanceDialog(null, element);
          }
        }
      });
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  Logger.debug('DOM observer setup for calendar selection dialog');
}

function enhanceDialog(app: any, html: HTMLElement): void {
  // Prevent duplicate enhancement
  if (html.querySelector('.custom-calendar-toolbar')) {
    Logger.debug('Dialog already enhanced, skipping');
    return;
  }
  
  Logger.info('Calendar Selection Dialog detected, enhancing...');
  
  // Add custom calendar management buttons - try multiple selectors
  let targetElement = html.querySelector('.calendar-selection-grid') || 
                     html.querySelector('.calendar-list') ||
                     html.querySelector('.form-fields') ||
                     html.querySelector('.dialog-content form') ||
                     html.querySelector('form');
                     
  if (!targetElement) {
    Logger.warn('No suitable target element found in dialog. Available elements:', {
      hasGrid: !!html.querySelector('.calendar-selection-grid'),
      hasList: !!html.querySelector('.calendar-list'), 
      hasFormFields: !!html.querySelector('.form-fields'),
      hasForm: !!html.querySelector('form'),
      allDivs: html.querySelectorAll('div').length,
      htmlStructure: html.outerHTML.substring(0, 1000)
    });
    return;
  }
  
  Logger.debug('Found target element:', targetElement.className || targetElement.tagName);
  
  // Create toolbar for custom calendar actions
  const toolbar = document.createElement('div');
  toolbar.className = 'custom-calendar-toolbar';
  toolbar.style.cssText = 'margin-bottom: 10px; display: flex; gap: 10px; justify-content: flex-start; background: #f8f8f8; padding: 10px; border: 1px solid #ddd; border-radius: 4px;';
  toolbar.innerHTML = `
    <button type="button" class="create-custom-calendar" style="padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer;">
      <i class="fas fa-plus"></i>
      ${game.i18n.localize('custom-calendar-editor.buttons.create-calendar')}
    </button>
    <button type="button" class="import-calendar" style="padding: 5px 10px; background: #2196F3; color: white; border: none; border-radius: 3px; cursor: pointer;">
      <i class="fas fa-file-import"></i>
      ${game.i18n.localize('custom-calendar-editor.buttons.import-calendar')}
    </button>
  `;
  
  // Insert toolbar before target element
  targetElement.parentNode?.insertBefore(toolbar, targetElement);
  
  Logger.info('Custom calendar toolbar added to dialog');
  
  // Add event handlers
  toolbar.querySelector('.create-custom-calendar')?.addEventListener('click', () => {
    Logger.debug('Create calendar button clicked');
    openCalendarCreationWizard();
  });
  
  toolbar.querySelector('.import-calendar')?.addEventListener('click', () => {
    Logger.debug('Import calendar button clicked');
    openCalendarImportDialog();
  });
  
  // Add edit/export buttons for custom calendars  
  const calendarCards = html.querySelectorAll('.calendar-card');
  Logger.debug(`Found ${calendarCards.length} calendar cards to enhance`);
  
  calendarCards.forEach((card) => {
    const calendarId = (card as HTMLElement).dataset.calendarId;
    Logger.debug(`Processing calendar card: ${calendarId}`);
    
    // Check if this is a custom calendar
    if (calendarId && customCalendarStorage?.isCustomCalendar(calendarId)) {
      const actions = document.createElement('div');
      actions.className = 'custom-calendar-actions';
      actions.innerHTML = `
        <button type="button" class="edit-calendar" title="${game.i18n.localize('custom-calendar-editor.buttons.edit-calendar')}">
          <i class="fas fa-edit"></i>
        </button>
        <button type="button" class="export-calendar" title="${game.i18n.localize('custom-calendar-editor.buttons.export-calendar')}">
          <i class="fas fa-file-export"></i>
        </button>
        <button type="button" class="create-variant" title="${game.i18n.localize('custom-calendar-editor.buttons.create-variant')}">
          <i class="fas fa-copy"></i>
        </button>
      `;
      
      card.appendChild(actions);
      
      // Event handlers for calendar actions
      actions.querySelector('.edit-calendar')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openCalendarEditor(calendarId);
      });
      
      actions.querySelector('.export-calendar')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openCalendarExportDialog(calendarId);
      });
      
      actions.querySelector('.create-variant')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openCalendarVariantCreator(calendarId);
      });
    }
  });
  
  Logger.debug('Calendar selection dialog enhanced successfully');
}

/**
 * Open the calendar creation wizard
 */
function openCalendarCreationWizard(): void {
  new CalendarEditorApp({ mode: 'create' }).render(true);
}

/**
 * Open the calendar editor for an existing calendar
 */
function openCalendarEditor(calendarId: string): void {
  const calendar = customCalendarStorage.getCustomCalendar(calendarId);
  if (!calendar) {
    ui.notifications?.error(`Calendar ${calendarId} not found`);
    return;
  }
  
  new CalendarEditorApp({ 
    mode: 'edit',
    calendar: calendar
  }).render(true);
}

/**
 * Open the calendar import dialog
 */
function openCalendarImportDialog(): void {
  calendarImportExport.showImportDialog();
}

/**
 * Open the calendar export dialog
 */
function openCalendarExportDialog(calendarId: string): void {
  const calendar = customCalendarStorage.getCustomCalendar(calendarId);
  if (!calendar) {
    ui.notifications?.error(`Calendar ${calendarId} not found`);
    return;
  }
  
  calendarImportExport.showExportDialog(calendar);
}

/**
 * Open the calendar variant creator
 */
function openCalendarVariantCreator(calendarId: string): void {
  const baseCalendar = customCalendarStorage.getCustomCalendar(calendarId);
  if (!baseCalendar) {
    ui.notifications?.error(`Calendar ${calendarId} not found`);
    return;
  }
  
  new CalendarEditorApp({ 
    mode: 'variant',
    baseCalendar: baseCalendar
  }).render(true);
}


// Make API available globally
Hooks.once('ready', () => {
  if (customCalendarStorage && calendarImportExport) {
    (game as any).customCalendarEditor = {
      storage: customCalendarStorage,
      importExport: calendarImportExport,
      openCreationWizard: openCalendarCreationWizard,
      openEditor: openCalendarEditor,
      openImportDialog: openCalendarImportDialog,
      openExportDialog: openCalendarExportDialog,
      openVariantCreator: openCalendarVariantCreator
    };
  }
});