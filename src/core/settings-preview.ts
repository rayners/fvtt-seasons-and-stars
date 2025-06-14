/**
 * Settings Preview functionality for Quick Time Buttons
 */

import { Logger } from './logger';
import { parseQuickTimeButtons, formatTimeButton, getQuickTimeButtons } from './quick-time-buttons';

/**
 * Enhanced settings form with live preview for quick time buttons
 */
export class SettingsPreview {
  private static previewContainer: HTMLElement | null = null;
  private static debounceTimer: number | null = null;

  /**
   * Register hooks for settings preview functionality
   */
  static registerHooks(): void {
    // Hook into settings config rendering
    Hooks.on('renderSettingsConfig', (app: any, html: JQuery) => {
      this.enhanceQuickTimeButtonsSetting(html);
    });

    Logger.debug('Settings preview hooks registered');
  }

  /**
   * Enhance the quick time buttons setting with live preview
   */
  private static enhanceQuickTimeButtonsSetting(html: JQuery): void {
    try {
      // Find the quick time buttons input
      const quickTimeInput = html.find('input[name="seasons-and-stars.quickTimeButtons"]');
      if (quickTimeInput.length === 0) {
        Logger.debug('Quick time buttons setting not found in settings form');
        return;
      }

      // Create preview container
      this.createPreviewContainer(quickTimeInput);

      // Add input event listener for live updates
      quickTimeInput.on('input', (event: any) => {
        this.debouncePreviewUpdate(event.target.value);
      });

      // Initial preview
      this.updatePreview(quickTimeInput.val() as string);

      Logger.debug('Enhanced quick time buttons setting with live preview');
    } catch (error) {
      Logger.error('Failed to enhance quick time buttons setting', error as Error);
    }
  }

  /**
   * Create the preview container HTML
   */
  private static createPreviewContainer(inputElement: JQuery): void {
    const previewHtml = `
      <div class="quick-time-preview" style="margin-top: 0.5rem; padding: 0.5rem; background: var(--color-bg-option); border-radius: 3px;">
        <div class="preview-content">
          <div class="preview-section">
            <label style="font-weight: bold; margin-bottom: 0.25rem; display: block;">Main Widget Preview:</label>
            <div class="preview-buttons main-widget" style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 0.5rem;"></div>
          </div>
          <div class="preview-section">
            <label style="font-weight: bold; margin-bottom: 0.25rem; display: block;">Mini Widget Preview:</label>
            <div class="preview-buttons mini-widget" style="display: flex; gap: 4px; flex-wrap: wrap;"></div>
          </div>
        </div>
      </div>
    `;

    // Insert preview container after the input's parent form group
    const formGroup = inputElement.closest('.form-group');
    if (formGroup.length) {
      formGroup.after(previewHtml);
      this.previewContainer = formGroup.next('.quick-time-preview')[0];
    }
  }

  /**
   * Debounce preview updates to avoid excessive re-rendering
   */
  private static debouncePreviewUpdate(value: string): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      this.updatePreview(value);
    }, 300);
  }

  /**
   * Update the preview display based on current input value
   */
  private static updatePreview(value: string): void {
    if (!this.previewContainer) {
      Logger.warn('Preview container not available for update');
      return;
    }

    try {
      // Get current calendar for parsing
      const manager = game.seasonsStars?.manager;
      const calendar = manager?.getActiveCalendar();

      if (!value || typeof value !== 'string') {
        this.showErrorPreview('Invalid input');
        return;
      }

      // Parse the input value
      const allButtons = parseQuickTimeButtons(value, calendar);

      if (allButtons.length === 0) {
        this.showErrorPreview('No valid time values found');
        return;
      }

      // Get buttons for each widget type
      const mainWidgetButtons = getQuickTimeButtons(allButtons, false);
      const miniWidgetButtons = getQuickTimeButtons(allButtons, true);

      // Update main widget preview
      const mainContainer = this.previewContainer.querySelector(
        '.preview-buttons.main-widget'
      ) as HTMLElement;
      if (mainContainer) {
        mainContainer.innerHTML = this.renderButtonPreview(mainWidgetButtons, calendar);
      }

      // Update mini widget preview
      const miniContainer = this.previewContainer.querySelector(
        '.preview-buttons.mini-widget'
      ) as HTMLElement;
      if (miniContainer) {
        miniContainer.innerHTML = this.renderButtonPreview(miniWidgetButtons, calendar);

        // Add note if auto-selection occurred
        if (allButtons.length > 4 && miniWidgetButtons.length === 4) {
          const note = document.createElement('div');
          note.style.fontSize = '0.8em';
          note.style.color = 'var(--color-text-dark-secondary)';
          note.style.marginTop = '0.25rem';
          note.textContent = `Auto-selected ${miniWidgetButtons.length} of ${allButtons.length} buttons for mini widget`;
          miniContainer.appendChild(note);
        }
      }
    } catch (error) {
      Logger.error('Error updating preview', error as Error);
      this.showErrorPreview('Error parsing input');
    }
  }

  /**
   * Render button preview HTML for a set of buttons
   */
  private static renderButtonPreview(buttons: number[], calendar: any): string {
    return buttons
      .map(minutes => {
        const label = formatTimeButton(minutes, calendar);
        const cssClass = minutes < 0 ? 'rewind' : 'forward';

        return `<span class="preview-button ${cssClass}" style="
        display: inline-block;
        padding: 2px 6px;
        margin: 2px;
        background: ${minutes < 0 ? 'rgba(187, 66, 66, 0.8)' : 'var(--color-button-background)'};
        border: 1px solid ${minutes < 0 ? 'rgba(187, 66, 66, 1)' : 'var(--color-border-light)'};
        border-radius: 3px;
        font-size: 0.8em;
        color: ${minutes < 0 ? 'white' : 'var(--color-text-primary)'};
      ">${label}</span>`;
      })
      .join('');
  }

  /**
   * Show error state in preview
   */
  private static showErrorPreview(message: string): void {
    if (!this.previewContainer) return;

    const mainContainer = this.previewContainer.querySelector(
      '.preview-buttons.main-widget'
    ) as HTMLElement;
    const miniContainer = this.previewContainer.querySelector(
      '.preview-buttons.mini-widget'
    ) as HTMLElement;

    const errorHtml = `<span style="color: var(--color-text-light-warning); font-style: italic;">${message}</span>`;

    if (mainContainer) mainContainer.innerHTML = errorHtml;
    if (miniContainer) miniContainer.innerHTML = errorHtml;
  }

  /**
   * Clean up preview when settings form is closed
   */
  static cleanup(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.previewContainer = null;
  }
}
