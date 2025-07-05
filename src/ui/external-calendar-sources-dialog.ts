/**
 * Dialog for managing external calendar sources configuration
 */

import { Logger } from '../core/logger';
import type { ExternalCalendarSource } from '../types/external-calendar';

export class ExternalCalendarSourcesDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  private sources: ExternalCalendarSource[] = [];
  private calendarManager: any; // Will be properly typed when CalendarManager is available
  private showAddForm: boolean = false;

  constructor() {
    super();
    this.loadCurrentSources();
  }

  static DEFAULT_OPTIONS = {
    id: 'external-calendar-sources-dialog',
    classes: ['seasons-stars', 'external-calendar-sources-dialog'],
    tag: 'div',
    window: {
      frame: true,
      positioned: true,
      title: 'External Calendar Sources',
      icon: 'fa-solid fa-globe',
      minimizable: false,
      resizable: true,
    },
    position: {
      width: 600,
      height: 500,
    },
    actions: {
      save: ExternalCalendarSourcesDialog.prototype._onSave,
      cancel: ExternalCalendarSourcesDialog.prototype._onCancel,
      addSource: ExternalCalendarSourcesDialog.prototype._onAddSource,
      confirmAddSource: ExternalCalendarSourcesDialog.prototype._onConfirmAddSource,
      cancelAddSource: ExternalCalendarSourcesDialog.prototype._onCancelAddSource,
      editSource: ExternalCalendarSourcesDialog.prototype._onEditSource,
      removeSource: ExternalCalendarSourcesDialog.prototype._onRemoveSource,
      testSource: ExternalCalendarSourcesDialog.prototype._onTestSource,
      toggleEnabled: ExternalCalendarSourcesDialog.prototype._onToggleEnabled,
      toggleTrusted: ExternalCalendarSourcesDialog.prototype._onToggleTrusted,
      updateProtocol: ExternalCalendarSourcesDialog.prototype._onUpdateProtocol,
    },
  };

  static PARTS = {
    main: {
      id: 'main',
      template: 'modules/seasons-and-stars/templates/external-calendar-sources-dialog.hbs',
    },
  };

  /** @override */
  async _prepareContext(_options = {}): Promise<any> {
    const context = await super._prepareContext(_options);

    const protocols = [
      { value: 'https', label: 'HTTPS' },
      { value: 'github', label: 'GitHub' },
      { value: 'module', label: 'Module' },
      { value: 'local', label: 'Local' },
    ];

    const placeholders = {
      https: 'example.com/calendars/my-calendar.json',
      github: 'username/repository/path/to/calendar.json',
      module: 'module-name/calendars/calendar.json',
      local: 'data/calendars/local-calendar.json',
    };

    return Object.assign(context, {
      sources: this.sources.map((source, index) => ({
        ...source,
        index,
        truncatedLocation: this.truncateLocation(source.location),
      })),
      protocols,
      placeholders,
      showAddForm: this.showAddForm,
    });
  }

  private async loadCurrentSources(): Promise<void> {
    try {
      // Get current sources from settings
      const settingsSources =
        (game.settings?.get(
          'seasons-and-stars',
          'externalCalendarSources'
        ) as ExternalCalendarSource[]) || [];

      // Get sources from calendar manager if available
      this.calendarManager = game.seasonsStars?.manager;
      if (this.calendarManager && this.calendarManager.getExternalSources) {
        this.sources = this.calendarManager.getExternalSources();
      } else {
        this.sources = settingsSources;
      }

      Logger.debug(`Loaded ${this.sources.length} external calendar sources for configuration`);
    } catch (error) {
      Logger.error('Failed to load external calendar sources', error as Error);
      this.sources = [];
    }
  }

  /**
   * Action handler for save button
   */
  async _onSave(_event: Event, _target: HTMLElement): Promise<void> {
    await this.saveChanges();
  }

  /**
   * Action handler for cancel button
   */
  async _onCancel(_event: Event, _target: HTMLElement): Promise<void> {
    this.close();
  }

  /**
   * Action handler for add source button
   */
  async _onAddSource(_event: Event, _target: HTMLElement): Promise<void> {
    this.showAddSourceForm();
  }

  /**
   * Action handler for confirm add source button
   */
  async _onConfirmAddSource(_event: Event, _target: HTMLElement): Promise<void> {
    await this.confirmAddSource();
  }

  /**
   * Action handler for cancel add source button
   */
  async _onCancelAddSource(_event: Event, _target: HTMLElement): Promise<void> {
    this.hideAddSourceForm();
  }

  /**
   * Action handler for edit source button
   */
  async _onEditSource(event: Event, target: HTMLElement): Promise<void> {
    const index = parseInt(target.dataset.index || '0');
    this.editSource(index);
  }

  /**
   * Action handler for remove source button
   */
  async _onRemoveSource(_event: Event, target: HTMLElement): Promise<void> {
    const index = parseInt(target.dataset.index || '0');
    await this.removeSource(index);
  }

  /**
   * Action handler for test source button
   */
  async _onTestSource(event: Event, target: HTMLElement): Promise<void> {
    const index = parseInt(target.dataset.index || '0');
    await this.testSource(index);
  }

  /**
   * Action handler for toggling enabled state
   */
  async _onToggleEnabled(event: Event, target: HTMLElement): Promise<void> {
    const index = parseInt(target.dataset.index || '0');
    const checkbox = target as HTMLInputElement;
    this.sources[index].enabled = checkbox.checked;
  }

  /**
   * Action handler for toggling trusted state
   */
  async _onToggleTrusted(event: Event, target: HTMLElement): Promise<void> {
    const index = parseInt(target.dataset.index || '0');
    const checkbox = target as HTMLInputElement;
    this.sources[index].trusted = checkbox.checked;
  }

  /**
   * Action handler for protocol change
   */
  async _onUpdateProtocol(_event: Event, _target: HTMLElement): Promise<void> {
    this.updateLocationHelp();
  }

  private showAddSourceForm(): void {
    this.showAddForm = true;
    this.render();
  }

  private hideAddSourceForm(): void {
    this.showAddForm = false;
    this.render();
  }

  private truncateLocation(location: string): string {
    if (location.length <= 40) return location;
    return location.substring(0, 37) + '...';
  }

  private updateLocationHelp(): void {
    const protocolSelect = this.element?.querySelector('#source-protocol') as HTMLSelectElement;
    const locationInput = this.element?.querySelector('#source-location') as HTMLInputElement;

    if (!protocolSelect || !locationInput) return;

    const placeholders = {
      https: 'example.com/calendars/my-calendar.json',
      github: 'username/repository/path/to/calendar.json',
      module: 'module-name/calendars/calendar.json',
      local: 'data/calendars/local-calendar.json',
    };

    locationInput.placeholder =
      placeholders[protocolSelect.value as keyof typeof placeholders] || 'Enter location...';
  }

  private async confirmAddSource(): Promise<void> {
    try {
      const form = this.element?.querySelector('.add-source-form') as HTMLElement;
      if (!form) return;

      const protocol = (form.querySelector('#source-protocol') as HTMLSelectElement).value;
      const location = (form.querySelector('#source-location') as HTMLInputElement).value.trim();
      const label = (form.querySelector('#source-label') as HTMLInputElement).value.trim();
      const description = (
        form.querySelector('#source-description') as HTMLTextAreaElement
      ).value.trim();
      const enabled = (form.querySelector('#source-enabled') as HTMLInputElement).checked;
      const trusted = (form.querySelector('#source-trusted') as HTMLInputElement).checked;

      // Validation
      if (!location) {
        ui.notifications?.error('Location is required');
        return;
      }

      if (!label) {
        ui.notifications?.error('Label is required');
        return;
      }

      // Check for duplicates
      const externalId = `${protocol}:${location}`;
      const existing = this.sources.find(s => `${s.protocol}:${s.location}` === externalId);
      if (existing) {
        ui.notifications?.error('A source with this protocol and location already exists');
        return;
      }

      // Create new source
      const newSource: ExternalCalendarSource = {
        protocol: protocol as any,
        location,
        label,
        description: description || undefined,
        enabled,
        trusted,
      };

      this.sources.push(newSource);
      this.hideAddSourceForm();

      Logger.info(`Added external calendar source: ${externalId}`);
    } catch (error) {
      Logger.error('Failed to add external calendar source', error as Error);
      ui.notifications?.error('Failed to add external calendar source');
    }
  }

  private editSource(_index: number): void {
    // TODO: Implement edit functionality - for now, users can modify enabled/trusted inline
    ui.notifications?.info(
      'Edit functionality coming soon. You can currently modify enabled/trusted status directly in the table.'
    );
  }

  private async removeSource(index: number): Promise<void> {
    const source = this.sources[index];
    if (!source) return;

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      content: `<p>Are you sure you want to remove the external calendar source:</p><p><strong>${source.label}</strong> (${source.protocol}:${source.location})</p>`,
    });

    if (confirmed) {
      this.sources.splice(index, 1);
      this.render();
      Logger.info(`Removed external calendar source: ${source.protocol}:${source.location}`);
    }
  }

  private async testSource(index: number): Promise<void> {
    const source = this.sources[index];
    if (!source) return;

    try {
      const externalId = `${source.protocol}:${source.location}`;

      ui.notifications?.info(`Testing external calendar source: ${source.label}`);

      // Test the source using the calendar manager
      if (this.calendarManager && this.calendarManager.loadExternalCalendar) {
        const result = await this.calendarManager.loadExternalCalendar(externalId);

        if (result) {
          ui.notifications?.info(`✓ Successfully tested external calendar source: ${source.label}`);
        } else {
          ui.notifications?.warn(`⚠ Test failed for external calendar source: ${source.label}`);
        }
      } else {
        ui.notifications?.warn('Calendar manager not available for testing');
      }
    } catch (error) {
      Logger.error(
        `Failed to test external calendar source: ${source.protocol}:${source.location}`,
        error as Error
      );
      ui.notifications?.error(`✗ Test failed for external calendar source: ${source.label}`);
    }
  }

  private async saveChanges(): Promise<void> {
    try {
      Logger.debug(`Saving ${this.sources.length} external calendar sources`);

      // Save to settings
      await game.settings?.set('seasons-and-stars', 'externalCalendarSources', this.sources);

      // Update calendar manager if available
      if (this.calendarManager) {
        // Clear existing sources and re-add updated ones
        const currentSources = this.calendarManager.getExternalSources();
        for (const existing of currentSources) {
          const externalId = `${existing.protocol}:${existing.location}`;
          this.calendarManager.removeExternalSource(externalId);
        }

        // Add updated sources
        for (const source of this.sources) {
          this.calendarManager.addExternalSource(source);
        }
      }

      ui.notifications?.info(`Saved ${this.sources.length} external calendar source(s)`);
      Logger.info(`Successfully saved external calendar sources configuration`);
    } catch (error) {
      Logger.error('Failed to save external calendar sources', error as Error);
      ui.notifications?.error('Failed to save external calendar sources configuration');
    }
  }

  /**
   * Show the external calendar sources configuration dialog
   */
  static show(): void {
    new ExternalCalendarSourcesDialog().render(true);
  }
}
