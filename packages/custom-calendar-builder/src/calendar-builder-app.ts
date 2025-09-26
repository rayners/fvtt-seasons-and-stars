/**
 * Calendar Builder ApplicationV2 for creating and editing custom calendars
 */

export class CalendarBuilderApp extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  private currentJson: string = '';
  private lastValidationResult: any = null;

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
   * Check if Foundry theming is supported - only available in V13+
   */
  private supportsFoundryTheming(): boolean {
    if (typeof document === 'undefined') return false;

    // Check for V13+ ApplicationV2 theming support
    return !!foundry.applications?.api?.ApplicationV2 &&
           typeof document.body.classList !== 'undefined' &&
           (document.body.classList.contains('theme-dark') ||
            document.body.classList.contains('theme-light'));
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
    this._updateValidationDisplay();
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
   * Validate current JSON content
   */
  private async _validateCurrentJson(): Promise<void> {
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
        this.lastValidationResult = await seasonsStarsApi.validateCalendar(calendarData);
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

    // Update only the validation container instead of full re-render
    this._updateValidationDisplay();
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
    this._notify(game.i18n.localize('CALENDAR_BUILDER.app.notifications.new_template'));
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
            this._notify(game.i18n.localize('CALENDAR_BUILDER.app.notifications.imported'));
          } catch (error) {
            console.error('Failed to load calendar file:', error);
            this._notify(game.i18n.localize('CALENDAR_BUILDER.app.notifications.import_failed'), 'error');
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
   * Save calendar to file action
   */
  async _onSaveCalendar(event: Event, target: HTMLElement): Promise<void> {
    if (!this.currentJson.trim()) {
      this._notify(game.i18n.localize('CALENDAR_BUILDER.app.notifications.no_content'), 'warn');
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
        this._notify(game.i18n.localize('CALENDAR_BUILDER.app.notifications.imported'));
      } catch (error) {
        console.error('Import failed:', error);
        this._notify(game.i18n.localize('CALENDAR_BUILDER.app.notifications.invalid_json'), 'error');
      }
    });

    input.click();
  }

  /**
   * Validate JSON action
   */
  async _onValidateJson(event: Event, target: HTMLElement): Promise<void> {
    await this._validateCurrentJson();
    this._notify(game.i18n.localize('CALENDAR_BUILDER.app.notifications.validation_complete'));
  }

  /**
   * Clear editor action
   */
  async _onClearEditor(event: Event, target: HTMLElement): Promise<void> {
    const dialog = new foundry.applications.api.DialogV2({
      window: { title: 'Confirm Clear' },
      content: game.i18n.localize('CALENDAR_BUILDER.app.dialogs.confirm_clear'),
      buttons: [
        {
          action: 'yes',
          icon: 'fas fa-check',
          label: 'Yes',
          callback: () => true
        },
        {
          action: 'no',
          icon: 'fas fa-times',
          label: 'No',
          callback: () => false
        }
      ]
    });
    const confirmed = await dialog.wait();

    if (confirmed) {
      this.currentJson = '';
      this.lastValidationResult = null;
      this.render(true);
      this._notify(game.i18n.localize('CALENDAR_BUILDER.app.notifications.cleared'));
    }
  }
}