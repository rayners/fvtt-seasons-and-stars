import type { CalendarDateData, CalendarSeason, SeasonsStarsCalendar } from '../types/calendar';
import type { CalendarEngineInterface } from '../types/foundry-extensions';

/**
 * Internal representation of a solar keyframe used for interpolation.
 * Both season starts and solar anchors are converted to this unified format.
 */
interface SolarKeyframe {
  /** Day of year (1-based) when this keyframe occurs */
  dayOfYear: number;
  /** Sunrise time in decimal hours */
  sunrise: number;
  /** Sunset time in decimal hours */
  sunset: number;
  /** Source identifier for debugging */
  source: string;
}

/**
 * Utility class for calculating sunrise and sunset times based on calendar seasons.
 * Handles interpolation between seasons and provides defaults when data is not available.
 */
export class SunriseSunsetCalculator {
  /**
   * Default sunrise/sunset times from Gregorian calendar (Baltimore, MD reference)
   * These are used as fallbacks for matching season names in other calendars
   */
  private static readonly GREGORIAN_DEFAULTS: Record<string, { sunrise: string; sunset: string }> =
    {
      Winter: { sunrise: '07:00', sunset: '16:45' },
      Spring: { sunrise: '06:30', sunset: '17:45' },
      Summer: { sunrise: '05:45', sunset: '20:15' },
      Autumn: { sunrise: '06:30', sunset: '19:30' },
      Fall: { sunrise: '06:30', sunset: '19:30' }, // Alias for Autumn
    };

  /**
   * Calculate sunrise and sunset times for a given date
   * @param date - The date to calculate times for
   * @param calendar - The calendar definition
   * @param engine - CalendarEngine instance for accurate year-length calculations
   * @returns Object with sunrise and sunset as seconds from midnight
   */
  static calculate(
    date: CalendarDateData,
    calendar: SeasonsStarsCalendar,
    engine: CalendarEngineInterface
  ): { sunrise: number; sunset: number } {
    // Build unified keyframes from seasons and solar anchors
    const keyframes = this.buildKeyframes(calendar, engine, date.year);

    // If we have keyframes with sunrise/sunset data, use keyframe-based interpolation
    if (keyframes.length > 0) {
      return this.calculateFromKeyframes(date, keyframes, calendar, engine);
    }

    // Fall back to existing season-based logic for backwards compatibility
    if (calendar.seasons && calendar.seasons.length > 0) {
      return this.calculateFromSeasons(date, calendar, engine);
    }

    // Final fallback: default 50/50 day/night split
    const defaultTimes = this.getDefaultTimes(calendar);
    return {
      sunrise: this.decimalHoursToSeconds(defaultTimes.sunrise, calendar),
      sunset: this.decimalHoursToSeconds(defaultTimes.sunset, calendar),
    };
  }

  /**
   * Build a unified list of keyframes from both seasons and solar anchors
   * Only includes keyframes that have sunrise AND sunset defined
   */
  private static buildKeyframes(
    calendar: SeasonsStarsCalendar,
    engine: CalendarEngineInterface,
    year: number
  ): SolarKeyframe[] {
    const keyframes: SolarKeyframe[] = [];

    // Add keyframes from seasons (season start dates)
    if (calendar.seasons) {
      for (const season of calendar.seasons) {
        // Only include if we have both sunrise AND sunset (either explicit or via Gregorian defaults)
        if ((season.sunrise && season.sunset) || this.GREGORIAN_DEFAULTS[season.name]) {
          const times = this.getSeasonTimes(season, calendar);
          const dayOfYear = this.seasonStartToDayOfYear(season, calendar, engine, year);
          keyframes.push({
            dayOfYear,
            sunrise: times.sunrise,
            sunset: times.sunset,
            source: `season:${season.name}`,
          });
        }
      }
    }

    // Add keyframes from solar anchors
    if (calendar.solarAnchors) {
      for (const anchor of calendar.solarAnchors) {
        // Only include if anchor has sunrise AND sunset defined
        if (anchor.sunrise && anchor.sunset) {
          const dayOfYear = this.dateToDayOfYear(
            { year, month: anchor.month, day: anchor.day, weekday: 0 },
            calendar,
            engine
          );
          keyframes.push({
            dayOfYear,
            sunrise: this.timeStringToHours(anchor.sunrise, calendar),
            sunset: this.timeStringToHours(anchor.sunset, calendar),
            source: `anchor:${anchor.id}`,
          });
        }
      }
    }

    // Sort keyframes by day of year
    keyframes.sort((a, b) => a.dayOfYear - b.dayOfYear);

    return keyframes;
  }

