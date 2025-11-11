/**
 * Tests for EventsAPI Wrapper
 *
 * Tests the public API wrapper that exposes event functionality to external modules.
 * This wrapper provides GM-only operations, permission checks, and Foundry integration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventsAPI } from '../../../src/core/events-api';
import { EventsManager } from '../../../src/core/events-manager';
import { CalendarEngine } from '../../../src/core/calendar-engine';
import type { SeasonsStarsCalendar, CalendarEvent } from '../../../src/types/calendar';

// Mock calendar with events
const testCalendar: SeasonsStarsCalendar = {
  id: 'test-calendar',
  translations: {
    en: { label: 'Test Calendar', description: 'Test', setting: 'Test' },
  },
  year: { epoch: 2024, currentYear: 2024, prefix: '', suffix: '', startDay: 1 },
  leapYear: { rule: 'gregorian', month: 'February', extraDays: 1 },
  months: [
    { name: 'January', days: 31 },
    { name: 'February', days: 28 },
    { name: 'March', days: 31 },
    { name: 'April', days: 30 },
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
  time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
  events: [
    {
      id: 'new-year',
      name: "New Year's Day",
      description: 'Start of the year',
      recurrence: { type: 'fixed', month: 1, day: 1 },
      visibility: 'player-visible',
      color: '#ff0000',
    },
    {
      id: 'spring-fest',
      name: 'Spring Festival',
      recurrence: { type: 'fixed', month: 3, day: 15 },
      visibility: 'gm-only',
      journalEntryId: 'JournalEntry.abc123',
    },
  ],
};

describe('EventsAPI Wrapper', () => {
  let eventsAPI: EventsAPI;
  let eventsManager: EventsManager;
  let calendarEngine: CalendarEngine;

  beforeEach(() => {
    calendarEngine = new CalendarEngine(testCalendar);
    eventsManager = new EventsManager(testCalendar, calendarEngine);
    eventsAPI = new EventsAPI(() => eventsManager);

    // Reset global mocks
    globalThis.game = {
      user: { id: 'user1', isGM: false },
      settings: {
        get: vi.fn(),
        set: vi.fn(),
      },
    } as never;

    globalThis.Hooks = {
      callAll: vi.fn(),
    } as never;

    globalThis.CONST = {
      DOCUMENT_OWNERSHIP_LEVELS: {
        NONE: 0,
        LIMITED: 1,
        OBSERVER: 2,
        OWNER: 3,
      },
    } as never;
  });

  describe('getEventsForDate', () => {
    it('should return events for a specific date', () => {
      const events = eventsAPI.getEventsForDate(2024, 1, 1);
      expect(events).toHaveLength(1);
      expect(events[0].event.id).toBe('new-year');
      expect(events[0].year).toBe(2024);
      expect(events[0].month).toBe(1);
      expect(events[0].day).toBe(1);
    });

    it('should return empty array when manager not initialized', () => {
      const apiWithoutManager = new EventsAPI(() => null);
      const events = apiWithoutManager.getEventsForDate(2024, 1, 1);
      expect(events).toEqual([]);
    });

    it('should return empty array for date with no events', () => {
      const events = eventsAPI.getEventsForDate(2024, 2, 15);
      expect(events).toEqual([]);
    });
  });

  describe('getEventsInRange', () => {
    it('should return only player-visible events for players', () => {
      const occurrences = eventsAPI.getEventsInRange(2024, 1, 1, 2024, 3, 31);
      expect(occurrences.length).toBeGreaterThan(0);
      const eventIds = occurrences.map(o => o.event.id);
      expect(eventIds).toContain('new-year');
      expect(eventIds).not.toContain('spring-fest'); // GM-only event filtered out
    });

    it('should return empty array when manager not initialized', () => {
      const apiWithoutManager = new EventsAPI(() => null);
      const occurrences = apiWithoutManager.getEventsInRange(2024, 1, 1, 2024, 3, 31);
      expect(occurrences).toEqual([]);
    });
  });

  describe('getNextOccurrence', () => {
    it('should find next occurrence of an event', () => {
      const next = eventsAPI.getNextOccurrence('new-year', 2024, 6, 15);
      expect(next).not.toBeNull();
      expect(next?.year).toBe(2025);
      expect(next?.month).toBe(1);
      expect(next?.day).toBe(1);
    });

    it('should return null when manager not initialized', () => {
      const apiWithoutManager = new EventsAPI(() => null);
      const next = apiWithoutManager.getNextOccurrence('new-year', 2024, 6, 15);
      expect(next).toBeNull();
    });

    it('should return null for non-existent event', () => {
      const next = eventsAPI.getNextOccurrence('nonexistent', 2024, 6, 15);
      expect(next).toBeNull();
    });
  });

  describe('hasEventsOnDate', () => {
    it('should return true for date with events', () => {
      expect(eventsAPI.hasEventsOnDate(2024, 1, 1)).toBe(true);
    });

    it('should return false for date without events', () => {
      expect(eventsAPI.hasEventsOnDate(2024, 2, 15)).toBe(false);
    });

    it('should return false when manager not initialized', () => {
      const apiWithoutManager = new EventsAPI(() => null);
      expect(apiWithoutManager.hasEventsOnDate(2024, 1, 1)).toBe(false);
    });
  });

  describe('getAllEvents', () => {
    it('should return only player-visible events for players', () => {
      const events = eventsAPI.getAllEvents();
      expect(events).toHaveLength(1); // Only new-year (player-visible)
      expect(events.map(e => e.id)).toContain('new-year');
      expect(events.map(e => e.id)).not.toContain('spring-fest'); // GM-only filtered out
    });

    it('should return empty array when manager not initialized', () => {
      const apiWithoutManager = new EventsAPI(() => null);
      const events = apiWithoutManager.getAllEvents();
      expect(events).toEqual([]);
    });
  });

  describe('getEvent', () => {
    it('should return event by ID', () => {
      const event = eventsAPI.getEvent('new-year');
      expect(event).not.toBeNull();
      expect(event?.name).toBe("New Year's Day");
    });

    it('should return null for non-existent event', () => {
      const event = eventsAPI.getEvent('nonexistent');
      expect(event).toBeNull();
    });

    it('should return null when manager not initialized', () => {
      const apiWithoutManager = new EventsAPI(() => null);
      const event = apiWithoutManager.getEvent('new-year');
      expect(event).toBeNull();
    });
  });

  describe('setWorldEvent - GM Operations', () => {
    beforeEach(() => {
      globalThis.game = {
        user: { id: 'user1', isGM: true },
        settings: {
          get: vi.fn().mockReturnValue({ events: [], disabledEventIds: [] }),
          set: vi.fn().mockResolvedValue(undefined),
        },
      } as never;
    });

    it('should allow GM to add new world event', async () => {
      const newEvent: CalendarEvent = {
        id: 'custom-event',
        name: 'Custom Event',
        recurrence: { type: 'fixed', month: 2, day: 14 },
      };

      await eventsAPI.setWorldEvent(newEvent);

      expect(game.settings?.set).toHaveBeenCalledWith(
        'seasons-and-stars',
        'worldEvents',
        expect.objectContaining({
          events: expect.arrayContaining([expect.objectContaining({ id: 'custom-event' })]),
        })
      );
    });

    it('should allow GM to update existing world event', async () => {
      globalThis.game.settings = {
        get: vi.fn().mockReturnValue({
          events: [
            {
              id: 'existing-event',
              name: 'Old Name',
              recurrence: { type: 'fixed', month: 1, day: 1 },
            },
          ],
          disabledEventIds: [],
        }),
        set: vi.fn().mockResolvedValue(undefined),
      } as never;

      const updatedEvent: CalendarEvent = {
        id: 'existing-event',
        name: 'New Name',
        recurrence: { type: 'fixed', month: 1, day: 1 },
      };

      await eventsAPI.setWorldEvent(updatedEvent);

      expect(game.settings?.set).toHaveBeenCalledWith(
        'seasons-and-stars',
        'worldEvents',
        expect.objectContaining({
          events: [expect.objectContaining({ id: 'existing-event', name: 'New Name' })],
        })
      );
    });

    it('should fire worldEventsChanged hook after update', async () => {
      const newEvent: CalendarEvent = {
        id: 'hook-test',
        name: 'Hook Test',
        recurrence: { type: 'fixed', month: 1, day: 1 },
      };

      await eventsAPI.setWorldEvent(newEvent);

      expect(Hooks.callAll).toHaveBeenCalledWith(
        'seasons-stars:worldEventsChanged',
        expect.any(Object)
      );
    });

    it('should throw error if not GM', async () => {
      globalThis.game.user = { id: 'user1', isGM: false } as never;

      const newEvent: CalendarEvent = {
        id: 'forbidden',
        name: 'Forbidden',
        recurrence: { type: 'fixed', month: 1, day: 1 },
      };

      await expect(eventsAPI.setWorldEvent(newEvent)).rejects.toThrow(
        'Only GMs can modify world events'
      );
    });
  });

  describe('removeWorldEvent - GM Operations', () => {
    beforeEach(() => {
      globalThis.game = {
        user: { id: 'user1', isGM: true },
        settings: {
          get: vi.fn().mockReturnValue({
            events: [
              { id: 'event1', name: 'Event 1', recurrence: { type: 'fixed', month: 1, day: 1 } },
              { id: 'event2', name: 'Event 2', recurrence: { type: 'fixed', month: 2, day: 1 } },
            ],
            disabledEventIds: [],
          }),
          set: vi.fn().mockResolvedValue(undefined),
        },
      } as never;
    });

    it('should allow GM to remove world event', async () => {
      await eventsAPI.removeWorldEvent('event1');

      expect(game.settings?.set).toHaveBeenCalledWith(
        'seasons-and-stars',
        'worldEvents',
        expect.objectContaining({
          events: expect.not.arrayContaining([expect.objectContaining({ id: 'event1' })]),
        })
      );
    });

    it('should throw error if not GM', async () => {
      globalThis.game.user = { id: 'user1', isGM: false } as never;
      await expect(eventsAPI.removeWorldEvent('event1')).rejects.toThrow(
        'Only GMs can modify world events'
      );
    });
  });

  describe('disableCalendarEvent - GM Operations', () => {
    beforeEach(() => {
      globalThis.game = {
        user: { id: 'user1', isGM: true },
        settings: {
          get: vi.fn().mockReturnValue({ events: [], disabledEventIds: [] }),
          set: vi.fn().mockResolvedValue(undefined),
        },
      } as never;
    });

    it('should allow GM to disable calendar event', async () => {
      await eventsAPI.disableCalendarEvent('new-year');

      expect(game.settings?.set).toHaveBeenCalledWith(
        'seasons-and-stars',
        'worldEvents',
        expect.objectContaining({
          disabledEventIds: expect.arrayContaining(['new-year']),
        })
      );
    });

    it('should not add duplicate to disabledEventIds', async () => {
      globalThis.game.settings = {
        get: vi.fn().mockReturnValue({ events: [], disabledEventIds: ['new-year'] }),
        set: vi.fn().mockResolvedValue(undefined),
      } as never;

      await eventsAPI.disableCalendarEvent('new-year');

      expect(game.settings?.set).not.toHaveBeenCalled();
    });

    it('should throw error if not GM', async () => {
      globalThis.game.user = { id: 'user1', isGM: false } as never;
      await expect(eventsAPI.disableCalendarEvent('new-year')).rejects.toThrow(
        'Only GMs can modify world events'
      );
    });
  });

  describe('enableCalendarEvent - GM Operations', () => {
    beforeEach(() => {
      globalThis.game = {
        user: { id: 'user1', isGM: true },
        settings: {
          get: vi
            .fn()
            .mockReturnValue({ events: [], disabledEventIds: ['new-year', 'spring-fest'] }),
          set: vi.fn().mockResolvedValue(undefined),
        },
      } as never;
    });

    it('should allow GM to enable calendar event', async () => {
      await eventsAPI.enableCalendarEvent('new-year');

      expect(game.settings?.set).toHaveBeenCalledWith(
        'seasons-and-stars',
        'worldEvents',
        expect.objectContaining({
          disabledEventIds: expect.not.arrayContaining(['new-year']),
        })
      );
    });

    it('should throw error if not GM', async () => {
      globalThis.game.user = { id: 'user1', isGM: false } as never;
      await expect(eventsAPI.enableCalendarEvent('new-year')).rejects.toThrow(
        'Only GMs can modify world events'
      );
    });
  });

  describe('getEventJournal', () => {
    beforeEach(() => {
      globalThis.game = {
        user: { id: 'user1', isGM: false },
      } as never;

      const mockJournal = {
        ownership: { default: 2, user1: 3 },
      };

      (globalThis as any).fromUuidSync = vi.fn().mockReturnValue(mockJournal);
    });

    it('should return journal for event with journalEntryId (GM access)', () => {
      // Need to be GM to see spring-fest (GM-only event)
      globalThis.game.user.isGM = true;

      const journal = eventsAPI.getEventJournal('spring-fest');
      expect(journal).not.toBeNull();
    });

    it('should return null for event without journalEntryId', () => {
      const journal = eventsAPI.getEventJournal('new-year');
      expect(journal).toBeNull();
    });

    it('should return null for non-existent event', () => {
      const journal = eventsAPI.getEventJournal('nonexistent');
      expect(journal).toBeNull();
    });

    it('should allow GM to view any journal', () => {
      globalThis.game = {
        user: { id: 'user1', isGM: true },
      } as never;

      const mockJournal = {
        ownership: { default: 0 },
      };

      (globalThis as any).fromUuidSync = vi.fn().mockReturnValue(mockJournal);

      const journal = eventsAPI.getEventJournal('spring-fest');
      expect(journal).not.toBeNull();
    });

    it('should return null if user lacks permission', () => {
      const mockJournal = {
        ownership: { default: 0 },
      };

      (globalThis as any).fromUuidSync = vi.fn().mockReturnValue(mockJournal);

      const journal = eventsAPI.getEventJournal('spring-fest');
      expect(journal).toBeNull();
    });
  });

  describe('setEventJournal - GM Operations', () => {
    beforeEach(() => {
      globalThis.game = {
        user: { id: 'user1', isGM: true },
        settings: {
          get: vi.fn().mockReturnValue({ events: [], disabledEventIds: [] }),
          set: vi.fn().mockResolvedValue(undefined),
        },
      } as never;
    });

    it('should allow GM to link journal to event', async () => {
      await eventsAPI.setEventJournal('new-year', 'JournalEntry.xyz789');

      expect(game.settings?.set).toHaveBeenCalledWith(
        'seasons-and-stars',
        'worldEvents',
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({
              id: 'new-year',
              journalEntryId: 'JournalEntry.xyz789',
            }),
          ]),
        })
      );
    });

    it('should throw error for non-existent event', async () => {
      await expect(eventsAPI.setEventJournal('nonexistent', 'JournalEntry.xyz')).rejects.toThrow(
        'Event nonexistent not found'
      );
    });

    it('should throw error if not GM', async () => {
      globalThis.game.user = { id: 'user1', isGM: false } as never;
      await expect(eventsAPI.setEventJournal('new-year', 'JournalEntry.xyz')).rejects.toThrow(
        'Only GMs can modify event journals'
      );
    });
  });

  describe('clearEventJournal - GM Operations', () => {
    beforeEach(() => {
      globalThis.game = {
        user: { id: 'user1', isGM: true },
        settings: {
          get: vi.fn().mockReturnValue({ events: [], disabledEventIds: [] }),
          set: vi.fn().mockResolvedValue(undefined),
        },
      } as never;
    });

    it('should allow GM to clear journal from event', async () => {
      await eventsAPI.clearEventJournal('spring-fest');

      expect(game.settings?.set).toHaveBeenCalledWith(
        'seasons-and-stars',
        'worldEvents',
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({
              id: 'spring-fest',
              journalEntryId: undefined,
            }),
          ]),
        })
      );
    });

    it('should throw error for non-existent event', async () => {
      await expect(eventsAPI.clearEventJournal('nonexistent')).rejects.toThrow(
        'Event nonexistent not found'
      );
    });

    it('should throw error if not GM', async () => {
      globalThis.game.user = { id: 'user1', isGM: false } as never;
      await expect(eventsAPI.clearEventJournal('spring-fest')).rejects.toThrow(
        'Only GMs can modify event journals'
      );
    });
  });
});
