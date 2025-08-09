/**
 * Quick Time Buttons utility functions for configurable time advancement
 */

import { Logger } from './logger';
import { UI_CONSTANTS } from './constants';
import type { SeasonsStarsCalendar } from '../types/calendar';
import type { CalendarManagerInterface } from '../types/foundry-extensions';

/**
 * Parse quick time button setting string into minute values
 */
export function parseQuickTimeButtons(
  settingValue: string,
  calendar?: SeasonsStarsCalendar | null
): number[] {
  if (!settingValue || typeof settingValue !== 'string') {
    Logger.warn('Invalid quick time buttons setting value, using default');
    return UI_CONSTANTS.DEFAULT_QUICK_TIME_BUTTONS.slice(); // Default values
  }

  const hoursPerDay = calendar?.time?.hoursInDay || 24;
  const minutesPerHour = calendar?.time?.minutesInHour || 60;
  const daysPerWeek = calendar?.weekdays?.length || 7;

  try {
    return settingValue
      .split(',')
      .map(val => {
        const trimmed = val.trim();
        if (!trimmed) return NaN;

        const match = trimmed.match(/^(-?\d+)([mhdw]?)$/);

        if (!match) {
          Logger.debug(`Invalid quick time button value: "${trimmed}"`);
          return NaN;
        }

        const [, amount, unit] = match;
        const num = parseInt(amount);

        if (!Number.isFinite(num)) {
          Logger.debug(`Non-finite number in quick time button value: "${trimmed}"`);
          return NaN;
        }

        switch (unit) {
          case 'w':
            return num * daysPerWeek * hoursPerDay * minutesPerHour;
          case 'd':
            return num * hoursPerDay * minutesPerHour;
          case 'h':
            return num * minutesPerHour;
          case 'm':
          case '':
            return num; // Default to minutes
          default:
            Logger.debug(`Unknown unit in quick time button value: "${trimmed}"`);
            return NaN;
        }
      })
      .filter(val => Number.isFinite(val))
      .sort((a, b) => a - b); // Sort numerically: negatives first, then positives
  } catch (error) {
    Logger.error('Error parsing quick time buttons setting', error as Error);
    return UI_CONSTANTS.DEFAULT_QUICK_TIME_BUTTONS.slice(); // Fallback to default
  }
}

/**
 * Format minute values for button display using calendar-aware units
 */
export function formatTimeButton(minutes: number, calendar?: SeasonsStarsCalendar | null): string {
  if (!Number.isFinite(minutes)) {
    return '0m';
  }

  const minutesPerHour = calendar?.time?.minutesInHour || 60;
  const hoursPerDay = calendar?.time?.hoursInDay || 24;
  const daysPerWeek = calendar?.weekdays?.length || 7;

  const absMinutes = Math.abs(minutes);
  const sign = minutes < 0 ? '-' : '';

  // Calculate in calendar-specific units
  const minutesPerDay = hoursPerDay * minutesPerHour;
  const minutesPerWeek = daysPerWeek * minutesPerDay;

  if (absMinutes >= minutesPerWeek && absMinutes % minutesPerWeek === 0) {
    return `${sign}${absMinutes / minutesPerWeek}w`;
  } else if (absMinutes >= minutesPerDay && absMinutes % minutesPerDay === 0) {
    return `${sign}${absMinutes / minutesPerDay}d`;
  } else if (absMinutes >= minutesPerHour && absMinutes % minutesPerHour === 0) {
    return `${sign}${absMinutes / minutesPerHour}h`;
  } else {
    return `${sign}${absMinutes}m`;
  }
}

/**
 * Get quick time buttons appropriate for widget context
 */
export function getQuickTimeButtons(allButtons: number[], isMiniWidget: boolean = false): number[] {
  if (!isMiniWidget || allButtons.length <= 3) {
    return allButtons;
  }

  // For mini widget, ensure both negative and positive buttons are available
  const sorted = [...allButtons].sort((a, b) => a - b);
  const negatives = sorted.filter(b => b < 0);
  const positives = sorted.filter(b => b > 0);

  // Take 1 largest negative + 2 smallest positives (or all if fewer available)
  const selectedNegative = negatives.length > 0 ? [negatives[negatives.length - 1]] : [];
  const selectedPositives = positives.slice(0, 3 - selectedNegative.length);

  return [...selectedNegative, ...selectedPositives];
}

/**
 * Result of parsing and validating mini widget buttons
 */
interface MiniWidgetButtonValidation {
  valid: number[];
  invalid: number[];
}

/**
 * Parse and validate mini widget buttons against main button set
 */
export function parseMiniWidgetButtons(
  miniSetting: string,
  mainButtons: number[],
  calendar?: SeasonsStarsCalendar | null
): MiniWidgetButtonValidation {
  if (!miniSetting || typeof miniSetting !== 'string') {
    return { valid: [], invalid: [] };
  }

  const parsedMiniButtons = parseQuickTimeButtons(miniSetting, calendar);
  const valid: number[] = [];
  const invalid: number[] = [];

  for (const button of parsedMiniButtons) {
    if (mainButtons.includes(button)) {
      valid.push(button);
    } else {
      invalid.push(button);
    }
  }

  return { valid, invalid };
}

