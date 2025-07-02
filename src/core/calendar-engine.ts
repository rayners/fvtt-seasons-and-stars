/**
 * Core calendar calculation engine for Seasons & Stars
 */

import type {
  SeasonsStarsCalendar,
  CalendarDateData,
  CalendarCalculation,
  CalendarIntercalary,
} from '../types/calendar';
import { CalendarDate } from './calendar-date';
import { CalendarTimeUtils } from './calendar-time-utils';
import { compatibilityManager } from './compatibility-manager';

export class CalendarEngine {
  private calendar: SeasonsStarsCalendar;
  private calculationCache: Map<string, CalendarCalculation> = new Map();

  constructor(calendar: SeasonsStarsCalendar) {
    this.calendar = calendar;
    this.precomputeYearData();
  }

  /**
   * Convert Foundry world time (seconds) to calendar date
   * Now supports both epoch-based and real-time-based interpretation
   */
  worldTimeToDate(worldTime: number, worldCreationTimestamp?: number): CalendarDate {
    const adjustedWorldTime = this.adjustWorldTimeForInterpretation(worldTime);

    const totalSeconds = Math.floor(adjustedWorldTime);
    const secondsPerDay = CalendarTimeUtils.getSecondsPerDay(this.calendar);

    const totalDays = Math.floor(totalSeconds / secondsPerDay);
    let secondsInDay = totalSeconds % secondsPerDay;

    // Handle negative seconds in day (can happen with real-time interpretation)
    if (secondsInDay < 0) {
      secondsInDay += secondsPerDay;
    }

    // Calculate time of day
    const secondsPerHour = CalendarTimeUtils.getSecondsPerHour(this.calendar);
    let hour = Math.floor(secondsInDay / secondsPerHour);
    let minute = Math.floor((secondsInDay % secondsPerHour) / this.calendar.time.secondsInMinute);
    let second = secondsInDay % this.calendar.time.secondsInMinute;

    // Normalize -0 to +0 for JavaScript precision issues
    let normalizedHour = hour === 0 ? 0 : hour;
    let normalizedMinute = minute === 0 ? 0 : minute;
    let normalizedSecond = second === 0 ? 0 : second;

    // Convert days to calendar date
    const dateInfo = this.daysToDate(totalDays);

    // Adjust date calculation for system-specific integration
    let adjustedYear = dateInfo.year;
    let adjustedMonth = dateInfo.month;
    let adjustedDay = dateInfo.day;
    let adjustedWeekday = dateInfo.weekday;

    if (worldCreationTimestamp !== undefined) {
      const currentSystem = game.system?.id;
      if (currentSystem) {
        try {
          // Check if system provides a base date mapping (real-world date to calendar date)
          const systemBaseDate = compatibilityManager.getSystemData<{
            year: number;
            month: number;
            day: number;
            hour?: number;
            minute?: number;
            second?: number;
          }>(currentSystem, 'systemBaseDate');

          if (systemBaseDate) {
            // Use system-provided base date calculation
            const baseDate = new CalendarDate(
              {
                year: systemBaseDate.year,
                month: systemBaseDate.month,
                day: systemBaseDate.day,
                weekday: 0, // Will be calculated
                time: {
                  hour: systemBaseDate.hour || 0,
                  minute: systemBaseDate.minute || 0,
                  second: systemBaseDate.second || 0,
                },
              },
              this.calendar
            );

            // Convert base date to total seconds
            const baseSeconds = this.dateToWorldTime(baseDate);

            // Add worldTime progression to get final date
            const finalSeconds = baseSeconds + worldTime;
            const finalTotalDays = Math.floor(finalSeconds / secondsPerDay);
            const finalDateInfo = this.daysToDate(finalTotalDays);

            // Use the system-calculated date
            adjustedYear = finalDateInfo.year;
            adjustedMonth = finalDateInfo.month;
            adjustedDay = finalDateInfo.day;
            adjustedWeekday = finalDateInfo.weekday;

            // Recalculate seconds in day for the final date
            secondsInDay = Math.floor(finalSeconds % secondsPerDay);
            if (secondsInDay < 0) {
              secondsInDay += secondsPerDay;
            }

            // Recalculate time components from updated secondsInDay
            hour = Math.floor(secondsInDay / secondsPerHour);
            minute = Math.floor(
              (secondsInDay % secondsPerHour) / this.calendar.time.secondsInMinute
            );
            second = secondsInDay % this.calendar.time.secondsInMinute;

            // Update normalized time values
            normalizedHour = hour === 0 ? 0 : hour;
            normalizedMinute = minute === 0 ? 0 : minute;
            normalizedSecond = second === 0 ? 0 : second;
          } else {
            // Fallback: use calendar's currentYear if no base date mapping
            adjustedYear = this.calendar.year?.currentYear || this.calendar.year?.epoch || 0;
          }
        } catch {
          // If integration fails, fall back to normal calculation
          adjustedYear = dateInfo.year;
        }
      }
    }

    const dateData: CalendarDateData = {
      year: adjustedYear,
      month: adjustedMonth,
      day: adjustedDay,
      weekday: adjustedWeekday,
      intercalary: dateInfo.intercalary,
      time: { hour: normalizedHour, minute: normalizedMinute, second: normalizedSecond },
    };

    return new CalendarDate(dateData, this.calendar);
  }

