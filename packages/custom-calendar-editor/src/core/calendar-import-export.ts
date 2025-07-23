/**
 * Calendar Import/Export functionality
 * Handles file I/O and format conversion between S&S and Simple Calendar formats
 */

import { Logger } from './logger';
import { SimpleCalendarConverter } from './simple-calendar-converter';
import type { SeasonsStarsCalendar } from '../types/calendar';

export class CalendarImportExport {
  private converter: SimpleCalendarConverter;
  
  constructor() {
    this.converter = new SimpleCalendarConverter();
  }
  
  /**
   * Show the import dialog using Foundry's FilePicker
   */
  async showImportDialog(): Promise<void> {
    // Create file picker for JSON files
    const filePicker = new FilePicker({
      type: 'data',
      current: '',
      callback: this.handleFileImport.bind(this),
      button: game.i18n.localize('custom-calendar-editor.import.select-file'),
      options: {
        wildcard: true
      }
    });
    
    // Show file picker dialog
    filePicker.render(true);
  }
  
  /**
   * Handle file selection from FilePicker
   */
  private async handleFileImport(filePath: string): Promise<void> {
    try {
      Logger.info(`Importing calendar from: ${filePath}`);
      
      // Fetch file content
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      
      const content = await response.text();
      
      // Parse and import calendar
      await this.importFromJSON(content);
      
    } catch (error) {
      Logger.error('File import failed:', error);
      ui.notifications?.error(`Failed to import calendar: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Import calendar from JSON string
   */
  async importFromJSON(jsonContent: string): Promise<void> {
    try {
      // Parse JSON
      const data = JSON.parse(jsonContent);
      
      // Detect format
      const format = this.detectCalendarFormat(data);
      Logger.info(`Detected calendar format: ${format}`);
      
      // Convert to S&S format
      let calendar: SeasonsStarsCalendar;
      
      switch (format) {
        case 'simple-calendar':
          calendar = this.converter.convertFromSimpleCalendar(data);
          break;
        case 'seasons-stars':
          calendar = data as SeasonsStarsCalendar;
          break;
        default:
          throw new Error('Unknown calendar format');
      }
      
      // Show import preview dialog
      this.showImportPreviewDialog(calendar, format);
      
    } catch (error) {
      Logger.error('JSON import failed:', error);
      ui.notifications?.error(`Failed to parse calendar: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Detect the format of calendar data
   */
  private detectCalendarFormat(data: any): 'simple-calendar' | 'seasons-stars' | 'unknown' {
    // Simple Calendar detection
    if (data.currentDate || data.general || (data.months && Array.isArray(data.months) && data.months[0]?.numberOfDays)) {
      return 'simple-calendar';
    }
    
    // S&S detection
    if (data.translations && data.year && data.months && data.weekdays && data.time) {
      return 'seasons-stars';
    }
    
    return 'unknown';
  }
  
  /**
   * Show import preview dialog
   */
  private showImportPreviewDialog(calendar: SeasonsStarsCalendar, sourceFormat: string): void {
    const dialog = new Dialog({
      title: game.i18n.localize('custom-calendar-editor.import.title'),
      content: this.getImportPreviewHTML(calendar, sourceFormat),
      buttons: {
        import: {
          icon: '<i class="fas fa-file-import"></i>',
          label: game.i18n.localize('custom-calendar-editor.buttons.import-calendar'),
          callback: (html: JQuery) => {
            const calendarName = html.find('#calendar-name').val() as string;
            this.confirmImport(calendar, calendarName);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize('custom-calendar-editor.buttons.cancel'),
          callback: () => {}
        }
      },
      default: 'import'
    });
    
    dialog.render(true);
  }
  
  /**
   * Generate import preview HTML
   */
  private getImportPreviewHTML(calendar: SeasonsStarsCalendar, sourceFormat: string): string {
    const formatLabel = sourceFormat === 'simple-calendar' 
      ? game.i18n.localize('custom-calendar-editor.import.simple-calendar')
      : game.i18n.localize('custom-calendar-editor.import.seasons-stars');
    
    return `
      <div class="import-preview">
        <div class="form-group">
          <label for="calendar-name">${game.i18n.localize('custom-calendar-editor.editor.calendar-name')}:</label>
          <input type="text" id="calendar-name" value="${calendar.name || calendar.label || calendar.id}">
        </div>
        
        <div class="format-info">
          <strong>${game.i18n.localize('custom-calendar-editor.import.format-detected')}:</strong> ${formatLabel}
        </div>
        
        <div class="calendar-summary">
          <h3>Calendar Summary:</h3>
          <ul>
            <li>Months: ${calendar.months?.length || 0}</li>
            <li>Weekdays: ${calendar.weekdays?.length || 0}</li>
            <li>Intercalary Days: ${calendar.intercalary?.length || 0}</li>
            <li>Seasons: ${calendar.seasons?.length || 0}</li>
            <li>Moons: ${calendar.moons?.length || 0}</li>
            <li>Hours per Day: ${calendar.time?.hoursInDay || 24}</li>
          </ul>
        </div>
        
        ${sourceFormat === 'simple-calendar' ? this.getConversionNotesHTML() : ''}
      </div>
    `;
  }
  
  /**
   * Get conversion notes for Simple Calendar imports
   */
  private getConversionNotesHTML(): string {
    return `
      <div class="conversion-notes">
        <h4>${game.i18n.localize('custom-calendar-editor.import.conversion-notes')}:</h4>
        <ul>
          <li>Complex leap year rules simplified</li>
          <li>Moon phases approximated</li>
          <li>Some advanced features may not transfer</li>
        </ul>
      </div>
    `;
  }
  
  /**
   * Confirm and execute import
   */
  private async confirmImport(calendar: SeasonsStarsCalendar, name: string): Promise<void> {
    try {
      // Update calendar name
      if (name && name !== calendar.name) {
        calendar.name = name;
        calendar.label = name;
        
        // Update translations
        if (calendar.translations) {
          Object.keys(calendar.translations).forEach(lang => {
            calendar.translations[lang].label = name;
          });
        }
      }
      
      // Import calendar
      const calendarId = await (game as any).customCalendarEditor?.storage.importCalendar(calendar, name);
      
      ui.notifications?.info(`Calendar imported as: ${name || calendarId}`);
      
      // Refresh calendar selection if open
      Object.values((ui as any).windows || {}).forEach((app: any) => {
        if (app.constructor.name === 'CalendarSelectionDialog') {
          app.render();
        }
      });
      
    } catch (error) {
      Logger.error('Import confirmation failed:', error);
      ui.notifications?.error(`Failed to import calendar: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Show export dialog
   */
  showExportDialog(calendar: SeasonsStarsCalendar): void {
    const dialog = new Dialog({
      title: game.i18n.localize('custom-calendar-editor.export.title'),
      content: this.getExportDialogHTML(calendar),
      buttons: {
        copy: {
          icon: '<i class="fas fa-copy"></i>',
          label: game.i18n.localize('custom-calendar-editor.export.copy-text'),
          callback: (html: JQuery) => {
            this.copyToClipboard(calendar);
          }
        },
        download: {
          icon: '<i class="fas fa-download"></i>',
          label: game.i18n.localize('custom-calendar-editor.export.download-file'),
          callback: (html: JQuery) => {
            this.downloadAsFile(calendar);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize('custom-calendar-editor.buttons.cancel'),
          callback: () => {}
        }
      },
      default: 'copy'
    });
    
    dialog.render(true);
  }
  
  /**
   * Generate export dialog HTML
   */
  private getExportDialogHTML(calendar: SeasonsStarsCalendar): string {
    const exportData = (game as any).customCalendarEditor?.storage.exportCalendar(calendar.id, true);
    
    return `
      <div class="export-dialog">
        <div class="export-info">
          <strong>Calendar:</strong> ${calendar.name || calendar.id}<br>
          <strong>Format:</strong> ${game.i18n.localize('custom-calendar-editor.export.formatted-json')}
        </div>
        
        <div class="export-preview">
          <textarea readonly rows="15" style="width: 100%; font-family: monospace;">${exportData}</textarea>
        </div>
      </div>
    `;
  }
  
  /**
   * Copy calendar JSON to clipboard
   */
  private async copyToClipboard(calendar: SeasonsStarsCalendar): Promise<void> {
    try {
      const exportData = (game as any).customCalendarEditor?.storage.exportCalendar(calendar.id, true);
      await navigator.clipboard.writeText(exportData);
      ui.notifications?.info('Calendar copied to clipboard');
    } catch (error) {
      Logger.error('Clipboard copy failed:', error);
      ui.notifications?.error('Failed to copy to clipboard');
    }
  }
  
  /**
   * Download calendar as JSON file
   */
  private downloadAsFile(calendar: SeasonsStarsCalendar): void {
    try {
      const exportData = (game as any).customCalendarEditor?.storage.exportCalendar(calendar.id, true);
      const filename = `${calendar.name || calendar.id}.json`;
      
      // Create download link
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      ui.notifications?.info(`Calendar downloaded as ${filename}`);
      
    } catch (error) {
      Logger.error('File download failed:', error);
      ui.notifications?.error('Failed to download calendar');
    }
  }
  
  /**
   * Validate imported calendar data
   */
  private validateImportedCalendar(calendar: SeasonsStarsCalendar): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Basic validation
    if (!calendar.id) errors.push('Calendar must have an ID');
    if (!calendar.months || calendar.months.length === 0) errors.push('Calendar must have at least one month');
    if (!calendar.weekdays || calendar.weekdays.length === 0) errors.push('Calendar must have at least one weekday');
    if (!calendar.time) errors.push('Calendar must have time configuration');
    
    // Use S&S validation if available
    if ((game as any).seasonsStars?.api?.validateCalendar) {
      try {
        const result = (game as any).seasonsStars.api.validateCalendar(calendar);
        if (!result.valid && result.errors) {
          errors.push(...result.errors);
        }
      } catch (error) {
        Logger.warn('S&S validation not available:', error);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}