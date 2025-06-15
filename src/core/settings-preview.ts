/**
 * Settings Preview functionality for Quick Time Buttons
 */

import { Logger } from './logger';
import { parseQuickTimeButtons, formatTimeButton, getQuickTimeButtons } from './quick-time-buttons';

// Module-level state (replaces static class properties)
let previewContainer: HTMLElement | null = null;
let debounceTimer: number | null = null;

/**
 * Register hooks for settings preview functionality
 */
export function registerSettingsPreviewHooks(): void {
  // Hook into settings config rendering
  Hooks.on('renderSettingsConfig', (app: any, html: HTMLElement) => {
    enhanceQuickTimeButtonsSetting(html);
  });

  Logger.debug('Settings preview hooks registered');
}

/**
 * Enhance the quick time buttons setting with live preview
 */
function enhanceQuickTimeButtonsSetting(html: HTMLElement): void {
  try {
    // Find the quick time buttons input
    const quickTimeInput = html.querySelector(
      'input[name="seasons-and-stars.quickTimeButtons"]'
    ) as HTMLInputElement;
    if (!quickTimeInput) {
      Logger.debug('Quick time buttons setting not found in settings form');
      return;
    }

    // Create preview container
    createPreviewContainer(quickTimeInput);

    // Add input event listener for live updates
    quickTimeInput.addEventListener('input', (event: Event) => {
      const target = event.target as HTMLInputElement;
      debouncePreviewUpdate(target.value);
    });

    // Initial preview
    updatePreview(quickTimeInput.value);

    Logger.debug('Added live preview to quick time buttons setting');
  } catch (error) {
    Logger.error('Failed to enhance quick time buttons setting', error as Error);
  }
}

/**
 * Create the preview container HTML
 */
function createPreviewContainer(inputElement: HTMLInputElement): void {
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
  if (formGroup) {
    formGroup.insertAdjacentHTML('afterend', previewHtml);
    previewContainer = formGroup.nextElementSibling as HTMLElement;
  }
}

/**
 * Debounce preview updates to avoid excessive re-rendering
 */
function debouncePreviewUpdate(value: string): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = window.setTimeout(() => {
    updatePreview(value);
  }, 300);
}

/**
 * Update the preview display based on current input value
 */
function updatePreview(value: string): void {
  if (!previewContainer) {
    Logger.warn('Preview container not available for update');
    return;
  }

  try {
    // Get current calendar for parsing
    const manager = game.seasonsStars?.manager;
    const calendar = manager?.getActiveCalendar();

    if (!value || typeof value !== 'string') {
      showErrorPreview('Invalid input');
      return;
    }

    // Parse the input value
    const allButtons = parseQuickTimeButtons(value, calendar);

    if (allButtons.length === 0) {
      showErrorPreview('No valid time values found');
      return;
    }

    // Get buttons for each widget type
    const mainWidgetButtons = getQuickTimeButtons(allButtons, false);
    const miniWidgetButtons = getQuickTimeButtons(allButtons, true);

    // Update main widget preview
    const mainContainer = previewContainer.querySelector(
      '.preview-buttons.main-widget'
    ) as HTMLElement;
    if (mainContainer) {
      mainContainer.innerHTML = renderButtonPreview(mainWidgetButtons, calendar);
    }

    // Update mini widget preview
    const miniContainer = previewContainer.querySelector(
      '.preview-buttons.mini-widget'
    ) as HTMLElement;
    if (miniContainer) {
      miniContainer.innerHTML = renderButtonPreview(miniWidgetButtons, calendar);

      // Add note if auto-selection occurred
      if (allButtons.length > 3 && miniWidgetButtons.length === 3) {
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
    showErrorPreview('Error parsing input');
  }
}

/**
 * Render button preview HTML for a set of buttons
 */
function renderButtonPreview(buttons: number[], calendar: any): string {
  return buttons
    .map(minutes => {
      const label = formatTimeButton(minutes, calendar);
      const cssClass = minutes < 0 ? 'rewind' : 'forward';

      const icon = minutes < 0 ? 'fa-backward' : 'fa-clock';

      return `<span class="preview-button ${cssClass}" style="
      display: inline-block;
      padding: 2px 6px;
      margin: 2px;
      background: ${minutes < 0 ? 'linear-gradient(135deg, #dc2626, #ef4444)' : 'linear-gradient(135deg, #10b981, #14b8a6)'};
      border: 1px solid ${minutes < 0 ? '#dc2626' : '#10b981'};
      border-radius: 3px;
      font-size: 0.8em;
      color: white;
    "><i class="fas ${icon}" style="margin-right: 3px; font-size: 0.7em;"></i>${label}</span>`;
    })
    .join('');
}

/**
 * Show error state in preview
 */
function showErrorPreview(message: string): void {
  if (!previewContainer) return;

  const mainContainer = previewContainer.querySelector(
    '.preview-buttons.main-widget'
  ) as HTMLElement;
  const miniContainer = previewContainer.querySelector(
    '.preview-buttons.mini-widget'
  ) as HTMLElement;

  const errorHtml = `<span style="color: var(--color-text-light-warning); font-style: italic;">${message}</span>`;

  if (mainContainer) mainContainer.innerHTML = errorHtml;
  if (miniContainer) miniContainer.innerHTML = errorHtml;
}

/**
 * Clean up preview when settings form is closed
 */
export function cleanupSettingsPreview(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  previewContainer = null;
}