  /**
   * Convert calendar date to Foundry world time (seconds)
   * Handles both interpretation modes
   */
  dateToWorldTime(date: CalendarDate, worldCreationTimestamp?: number): number {
    // When world creation timestamp is provided, we need to reverse the world creation calculation
    let adjustedDate = date;
    if (worldCreationTimestamp !== undefined) {
      const worldCreationDate = new Date(worldCreationTimestamp * 1000);
      const worldCreationYear = worldCreationDate.getUTCFullYear();
      const calendarEpoch = this.calendar.year?.epoch || 0;
      const baseYear = worldCreationYear + calendarEpoch;

      // Calculate how many years have passed since the base year
      const yearsDifference = date.year - baseYear;

      // Convert the date to use epoch-based year calculation
      adjustedDate = new CalendarDate(
        {
          year: this.calendar.year?.epoch + yearsDifference,
          month: date.month,
          day: date.day,
          weekday: date.weekday,
          intercalary: date.intercalary,
          time: date.time,
        },
        this.calendar
      );
    }

    const totalDays = this.dateToDays(adjustedDate);
    const secondsPerDay = CalendarTimeUtils.getSecondsPerDay(this.calendar);

    let totalSeconds = totalDays * secondsPerDay;

    // Add time of day if provided
    if (adjustedDate.time) {
      const secondsPerHour = CalendarTimeUtils.getSecondsPerHour(this.calendar);
      totalSeconds += adjustedDate.time.hour * secondsPerHour;
      totalSeconds += adjustedDate.time.minute * this.calendar.time.secondsInMinute;
      totalSeconds += adjustedDate.time.second;
    }

    return this.adjustWorldTimeFromInterpretation(totalSeconds);
  }

  /**
   * Add days to a calendar date
   */
  addDays(date: CalendarDate, days: number): CalendarDate {
    const totalDays = this.dateToDays(date) + days;
    const newDate = this.daysToDate(totalDays);

    // Preserve time if it exists
    if (date.time) {
      newDate.time = { ...date.time };
    }

    return newDate;
  }

  /**
   * Add months to a calendar date
   */
  addMonths(date: CalendarDate, months: number): CalendarDate {
    const { month: targetMonth, year: targetYear } = CalendarTimeUtils.normalizeMonth(
      date.month + months,
      date.year,
      this.calendar
    );

    // Adjust day if target month is shorter
    const targetMonthDays = this.getMonthLength(targetMonth, targetYear);
    const targetDay = Math.min(date.day, targetMonthDays);

    const dateData: CalendarDateData = {
      year: targetYear,
      month: targetMonth,
      day: targetDay,
      weekday: this.calculateWeekday(targetYear, targetMonth, targetDay),
      time: date.time ? { ...date.time } : undefined,
    };

    return new CalendarDate(dateData, this.calendar);
  }

