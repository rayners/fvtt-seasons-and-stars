import { describe, it, expect } from 'vitest';

// Use the mock logger exposed by the test setup
const MockLogger: any = (globalThis as any).__mockLogger;

describe('MockLogger', () => {
  it('forwards warn and error calls to the console', () => {
    MockLogger.debug('debug message');
    MockLogger.info('info message');
    MockLogger.warn('warn message');
    MockLogger.error('error message');

    expect(console.warn).toHaveBeenCalledWith('warn message');
    expect(console.error).toHaveBeenCalledWith('error message');
  });
});
