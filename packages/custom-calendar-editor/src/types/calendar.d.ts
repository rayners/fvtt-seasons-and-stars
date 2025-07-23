/**
 * Type definitions for calendar structures
 * Re-exports from S&S core with additional custom editor types
 */

// Calendar type definitions (simplified for editor)
export interface SeasonsStarsCalendar {
  id: string;
  name?: string;
  label?: string;
  description?: string;
  translations: {
    [languageCode: string]: {
      label: string;
      description?: string;
      setting?: string;
    };
  };
  year: {
    epoch: number;
    currentYear: number;
    prefix: string;
    suffix: string;
    startDay: number;
  };
  leapYear: {
    rule: 'none' | 'gregorian' | 'custom';
    interval?: number;
    month?: string;
    extraDays?: number;
  };
  months: CalendarMonth[];
  weekdays: CalendarWeekday[];
  intercalary: CalendarIntercalary[];
  seasons?: CalendarSeason[];
  moons?: CalendarMoon[];
  time: {
    hoursInDay: number;
    minutesInHour: number;
    secondsInMinute: number;
  };
}

export interface CalendarMonth {
  name: string;
  days: number;
  intercalary: boolean;
}

export interface CalendarWeekday {
  name: string;
  abbreviation: string;
}

export interface CalendarIntercalary {
  name: string;
  day: number;
  month: string;
}

export interface CalendarSeason {
  name: string;
  month: number;
  day: number;
  color?: string;
}

export interface CalendarMoon {
  name: string;
  cycleLength: number;
  color?: string;
  phases?: {
    name: string;
    length: number;
  }[];
}

export interface CalendarSourceInfo {
  sourceType: string;
  sourceId: string;
  sourceName: string;
  canEdit: boolean;
  canDelete: boolean;
}

// Custom editor specific types
export interface CustomCalendarEditorOptions {
  mode: 'create' | 'edit' | 'variant';
  calendar?: SeasonsStarsCalendar;
  baseCalendar?: SeasonsStarsCalendar;
}

export interface CalendarValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface ImportResult {
  success: boolean;
  calendarId?: string;
  errors?: string[];
}

export interface ExportResult {
  success: boolean;
  data?: string;
  errors?: string[];
}

// Wizard step definitions
export type WizardStep = 'basic' | 'time' | 'months' | 'weekdays' | 'advanced' | 'review';

export interface WizardStepData {
  step: WizardStep;
  title: string;
  isValid: boolean;
  canSkip: boolean;
}

// Template data for calendar creation
export interface CalendarTemplate {
  id: string;
  name: string;
  description: string;
  category: 'fantasy' | 'historical' | 'scifi' | 'modern' | 'custom';
  calendar: Partial<SeasonsStarsCalendar>;
}