  /**
   * Add years to a calendar date
   */
  addYears(date: CalendarDate, years: number): CalendarDate {
    const targetYear = date.year + years;

    // Handle leap year day adjustments
    const targetMonthDays = this.getMonthLength(date.month, targetYear);
    const targetDay = Math.min(date.day, targetMonthDays);

    const dateData: CalendarDateData = {
      year: targetYear,
      month: date.month,
      day: targetDay,
      weekday: this.calculateWeekday(targetYear, date.month, targetDay),
      time: date.time ? { ...date.time } : undefined,
    };

    return new CalendarDate(dateData, this.calendar);
  }

  /**
   * Add hours to a calendar date
   */
  addHours(date: CalendarDate, hours: number): CalendarDate {
    const currentTime = date.time || { hour: 0, minute: 0, second: 0 };
    const totalHours = currentTime.hour + hours;

    const hoursPerDay = this.calendar.time.hoursInDay;
    let extraDays = Math.floor(totalHours / hoursPerDay);
    let newHour = totalHours % hoursPerDay;

    // Handle negative hours
    if (newHour < 0) {
      newHour += hoursPerDay;
      extraDays -= 1;
    }

    const baseData: CalendarDateData = {
      year: date.year,
      month: date.month,
      day: date.day,
      weekday: date.weekday,
      intercalary: date.intercalary,
      time: {
        hour: newHour,
        minute: currentTime.minute,
        second: currentTime.second,
      },
    };

    let result = new CalendarDate(baseData, this.calendar);

    // Add extra days if needed
    if (extraDays !== 0) {
      result = this.addDays(result, extraDays);
    }

    return result;
  }

  /**
   * Add minutes to a calendar date
   */
  addMinutes(date: CalendarDate, minutes: number): CalendarDate {
    const currentTime = date.time || { hour: 0, minute: 0, second: 0 };
    const totalMinutes = currentTime.minute + minutes;

    const minutesPerHour = this.calendar.time.minutesInHour;
    let extraHours = Math.floor(totalMinutes / minutesPerHour);
    let newMinute = totalMinutes % minutesPerHour;

    // Handle negative minutes
    if (newMinute < 0) {
      newMinute += minutesPerHour;
      extraHours -= 1;
    }

    const baseData: CalendarDateData = {
      year: date.year,
      month: date.month,
      day: date.day,
      weekday: date.weekday,
      intercalary: date.intercalary,
      time: {
        hour: currentTime.hour,
        minute: newMinute,
        second: currentTime.second,
      },
    };

    let result = new CalendarDate(baseData, this.calendar);

    // Add extra hours if needed
    if (extraHours !== 0) {
      result = this.addHours(result, extraHours);
    }

    return result;
  }

  /**
   * Adjust worldTime based on calendar's interpretation mode
   */
  private adjustWorldTimeForInterpretation(worldTime: number): number {
    const worldTimeConfig = this.calendar.worldTime;

    if (!worldTimeConfig || worldTimeConfig.interpretation === 'epoch-based') {
      // Default behavior: worldTime represents seconds since calendar epoch
      return worldTime;
    }

    if (worldTimeConfig.interpretation === 'real-time-based') {
      // Real-time mode: worldTime=0 should map to currentYear, not epochYear
      const yearDifference = worldTimeConfig.currentYear - worldTimeConfig.epochYear;

      // Use accurate year lengths instead of 365.25 average
      let epochOffset = 0;
      const secondsPerDay =
        this.calendar.time.hoursInDay *
        this.calendar.time.minutesInHour *
        this.calendar.time.secondsInMinute;

      if (yearDifference > 0) {
        // Add up actual year lengths from epoch to current year
        for (let year = worldTimeConfig.epochYear; year < worldTimeConfig.currentYear; year++) {
          const yearLengthDays = this.getYearLength(year);
          epochOffset += yearLengthDays * secondsPerDay;
        }
      } else if (yearDifference < 0) {
        // Subtract actual year lengths from current year to epoch
        for (let year = worldTimeConfig.currentYear; year < worldTimeConfig.epochYear; year++) {
          const yearLengthDays = this.getYearLength(year);
          epochOffset -= yearLengthDays * secondsPerDay;
        }
      }

      return worldTime + epochOffset;
    }

    // Unknown interpretation mode: return worldTime unchanged (fallback behavior)
    return worldTime;
  }

