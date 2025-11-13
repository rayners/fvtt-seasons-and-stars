/**
 * Calendar Builder ApplicationV2 for creating and editing custom calendars
 */

/// <reference types="../../core/src/types/foundry-v13-essentials" />

import { SimpleCalendarConverter } from './simple-calendar-converter';
import type { SimpleCalendarExport, SimpleCalendarData } from './simple-calendar-types';
import type { SeasonsStarsCalendar } from '../../core/src/types/calendar';

export class CalendarBuilderApp extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  private static readonly DEFAULT_TEMPLATE = {
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

  private currentJson: string = JSON.stringify(CalendarBuilderApp.DEFAULT_TEMPLATE, null, 2);
  private lastValidationResult: any = null;
  private validationTimeout: number | null = null;
  private validationSequence: number = 0;
  private calendarData: SeasonsStarsCalendar | null = null;

  // Type declaration for HandlebarsApplicationMixin method
  declare _prepareTabs: (group: string) => Record<string, any>;

  constructor() {
    super();
  }

  /**
   * Parse current JSON string into calendar data object
   */
  private parseCalendarData(): SeasonsStarsCalendar | null {
    if (!this.currentJson.trim()) {
      return null;
    }
    try {
      return JSON.parse(this.currentJson) as SeasonsStarsCalendar;
    } catch {
      return null;
    }
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

    // Parse calendar data for use in form tabs
    this.calendarData = this.parseCalendarData();

    return Object.assign(context, {
      currentJson: this.currentJson,
      hasContent: this.currentJson.length > 0,
      validationResult: this.lastValidationResult,
      calendar: this.calendarData,
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

    // Use event delegation for form field changes on interactive tabs
    if (partId === 'basic' || partId === 'time' || partId === 'leapyear') {
      htmlElement.addEventListener('change', this._onFormFieldChange.bind(this));
      htmlElement.addEventListener('blur', this._onFormFieldBlur.bind(this), true); // Use capture phase for blur
    }
  }

  /**
   * Handle form field change events (using event delegation)
   */
  private _onFormFieldChange(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.matches('input, select, textarea')) {
      this._onFieldChange(event);
    }
  }

  /**
   * Handle form field blur events (using event delegation)
   */
  private _onFormFieldBlur(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.matches('input, select, textarea')) {
      this._onFieldChange(event);
    }
  }

  /**
   * Handle field changes and update the JSON
   */
  private _onFieldChange(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const fieldName = target.name;

    if (!fieldName) return;

    // Get current calendar data
    let calendar = this.parseCalendarData();
    if (!calendar) {
      // Initialize minimal calendar structure if needed
      calendar = {
        id: '',
        translations: { en: { label: '', description: '', setting: '' } },
        year: { epoch: 0, currentYear: 1, prefix: '', suffix: '', startDay: 0 },
        months: [],
        weekdays: [],
        intercalary: [],
        time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
        leapYear: { rule: 'none', month: '', extraDays: 1 }
      };
    }

    // Parse field name and update nested properties
    this._setNestedProperty(calendar, fieldName, target.value);

    // Auto-generate kebab-case ID from calendar name if ID is empty or unchanged
    if (fieldName === 'translations.en.label' && target.value) {
      const currentId = calendar.id || '';
      const previousName = this._getPreviousCalendarName();
      const previousKebabCase = this._toKebabCase(previousName);

      // Only auto-update ID if it's empty or matches the previous auto-generated value
      if (!currentId || currentId === previousKebabCase) {
        calendar.id = this._toKebabCase(target.value);

        // Update the ID input field in the DOM
        const idInput = this.element?.querySelector('#calendar-id') as HTMLInputElement;
        if (idInput) {
          idInput.value = calendar.id;
        }
      }
    }

    // Update the JSON editor
    this.currentJson = JSON.stringify(calendar, null, 2);

    // Update the CodeMirror editor if it exists
    const codeMirror = this.element?.querySelector('#calendar-json-editor') as any;
    if (codeMirror && codeMirror.value !== this.currentJson) {
      codeMirror.value = this.currentJson;
    }

    // Validate the updated JSON
    this._validateCurrentJson();
  }

  /**
   * Convert a string to kebab-case
   * Examples: "My Calendar" -> "my-calendar", "Test_Calendar 2" -> "test-calendar-2"
   */
  private _toKebabCase(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, '');      // Remove leading/trailing hyphens
  }

  /**
   * Get the previous calendar name from the current JSON
   * Used to determine if ID was auto-generated and should be updated
   */
  private _getPreviousCalendarName(): string {
    try {
      const previousData = JSON.parse(this.currentJson);
      return previousData?.translations?.en?.label || '';
    } catch {
      return '';
    }
  }

  /**
   * Fields that should be parsed as numeric values
   */
  private static readonly NUMERIC_FIELDS = new Set([
    'year.epoch',
    'year.currentYear',
    'year.startDay',
    'time.hoursInDay',
    'time.minutesInHour',
    'time.secondsInMinute',
    'leapYear.extraDays',
  ]);

  /**
   * Set a nested property in an object using dot notation
   */
  private _setNestedProperty(obj: SeasonsStarsCalendar, path: string, value: string): void {
    const keys = path.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }
      current = current[key];
    }

    const lastKey = keys[keys.length - 1];

    // Handle special cases
    if (path === 'sources') {
      // Convert newline-separated text to array
      current[lastKey] = value.split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    } else if (CalendarBuilderApp.NUMERIC_FIELDS.has(path)) {
      // Convert to number
      current[lastKey] = parseInt(value, 10) || 0;
    } else {
      // String value
      current[lastKey] = value;
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
    this.currentJson = JSON.stringify(CalendarBuilderApp.DEFAULT_TEMPLATE, null, 2);
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
      // Create blob and download link
      const blob = new Blob([this.currentJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'custom-calendar.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Delay cleanup to ensure browser has time to process the download
      // Fixes "Your PC doesn't have an app that can open this link" error on Windows
      // where immediate revocation prevents the download from starting
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);

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

    const converter = new SimpleCalendarConverter();
    const result = converter.convert(calendarToConvert, filename);

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