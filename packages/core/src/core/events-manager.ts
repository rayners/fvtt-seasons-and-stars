/**
 * Events Manager
 *
 * Manages calendar events including calendar-defined events and world-level
 * customizations. Handles event storage, merging, and retrieval.
 */

import type { CalendarEngine } from './calendar-engine';
import { CalendarDate } from './calendar-date';
import { EventRecurrenceCalculator } from './event-recurrence-calculator';
import { parseEventStartTime, parseEventDuration } from './event-time-utils';
import type {
  SeasonsStarsCalendar,
  CalendarEvent,
  EventOccurrence,
  WorldEventSettings,
} from '../types/calendar';

/**
 * Manages calendar events with support for calendar-defined and world-level events
 */
export class EventsManager {
  private recurrenceCalculator: EventRecurrenceCalculator;
  private worldEventSettings: WorldEventSettings = {
    events: [],
    disabledEventIds: [],
  };

  constructor(
    private calendar: SeasonsStarsCalendar,
    private calendarEngine: CalendarEngine
  ) {
    this.recurrenceCalculator = new EventRecurrenceCalculator(calendar);
  }

  /**
   * Set world event settings (GM customizations)
   */
  setWorldEventSettings(settings: WorldEventSettings): void {
    this.worldEventSettings = settings;
  }

  /**
   * Get all events (merged calendar + world events, minus disabled)
   */
  getAllEvents(): CalendarEvent[] {
    const calendarEvents = this.calendar.events || [];
    const worldEvents = this.worldEventSettings.events;
    const disabledIds = this.worldEventSettings.disabledEventIds;

    // Start with calendar events, excluding disabled ones
    const result = calendarEvents.filter(event => !disabledIds.includes(event.id));

    // Process world events
    for (const worldEvent of worldEvents) {
      const existingIndex = result.findIndex(e => e.id === worldEvent.id);

      if (existingIndex >= 0) {
        // Replace existing event completely (full override, not merge)
        result[existingIndex] = worldEvent;
      } else {
        // Add new event
        result.push(worldEvent);
      }
    }

    return result;
  }

  /**
   * Get a specific event by ID
   */
  getEvent(eventId: string): CalendarEvent | null {
    const allEvents = this.getAllEvents();
    return allEvents.find(e => e.id === eventId) || null;
  }

  /**
   * Get all events occurring on a specific date
   *
   * Returns event occurrences with the full context (event + date information)
   * ready for hook consumers and UI display.
   */
  getEventsForDate(year: number, month: number, day: number): EventOccurrence[] {
    const allEvents = this.getAllEvents();
    const result: EventOccurrence[] = [];
    const seenEventIds = new Set<string>();

    // Check which years could have events on this date
    const yearsToCheck = [year];

    // If checking January, also check previous year's events that might roll into this year
    if (month === 1) {
      yearsToCheck.push(year - 1);
    }

    for (const event of allEvents) {
      for (const checkYear of yearsToCheck) {
        // Check year range (use the checkYear for the calculation, but the requested year for the result)
        if (event.startYear && checkYear < event.startYear) continue;
        if (event.endYear && checkYear > event.endYear) continue;

        // Calculate occurrence for the check year
        const occurrence = this.recurrenceCalculator.calculateOccurrence(
          event.recurrence,
          checkYear
        );

        if (!occurrence) continue;

        // Calculate actual occurrence year (may be offset by yearOffset)
        const occurrenceYear = checkYear + (occurrence.yearOffset || 0);

        let finalMonth = occurrence.month;
        let finalDay = occurrence.day;
        const finalYear = occurrenceYear;
        let shouldSkip = false;

        // Check exceptions (use the check year, not the occurrence year)
        if (event.exceptions) {
          const exception = event.exceptions.find(ex => ex.year === checkYear);
          if (exception) {
            if (exception.type === 'skip') {
              shouldSkip = true;
            } else if (exception.type === 'move') {
              finalMonth = exception.moveToMonth;
              finalDay = exception.moveToDay;
            }
          }
        }

        if (shouldSkip) continue;

        // Check if the event overlaps with the requested date (handles multi-day events)
        if (
          this.doesEventOverlapDate(event, finalYear, finalMonth, finalDay, year, month, day) &&
          !seenEventIds.has(event.id)
        ) {
          result.push({ event, year: finalYear, month: finalMonth, day: finalDay });
          seenEventIds.add(event.id);
          break; // Found match for this event, don't check other years
        }
      }
    }

    return result;
  }

