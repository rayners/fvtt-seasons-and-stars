/**
 * Type definitions for widget components
 * Reduces reliance on 'any' types for better type safety
 */

import type { CalendarDate as ICalendarDate } from './calendar';

export type WidgetType = 'main' | 'mini' | 'grid';

// Base widget context shared by all widgets
export interface BaseWidgetContext extends Record<string, unknown> {
  calendar: CalendarInfo | null;
  currentDate: ICalendarDate | null;
  formattedDate: string;
  isGM: boolean;
  error?: string;
}

// Mini widget specific context
export interface MiniWidgetContext extends BaseWidgetContext {
  shortDate: string;
  hasSmallTime: boolean;
  showTimeControls: boolean;
  showTime: boolean;
  timeString: string;
  showDayOfWeek: boolean;
  weekdayDisplay: string;
  showYear: boolean;
  yearDisplay: string;
  timeAdvancementActive?: boolean;
  advancementRatioDisplay?: string;
  compactMode: boolean;
  sidebarButtons: SidebarButton[];
  showMoonPhases: boolean;
  moonPhases: Array<{
    moonName: string;
    phaseName: string;
    phaseIcon: string;
    faIcon: string;
    moonColor?: string;
  }>;
  /** Special display format for calendars with unique date representations (e.g., Cosmere) */
  specialDisplayFormat?: string;
}

// Main widget specific context
export interface MainWidgetContext extends BaseWidgetContext {
  shortDate: string;
  timeString: string;
  canAdvanceTime: boolean;
  hasSmallTime: boolean;
  sidebarButtons: SidebarButton[];
  timeAdvancementActive?: boolean;
  advancementRatioDisplay?: string;
  showTimeControls?: boolean;
  moonPhases: Array<{
    moonName: string;
    phaseName: string;
    phaseIcon: string;
    faIcon: string;
    moonColor?: string;
    moonColorIndex: number;
  }>;
  /** Special display format for calendars with unique date representations (e.g., Cosmere) */
  specialDisplayFormat?: string;
}

// Grid widget specific context
export interface GridWidgetContext extends BaseWidgetContext {
  viewDate: ICalendarDate;
  monthData: MonthData;
  monthName: string;
  monthDescription?: string;
  yearDisplay: string;
  weekdays: WeekdayInfo[];
  notesForDays: Record<string, unknown[]>; // Date string -> notes array
  sidebarButtons: SidebarButton[];
}

// Widget render options
export interface WidgetRenderOptions {
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
  day: number | string;
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
  callback: () => void;
}

export interface SidebarButtonConfig extends SidebarButton {
  only?: WidgetType[];
  except?: WidgetType[];
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
  calendarDate: ICalendarDate;
  formattedDate: string;
  dayProgress: number;
  isDaytime: boolean;
  season: number;
  lastKnownTime: number;
  lastKnownDate: ICalendarDate | null;
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
    endDate?: ICalendarDate;
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