/**
 * Get main quick time buttons and calendar context for validation
 */
function getMainButtonsAndCalendar(): {
  mainButtons: number[];
  calendar: SeasonsStarsCalendar | null;
} {
  const mainSetting =
    (game.settings?.get('seasons-and-stars', 'quickTimeButtons') as string) ||
    UI_CONSTANTS.DEFAULT_QUICK_TIME_BUTTONS.join(',');

  const manager = game.seasonsStars?.manager;
  const calendar = (manager as CalendarManagerInterface)?.getActiveCalendar() || null;
  const mainButtons = parseQuickTimeButtons(mainSetting, calendar);

  return { mainButtons, calendar };
}

/**
 * Handle validation warnings for invalid mini widget buttons
 */
function warnAboutInvalidButtons(invalid: number[]): void {
  if (invalid.length > 0) {
    const invalidLabels = invalid.map(minutes => formatTimeButton(minutes, null));
    Logger.warn(
      `Mini widget buttons contain values not found in main setting: ${invalid.join(', ')}`
    );
    ui.notifications?.warn(
      `Mini widget buttons contain values not found in main setting: ${invalidLabels.join(', ')}`
    );
  }
}

/**
 * Get mini widget specific buttons from settings, returns null if should use fallback
 */
export function getMiniWidgetButtonsFromSettings(): Array<{
  amount: number;
  unit: string;
  label: string;
}> | null {
  try {
    // Get mini widget specific setting
    const miniSetting = game.settings?.get(
      'seasons-and-stars',
      'miniWidgetQuickTimeButtons'
    ) as string;

    // If empty or not set, return null to trigger fallback
    if (!miniSetting || miniSetting.trim() === '') {
      return null;
    }

    // Get main buttons and calendar for validation
    const { mainButtons, calendar } = getMainButtonsAndCalendar();

    // Parse and validate mini buttons
    const { valid, invalid } = parseMiniWidgetButtons(miniSetting, mainButtons, calendar);

    // Warn about invalid buttons
    warnAboutInvalidButtons(invalid);

    // If no valid buttons after validation, return null for fallback
    if (valid.length === 0) {
      Logger.warn('No valid mini widget buttons found after validation, using fallback');
      return null;
    }

    // Convert to template format
    return valid.map(minutes => ({
      amount: minutes,
      unit: 'minutes',
      label: formatTimeButton(minutes, calendar),
    }));
  } catch (error) {
    Logger.error('Error getting mini widget buttons from settings', error as Error);
    return null; // Fallback
  }
}

/**
 * Convert minute values to template format
 */
function convertButtonsToTemplateFormat(
  buttons: number[],
  calendar: SeasonsStarsCalendar | null
): Array<{ amount: number; unit: string; label: string }> {
  return buttons.map(minutes => ({
    amount: minutes,
    unit: 'minutes',
    label: formatTimeButton(minutes, calendar),
  }));
}

/**
 * Get fallback buttons when no valid configuration is found
 */
function getFallbackButtons(): Array<{ amount: number; unit: string; label: string }> {
  return convertButtonsToTemplateFormat(UI_CONSTANTS.DEFAULT_QUICK_TIME_BUTTONS, null);
}

/**
 * Get quick time buttons from settings for specific widget type
 */
export function getQuickTimeButtonsFromSettings(
  isMiniWidget: boolean = false
): Array<{ amount: number; unit: string; label: string }> {
  try {
    // For mini widget, first try to get specific mini widget buttons
    if (isMiniWidget) {
      const miniButtons = getMiniWidgetButtonsFromSettings();
      if (miniButtons !== null) {
        return miniButtons;
      }
      // Fall through to auto-selection logic below
    }

    // Get main buttons and calendar for auto-selection
    const { mainButtons, calendar } = getMainButtonsAndCalendar();

    // Get appropriate subset for widget type
    const buttons = getQuickTimeButtons(mainButtons, isMiniWidget);

    // If no valid buttons, fall back to defaults
    if (buttons.length === 0) {
      Logger.warn('No valid buttons found in main setting, using fallback defaults');
      return getFallbackButtons();
    }

    // Convert to template format
    return convertButtonsToTemplateFormat(buttons, calendar);
  } catch (error) {
    Logger.error('Error getting quick time buttons from settings', error as Error);
    // Fallback to default
    return getFallbackButtons();
  }
}

/**
 * Register Handlebars helper for template use
 */
export function registerQuickTimeButtonsHelper(): void {
  // Access Handlebars from global scope
  const handlebars = (globalThis as any).Handlebars;

  if (handlebars && typeof handlebars.registerHelper === 'function') {
    handlebars.registerHelper('getQuickTimeButtons', function (isMiniWidget: boolean = false) {
      return getQuickTimeButtonsFromSettings(isMiniWidget);
    });

    handlebars.registerHelper('formatTimeButton', function (minutes: number) {
      const manager = game.seasonsStars?.manager;
      const calendar = (manager as CalendarManagerInterface)?.getActiveCalendar();
      return formatTimeButton(minutes, calendar);
    });

    Logger.debug('Registered quick time buttons Handlebars helpers');
  } else {
    Logger.warn('Handlebars not available for helper registration');
  }
}