  /**
   * Convert internal seconds back to worldTime based on interpretation mode
   */
  private adjustWorldTimeFromInterpretation(internalSeconds: number): number {
    const worldTimeConfig = this.calendar.worldTime;

    if (!worldTimeConfig || worldTimeConfig.interpretation === 'epoch-based') {
      return internalSeconds;
    }

    if (worldTimeConfig.interpretation === 'real-time-based') {
      const yearDifference = worldTimeConfig.currentYear - worldTimeConfig.epochYear;

      // Use accurate year lengths instead of 365.25 average
      let epochOffset = 0;
      const secondsPerDay =
        this.calendar.time.hoursInDay *
        this.calendar.time.minutesInHour *
        this.calendar.time.secondsInMinute;

      if (yearDifference > 0) {
        // Add up actual year lengths from epoch to current year
        for (let year = worldTimeConfig.epochYear; year < worldTimeConfig.currentYear; year++) {
          const yearLengthDays = this.getYearLength(year);
          epochOffset += yearLengthDays * secondsPerDay;
        }
      } else if (yearDifference < 0) {
        // Subtract actual year lengths from current year to epoch
        for (let year = worldTimeConfig.currentYear; year < worldTimeConfig.epochYear; year++) {
          const yearLengthDays = this.getYearLength(year);
          epochOffset -= yearLengthDays * secondsPerDay;
        }
      }

      return internalSeconds - epochOffset;
    }

    return internalSeconds;
  }

  /**
   * Convert days since epoch to calendar date
   */
  private daysToDate(totalDays: number): CalendarDate {
    let year = this.calendar.year.epoch;
    let remainingDays = totalDays;

    // Find the correct year
    while (remainingDays >= this.getYearLength(year)) {
      remainingDays -= this.getYearLength(year);
      year++;
    }

    // Handle negative days (before epoch)
    while (remainingDays < 0) {
      year--;
      remainingDays += this.getYearLength(year);
    }

    // Find month and day within the year
    let month = 1;
    const monthLengths = this.getMonthLengths(year);
    const intercalaryDays = this.getIntercalaryDays(year);

    for (month = 1; month <= this.calendar.months.length; month++) {
      const monthLength = monthLengths[month - 1];

      if (remainingDays < monthLength) {
        break;
      }

      remainingDays -= monthLength;

      // Check for intercalary days after this month
      const currentMonthName = this.calendar.months[month - 1]?.name;
      const intercalaryAfterMonth = currentMonthName
        ? intercalaryDays.filter(i => i.after === currentMonthName)
        : [];

      for (const intercalary of intercalaryAfterMonth) {
        const intercalaryDayCount = intercalary.days || 1;

        if (remainingDays < intercalaryDayCount) {
          // We're within this intercalary period - return intercalary date with no weekday calculation
          const dateData: CalendarDateData = {
            year,
            month,
            day: remainingDays + 1, // Intercalary day index (1-based)
            weekday: 0, // Placeholder - intercalary days don't have weekdays
            intercalary: intercalary.name,
          };

          return new CalendarDate(dateData, this.calendar);
        }

        remainingDays -= intercalaryDayCount;
      }
    }

    const day = remainingDays + 1;

    const dateData: CalendarDateData = {
      year,
      month,
      day,
      weekday: this.calculateWeekday(year, month, day),
    };

    return new CalendarDate(dateData, this.calendar);
  }

