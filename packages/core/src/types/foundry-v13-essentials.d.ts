/**
 * Essential Foundry VTT v13 Type Definitions
 *
 * This file provides minimal but complete type definitions for Foundry VTT v13
 * to replace the broken official fvtt-types package until it's stable.
 *
 * Only includes types actually used by Seasons & Stars module.
 */

// =============================================================================
// Browser API Extensions
// =============================================================================

declare global {
  interface Window {
    gc?: () => void; // Chrome garbage collection (when enabled with --enable-precise-memory-info)
  }
}

// =============================================================================
// GLOBAL FOUNDRY OBJECTS
// =============================================================================

declare global {
  const game: Game;
  const ui: UI;
  const Hooks: typeof HooksManager;
  const CONFIG: Config;
  const canvas: Canvas;
  const renderTemplate: (path: string, data?: any) => Promise<string>;

  // Handlebars templating engine (global in Foundry)
  const Handlebars: typeof import('handlebars');

  // Foundry global namespace
  const foundry: FoundryNamespace;

  // Global performance API
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }

  // Make Foundry types available globally
  const JournalEntry: typeof FoundryJournalEntry;
  const Folder: typeof FoundryFolder;
  const Dialog: typeof FoundryDialog;
  const Application: typeof FoundryApplication;
  const Scene: typeof FoundryScene;
  const ChatMessage: typeof FoundryChatMessage;

  type Folder = FoundryFolder;
  type JournalEntry = FoundryJournalEntry;
  type User = FoundryUser;
  type Calendar = FoundryCalendar;
  type JournalSheet = FoundryJournalSheet;
  type ChatMessage = FoundryChatMessage;

  // Global Node.js compatibility
  namespace NodeJS {
    interface Global {
      gc?: () => void;
      game?: Game;
      ui?: UI;
      Hooks?: HooksManager;
    }
  }

  // jQuery globals provided by @types/jquery

  // Make ApplicationV2 namespace available globally
  namespace ApplicationV2 {
    interface Configuration {
      id?: string;
      classes?: string[];
      tag?: string;
      window?: {
        title?: string;
        icon?: string;
        positioned?: boolean;
        minimizable?: boolean;
        resizable?: boolean;
      };
      position?: Partial<Position>;
      actions?: Record<string, any>;
    }

    interface Position {
      top?: number;
      left?: number;
      width?: number | 'auto';
      height?: number | 'auto';
      scale?: number;
    }

    interface RenderOptions {
      force?: boolean;
      position?: Partial<Position>;
      window?: Partial<ApplicationWindow>;
      parts?: string[];
    }

    interface CloseOptions {
      animate?: boolean;
    }

    interface ApplicationWindow {
      title: string;
      icon: string;
      controls: ApplicationHeaderButton[];
    }

    interface ApplicationHeaderButton {
      icon: string;
      label: string;
      action: string;
    }
  }
}

// =============================================================================
// CORE FOUNDRY VTT INTERFACES
// =============================================================================

interface Game {
  time: GameTime;
  i18n: Localization;
  settings: ClientSettings;
  modules: Map<string, Module>;
  user?: FoundryUser;
  users: FoundryCollection<FoundryUser>;
  journal: FoundryCollection<FoundryJournalEntry>;
  folders?: FoundryCollection<FoundryFolder>;
  keybindings?: FoundryKeybindings;
  paused: boolean; // Game pause state
  combat?: Combat | null; // Active combat encounter

  // Additional Foundry properties
  scenes?: FoundryCollection<FoundryScene> & {
    active?: FoundryScene;
  };
  system?: {
    id: string;
    version: string;
    title?: string;
  };
  version?: string;

  // Module integration points
  memoryMage?: unknown;

  // Season & Stars specific integration point
  seasonsStars?: {
    manager?: unknown;
    notes?: unknown;
    integration?: unknown;
    api?: unknown;
    categories?: unknown;
    compatibilityManager?: unknown; // Expose for debugging and external access
    // Warning state functions for debugging and external access
    resetSeasonsWarningState?: () => void;
    getSeasonsWarningState?: () => boolean;
    setSeasonsWarningState?: (warned: boolean) => void;
    buttonRegistry?: unknown;
  };
}

interface GameTime {
  worldTime: number;
  advance(seconds: number): Promise<void>;
  calendar?: CalendarData;
  initializeCalendar?(): void;
}