  /**
   * Check if a specific date has any events
   */
  hasEventsOnDate(year: number, month: number, day: number): boolean {
    return this.getEventsForDate(year, month, day).length > 0;
  }

  /**
   * Get all event occurrences in a date range
   */
  getEventsInRange(
    startYear: number,
    startMonth: number,
    startDay: number,
    endYear: number,
    endMonth: number,
    endDay: number
  ): EventOccurrence[] {
    const allEvents = this.getAllEvents();
    const result: EventOccurrence[] = [];
    const seenEventIds = new Set<string>();

    const rangeStartDate = new CalendarDate(
      {
        year: startYear,
        month: startMonth,
        day: startDay,
        weekday: 0,
        time: { hour: 0, minute: 0, second: 0 },
      },
      this.calendar
    );

    const rangeEndDate = new CalendarDate(
      {
        year: endYear,
        month: endMonth,
        day: endDay,
        weekday: 0,
        time: {
          hour: this.calendar.time.hoursInDay - 1,
          minute: this.calendar.time.minutesInHour - 1,
          second: this.calendar.time.secondsInMinute - 1,
        },
      },
      this.calendar
    );

    const rangeStartWorldTime = this.calendarEngine.dateToWorldTime(rangeStartDate);
    const rangeEndWorldTime = this.calendarEngine.dateToWorldTime(rangeEndDate);

    // Include previous year to catch events that start before the range but extend into it
    for (let year = startYear - 1; year <= endYear; year++) {
      for (const event of allEvents) {
        // Skip if we've already added this event (prevents duplicates for multi-year events)
        if (seenEventIds.has(event.id)) continue;

        // Check year range
        if (event.startYear && year < event.startYear) continue;
        if (event.endYear && year > event.endYear) continue;

        // Calculate occurrence for this year
        const occurrence = this.recurrenceCalculator.calculateOccurrence(event.recurrence, year);

        if (!occurrence) continue;

        let finalMonth = occurrence.month;
        let finalDay = occurrence.day;

        // Check exceptions
        if (event.exceptions) {
          const exception = event.exceptions.find(ex => ex.year === year);
          if (exception) {
            if (exception.type === 'skip') {
              continue; // Skip this occurrence
            } else if (exception.type === 'move') {
              finalMonth = exception.moveToMonth;
              finalDay = exception.moveToDay;
            }
          }
        }

        // Calculate event time range
        const { startWorldTime, endWorldTime } = this.calculateEventTimeRange(
          event,
          year,
          finalMonth,
          finalDay
        );

        // Check if event time range overlaps with the requested date range
        if (startWorldTime <= rangeEndWorldTime && endWorldTime >= rangeStartWorldTime) {
          result.push({
            event,
            year,
            month: finalMonth,
            day: finalDay,
          });
          seenEventIds.add(event.id);
        }
      }
    }

    return result;
  }

  /**
   * Get the next occurrence of an event after a given date
   *
   * @param eventId - The ID of the event
   * @param afterYear - Year to search after
   * @param afterMonth - Month to search after (1-based)
   * @param afterDay - Day to search after (1-based)
   * @returns The next occurrence, or null if none found within search limit
   *
   * @remarks
   * Searches up to 100 years in the future from the given date. This limit
   * prevents infinite loops for events that may never occur again (e.g.,
   * events with endYear in the past, or ordinal events that can't be satisfied).
   */
  getNextOccurrence(
    eventId: string,
    afterYear: number,
    afterMonth: number,
    afterDay: number
  ): EventOccurrence | null {
    const event = this.getEvent(eventId);
    if (!event) return null;

    // Search up to 100 years in the future
    const maxYear = afterYear + 100;

    for (let year = afterYear; year <= maxYear; year++) {
      // Check year range
      if (event.startYear && year < event.startYear) continue;
      if (event.endYear && year > event.endYear) break;

      const occurrence = this.recurrenceCalculator.calculateOccurrence(event.recurrence, year);

      if (!occurrence) continue;

      let finalMonth = occurrence.month;
      let finalDay = occurrence.day;

      // Check exceptions
      if (event.exceptions) {
        const exception = event.exceptions.find(ex => ex.year === year);
        if (exception) {
          if (exception.type === 'skip') {
            continue; // Skip this occurrence
          } else if (exception.type === 'move') {
            finalMonth = exception.moveToMonth;
            finalDay = exception.moveToDay;
          }
        }
      }

      // Check if after the given date
      if (this.isDateAfter(year, finalMonth, finalDay, afterYear, afterMonth, afterDay)) {
        return {
          event,
          year,
          month: finalMonth,
          day: finalDay,
        };
      }
    }

    return null;
  }