  /**
   * Convert calendar date to days since epoch
   */
  private dateToDays(date: CalendarDate): number {
    let totalDays = 0;

    // Handle years before or after epoch
    if (date.year >= this.calendar.year.epoch) {
      // Add days for complete years after epoch
      for (let year = this.calendar.year.epoch; year < date.year; year++) {
        totalDays += this.getYearLength(year);
      }
    } else {
      // Subtract days for complete years before epoch
      for (let year = date.year; year < this.calendar.year.epoch; year++) {
        totalDays -= this.getYearLength(year);
      }
    }

    // Add days for complete months in the target year
    const monthLengths = this.getMonthLengths(date.year);
    const intercalaryDays = this.getIntercalaryDays(date.year);

    for (let month = 1; month < date.month; month++) {
      totalDays += monthLengths[month - 1];

      // Add intercalary days after this month
      const currentMonthName = this.calendar.months[month - 1]?.name;
      const intercalaryAfterMonth = currentMonthName
        ? intercalaryDays.filter(i => i.after === currentMonthName)
        : [];
      // Sum up all days from intercalary periods (using days field, defaulting to 1)
      totalDays += intercalaryAfterMonth.reduce((sum, intercalary) => {
        return sum + (intercalary.days || 1);
      }, 0);
    }

    // Handle intercalary vs regular days
    if (date.intercalary) {
      // For intercalary dates, add all days of the target month, then the intercalary day position
      totalDays += monthLengths[date.month - 1]; // All days of the month
      totalDays += date.day - 1; // Position within the intercalary period (0-based)
    } else {
      // For regular dates, add days within the target month
      totalDays += date.day - 1;
    }

    return totalDays;
  }

  /**
   * Calculate weekday for a given date
   */
  calculateWeekday(year: number, month: number, day: number): number {
    const tempDateData: CalendarDateData = { year, month, day, weekday: 0 };
    const tempDate = new CalendarDate(tempDateData, this.calendar);
    const weekdayContributingDays = this.dateToWeekdayDays(tempDate);
    const weekdayCount = this.calendar.weekdays.length;
    const epochWeekday = this.calendar.year.startDay;

    // Calculate weekday: (days since epoch + weekday of epoch date) % weekday count
    // Handle negative results for dates before epoch
    let weekday = (weekdayContributingDays + epochWeekday) % weekdayCount;
    if (weekday < 0) {
      weekday += weekdayCount;
    }

    // Apply system compatibility adjustments
    weekday = compatibilityManager.applyWeekdayAdjustment(weekday, this.calendar);

    return weekday;
  }

  /**
   * Convert calendar date to days since epoch, counting only weekday-contributing days
   */
  private dateToWeekdayDays(date: CalendarDate): number {
    let totalDays = 0;

    // Handle years before or after epoch
    if (date.year >= this.calendar.year.epoch) {
      // Add days for complete years after epoch
      for (let year = this.calendar.year.epoch; year < date.year; year++) {
        totalDays += this.getYearWeekdayDays(year);
      }
    } else {
      // Subtract days for complete years before epoch
      for (let year = date.year; year < this.calendar.year.epoch; year++) {
        totalDays -= this.getYearWeekdayDays(year);
      }
    }

    // Add days for complete months in the target year
    const monthLengths = this.getMonthLengths(date.year);
    const intercalaryDays = this.getIntercalaryDays(date.year);

    for (let month = 1; month < date.month; month++) {
      totalDays += monthLengths[month - 1];

      // Add only weekday-contributing intercalary days after this month
      const currentMonthName = this.calendar.months[month - 1]?.name;
      const intercalaryAfterMonth = currentMonthName
        ? intercalaryDays.filter(i => i.after === currentMonthName)
        : [];

      intercalaryAfterMonth.forEach(intercalary => {
        const countsForWeekdays = intercalary.countsForWeekdays ?? true;
        if (countsForWeekdays) {
          totalDays += intercalary.days || 1;
        }
      });
    }

    // Add days in the target month
    totalDays += date.day - 1;

    // Handle intercalary days - they don't contribute to weekday counts
    if (date.intercalary) {
      // Don't add anything for intercalary days as they don't advance weekdays
    }

    return totalDays;
  }

