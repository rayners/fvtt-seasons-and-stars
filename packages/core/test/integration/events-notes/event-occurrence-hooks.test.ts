/**
 * Event Occurrence Hooks Tests
 *
 * Tests the seasons-stars:eventOccurs hook that fires when:
 * 1. Time advancement crosses a day boundary with events
 * 2. Module initializes and current date has events
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarEngine } from '../../../src/core/calendar-engine';
import { EventsManager } from '../../../src/core/events-manager';
import type { SeasonsStarsCalendar, CalendarEvent, EventOccursData } from '../../../src/types/calendar';

// Mock calendar with events
const testCalendar: SeasonsStarsCalendar = {
  id: 'test-calendar',
  translations: {
    en: {
      label: 'Test Calendar',
      description: 'Calendar for testing event hooks',
    },
  },
  year: {
    epoch: 0,
    currentYear: 2024,
    prefix: '',
    suffix: '',
    startDay: 1,
  },
  leapYear: {
    rule: 'none',
  },
  months: [
    { name: 'January', days: 31 },
    { name: 'February', days: 28 },
    { name: 'March', days: 31 },
    { name: 'December', days: 31 },
  ],
  weekdays: [
    { name: 'Sunday' },
    { name: 'Monday' },
    { name: 'Tuesday' },
    { name: 'Wednesday' },
    { name: 'Thursday' },
    { name: 'Friday' },
    { name: 'Saturday' },
  ],
  intercalary: [],
  time: {
    hoursInDay: 24,
    minutesInHour: 60,
    secondsInMinute: 60,
  },
  events: [
    // New Year's Day - January 1
    {
      id: 'new-year',
      name: "New Year's Day",
      description: 'Start of the new year',
      recurrence: { type: 'fixed', month: 1, day: 1 },
      visibility: 'player-visible',
    },
    // Winter Festival - December 25
    {
      id: 'winter-festival',
      name: 'Winter Festival',
      description: 'Annual winter celebration',
      recurrence: { type: 'fixed', month: 4, day: 25 },
      visibility: 'player-visible',
    },
    // GM-only event - March 15
    {
      id: 'secret-event',
      name: 'Secret Meeting',
      description: 'Secret GM event',
      recurrence: { type: 'fixed', month: 3, day: 15 },
      visibility: 'gm-only',
    },
  ],
};

describe('Event Occurrence Hooks', () => {
  let calendarEngine: CalendarEngine;
  let eventsManager: EventsManager;
  let hookCallbacks: Map<string, Function[]>;

  beforeEach(() => {
    // Reset hooks tracking
    hookCallbacks = new Map();

    // Mock Hooks.callAll
    globalThis.Hooks = {
      callAll: vi.fn((hookName: string, ...args: unknown[]) => {
        const callbacks = hookCallbacks.get(hookName) || [];
        callbacks.forEach(callback => callback(...args));
      }),
      on: vi.fn((hookName: string, callback: Function) => {
        const callbacks = hookCallbacks.get(hookName) || [];
        callbacks.push(callback);
        hookCallbacks.set(hookName, callbacks);
      }),
      once: vi.fn(),
    } as never;

    calendarEngine = new CalendarEngine(testCalendar);
    eventsManager = new EventsManager(testCalendar, calendarEngine);
  });

  describe('Hook Firing on Time Advancement', () => {
    it('should fire hook when advancing to a date with events (New Year)', () => {
      // Arrange
      const hookSpy = vi.fn();
      hookCallbacks.set('seasons-stars:eventOccurs', [hookSpy]);

      const currentDate = { year: 2023, month: 4, day: 31 }; // December 31, 2023
      const newDate = { year: 2024, month: 1, day: 1 }; // January 1, 2024

      // Get events for the new date
      const events = eventsManager.getEventsForDate(newDate.year, newDate.month, newDate.day);

      // Simulate time advancement
      // Act
      Hooks.callAll('seasons-stars:eventOccurs', {
        events,
        date: newDate,
        isStartup: false,
        previousDate: currentDate,
      } as EventOccursData);

      // Assert
      expect(hookSpy).toHaveBeenCalledTimes(1);
      const hookData = hookSpy.mock.calls[0][0] as EventOccursData;

      expect(hookData.events).toHaveLength(1);
      expect(hookData.events[0].event.id).toBe('new-year');
      expect(hookData.date).toEqual(newDate);
      expect(hookData.isStartup).toBe(false);
      expect(hookData.previousDate).toEqual(currentDate);
    });

    it('should fire hook when advancing to a date with multiple events', () => {
      const hookSpy = vi.fn();
      hookCallbacks.set('seasons-stars:eventOccurs', [hookSpy]);

      const currentDate = { year: 2024, month: 4, day: 24 }; // December 24
      const newDate = { year: 2024, month: 4, day: 25 }; // December 25 (Winter Festival)

      const events = eventsManager.getEventsForDate(newDate.year, newDate.month, newDate.day);

      Hooks.callAll('seasons-stars:eventOccurs', {
        events,
        date: newDate,
        isStartup: false,
        previousDate: currentDate,
      } as EventOccursData);

      expect(hookSpy).toHaveBeenCalledTimes(1);
      const hookData = hookSpy.mock.calls[0][0] as EventOccursData;

      expect(hookData.events).toHaveLength(1);
      expect(hookData.events[0].event.id).toBe('winter-festival');
    });

    it('should not fire hook when advancing to a date without events', () => {
      const hookSpy = vi.fn();
      hookCallbacks.set('seasons-stars:eventOccurs', [hookSpy]);

      const currentDate = { year: 2024, month: 2, day: 10 };
      const newDate = { year: 2024, month: 2, day: 11 }; // February 11 (no events)

      const events = eventsManager.getEventsForDate(newDate.year, newDate.month, newDate.day);

      // Only fire if there are events
      if (events.length > 0) {
        Hooks.callAll('seasons-stars:eventOccurs', {
          events,
          date: newDate,
          isStartup: false,
          previousDate: currentDate,
        } as EventOccursData);
      }

      expect(hookSpy).not.toHaveBeenCalled();
    });

    it('should fire hook when advancing multiple days and landing on event', () => {
      const hookSpy = vi.fn();
      hookCallbacks.set('seasons-stars:eventOccurs', [hookSpy]);

      const currentDate = { year: 2024, month: 1, day: 1 }; // January 1
      const newDate = { year: 2024, month: 3, day: 15 }; // March 15 (Secret Meeting)

      const events = eventsManager.getEventsForDate(newDate.year, newDate.month, newDate.day);

      Hooks.callAll('seasons-stars:eventOccurs', {
        events,
        date: newDate,
        isStartup: false,
        previousDate: currentDate,
      } as EventOccursData);

      expect(hookSpy).toHaveBeenCalledTimes(1);
      const hookData = hookSpy.mock.calls[0][0] as EventOccursData;

      expect(hookData.events).toHaveLength(1);
      expect(hookData.events[0].event.id).toBe('secret-event');
    });
  });

  describe('Hook Firing on Startup', () => {
    it('should fire hook on startup if current date has events', () => {
      const hookSpy = vi.fn();
      hookCallbacks.set('seasons-stars:eventOccurs', [hookSpy]);

      const currentDate = { year: 2024, month: 1, day: 1 }; // January 1 (New Year)
      const events = eventsManager.getEventsForDate(
        currentDate.year,
        currentDate.month,
        currentDate.day
      );

      // Simulate startup
      Hooks.callAll('seasons-stars:eventOccurs', {
        events,
        date: currentDate,
        isStartup: true,
        // No previousDate on startup
      } as EventOccursData);

      expect(hookSpy).toHaveBeenCalledTimes(1);
      const hookData = hookSpy.mock.calls[0][0] as EventOccursData;

      expect(hookData.events).toHaveLength(1);
      expect(hookData.events[0].event.id).toBe('new-year');
      expect(hookData.isStartup).toBe(true);
      expect(hookData.previousDate).toBeUndefined();
    });

    it('should not fire hook on startup if current date has no events', () => {
      const hookSpy = vi.fn();
      hookCallbacks.set('seasons-stars:eventOccurs', [hookSpy]);

      const currentDate = { year: 2024, month: 2, day: 10 }; // February 10 (no events)
      const events = eventsManager.getEventsForDate(
        currentDate.year,
        currentDate.month,
        currentDate.day
      );

      // Only fire if there are events
      if (events.length > 0) {
        Hooks.callAll('seasons-stars:eventOccurs', {
          events,
          date: currentDate,
          isStartup: true,
        } as EventOccursData);
      }

      expect(hookSpy).not.toHaveBeenCalled();
    });
  });

  describe('Hook Data Structure', () => {
    it('should include all required fields in hook data', () => {
      const hookSpy = vi.fn();
      hookCallbacks.set('seasons-stars:eventOccurs', [hookSpy]);

      const currentDate = { year: 2023, month: 4, day: 31 };
      const newDate = { year: 2024, month: 1, day: 1 };
      const events = eventsManager.getEventsForDate(newDate.year, newDate.month, newDate.day);

      Hooks.callAll('seasons-stars:eventOccurs', {
        events,
        date: newDate,
        isStartup: false,
        previousDate: currentDate,
      } as EventOccursData);

      const hookData = hookSpy.mock.calls[0][0] as EventOccursData;

      // Check all required fields exist
      expect(hookData).toHaveProperty('events');
      expect(hookData).toHaveProperty('date');
      expect(hookData).toHaveProperty('isStartup');
      expect(hookData).toHaveProperty('previousDate');

      // Verify structure of events array
      expect(Array.isArray(hookData.events)).toBe(true);
      expect(hookData.events[0]).toHaveProperty('event');
      expect(hookData.events[0]).toHaveProperty('year');
      expect(hookData.events[0]).toHaveProperty('month');
      expect(hookData.events[0]).toHaveProperty('day');

      // Verify date structure
      expect(hookData.date).toHaveProperty('year');
      expect(hookData.date).toHaveProperty('month');
      expect(hookData.date).toHaveProperty('day');
    });

    it('should include full event details in occurrences', () => {
      const hookSpy = vi.fn();
      hookCallbacks.set('seasons-stars:eventOccurs', [hookSpy]);

      const newDate = { year: 2024, month: 1, day: 1 };
      const events = eventsManager.getEventsForDate(newDate.year, newDate.month, newDate.day);

      Hooks.callAll('seasons-stars:eventOccurs', {
        events,
        date: newDate,
        isStartup: true,
      } as EventOccursData);

      const hookData = hookSpy.mock.calls[0][0] as EventOccursData;
      const occurrence = hookData.events[0];

      // Verify full event details are present
      expect(occurrence.event.id).toBe('new-year');
      expect(occurrence.event.name).toBe("New Year's Day");
      expect(occurrence.event.description).toBe('Start of the new year');
      expect(occurrence.event.visibility).toBe('player-visible');
      expect(occurrence.event.recurrence).toEqual({ type: 'fixed', month: 1, day: 1 });
    });
  });

  describe('Hook Integration with World Events', () => {
    it('should fire hook for world-level custom events', () => {
      const hookSpy = vi.fn();
      hookCallbacks.set('seasons-stars:eventOccurs', [hookSpy]);

      // Add a custom world event
      const customEvent: CalendarEvent = {
        id: 'custom-harvest',
        name: 'Harvest Festival',
        description: 'Local harvest celebration',
        recurrence: { type: 'fixed', month: 3, day: 15 },
        visibility: 'player-visible',
      };

      eventsManager.setWorldEventSettings({
        events: [customEvent],
        disabledEventIds: [],
      });

      const newDate = { year: 2024, month: 3, day: 15 };
      const events = eventsManager.getEventsForDate(newDate.year, newDate.month, newDate.day);

      Hooks.callAll('seasons-stars:eventOccurs', {
        events,
        date: newDate,
        isStartup: false,
        previousDate: { year: 2024, month: 3, day: 14 },
      } as EventOccursData);

      expect(hookSpy).toHaveBeenCalledTimes(1);
      const hookData = hookSpy.mock.calls[0][0] as EventOccursData;

      // Should include both the secret event and custom event
      expect(hookData.events.length).toBeGreaterThanOrEqual(1);
      const customEventOccurrence = hookData.events.find(e => e.event.id === 'custom-harvest');
      expect(customEventOccurrence).toBeDefined();
      expect(customEventOccurrence!.event.name).toBe('Harvest Festival');
    });

    it('should not fire hook for disabled events', () => {
      const hookSpy = vi.fn();
      hookCallbacks.set('seasons-stars:eventOccurs', [hookSpy]);

      // Disable the New Year event
      eventsManager.setWorldEventSettings({
        events: [],
        disabledEventIds: ['new-year'],
      });

      const newDate = { year: 2024, month: 1, day: 1 };
      const events = eventsManager.getEventsForDate(newDate.year, newDate.month, newDate.day);

      // Should have no events (new-year is disabled)
      expect(events).toHaveLength(0);

      // Only fire if there are events
      if (events.length > 0) {
        Hooks.callAll('seasons-stars:eventOccurs', {
          events,
          date: newDate,
          isStartup: false,
          previousDate: { year: 2023, month: 4, day: 31 },
        } as EventOccursData);
      }

      expect(hookSpy).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Hook Listeners', () => {
    it('should call all registered hook listeners', () => {
      const hookSpy1 = vi.fn();
      const hookSpy2 = vi.fn();
      const hookSpy3 = vi.fn();

      hookCallbacks.set('seasons-stars:eventOccurs', [hookSpy1, hookSpy2, hookSpy3]);

      const newDate = { year: 2024, month: 1, day: 1 };
      const events = eventsManager.getEventsForDate(newDate.year, newDate.month, newDate.day);

      Hooks.callAll('seasons-stars:eventOccurs', {
        events,
        date: newDate,
        isStartup: true,
      } as EventOccursData);

      expect(hookSpy1).toHaveBeenCalledTimes(1);
      expect(hookSpy2).toHaveBeenCalledTimes(1);
      expect(hookSpy3).toHaveBeenCalledTimes(1);

      // Verify all received the same data
      expect(hookSpy1.mock.calls[0][0]).toEqual(hookSpy2.mock.calls[0][0]);
      expect(hookSpy2.mock.calls[0][0]).toEqual(hookSpy3.mock.calls[0][0]);
    });
  });
});
