/**
 * Local Quench type definitions to resolve module resolution conflicts
 * This provides the essential types we need without importing the full Quench package types
 */

export interface QuenchTestContext {
  describe: (name: string, fn: () => void) => void;
  it: (name: string, fn: () => void) => void;
  assert: {
    ok: (value: unknown, message?: string) => void;
    equal: (actual: unknown, expected: unknown, message?: string) => void;
    notEqual: (actual: unknown, expected: unknown, message?: string) => void;
    deepEqual: (actual: unknown, expected: unknown, message?: string) => void;
    throws: (fn: () => void, message?: string) => void;
  };
  beforeEach?: (fn: () => void) => void;
  afterEach?: (fn: () => void) => void;
  before?: (fn: () => void) => void;
  after?: (fn: () => void) => void;
}

export interface QuenchBatchOptions {
  displayName?: string;
  preSelected?: boolean;
}

export interface Quench {
  registerBatch: (
    batchKey: string,
    batchFunction: (context: QuenchTestContext) => void,
    options?: QuenchBatchOptions
  ) => void;
}

declare global {
  interface Window {
    quench?: Quench;
  }
}