  /**
   * Check if date1 is after date2
   */
  private isDateAfter(
    year1: number,
    month1: number,
    day1: number,
    year2: number,
    month2: number,
    day2: number
  ): boolean {
    if (year1 > year2) return true;
    if (year1 < year2) return false;
    if (month1 > month2) return true;
    if (month1 < month2) return false;
    return day1 > day2;
  }

  /**
   * Check if a date is within a range
   */
  private isDateInRange(
    year: number,
    month: number,
    day: number,
    startYear: number,
    startMonth: number,
    startDay: number,
    endYear: number,
    endMonth: number,
    endDay: number
  ): boolean {
    // Convert to comparable numbers
    const date = year * 10000 + month * 100 + day;
    const start = startYear * 10000 + startMonth * 100 + startDay;
    const end = endYear * 10000 + endMonth * 100 + endDay;

    return date >= start && date <= end;
  }

  /**
   * Calculate the start and end worldTime for an event occurrence
   */
  private calculateEventTimeRange(
    event: CalendarEvent,
    year: number,
    month: number,
    day: number
  ): { startWorldTime: number; endWorldTime: number } {
    const parsedStartTime = parseEventStartTime(
      event.startTime,
      this.calendar.time.hoursInDay,
      this.calendar.time.minutesInHour,
      this.calendar.time.secondsInMinute
    );

    const parsedDuration = parseEventDuration(
      event.duration,
      this.calendar.time.hoursInDay,
      this.calendar.time.minutesInHour,
      this.calendar.time.secondsInMinute,
      this.calendar.weekdays?.length || 7
    );

    const startDate = new CalendarDate(
      {
        year,
        month,
        day,
        weekday: 0,
        time: {
          hour: parsedStartTime.hour,
          minute: parsedStartTime.minute,
          second: parsedStartTime.second,
        },
      },
      this.calendar
    );

    const startWorldTime = this.calendarEngine.dateToWorldTime(startDate);
    let endWorldTime = startWorldTime + parsedDuration.seconds;

    // For non-zero durations, subtract 1 second to keep the event within
    // the intended calendar days (e.g., "1d" means the event is active
    // during that single day, not extending into the next day at 00:00:00)
    if (parsedDuration.seconds > 0) {
      endWorldTime = endWorldTime - 1;
    }

    return { startWorldTime, endWorldTime };
  }

  /**
   * Check if a specific date overlaps with an event's duration
   */
  private doesEventOverlapDate(
    event: CalendarEvent,
    eventOccurrenceYear: number,
    eventOccurrenceMonth: number,
    eventOccurrenceDay: number,
    checkYear: number,
    checkMonth: number,
    checkDay: number
  ): boolean {
    const { startWorldTime, endWorldTime } = this.calculateEventTimeRange(
      event,
      eventOccurrenceYear,
      eventOccurrenceMonth,
      eventOccurrenceDay
    );

    const dayStartDate = new CalendarDate(
      {
        year: checkYear,
        month: checkMonth,
        day: checkDay,
        weekday: 0,
        time: { hour: 0, minute: 0, second: 0 },
      },
      this.calendar
    );

    const dayEndDate = new CalendarDate(
      {
        year: checkYear,
        month: checkMonth,
        day: checkDay,
        weekday: 0,
        time: {
          hour: this.calendar.time.hoursInDay - 1,
          minute: this.calendar.time.minutesInHour - 1,
          second: this.calendar.time.secondsInMinute - 1,
        },
      },
      this.calendar
    );

    const dayStartWorldTime = this.calendarEngine.dateToWorldTime(dayStartDate);
    const dayEndWorldTime = this.calendarEngine.dateToWorldTime(dayEndDate);

    return startWorldTime <= dayEndWorldTime && endWorldTime >= dayStartWorldTime;
  }
}
