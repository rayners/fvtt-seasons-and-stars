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
    enhanceButtonSettingsWithUnifiedPreview(html);
    enhanceTimeAdvancementRatioSetting(html);
  });

  Logger.debug('Settings preview hooks registered');
}

/**
 * Enhance both button settings with a unified preview system
 */
function enhanceButtonSettingsWithUnifiedPreview(html: HTMLElement): void {
  try {
    // Find both button inputs
    const quickTimeInput = html.querySelector(
      'input[name="seasons-and-stars.quickTimeButtons"]'
    ) as HTMLInputElement;
    const miniWidgetInput = html.querySelector(
      'input[name="seasons-and-stars.miniWidgetQuickTimeButtons"]'
    ) as HTMLInputElement;

    if (!quickTimeInput && !miniWidgetInput) {
      Logger.debug('No button settings found in settings form');
      return;
    }

    // Create single preview container (attach to the first available input)
    const referenceInput = quickTimeInput || miniWidgetInput;
    createPreviewContainer(referenceInput);

    // Debounced update function that handles both inputs
    const debouncedUnifiedUpdate = (foundry.utils as any).debounce(() => {
      updateUnifiedPreview(quickTimeInput?.value || '', miniWidgetInput?.value || '');
    }, 300);

    // Add listeners to both inputs if they exist
    if (quickTimeInput) {
      quickTimeInput.addEventListener('input', () => debouncedUnifiedUpdate());
    }
    if (miniWidgetInput) {
      miniWidgetInput.addEventListener('input', () => debouncedUnifiedUpdate());
    }

    // Initial preview update
    updateUnifiedPreview(quickTimeInput?.value || '', miniWidgetInput?.value || '');

    Logger.debug('Added unified preview to button settings');
  } catch (error) {
    Logger.error('Failed to enhance button settings with unified preview', error as Error);
  }
}

/**
 * Create the preview container HTML
 */
