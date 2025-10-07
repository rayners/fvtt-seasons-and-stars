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
  events?: CalendarEvent[];

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

  /**
   * System-specific compatibility adjustments applied by CompatibilityManager.
   * This field is managed internally and should not be modified by external modules.
   *
   * The compatibility manager uses this field to store system-specific date formatting
   * adjustments (e.g., weekday offsets for WFRP, month offsets for different systems)
   * that are applied automatically when converting between calendar dates and world time.
   *
   * @internal
   * @see CompatibilityManager
   *
   * @example
   * // Example of how CompatibilityManager uses this field internally
   * calendar.compatibility = {
   *   wfrp4e: {
   *     weekdayOffset: 1,
   *     description: 'WFRP4e uses Monday as first day of week'
   *   },
   *   pf2e: {
   *     dateFormatting: {
   *       monthOffset: 1
   *     },
   *     description: 'PF2e uses 1-indexed months'
   *   }
   * };
   */
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

/**
 * Calendar Event System
 *
 * Events are recurring occasions (holidays, festivals, observances) that occur
 * predictably according to calendar rules. Events are distinct from notes:
 * events are calendar metadata that recur automatically, while notes are
 * user-created content for specific dates.
 */

/**
 * Fixed date recurrence - event occurs on the same calendar date each year
 *
 * @example
 * // New Year's Day (January 1st)
 * {
 *   type: 'fixed',
 *   month: 1,
 *   day: 1
 * }
 *
 * @example
 * // Leap day that only occurs in leap years
 * {
 *   type: 'fixed',
 *   month: 2,
 *   day: 29
 * }
 *
 * @example
 * // Event that moves to last day if month is too short
 * {
 *   type: 'fixed',
 *   month: 2,
 *   day: 30,
 *   ifDayNotExists: 'lastDay'
 * }
 */
export interface FixedDateRecurrence {
  type: 'fixed';
  /** 1-based month index */
  month: number;
  /** Day of month (can be intercalary) */
  day: number;
  /**
   * How to handle when the specified day doesn't exist in the month
   * - 'lastDay': Event occurs on last day of the month
   * - 'beforeDay': Event occurs on last valid day before specified day
   * - 'afterDay': Event moves to first day of next month
   * - undefined: Event is skipped that year (default)
   */
  ifDayNotExists?: 'lastDay' | 'beforeDay' | 'afterDay';
}

/**
 * Ordinal recurrence - event occurs on Nth occurrence of a weekday within a month
 *
 * Prerequisites: Calendar must define a weekdays array. If weekdays are not
 * defined, ordinal recurrence events will be skipped with a validation warning.
 *
 * @example
 * // First Monday of September (US Labor Day)
 * {
 *   type: 'ordinal',
 *   month: 9,
 *   occurrence: 1,
 *   weekday: 1
 * }
 *
 * @example
 * // Last Thursday of November (US Thanksgiving)
 * {
 *   type: 'ordinal',
 *   month: 11,
 *   occurrence: -1,
 *   weekday: 4
 * }
 */
export interface OrdinalRecurrence {
  type: 'ordinal';
  /** 1-based month index */
  month: number;
  /** 1st, 2nd, 3rd, 4th, or last (-1) occurrence */
  occurrence: 1 | 2 | 3 | 4 | -1;
  /** Weekday index (calendar-specific, typically 0-6) */
  weekday: number;
  /**
   * Count intercalary days when finding occurrences?
   * - true: Intercalary days with weekdays are candidates
   * - false: Skip intercalary days even if they have weekdays (default)
   */
  includeIntercalary?: boolean;
}

/**
 * Interval recurrence - event occurs every N years on a specific date
 *
 * @example
 * // Olympics (every 4 years)
 * {
 *   type: 'interval',
 *   intervalYears: 4,
 *   anchorYear: 2024,
 *   month: 7,
 *   day: 26
 * }
 */
