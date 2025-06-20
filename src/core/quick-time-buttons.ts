/**
 * Quick Time Buttons utility functions for configurable time advancement
 */

import { Logger } from './logger';
import type { SeasonsStarsCalendar } from '../types/calendar';
import type { CalendarManagerInterface } from '../types/foundry-extensions';

/**
 * Parse quick time button setting string into minute values
 */
export function parseQuickTimeButtons(
  settingValue: string,
  calendar?: SeasonsStarsCalendar
): number[] {
  if (!settingValue || typeof settingValue !== 'string') {
    Logger.warn('Invalid quick time buttons setting value, using default');
    return [15, 30, 60, 240]; // Default values
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
    return [15, 30, 60, 240]; // Fallback to default
  }
}

/**
 * Format minute values for button display using calendar-aware units
 */
export function formatTimeButton(minutes: number, calendar?: SeasonsStarsCalendar): string {
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
 * Get quick time buttons from settings for specific widget type
 */
export function getQuickTimeButtonsFromSettings(
  isMiniWidget: boolean = false
): Array<{ amount: number; unit: string; label: string }> {
  try {
    // Get setting value
    const settingValue =
      (game.settings?.get('seasons-and-stars', 'quickTimeButtons') as string) || '15,30,60,240';

    // Get current calendar for parsing
    const manager = game.seasonsStars?.manager;
    const calendar = (manager as CalendarManagerInterface)?.getActiveCalendar();

    // Parse minute values
    const allButtons = parseQuickTimeButtons(settingValue, calendar);

    // Get appropriate subset for widget type
    const buttons = getQuickTimeButtons(allButtons, isMiniWidget);

    // If no valid buttons, fall back to defaults
    if (buttons.length === 0) {
      return [
        { amount: 15, unit: 'minutes', label: '15m' },
        { amount: 30, unit: 'minutes', label: '30m' },
        { amount: 60, unit: 'minutes', label: '1h' },
        { amount: 240, unit: 'minutes', label: '4h' },
      ];
    }

    // Convert to template format
    return buttons.map(minutes => ({
      amount: minutes,
      unit: 'minutes',
      label: formatTimeButton(minutes, calendar),
    }));
  } catch (error) {
    Logger.error('Error getting quick time buttons from settings', error as Error);
    // Fallback to default
    return [
      { amount: 15, unit: 'minutes', label: '15m' },
      { amount: 30, unit: 'minutes', label: '30m' },
      { amount: 60, unit: 'minutes', label: '1h' },
      { amount: 240, unit: 'minutes', label: '4h' },
    ];
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
