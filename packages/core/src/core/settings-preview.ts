/**
 * Settings Preview functionality for Quick Time Buttons and Time Advancement
 */

import { Logger } from './logger';
import { parseQuickTimeButtons, formatTimeButton, getQuickTimeButtons } from './quick-time-buttons';
import type { CalendarManagerInterface } from '../types/foundry-extensions';

// Module-level state (replaces static class properties)
let previewContainer: HTMLElement | null = null;
let timeAdvancementPreviewContainer: HTMLElement | null = null;

// Debounced functions using Foundry's utility (with type assertion)
const debouncedPreviewUpdate = (foundry.utils as any).debounce((value: string) => {
  updatePreview(value);
}, 300);

const debouncedTimeAdvancementUpdate = (foundry.utils as any).debounce((ratio: number) => {
  updateTimeAdvancementExplanation(ratio);
}, 150);

/**
 * Register hooks for settings preview functionality
 */
export function registerSettingsPreviewHooks(): void {
  // Hook into settings config rendering
  Hooks.on('renderSettingsConfig', (app: any, html: HTMLElement) => {
    Logger.debug('Settings config rendered, attempting to enhance settings');
    enhanceQuickTimeButtonsSetting(html);
    enhanceTimeAdvancementRatioSetting(html);
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
      debouncedPreviewUpdate(target.value);
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
    const calendar = (manager as CalendarManagerInterface)?.getActiveCalendar();

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
 * Enhance the time advancement ratio setting with live explanation
 */
function enhanceTimeAdvancementRatioSetting(html: HTMLElement): void {
  try {
    // Find the time advancement ratio range-picker element
    const rangePicker = html.querySelector(
      'range-picker[name="seasons-and-stars.timeAdvancementRatio"]'
    ) as HTMLElement;

    if (!rangePicker) {
      Logger.debug('Time advancement ratio range-picker not found in settings form');
      return;
    }

    // Get the input elements inside the range-picker (we'll listen to both number and range)
    const rangeInput = rangePicker.querySelector('input[type="range"]') as HTMLInputElement;
    const numberInput = rangePicker.querySelector('input[type="number"]') as HTMLInputElement;

    if (!rangeInput && !numberInput) {
      Logger.debug('Time advancement ratio inputs not found inside range-picker');
      return;
    }

    // Create explanation container (use the range-picker as the reference element)
    createTimeAdvancementExplanationContainer(rangePicker);

    // Add input event listeners for live updates to both inputs
    const updateHandler = (event: Event) => {
      const target = event.target as HTMLInputElement;
      debouncedTimeAdvancementUpdate(parseFloat(target.value) || 1.0);
    };

    if (rangeInput) {
      rangeInput.addEventListener('input', updateHandler);
    }
    if (numberInput) {
      numberInput.addEventListener('input', updateHandler);
    }

    // Initial explanation (get current value from range-picker attribute or first available input)
    const currentValue = parseFloat(
      rangePicker.getAttribute('value') || rangeInput?.value || numberInput?.value || '1.0'
    );
    updateTimeAdvancementExplanation(currentValue);

    Logger.debug('Added live explanation to time advancement ratio setting');
  } catch (error) {
    Logger.error('Failed to enhance time advancement ratio setting', error as Error);
  }
}

/**
 * Create the time advancement explanation container HTML
 */
function createTimeAdvancementExplanationContainer(referenceElement: HTMLElement): void {
  const explanationHtml = `
    <div class="time-advancement-explanation" style="margin-top: 0.5rem; padding: 0.5rem; background: var(--color-bg-option); border-radius: 3px;">
      <div class="explanation-content">
        <div class="ratio-explanation" style="margin-bottom: 0.5rem;"></div>
        <div class="interval-explanation" style="font-size: 0.9em; color: var(--color-text-dark-secondary);"></div>
      </div>
    </div>
  `;

  // Insert explanation container after the reference element's parent form group
  const formGroup = referenceElement.closest('.form-group');
  if (formGroup) {
    formGroup.insertAdjacentHTML('afterend', explanationHtml);
    timeAdvancementPreviewContainer = formGroup.nextElementSibling as HTMLElement;
  }
}

/**
 * Update the time advancement explanation based on current ratio
 */
function updateTimeAdvancementExplanation(ratio: number): void {
  if (!timeAdvancementPreviewContainer) {
    Logger.warn('Time advancement explanation container not available for update');
    return;
  }

  try {
    // Validate ratio
    if (isNaN(ratio) || ratio <= 0) {
      showTimeAdvancementError('Invalid ratio value');
      return;
    }

    // Calculate interval using the same formula as TimeAdvancementService
    const interval = Math.max(1000, Math.ceil(1000 / ratio));

    // Generate explanations
    const ratioExplanation = generateRatioExplanation(ratio);
    const intervalExplanation = generateIntervalExplanation(ratio, interval);

    // Update explanation content
    const ratioContainer = timeAdvancementPreviewContainer.querySelector(
      '.ratio-explanation'
    ) as HTMLElement;
    const intervalContainer = timeAdvancementPreviewContainer.querySelector(
      '.interval-explanation'
    ) as HTMLElement;

    if (ratioContainer) {
      ratioContainer.innerHTML = ratioExplanation;
    }
    if (intervalContainer) {
      intervalContainer.innerHTML = intervalExplanation;
    }
  } catch (error) {
    Logger.error('Error updating time advancement explanation', error as Error);
    showTimeAdvancementError('Error calculating explanation');
  }
}

/**
 * Generate human-readable ratio explanation
 */
function generateRatioExplanation(ratio: number): string {
  if (ratio === 1.0) {
    return `<strong>Real Time:</strong> 1 second of real time = 1 second of game time`;
  } else if (ratio > 1.0) {
    if (ratio === Math.floor(ratio)) {
      return `<strong>Accelerated Time:</strong> 1 second of real time = ${ratio} seconds of game time (${ratio}x speed)`;
    } else {
      return `<strong>Accelerated Time:</strong> 1 second of real time = ${ratio} seconds of game time (${ratio}x speed)`;
    }
  } else {
    const realSecondsPerGameSecond = Math.round(1 / ratio);
    if (realSecondsPerGameSecond <= 60) {
      return `<strong>Slow Time:</strong> ${realSecondsPerGameSecond} seconds of real time = 1 second of game time`;
    } else {
      const realMinutesPerGameSecond = Math.round(realSecondsPerGameSecond / 60);
      return `<strong>Very Slow Time:</strong> ${realMinutesPerGameSecond} minutes of real time = 1 second of game time`;
    }
  }
}

/**
 * Generate technical interval explanation
 */
function generateIntervalExplanation(ratio: number, interval: number): string {
  const gameSecondsAdvanced = ratio;
  const intervalSeconds = interval / 1000;

  return `Technical: Every ${intervalSeconds} seconds, game time advances by ${gameSecondsAdvanced} seconds`;
}

/**
 * Show error state in time advancement explanation
 */
function showTimeAdvancementError(message: string): void {
  if (!timeAdvancementPreviewContainer) return;

  const ratioContainer = timeAdvancementPreviewContainer.querySelector(
    '.ratio-explanation'
  ) as HTMLElement;
  const intervalContainer = timeAdvancementPreviewContainer.querySelector(
    '.interval-explanation'
  ) as HTMLElement;

  const errorHtml = `<span style="color: var(--color-text-light-warning); font-style: italic;">${message}</span>`;

  if (ratioContainer) ratioContainer.innerHTML = errorHtml;
  if (intervalContainer) intervalContainer.innerHTML = '';
}

/**
 * Clean up preview when settings form is closed
 */
export function cleanupSettingsPreview(): void {
  // No manual timer cleanup needed with foundry.utils.debounce
  previewContainer = null;
  timeAdvancementPreviewContainer = null;
}
