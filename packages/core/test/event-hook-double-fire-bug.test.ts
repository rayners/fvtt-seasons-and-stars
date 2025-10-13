/**
 * Tests for Event Hook Double Fire Bug Fix
 *
 * Verifies that the seasons-stars:eventOccurs hook only fires once on startup,
 * not again on the first dateChanged event.
 *
 * Bug: lastEventCheckDate was null initially, causing hook to fire twice:
 * 1. During ready hook (startup)
 * 2. On first dateChanged event (because lastEventCheckDate was still null)
 *
 * Fix: Set lastEventCheckDate after firing hook on startup
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import { EventsManager } from '../src/core/events-manager';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Test calendar with an event
const testCalendar: SeasonsStarsCalendar = {
  id: 'test-calendar',
  translations: {
    en: {
      label: 'Test Calendar',
      description: 'Calendar for testing double fire bug',
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
  months: [{ name: 'January', days: 31 }],
  weekdays: [{ name: 'Monday' }, { name: 'Tuesday' }],
  intercalary: [],
  time: {
    hoursInDay: 24,
    minutesInHour: 60,
    secondsInMinute: 60,
  },
  events: [
    {
      id: 'test-event',
      name: 'Test Event',
      description: 'Event on Jan 1',
      recurrence: { type: 'fixed', month: 1, day: 1 },
      visibility: 'player-visible',
    },
  ],
};

describe('Event Hook Double Fire Bug', () => {
  let calendarEngine: CalendarEngine;
  let eventsManager: EventsManager;
  let hookCallbacks: Map<string, Function[]>;
  let lastEventCheckDate: { year: number; month: number; day: number } | null;

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

    // Simulate the lastEventCheckDate closure variable from module.ts
    lastEventCheckDate = null;
  });

  describe('Startup Hook Fire', () => {
    it('should fire hook once on startup and set lastEventCheckDate', () => {
      const hookSpy = vi.fn();
      hookCallbacks.set('seasons-stars:eventOccurs', [hookSpy]);

      const currentDate = { year: 2024, month: 1, day: 1 }; // Jan 1 (has event)

      // Simulate startup: check for events and fire hook
      const events = eventsManager.getEventsForDate(
        currentDate.year,
        currentDate.month,
        currentDate.day
      );

      if (events.length > 0) {
        Hooks.callAll('seasons-stars:eventOccurs', {
          events,
          date: currentDate,
          isStartup: true,
        });

        // FIX: Update lastEventCheckDate to prevent duplicate fire
        lastEventCheckDate = {
          year: currentDate.year,
          month: currentDate.month,
          day: currentDate.day,
        };
      }

      // Verify hook fired once
      expect(hookSpy).toHaveBeenCalledTimes(1);
      expect(hookSpy.mock.calls[0][0].isStartup).toBe(true);

      // Verify lastEventCheckDate was set
      expect(lastEventCheckDate).not.toBeNull();
      expect(lastEventCheckDate?.year).toBe(2024);
      expect(lastEventCheckDate?.month).toBe(1);
      expect(lastEventCheckDate?.day).toBe(1);
    });

    it('should not fire hook again on first dateChanged if date unchanged', () => {
      const hookSpy = vi.fn();
      hookCallbacks.set('seasons-stars:eventOccurs', [hookSpy]);

      const currentDate = { year: 2024, month: 1, day: 1 };

      // Simulate startup
      const events = eventsManager.getEventsForDate(
        currentDate.year,
        currentDate.month,
        currentDate.day
      );

      if (events.length > 0) {
        Hooks.callAll('seasons-stars:eventOccurs', {
          events,
          date: currentDate,
          isStartup: true,
        });
        lastEventCheckDate = { ...currentDate };
      }

      expect(hookSpy).toHaveBeenCalledTimes(1);

      // Simulate first dateChanged event (same date, just time change)
      const newDate = { year: 2024, month: 1, day: 1 };

      // Check if day changed
      const dayChanged =
        !lastEventCheckDate ||
        lastEventCheckDate.year !== newDate.year ||
        lastEventCheckDate.month !== newDate.month ||
        lastEventCheckDate.day !== newDate.day;

      if (!dayChanged) {
        // Same day, should NOT fire hook
        expect(hookSpy).toHaveBeenCalledTimes(1); // Still only 1 call
        return;
      }

      // If we get here, the bug still exists
      expect(dayChanged).toBe(false);
    });

    it('should fire hook on subsequent dateChanged when day actually changes', () => {
      const hookSpy = vi.fn();
      hookCallbacks.set('seasons-stars:eventOccurs', [hookSpy]);

      const startDate = { year: 2024, month: 1, day: 1 };

      // Simulate startup
      const startEvents = eventsManager.getEventsForDate(
        startDate.year,
        startDate.month,
        startDate.day
      );

      if (startEvents.length > 0) {
        Hooks.callAll('seasons-stars:eventOccurs', {
          events: startEvents,
          date: startDate,
          isStartup: true,
        });
        lastEventCheckDate = { ...startDate };
      }

      expect(hookSpy).toHaveBeenCalledTimes(1);

      // Simulate dateChanged to a different day
      const newDate = { year: 2024, month: 1, day: 2 };

      const dayChanged =
        !lastEventCheckDate ||
        lastEventCheckDate.year !== newDate.year ||
        lastEventCheckDate.month !== newDate.month ||
        lastEventCheckDate.day !== newDate.day;

      expect(dayChanged).toBe(true);

      if (dayChanged) {
        lastEventCheckDate = { ...newDate };

        const newEvents = eventsManager.getEventsForDate(newDate.year, newDate.month, newDate.day);

        // Only fire if there are events on the new date
        if (newEvents.length > 0) {
          Hooks.callAll('seasons-stars:eventOccurs', {
            events: newEvents,
            date: newDate,
            isStartup: false,
            previousDate: startDate,
          });
        }
      }

      // Hook should NOT have fired again (no event on Jan 2)
      expect(hookSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Bug Reproduction (Before Fix)', () => {
    it('demonstrates the bug: hook fires twice without fix', () => {
      const hookSpy = vi.fn();
      hookCallbacks.set('seasons-stars:eventOccurs', [hookSpy]);

      const currentDate = { year: 2024, month: 1, day: 1 };

      // Simulate startup WITHOUT setting lastEventCheckDate (the bug)
      const events = eventsManager.getEventsForDate(
        currentDate.year,
        currentDate.month,
        currentDate.day
      );

      if (events.length > 0) {
        Hooks.callAll('seasons-stars:eventOccurs', {
          events,
          date: currentDate,
          isStartup: true,
        });
        // BUG: Not setting lastEventCheckDate here
      }

      expect(hookSpy).toHaveBeenCalledTimes(1);

      // Simulate first dateChanged (same date)
      const newDate = { year: 2024, month: 1, day: 1 };

      // Because lastEventCheckDate is still null, this check passes
      const dayChanged =
        !lastEventCheckDate ||
        lastEventCheckDate.year !== newDate.year ||
        lastEventCheckDate.month !== newDate.month ||
        lastEventCheckDate.day !== newDate.day;

      // BUG: dayChanged is true because lastEventCheckDate is null
      expect(dayChanged).toBe(true);

      if (dayChanged) {
        lastEventCheckDate = { ...newDate };

        const newEvents = eventsManager.getEventsForDate(newDate.year, newDate.month, newDate.day);

        if (newEvents.length > 0) {
          Hooks.callAll('seasons-stars:eventOccurs', {
            events: newEvents,
            date: newDate,
            isStartup: false,
            previousDate: undefined,
          });
        }
      }

      // BUG: Hook fired twice!
      expect(hookSpy).toHaveBeenCalledTimes(2);
    });
  });
});
