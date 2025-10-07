/**
 * Events Manager
 *
 * Manages calendar events including calendar-defined events and world-level
 * customizations. Handles event storage, merging, and retrieval.
 */

import type { CalendarEngine } from './calendar-engine';
import { EventRecurrenceCalculator } from './event-recurrence-calculator';
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
   */
  getEventsForDate(year: number, month: number, day: number): CalendarEvent[] {
    const allEvents = this.getAllEvents();
    const result: CalendarEvent[] = [];

    for (const event of allEvents) {
      // Check year range
      if (event.startYear && year < event.startYear) continue;
      if (event.endYear && year > event.endYear) continue;

      // Calculate occurrence
      const occurrence = this.recurrenceCalculator.calculateOccurrence(event.recurrence, year);

      if (occurrence && occurrence.month === month && occurrence.day === day) {
        // Check exceptions
        if (event.exceptions) {
          const exception = event.exceptions.find(ex => ex.year === year);
          if (exception) {
            if (exception.type === 'skip') {
              continue; // Skip this occurrence
            } else if (exception.type === 'move') {
              // Check if moved to this date
              if (exception.moveToMonth !== month || exception.moveToDay !== day) {
                continue; // Moved to different date
              }
            }
          }
        }

        result.push(event);
      } else if (event.exceptions) {
        // Check if moved TO this date
        const exception = event.exceptions.find(ex => ex.year === year);
        if (
          exception &&
          exception.type === 'move' &&
          exception.moveToMonth === month &&
          exception.moveToDay === day
        ) {
          result.push(event);
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

    // Iterate through each year in range
    for (let year = startYear; year <= endYear; year++) {
      for (const event of allEvents) {
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

        // Check if in range
        if (
          this.isDateInRange(
            year,
            finalMonth,
            finalDay,
            startYear,
            startMonth,
            startDay,
            endYear,
            endMonth,
            endDay
          )
        ) {
          result.push({
            event,
            year,
            month: finalMonth,
            day: finalDay,
          });
        }
      }
    }

    return result;
  }

  /**
   * Get the next occurrence of an event after a given date
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
}
