/**
 * Centralized logging system for Seasons & Stars module
 * Provides debug mode toggle and user-friendly error notifications
 */
/* eslint-disable no-console */
export class Logger {
  private static readonly MODULE_ID = 'seasons-and-stars';

  /**
   * Log debug messages (only shown when debug mode is enabled)
   */
  static debug(message: string, data?: unknown): void {
    if (this.isDebugEnabled()) {
      console.log(`[S&S] ${message}`, data || '');
    }
  }

  /**
   * Log informational messages
   */
  static info(message: string, data?: unknown): void {
    console.log(`[S&S] ${message}`, data || '');
  }

  /**
   * Log warning messages
   *
   * IMPORTANT: When an Error object is provided, it's placed first so that
   * Errors & Echoes can capture it through its console.warn patch.
   */
  static warn(message: string, data?: unknown): void {
    // If data is an Error, put it first for E&E compatibility
    if (data instanceof Error) {
      console.warn(data, `[S&S WARNING] ${message}`);
    } else {
      console.warn(`[S&S WARNING] ${message}`, data || '');
    }

    if (this.shouldShowUserNotifications()) {
      ui?.notifications?.warn(`Seasons & Stars: ${message}`);
    }
  }

  /**
   * Log error messages with user notification
   *
   * IMPORTANT: Error object is placed first so that Errors & Echoes can
   * capture it through its console.error patch for automatic error reporting.
   */
  static error(message: string, error?: Error): void {
    // Put error first for E&E compatibility - it only captures if Error is first arg
    if (error) {
      console.error(error, `[S&S ERROR] ${message}`);
    } else {
      console.error(`[S&S ERROR] ${message}`);
    }

    if (this.shouldShowUserNotifications()) {
      ui?.notifications?.error(`Seasons & Stars: ${message}`);
    }
  }

  /**
   * Log critical errors that require immediate user attention
   *
   * IMPORTANT: Error object is placed first so that Errors & Echoes can
   * capture it through its console.error patch for automatic error reporting.
   */
  static critical(message: string, error?: Error): void {
    // Put error first for E&E compatibility - it only captures if Error is first arg
    if (error) {
      console.error(error, `[S&S CRITICAL] ${message}`);
    } else {
      console.error(`[S&S CRITICAL] ${message}`);
    }

    // Always show critical errors regardless of settings
    ui?.notifications?.error(`Seasons & Stars: ${message}`);
  }

  /**
   * Check if debug mode is enabled
   */
  private static isDebugEnabled(): boolean {
    try {
      return game.settings?.get(this.MODULE_ID, 'debugMode') === true;
    } catch {
      return false; // Fallback if settings not available
    }
  }

  /**
   * Check if user notifications should be shown
   */
  private static shouldShowUserNotifications(): boolean {
    try {
      return game.settings?.get(this.MODULE_ID, 'showNotifications') !== false;
    } catch {
      return true; // Default to showing notifications
    }
  }

  /**
   * Performance timing utility
   */
  static time(label: string): void {
    if (this.isDebugEnabled()) {
      console.time(`[S&S] ${label}`);
    }
  }

  /**
   * End performance timing
   */
  static timeEnd(label: string): void {
    if (this.isDebugEnabled()) {
      console.timeEnd(`[S&S] ${label}`);
    }
  }

  /**
   * Log API calls for debugging integration issues
   */
  static api(method: string, params?: unknown, result?: unknown): void {
    if (this.isDebugEnabled()) {
      console.group(`[S&S API] ${method}`);
      if (params) console.log('Parameters:', params);
      if (result !== undefined) console.log('Result:', result);
      console.groupEnd();
    }
  }

  /**
   * Log module integration events
   */
  static integration(event: string, data?: unknown): void {
    if (this.isDebugEnabled()) {
      console.log(`[S&S Integration] ${event}`, data || '');
    }
  }
}
