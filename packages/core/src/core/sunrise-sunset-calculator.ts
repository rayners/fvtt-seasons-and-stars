import type { CalendarDateData, CalendarSeason, SeasonsStarsCalendar } from '../types/calendar';
import type { CalendarEngineInterface } from '../types/foundry-extensions';

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
   * @returns Object with sunrise and sunset as hour decimal values (e.g., 6.5 = 6:30)
   */
  static calculate(
    date: CalendarDateData,
    calendar: SeasonsStarsCalendar,
    engine: CalendarEngineInterface
  ): { sunrise: number; sunset: number } {
    if (!calendar.seasons || calendar.seasons.length === 0) {
      return this.getDefaultTimes(calendar);
    }

    // Find current season and next season
    const currentSeasonIndex = this.findSeasonIndex(date, calendar.seasons, calendar);
    if (currentSeasonIndex === -1) {
      return this.getDefaultTimes(calendar);
    }

    const currentSeason = calendar.seasons[currentSeasonIndex];
    const nextSeasonIndex = (currentSeasonIndex + 1) % calendar.seasons.length;
    const nextSeason = calendar.seasons[nextSeasonIndex];

    // Get sunrise/sunset for current and next season
    const currentTimes = this.getSeasonTimes(currentSeason, calendar);
    const nextTimes = this.getSeasonTimes(nextSeason, calendar);

    // Calculate progress through the season (0 = first day, 1 = last day)
    const progress = this.calculateSeasonProgress(
      date,
      currentSeason,
      nextSeason,
      calendar,
      engine
    );

    // Interpolate between current and next season
    return {
      sunrise: this.interpolate(currentTimes.sunrise, nextTimes.sunrise, progress),
      sunset: this.interpolate(currentTimes.sunset, nextTimes.sunset, progress),
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
   */
  private static getDefaultTimes(calendar: SeasonsStarsCalendar): {
    sunrise: number;
    sunset: number;
  } {
    const hoursInDay = calendar.time?.hoursInDay ?? 24;
    const sunrise = hoursInDay / 4; // 25% through the day
    const sunset = (hoursInDay * 3) / 4; // 75% through the day
    return { sunrise, sunset };
  }

  /**
   * Calculate how far through the current season we are (0 = first day, 1 = last day)
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
   * Convert hours as decimal to time string (HH:MM)
   * Respects calendar's minutesInHour setting
   */
  static hoursToTimeString(hours: number, calendar?: SeasonsStarsCalendar): string {
    const h = Math.floor(hours);
    const minutesInHour = calendar?.time?.minutesInHour ?? 60;
    const m = Math.round((hours - h) * minutesInHour);

    // Handle edge case where rounding produces minutesInHour
    if (m === minutesInHour) {
      return `${(h + 1).toString().padStart(2, '0')}:00`;
    }

    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
}