interface Combat {
  id: string;
  started: boolean;
  [key: string]: any;
}

interface Localization {
  lang: string;
  localize(key: string, data?: Record<string, unknown>): string;
  format(key: string, data?: Record<string, unknown>): string;
}

interface ClientSettings {
  get(module: string, setting: string): any;
  set(module: string, setting: string, value: any): Promise<any>;
  register(module: string, setting: string, config: any): void;
  registerMenu(
    namespace: string,
    key: string,
    data: {
      name: string;
      label: string;
      hint: string;
      icon: string;
      type: new () => foundry.applications.api.ApplicationV2; // Application class constructor
      restricted: boolean;
    }
  ): void;
}

interface FoundryUser {
  id: string;
  name: string;
  isGM: boolean;
}

declare class FoundryScene {
  id: string;
  name: string;
  active?: boolean;
}

/**
 * Chat message speaker information
 */
interface ChatSpeaker {
  alias?: string;
  user?: string | null;
  actor?: string | null;
  token?: string | null;
  scene?: string | null;
}

/**
 * Foundry VTT ChatMessage document
 */
declare class FoundryChatMessage {
  id: string;
  content: string;
  speaker: ChatSpeaker;
  type: number;
  flags: Record<string, any>;

  static create(data?: {
    content?: string;
    speaker?: ChatSpeaker;
    type?: number;
    style?: number;
    flags?: Record<string, any>;
    whisper?: string[];
    blind?: boolean;
    roll?: any;
  }): Promise<FoundryChatMessage>;
  update(data: any): Promise<FoundryChatMessage>;
  delete(): Promise<void>;
  setFlag(scope: string, key: string, value: any): Promise<void>;
  getFlag(scope: string, key: string): any;
  unsetFlag(scope: string, key: string): Promise<void>;
}

declare class FoundryJournalEntry {
  id: string;
  name: string;
  title?: string; // Alternative name property
  pages: FoundryCollection<JournalEntryPage>;
  ownership: Record<string, number>;
  flags: Record<string, any>;
  author?: FoundryUser;
  folder?: string;
  sheet?: FoundryJournalSheet;

  static create(data: any): Promise<FoundryJournalEntry>;
  update(data: any): Promise<FoundryJournalEntry>;
  delete(): Promise<void>;
  createEmbeddedDocuments(type: string, data: any[]): Promise<any[]>;
  setFlag(scope: string, key: string, value: any): Promise<void>;
  getFlag(scope: string, key: string): any;
  unsetFlag(scope: string, key: string): Promise<void>;
}

interface JournalEntryPage {
  id: string;
  name: string;
  type: string;
  text?: {
    content: string;
  };
  update?(data: any): Promise<JournalEntryPage>;
}

// JournalSheet interface (unused)

declare class FoundryJournalSheet {
  document: FoundryJournalEntry;
  close(): Promise<void>;
  [key: string]: unknown;
}

declare class FoundryFolder {
  id: string;
  name: string;
  type: string;

