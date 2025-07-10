/**
 * Test-friendly Logger implementation that captures logs for assertion
 * Replaces Logger mocks with real implementation for better testing
 */

export class TestLogger {
  static logs: Array<{ level: string; message: string; data?: any; timestamp: number }> = [];
  static isEnabled = false;

  static debug(message: string, data?: any) {
    this.capture('debug', message, data);
  }

  static info(message: string, data?: any) {
    this.capture('info', message, data);
  }

  static warn(message: string, data?: any) {
    this.capture('warn', message, data);
  }

  static error(message: string, data?: any) {
    this.capture('error', message, data);
  }

  static api(message: string, data?: any) {
    this.capture('api', message, data);
  }

  static integration(message: string, data?: any) {
    this.capture('integration', message, data);
  }

  static critical(message: string, data?: any) {
    this.capture('critical', message, data);
  }

  static timing(label: string, fn: () => any): any {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    this.capture('timing', `${label}: ${duration.toFixed(2)}ms`);
    return result;
  }

  private static capture(level: string, message: string, data?: any) {
    this.logs.push({
      level,
      message,
      data,
      timestamp: Date.now(),
    });

    // Optionally output to console in test environment
    if (this.isEnabled && process.env.NODE_ENV === 'test') {
      console.log(`[TEST LOG ${level.toUpperCase()}] ${message}`, data || '');
    }
  }

  static clearLogs() {
    this.logs = [];
  }

  static getLogsByLevel(level: string) {
    return this.logs.filter(log => log.level === level);
  }

  static getLogsContaining(message: string) {
    return this.logs.filter(log => log.message.includes(message));
  }

  static enableConsoleOutput(enabled: boolean = true) {
    this.isEnabled = enabled;
  }
}
