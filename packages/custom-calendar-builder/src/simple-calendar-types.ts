export interface SimpleCalendarExport {
  exportVersion: number;
  globalConfig?: {
    secondsInCombatRound?: number;
    calendarsSameTimestamp?: boolean;
    syncCalendars?: boolean;
    showNotesFolder?: boolean;
  };
  permissions?: unknown;
  calendars: SimpleCalendarData[];
  notes?: Record<string, unknown[]>;
}

export interface SimpleCalendarData {
  id: string;
  name: string;
  description?: string;
  currentDate?: {
    year?: number;
    month?: number;
    day?: number;
  };
  general?: {
    gameWorldTimeIntegration?: string;
    pf2eSync?: boolean;
    dateFormat?: {
      date?: string;
      time?: string;
      monthYear?: string;
    };
    permissions?: unknown;
  };
  leapYear?: {
    rule?: string;
    customMod?: number;
    months?: number[];
  };
  months?: SimpleCalendarMonth[];
  weekdays?: SimpleCalendarWeekday[];
  years?: {
    numericRepresentation?: number;
    prefix?: string;
    postfix?: string;
    yearZero?: number;
    yearNames?: string[];
    yearNamingRule?: string;
    yearNamesStart?: number;
  };
  time?: {
    hoursInDay?: number;
    minutesInHour?: number;
    secondsInMinute?: number;
    gameTimeRatio?: number;
    unifyGameAndClockPause?: boolean;
    updateFrequency?: number;
  };
  seasons?: SimpleCalendarSeason[];
  moons?: SimpleCalendarMoon[];
  noteCategories?: unknown[];
  notes?: unknown[];
}

export interface SimpleCalendarMonth {
  id?: string;
  name: string;
  description?: string;
  abbreviation?: string;
  numericRepresentation?: number;
  numberOfDays?: number;
  numberOfLeapYearDays?: number;
  intercalary?: boolean;
  intercalaryInclude?: boolean;
  startingWeekday?: number | null;
}

export interface SimpleCalendarWeekday {
  id?: string;
  name: string;
  description?: string;
  abbreviation?: string;
  numericRepresentation?: number;
}

export interface SimpleCalendarSeason {
  id?: string;
  name: string;
  description?: string;
  color?: string;
  startingMonth?: number;
  startingDay?: number;
  sunriseTimes?: number[];
  sunsetTimes?: number[];
  icon?: string;
}

export interface SimpleCalendarMoon {
  id?: string;
  name: string;
  description?: string;
  cycleLength?: number;
  cycleDayAdjust?: number;
  firstNewMoon?: {
    year?: number;
    month?: number;
    day?: number;
  };
  phases?: SimpleCalendarMoonPhase[];
  color?: string;
  referenceTime?: number;
}

export interface SimpleCalendarMoonPhase {
  name: string;
  length: number;
  singleDay?: boolean;
  icon?: string;
}
