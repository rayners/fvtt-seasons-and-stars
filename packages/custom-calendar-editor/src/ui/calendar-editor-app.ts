/**
 * Main Calendar Editor Application
 * Provides both creation wizard and editing interface
 */

import { Logger } from '../core/logger';
import type { SeasonsStarsCalendar } from '../types/calendar';

export interface CalendarEditorOptions {
  mode: 'create' | 'edit' | 'variant';
  calendar?: SeasonsStarsCalendar;
  baseCalendar?: SeasonsStarsCalendar;
}

export class CalendarEditorApp extends foundry.applications.api.ApplicationV2 {
  private mode: 'create' | 'edit' | 'variant';
  private calendar?: SeasonsStarsCalendar;
  private baseCalendar?: SeasonsStarsCalendar;
  private currentStep: number = 0;
  private wizardSteps: string[] = ['basic', 'time', 'months', 'weekdays', 'advanced', 'review'];
  
  constructor(options: CalendarEditorOptions = { mode: 'create' }) {
    super();
    this.mode = options.mode;
    this.calendar = options.calendar;
    this.baseCalendar = options.baseCalendar;
    
    // Initialize calendar data for new calendars
    if (this.mode === 'create') {
      this.calendar = this.createEmptyCalendar();
    } else if (this.mode === 'variant' && this.baseCalendar) {
      this.calendar = this.createVariantCalendar(this.baseCalendar);
    }
  }
  
  static DEFAULT_OPTIONS = {
    id: 'custom-calendar-editor',
    tag: 'form',
    window: {
      title: 'custom-calendar-editor.editor.title',
      icon: 'fas fa-calendar-plus',
      resizable: true
    },
    position: {
      width: 800,
      height: 600
    },
    form: {
      handler: undefined,
      submitOnChange: false,
      closeOnSubmit: false
    }
  };
  
  get template() {
    const templatePath = 'modules/seasons-and-stars-custom-calendar-editor/templates/calendar-editor.hbs';
    Logger.debug('CalendarEditorApp template path:', templatePath);
    
    // Check if template exists
    const templateExists = game.assets?.has?.(templatePath) || document.querySelector(`script[src*="${templatePath}"]`);
    Logger.debug('Template exists check:', templateExists);
    
    return templatePath;
  }
  
  get title(): string {
    switch (this.mode) {
      case 'create':
        return game.i18n.localize('custom-calendar-editor.wizard.title');
      case 'edit':
        return `${game.i18n.localize('custom-calendar-editor.editor.title')}: ${this.calendar?.name || this.calendar?.id}`;
      case 'variant':
        return `${game.i18n.localize('custom-calendar-editor.buttons.create-variant')}: ${this.baseCalendar?.name || this.baseCalendar?.id}`;
      default:
        return game.i18n.localize('custom-calendar-editor.editor.title');
    }
  }
  
  async _prepareContext(options: any) {
    Logger.debug('CalendarEditorApp._prepareContext called', {
      mode: this.mode,
      currentStep: this.currentStep,
      calendar: this.calendar?.id,
      wizardSteps: this.wizardSteps
    });
    
    const context = await super._prepareContext(options);
    
    const preparedContext = {
      ...context,
      mode: this.mode,
      calendar: this.calendar,
      baseCalendar: this.baseCalendar,
      currentStep: this.currentStep,
      wizardSteps: this.wizardSteps,
      isWizardMode: this.mode === 'create' || this.mode === 'variant',
      canGoNext: this.currentStep < this.wizardSteps.length - 1,
      canGoPrevious: this.currentStep > 0,
      isLastStep: this.currentStep === this.wizardSteps.length - 1,
      stepTitle: game.i18n.localize(`custom-calendar-editor.wizard.step-${this.wizardSteps[this.currentStep]}`)
    };
    
    Logger.debug('CalendarEditorApp context prepared:', preparedContext);
    return preparedContext;
  }
  
