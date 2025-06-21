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
    const manager = game.seasonsStars?.manager as CalendarManagerInterface | null;
    const activeCalendar = manager?.getActiveCalendar() || null;
    const currentDate = manager?.getCurrentDate() || null;

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
      return `${currentDate.day} ${activeCalendar.months[currentDate.month - 1]?.name || 'Unknown'} ${currentDate.year}`;
    } catch {
      return 'Format Error';
    }
  }
}