  /**
   * Get the number of weekday-contributing days in a year
   */
  private getYearWeekdayDays(year: number): number {
    const monthLengths = this.getMonthLengths(year);
    const intercalaryDays = this.getIntercalaryDays(year);

    let totalDays = monthLengths.reduce((sum, days) => sum + days, 0);

    // Add only weekday-contributing intercalary days
    intercalaryDays.forEach(intercalary => {
      const countsForWeekdays = intercalary.countsForWeekdays ?? true;
      if (countsForWeekdays) {
        totalDays += intercalary.days || 1;
      }
    });

    return totalDays;
  }

  /**
   * Get the length of a specific year in days
   */
  getYearLength(year: number): number {
    const monthLengths = this.getMonthLengths(year);
    const baseLength = monthLengths.reduce((sum, length) => sum + length, 0);
    const intercalaryDays = this.getIntercalaryDays(year);

    // Sum up all intercalary days, using the days field (defaulting to 1 for backward compatibility)
    const totalIntercalaryDays = intercalaryDays.reduce((sum, intercalary) => {
      return sum + (intercalary.days || 1);
    }, 0);

    return baseLength + totalIntercalaryDays;
  }

  /**
   * Get month lengths for a specific year (accounting for leap years)
   */
  private getMonthLengths(year: number): number[] {
    const monthLengths = this.calendar.months.map(month => month.days);

    // Add leap year days if applicable
    if (this.isLeapYear(year) && this.calendar.leapYear.month) {
      const leapMonthIndex = this.calendar.months.findIndex(
        month => month.name === this.calendar.leapYear.month
      );

      if (leapMonthIndex >= 0) {
        monthLengths[leapMonthIndex] += this.calendar.leapYear.extraDays || 1;
      }
    }

    return monthLengths;
  }

  /**
   * Get length of a specific month in a specific year
   */
  getMonthLength(month: number, year: number): number {
    const monthLengths = this.getMonthLengths(year);
    return monthLengths[month - 1] || 0;
  }

  /**
   * Get intercalary days that come after a specific month
   */
  getIntercalaryDaysAfterMonth(year: number, month: number): CalendarIntercalary[] {
    const intercalaryDays = this.getIntercalaryDays(year);
    const monthName = this.calendar.months[month - 1]?.name;

    if (!monthName) return [];

    return intercalaryDays.filter(intercalary => intercalary.after === monthName);
  }

  /**
   * Get intercalary days for a specific year
   */
  private getIntercalaryDays(year: number): CalendarIntercalary[] {
    return this.calendar.intercalary.filter(intercalary => {
      if (intercalary.leapYearOnly) {
        return this.isLeapYear(year);
      }
      return true;
    });
  }

  /**
   * Check if a year is a leap year
   */
  private isLeapYear(year: number): boolean {
    const { rule, interval } = this.calendar.leapYear;

    switch (rule) {
      case 'none':
        return false;

      case 'gregorian':
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

      case 'custom':
        return interval ? year % interval === 0 : false;

      default:
        return false;
    }
  }

  /**
   * Precompute year data for performance
   */
  private precomputeYearData(): void {
    const currentYear = this.calendar.year.currentYear;

    // Cache calculations for nearby years
    for (let year = currentYear - 10; year <= currentYear + 10; year++) {
      const cacheKey = `year-${year}`;

      if (!this.calculationCache.has(cacheKey)) {
        const calculation: CalendarCalculation = {
          totalDays: this.getYearLength(year),
          weekdayIndex: 0, // Will be calculated when needed
          yearLength: this.getYearLength(year),
          monthLengths: this.getMonthLengths(year),
          intercalaryDays: this.getIntercalaryDays(year),
        };

        this.calculationCache.set(cacheKey, calculation);
      }
    }
  }

  /**
   * Update the calendar configuration
   */
  updateCalendar(calendar: SeasonsStarsCalendar): void {
    this.calendar = calendar;
    this.calculationCache.clear();
    this.precomputeYearData();
  }

  /**
   * Get the current calendar configuration
   */
  getCalendar(): SeasonsStarsCalendar {
    return { ...this.calendar };
  }
}