  async _renderHTML(context: any, options: any): Promise<string> {
    Logger.debug('CalendarEditorApp._renderHTML called - using direct HTML rendering');
    
    // Direct HTML rendering since template loading is failing
    const html = `
      <div class="custom-calendar-editor">
        <div class="wizard-header">
          <div class="wizard-progress">
            ${context.wizardSteps.map((step: string, index: number) => `
              <div class="step ${index === context.currentStep ? 'active' : ''} ${index < context.currentStep ? 'completed' : ''}">
                <span class="step-number">${index + 1}</span>
                <span class="step-name">${step}</span>
              </div>
            `).join('')}
          </div>
          <h2 class="step-title">Step ${context.currentStep + 1}: ${context.wizardSteps[context.currentStep]}</h2>
        </div>
        
        <form class="calendar-form">
          ${context.currentStep === 0 ? `
            <div class="form-section basic-info">
              <h3>Basic Information</h3>
              <div class="form-group">
                <label for="calendar-id">Calendar ID:</label>
                <input type="text" id="calendar-id" name="id" value="${context.calendar?.id || ''}" required>
              </div>
              <div class="form-group">
                <label for="calendar-name">Calendar Name:</label>
                <input type="text" id="calendar-name" name="name" value="${context.calendar?.name || ''}" required>
              </div>
              <div class="form-group">
                <label for="calendar-description">Description:</label>
                <textarea id="calendar-description" name="description" rows="3">${context.calendar?.description || ''}</textarea>
              </div>
            </div>
          ` : ''}
          
          ${context.currentStep === 1 ? `
            <div class="form-section time-config">
              <h3>Time Configuration</h3>
              <div class="form-row">
                <div class="form-group">
                  <label for="hours-in-day">Hours in Day:</label>
                  <input type="number" id="hours-in-day" name="time.hoursInDay" value="${context.calendar?.time?.hoursInDay || 24}" min="1" max="48" required>
                </div>
                <div class="form-group">
                  <label for="minutes-in-hour">Minutes in Hour:</label>
                  <input type="number" id="minutes-in-hour" name="time.minutesInHour" value="${context.calendar?.time?.minutesInHour || 60}" min="1" max="120" required>
                </div>
                <div class="form-group">
                  <label for="seconds-in-minute">Seconds in Minute:</label>
                  <input type="number" id="seconds-in-minute" name="time.secondsInMinute" value="${context.calendar?.time?.secondsInMinute || 60}" min="1" max="120" required>
                </div>
              </div>
            </div>
          ` : ''}
          
          ${context.currentStep >= 2 ? `
            <div class="form-section">
              <h3>Step ${context.currentStep + 1}: ${context.wizardSteps[context.currentStep]}</h3>
              <p>This step is under development. Use the navigation to continue.</p>
            </div>
          ` : ''}
        </form>
        
        <footer class="editor-footer">
          <div class="wizard-navigation">
            ${context.canGoPrevious ? '<button type="button" class="wizard-previous">Previous</button>' : ''}
            <div class="spacer"></div>
            ${context.isLastStep ? 
              '<button type="button" class="wizard-finish">Finish</button>' : 
              '<button type="button" class="wizard-next">Next</button>'
            }
          </div>
        </footer>
      </div>
    `;
    
    Logger.debug('HTML generated, length:', html.length);
    return html;
  }
  
  async _replaceHTML(result: string, content: HTMLElement, options: any): Promise<void> {
    Logger.debug('CalendarEditorApp._replaceHTML called');
    content.innerHTML = result;
  }

  async _onRender(context: any, options: any): Promise<void> {
    Logger.debug('CalendarEditorApp._onRender called', { context, options });
    
    await super._onRender(context, options);
    
    Logger.debug('CalendarEditorApp._onRender super call completed');
    
    // Get the rendered HTML element
    const element = this.element;
    if (!element) {
      Logger.warn('CalendarEditorApp: No element available after render');
      return;
    }
    
    Logger.debug('CalendarEditorApp element found, setting up event listeners');
    Logger.debug('Element HTML preview:', element.innerHTML.substring(0, 500));
    Logger.debug('Element classes:', element.className);
    Logger.debug('Element visible:', element.offsetHeight > 0);
    
    // Wizard navigation
    element.querySelector('.wizard-next')?.addEventListener('click', this._onWizardNext.bind(this));
    element.querySelector('.wizard-previous')?.addEventListener('click', this._onWizardPrevious.bind(this));
    element.querySelector('.wizard-finish')?.addEventListener('click', this._onWizardFinish.bind(this));
    
    // Form inputs
    element.querySelectorAll('input, select, textarea').forEach(input => {
      input.addEventListener('change', this._onFormChange.bind(this));
    });
    
    // Dynamic content buttons
    element.querySelector('.add-month')?.addEventListener('click', this._onAddMonth.bind(this));
    element.querySelectorAll('.remove-month').forEach(btn => {
      btn.addEventListener('click', this._onRemoveMonth.bind(this));
    });
    element.querySelector('.add-weekday')?.addEventListener('click', this._onAddWeekday.bind(this));
    element.querySelectorAll('.remove-weekday').forEach(btn => {
      btn.addEventListener('click', this._onRemoveWeekday.bind(this));
    });
    element.querySelector('.add-intercalary')?.addEventListener('click', this._onAddIntercalary.bind(this));
    element.querySelectorAll('.remove-intercalary').forEach(btn => {
      btn.addEventListener('click', this._onRemoveIntercalary.bind(this));
    });
    
    // Save and cancel
    element.querySelector('.save-calendar')?.addEventListener('click', this._onSaveCalendar.bind(this));
    element.querySelector('.cancel-editor')?.addEventListener('click', this._onCancelEditor.bind(this));
  }
  
