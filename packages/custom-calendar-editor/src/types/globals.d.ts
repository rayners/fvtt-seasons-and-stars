/**
 * Global type declarations to bypass TypeScript issues
 */

// Bypass all game property access issues
declare const game: any;
declare const ui: any;
declare const foundry: any;

// FilePicker
declare class FilePicker {
  constructor(options: any);
  render(force?: boolean): void;
}

// Dialog
declare class Dialog {
  constructor(options: any);
  render(force?: boolean): void;
}

// Application
declare class Application {
  static defaultOptions: any;
  constructor(options?: any);
  render(force?: boolean): any;
  close(): Promise<void>;
  getData(): any;
  activateListeners(html: any): void;
}

// Hooks
declare const Hooks: {
  once(event: string, callback: (...args: any[]) => void): void;
  on(event: string, callback: (...args: any[]) => void): void;
  call(event: string, ...args: any[]): void;
  callAll(event: string, ...args: any[]): void;
};