  static create(data: any): Promise<FoundryFolder>;
  getFlag(scope: string, key: string): any;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare class FoundryDialog {
  constructor(data: any, options?: any);
  render(force?: boolean): this;
  close(): Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare class FoundryApplication {
  constructor(options?: any);
  render(force?: boolean): this;
  close(): Promise<void>;
}

interface Module {
  id: string;
  title: string;
  active: boolean;
  version?: string;
  api?: unknown; // For modules that expose APIs
  flags?: Record<string, unknown>; // Module flags from module.json
}

interface UI {
  notifications: Notifications;
}

interface Notifications {
  notify(message: string, type?: 'info' | 'warning' | 'error'): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

interface Canvas {
  ready: boolean;
}

interface Config {
  debug: {
    hooks: boolean;
  };
  time?: {
    worldCalendarClass?: typeof CalendarData;
    worldCalendarConfig?: any;
    earthCalendarClass?: typeof CalendarData;
    earthCalendarConfig?: any;
    calendar?: CalendarData;
  };
}

// =============================================================================
// HOOKS SYSTEM
// =============================================================================

declare class HooksManager {
  static on(hook: string, callback: Function): number;
  static once(hook: string, callback: Function): number;
  static off(hook: string, id: number): void;
  static call(hook: string, ...args: any[]): boolean;
  static callAll(hook: string, ...args: any[]): void;
}

// =============================================================================
// APPLICATION V2 NAMESPACE
// =============================================================================

// ApplicationV2 namespace moved to later in file to avoid conflicts

// =============================================================================
// DIALOG SYSTEM
// =============================================================================

// DialogButton interface (unused)
/*
interface DialogButton {
  icon?: string;
  label: string;
  callback?: (html: JQuery) => void;
}
*/

// DialogOptions interface (unused)
/*
interface DialogOptions {
  title: string;
  content: string;
  buttons: Record<string, DialogButton>;
  default?: string;
  render?: (html: JQuery) => void;
  close?: (html: JQuery) => void;
}
*/

// Dialog and Application classes (unused but kept for reference)

// Updated Collection with proper iteration methods
declare class FoundryCollection<T> extends Map<string, T> {
  get(key: string): T | undefined;
  set(key: string, value: T): this;
  find(predicate: (value: T) => boolean): T | undefined;
  filter(predicate: (value: T) => boolean): T[];
  map<U>(transform: (value: T) => U): U[];
  contents: T[];
}

// =============================================================================
// APPLICATION V2 FRAMEWORK
// =============================================================================

/**
 * ApplicationV2 base class for Foundry v13
 * Provides essential methods used by Calendar widgets
 */
declare class ApplicationV2<
  RenderContext = Record<string, unknown>,
  Configuration = ApplicationV2.Configuration,
  RenderOptions = ApplicationV2.RenderOptions,
> {
  constructor(options?: Partial<Configuration>);

  // Core lifecycle methods
  render(force?: boolean): Promise<this>;
  render(options?: Partial<RenderOptions>): Promise<this>;
  close(options?: ApplicationV2.CloseOptions): Promise<this>;

  // Element and DOM access
  readonly element: HTMLElement | null;
  readonly window: ApplicationV2.ApplicationWindow | null;
  readonly rendered: boolean;

  // Position management
  setPosition(position?: Partial<ApplicationV2.Position>): void;

  // Tab management (for tabbed applications)
  changeTab(tab: string, group?: string): void;

  // Static configuration
  static DEFAULT_OPTIONS: ApplicationV2.Configuration;
  static PARTS: Record<string, ApplicationV2.ApplicationPart>;

  // Protected methods that subclasses implement
  protected _prepareContext(options: RenderOptions): Promise<RenderContext>;
  protected _onRender(context: RenderContext, options: RenderOptions): Promise<void>;
  protected _attachPartListeners(
    partId: string,
    htmlElement: HTMLElement,
    options: RenderOptions
  ): void;
  protected _onClose(options: ApplicationV2.CloseOptions): Promise<void>;
  protected _onChangeForm(formConfig: any, event: Event): void;
  protected _createContextMenu(
    handler: () => ContextMenuEntry[],
    selector: string,
    options?: {
      container?: HTMLElement;
      hookName?: string;
      parentClassHooks?: boolean;
    }
  ): ContextMenu | null;

  // Position property
  position: ApplicationV2.Position;
}

declare namespace ApplicationV2 {
  interface Configuration {
    id?: string;
    classes?: string[];
    tag?: string;
    window?: {
      title?: string;
      icon?: string;
      positioned?: boolean;
      minimizable?: boolean;
      resizable?: boolean;
    };
    position?: Partial<Position>;
    actions?: Record<string, any>;
  }

  interface Position {
    top?: number;
    left?: number;
    width?: number | 'auto';
    height?: number | 'auto';
    scale?: number;
  }

  interface RenderOptions {
    force?: boolean;
    position?: Partial<Position>;
    window?: Partial<ApplicationWindow>;
    parts?: string[];
  }

  interface CloseOptions {
    animate?: boolean;
  }

  interface ApplicationWindow {
    title: string;
    icon: string;
    controls: ApplicationHeaderButton[];
  }

  interface ApplicationHeaderButton {
    icon: string;
    label: string;
    action: string;
  }

  interface ApplicationPart {
    id: string;
    template: string;
    classes?: string[];
    scrollable?: string[];
  }

  interface ApplicationAction {
    handler?: (event: Event, target: HTMLElement) => Promise<void> | void;
    buttons?: number[];
  }

  // Allow actions to be direct function references
  type ApplicationActionValue =
    | ApplicationAction
    | ((event: Event, target: HTMLElement) => Promise<void> | void);
}

// =============================================================================
// HANDLEBARS APPLICATION MIXIN
// =============================================================================

/**
 * Mixin for ApplicationV2 that provides Handlebars template support
 */
declare class HandlebarsApplicationMixin {
  // Template rendering
  protected _renderHTML(context: any, options: any): Promise<Record<string, string>>;

  // Template utilities
  protected _replaceHTML(result: Record<string, string>, content: HTMLElement, options: any): void;
}

// =============================================================================
// DIALOG SYSTEM (For Calendar Selection Dialog)
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare class DialogV2<
  Configuration = DialogV2.Configuration,
  RenderContext = Record<string, unknown>,
> extends ApplicationV2<RenderContext, Configuration> {
  constructor(options?: Partial<Configuration>);

  static wait<T = any>(config: DialogV2.WaitOptions<T>): Promise<T | null>;
  static confirm(options: DialogV2.ConfirmOptions): Promise<boolean>;
  static prompt(options: DialogV2.PromptOptions): Promise<string | null>;
}

declare namespace DialogV2 {
  interface Configuration extends ApplicationV2.Configuration {
    content?: string;
    buttons?: DialogButton[];
    modal?: boolean;
    rejectClose?: boolean;
  }

  interface DialogButton {
    action: string;
    label: string;
    icon?: string;
    default?: boolean;
    callback?: Function;
  }

  interface WaitOptions<T> {
    title?: string;
    content?: string;
    buttons?: DialogButton[];
    modal?: boolean;
    default?: string;
    rejectClose?: boolean;
    render?: Function;
    close?: Function;
    result?: T; // Use the generic parameter
  }

  interface ConfirmOptions {
    title?: string;
    window?: { title?: string };
    content?: string;
    yes?: Function;
    no?: Function;
    modal?: boolean;
    rejectClose?: boolean;
  }

  interface PromptOptions {
    title?: string;
    content?: string;
    label?: string;
    default?: string;
    callback?: Function;
    modal?: boolean;
    rejectClose?: boolean;
  }
}

// =============================================================================
// CALENDAR SYSTEM TYPES
// =============================================================================

/**
 * Calendar interface for Seasons & Stars calendar definitions
 */
interface FoundryCalendar {
  id: string;
  name: string;
  description?: string;
  year?: {
    prefix?: string;
    suffix?: string;
  };
  months: CalendarMonth[];
  weekdays: CalendarWeekday[];
  moons?: CalendarMoon[];
  seasons?: CalendarSeason[];
}

// Seasons & Stars specific calendar type (unused - defined in calendar.d.ts)
/*
interface SeasonsStarsCalendar {
  id: string;
  name: string;
  description?: string;
  translations?: Record<string, any>;
  leapYear?: {
    rule: string;
    month: number;
  };
  intercalary?: any[];
  time?: {
    hoursInDay: number;
    minutesInHour: number;
    secondsInMinute: number;
  };
  year?: {
    prefix?: string;
    suffix?: string;
  };
  months: CalendarMonth[];
  weekdays: CalendarWeekday[];
  moons?: CalendarMoon[];
  seasons?: CalendarSeason[];
}
*/

interface CalendarMonth {
  id?: string;
  name: string;
  description?: string;
  days: number;
  intercalary?: boolean;
}

interface CalendarWeekday {
  id?: string;
  name: string;
  description?: string;
  abbreviation?: string;
}

interface CalendarMoon {
  name: string;
  cycleLength: number;
  phases: CalendarMoonPhase[];
}

interface CalendarMoonPhase {
  name: string;
  icon?: string;
  description?: string;
}

interface CalendarSeason {
  name: string;
  description?: string;
  startMonth: number;
  startDay?: number;
  color?: string;
}

/**
 * Date interface used by Seasons & Stars (unused - defined in calendar.d.ts)
 */
/*
interface CalendarDate {
  year: number;
  month: number; // 1-based
  day: number; // 1-based
}
*/

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Collection utility class used by Foundry - use the FoundryCollection above
 */

// =============================================================================
// FOUNDRY KEYBINDINGS
// =============================================================================

interface FoundryKeybindings {
  register(namespace: string, action: string, data: KeybindingData): void;
  actions: Map<string, Map<string, KeybindingAction>>;
}

interface KeybindingData {
  name: string;
  hint: string;
  editable: KeybindingKey[];
  onDown?: () => boolean | void;
  onUp?: () => boolean | void;
  restricted?: boolean;
  precedence?: number;
}

interface KeybindingKey {
  key: string;
  modifiers: string[];
}

interface KeybindingAction {
  namespace: string;
  action: string;
  name: string;
  hint: string;
  editable: KeybindingKey[];
  onDown?: () => boolean | void;
  onUp?: () => boolean | void;
  restricted: boolean;
  precedence: number;
}

// =============================================================================
// FOUNDRY CONSTANTS
// =============================================================================

declare global {
  const CONST: {
    DOCUMENT_OWNERSHIP_LEVELS: {
      NONE: 0;
      LIMITED: 1;
      OBSERVER: 2;
      OWNER: 3;
    };
    KEYBINDING_PRECEDENCE: {
      DEFERRED: 0;
      NORMAL: 1;
      PRIORITY: 2;
    };
    CHAT_MESSAGE_STYLES: {
      OTHER: 0;
      OOC: 1;
      IC: 2;
      EMOTE: 3;
      ROLL: 5;
    };
  };
}

// Ownership level type definition
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type OwnershipLevel = 0 | 1 | 2 | 3;

// Export OwnershipLevel globally
declare global {
  type OwnershipLevel = 0 | 1 | 2 | 3;
}

// =============================================================================
// CONTEXT MENU SYSTEM
// =============================================================================

declare global {
  /**
   * Context menu entry configuration
   */
  interface ContextMenuEntry {
    name: string;
    icon?: string;
    callback?: (target: HTMLElement) => void | Promise<void>;
    condition?: (target: HTMLElement) => boolean;
    group?: string;
  }

  /**
   * Context menu class for creating right-click menus
   */
  class ContextMenu {
    constructor(
      container: HTMLElement,
      selector: string,
      menuItems: ContextMenuEntry[],
      options?: {
        hookName?: string;
      }
    );

    close(): void;
    render(target: HTMLElement): void;
  }
}

// =============================================================================
// CALENDAR DATA SYSTEM
// =============================================================================

/**
 * Time components interface for CalendarData
 */
interface TimeComponents {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  second?: number;
  [key: string]: number | undefined;
}

/**
 * CalendarData class for Foundry VTT v13+
 * Base class for calendar implementations
 */

declare class CalendarData<Components extends TimeComponents = TimeComponents> {
  constructor(data?: object, options?: any);

  /**
   * Convert a timestamp in seconds to time components
   */
  timeToComponents(time?: number): Components;

  /**
   * Convert time components to a timestamp in seconds
   */
  componentsToTime(components: Partial<Components>): number;

  /**
   * Add a time delta to a starting time
   */
  add(startTime: number | Partial<Components>, deltaTime: number | Partial<Components>): Components;

  /**
   * Calculate the difference between two times
   */
  difference(
    endTime: number | Partial<Components>,
    startTime?: number | Partial<Components>
  ): Components;

  /**
   * Format a time value as a string
   */
  format(time?: number | Partial<Components>, formatter?: string, options?: any): string;

  /**
   * Check if a year is a leap year
   */
  isLeapYear(year: number): boolean;

  /**
   * Count leap years before a given year
   */
  countLeapYears(year: number): number;

  /**
   * Define the schema for this calendar data model
   */
  static defineSchema(): any;

  /**
   * Protected method for advanced year decomposition
   * Override this for custom leap year handling
   */
  protected _decomposeTimeYears(time: number): any;
}

// Make CalendarData available globally
declare global {
  const CalendarData: typeof CalendarData;
}

// =============================================================================
// FOUNDRY NAMESPACE
// =============================================================================

interface FoundryNamespace {
  applications: {
    api: {
      ApplicationV2: typeof ApplicationV2;
      DialogV2: typeof DialogV2;
      HandlebarsApplicationMixin: <T extends new (...args: any[]) => ApplicationV2>(
        Base: T
      ) => T & {
        new (...args: any[]): ApplicationV2 & HandlebarsApplicationMixin;
      };
    };
    ux: {
      ContextMenu: typeof ContextMenu;
      Draggable: any;
    };
  };
  data: {
    CalendarData: typeof CalendarData;
    TimeComponents: TimeComponents;
  };
  utils: {
    deepClone<T>(obj: T): T;
    mergeObject<T, U>(original: T, other: U, options?: any): T & U;
  };
}

// =============================================================================
// MODULE DECLARATION
// =============================================================================

export {};