export interface IntervalRecurrence {
  type: 'interval';
  /** Repeat every N years */
  intervalYears: number;
  /** Reference year for calculation */
  anchorYear: number;
  /** 1-based month index */
  month: number;
  /** Day of month */
  day: number;
  /**
   * How to handle when the specified day doesn't exist in the month
   * Same options as FixedDateRecurrence
   */
  ifDayNotExists?: 'lastDay' | 'beforeDay' | 'afterDay';
}

/**
 * Union type for all recurrence rule types
 */
export type RecurrenceRule = FixedDateRecurrence | OrdinalRecurrence | IntervalRecurrence;

/**
 * Exception for a specific event occurrence
 */
export type EventException =
  | {
      /** Year this exception applies to */
      year: number;
      /** Skip this occurrence */
      type: 'skip';
    }
  | {
      /** Year this exception applies to */
      year: number;
      /** Move to different date */
      type: 'move';
      /** Target month (1-based) */
      moveToMonth: number;
      /** Target day */
      moveToDay: number;
    };

/**
 * Translation for an event
 */
export interface EventTranslation {
  name: string;
  description?: string;
}

/**
 * Calendar Event definition
 *
 * Events are recurring occasions that occur predictably according to calendar
 * rules. They can be defined in calendar JSON files or added/overridden at
 * the world level by the GM.
 *
 * @example
 * // Basic fixed date event
 * {
 *   id: 'new-year',
 *   name: "New Year's Day",
 *   description: 'Start of the new year',
 *   recurrence: { type: 'fixed', month: 1, day: 1 },
 *   color: '#ff0000',
 *   icon: 'fas fa-champagne-glasses'
 * }
 *
 * @example
 * // Event with journal entry and year range
 * {
 *   id: 'winter-festival',
 *   name: 'Winter Festival',
 *   description: 'Annual celebration of the winter solstice',
 *   journalEntryId: '@JournalEntry[Winter Festival]',
 *   recurrence: { type: 'fixed', month: 12, day: 21 },
 *   startYear: 100,
 *   visibility: 'player-visible'
 * }
 */
export interface CalendarEvent {
  /** Unique identifier (stable, never change after publication) */
  id: string;
  /** Display name */
  name: string;
  /** Brief plain text summary for tooltips/previews */
  description?: string;
  /** Optional reference to JournalEntry for rich content */
  journalEntryId?: string;
  /** When this event occurs */
  recurrence: RecurrenceRule;
  /** First year event occurs (omit for all past years) */
  startYear?: number;
  /** Last year event occurs (omit for indefinite future) */
  endYear?: number;
  /** Specific dates to skip/move */
  exceptions?: EventException[];
  /** Event visibility (default: 'player-visible') */
  visibility?: 'gm-only' | 'player-visible';
  /** Hex color for calendar display (#RRGGBB) */
  color?: string;
  /** CSS icon class (e.g., 'fas fa-star') */
  icon?: string;
  /** Translations for event name and description */
  translations?: Record<string, EventTranslation>;
}

/**
 * Event occurrence on a specific date
 *
 * Returned by API methods that compute when events occur
 */
export interface EventOccurrence {
  /** The event definition */
  event: CalendarEvent;
  /** Year this occurrence happens */
  year: number;
  /** Month this occurrence happens (1-based) */
  month: number;
  /** Day this occurrence happens */
  day: number;
}

/**
 * World-level event settings
 *
 * Stored in world settings to allow GMs to add custom events,
 * override calendar-defined events, or hide events.
 */
export interface WorldEventSettings {
  /** GM-added or overridden events */
  events: CalendarEvent[];
  /** Calendar event IDs to hide */
  disabledEventIds: string[];
}

/**
 * Data passed to the seasons-stars:eventOccurs hook
 */
export interface EventOccursData {
  /** All events occurring on this date */
  events: EventOccurrence[];
  /** The date these events occur */
  date: {
    year: number;
    month: number;
    day: number;
  };
  /** True if fired during initialization */
  isStartup: boolean;
  /** Only present during time advancement */
  previousDate?: {
    year: number;
    month: number;
    day: number;
  };
}
