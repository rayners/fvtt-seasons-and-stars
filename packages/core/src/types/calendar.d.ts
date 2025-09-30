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
      yearName?: string;
    };
  };
  sources?: CalendarSourceReference[];

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
    /**
     * Optional base-year shift applied before evaluating the interval.
     * Allows lore-specific rules such as "every 8 years starting with 4708 AR".
     */
    offset?: number;
    month?: string;
    /**
     * Number of days to add (positive) or remove (negative) during leap years.
     * For example, +1 adds an extra day, -1 removes a day.
     */
    extraDays?: number;
  };

  months: CalendarMonth[];
  weekdays: CalendarWeekday[];
  intercalary: CalendarIntercalary[];
  seasons?: CalendarSeason[];
  moons?: CalendarMoon[];
  canonicalHours?: CalendarCanonicalHour[];

  time: {
    hoursInDay: number;
    minutesInHour: number;
    secondsInMinute: number;
  };

  // Date formatting templates using Handlebars syntax
  dateFormats?: CalendarDateFormats;

  // Calendar Variants System
  variants?: {
    [variantId: string]: CalendarVariant;
  };

  // Source tracking for badge display and management
  sourceInfo?: CalendarSourceInfo;

  // System compatibility adjustments (for internal use)
  compatibility?: {
    [systemId: string]: {
      weekdayOffset?: number;
      dateFormatting?: {
        monthOffset?: number;
        dayOffset?: number;
      };
      description?: string;
    };
  };
}

export type CalendarSourceReference = string | CalendarCitationReference;

export interface CalendarCitationReference {
  /** User-supplied bibliographic reference text */
  citation: string;
  /** Optional context describing who provided the citation or when */
  notes?: string;
}

// Date formatting system interfaces
export interface CalendarDateFormats {
  // Named format templates - can be string or object with named variants
  [formatName: string]: string | CalendarDateFormatVariants;

  // Widget-specific formats for different UI contexts
  widgets?: {
    mini?: string;
    main?: string;
    grid?: string;
  };
}

export interface CalendarDateFormatVariants {
  // Multiple named variants of a format (e.g., short/long versions)
  [variantName: string]: string;
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

export type CalendarIntercalary = {
  name: string;
  days?: number;
  leapYearOnly: boolean;
  countsForWeekdays?: boolean;
  description?: string;
  translations?: {
    [languageCode: string]: {
      description?: string;
    };
  };
} & ({ after: string; before?: never } | { before: string; after?: never });

export interface CalendarSeason {
  name: string;
  description?: string;
  startMonth: number;
  startDay?: number;
  endMonth?: number;
  icon?: string;
  color?: string;
  translations?: {
    [languageCode: string]: {
      description?: string;
    };
  };
}

export interface CalendarMoon {
  name: string;
  cycleLength: number;
  firstNewMoon: MoonReferenceDate;
  phases: MoonPhase[];
  color?: string;
  translations?: {
    [languageCode: string]: {
      description?: string;
    };
  };
}

export interface MoonReferenceDate {
  year: number;
  month: number;
  day: number;
}

export interface MoonPhase {
  name: string;
  length: number;
  singleDay: boolean;
  icon: string;
  translations?: {
    [languageCode: string]: {
      name?: string;
    };
  };
}

export interface MoonPhaseInfo {
  moon: CalendarMoon;
  phase: MoonPhase;
  phaseIndex: number;
  dayInPhase: number;
  dayInPhaseExact: number;
  daysUntilNext: number;
  daysUntilNextExact: number;
  phaseProgress: number;
}

export interface CalendarCanonicalHour {
  name: string;
  startHour: number;
  endHour: number;
  startMinute?: number;
  endMinute?: number;
  description?: string;
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
  toShortString(): string;
  toLongString(): string;
  toDateString(): string;
  toTimeString(): string;
  countsForWeekdays(): boolean;
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

// Calendar Variants System
export interface CalendarVariant {
  name: string;
  description: string;
  default?: boolean;
  config?: {
    yearOffset?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  overrides?: {
    year?: Partial<SeasonsStarsCalendar['year']>;
    months?: {
      [monthName: string]: Partial<CalendarMonth>;
    };
    weekdays?: {
      [weekdayName: string]: Partial<CalendarWeekday>;
    };
    moons?: CalendarMoon[];
    canonicalHours?: CalendarCanonicalHour[];
    dateFormats?: CalendarDateFormats;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

/**
 * Source information for calendar badge display and management
 */
export interface CalendarSourceInfo {
  /** Source type - determines badge style and icon */
  type: 'builtin' | 'module' | 'external';

  /** Display name for the source */
  sourceName: string;

  /** Description for tooltips */
  description: string;

  /** Icon class for badge display */
  icon: string;

  /** Module ID (for module sources) */
  moduleId?: string;

  /** External source ID (for external sources) */
  externalSourceId?: string;

  /** Original URL or path where calendar was loaded from */
  url?: string;
}
