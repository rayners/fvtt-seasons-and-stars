/**
 * Logging utility for Custom Calendar Editor
 */

export class Logger {
  private static readonly MODULE_NAME = 'Custom Calendar Editor';
  private static readonly PREFIX = 'CCE';

  static debug(message: string, ...args: unknown[]): void {
    console.debug(`${this.PREFIX} | ${message}`, ...args);
  }

  static info(message: string, ...args: unknown[]): void {
    console.info(`${this.PREFIX} | ${message}`, ...args);
  }

  static warn(message: string, ...args: unknown[]): void {
    console.warn(`${this.PREFIX} | ${message}`, ...args);
  }

  static error(message: string, ...args: unknown[]): void {
    console.error(`${this.PREFIX} | ${message}`, ...args);
  }

  static group(label: string): void {
    console.group(`${this.PREFIX} | ${label}`);
  }

  static groupEnd(): void {
    console.groupEnd();
  }
}