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
  static debug(message: string, data?: any): void {
    if (this.isDebugEnabled()) {
      console.log(`[S&S] ${message}`, data || '');
    }
  }

  /**
   * Log informational messages
   */
  static info(message: string, data?: any): void {
    console.log(`[S&S] ${message}`, data || '');
  }

  /**
   * Log warning messages
   */
  static warn(message: string, data?: any): void {
    console.warn(`[S&S WARNING] ${message}`, data || '');
    if (this.shouldShowUserNotifications()) {
      ui.notifications?.warn(`Seasons & Stars: ${message}`);
    }
  }

  /**
   * Log error messages with user notification
   */
  static error(message: string, error?: Error): void {
    console.error(`[S&S ERROR] ${message}`, error || '');
    if (this.shouldShowUserNotifications()) {
      ui.notifications?.error(`Seasons & Stars: ${message}`);
    }
  }

  /**
   * Log critical errors that require immediate user attention
   */
  static critical(message: string, error?: Error): void {
    console.error(`[S&S CRITICAL] ${message}`, error || '');
    // Always show critical errors regardless of settings
    ui.notifications?.error(`Seasons & Stars: ${message}`);
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
  static api(method: string, params?: any, result?: any): void {
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
  static integration(event: string, data?: any): void {
    if (this.isDebugEnabled()) {
      console.log(`[S&S Integration] ${event}`, data || '');
    }
  }
}
