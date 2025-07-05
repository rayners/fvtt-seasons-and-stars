/**
 * Type definitions for widget components
 * Reduces reliance on 'any' types for better type safety
 */

import type { CalendarDateData } from './calendar';

// Base widget context shared by all widgets
export interface BaseWidgetContext extends Record<string, unknown> {
  calendar: CalendarInfo | null;
  currentDate: CalendarDateData | null;
  formattedDate: string;
  isGM: boolean;
  error?: string;
}

// Mini widget specific context
export interface MiniWidgetContext extends BaseWidgetContext {
  shortDate: string;
  hasSmallTime: boolean;
  showTimeControls: boolean;
}

// Main widget specific context
export interface MainWidgetContext extends BaseWidgetContext {
  shortDate: string;
  timeString: string;
  canAdvanceTime: boolean;
  hasSmallTime: boolean;
  sidebarButtons: SidebarButton[];
}

// Grid widget specific context
export interface GridWidgetContext extends BaseWidgetContext {
  viewDate: CalendarDateData;
  monthData: MonthData;
  monthName: string;
  monthDescription?: string;
  yearDisplay: string;
  weekdays: WeekdayInfo[];
  notesForDays: Record<string, any[]>; // Date string -> notes array
}

// Widget render options
export interface WidgetRenderOptions extends Record<string, unknown> {
  force?: boolean;
  position?: Partial<ApplicationV2Position>;
  window?: Partial<ApplicationV2Window>;
  parts?: string[];
}

// Calendar info for widget display
export interface CalendarInfo {
  id: string;
  label: string;
  description?: string;
  setting?: string;
}

// Month data for grid widget
export interface MonthData {
  weeks: WeekData[];
  monthLength: number;
  firstDay: number;
  monthName: string;
}

// Week data structure
export interface WeekData {
  days: DayData[];
}

// Day data structure
export interface DayData {
  day: number;
  isToday: boolean;
  isSelected: boolean;
  isOtherMonth: boolean;
  hasNotes: boolean;
  noteCount?: number;
  categoryBorderColor?: string;
}

// Weekday information
export interface WeekdayInfo {
  name: string;
  abbreviation: string;
}

// Sidebar button type (moved from base-widget-manager.ts)
export interface SidebarButton {
  name: string;
  icon: string;
  tooltip: string;
  callback: Function;
}

// Scene control types
export interface SceneControl {
  name: string;
  tools: Record<string, SceneControlTool>;
}

export interface SceneControlTool {
  name: string;
  title: string;
  icon: string;
  onChange?: () => void;
  button?: boolean;
  toggle?: boolean;
  active?: boolean;
}

// Debug info type
export interface DebugInfo {
  worldTime: number;
  calendarDate: CalendarDateData;
  formattedDate: string;
  dayProgress: number;
  isDaytime: boolean;
  season: number;
  lastKnownTime: number;
  lastKnownDate: CalendarDateData | null;
}

// Calendar validation result
export interface CalendarValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Note creation dialog result
export interface CreateNoteDialogResult {
  title: string;
  content: string;
  category: string;
  tags: string[];
  allDay: boolean;
  playerVisible: boolean;
  recurring?: {
    frequency: string;
    interval: number;
    endDate?: CalendarDateData;
    maxOccurrences?: number;
  };
}

// Application position and window interfaces for better typing
export interface ApplicationV2Position {
  top: number;
  left: number;
  width: number | 'auto';
  height: number | 'auto';
  scale?: number;
}

export interface ApplicationV2Window {
  title: string;
  icon?: string;
  frame: boolean;
  positioned: boolean;
  minimizable: boolean;
  resizable: boolean;
  id?: string;
}

// Template context extension types
export interface ContextExtensionAPI {
  /**
   * Register an extension that adds data to widget template contexts
   * @param extensionData Extension configuration
   * @returns Extension ID for later cleanup
   */
  registerExtension(extensionData: {
    id?: string;
    priority?: number;
    widgetTypes: string[];
    extensionFunction: (context: any, widgetType: string, options?: any) => any | Promise<any>;
    metadata: {
      name: string;
      description?: string;
      version?: string;
      author?: string;
    };
  }): string;

  /**
   * Register a hook that runs before or after context preparation
   * @param hookData Hook configuration
   * @returns Hook ID for later cleanup
   */
  registerHook(hookData: {
    id?: string;
    phase: 'before' | 'after';
    widgetTypes: string[];
    hookFunction: (
      context: any,
      widgetType: string,
      phase: string,
      options?: any
    ) => any | Promise<any> | void;
  }): string;

  /**
   * Unregister an extension by ID
   */
  unregisterExtension(extensionId: string): boolean;

  /**
   * Unregister a hook by ID
   */
  unregisterHook(hookId: string): boolean;

  /**
   * Clean up all extensions and hooks for this module
   */
  cleanup(): void;
}