  private async _onWizardNext(event: Event): Promise<void> {
    event.preventDefault();
    
    // Validate current step
    if (!this._validateCurrentStep()) {
      return;
    }
    
    this.currentStep++;
    this.render();
  }
  
  private async _onWizardPrevious(event: Event): Promise<void> {
    event.preventDefault();
    this.currentStep--;
    this.render();
  }
  
  private async _onWizardFinish(event: Event): Promise<void> {
    event.preventDefault();
    
    // Validate entire calendar
    if (!this._validateCalendar()) {
      return;
    }
    
    // Save calendar
    await this._saveCalendar();
  }
  
  private _onFormChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const field = target.name;
    const value = target.type === 'number' ? parseFloat(target.value) : target.value;
    
    // Update calendar data
    this._updateCalendarField(field, value);
    
    // Real-time validation
    this._validateField(field, value);
  }
  
  private _onAddMonth(event: Event): void {
    event.preventDefault();
    
    if (!this.calendar) return;
    
    if (!this.calendar.months) {
      this.calendar.months = [];
    }
    
    this.calendar.months.push({
      name: `Month ${this.calendar.months.length + 1}`,
      days: 30,
      intercalary: false
    });
    
    this.render();
  }
  
  private _onRemoveMonth(event: Event): void {
    event.preventDefault();
    const button = event.target as HTMLElement;
    const index = parseInt(button.dataset.index!);
    
    if (this.calendar?.months && index >= 0 && index < this.calendar.months.length) {
      this.calendar.months.splice(index, 1);
      this.render();
    }
  }
  
  private _onAddWeekday(event: Event): void {
    event.preventDefault();
    
    if (!this.calendar) return;
    
    if (!this.calendar.weekdays) {
      this.calendar.weekdays = [];
    }
    
    this.calendar.weekdays.push({
      name: `Day ${this.calendar.weekdays.length + 1}`,
      abbreviation: `D${this.calendar.weekdays.length + 1}`
    });
    
    this.render();
  }
  
  private _onRemoveWeekday(event: Event): void {
    event.preventDefault();
    const button = event.target as HTMLElement;
    const index = parseInt(button.dataset.index!);
    
    if (this.calendar?.weekdays && index >= 0 && index < this.calendar.weekdays.length) {
      this.calendar.weekdays.splice(index, 1);
      this.render();
    }
  }
  
  private _onAddIntercalary(event: Event): void {
    event.preventDefault();
    
    if (!this.calendar) return;
    
    if (!this.calendar.intercalary) {
      this.calendar.intercalary = [];
    }
    
    this.calendar.intercalary.push({
      name: `Intercalary ${this.calendar.intercalary.length + 1}`,
      day: 1,
      month: this.calendar.months?.[0]?.name || 'Month 1'
    });
    
    this.render();
  }
  
  private _onRemoveIntercalary(event: Event): void {
    event.preventDefault();
    const button = event.target as HTMLElement;
    const index = parseInt(button.dataset.index!);
    
    if (this.calendar?.intercalary && index >= 0 && index < this.calendar.intercalary.length) {
      this.calendar.intercalary.splice(index, 1);
      this.render();
    }
  }
  
  private async _onSaveCalendar(event: Event): Promise<void> {
    event.preventDefault();
    
    if (!this._validateCalendar()) {
      return;
    }
    
    await this._saveCalendar();
  }
  
  private _onCancelEditor(event: Event): void {
    event.preventDefault();
    this.close();
  }
  
  private _updateCalendarField(field: string, value: any): void {
    if (!this.calendar) return;
    
    // Handle nested field updates
    const fieldParts = field.split('.');
    let target: any = this.calendar;
    
    for (let i = 0; i < fieldParts.length - 1; i++) {
      if (!target[fieldParts[i]]) {
        target[fieldParts[i]] = {};
      }
      target = target[fieldParts[i]];
    }
    
    target[fieldParts[fieldParts.length - 1]] = value;
  }
  
  private _validateCurrentStep(): boolean {
    // Basic step validation logic
    switch (this.wizardSteps[this.currentStep]) {
      case 'basic':
        return !!(this.calendar?.id && this.calendar?.name);
      case 'time':
        return !!(this.calendar?.time?.hoursInDay && this.calendar?.time?.minutesInHour);
      case 'months':
        return !!(this.calendar?.months && this.calendar.months.length > 0);
      case 'weekdays':
        return !!(this.calendar?.weekdays && this.calendar.weekdays.length > 0);
      default:
        return true;
    }
  }
  
  private _validateField(field: string, value: any): boolean {
    // Individual field validation
    // This would be expanded with comprehensive validation logic
    return true;
  }
  
  private _validateCalendar(): boolean {
    if (!this.calendar) {
      ui.notifications?.error('No calendar data to validate');
      return false;
    }
    
    // Use S&S validation if available
    if ((game as any).seasonsStars?.api?.validateCalendar) {
      try {
        const result = (game as any).seasonsStars.api.validateCalendar(this.calendar);
        if (!result.valid) {
          ui.notifications?.error(`Calendar validation failed: ${result.errors?.join(', ')}`);
          return false;
        }
      } catch (error) {
        Logger.error('Calendar validation error:', error);
        ui.notifications?.error('Calendar validation failed');
        return false;
      }
    }
    
    return true;
  }
  
  private async _saveCalendar(): Promise<void> {
    if (!this.calendar) return;
    
    try {
      if (this.mode === 'edit') {
        await (game as any).customCalendarEditor?.storage.updateCustomCalendar(this.calendar.id, this.calendar);
      } else {
        await (game as any).customCalendarEditor?.storage.saveCustomCalendar(this.calendar);
      }
      
      Logger.info(`Calendar saved: ${this.calendar.name || this.calendar.id}`);
      
      // Re-register all custom calendars with S&S core
      try {
        await this.registerCustomCalendarsWithSS();
        Logger.debug('Custom calendars re-registered with S&S core');
      } catch (regError) {
        Logger.error('Failed to register calendars with S&S:', regError);
      }
      
      ui.notifications?.info(`Calendar ${this.calendar.name || this.calendar.id} saved successfully`);
      this.close();
      
      // Force refresh of calendar selection dialog
      this.refreshCalendarSelectionDialog();
      
    } catch (error) {
      Logger.error('Failed to save calendar:', error);
      ui.notifications?.error('Failed to save calendar');
    }
  }
  
  private async registerCustomCalendarsWithSS(): Promise<void> {
    // For edit mode, we need to update the specific calendar, not reload all calendars
    if (this.mode === 'edit' && this.calendar) {
      await this.updateCalendarInSS(this.calendar);
    } else {
      // For create/variant mode, load the new calendar
      await this.loadNewCalendarIntoSS();
    }
    
    // Force refresh of calendar system and UI
    await this.refreshCalendarSystem();
  }
  
  private async updateCalendarInSS(calendar: SeasonsStarsCalendar): Promise<void> {
    const manager = (game as any).seasonsStars?.manager;
    if (!manager) {
      Logger.warn('S&S manager not available for calendar update');
      return;
    }
    
    try {
      const calendarId = calendar.id;
      const wasActive = manager.getActiveCalendarId?.() === calendarId;
      
      Logger.debug(`Updating calendar in S&S: ${calendarId} (active: ${wasActive})`);
      
      // Force update by directly manipulating the manager's collections
      // This bypasses the duplicate check in loadCalendar()
      manager.calendars.set(calendarId, calendar);
      
      // Update the engine with new calendar data
      const existingEngine = manager.engines.get(calendarId);
      if (existingEngine && existingEngine.updateCalendar) {
        existingEngine.updateCalendar(calendar);
        Logger.debug(`Updated calendar engine for: ${calendarId}`);
      } else {
        // Create new engine if update method doesn't exist or engine missing
        const CalendarEngine = (window as any).SeasonsStars?.CalendarEngine;
        if (CalendarEngine) {
          manager.engines.set(calendarId, new CalendarEngine(calendar));
          Logger.debug(`Created new calendar engine for: ${calendarId}`);
        }
      }
      
      // If this was the active calendar, refresh the time converter and fire hooks
      if (wasActive) {
        const updatedEngine = manager.engines.get(calendarId);
        if (updatedEngine && manager.timeConverter?.updateEngine) {
          manager.timeConverter.updateEngine(updatedEngine);
          Logger.debug(`Updated time converter for active calendar: ${calendarId}`);
        }
        
        // Fire hook to refresh UI for active calendar changes
        Hooks.callAll('seasons-stars:calendarChanged', {
          newCalendarId: calendarId,
          calendar: calendar
        });
        Logger.debug(`Fired calendar changed hook for updated calendar: ${calendarId}`);
      }
      
    } catch (error) {
      Logger.error(`Failed to update calendar in S&S: ${calendar.id}`, error);
    }
  }
  
  private async loadNewCalendarIntoSS(): Promise<void> {
    if (!this.calendar) return;
    
    const manager = (game as any).seasonsStars?.manager;
    if (!manager) {
      Logger.warn('S&S manager not available for calendar loading');
      return;
    }
    
    try {
      const sourceInfo = {
        type: 'module',
        sourceName: 'Custom Calendar Editor',
        description: `User-created custom calendar: ${this.calendar.name || this.calendar.id}`,
        icon: 'fa-solid fa-calendar-plus',
        moduleId: 'seasons-and-stars-custom-calendar-editor'
      };
      
      const success = manager.loadCalendar(this.calendar, sourceInfo);
      if (success) {
        Logger.debug(`Loaded new custom calendar into S&S: ${this.calendar.id}`);
      } else {
        Logger.warn(`Failed to load custom calendar: ${this.calendar.id}`);
      }
    } catch (error) {
      Logger.error(`Failed to load custom calendar ${this.calendar.id}:`, error);
    }
  }
  
  private async refreshCalendarSystem(): Promise<void> {
    try {
      // Update calendar settings dropdown to include new calendars
      const registerSettings = (window as any).SeasonsStars?.registerCalendarSettings || 
                               (game as any).seasonsStars?.registerCalendarSettings;
      if (typeof registerSettings === 'function') {
        registerSettings();
        Logger.debug('Calendar settings refreshed');
      }
      
      // Note: We don't fire seasons-stars:calendarChanged here because that hook is specifically
      // for when the active calendar changes, not when the collection of available calendars changes.
      // Instead, we directly refresh the calendar selection dialog if it's open.
      
      Logger.debug('Calendar system refresh completed');
    } catch (error) {
      Logger.error('Failed to refresh calendar system:', error);
    }
  }
  
  private refreshCalendarSelectionDialog(): void {
    try {
      // Find and refresh any open calendar selection dialogs
      Object.values((ui as any).windows || {}).forEach((app: any) => {
        if (app.constructor.name === 'CalendarSelectionDialog') {
          Logger.debug('Refreshing calendar selection dialog');
          app.render(true); // Force refresh
        }
      });
      
      // Also try to access via S&S static reference if available
      const CalendarSelectionDialog = (window as any).SeasonsStars?.CalendarSelectionDialog;
      if (CalendarSelectionDialog?.activeInstance?.rendered) {
        Logger.debug('Refreshing active calendar selection dialog instance');
        CalendarSelectionDialog.activeInstance.render(true);
      }
    } catch (error) {
      Logger.debug('Could not refresh calendar selection dialog:', error);
    }
  }
  
  private createEmptyCalendar(): SeasonsStarsCalendar {
    return {
      id: `custom-${Date.now()}`,
      name: 'New Calendar',
      translations: {
        en: {
          label: 'New Calendar',
          description: 'A custom calendar'
        }
      },
      year: {
        epoch: 0,
        currentYear: 1,
        prefix: '',
        suffix: '',
        startDay: 1
      },
      leapYear: {
        rule: 'none'
      },
      months: [
        {
          name: 'First Month',
          days: 30,
          intercalary: false
        }
      ],
      weekdays: [
        { name: 'First Day', abbreviation: 'FD' },
        { name: 'Second Day', abbreviation: 'SD' },
        { name: 'Third Day', abbreviation: 'TD' },
        { name: 'Fourth Day', abbreviation: 'FoD' },
        { name: 'Fifth Day', abbreviation: 'FiD' },
        { name: 'Sixth Day', abbreviation: 'SiD' },
        { name: 'Seventh Day', abbreviation: 'SeD' }
      ],
      intercalary: [],
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60
      }
    };
  }
  
  private createVariantCalendar(baseCalendar: SeasonsStarsCalendar): SeasonsStarsCalendar {
    const variant = JSON.parse(JSON.stringify(baseCalendar));
    variant.id = `${baseCalendar.id}-variant-${Date.now()}`;
    variant.name = `${baseCalendar.name} Variant`;
    
    if (variant.translations) {
      Object.keys(variant.translations).forEach(lang => {
        variant.translations[lang].label = `${variant.translations[lang].label} Variant`;
      });
    }
    
    return variant;
  }
}