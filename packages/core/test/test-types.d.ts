/**
 * Type definitions for test environment
 */

declare global {
  interface Global {
    game?: any;
    ui?: any;
    Hooks?: any;
    Canvas?: any;
    CONFIG?: any;
    foundry?: any;
  }

  var game: any;
  var ui: any;
  var Hooks: any;
  var Canvas: any;
  var CONFIG: any;
  var foundry: any;
}

export {};