  /**
   * Calculate sunrise/sunset using keyframe-based interpolation
   */
  private static calculateFromKeyframes(
    date: CalendarDateData,
    keyframes: SolarKeyframe[],
    calendar: SeasonsStarsCalendar,
    engine: CalendarEngineInterface
  ): { sunrise: number; sunset: number } {
    const currentDayOfYear = this.dateToDayOfYear(date, calendar, engine);
    const yearLength = engine.getYearLength(date.year);

    // Find the surrounding keyframes
    const { prev, next } = this.findSurroundingKeyframes(currentDayOfYear, keyframes);

    // Calculate progress between keyframes
    const progress = this.calculateKeyframeProgress(
      currentDayOfYear,
      prev.dayOfYear,
      next.dayOfYear,
      yearLength
    );

    // Interpolate sunrise and sunset
    const sunriseHours = this.interpolate(prev.sunrise, next.sunrise, progress);
    const sunsetHours = this.interpolate(prev.sunset, next.sunset, progress);

    return {
      sunrise: this.decimalHoursToSeconds(sunriseHours, calendar),
      sunset: this.decimalHoursToSeconds(sunsetHours, calendar),
    };
  }

  /**
   * Find the keyframes immediately before and after the given day of year
   */
  private static findSurroundingKeyframes(
    dayOfYear: number,
    keyframes: SolarKeyframe[]
  ): { prev: SolarKeyframe; next: SolarKeyframe } {
    // Handle single keyframe case
    if (keyframes.length === 1) {
      return { prev: keyframes[0], next: keyframes[0] };
    }

    // Find the first keyframe that comes after the current day
    let nextIndex = keyframes.findIndex(kf => kf.dayOfYear > dayOfYear);

    // If no keyframe comes after, wrap to the first keyframe of next year
    if (nextIndex === -1) {
      nextIndex = 0;
    }

    // Previous keyframe is the one before next (with wrap-around)
    const prevIndex = nextIndex === 0 ? keyframes.length - 1 : nextIndex - 1;

    return {
      prev: keyframes[prevIndex],
      next: keyframes[nextIndex],
    };
  }

  /**
   * Calculate progress between two keyframes, handling year wrap-around
   */
  private static calculateKeyframeProgress(
    currentDay: number,
    prevDay: number,
    nextDay: number,
    yearLength: number
  ): number {
    // Handle year wrap-around (when next keyframe is in the "next year")
    let totalDays: number;
    let daysIntoPeriod: number;

    if (nextDay > prevDay) {
      // Normal case: both keyframes in same year order
      totalDays = nextDay - prevDay;
      daysIntoPeriod = currentDay - prevDay;
    } else {
      // Year wrap-around case
      totalDays = yearLength - prevDay + nextDay;
      if (currentDay >= prevDay) {
        daysIntoPeriod = currentDay - prevDay;
      } else {
        daysIntoPeriod = yearLength - prevDay + currentDay;
      }
    }

    return totalDays > 0 ? daysIntoPeriod / totalDays : 0;
  }

  /**
   * Legacy calculation using season-based interpolation (for backward compatibility)
   */
  private static calculateFromSeasons(
    date: CalendarDateData,
    calendar: SeasonsStarsCalendar,
    engine: CalendarEngineInterface
  ): { sunrise: number; sunset: number } {
    // Validate we have seasons to work with
    if (!calendar.seasons || calendar.seasons.length === 0) {
      const defaultTimes = this.getDefaultTimes(calendar);
      return {
        sunrise: this.decimalHoursToSeconds(defaultTimes.sunrise, calendar),
        sunset: this.decimalHoursToSeconds(defaultTimes.sunset, calendar),
      };
    }

    // Find current season and next season
    const currentSeasonIndex = this.findSeasonIndex(date, calendar.seasons, calendar);
    if (currentSeasonIndex === -1) {
      const defaultTimes = this.getDefaultTimes(calendar);
      return {
        sunrise: this.decimalHoursToSeconds(defaultTimes.sunrise, calendar),
        sunset: this.decimalHoursToSeconds(defaultTimes.sunset, calendar),
      };
    }

    const currentSeason = calendar.seasons[currentSeasonIndex];
    const nextSeasonIndex = (currentSeasonIndex + 1) % calendar.seasons.length;
    const nextSeason = calendar.seasons[nextSeasonIndex];

    // Get sunrise/sunset for current and next season (in decimal hours)
    const currentTimes = this.getSeasonTimes(currentSeason, calendar);
    const nextTimes = this.getSeasonTimes(nextSeason, calendar);

    // Calculate progress through the season (0 = season start, 1 = next season start)
    const progress = this.calculateSeasonProgress(
      date,
      currentSeason,
      nextSeason,
      calendar,
      engine
    );

    // Interpolate between current and next season (still in decimal hours)
    const sunriseHours = this.interpolate(currentTimes.sunrise, nextTimes.sunrise, progress);
    const sunsetHours = this.interpolate(currentTimes.sunset, nextTimes.sunset, progress);

    // Convert from decimal hours to seconds from midnight
    return {
      sunrise: this.decimalHoursToSeconds(sunriseHours, calendar),
      sunset: this.decimalHoursToSeconds(sunsetHours, calendar),
    };
  }

