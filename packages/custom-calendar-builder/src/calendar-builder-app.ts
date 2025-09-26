/**
 * Calendar Builder ApplicationV2 for creating and editing custom calendars
 */

export class CalendarBuilderApp extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  private currentJson: string = '';
  private lastValidationResult: any = null;
  private coreIntegration: any = null;

  constructor() {
    super();
  }

  static DEFAULT_OPTIONS = {
    id: 'calendar-builder-app',
    classes: ['calendar-builder'],
    tag: 'div',
    window: {
      frame: true,
      positioned: true,
      title: 'CALENDAR_BUILDER.app.title',
      icon: 'fa-solid fa-edit',
      minimizable: true,
      resizable: true,
    },
    position: {
      width: 800,
      height: 600,
    },
    actions: {
      newCalendar: CalendarBuilderApp.prototype._onNewCalendar,
      openCalendar: CalendarBuilderApp.prototype._onOpenCalendar,
      saveCalendar: CalendarBuilderApp.prototype._onSaveCalendar,
      exportJson: CalendarBuilderApp.prototype._onExportJson,
      importJson: CalendarBuilderApp.prototype._onImportJson,
      validateJson: CalendarBuilderApp.prototype._onValidateJson,
      clearEditor: CalendarBuilderApp.prototype._onClearEditor,
    },
  };

  static PARTS = {
    main: {
      id: 'main',
      template: 'modules/seasons-and-stars-calendar-builder/templates/calendar-builder.hbs',
      scrollable: ['.editor-container', '.validation-results'],
    },
  };

  /**
   * Register integration from core module
   */
  async registerIntegration(integration: any): Promise<void> {
    this.coreIntegration = integration;

    // Load CalendarValidator if available
    if (integration.CalendarValidator && typeof integration.CalendarValidator === 'function') {
      try {
        const CalendarValidator = await integration.CalendarValidator();
        this.coreIntegration.CalendarValidator = CalendarValidator;
        console.log('Calendar Builder | CalendarValidator loaded successfully');
      } catch (error) {
        console.warn('Calendar Builder | Failed to load CalendarValidator:', error);
      }
    }

    console.log('Calendar Builder | Integration registered', integration);
  }

  /** @override */
  async _prepareContext(options = {}): Promise<any> {
    const context = await super._prepareContext(options);

    return Object.assign(context, {
      currentJson: this.currentJson,
      hasContent: this.currentJson.length > 0,
      validationResult: this.lastValidationResult,
      supportsTheming: this.supportsFoundryTheming(),
    });
  }

  /**
   * Check if Foundry theming is supported
   */
  private supportsFoundryTheming(): boolean {
    if (typeof document === 'undefined') return false;

    const body = document.body;
    return body.classList.contains('theme-dark') || body.classList.contains('theme-light');
  }

  /** @override */
  _attachPartListeners(partId: string, htmlElement: HTMLElement, options: any): void {
    super._attachPartListeners(partId, htmlElement, options);

    // Set up textarea editor
    const textarea = htmlElement.querySelector('#calendar-json-editor') as HTMLTextAreaElement;
    if (textarea) {
      // Auto-resize textarea
      this._setupTextareaAutoResize(textarea);

      // Auto-validate on input (debounced)
      let validationTimeout: NodeJS.Timeout;
      textarea.addEventListener('input', (event) => {
        const target = event.target as HTMLTextAreaElement;
        this.currentJson = target.value;

        // Clear previous timeout
        if (validationTimeout) {
          clearTimeout(validationTimeout);
        }

        // Set new timeout for validation
        validationTimeout = setTimeout(() => {
          this._validateCurrentJson();
        }, 2000); // 2 second delay after stopping typing
      });
    }

    // Update validation results display
    this._updateValidationDisplay(htmlElement);
  }

  /**
   * Setup auto-resize for textarea
   */
  private _setupTextareaAutoResize(textarea: HTMLTextAreaElement): void {
    const resize = () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 400) + 'px';
    };

    textarea.addEventListener('input', resize);
    // Initial resize
    setTimeout(resize, 0);
  }

  /**
   * Update validation display
   */
  private _updateValidationDisplay(htmlElement: HTMLElement): void {
    const validationContainer = htmlElement.querySelector('.validation-results');
    if (!validationContainer) return;

    if (!this.lastValidationResult) {
      validationContainer.innerHTML = '<p class="no-validation">Enter calendar JSON to see validation results</p>';
      return;
    }

    let html = '';

    if (this.lastValidationResult.isValid) {
      html += '<div class="validation-status valid"><i class="fas fa-check-circle"></i> Calendar is valid!</div>';
    } else {
      html += '<div class="validation-status invalid"><i class="fas fa-times-circle"></i> Calendar has validation errors</div>';
    }

    if (this.lastValidationResult.errors && this.lastValidationResult.errors.length > 0) {
      html += '<div class="validation-errors"><h4>Errors:</h4><ul>';
      for (const error of this.lastValidationResult.errors) {
        html += `<li class="error">${this._escapeHtml(error)}</li>`;
      }
      html += '</ul></div>';
    }

    if (this.lastValidationResult.warnings && this.lastValidationResult.warnings.length > 0) {
      html += '<div class="validation-warnings"><h4>Warnings:</h4><ul>';
      for (const warning of this.lastValidationResult.warnings) {
        html += `<li class="warning">${this._escapeHtml(warning)}</li>`;
      }
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
   * Validate current JSON content
   */
  private async _validateCurrentJson(): Promise<void> {
    if (!this.currentJson.trim()) {
      this.lastValidationResult = null;
      this.render(false); // Re-render to update validation display
      return;
    }

    try {
      // Parse JSON first
      const calendarData = JSON.parse(this.currentJson);

      // Use core module's validator if available
      if (this.coreIntegration && this.coreIntegration.CalendarValidator) {
        this.lastValidationResult = await this.coreIntegration.CalendarValidator.validate(calendarData);
      } else {
        // Fallback validation
        this.lastValidationResult = this._basicValidation(calendarData);
      }
    } catch (error) {
      this.lastValidationResult = {
        isValid: false,
        errors: [`Invalid JSON: ${(error as Error).message}`],
        warnings: [],
      };
    }

    this.render(false); // Re-render to update validation display
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
  async _onNewCalendar(event: Event, target: HTMLElement): Promise<void> {
    const template = {
      id: 'my-custom-calendar',
      translations: {
        en: {
          name: 'My Custom Calendar',
          description: 'A custom calendar created with Calendar Builder'
        }
      },
      months: [
        { name: 'January', days: 31 },
        { name: 'February', days: 28 },
        { name: 'March', days: 31 }
      ],
      weekdays: [
        { name: 'Sunday' },
        { name: 'Monday' },
        { name: 'Tuesday' },
        { name: 'Wednesday' },
        { name: 'Thursday' },
        { name: 'Friday' },
        { name: 'Saturday' }
      ],
      leapYear: {
        rule: 'gregorian'
      }
    };

    this.currentJson = JSON.stringify(template, null, 2);
    this.render(true);
    ui.notifications?.info(game.i18n.localize('CALENDAR_BUILDER.app.notifications.new_template'));
  }

  /**
   * Open calendar from file action
   */
  async _onOpenCalendar(event: Event, target: HTMLElement): Promise<void> {
    try {
      // @ts-expect-error - FilePicker is available at runtime
      const filePicker = new foundry.applications.apps.FilePicker({
        type: 'data',
        extensions: ['.json'],
        callback: async (path: string): Promise<void> => {
          try {
            const response = await fetch(path);
            const calendarData = await response.text();
            this.currentJson = calendarData;
            this.render(true);
            ui.notifications?.info(game.i18n.localize('CALENDAR_BUILDER.app.notifications.imported'));
          } catch (error) {
            console.error('Failed to load calendar file:', error);
            ui.notifications?.error(game.i18n.localize('CALENDAR_BUILDER.app.notifications.import_failed'));
          }
        },
      });

      await filePicker.render(true);
    } catch (error) {
      console.error('Failed to open file picker:', error);
      ui.notifications?.error('Failed to open file picker');
    }
  }

  /**
   * Save calendar to file action
   */
  async _onSaveCalendar(event: Event, target: HTMLElement): Promise<void> {
    if (!this.currentJson.trim()) {
      ui.notifications?.warn(game.i18n.localize('CALENDAR_BUILDER.app.notifications.no_content'));
      return;
    }

    // For now, just export as JSON
    this._onExportJson(event, target);
  }

  /**
   * Export JSON to file action
   */
  async _onExportJson(event: Event, target: HTMLElement): Promise<void> {
    if (!this.currentJson.trim()) {
      ui.notifications?.warn(game.i18n.localize('CALENDAR_BUILDER.app.notifications.no_content'));
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

      ui.notifications?.info(game.i18n.localize('CALENDAR_BUILDER.app.notifications.exported'));
    } catch (error) {
      console.error('Export failed:', error);
      ui.notifications?.error(game.i18n.localize('CALENDAR_BUILDER.app.notifications.export_failed'));
    }
  }

  /**
   * Import JSON from clipboard or file input
   */
  async _onImportJson(event: Event, target: HTMLElement): Promise<void> {
    // Create a temporary file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        // Validate it's proper JSON
        JSON.parse(text);

        this.currentJson = text;
        this.render(true);
        ui.notifications?.info(game.i18n.localize('CALENDAR_BUILDER.app.notifications.imported'));
      } catch (error) {
        console.error('Import failed:', error);
        ui.notifications?.error(game.i18n.localize('CALENDAR_BUILDER.app.notifications.invalid_json'));
      }
    });

    input.click();
  }

  /**
   * Validate JSON action
   */
  async _onValidateJson(event: Event, target: HTMLElement): Promise<void> {
    await this._validateCurrentJson();
    ui.notifications?.info(game.i18n.localize('CALENDAR_BUILDER.app.notifications.validation_complete'));
  }

  /**
   * Clear editor action
   */
  async _onClearEditor(event: Event, target: HTMLElement): Promise<void> {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: 'Confirm Clear' },
      content: game.i18n.localize('CALENDAR_BUILDER.app.dialogs.confirm_clear'),
    });

    if (confirmed) {
      this.currentJson = '';
      this.lastValidationResult = null;
      this.render(true);
      ui.notifications?.info(game.i18n.localize('CALENDAR_BUILDER.app.notifications.cleared'));
    }
  }
}