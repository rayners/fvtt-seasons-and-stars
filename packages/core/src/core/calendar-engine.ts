/**
 * Core calendar calculation engine for Seasons & Stars
 */

import type {
  SeasonsStarsCalendar,
  CalendarDateData,
  CalendarCalculation,
  CalendarIntercalary,
  CalendarMoon,
  MoonPhaseInfo,
  CalendarWeek,
} from '../types/calendar';
import { CalendarDate } from './calendar-date';
import { CalendarTimeUtils } from './calendar-time-utils';
import { compatibilityManager } from './compatibility-manager';
import { Logger } from './logger';
import { GREGORIAN_DEFAULTS } from './gregorian-defaults';

export class CalendarEngine {
  private calendar: SeasonsStarsCalendar;
  private calculationCache: Map<string, CalendarCalculation> = new Map();

  constructor(calendar: SeasonsStarsCalendar) {
    this.calendar = CalendarEngine.applyGregorianDefaults(calendar);
    this.precomputeYearData();
  }

  private static applyGregorianDefaults(calendar: SeasonsStarsCalendar): SeasonsStarsCalendar {
    const defaults = GREGORIAN_DEFAULTS;

    const mergedLeapYear =
      calendar.leapYear === undefined
        ? defaults.leapYear
        : calendar.leapYear.rule === 'none'
          ? { rule: 'none' }
          : { ...defaults.leapYear, ...calendar.leapYear };

    const merged: SeasonsStarsCalendar = {
      ...calendar,
      year: calendar.year === undefined ? defaults.year : { ...defaults.year, ...calendar.year },
      leapYear: mergedLeapYear,
      time: calendar.time === undefined ? defaults.time : { ...defaults.time, ...calendar.time },
      months: calendar.months ?? defaults.months,
      weekdays: calendar.weekdays ?? defaults.weekdays,
      intercalary: calendar.intercalary ?? defaults.intercalary,
    } as SeasonsStarsCalendar;

    if (!calendar.year)
      Logger.warn(`Calendar ${calendar.id} missing year data; using Gregorian defaults`);
    if (!calendar.leapYear)
      Logger.warn(`Calendar ${calendar.id} missing leapYear data; using Gregorian defaults`);
    if (!calendar.months)
      Logger.warn(`Calendar ${calendar.id} missing months data; using Gregorian defaults`);
    if (!calendar.weekdays)
      Logger.warn(`Calendar ${calendar.id} missing weekdays data; using Gregorian defaults`);
    if (!calendar.intercalary)
      Logger.warn(`Calendar ${calendar.id} missing intercalary data; using Gregorian defaults`);
    if (!calendar.time)
      Logger.warn(`Calendar ${calendar.id} missing time data; using Gregorian defaults`);

    return merged;
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
      // Use PF2e-style calculation: real-world world creation date maps to calendar date
      const worldCreationDate = new Date(worldCreationTimestamp * 1000);

      // Handle invalid timestamps
      if (isNaN(worldCreationDate.getTime())) {
        // Return invalid date with NaN year
        adjustedYear = NaN;
        adjustedMonth = dateInfo.month;
        adjustedDay = dateInfo.day;
        adjustedWeekday = dateInfo.weekday;
      } else {
        const epochYear = this.calendar.year?.epoch || 0;

        // Calculate calendar year from real-world year + epoch offset
        const realWorldYear = worldCreationDate.getUTCFullYear();
        const calendarBaseYear = realWorldYear + epochYear;

        // Calculate the base date: world creation timestamp = calendar base year on exact creation date
        const baseCalendarDate = new CalendarDate(
          {
            year: calendarBaseYear,
            month: worldCreationDate.getUTCMonth() + 1, // 1-based
            day: worldCreationDate.getUTCDate(),
            weekday: 0, // Will be calculated
            time: {
              hour: worldCreationDate.getUTCHours(),
              minute: worldCreationDate.getUTCMinutes(),
              second: worldCreationDate.getUTCSeconds(),
            },
          },
          this.calendar
        );

        // Calculate base world time using epoch-based calculation (no recursion)
        const baseTotalDays = this.dateToDays(baseCalendarDate);
        const baseTimeOfDay =
          (baseCalendarDate.time?.hour || 0) * secondsPerHour +
          (baseCalendarDate.time?.minute || 0) * this.calendar.time.secondsInMinute +
          (baseCalendarDate.time?.second || 0);
        const baseWorldTime = baseTotalDays * secondsPerDay + baseTimeOfDay;

        // Add the elapsed world time to get the final calendar date
        const totalWorldTime = baseWorldTime + worldTime;
        const finalTotalDays = Math.floor(totalWorldTime / secondsPerDay);
        const finalDateInfo = this.daysToDate(finalTotalDays);

        // Use the calculated date
        adjustedYear = finalDateInfo.year;
        adjustedMonth = finalDateInfo.month;
        adjustedDay = finalDateInfo.day;
        adjustedWeekday = finalDateInfo.weekday;

        // Recalculate seconds in day for the final date
        secondsInDay = Math.floor(totalWorldTime % secondsPerDay);
        if (secondsInDay < 0) {
          secondsInDay += secondsPerDay;
        }

        // Recalculate time components from updated secondsInDay
        hour = Math.floor(secondsInDay / secondsPerHour);
        minute = Math.floor((secondsInDay % secondsPerHour) / this.calendar.time.secondsInMinute);
        second = secondsInDay % this.calendar.time.secondsInMinute;

        // Update normalized time values
        normalizedHour = hour === 0 ? 0 : hour;
        normalizedMinute = minute === 0 ? 0 : minute;
        normalizedSecond = second === 0 ? 0 : second;
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
    const adjustedDate = date;
    if (worldCreationTimestamp !== undefined) {
      const worldCreationDate = new Date(worldCreationTimestamp * 1000);
      const epochYear = this.calendar.year?.epoch || 0;

      // Calculate the calendar base year from real-world year + epoch offset
      const realWorldYear = worldCreationDate.getUTCFullYear();
      const calendarBaseYear = realWorldYear + epochYear;

      // Calculate the base date: world creation timestamp = calendar base year on exact creation date/time
      const baseCalendarDate = new CalendarDate(
        {
          year: calendarBaseYear,
          month: worldCreationDate.getUTCMonth() + 1, // 1-based
          day: worldCreationDate.getUTCDate(),
          weekday: 0, // Will be calculated
          time: {
            hour: worldCreationDate.getUTCHours(),
            minute: worldCreationDate.getUTCMinutes(),
            second: worldCreationDate.getUTCSeconds(),
          },
        },
        this.calendar
      );

      // Calculate the difference from the base date to input date
      const baseWorldTime =
        this.dateToDays(baseCalendarDate) * CalendarTimeUtils.getSecondsPerDay(this.calendar);
      const baseTimeOfDay =
        (baseCalendarDate.time?.hour || 0) * CalendarTimeUtils.getSecondsPerHour(this.calendar) +
        (baseCalendarDate.time?.minute || 0) * this.calendar.time.secondsInMinute +
        (baseCalendarDate.time?.second || 0);
      const totalBaseWorldTime = baseWorldTime + baseTimeOfDay;

      const inputWorldTime =
        this.dateToDays(date) * CalendarTimeUtils.getSecondsPerDay(this.calendar);
      const inputTimeOfDay =
        (date.time?.hour || 0) * CalendarTimeUtils.getSecondsPerHour(this.calendar) +
        (date.time?.minute || 0) * this.calendar.time.secondsInMinute +
        (date.time?.second || 0);
      const totalInputWorldTime = inputWorldTime + inputTimeOfDay;

      // The world time is the difference from the base
      return totalInputWorldTime - totalBaseWorldTime;
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
      const currentMonthName = this.calendar.months[month - 1]?.name;

      // Check for intercalary days before this month
      const intercalaryBeforeMonth = currentMonthName
        ? intercalaryDays.filter(i => i.before === currentMonthName)
        : [];

      for (const intercalary of intercalaryBeforeMonth) {
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

      const monthLength = monthLengths[month - 1];

      if (remainingDays < monthLength) {
        break;
      }

      remainingDays -= monthLength;

      // Check for intercalary days after this month
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
      const currentMonthName = this.calendar.months[month - 1]?.name;

      // Add intercalary days before this month
      const intercalaryBeforeMonth = currentMonthName
        ? intercalaryDays.filter(i => i.before === currentMonthName)
        : [];
      totalDays += intercalaryBeforeMonth.reduce((sum, intercalary) => {
        return sum + (intercalary.days || 1);
      }, 0);

      totalDays += monthLengths[month - 1];

      // Add intercalary days after this month
      const intercalaryAfterMonth = currentMonthName
        ? intercalaryDays.filter(i => i.after === currentMonthName)
        : [];
      totalDays += intercalaryAfterMonth.reduce((sum, intercalary) => {
        return sum + (intercalary.days || 1);
      }, 0);
    }

    // Add intercalary days before the current month (only for regular dates)
    if (!date.intercalary) {
      const currentMonthName = this.calendar.months[date.month - 1]?.name;
      const intercalaryBeforeCurrentMonth = currentMonthName
        ? intercalaryDays.filter(i => i.before === currentMonthName)
        : [];
      totalDays += intercalaryBeforeCurrentMonth.reduce((sum, intercalary) => {
        return sum + (intercalary.days || 1);
      }, 0);
    }

    // Handle intercalary vs regular days
    if (date.intercalary) {
      // For intercalary dates, we need to handle year-boundary cases specially

      // Find the intercalary day definition to understand its placement
      const intercalaryDef = this.calendar.intercalary.find(i => i.name === date.intercalary);

      if (intercalaryDef) {
        if (intercalaryDef.after) {
          // Handle "after" intercalary days (existing logic)
          const afterMonthIndex = this.calendar.months.findIndex(
            m => m.name === intercalaryDef.after
          );

          if (afterMonthIndex >= 0) {
            const afterMonth = afterMonthIndex + 1; // Convert to 1-based

            // Check if this is a year-boundary intercalary day
            // (comes after last month of previous year)
            const isYearBoundary =
              afterMonth === this.calendar.months.length && date.month === afterMonth;

            if (isYearBoundary) {
              // Year-boundary intercalary: should come immediately after the last month
              // of the PREVIOUS year, not after a full additional year

              // Subtract the full year we added above (since it belongs to previous year's end)
              totalDays -= this.getYearLength(date.year);

              // Add all days of the month it comes after (from previous year)
              const previousYearMonthLengths = this.getMonthLengths(date.year - 1);
              totalDays += previousYearMonthLengths[afterMonth - 1]; // Month from previous year

              // Add the intercalary day position
              totalDays += date.day - 1; // Position within the intercalary period (0-based)
            } else {
              // Regular intercalary day after a month within a year
              // First, add any intercalary days that come before the month it comes after
              const currentMonthName = this.calendar.months[date.month - 1]?.name;
              const intercalaryBeforeCurrentMonth = currentMonthName
                ? intercalaryDays.filter(i => i.before === currentMonthName)
                : [];
              totalDays += intercalaryBeforeCurrentMonth.reduce((sum, intercalary) => {
                return sum + (intercalary.days || 1);
              }, 0);

              totalDays += monthLengths[date.month - 1]; // All days of the month it comes after
              totalDays += date.day - 1; // Position within the intercalary period (0-based)
            }
          } else {
            // Fallback: intercalary day with invalid "after" month
            totalDays += date.day - 1; // Position within the intercalary period (0-based)
          }
        } else if (intercalaryDef.before) {
          // Handle "before" intercalary days (new logic)
          const beforeMonthIndex = this.calendar.months.findIndex(
            m => m.name === intercalaryDef.before
          );

          if (beforeMonthIndex >= 0) {
            const beforeMonth = beforeMonthIndex + 1; // Convert to 1-based

            // Check if this is a year-boundary intercalary day
            // (comes before first month but is associated with current year)
            const isYearBoundary =
              beforeMonth === 1 &&
              date.month === beforeMonth &&
              date.year > this.calendar.year.epoch;

            if (isYearBoundary) {
              // Year-boundary intercalary: should come immediately before the first month
              // We don't need to add the full year since we're at the start

              // Add the intercalary day position (no month days to add)
              totalDays += date.day - 1; // Position within the intercalary period (0-based)
            } else {
              // Regular intercalary day before a month within a year
              // For "before" intercalary, we don't add the month's days since we come before it
              totalDays += date.day - 1; // Position within the intercalary period (0-based)
            }
          } else {
            // Fallback: intercalary day with invalid "before" month
            totalDays += date.day - 1; // Position within the intercalary period (0-based)
          }
        }
      } else {
        // Fallback: intercalary day not found in calendar definition
        totalDays += date.day - 1; // Position within the intercalary period (0-based)
      }
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
      const currentMonthName = this.calendar.months[month - 1]?.name;

      // Add only weekday-contributing intercalary days before this month
      const intercalaryBeforeMonth = currentMonthName
        ? intercalaryDays.filter(i => i.before === currentMonthName)
        : [];

      intercalaryBeforeMonth.forEach(intercalary => {
        const countsForWeekdays = intercalary.countsForWeekdays ?? true;
        if (countsForWeekdays) {
          totalDays += intercalary.days || 1;
        }
      });

      totalDays += monthLengths[month - 1];

      // Add only weekday-contributing intercalary days after this month
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
  getMonthLengths(year: number): number[] {
    const monthLengths = this.calendar.months.map(month => month.days);

    // Add or remove leap year days if applicable
    if (this.isLeapYear(year) && this.calendar.leapYear?.month) {
      const leapMonthIndex = this.calendar.months.findIndex(
        month => month.name === this.calendar.leapYear!.month
      );

      if (leapMonthIndex >= 0) {
        // extraDays can be positive (add days) or negative (remove days)
        // Default to +1 for backward compatibility
        const dayAdjustment = this.calendar.leapYear!.extraDays ?? 1;
        monthLengths[leapMonthIndex] += dayAdjustment;

        // Ensure month length doesn't go below 1
        if (monthLengths[leapMonthIndex] < 1) {
          Logger.warn(
            `Calendar ${this.calendar.id}: Month "${this.calendar.leapYear!.month}" clamped to 1 day (was ${monthLengths[leapMonthIndex]})`
          );
          monthLengths[leapMonthIndex] = 1;
        }
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
   * Get intercalary days that come before a specific month
   */
  getIntercalaryDaysBeforeMonth(year: number, month: number): CalendarIntercalary[] {
    const intercalaryDays = this.getIntercalaryDays(year);
    const monthName = this.calendar.months[month - 1]?.name;

    if (!monthName) return [];

    return intercalaryDays.filter(intercalary => intercalary.before === monthName);
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
  isLeapYear(year: number): boolean {
    const leapYear = this.calendar.leapYear;
    if (!leapYear) return false;

    const { rule, interval, offset = 0 } = leapYear;

    switch (rule) {
      case 'none':
        return false;

      case 'gregorian':
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

      case 'custom': {
        if (!interval) return false;
        const normalizedYear = year - offset;
        const remainder = normalizedYear % interval;
        // Check if the year is divisible by the interval.
        // For negative remainders, we need to normalize them to positive values.
        return remainder === 0 || (remainder < 0 && remainder + interval === 0);
      }

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

  /**
   * Get the week number within the current month (1-indexed)
   *
   * Returns null if:
   * - Calendar has no weeks configuration
   * - Date falls on a remainder day with handling set to "none"
   * - Week configuration is year-based (use getWeekOfYear instead)
   *
   * @param date - The calendar date
   * @returns Week number (1-based) or null
   *
   * @example
   * // Roshar calendar: 10 weeks of 5 days each
   * getWeekOfMonth({ year: 1173, month: 1, day: 1 }) // returns 1
   * getWeekOfMonth({ year: 1173, month: 1, day: 25 }) // returns 5
   *
   * @example
   * // Coriolis calendar: 4 weeks of 9 days + 1 remainder (extend-last)
   * getWeekOfMonth({ year: 465, month: 1, day: 37 }) // returns 4 (extended)
   */
  getWeekOfMonth(date: CalendarDateData): number | null {
    if (!this.calendar.weeks) return null;

    // Year-based weeks span months, not supported by this method
    if (this.calendar.weeks.type === 'year-based') return null;

    const dayOfMonth = date.day;
    const daysPerWeek = this.calendar.weeks.daysPerWeek || this.calendar.weekdays.length;

    // Calculate raw week number (1-indexed)
    const rawWeek = Math.floor((dayOfMonth - 1) / daysPerWeek) + 1;

    // Check if we have a remainder
    const monthDays = this.getMonthLength(date.month, date.year);
    const remainder = monthDays % daysPerWeek;

    if (remainder === 0) {
      // Perfect alignment, no special handling needed
      return rawWeek;
    }

    // Handle remainder days
    const handling = this.calendar.weeks.remainderHandling || 'partial-last';
    const expectedWeeks = this.calendar.weeks.perMonth ?? Math.floor(monthDays / daysPerWeek);

    if (handling === 'extend-last' && rawWeek === expectedWeeks + 1) {
      // Fold extra days into the last named week
      return expectedWeeks;
    } else if (handling === 'none' && rawWeek > expectedWeeks) {
      // Remainder days have no week number
      return null;
    }

    return rawWeek;
  }

  /**
   * Get week information (name, abbreviation, etc.) for a date
   *
   * Returns null if:
   * - Calendar has no weeks configuration
   * - Week naming pattern is "none"
   * - Date falls on a remainder day with handling set to "none"
   *
   * @param date - The calendar date
   * @returns Week information or null
   *
   * @example
   * // Roshar calendar with Cosmere naming
   * getWeekInfo({ year: 1173, month: 1, day: 1 })
   * // returns { name: "First Week", abbreviation: "1st", suffix: "es" }
   *
   * @example
   * // Coriolis calendar with novena names
   * getWeekInfo({ year: 465, month: 1, day: 10 })
   * // returns { name: "The Novena of Water", abbreviation: "Water", description: "..." }
   */
  getWeekInfo(date: CalendarDateData): CalendarWeek | null {
    const weekNum = this.getWeekOfMonth(date);
    if (weekNum === null || !this.calendar.weeks) return null;

    // If explicit names are provided, use them
    if (this.calendar.weeks.names && this.calendar.weeks.names[weekNum - 1]) {
      return this.calendar.weeks.names[weekNum - 1];
    }

    // Auto-generate based on naming pattern
    const pattern = this.calendar.weeks.namingPattern || 'numeric';
    if (pattern === 'ordinal') {
      return {
        name: this.getOrdinalName(weekNum) + ' Week',
        abbreviation: weekNum.toString(),
      };
    } else if (pattern === 'numeric') {
      return {
        name: `Week ${weekNum}`,
        abbreviation: weekNum.toString(),
      };
    }

    // Pattern is "none" or undefined
    return null;
  }

  /**
   * Convert a number to its ordinal form (1st, 2nd, 3rd, etc.)
   * @private
   */
  private getOrdinalName(num: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  }

  /**
   * Get all moons for Simple Calendar bridge compatibility
   */
  getAllMoons(date?: CalendarDate): CalendarMoon[] | MoonPhaseInfo[] {
    const moons = this.calendar.moons || [];

    if (!date) {
      // Return raw moon definitions if no date provided (legacy behavior)
      return moons;
    }

    // Return calculated moon phases for the specified date
    return moons.map(moon => this.calculateMoonPhaseForDate(moon, date));
  }

  /**
   * Calculate moon phase information for a specific date
   */
  getMoonPhaseInfo(date: CalendarDate, moonName?: string): MoonPhaseInfo[] {
    const moons = this.calendar.moons;
    if (!moons || moons.length === 0) {
      return [];
    }

    const targetMoons = moonName ? moons.filter(m => m.name === moonName) : moons;
    return targetMoons.map(moon => this.calculateMoonPhaseForDate(moon, date));
  }

  /**
   * Calculate specific moon phase for a date
   */
  private calculateMoonPhaseForDate(moon: CalendarMoon, date: CalendarDate): MoonPhaseInfo {
    // Calculate days since reference new moon
    const referenceDate = new CalendarDate(
      {
        year: moon.firstNewMoon.year,
        month: moon.firstNewMoon.month,
        day: moon.firstNewMoon.day,
        weekday: 0, // Will be calculated
      },
      this.calendar
    );

    const daysSinceReference = this.dateToDays(date) - this.dateToDays(referenceDate);

    // Handle negative days (date before reference)
    const adjustedDays =
      daysSinceReference >= 0
        ? daysSinceReference
        : daysSinceReference +
          Math.ceil(Math.abs(daysSinceReference) / moon.cycleLength) * moon.cycleLength;

    // Calculate position in current cycle with tolerance for fractional lengths
    const cyclePositionRaw =
      ((adjustedDays % moon.cycleLength) + moon.cycleLength) % moon.cycleLength;
    const phaseBoundaryTolerance = 1e-6;

    let phaseStart = 0;
    let currentPhaseIndex = 0;

    for (let i = 0; i < moon.phases.length; i++) {
      const phase = moon.phases[i];
      const phaseEnd = phaseStart + phase.length;

      if (cyclePositionRaw < phaseEnd - phaseBoundaryTolerance || i === moon.phases.length - 1) {
        currentPhaseIndex = i;
        break;
      }

      phaseStart = phaseEnd;
    }

    const currentPhase = moon.phases[currentPhaseIndex];
    const rawDayInPhase = cyclePositionRaw - phaseStart;
    const normalizedDayInPhase = Math.max(this.normalizeFractionalValue(rawDayInPhase), 0);
    const phaseLength = currentPhase.length;
    const dayInPhaseExact = Math.min(normalizedDayInPhase, phaseLength);
    const rawDaysUntilNext = phaseLength - dayInPhaseExact;
    const daysUntilNextExact = Math.max(this.normalizeFractionalValue(rawDaysUntilNext), 0);
    const phaseProgress =
      phaseLength > 0 ? Math.min(Math.max(dayInPhaseExact / phaseLength, 0), 1) : 0;

    return {
      moon,
      phase: currentPhase,
      phaseIndex: currentPhaseIndex,
      dayInPhase: Math.floor(dayInPhaseExact),
      dayInPhaseExact,
      daysUntilNext: Math.max(Math.ceil(daysUntilNextExact), 0),
      daysUntilNextExact,
      phaseProgress,
    };
  }

  private normalizeFractionalValue(value: number): number {
    const precision = 1_000_000;
    const rounded = Math.round(value * precision) / precision;

    if (rounded === 0) {
      return 0;
    }

    if (!Number.isFinite(rounded)) {
      return 0;
    }

    return rounded;
  }

  /**
   * Get current moon phases based on world time
   */
  getCurrentMoonPhases(worldTime?: number): MoonPhaseInfo[] {
    const fallbackWorldTime =
      worldTime !== undefined
        ? worldTime
        : typeof game !== 'undefined' && game?.time?.worldTime
          ? game.time.worldTime
          : 0;

    const currentDate = this.worldTimeToDate(fallbackWorldTime);
    return this.getMoonPhaseInfo(currentDate);
  }

  /**
   * Calculate moon phase for a specific world time
   */
  getMoonPhaseAtWorldTime(worldTime: number, moonName?: string): MoonPhaseInfo[] {
    const date = this.worldTimeToDate(worldTime);
    return this.getMoonPhaseInfo(date, moonName);
  }
}
