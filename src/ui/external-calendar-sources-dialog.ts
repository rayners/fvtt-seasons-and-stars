/**
 * Dialog for managing external calendar sources configuration
 */

import { Logger } from '../core/logger';
import type { ExternalCalendarSource } from '../types/external-calendar';

export class ExternalCalendarSourcesDialog extends Dialog {
  private sources: ExternalCalendarSource[] = [];
  private calendarManager: any; // Will be properly typed when CalendarManager is available

  constructor() {
    const content = ExternalCalendarSourcesDialog.generateContent();
    
    super({
      title: 'External Calendar Sources',
      content,
      buttons: {
        save: {
          label: 'Save Changes',
          callback: (html: HTMLElement) => this.saveChanges(html),
        },
        cancel: {
          label: 'Cancel',
          callback: () => {},
        },
        add: {
          label: 'Add Source',
          callback: (html: HTMLElement) => this.showAddSourceForm(html),
        },
      },
      default: 'save',
      render: (html: HTMLElement) => this.activateListeners(html),
    }, {
      width: 600,
      height: 500,
      resizable: true,
      classes: ['external-calendar-sources-dialog'],
    });

    this.loadCurrentSources();
  }

  static generateContent(): string {
    return `
      <div class="external-calendar-sources">
        <div class="sources-header">
          <p>Configure external calendar sources for loading custom calendars from various protocols.</p>
          <p class="warning"><i class="fas fa-exclamation-triangle"></i> Only trusted sources should be enabled. Untrusted sources are cached but not automatically loaded.</p>
        </div>
        
        <div class="sources-list">
          <table class="sources-table">
            <thead>
              <tr>
                <th>Enabled</th>
                <th>Protocol</th>
                <th>Location</th>
                <th>Label</th>
                <th>Trusted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody class="sources-tbody">
              <!-- Sources will be populated here -->
            </tbody>
          </table>
        </div>

        <div class="add-source-form" style="display: none;">
          <h3>Add New External Calendar Source</h3>
          <div class="form-group">
            <label for="source-protocol">Protocol:</label>
            <select id="source-protocol" name="protocol">
              <option value="https">HTTPS</option>
              <option value="github">GitHub</option>
              <option value="module">Module</option>
              <option value="local">Local</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="source-location">Location:</label>
            <input type="text" id="source-location" name="location" placeholder="example.com/calendar.json">
            <div class="location-help">
              <small>
                <strong>HTTPS:</strong> example.com/calendar.json<br>
                <strong>GitHub:</strong> user/repo/path/calendar.json<br>
                <strong>Module:</strong> module-name/calendars/calendar.json<br>
                <strong>Local:</strong> path/to/calendar.json
              </small>
            </div>
          </div>
          
          <div class="form-group">
            <label for="source-label">Label:</label>
            <input type="text" id="source-label" name="label" placeholder="My Custom Calendar">
          </div>
          
          <div class="form-group">
            <label for="source-description">Description:</label>
            <textarea id="source-description" name="description" placeholder="Description of this calendar source"></textarea>
          </div>
          
          <div class="form-group checkbox-group">
            <label class="checkbox">
              <input type="checkbox" id="source-enabled" name="enabled" checked>
              <span>Enabled (automatically load this source)</span>
            </label>
          </div>
          
          <div class="form-group checkbox-group">
            <label class="checkbox">
              <input type="checkbox" id="source-trusted" name="trusted">
              <span>Trusted (load immediately without caching delay)</span>
            </label>
          </div>
          
          <div class="form-buttons">
            <button type="button" class="confirm-add-source">Add Source</button>
            <button type="button" class="cancel-add-source">Cancel</button>
          </div>
        </div>
      </div>
    `;
  }

