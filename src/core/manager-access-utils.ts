/**
 * Common utilities for accessing calendar manager and creating error contexts
 * Consolidates repeated patterns across widget files
 */

import type { CalendarManagerInterface } from '../types/foundry-extensions';
import type { SeasonsStarsCalendar, CalendarDate } from '../types/calendar';

export interface ManagerState {
  manager: CalendarManagerInterface | null;
  activeCalendar: SeasonsStarsCalendar | null;
  currentDate: CalendarDate | null;
}

export interface ErrorContext {
  error: string;
  calendar: null;
  currentDate: null;
  formattedDate: 'Not Available';
}

/**
 * Consolidated manager access and error handling
 */
export class ManagerAccessUtils {
  /**
   * Get manager state with null safety
   */
  static getManagerState(): ManagerState {
    const manager = (game?.seasonsStars?.manager as CalendarManagerInterface) || null;

    let activeCalendar: SeasonsStarsCalendar | null = null;
    let currentDate: CalendarDate | null = null;

    if (manager) {
      try {
        activeCalendar = manager.getActiveCalendar() || null;
      } catch {
        activeCalendar = null;
      }

      try {
        currentDate = manager.getCurrentDate() || null;
      } catch {
        currentDate = null;
      }
    }

    return { manager, activeCalendar, currentDate };
  }

  /**
   * Create standardized error context for widgets
   */
  static createErrorContext(error: string): ErrorContext {
    return {
      error,
      calendar: null,
      currentDate: null,
      formattedDate: 'Not Available',
    };
  }

  /**
   * Check if manager is available and ready
   */
  static isManagerReady(): boolean {
    const { manager } = this.getManagerState();
    return manager !== null;
  }

  /**
   * Get formatted date string with fallback
   */
  static getFormattedDate(): string {
    const { currentDate, activeCalendar } = this.getManagerState();

    if (!currentDate || !activeCalendar) {
      return 'Not Available';
    }

    try {
      // Validate that we have valid numeric values
      if (
        typeof currentDate.day !== 'number' ||
        typeof currentDate.month !== 'number' ||
        typeof currentDate.year !== 'number'
      ) {
        return 'Format Error';
      }

      const monthIndex = currentDate.month - 1;
      if (monthIndex < 0 || !Number.isFinite(monthIndex)) {
        return 'Format Error';
      }

      return `${currentDate.day} ${activeCalendar.months[monthIndex]?.name || 'Unknown'} ${currentDate.year}`;
    } catch {
      return 'Format Error';
    }
  }
}