function createPreviewContainer(inputElement: HTMLInputElement): void {
  const previewHtml = `
    <div class="quick-time-preview" style="margin-top: 0.75rem; padding: 0.75rem; background: var(--color-bg-option); border: 1px solid var(--color-border-light-primary); border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div class="preview-content">
        <div class="preview-header" style="margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--color-border-light-tertiary);">
          <h4 style="margin: 0; font-size: 0.9rem; color: var(--color-text-dark-primary);">Button Preview</h4>
          <p style="margin: 0.25rem 0 0 0; font-size: 0.8rem; color: var(--color-text-dark-secondary); font-style: italic;">Live preview of how your buttons will appear in each widget</p>
        </div>
        
        <div class="preview-section" style="margin-bottom: 0.75rem;">
          <div class="section-header" style="display: flex; align-items: center; margin-bottom: 0.5rem;">
            <label style="font-weight: bold; font-size: 0.85rem; color: var(--color-text-dark-primary); margin: 0;">Main Calendar Widget:</label>
            <span style="margin-left: 0.5rem; font-size: 0.75rem; color: var(--color-text-dark-secondary);">(Shows all configured buttons)</span>
          </div>
          <div class="preview-buttons main-widget" style="display: flex; gap: 6px; flex-wrap: wrap; min-height: 28px; padding: 0.25rem; background: var(--color-bg); border-radius: 3px; border: 1px solid var(--color-border-light-tertiary);"></div>
        </div>
        
        <div class="preview-section">
          <div class="section-header" style="display: flex; align-items: center; margin-bottom: 0.5rem;">
            <label style="font-weight: bold; font-size: 0.85rem; color: var(--color-text-dark-primary); margin: 0;">Mini Calendar Widget:</label>
            <span style="margin-left: 0.5rem; font-size: 0.75rem; color: var(--color-text-dark-secondary);">(Auto-selects up to 3 buttons)</span>
          </div>
          <div class="preview-buttons mini-widget" style="display: flex; gap: 6px; flex-wrap: wrap; min-height: 28px; padding: 0.25rem; background: var(--color-bg); border-radius: 3px; border: 1px solid var(--color-border-light-tertiary);"></div>
          <div class="mini-widget-note" style="margin-top: 0.25rem;"></div>
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
 * Update the unified preview display based on both input values
 */
function updateUnifiedPreview(mainValue: string, miniValue: string): void {
  if (!previewContainer) {
    Logger.warn('Preview container not available for unified update');
    return;
  }

  try {
    // Get current calendar for parsing
    const manager = game.seasonsStars?.manager;
    const calendar = (manager as CalendarManagerInterface)?.getActiveCalendar();

    if (!mainValue || typeof mainValue !== 'string') {
      showErrorPreview('Invalid main buttons input');
      return;
    }

    // Parse the main buttons input value to validate it
    const parsedMainButtons = parseQuickTimeButtons(mainValue, calendar);

    if (parsedMainButtons.length === 0) {
      showErrorPreview('No valid time values found in main buttons');
      return;
    }

    // Show preview with both settings
    showButtonPreview(parsedMainButtons, calendar, mainValue, miniValue);
  } catch (error) {
    Logger.error('Error updating unified preview', error as Error);
    showErrorPreview('Error parsing input');
  }
}

/**
 * Show button preview using simple logic (no settings manipulation)
 */
function showButtonPreview(
  inputButtons: number[],
  calendar: any,
  mainSetting: string,
  miniSetting: string | null
): void {
  if (!previewContainer) return;

  try {
    // Parse main setting if we have input buttons, otherwise parse main setting
    const mainButtons =
      inputButtons.length > 0 ? inputButtons : parseQuickTimeButtons(mainSetting, calendar);

    // Determine mini widget buttons using the updated permissive logic
    let miniButtons: number[];
    let parseError = false;

    if (miniSetting && miniSetting.trim() !== '') {
      // Parse mini buttons independently - no validation against main buttons needed
      const parsedMiniButtons = parseQuickTimeButtons(miniSetting, calendar);

      if (parsedMiniButtons.length > 0) {
        // Use all parsed buttons - no filtering required
        miniButtons = parsedMiniButtons;
      } else {
        // No valid buttons could be parsed, fall back to auto-selection
        miniButtons = getQuickTimeButtons(mainButtons, true);
        parseError = true;
      }
    } else {
      // Auto-select from main buttons
      miniButtons = getQuickTimeButtons(mainButtons, true);
    }

    // Update main widget preview
    const mainContainer = previewContainer.querySelector(
      '.preview-buttons.main-widget'
    ) as HTMLElement;
    if (mainContainer) {
      mainContainer.innerHTML = renderButtonPreview(mainButtons, calendar);
    }

    // Update mini widget preview
    const miniContainer = previewContainer.querySelector(
      '.preview-buttons.mini-widget'
    ) as HTMLElement;
    const miniNoteContainer = previewContainer.querySelector('.mini-widget-note') as HTMLElement;

    if (miniContainer) {
      miniContainer.innerHTML = renderButtonPreview(miniButtons, calendar);
    }

    // Update mini widget note with updated logic
    if (miniNoteContainer) {
      updateMiniWidgetNoteWithUpdatedLogic(
        miniNoteContainer,
        mainButtons,
        miniButtons,
        miniSetting,
        parseError
      );
    }
  } catch (error) {
    Logger.error('Error showing button preview', error as Error);
    showErrorPreview('Error showing preview');
  }
}

/**
 * Update mini widget note with updated permissive logic
 */
function updateMiniWidgetNoteWithUpdatedLogic(
  noteContainer: HTMLElement,
  mainButtons: number[],
  miniButtons: number[],
  miniSetting: string | null,
  parseError: boolean
): void {
  if (miniSetting && miniSetting.trim() !== '') {
    // User has configured specific mini widget buttons
    if (parseError) {
      // Could not parse any valid buttons from the setting
      noteContainer.innerHTML = `
        <div style="font-size: 0.75rem; color: var(--color-text-light-warning); padding: 0.25rem; background: #fef2f2; border-radius: 3px; border-left: 3px solid #fecaca;">
          <i class="fas fa-exclamation-triangle" style="margin-right: 0.25rem;"></i>
          <strong>Parse Error:</strong> No valid time values found in mini widget setting. Using auto-selection fallback.
        </div>
      `;
    } else {
      // Successfully parsed custom mini widget buttons
      noteContainer.innerHTML = `
        <div style="font-size: 0.75rem; color: var(--color-text-dark-secondary); padding: 0.25rem; background: var(--color-bg-option); border-radius: 3px; border-left: 3px solid var(--color-border-light-highlight);">
          <i class="fas fa-cog" style="margin-right: 0.25rem;"></i>
          Custom mini widget configuration: ${miniButtons.length} button${miniButtons.length !== 1 ? 's' : ''}
        </div>
      `;
    }
  } else {
    // Auto-selection is being used
    if (mainButtons.length > 3 && miniButtons.length <= 3) {
      noteContainer.innerHTML = `
        <div style="font-size: 0.75rem; color: var(--color-text-dark-secondary); padding: 0.25rem; background: var(--color-bg-option); border-radius: 3px; border-left: 3px solid var(--color-border-light-highlight);">
          <i class="fas fa-info-circle" style="margin-right: 0.25rem;"></i>
          Auto-selected ${miniButtons.length} of ${mainButtons.length} buttons for mini widget
        </div>
      `;
    } else if (mainButtons.length <= 3) {
      noteContainer.innerHTML = `
        <div style="font-size: 0.75rem; color: var(--color-text-dark-secondary); padding: 0.25rem; background: var(--color-bg-option); border-radius: 3px; border-left: 3px solid var(--color-border-light-highlight);">
          <i class="fas fa-check-circle" style="margin-right: 0.25rem;"></i>
          All ${mainButtons.length} buttons will fit in mini widget
        </div>
      `;
    } else {
      noteContainer.innerHTML = '';
    }
  }
}

/**
 * Render button preview HTML for a set of buttons (legacy function for backwards compatibility)
 */
function renderButtonPreview(buttons: number[], calendar: any): string {
  if (buttons.length === 0) {
    return '<span style="font-style: italic; color: var(--color-text-dark-secondary); font-size: 0.8rem;">No buttons to display</span>';
  }

  return buttons
    .map(minutes => {
      const label = formatTimeButton(minutes, calendar);
      const cssClass = minutes < 0 ? 'rewind' : 'forward';
      const icon = minutes < 0 ? 'fa-backward' : 'fa-forward';

      // Enhanced styling to match actual widget buttons more closely
      return `<button type="button" class="preview-button ${cssClass}" style="
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.5rem;
        margin: 0;
        background: ${
          minutes < 0
            ? 'linear-gradient(135deg, #dc2626, #ef4444)'
            : 'linear-gradient(135deg, #10b981, #14b8a6)'
        };
        border: 1px solid ${minutes < 0 ? '#b91c1c' : '#059669'};
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
        color: white;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        box-shadow: 0 1px 2px rgba(0,0,0,0.2);
        cursor: default;
        transition: none;
      "><i class="fas ${icon}" style="margin-right: 0.25rem; font-size: 0.7rem;"></i>${label}</button>`;
    })
    .join(' ');
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
  const miniNoteContainer = previewContainer.querySelector('.mini-widget-note') as HTMLElement;

  const errorHtml = `
    <div style="display: flex; align-items: center; padding: 0.5rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 3px; color: #dc2626; font-size: 0.8rem;">
      <i class="fas fa-exclamation-triangle" style="margin-right: 0.5rem;"></i>
      ${message}
    </div>
  `;

  if (mainContainer) mainContainer.innerHTML = errorHtml;
  if (miniContainer) miniContainer.innerHTML = errorHtml;
  if (miniNoteContainer) miniNoteContainer.innerHTML = '';
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
    <div class="time-advancement-explanation" style="margin-top: 0.75rem; padding: 0.75rem; background: var(--color-bg-option); border: 1px solid var(--color-border-light-primary); border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div class="explanation-content">
        <div class="explanation-header" style="margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--color-border-light-tertiary);">
          <h4 style="margin: 0; font-size: 0.9rem; color: var(--color-text-dark-primary);">Time Advancement Preview</h4>
          <p style="margin: 0.25rem 0 0 0; font-size: 0.8rem; color: var(--color-text-dark-secondary); font-style: italic;">Live explanation of how this ratio affects game time flow</p>
        </div>
        <div class="ratio-explanation" style="margin-bottom: 0.75rem; padding: 0.5rem; background: var(--color-bg); border-radius: 3px; border-left: 3px solid var(--color-border-light-highlight);"></div>
        <div class="interval-explanation" style="font-size: 0.8rem; color: var(--color-text-dark-secondary); padding: 0.25rem; background: var(--color-bg); border-radius: 3px;"></div>
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
    const minIntervalSeconds =
      (game.settings.get('seasons-and-stars', 'realTimeAdvancementInterval') as number) || 10;
    const minIntervalMs = minIntervalSeconds * 1000;
    const interval = Math.max(minIntervalMs, Math.ceil(1000 / ratio));

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
export function generateRatioExplanation(ratio: number): string {
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
export function generateIntervalExplanation(ratio: number, interval: number): string {
  const intervalSeconds = interval / 1000;
  const gameSecondsAdvanced = ratio * intervalSeconds;

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

  const errorHtml = `
    <div style="display: flex; align-items: center; color: #dc2626;">
      <i class="fas fa-exclamation-triangle" style="margin-right: 0.5rem;"></i>
      ${message}
    </div>
  `;

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