  private async loadCurrentSources(): Promise<void> {
    try {
      // Get current sources from settings
      const settingsSources = game.settings?.get('seasons-and-stars', 'externalCalendarSources') as ExternalCalendarSource[] || [];
      
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

  private activateListeners(html: HTMLElement): void {
    // Populate sources table
    this.populateSourcesTable(html);
    
    // Add source button
    html.querySelector('.add-source-button')?.addEventListener('click', () => {
      this.showAddSourceForm(html);
    });
    
    // Confirm add source
    html.querySelector('.confirm-add-source')?.addEventListener('click', () => {
      this.confirmAddSource(html);
    });
    
    // Cancel add source
    html.querySelector('.cancel-add-source')?.addEventListener('click', () => {
      this.hideAddSourceForm(html);
    });
    
    // Protocol change handler for location help text
    const protocolSelect = html.querySelector('#source-protocol') as HTMLSelectElement;
    protocolSelect?.addEventListener('change', () => {
      this.updateLocationHelp(html);
    });
  }

  private populateSourcesTable(html: HTMLElement): void {
    const tbody = html.querySelector('.sources-tbody') as HTMLTableSectionElement;
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (this.sources.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="no-sources">No external calendar sources configured</td></tr>';
      return;
    }
    
    this.sources.forEach((source, index) => {
      const row = document.createElement('tr');
      row.dataset.sourceIndex = index.toString();
      
      row.innerHTML = `
        <td>
          <input type="checkbox" class="source-enabled" ${source.enabled ? 'checked' : ''}>
        </td>
        <td class="protocol-cell">${source.protocol}</td>
        <td class="location-cell" title="${source.location}">${this.truncateLocation(source.location)}</td>
        <td class="label-cell" title="${source.label || ''}">${source.label || '<em>Unlabeled</em>'}</td>
        <td>
          <input type="checkbox" class="source-trusted" ${source.trusted ? 'checked' : ''}>
        </td>
        <td class="actions-cell">
          <button type="button" class="edit-source" title="Edit source">
            <i class="fas fa-edit"></i>
          </button>
          <button type="button" class="remove-source" title="Remove source">
            <i class="fas fa-trash"></i>
          </button>
          <button type="button" class="test-source" title="Test connection">
            <i class="fas fa-plug"></i>
          </button>
        </td>
      `;
      
      tbody.appendChild(row);
      
      // Add event listeners for this row
      this.addRowEventListeners(row, index);
    });
  }

  private addRowEventListeners(row: HTMLTableRowElement, index: number): void {
    // Enabled checkbox
    const enabledCheckbox = row.querySelector('.source-enabled') as HTMLInputElement;
    enabledCheckbox?.addEventListener('change', () => {
      this.sources[index].enabled = enabledCheckbox.checked;
    });
    
    // Trusted checkbox
    const trustedCheckbox = row.querySelector('.source-trusted') as HTMLInputElement;
    trustedCheckbox?.addEventListener('change', () => {
      this.sources[index].trusted = trustedCheckbox.checked;
    });
    
    // Edit button
    row.querySelector('.edit-source')?.addEventListener('click', () => {
      this.editSource(index);
    });
    
    // Remove button
    row.querySelector('.remove-source')?.addEventListener('click', () => {
      this.removeSource(index);
    });
    
    // Test button
    row.querySelector('.test-source')?.addEventListener('click', () => {
      this.testSource(index);
    });
  }

  private truncateLocation(location: string): string {
    if (location.length <= 40) return location;
    return location.substring(0, 37) + '...';
  }

  private showAddSourceForm(html: HTMLElement): void {
    const form = html.querySelector('.add-source-form') as HTMLElement;
    if (form) {
      form.style.display = 'block';
    }
  }

  private hideAddSourceForm(html: HTMLElement): void {
    const form = html.querySelector('.add-source-form') as HTMLElement;
    if (form) {
      form.style.display = 'none';
      this.clearAddSourceForm(html);
    }
  }

  private clearAddSourceForm(html: HTMLElement): void {
    const form = html.querySelector('.add-source-form') as HTMLElement;
    if (!form) return;
    
    (form.querySelector('#source-location') as HTMLInputElement).value = '';
    (form.querySelector('#source-label') as HTMLInputElement).value = '';
    (form.querySelector('#source-description') as HTMLTextAreaElement).value = '';
    (form.querySelector('#source-enabled') as HTMLInputElement).checked = true;
    (form.querySelector('#source-trusted') as HTMLInputElement).checked = false;
  }

  private updateLocationHelp(html: HTMLElement): void {
    const protocol = (html.querySelector('#source-protocol') as HTMLSelectElement)?.value;
    const locationInput = html.querySelector('#source-location') as HTMLInputElement;
    
    if (!protocol || !locationInput) return;
    
    const placeholders = {
      'https': 'example.com/calendars/my-calendar.json',
      'github': 'username/repository/path/to/calendar.json',
      'module': 'module-name/calendars/calendar.json',
      'local': 'data/calendars/local-calendar.json'
    };
    
    locationInput.placeholder = placeholders[protocol as keyof typeof placeholders] || 'Enter location...';
  }

  private confirmAddSource(html: HTMLElement): void {
    try {
      const form = html.querySelector('.add-source-form') as HTMLElement;
      if (!form) return;
      
      const protocol = (form.querySelector('#source-protocol') as HTMLSelectElement).value;
      const location = (form.querySelector('#source-location') as HTMLInputElement).value.trim();
      const label = (form.querySelector('#source-label') as HTMLInputElement).value.trim();
      const description = (form.querySelector('#source-description') as HTMLTextAreaElement).value.trim();
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
      this.populateSourcesTable(html);
      this.hideAddSourceForm(html);
      
      Logger.info(`Added external calendar source: ${externalId}`);
      
    } catch (error) {
      Logger.error('Failed to add external calendar source', error as Error);
      ui.notifications?.error('Failed to add external calendar source');
    }
  }

  private editSource(_index: number): void {
    // TODO: Implement edit functionality - for now, users can modify enabled/trusted inline
    ui.notifications?.info('Edit functionality coming soon. You can currently modify enabled/trusted status directly in the table.');
  }

  private removeSource(index: number): void {
    const source = this.sources[index];
    if (!source) return;
    
    new Dialog({
      title: 'Remove External Calendar Source',
      content: `<p>Are you sure you want to remove the external calendar source:</p><p><strong>${source.label}</strong> (${source.protocol}:${source.location})</p>`,
      buttons: {
        yes: {
          label: 'Yes, Remove',
          callback: () => {
            this.sources.splice(index, 1);
            const html = document.querySelector('.external-calendar-sources-dialog .window-content') as HTMLElement;
            if (html) {
              this.populateSourcesTable(html);
            }
            Logger.info(`Removed external calendar source: ${source.protocol}:${source.location}`);
          },
        },
        no: {
          label: 'Cancel',
          callback: () => {},
        },
      },
      default: 'no',
    }).render(true);
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
      Logger.error(`Failed to test external calendar source: ${source.protocol}:${source.location}`, error as Error);
      ui.notifications?.error(`✗ Test failed for external calendar source: ${source.label}`);
    }
  }

  private async saveChanges(_html: HTMLElement): Promise<void> {
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