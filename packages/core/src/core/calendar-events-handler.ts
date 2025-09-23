/**
 * Calendar Events Handler
 * Manages calendar events and their recurrence patterns
 */

import type {
  CalendarEvent,
  CalendarEventOccurrence,
  CalendarDateData,
  SeasonsStarsCalendar,
} from '../types/calendar';
import { CalendarEngine } from './calendar-engine';
import { Logger } from './logger';

export class CalendarEventsHandler {
  private events: Map<string, CalendarEvent>;
  private calendar: SeasonsStarsCalendar;
  private engine: CalendarEngine;

  constructor(calendar: SeasonsStarsCalendar, engine: CalendarEngine) {
    this.calendar = calendar;
    this.engine = engine;
    this.events = new Map();

    // Initialize with calendar events
    if (calendar.events) {
      for (const event of calendar.events) {
        this.events.set(event.id, event);
      }
    }
  }

  /**
   * Add a new event
   */
  addEvent(event: CalendarEvent): void {
    this.events.set(event.id, event);
  }

  /**
   * Remove an event
   */
  removeEvent(eventId: string): void {
    this.events.delete(eventId);
  }

  /**
   * Update an existing event
   */
  updateEvent(event: CalendarEvent): void {
    if (this.events.has(event.id)) {
      this.events.set(event.id, event);
    } else {
      Logger.warn(`Event ${event.id} not found for update`);
    }
  }

  /**
   * Merge external events
   */
  mergeExternalEvents(externalEvents: CalendarEvent[]): void {
    for (const event of externalEvents) {
      this.events.set(event.id, event);
    }
  }

  /**
   * Get events for a specific date
   */
  getEventsForDate(date: { year: number; month: number; day: number }): CalendarEvent[] {
    const events: CalendarEvent[] = [];

    for (const event of this.events.values()) {
      if (this.isEventOnDate(event, date)) {
        events.push(event);
      }
    }

    return events;
  }

  /**
   * Get all events for a specific month
   */
  getEventsForMonth(date: { year: number; month: number }): CalendarEventOccurrence[] {
    const occurrences: CalendarEventOccurrence[] = [];
    const daysInMonth = this.getDaysInMonth(date.year, date.month);

    for (let day = 1; day <= daysInMonth; day++) {
      const dateToCheck = { year: date.year, month: date.month, day };
      const eventsOnDate = this.getEventsForDate(dateToCheck);

      for (const event of eventsOnDate) {
        occurrences.push({
          event,
          year: date.year,
          month: date.month,
          day,
        });
      }
    }

    return occurrences;
  }

  /**
   * Get all events for a specific year
   */
  getEventsForYear(year: number): CalendarEventOccurrence[] {
    const occurrences: CalendarEventOccurrence[] = [];

    for (let month = 1; month <= this.calendar.months.length; month++) {
      const monthOccurrences = this.getEventsForMonth({ year, month });
      occurrences.push(...monthOccurrences);
    }

    return occurrences;
  }

  /**
   * Get next occurrence of an event
   */
  getNextEventOccurrence(
    eventId: string,
    currentDate: { year: number; month: number; day: number }
  ): CalendarDateData | undefined {
    const event = this.events.get(eventId);
    if (!event) return undefined;

    // Search forward up to 10 years
    const maxYearsToSearch = 10;
    let searchDate = { ...currentDate };

    // Start from the next day
    searchDate.day++;
    if (searchDate.day > this.getDaysInMonth(searchDate.year, searchDate.month)) {
      searchDate.day = 1;
      searchDate.month++;
      if (searchDate.month > this.calendar.months.length) {
        searchDate.month = 1;
        searchDate.year++;
      }
    }

    const endYear = currentDate.year + maxYearsToSearch;

    while (searchDate.year <= endYear) {
      if (this.isEventOnDate(event, searchDate)) {
        return {
          year: searchDate.year,
          month: searchDate.month,
          day: searchDate.day,
          weekday: this.getWeekday(searchDate),
        };
      }

      // Move to next day
      searchDate.day++;
      if (searchDate.day > this.getDaysInMonth(searchDate.year, searchDate.month)) {
        searchDate.day = 1;
        searchDate.month++;
        if (searchDate.month > this.calendar.months.length) {
          searchDate.month = 1;
          searchDate.year++;
        }
      }
    }

    return undefined;
  }

  /**
   * Get previous occurrence of an event
   */
  getPreviousEventOccurrence(
    eventId: string,
    currentDate: { year: number; month: number; day: number }
  ): CalendarDateData | undefined {
    const event = this.events.get(eventId);
    if (!event) return undefined;

    // Search backward up to 10 years
    const maxYearsToSearch = 10;
    let searchDate = { ...currentDate };

    // Start from the previous day
    searchDate.day--;
    if (searchDate.day < 1) {
      searchDate.month--;
      if (searchDate.month < 1) {
        searchDate.month = this.calendar.months.length;
        searchDate.year--;
      }
      searchDate.day = this.getDaysInMonth(searchDate.year, searchDate.month);
    }

    const endYear = currentDate.year - maxYearsToSearch;

    while (searchDate.year >= endYear) {
      if (this.isEventOnDate(event, searchDate)) {
        return {
          year: searchDate.year,
          month: searchDate.month,
          day: searchDate.day,
          weekday: this.getWeekday(searchDate),
        };
      }

      // Move to previous day
      searchDate.day--;
      if (searchDate.day < 1) {
        searchDate.month--;
        if (searchDate.month < 1) {
          searchDate.month = this.calendar.months.length;
          searchDate.year--;
        }
        searchDate.day = this.getDaysInMonth(searchDate.year, searchDate.month);
      }
    }

    return undefined;
  }

