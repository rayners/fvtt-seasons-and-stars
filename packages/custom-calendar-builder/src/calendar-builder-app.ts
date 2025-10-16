/**
 * Calendar Builder ApplicationV2 for creating and editing custom calendars
 */

/// <reference types="../../core/src/types/foundry-v13-essentials" />

import { SimpleCalendarConverter } from './simple-calendar-converter';
import type { SimpleCalendarExport, SimpleCalendarData } from './simple-calendar-types';

export class CalendarBuilderApp extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  private currentJson: string = '';
  private lastValidationResult: any = null;
  private validationTimeout: number | null = null;
  private validationSequence: number = 0;

  // Type declaration for HandlebarsApplicationMixin method
  declare _prepareTabs: (group: string) => Record<string, any>;

  constructor() {
    super();
  }

  /** @override */
  async close(options?: any): Promise<this> {
    // Clean up validation timeout
    if (this.validationTimeout) {
      clearTimeout(this.validationTimeout);
      this.validationTimeout = null;
    }
    return super.close(options);
  }

  static DEFAULT_OPTIONS = {
    id: 'calendar-builder-app',
    classes: ['calendar-builder', 'standard-form'],
    tag: 'form',
    window: {
      frame: true,
      positioned: true,
      title: 'CALENDAR_BUILDER.app.title',
      icon: 'fa-solid fa-edit',
      minimizable: true,
      resizable: true,
    },
    position: {
      width: 1000,
      height: 700,
    },
    actions: {
      newCalendar: CalendarBuilderApp.prototype._onNewCalendar,
      openCalendar: CalendarBuilderApp.prototype._onOpenCalendar,
      exportJson: CalendarBuilderApp.prototype._onExportJson,
      importJson: CalendarBuilderApp.prototype._onImportJson,
      validateJson: CalendarBuilderApp.prototype._onValidateJson,
      clearEditor: CalendarBuilderApp.prototype._onClearEditor,
    },
  };

  static PARTS = {
    toolbar: {
      id: 'toolbar',
      template: 'modules/seasons-and-stars-calendar-builder/templates/parts/toolbar.hbs',
    },
    tabs: {
      id: 'tabs',
      template: 'templates/generic/tab-navigation.hbs',
    },
    editor: {
      id: 'editor',
      template: 'modules/seasons-and-stars-calendar-builder/templates/parts/editor.hbs',
      scrollable: ['.json-editor', '.validation-results'],
    },
    basic: {
      id: 'basic',
      template: 'modules/seasons-and-stars-calendar-builder/templates/parts/basic.hbs',
    },
    time: {
      id: 'time',
      template: 'modules/seasons-and-stars-calendar-builder/templates/parts/time.hbs',
    },
    months: {
      id: 'months',
      template: 'modules/seasons-and-stars-calendar-builder/templates/parts/months.hbs',
    },
    weekdays: {
      id: 'weekdays',
      template: 'modules/seasons-and-stars-calendar-builder/templates/parts/weekdays.hbs',
    },
    leapyear: {
      id: 'leapyear',
      template: 'modules/seasons-and-stars-calendar-builder/templates/parts/leapyear.hbs',
    },
    intercalary: {
      id: 'intercalary',
      template: 'modules/seasons-and-stars-calendar-builder/templates/parts/intercalary.hbs',
    },
    events: {
      id: 'events',
      template: 'modules/seasons-and-stars-calendar-builder/templates/parts/events.hbs',
    },
    moons: {
      id: 'moons',
      template: 'modules/seasons-and-stars-calendar-builder/templates/parts/moons.hbs',
    },
    seasons: {
      id: 'seasons',
      template: 'modules/seasons-and-stars-calendar-builder/templates/parts/seasons.hbs',
    },
  };

  static TABS = {
    main: {
      tabs: [
        { id: 'editor', label: 'Editor', icon: 'fas fa-code' },
        { id: 'basic', label: 'Basic Info', icon: 'fas fa-info-circle' },
        { id: 'time', label: 'Time', icon: 'fas fa-clock' },
        { id: 'months', label: 'Months', icon: 'fas fa-calendar-alt' },
        { id: 'weekdays', label: 'Weekdays', icon: 'fas fa-calendar-week' },
        { id: 'leapyear', label: 'Leap Year', icon: 'fas fa-calendar-plus' },
        { id: 'intercalary', label: 'Intercalary', icon: 'fas fa-calendar-day' },
        { id: 'events', label: 'Events', icon: 'fas fa-star' },
        { id: 'moons', label: 'Moons', icon: 'fas fa-moon' },
        { id: 'seasons', label: 'Seasons', icon: 'fas fa-leaf' },
      ],
      initial: 'editor',
    },
  };

  /** @override */
  async _prepareContext(options = {}): Promise<any> {
    const context = await super._prepareContext(options);

    return Object.assign(context, {
      currentJson: this.currentJson,
      hasContent: this.currentJson.length > 0,
      validationResult: this.lastValidationResult,
    });
  }

  /** @override */
  async _preparePartContext(partId: string, context: any): Promise<any> {
    // Start with a copy of the context
    const partContext = { ...context };

    // Prepare tabs for the navigation part
    if (partId === 'tabs') {
      partContext.tabs = this._prepareTabs('main');
    }

    // Add tab data to individual tab parts
    if (partId in context.tabs) {
      partContext.tab = context.tabs[partId];
    }

    return partContext;
  }

  /** @override */
  _attachPartListeners(partId: string, htmlElement: HTMLElement, options: any): void {
    super._attachPartListeners(partId, htmlElement, options);

    // Update validation results display for editor part
    if (partId === 'editor') {
      this._updateValidationDisplay();
    }
  }

  protected override _onChangeForm(formConfig: any, event: Event): void {
    super._onChangeForm?.(formConfig, event);

    // Update current JSON from the CodeMirror element
    const codeMirror = this.element?.querySelector('#calendar-json-editor') as any;
    if (codeMirror) {
      this.currentJson = codeMirror.value || '';
      // Validate when the form changes
      this._validateCurrentJson();
    }
  }


  /**
   * Validate current JSON content
   */
  private async _validateCurrentJson(): Promise<void> {
    const currentSequence = ++this.validationSequence;

    if (!this.currentJson.trim()) {
      this.lastValidationResult = null;
      // Update only the validation container instead of full re-render
      this._updateValidationDisplay();
      return;
    }

    try {
      // Parse JSON first
      const calendarData = JSON.parse(this.currentJson);

      // Use the public API for validation
      const seasonsStarsApi = (game as any)?.seasonsStars?.api;
      if (seasonsStarsApi?.validateCalendar) {
        const result = await seasonsStarsApi.validateCalendar(calendarData);

        // Only update if this is still the latest validation
        if (currentSequence === this.validationSequence) {
          this.lastValidationResult = result;
        }
      } else {
        // Fallback validation
        this.lastValidationResult = this._basicValidation(calendarData);
      }
    } catch (error) {
      // Only update if this is still the latest validation
      if (currentSequence === this.validationSequence) {
        this.lastValidationResult = {
          isValid: false,
          errors: [`Invalid JSON: ${(error as Error).message}`],
          warnings: [],
        };
      }
    }

    // Only update display if this is still the latest validation
    if (currentSequence === this.validationSequence) {
      this._updateValidationDisplay();
    }
  }

  /**
   * Update validation display without full re-render to preserve textarea focus
   */
  private _updateValidationDisplay(): void {
    const validationContainer = this.element?.querySelector('.validation-results');
    if (!validationContainer) return;

    if (!this.lastValidationResult) {
      validationContainer.innerHTML = '<p class="no-validation">Enter calendar JSON to see validation results</p>';
      return;
    }

    const result = this.lastValidationResult;
    let html = '';

    // Status indicator
    if (result.isValid) {
      html += '<div class="validation-status valid"><i class="fas fa-check-circle"></i> Calendar is valid</div>';
    } else {
      html += '<div class="validation-status invalid"><i class="fas fa-times-circle"></i> Calendar contains errors</div>';
    }

    // Errors
    if (result.errors && result.errors.length > 0) {
      html += '<div class="validation-errors"><h4>Errors:</h4><ul>';
      result.errors.forEach((error: string) => {
        html += `<li class="error">${this._escapeHtml(error)}</li>`;
      });
      html += '</ul></div>';
    }

    // Warnings
    if (result.warnings && result.warnings.length > 0) {
      html += '<div class="validation-warnings"><h4>Warnings:</h4><ul>';
      result.warnings.forEach((warning: string) => {
        html += `<li class="warning">${this._escapeHtml(warning)}</li>`;
      });
      html += '</ul></div>';
    }

    validationContainer.innerHTML = html;
  }

  /**
   * Escape HTML for safe display
   */
  private _escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Show notification within the application window
   */
  private _notify(message: string, type: 'info' | 'warn' | 'error' = 'info'): void {
    // For now, use ui.notifications as ApplicationV2 doesn't have built-in notifications
    // In future versions we could create a custom notification area within the app
    ui.notifications?.[type](message);
  }

  /**
   * Basic JSON structure validation fallback
   */
  private _basicValidation(data: any): any {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.id || typeof data.id !== 'string') {
      errors.push('Calendar must have a valid id string');
    }

    if (!data.translations || typeof data.translations !== 'object') {
      errors.push('Calendar must have translations object');
    }

    if (!Array.isArray(data.months)) {
      errors.push('Calendar must have months array');
    }

    if (!Array.isArray(data.weekdays)) {
      errors.push('Calendar must have weekdays array');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * New calendar action
   */
  async _onNewCalendar(_event: Event, _target: HTMLElement): Promise<void> {
    const template = {
      id: 'my-custom-calendar',
      translations: {
        en: {
          label: 'My Custom Calendar',
          description: 'A custom calendar created with Calendar Builder',
          setting: 'Generic'
        }
      },
      year: {
        epoch: 0,
        currentYear: 1,
        prefix: '',
        suffix: '',
        startDay: 0
      },
      months: [
        { name: 'January', abbreviation: 'Jan', days: 31 },
        { name: 'February', abbreviation: 'Feb', days: 28 },
        { name: 'March', abbreviation: 'Mar', days: 31 },
        { name: 'April', abbreviation: 'Apr', days: 30 },
        { name: 'May', abbreviation: 'May', days: 31 },
        { name: 'June', abbreviation: 'Jun', days: 30 },
        { name: 'July', abbreviation: 'Jul', days: 31 },
        { name: 'August', abbreviation: 'Aug', days: 31 },
        { name: 'September', abbreviation: 'Sep', days: 30 },
        { name: 'October', abbreviation: 'Oct', days: 31 },
        { name: 'November', abbreviation: 'Nov', days: 30 },
        { name: 'December', abbreviation: 'Dec', days: 31 }
      ],
      weekdays: [
        { name: 'Sunday', abbreviation: 'Sun' },
        { name: 'Monday', abbreviation: 'Mon' },
        { name: 'Tuesday', abbreviation: 'Tue' },
        { name: 'Wednesday', abbreviation: 'Wed' },
        { name: 'Thursday', abbreviation: 'Thu' },
        { name: 'Friday', abbreviation: 'Fri' },
        { name: 'Saturday', abbreviation: 'Sat' }
      ],
      leapYear: {
        rule: 'gregorian',
        month: 'February',
        extraDays: 1
      },
      intercalary: [],
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60
      }
    };

    this.currentJson = JSON.stringify(template, null, 2);
    this.render(true);
    this._validateCurrentJson();
    this._notify(game.i18n.localize('CALENDAR_BUILDER.app.notifications.new_template'));
  }

  /**
   * Open calendar from file action
   */
  async _onOpenCalendar(_event: Event, _target: HTMLElement): Promise<void> {
    try {
      // Check if FilePicker is available
      const FoundryFilePicker = (foundry as any)?.applications?.apps?.FilePicker;
      if (!FoundryFilePicker) {
        this._notify('File picker not available in this Foundry version', 'error');
        return;
      }

      const filePicker = new FoundryFilePicker({
        type: 'data',
        current: 'modules/seasons-and-stars/calendars',
        extensions: ['.json'],
        callback: async (path: string): Promise<void> => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const response = await fetch(path, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const calendarData = await response.text();
            this.currentJson = calendarData;
            this.render(true);
            this._validateCurrentJson();
            this._notify(game.i18n.localize('CALENDAR_BUILDER.app.notifications.imported'));
          } catch (error) {
            console.error('Failed to load calendar file:', error);
            if ((error as Error).name === 'AbortError') {
              this._notify('Request timeout - file too large or server unavailable', 'error');
            } else {
              this._notify(game.i18n.localize('CALENDAR_BUILDER.app.notifications.import_failed'), 'error');
            }
          }
        },
      });

      await filePicker.render(true);
    } catch (error) {
      console.error('Failed to open file picker:', error);
      this._notify('Failed to open file picker', 'error');
    }
  }

  /**
   * Export JSON to file action
   */
  async _onExportJson(_event: Event, _target: HTMLElement): Promise<void> {
    if (!this.currentJson.trim()) {
      this._notify(game.i18n.localize('CALENDAR_BUILDER.app.notifications.no_content'), 'warn');
      return;
    }

    try {
      // Create blob and download
      const blob = new Blob([this.currentJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'custom-calendar.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this._notify(game.i18n.localize('CALENDAR_BUILDER.app.notifications.exported'));
    } catch (error) {
      console.error('Export failed:', error);
      this._notify(game.i18n.localize('CALENDAR_BUILDER.app.notifications.export_failed'), 'error');
    }
  }

  /**
   * Import JSON from clipboard or file input
   */
  async _onImportJson(_event: Event, _target: HTMLElement): Promise<void> {
    // Create a temporary file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        await this._handleImportedJson(text, file.name);
      } catch (error) {
        console.error('Import failed:', error);
        this._notify(game.i18n.localize('CALENDAR_BUILDER.app.notifications.invalid_json'), 'error');
      }
    });

    input.click();
  }

  /**
   * Import JSON from external source (e.g., compat module)
   * Public method that can be called by other modules
   *
   * @param jsonString - The JSON string to import
   * @param source - The source of the import (e.g., 'simple-calendar')
   */
  public async importFromExternal(jsonString: string, source: string): Promise<void> {
    // Parse to validate JSON first
    const data = JSON.parse(jsonString);

    // Check for Simple Calendar format
    if (await this._detectAndHandleSimpleCalendar(data, jsonString, `${source}-import`)) {
      // Already handled by _detectAndHandleSimpleCalendar
      return;
    }

    // Set the JSON content
    this.currentJson = jsonString;

    // Trigger validation
    await this._validateCurrentJson();

    // Render only if not already visible
    if (!this.rendered) {
      this.render(true);
    }

    this._notify(game.i18n.localize('CALENDAR_BUILDER.app.notifications.imported'));
  }

  private async _handleImportedJson(text: string, filename?: string): Promise<void> {
    const data = JSON.parse(text);

    if (await this._detectAndHandleSimpleCalendar(data, text, filename)) {
      return;
    }

    this.currentJson = text;
    this.render(true);
    this._notify(game.i18n.localize('CALENDAR_BUILDER.app.notifications.imported'));
  }

  private async _detectAndHandleSimpleCalendar(data: any, originalText: string, filename?: string): Promise<boolean> {
    if (!SimpleCalendarConverter.isSimpleCalendarFormat(data)) {
      return false;
    }

    const fileInfo = filename ? ` (${filename})` : '';

    // Check for multiple calendars
    let multiCalendarNote = '';
    if ('calendars' in data && Array.isArray(data.calendars) && data.calendars.length > 1) {
      multiCalendarNote = `<p><em>Note: This file contains ${data.calendars.length} calendars. Only the first calendar will be imported.</em></p>`;
    }

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: 'Simple Calendar Format Detected' },
      content: `<p>This file${fileInfo} appears to be in Simple Calendar format.</p>
                <p>The Calendar Builder can attempt to automatically convert it to Seasons & Stars format,
                but not all data may translate directly.</p>
                ${multiCalendarNote}
                <p><strong>Would you like to attempt automatic conversion?</strong></p>
                <p><em>Note: If you choose "No", the JSON will be loaded as-is and will not validate correctly.</em></p>`,
      rejectClose: false,
      modal: true
    });

    if (!confirmed) {
      this.currentJson = originalText;
      this.render(true);
      this._notify('Loaded Simple Calendar JSON without conversion - validation will likely fail', 'warn');
      return true;
    }

    // Handle different Simple Calendar export formats
    let calendarToConvert: SimpleCalendarData;

    // Single calendar wrapped in {"calendar": {...}}
    if ('calendar' in data && !('calendars' in data)) {
      const singleCalendarExport = data as { calendar: SimpleCalendarData };
      calendarToConvert = singleCalendarExport.calendar;
    }
    // Full export with calendars array
    else {
      const scExport = data as SimpleCalendarExport;

      if (!scExport.calendars || scExport.calendars.length === 0) {
        this._notify('No calendars found in Simple Calendar export', 'error');
        return true;
      }

      calendarToConvert = scExport.calendars.length === 1
        ? scExport.calendars[0]
        : await this._selectCalendar(scExport.calendars);
    }

    // Try to use compat module's converter first, fall back to builtin
    let result: any;
    let converter: any;

    try {
      // Check for compat module's converter
      const compatModule = (game as any)?.modules?.get('foundryvtt-simple-calendar-compat');
      if (compatModule?.active && compatModule.api?.getConverter) {
        converter = compatModule.api.getConverter();
        result = converter.convert(calendarToConvert, filename);
      } else {
        // Fall back to builtin converter
        converter = new SimpleCalendarConverter();
        result = converter.convert(calendarToConvert, filename);
      }
    } catch (error) {
      // If compat converter fails, warn and fall back to builtin
      console.warn('Compat module converter failed, falling back to builtin:', error);
      this._notify('Compat converter failed, using builtin converter', 'warn');
      converter = new SimpleCalendarConverter();
      result = converter.convert(calendarToConvert, filename);
    }

    this.currentJson = JSON.stringify(result.calendar, null, 2);
    this.render(true);

    // Validate the converted calendar to ensure it's valid current S&S format
    await this._validateCurrentJson();

    if (result.warnings.length > 0) {
      this._reportConversionWarnings(result.warnings);
      this._notify(`Conversion complete with ${result.warnings.length} warning(s) - check console for details`, 'warn');
    } else {
      this._notify('Calendar successfully converted from Simple Calendar format', 'info');
    }

    return true;
  }

  private async _selectCalendar(calendars: SimpleCalendarData[]): Promise<SimpleCalendarData> {
    return calendars[0];
  }

  private _reportConversionWarnings(warnings: any[]): void {
    const lines: string[] = [];
    lines.push('=== Simple Calendar Conversion Warnings ===');
    lines.push(`Total warnings: ${warnings.length}`);
    lines.push('');

    for (const warning of warnings) {
      const valueStr = typeof warning.value === 'object'
        ? JSON.stringify(warning.value)
        : String(warning.value);

      lines.push(`Property: ${warning.path}.${warning.property}`);
      lines.push(`  Value: ${valueStr}`);
      lines.push(`  Reason: ${warning.reason}`);
      lines.push('');
    }

    lines.push('=== End Conversion Warnings ===');

    // Output as single multiline warning for easy copying
    console.warn(lines.join('\n'));
  }

  /**
   * Validate JSON action
   */
  async _onValidateJson(_event: Event, _target: HTMLElement): Promise<void> {
    await this._validateCurrentJson();
    this._notify(game.i18n.localize('CALENDAR_BUILDER.app.notifications.validation_complete'));
  }

  /**
   * Clear editor action
   */
  async _onClearEditor(_event: Event, _target: HTMLElement): Promise<void> {
    try {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: 'Confirm Clear' },
        content: game.i18n.localize('CALENDAR_BUILDER.app.dialogs.confirm_clear'),
        rejectClose: false,
        modal: true
      });

      if (confirmed) {
        this.currentJson = '';
        this.lastValidationResult = null;
        this.render(true);
        this._notify(game.i18n.localize('CALENDAR_BUILDER.app.notifications.cleared'));
      }
    } catch (error) {
      console.error('Failed to show confirmation dialog:', error);
      this._notify('Failed to show confirmation dialog', 'error');
    }
  }
}