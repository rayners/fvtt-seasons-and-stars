/**
 * Tests for Events API
 *
 * Tests the public API for managing calendar events, including
 * event retrieval, world event management, and journal integration.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EventsManager } from '../../../src/core/events-manager';
import { CalendarEngine } from '../../../src/core/calendar-engine';
import type { SeasonsStarsCalendar, WorldEventSettings } from '../../../src/types/calendar';

// Test calendar with events
const testCalendar: SeasonsStarsCalendar = {
  id: 'test-calendar',
  translations: {
    en: {
      label: 'Test Calendar',
      description: 'Test calendar with events',
      setting: 'Test',
    },
  },
  year: {
    epoch: 2024,
    currentYear: 2024,
    prefix: '',
    suffix: '',
    startDay: 1,
  },
  leapYear: {
    rule: 'gregorian',
    month: 'February',
    extraDays: 1,
  },
  months: [
    { name: 'January', days: 31 },
    { name: 'February', days: 28 },
    { name: 'March', days: 31 },
    { name: 'April', days: 30 },
    { name: 'May', days: 31 },
    { name: 'June', days: 30 },
    { name: 'July', days: 31 },
    { name: 'August', days: 31 },
    { name: 'September', days: 30 },
    { name: 'October', days: 31 },
    { name: 'November', days: 30 },
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
    {
      id: 'new-year',
      name: "New Year's Day",
      description: 'Start of the new year',
      recurrence: { type: 'fixed', month: 1, day: 1 },
      visibility: 'player-visible',
      color: '#ff0000',
    },
    {
      id: 'independence-day',
      name: 'Independence Day',
      description: 'National holiday',
      recurrence: { type: 'fixed', month: 7, day: 4 },
      visibility: 'player-visible',
    },
    {
      id: 'thanksgiving',
      name: 'Thanksgiving',
      description: 'Turkey day',
      recurrence: { type: 'ordinal', month: 11, occurrence: -1, weekday: 4 },
      visibility: 'player-visible',
    },
  ],
};

describe('EventsManager - Event Retrieval', () => {
  let eventsManager: EventsManager;
  let calendarEngine: CalendarEngine;

  beforeEach(() => {
    calendarEngine = new CalendarEngine(testCalendar);
    eventsManager = new EventsManager(testCalendar, calendarEngine);
  });

  describe('getAllEvents', () => {
    it('should return all calendar-defined events', () => {
      const events = eventsManager.getAllEvents();
      expect(events).toHaveLength(3);
      expect(events[0].id).toBe('new-year');
      expect(events[1].id).toBe('independence-day');
      expect(events[2].id).toBe('thanksgiving');
    });

    it('should return empty array when calendar has no events', () => {
      const calendarNoEvents = { ...testCalendar, events: undefined };
      const engine = new CalendarEngine(calendarNoEvents);
      const manager = new EventsManager(calendarNoEvents, engine);

      const events = manager.getAllEvents();
      expect(events).toEqual([]);
    });
  });

  describe('getEvent', () => {
    it('should get event by ID', () => {
      const event = eventsManager.getEvent('new-year');
      expect(event).not.toBeNull();
      expect(event?.name).toBe("New Year's Day");
    });

    it('should return null for non-existent event', () => {
      const event = eventsManager.getEvent('non-existent');
      expect(event).toBeNull();
    });
  });

  describe('getEventsForDate', () => {
    it('should get events for New Year', () => {
      const events = eventsManager.getEventsForDate(2024, 1, 1);
      expect(events).toHaveLength(1);
      expect(events[0].event.id).toBe('new-year');
      expect(events[0].year).toBe(2024);
      expect(events[0].month).toBe(1);
      expect(events[0].day).toBe(1);
    });

    it('should get events for Independence Day', () => {
      const events = eventsManager.getEventsForDate(2024, 7, 4);
      expect(events).toHaveLength(1);
      expect(events[0].event.id).toBe('independence-day');
      expect(events[0].year).toBe(2024);
      expect(events[0].month).toBe(7);
      expect(events[0].day).toBe(4);
    });

    it('should get events for Thanksgiving 2024 (Nov 28)', () => {
      const events = eventsManager.getEventsForDate(2024, 11, 28);
      expect(events).toHaveLength(1);
      expect(events[0].event.id).toBe('thanksgiving');
      expect(events[0].year).toBe(2024);
      expect(events[0].month).toBe(11);
      expect(events[0].day).toBe(28);
    });

    it('should return empty array for date with no events', () => {
      const events = eventsManager.getEventsForDate(2024, 6, 15);
      expect(events).toEqual([]);
    });
  });

  describe('hasEventsOnDate', () => {
    it('should return true for date with events', () => {
      const hasEvents = eventsManager.hasEventsOnDate(2024, 1, 1);
      expect(hasEvents).toBe(true);
    });

    it('should return false for date without events', () => {
      const hasEvents = eventsManager.hasEventsOnDate(2024, 6, 15);
      expect(hasEvents).toBe(false);
    });
  });
});

describe('EventsManager - Event Merge Logic', () => {
  let eventsManager: EventsManager;
  let calendarEngine: CalendarEngine;

  beforeEach(() => {
    calendarEngine = new CalendarEngine(testCalendar);
    eventsManager = new EventsManager(testCalendar, calendarEngine);
  });

  describe('World event additions', () => {
    it('should add world event to calendar events', () => {
      const worldSettings: WorldEventSettings = {
        events: [
          {
            id: 'custom-event',
            name: 'Custom Event',
            description: 'GM-added event',
            recurrence: { type: 'fixed', month: 5, day: 15 },
          },
        ],
        disabledEventIds: [],
      };

      eventsManager.setWorldEventSettings(worldSettings);
      const allEvents = eventsManager.getAllEvents();

      expect(allEvents).toHaveLength(4); // 3 calendar + 1 world
      const customEvent = allEvents.find(e => e.id === 'custom-event');
      expect(customEvent).toBeDefined();
      expect(customEvent?.name).toBe('Custom Event');
    });
  });

  describe('World event overrides', () => {
    it('should completely replace calendar event with world event', () => {
      const worldSettings: WorldEventSettings = {
        events: [
          {
            id: 'new-year',
            name: 'Overridden New Year',
            description: 'Modified description',
            recurrence: { type: 'fixed', month: 1, day: 1 },
            color: '#00ff00', // Different color
          },
        ],
        disabledEventIds: [],
      };

      eventsManager.setWorldEventSettings(worldSettings);
      const event = eventsManager.getEvent('new-year');

      expect(event).not.toBeNull();
      expect(event?.name).toBe('Overridden New Year');
      expect(event?.description).toBe('Modified description');
      expect(event?.color).toBe('#00ff00');
    });

    it('should not partially merge - complete replacement only', () => {
      const worldSettings: WorldEventSettings = {
        events: [
          {
            id: 'new-year',
            name: 'New Name',
            recurrence: { type: 'fixed', month: 1, day: 1 },
            // Deliberately omitting description and color
          },
        ],
        disabledEventIds: [],
      };

      eventsManager.setWorldEventSettings(worldSettings);
      const event = eventsManager.getEvent('new-year');

      expect(event?.name).toBe('New Name');
      expect(event?.description).toBeUndefined(); // Not merged from calendar
      expect(event?.color).toBeUndefined(); // Not merged from calendar
    });
  });

  describe('Disabled events', () => {
    it('should hide disabled calendar events', () => {
      const worldSettings: WorldEventSettings = {
        events: [],
        disabledEventIds: ['new-year', 'thanksgiving'],
      };

      eventsManager.setWorldEventSettings(worldSettings);
      const allEvents = eventsManager.getAllEvents();

      expect(allEvents).toHaveLength(1); // Only independence-day remains
      expect(allEvents[0].id).toBe('independence-day');
    });

    it('should not return disabled events in getEvent', () => {
      const worldSettings: WorldEventSettings = {
        events: [],
        disabledEventIds: ['new-year'],
      };

      eventsManager.setWorldEventSettings(worldSettings);
      const event = eventsManager.getEvent('new-year');

      expect(event).toBeNull();
    });

    it('should not return disabled events in getEventsForDate', () => {
      const worldSettings: WorldEventSettings = {
        events: [],
        disabledEventIds: ['new-year'],
      };

      eventsManager.setWorldEventSettings(worldSettings);
      const events = eventsManager.getEventsForDate(2024, 1, 1);

      expect(events).toEqual([]);
    });
  });

  describe('Complex merge scenarios', () => {
    it('should handle add + override + disable together', () => {
      const worldSettings: WorldEventSettings = {
        events: [
          {
            id: 'new-year',
            name: 'Overridden New Year',
            recurrence: { type: 'fixed', month: 1, day: 1 },
          },
          {
            id: 'custom-event',
            name: 'Custom Event',
            recurrence: { type: 'fixed', month: 6, day: 15 },
          },
        ],
        disabledEventIds: ['thanksgiving'],
      };

      eventsManager.setWorldEventSettings(worldSettings);
      const allEvents = eventsManager.getAllEvents();

      expect(allEvents).toHaveLength(3); // new-year (overridden), independence-day, custom-event
      expect(allEvents.find(e => e.id === 'new-year')?.name).toBe('Overridden New Year');
      expect(allEvents.find(e => e.id === 'custom-event')).toBeDefined();
      expect(allEvents.find(e => e.id === 'thanksgiving')).toBeUndefined();
    });
  });
});

describe('EventsManager - Event Occurrences', () => {
  let eventsManager: EventsManager;
  let calendarEngine: CalendarEngine;

  beforeEach(() => {
    calendarEngine = new CalendarEngine(testCalendar);
    eventsManager = new EventsManager(testCalendar, calendarEngine);
  });

  describe('getEventsInRange', () => {
    it('should get all events in January 2024', () => {
      const occurrences = eventsManager.getEventsInRange(2024, 1, 1, 2024, 1, 31);

      expect(occurrences).toHaveLength(1);
      expect(occurrences[0].event.id).toBe('new-year');
      expect(occurrences[0].year).toBe(2024);
      expect(occurrences[0].month).toBe(1);
      expect(occurrences[0].day).toBe(1);
    });

    it('should get all events in full year 2024', () => {
      const occurrences = eventsManager.getEventsInRange(2024, 1, 1, 2024, 12, 31);

      expect(occurrences.length).toBeGreaterThanOrEqual(3); // At least new-year, independence-day, thanksgiving
      const eventIds = occurrences.map(o => o.event.id);
      expect(eventIds).toContain('new-year');
      expect(eventIds).toContain('independence-day');
      expect(eventIds).toContain('thanksgiving');
    });

    it('should respect year ranges on events', () => {
      const calendarWithRanges: SeasonsStarsCalendar = {
        ...testCalendar,
        events: [
          {
            id: 'future-event',
            name: 'Future Event',
            recurrence: { type: 'fixed', month: 6, day: 15 },
            startYear: 2025, // Won't occur in 2024
          },
        ],
      };

      const engine = new CalendarEngine(calendarWithRanges);
      const manager = new EventsManager(calendarWithRanges, engine);

      const occurrences2024 = manager.getEventsInRange(2024, 1, 1, 2024, 12, 31);
      expect(occurrences2024.find(o => o.event.id === 'future-event')).toBeUndefined();

      const occurrences2025 = manager.getEventsInRange(2025, 1, 1, 2025, 12, 31);
      expect(occurrences2025.find(o => o.event.id === 'future-event')).toBeDefined();
    });
  });

  describe('getNextOccurrence', () => {
    it('should get next occurrence of New Year after Dec 15, 2024', () => {
      const next = eventsManager.getNextOccurrence('new-year', 2024, 12, 15);

      expect(next).not.toBeNull();
      expect(next?.year).toBe(2025);
      expect(next?.month).toBe(1);
      expect(next?.day).toBe(1);
    });

    it('should get next occurrence within same year', () => {
      const next = eventsManager.getNextOccurrence('independence-day', 2024, 1, 1);

      expect(next).not.toBeNull();
      expect(next?.year).toBe(2024);
      expect(next?.month).toBe(7);
      expect(next?.day).toBe(4);
    });

    it('should return null for non-existent event', () => {
      const next = eventsManager.getNextOccurrence('non-existent', 2024, 1, 1);
      expect(next).toBeNull();
    });
  });
});
