/**
 * Seasons & Stars Calendar Type Definitions
 */

export interface SeasonsStarsCalendar {
  id: string;
  name?: string; // Convenience property for calendar name
  label?: string; // Convenience property for calendar label
  description?: string; // Convenience property for calendar description
  translations: {
    [languageCode: string]: {
      label: string;
      description?: string;
      setting?: string;
    };
  };

  // NEW: WorldTime interpretation configuration
  worldTime?: {
    interpretation: 'epoch-based' | 'real-time-based';
    epochYear: number;
    currentYear: number;
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

  time: {
    hoursInDay: number;
    minutesInHour: number;
    secondsInMinute: number;
  };
}

export interface CalendarMonth {
  id?: string;
  name: string;
  abbreviation?: string;
  days: number;
  description?: string;
  translations?: {
    [languageCode: string]: {
      description?: string;
    };
  };
}

export interface CalendarWeekday {
  id?: string;
  name: string;
  abbreviation?: string;
  description?: string;
  translations?: {
    [languageCode: string]: {
      description?: string;
    };
  };
}

export interface CalendarIntercalary {
  name: string;
  days?: number;
  after: string;
  leapYearOnly: boolean;
  countsForWeekdays: boolean;
  description?: string;
  translations?: {
    [languageCode: string]: {
      description?: string;
    };
  };
}

export interface CalendarSeason {
  name: string;
  description?: string;
  startMonth: number;
  startDay: number;
  endMonth?: number;
  icon?: string;
  color?: string;
  translations?: {
    [languageCode: string]: {
      description?: string;
    };
  };
}

// Data structure for calendar dates (plain objects)
export interface CalendarDateData {
  year: number;
  month: number;
  day: number;
  weekday: number;
  intercalary?: string;
  time?: {
    hour: number;
    minute: number;
    second: number;
  };
}

// Interface for CalendarDate class instances (includes methods)
export interface CalendarDate extends CalendarDateData {
  // Methods available on CalendarDate class instances
  toObject(): CalendarDateData;
  toLongString(): string;
  toDateString(): string;
  toTimeString(): string;
}

export interface CalendarCalculation {
  totalDays: number;
  weekdayIndex: number;
  yearLength: number;
  monthLengths: number[];
  intercalaryDays: CalendarIntercalary[];
}

export interface DateFormatOptions {
  includeTime?: boolean;
  includeWeekday?: boolean;
  includeYear?: boolean;
  format?: 'short' | 'long' | 'numeric';
}
