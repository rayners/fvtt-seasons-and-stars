/**
 * Type definitions for test environment
 */

/// <reference types="vitest/globals" />

declare global {
  interface Global {
    game?: any;
    ui?: any;
    Hooks?: any;
    Canvas?: any;
    CONFIG?: any;
    foundry?: any;
  }

  // Foundry globals
  var game: any;
  var ui: any;
  var Hooks: any;
  var Canvas: any;
  var CONFIG: any;
  var foundry: any;

  // Vitest globals (already provided by vitest/globals but ensure they're recognized)
  var describe: typeof import('vitest').describe;
  var it: typeof import('vitest').it;
  var test: typeof import('vitest').test;
  var expect: typeof import('vitest').expect;
  var beforeAll: typeof import('vitest').beforeAll;
  var beforeEach: typeof import('vitest').beforeEach;
  var afterAll: typeof import('vitest').afterAll;
  var afterEach: typeof import('vitest').afterEach;
  var vi: typeof import('vitest').vi;
}

export {};