  /**
   * Find the index of the season that contains the given date
   */
  private static findSeasonIndex(
    date: CalendarDateData,
    seasons: CalendarSeason[],
    calendar: SeasonsStarsCalendar
  ): number {
    for (let i = 0; i < seasons.length; i++) {
      if (this.isDateInSeason(date, seasons[i], calendar)) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Check if a date falls within a season
   */
  private static isDateInSeason(
    date: CalendarDateData,
    season: CalendarSeason,
    calendar?: SeasonsStarsCalendar
  ): boolean {
    const month = date.month;
    const day = date.day;
    const startMonth = season.startMonth;
    const endMonth = season.endMonth ?? season.startMonth;
    const startDay = season.startDay ?? 1;
    const endDay = season.endDay ?? calendar?.months?.[endMonth - 1]?.days ?? 31;

    // Year-crossing season (e.g., Winter: Dec-Feb)
    if (startMonth > endMonth) {
      return (
        (month === startMonth && day >= startDay) ||
        (month === endMonth && day <= endDay) ||
        month > startMonth ||
        month < endMonth
      );
    }

    // Regular season
    if (month < startMonth || month > endMonth) {
      return false;
    }
    if (month === startMonth && day < startDay) {
      return false;
    }
    if (month === endMonth && day > endDay) {
      return false;
    }
    return true;
  }

  /**
   * Get sunrise/sunset times for a season, with fallbacks
   */
  private static getSeasonTimes(
    season: CalendarSeason,
    calendar: SeasonsStarsCalendar
  ): { sunrise: number; sunset: number } {
    // If season has explicit times, use them
    if (season.sunrise && season.sunset) {
      return {
        sunrise: this.timeStringToHours(season.sunrise, calendar),
        sunset: this.timeStringToHours(season.sunset, calendar),
      };
    }

    // Try to match with Gregorian defaults by season name
    const defaultTimes = this.GREGORIAN_DEFAULTS[season.name];
    if (defaultTimes) {
      return {
        sunrise: this.timeStringToHours(defaultTimes.sunrise, calendar),
        sunset: this.timeStringToHours(defaultTimes.sunset, calendar),
      };
    }

    // Fallback to default 50/50 day/night split
    return this.getDefaultTimes(calendar);
  }

  /**
   * Get default sunrise/sunset times (50% day, 50% night)
   * Returns decimal hours
   */
  private static getDefaultTimes(calendar: SeasonsStarsCalendar): {
    sunrise: number;
    sunset: number;
  } {
    const hoursInDay = calendar.time?.hoursInDay ?? 24;
    const sunriseHours = hoursInDay / 4; // 25% through the day
    const sunsetHours = (hoursInDay * 3) / 4; // 75% through the day
    return {
      sunrise: sunriseHours,
      sunset: sunsetHours,
    };
  }

  /**
   * Calculate how far through the current season we are (0 = season start, 1 = next season start)
   */
  private static calculateSeasonProgress(
    date: CalendarDateData,
    currentSeason: CalendarSeason,
    nextSeason: CalendarSeason,
    calendar: SeasonsStarsCalendar,
    engine: CalendarEngineInterface
  ): number {
    // Calculate total days in the season
    const seasonStartDayOfYear = this.seasonStartToDayOfYear(
      currentSeason,
      calendar,
      engine,
      date.year
    );
    const seasonEndDayOfYear = this.seasonStartToDayOfYear(nextSeason, calendar, engine, date.year);
    const currentDayOfYear = this.dateToDayOfYear(date, calendar, engine);

    let totalDaysInSeason: number;
    if (seasonEndDayOfYear > seasonStartDayOfYear) {
      totalDaysInSeason = seasonEndDayOfYear - seasonStartDayOfYear;
    } else {
      // Year-crossing season
      const daysInYear = engine.getYearLength(date.year);
      totalDaysInSeason = daysInYear - seasonStartDayOfYear + seasonEndDayOfYear;
    }

    // Calculate days into the season
    let daysIntoSeason: number;
    if (currentDayOfYear >= seasonStartDayOfYear) {
      daysIntoSeason = currentDayOfYear - seasonStartDayOfYear;
    } else {
      // We're in a year-crossing season and past the year boundary
      const daysInYear = engine.getYearLength(date.year);
      daysIntoSeason = daysInYear - seasonStartDayOfYear + currentDayOfYear;
    }

    // Return progress as a value between 0 and 1
    return totalDaysInSeason > 0 ? daysIntoSeason / totalDaysInSeason : 0;
  }

  /**
   * Convert a season's start to day-of-year
   */
  private static seasonStartToDayOfYear(
    season: CalendarSeason,
    calendar: SeasonsStarsCalendar,
    engine: CalendarEngineInterface,
    year?: number
  ): number {
    const startMonth = season.startMonth;
    const startDay = season.startDay ?? 1;
    // Use plain object for internal calculation
    return this.dateToDayOfYear(
      { year: year ?? 1, month: startMonth, day: startDay, weekday: 0 },
      calendar,
      engine
    );
  }

  /**
   * Convert a date to day-of-year (1-based)
   * Uses CalendarEngine to properly account for intercalary days
   */
  private static dateToDayOfYear(
    date: CalendarDateData,
    calendar: SeasonsStarsCalendar,
    engine: CalendarEngineInterface
  ): number {
    if (!calendar.months) {
      return date.day;
    }

    // Use engine for accurate calculation including intercalary days
    const monthLengths = engine.getMonthLengths(date.year);
    const intercalaryDays = calendar.intercalary || [];

    let dayOfYear = 0;

    // Add days from complete months
    for (let m = 1; m < date.month; m++) {
      dayOfYear += monthLengths[m - 1];

      // Add intercalary days after each complete month
      const monthName = calendar.months[m - 1]?.name;
      if (monthName) {
        const intercalaryAfter = intercalaryDays.filter(i => i.after === monthName);
        for (const intercalary of intercalaryAfter) {
          if (!intercalary.leapYearOnly || engine.isLeapYear(date.year)) {
            dayOfYear += intercalary.days || 1;
          }
        }
      }
    }

    // Add intercalary days before current month
    const currentMonthName = calendar.months[date.month - 1]?.name;
    if (currentMonthName) {
      const intercalaryBefore = intercalaryDays.filter(i => i.before === currentMonthName);
      for (const intercalary of intercalaryBefore) {
        if (!intercalary.leapYearOnly || engine.isLeapYear(date.year)) {
          dayOfYear += intercalary.days || 1;
        }
      }
    }

    dayOfYear += date.day;
    return dayOfYear;
  }

  /**
   * Convert time string (HH:MM) to hours as decimal
   * Respects calendar's minutesInHour setting
   */
  private static timeStringToHours(timeStr: string, calendar?: SeasonsStarsCalendar): number {
    const parts = timeStr.split(':');
    if (parts.length !== 2) {
      throw new Error(`Invalid time format: ${timeStr}. Expected HH:MM`);
    }

    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);

    if (isNaN(hours) || isNaN(minutes)) {
      throw new Error(`Invalid time values: ${timeStr}`);
    }

    const minutesInHour = calendar?.time?.minutesInHour ?? 60;
    return hours + (minutes || 0) / minutesInHour;
  }

  /**
   * Linear interpolation between two values
   */
  private static interpolate(start: number, end: number, progress: number): number {
    return start + (end - start) * progress;
  }

  /**
   * Convert decimal hours to seconds from midnight
   * Respects calendar's minutesInHour and secondsInMinute settings
   *
   * @param hours - Decimal hours (e.g., 6.5 = 6:30, 18.75 = 18:45)
   * @param calendar - Optional calendar definition
   * @returns Seconds from midnight
   *
   * @example
   * ```typescript
   * // Standard 24-hour day with 60-minute hours
   * const seconds = SunriseSunsetCalculator.decimalHoursToSeconds(6.0);
   * // returns: 21600 (6 × 60 × 60)
   *
   * // Half past six
   * const seconds2 = SunriseSunsetCalculator.decimalHoursToSeconds(6.5);
   * // returns: 23400 (6.5 × 60 × 60)
   *
   * // Custom calendar with 90 minutes per hour
   * const seconds3 = SunriseSunsetCalculator.decimalHoursToSeconds(6.0, customCalendar);
   * // returns: 32400 (6 × 90 × 60)
   * ```
   */
  static decimalHoursToSeconds(hours: number, calendar?: SeasonsStarsCalendar): number {
    const minutesInHour = calendar?.time?.minutesInHour ?? 60;
    const secondsInMinute = calendar?.time?.secondsInMinute ?? 60;
    return Math.round(hours * minutesInHour * secondsInMinute);
  }

  /**
   * Convert decimal hours to hour and minute components for use in setDate operations
   * Respects calendar's minutesInHour setting
   *
   * @param hours - Decimal hours (e.g., 6.5 = 6:30, 18.75 = 18:45)
   * @param calendar - Optional calendar definition (uses minutesInHour from calendar.time)
   * @returns Object with hour and minute as integers
   *
   * @example
   * ```typescript
   * const components = SunriseSunsetCalculator.decimalHoursToTimeComponents(6.5);
   * // returns: { hour: 6, minute: 30 }
   *
   * // With custom calendar (90 minutes per hour)
   * const customComponents = SunriseSunsetCalculator.decimalHoursToTimeComponents(6.5, calendar);
   * // returns: { hour: 6, minute: 45 }
   * ```
   */
  static decimalHoursToTimeComponents(
    hours: number,
    calendar?: SeasonsStarsCalendar
  ): { hour: number; minute: number } {
    const h = Math.floor(hours);
    const minutesInHour = calendar?.time?.minutesInHour ?? 60;
    const m = Math.round((hours - h) * minutesInHour);

    // Handle edge case where rounding produces minutesInHour
    if (m === minutesInHour) {
      return { hour: h + 1, minute: 0 };
    }

    return { hour: h, minute: m };
  }

  /**
   * Convert hours as decimal to time string (HH:MM)
   * Respects calendar's minutesInHour setting
   */
  static hoursToTimeString(hours: number, calendar?: SeasonsStarsCalendar): string {
    const { hour, minute } = this.decimalHoursToTimeComponents(hours, calendar);
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  /**
   * Convert seconds from midnight to hour and minute components for use in setDate operations
   * Respects calendar's minutesInHour and secondsInMinute settings
   *
   * @param seconds - Seconds from midnight (e.g., 21600 = 6:00, 64800 = 18:00)
   * @param calendar - Optional calendar definition
   * @returns Object with hour and minute as integers
   *
   * @example
   * ```typescript
   * // Standard 24-hour day with 60-minute hours
   * const components1 = SunriseSunsetCalculator.secondsToTimeComponents(21600);
   * // returns: { hour: 6, minute: 0 }
   *
   * // Half past six
   * const components2 = SunriseSunsetCalculator.secondsToTimeComponents(23400);
   * // returns: { hour: 6, minute: 30 }
   *
   * // Custom calendar with 90 minutes per hour
   * const components3 = SunriseSunsetCalculator.secondsToTimeComponents(32400, customCalendar);
   * // returns: { hour: 6, minute: 0 }
   * ```
   */
  static secondsToTimeComponents(
    seconds: number,
    calendar?: SeasonsStarsCalendar
  ): { hour: number; minute: number } {
    const minutesInHour = calendar?.time?.minutesInHour ?? 60;
    const secondsInMinute = calendar?.time?.secondsInMinute ?? 60;

    // Calculate total minutes from midnight
    const totalMinutes = Math.floor(seconds / secondsInMinute);

    // Calculate hours and remaining minutes
    const hours = Math.floor(totalMinutes / minutesInHour);
    const minutes = totalMinutes % minutesInHour;

    return { hour: hours, minute: minutes };
  }

  /**
   * Convert seconds from midnight to time string (HH:MM)
   * Respects calendar's minutesInHour and secondsInMinute settings
   *
   * @param seconds - Seconds from midnight (e.g., 21600 = 6:00, 64800 = 18:00)
   * @param calendar - Optional calendar definition
   * @returns Time string in HH:MM format
   *
   * @example
   * ```typescript
   * // Standard 24-hour day with 60-minute hours
   * const time1 = SunriseSunsetCalculator.secondsToTimeString(21600);
   * // returns: "06:00" (6 × 60 × 60 = 21600)
   *
   * // Half past six
   * const time2 = SunriseSunsetCalculator.secondsToTimeString(23400);
   * // returns: "06:30" (6.5 × 60 × 60 = 23400)
   *
   * // Custom calendar with 90 minutes per hour
   * const time3 = SunriseSunsetCalculator.secondsToTimeString(32400, customCalendar);
   * // returns: "06:00" (6 × 90 × 60 = 32400)
   * ```
   */
  static secondsToTimeString(seconds: number, calendar?: SeasonsStarsCalendar): string {
    const { hour, minute } = this.secondsToTimeComponents(seconds, calendar);
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }
}