  /**
   * Check if an event occurs on a specific date
   */
  private isEventOnDate(
    event: CalendarEvent,
    date: { year: number; month: number; day: number }
  ): boolean {
    const recurrence = event.recurrence;

    switch (recurrence.type) {
      case 'fixed':
        // Fixed date (e.g., February 2nd)
        if (recurrence.month === date.month && recurrence.day === date.day) {
          // Check leap year constraint
          if (recurrence.leapYearOnly) {
            return this.isLeapYear(date.year);
          }
          return true;
        }
        return false;

      case 'ordinal':
        // Ordinal weekday (e.g., first Monday of September)
        if (recurrence.month !== date.month) return false;

        const weekday = this.getWeekday(date);
        if (weekday !== recurrence.weekday) return false;

        const ordinalPosition = this.getOrdinalPositionInMonth(date);
        if (recurrence.ordinal > 0) {
          return ordinalPosition === recurrence.ordinal;
        } else {
          // Negative ordinal means counting from end of month
          const lastOrdinal = this.getLastOrdinalForWeekday(date.year, date.month, weekday);
          return ordinalPosition === lastOrdinal + recurrence.ordinal + 1;
        }

      case 'monthly':
        // Monthly recurrence (e.g., 15th of every month)
        return recurrence.day === date.day;

      case 'interval':
        // Interval recurrence (e.g., every 100 years)
        if (recurrence.month !== date.month || recurrence.day !== date.day) {
          return false;
        }

        const yearDiff = date.year - recurrence.startYear;
        if (yearDiff < 0) return false;

        return yearDiff % recurrence.interval === 0;

      default:
        Logger.warn(`Unknown recurrence type: ${(recurrence as any).type}`);
        return false;
    }
  }

  /**
   * Get the ordinal position of a date within its month
   * (e.g., 2nd Tuesday, 3rd Friday)
   */
  private getOrdinalPositionInMonth(date: { year: number; month: number; day: number }): number {
    const weekday = this.getWeekday(date);
    let count = 0;

    for (let day = 1; day <= date.day; day++) {
      const checkDate = { year: date.year, month: date.month, day };
      if (this.getWeekday(checkDate) === weekday) {
        count++;
      }
    }

    return count;
  }

  /**
   * Get the last ordinal position for a specific weekday in a month
   */
  private getLastOrdinalForWeekday(year: number, month: number, weekday: number): number {
    const daysInMonth = this.getDaysInMonth(year, month);
    let count = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const checkDate = { year, month, day };
      if (this.getWeekday(checkDate) === weekday) {
        count++;
      }
    }

    return count;
  }

  /**
   * Get the weekday for a date
   */
  private getWeekday(date: { year: number; month: number; day: number }): number {
    // Use the engine to calculate the weekday
    const calendarDate = this.engine.worldTimeToDate(
      this.engine.dateToWorldTime({
        year: date.year,
        month: date.month,
        day: date.day,
        weekday: 0, // Will be calculated
        toObject: () => ({
          year: date.year,
          month: date.month,
          day: date.day,
          weekday: 0,
        }),
        toShortString: () => '',
        toLongString: () => '',
        toDateString: () => '',
        toTimeString: () => '',
        countsForWeekdays: () => true,
      } as any)
    );

    return calendarDate.weekday;
  }

  /**
   * Get days in a month
   */
  private getDaysInMonth(year: number, month: number): number {
    if (month < 1 || month > this.calendar.months.length) {
      return 0;
    }

    const monthDef = this.calendar.months[month - 1];
    let days = monthDef.days;

    // Check for leap year extra days
    if (this.isLeapYear(year) && this.calendar.leapYear?.month === monthDef.name) {
      days += this.calendar.leapYear.extraDays || 0;
    }

    return days;
  }

  /**
   * Check if a year is a leap year
   */
  private isLeapYear(year: number): boolean {
    const leapYear = this.calendar.leapYear;
    if (!leapYear || leapYear.rule === 'none') return false;

    if (leapYear.rule === 'gregorian') {
      // Gregorian leap year rules
      if (year % 400 === 0) return true;
      if (year % 100 === 0) return false;
      if (year % 4 === 0) return true;
      return false;
    }

    if (leapYear.rule === 'custom' && leapYear.interval) {
      const adjustedYear = year - (leapYear.offset || 0);
      return adjustedYear % leapYear.interval === 0;
    }

    return false;
  }
}