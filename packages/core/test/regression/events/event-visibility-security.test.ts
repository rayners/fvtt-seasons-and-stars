/**
 * Tests for Event Visibility Security Fix
 *
 * Verifies that the Events API correctly filters events based on visibility
 * settings, preventing players from accessing GM-only events.
 *
 * Bug: Events API returned ALL events regardless of visibility, allowing
 * players to see GM-only events via game.seasonsStars.api.events methods.
 *
 * Fix: Added permission filtering based on event.visibility and game.user.isGM
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../../../src/core/calendar-engine';
import { EventsManager } from '../../../src/core/events-manager';
import { EventsAPI } from '../../../src/core/events-api';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';

// Test calendar with mixed visibility events
const testCalendar: SeasonsStarsCalendar = {
  id: 'test-calendar',
  translations: {
    en: {
      label: 'Test Calendar',
      description: 'Calendar for testing visibility security',
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
  ],
  weekdays: [{ name: 'Monday' }, { name: 'Tuesday' }],
  intercalary: [],
  time: {
    hoursInDay: 24,
    minutesInHour: 60,
    secondsInMinute: 60,
  },
  events: [
    // Player-visible event
    {
      id: 'public-event',
      name: 'Public Event',
      description: 'Everyone can see this',
      recurrence: { type: 'fixed', month: 1, day: 1 },
      visibility: 'player-visible',
    },
    // GM-only event
    {
      id: 'secret-event',
      name: 'Secret Event',
      description: 'Only GMs can see this',
      recurrence: { type: 'fixed', month: 1, day: 1 },
      visibility: 'gm-only',
    },
    // No visibility set (defaults to player-visible)
    {
      id: 'default-event',
      name: 'Default Event',
      description: 'No visibility set',
      recurrence: { type: 'fixed', month: 1, day: 15 },
      // No visibility property
    },
    // Another GM-only event on different date
    {
      id: 'gm-meeting',
      name: 'GM Meeting',
      description: 'Secret GM planning session',
      recurrence: { type: 'fixed', month: 2, day: 1 },
      visibility: 'gm-only',
    },
  ],
};

describe('Event Visibility Security', () => {
  let calendarEngine: CalendarEngine;
  let eventsManager: EventsManager;
  let eventsAPI: EventsAPI;

  beforeEach(() => {
    calendarEngine = new CalendarEngine(testCalendar);
    eventsManager = new EventsManager(testCalendar, calendarEngine);
    eventsAPI = new EventsAPI(() => eventsManager);

    // Mock game global
    globalThis.game = {
      user: {
        isGM: false, // Default to player
      },
    } as never;
  });

  describe('getEventsForDate - Player Access', () => {
    it('should return only player-visible events for players', () => {
      const events = eventsAPI.getEventsForDate(2024, 1, 1);

      expect(events).toHaveLength(1); // Only public-event
      expect(events[0].event.id).toBe('public-event');
      expect(events.find(e => e.event.id === 'secret-event')).toBeUndefined();
    });

    it('should return all events for GMs', () => {
      globalThis.game.user.isGM = true;

      const events = eventsAPI.getEventsForDate(2024, 1, 1);

      expect(events).toHaveLength(2); // Both public-event and secret-event
      expect(events.find(e => e.event.id === 'public-event')).toBeDefined();
      expect(events.find(e => e.event.id === 'secret-event')).toBeDefined();
    });

    it('should include events with no visibility (default player-visible)', () => {
      const events = eventsAPI.getEventsForDate(2024, 1, 15);

      expect(events).toHaveLength(1); // default-event
      expect(events[0].event.id).toBe('default-event');
    });
  });

  describe('getEventsInRange - Player Access', () => {
    it('should filter GM-only events from range results for players', () => {
      const events = eventsAPI.getEventsInRange(2024, 1, 1, 2024, 2, 28);

      // Should get public-event and default-event, but not secret-event or gm-meeting
      expect(events).toHaveLength(2);
      expect(events.find(e => e.event.id === 'public-event')).toBeDefined();
      expect(events.find(e => e.event.id === 'default-event')).toBeDefined();
      expect(events.find(e => e.event.id === 'secret-event')).toBeUndefined();
      expect(events.find(e => e.event.id === 'gm-meeting')).toBeUndefined();
    });

    it('should include all events in range for GMs', () => {
      globalThis.game.user.isGM = true;

      const events = eventsAPI.getEventsInRange(2024, 1, 1, 2024, 2, 28);

      // Should get all 4 events
      expect(events).toHaveLength(4);
      expect(events.find(e => e.event.id === 'public-event')).toBeDefined();
      expect(events.find(e => e.event.id === 'secret-event')).toBeDefined();
      expect(events.find(e => e.event.id === 'default-event')).toBeDefined();
      expect(events.find(e => e.event.id === 'gm-meeting')).toBeDefined();
    });
  });

  describe('getNextOccurrence - Player Access', () => {
    it('should return null for GM-only events when called by players', () => {
      const next = eventsAPI.getNextOccurrence('secret-event', 2023, 12, 31);

      expect(next).toBeNull(); // Player cannot see GM-only event
    });

    it('should return occurrence for player-visible events', () => {
      const next = eventsAPI.getNextOccurrence('public-event', 2023, 12, 31);

      expect(next).not.toBeNull();
      expect(next?.event.id).toBe('public-event');
      expect(next?.year).toBe(2024);
      expect(next?.month).toBe(1);
      expect(next?.day).toBe(1);
    });

    it('should return GM-only event occurrence for GMs', () => {
      globalThis.game.user.isGM = true;

      const next = eventsAPI.getNextOccurrence('secret-event', 2023, 12, 31);

      expect(next).not.toBeNull();
      expect(next?.event.id).toBe('secret-event');
    });
  });

  describe('hasEventsOnDate - Player Access', () => {
    it('should return true when player-visible events exist', () => {
      const hasEvents = eventsAPI.hasEventsOnDate(2024, 1, 15); // default-event

      expect(hasEvents).toBe(true);
    });

    it('should return false when only GM-only events exist for players', () => {
      const hasEvents = eventsAPI.hasEventsOnDate(2024, 2, 1); // gm-meeting (GM-only)

      expect(hasEvents).toBe(false); // Player cannot see it
    });

    it('should return true when GM-only events exist for GMs', () => {
      globalThis.game.user.isGM = true;

      const hasEvents = eventsAPI.hasEventsOnDate(2024, 2, 1); // gm-meeting (GM-only)

      expect(hasEvents).toBe(true);
    });

    it('should return true when mixed visibility events exist for players', () => {
      const hasEvents = eventsAPI.hasEventsOnDate(2024, 1, 1); // public-event + secret-event

      expect(hasEvents).toBe(true); // At least one player-visible event
    });
  });

  describe('getAllEvents - Player Access', () => {
    it('should return only player-visible events for players', () => {
      const events = eventsAPI.getAllEvents();

      expect(events).toHaveLength(2); // public-event and default-event
      expect(events.find(e => e.id === 'public-event')).toBeDefined();
      expect(events.find(e => e.id === 'default-event')).toBeDefined();
      expect(events.find(e => e.id === 'secret-event')).toBeUndefined();
      expect(events.find(e => e.id === 'gm-meeting')).toBeUndefined();
    });

    it('should return all events for GMs', () => {
      globalThis.game.user.isGM = true;

      const events = eventsAPI.getAllEvents();

      expect(events).toHaveLength(4);
      expect(events.find(e => e.id === 'public-event')).toBeDefined();
      expect(events.find(e => e.id === 'secret-event')).toBeDefined();
      expect(events.find(e => e.id === 'default-event')).toBeDefined();
      expect(events.find(e => e.id === 'gm-meeting')).toBeDefined();
    });
  });

  describe('getEvent - Player Access', () => {
    it('should return player-visible event for players', () => {
      const event = eventsAPI.getEvent('public-event');

      expect(event).not.toBeNull();
      expect(event?.id).toBe('public-event');
    });

    it('should return null for GM-only event when called by players', () => {
      const event = eventsAPI.getEvent('secret-event');

      expect(event).toBeNull(); // Player cannot see GM-only event
    });

    it('should return GM-only event for GMs', () => {
      globalThis.game.user.isGM = true;

      const event = eventsAPI.getEvent('secret-event');

      expect(event).not.toBeNull();
      expect(event?.id).toBe('secret-event');
    });

    it('should return event with no visibility (default player-visible)', () => {
      const event = eventsAPI.getEvent('default-event');

      expect(event).not.toBeNull();
      expect(event?.id).toBe('default-event');
    });
  });

  describe('Security Verification', () => {
    it('prevents information disclosure via direct API calls', () => {
      // Simulate malicious player trying to access GM-only event
      globalThis.game.user.isGM = false;

      // Try various methods to access the secret event
      const byId = eventsAPI.getEvent('secret-event');
      const byDate = eventsAPI.getEventsForDate(2024, 1, 1);
      const byRange = eventsAPI.getEventsInRange(2024, 1, 1, 2024, 1, 1);
      const allEvents = eventsAPI.getAllEvents();
      const nextOccurrence = eventsAPI.getNextOccurrence('secret-event', 2023, 12, 31);

      // All methods should deny access
      expect(byId).toBeNull();
      expect(byDate.find(e => e.event.id === 'secret-event')).toBeUndefined();
      expect(byRange.find(e => e.event.id === 'secret-event')).toBeUndefined();
      expect(allEvents.find(e => e.id === 'secret-event')).toBeUndefined();
      expect(nextOccurrence).toBeNull();
    });

    it('allows GMs full access to all events', () => {
      globalThis.game.user.isGM = true;

      // GM should have access to everything
      const byId = eventsAPI.getEvent('secret-event');
      const byDate = eventsAPI.getEventsForDate(2024, 1, 1);
      const byRange = eventsAPI.getEventsInRange(2024, 1, 1, 2024, 1, 1);
      const allEvents = eventsAPI.getAllEvents();
      const nextOccurrence = eventsAPI.getNextOccurrence('secret-event', 2023, 12, 31);

      // All methods should return the GM-only event
      expect(byId?.id).toBe('secret-event');
      expect(byDate.find(e => e.event.id === 'secret-event')).toBeDefined();
      expect(byRange.find(e => e.event.id === 'secret-event')).toBeDefined();
      expect(allEvents.find(e => e.id === 'secret-event')).toBeDefined();
      expect(nextOccurrence?.event.id).toBe('secret-event');
    });
  });
});
