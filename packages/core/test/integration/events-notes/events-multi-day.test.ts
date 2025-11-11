import { describe, it, expect, beforeEach } from 'vitest';
import { EventsManager } from '../../../src/core/events-manager';
import { CalendarEngine } from '../../../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';

const testCalendar: SeasonsStarsCalendar = {
  id: 'test-calendar',
  translations: {
    en: {
      label: 'Test Calendar',
      description: 'Test calendar with multi-day events',
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
      id: 'single-day-event',
      name: 'Single Day Event',
      description: 'Event with default duration (1 day)',
      recurrence: { type: 'fixed', month: 1, day: 15 },
      visibility: 'player-visible',
    },
    {
      id: 'three-day-festival',
      name: 'Three Day Festival',
      description: 'Festival spanning 3 days',
      recurrence: { type: 'fixed', month: 3, day: 10 },
      duration: '3d',
      visibility: 'player-visible',
    },
    {
      id: 'week-long-celebration',
      name: 'Week Long Celebration',
      description: 'Celebration spanning 7 days',
      recurrence: { type: 'fixed', month: 7, day: 1 },
      duration: '7d',
      visibility: 'player-visible',
    },
    {
      id: 'two-hour-event',
      name: 'Two Hour Event',
      description: 'Short event lasting 2 hours',
      recurrence: { type: 'fixed', month: 5, day: 20 },
      startTime: '14:00:00',
      duration: '2h',
      visibility: 'player-visible',
    },
    {
      id: 'instant-event',
      name: 'Instant Event',
      description: 'Zero-duration event (specific moment)',
      recurrence: { type: 'fixed', month: 6, day: 21 },
      startTime: '12:00:00',
      duration: '0s',
      visibility: 'player-visible',
    },
    {
      id: 'month-boundary-event',
      name: 'Month Boundary Event',
      description: 'Event that crosses month boundary',
      recurrence: { type: 'fixed', month: 1, day: 30 },
      duration: '5d',
      visibility: 'player-visible',
    },
    {
      id: 'year-boundary-event',
      name: 'Year Boundary Event',
      description: 'Event that crosses year boundary',
      recurrence: { type: 'fixed', month: 12, day: 30 },
      duration: '5d',
      visibility: 'player-visible',
    },
  ],
};

describe('EventsManager - Multi-day Events', () => {
  let eventsManager: EventsManager;
  let calendarEngine: CalendarEngine;

  beforeEach(() => {
    calendarEngine = new CalendarEngine(testCalendar);
    eventsManager = new EventsManager(testCalendar, calendarEngine);
  });

  describe('getEventsForDate - single day events', () => {
    it('should return single-day event only on its start date', () => {
      const eventsOnStart = eventsManager.getEventsForDate(2024, 1, 15);
      expect(eventsOnStart).toHaveLength(1);
      expect(eventsOnStart[0].event.id).toBe('single-day-event');

      const eventsDayAfter = eventsManager.getEventsForDate(2024, 1, 16);
      expect(eventsDayAfter).toHaveLength(0);
    });
  });

  describe('getEventsForDate - multi-day events', () => {
    it('should return three-day event on all three days', () => {
      const day1 = eventsManager.getEventsForDate(2024, 3, 10);
      expect(day1).toHaveLength(1);
      expect(day1[0].event.id).toBe('three-day-festival');

      const day2 = eventsManager.getEventsForDate(2024, 3, 11);
      expect(day2).toHaveLength(1);
      expect(day2[0].event.id).toBe('three-day-festival');

      const day3 = eventsManager.getEventsForDate(2024, 3, 12);
      expect(day3).toHaveLength(1);
      expect(day3[0].event.id).toBe('three-day-festival');

      const dayBefore = eventsManager.getEventsForDate(2024, 3, 9);
      expect(dayBefore).toHaveLength(0);

      const dayAfter = eventsManager.getEventsForDate(2024, 3, 13);
      expect(dayAfter).toHaveLength(0);
    });

    it('should return week-long event on all seven days', () => {
      for (let day = 1; day <= 7; day++) {
        const events = eventsManager.getEventsForDate(2024, 7, day);
        expect(events).toHaveLength(1);
        expect(events[0].event.id).toBe('week-long-celebration');
      }

      const dayBefore = eventsManager.getEventsForDate(2024, 6, 30);
      expect(dayBefore).toHaveLength(0);

      const dayAfter = eventsManager.getEventsForDate(2024, 7, 8);
      expect(dayAfter).toHaveLength(0);
    });
  });

  describe('getEventsForDate - sub-day events', () => {
    it('should return two-hour event only on its start date', () => {
      const eventsOnDay = eventsManager.getEventsForDate(2024, 5, 20);
      expect(eventsOnDay).toHaveLength(1);
      expect(eventsOnDay[0].event.id).toBe('two-hour-event');

      const dayAfter = eventsManager.getEventsForDate(2024, 5, 21);
      expect(dayAfter).toHaveLength(0);
    });

    it('should return instant event only on its start date', () => {
      const eventsOnDay = eventsManager.getEventsForDate(2024, 6, 21);
      expect(eventsOnDay).toHaveLength(1);
      expect(eventsOnDay[0].event.id).toBe('instant-event');

      const dayAfter = eventsManager.getEventsForDate(2024, 6, 22);
      expect(dayAfter).toHaveLength(0);
    });
  });

  describe('getEventsForDate - boundary crossing', () => {
    it('should handle events crossing month boundary', () => {
      const jan30 = eventsManager.getEventsForDate(2024, 1, 30);
      expect(jan30).toHaveLength(1);
      expect(jan30[0].event.id).toBe('month-boundary-event');

      const jan31 = eventsManager.getEventsForDate(2024, 1, 31);
      expect(jan31).toHaveLength(1);
      expect(jan31[0].event.id).toBe('month-boundary-event');

      const feb1 = eventsManager.getEventsForDate(2024, 2, 1);
      expect(feb1).toHaveLength(1);
      expect(feb1[0].event.id).toBe('month-boundary-event');

      const feb2 = eventsManager.getEventsForDate(2024, 2, 2);
      expect(feb2).toHaveLength(1);
      expect(feb2[0].event.id).toBe('month-boundary-event');

      const feb3 = eventsManager.getEventsForDate(2024, 2, 3);
      expect(feb3).toHaveLength(1);
      expect(feb3[0].event.id).toBe('month-boundary-event');

      const feb4 = eventsManager.getEventsForDate(2024, 2, 4);
      expect(feb4).toHaveLength(0);
    });

    it('should handle events crossing year boundary', () => {
      const dec30 = eventsManager.getEventsForDate(2024, 12, 30);
      expect(dec30).toHaveLength(1);
      expect(dec30[0].event.id).toBe('year-boundary-event');

      const dec31 = eventsManager.getEventsForDate(2024, 12, 31);
      expect(dec31).toHaveLength(1);
      expect(dec31[0].event.id).toBe('year-boundary-event');

      const jan1 = eventsManager.getEventsForDate(2025, 1, 1);
      expect(jan1).toHaveLength(1);
      expect(jan1[0].event.id).toBe('year-boundary-event');

      const jan2 = eventsManager.getEventsForDate(2025, 1, 2);
      expect(jan2).toHaveLength(1);
      expect(jan2[0].event.id).toBe('year-boundary-event');

      const jan3 = eventsManager.getEventsForDate(2025, 1, 3);
      expect(jan3).toHaveLength(1);
      expect(jan3[0].event.id).toBe('year-boundary-event');

      const jan4 = eventsManager.getEventsForDate(2025, 1, 4);
      expect(jan4).toHaveLength(0);
    });
  });

  describe('getEventsInRange - multi-day events', () => {
    it('should include multi-day event when range overlaps event duration', () => {
      const events = eventsManager.getEventsInRange(2024, 3, 11, 2024, 3, 11);
      const threeDay = events.find(e => e.event.id === 'three-day-festival');
      expect(threeDay).toBeDefined();
    });

    it('should include multi-day event when range is within event duration', () => {
      const events = eventsManager.getEventsInRange(2024, 3, 11, 2024, 3, 12);
      const threeDay = events.find(e => e.event.id === 'three-day-festival');
      expect(threeDay).toBeDefined();
    });

    it('should include multi-day event when range encompasses event', () => {
      const events = eventsManager.getEventsInRange(2024, 3, 9, 2024, 3, 13);
      const threeDay = events.find(e => e.event.id === 'three-day-festival');
      expect(threeDay).toBeDefined();
    });

    it('should not include multi-day event when range is entirely before event', () => {
      const events = eventsManager.getEventsInRange(2024, 3, 1, 2024, 3, 9);
      const threeDay = events.find(e => e.event.id === 'three-day-festival');
      expect(threeDay).toBeUndefined();
    });

    it('should not include multi-day event when range is entirely after event', () => {
      const events = eventsManager.getEventsInRange(2024, 3, 13, 2024, 3, 20);
      const threeDay = events.find(e => e.event.id === 'three-day-festival');
      expect(threeDay).toBeUndefined();
    });

    it('should include event when range overlaps with year-boundary event', () => {
      const events = eventsManager.getEventsInRange(2024, 12, 31, 2025, 1, 1);
      const yearBoundary = events.find(e => e.event.id === 'year-boundary-event');
      expect(yearBoundary).toBeDefined();
    });

    it('should not return duplicate events when event spans multiple years in range', () => {
      const events = eventsManager.getEventsInRange(2024, 12, 1, 2025, 1, 31);
      const yearBoundaryEvents = events.filter(e => e.event.id === 'year-boundary-event');
      expect(yearBoundaryEvents).toHaveLength(1);
    });

    it('should include events starting in previous year that overlap range start', () => {
      const events = eventsManager.getEventsInRange(2025, 1, 1, 2025, 1, 5);
      const yearBoundary = events.find(e => e.event.id === 'year-boundary-event');
      expect(yearBoundary).toBeDefined();
      expect(yearBoundary?.year).toBe(2024);
      expect(yearBoundary?.month).toBe(12);
      expect(yearBoundary?.day).toBe(30);
    });

    it('should include events starting in previous year for February queries', () => {
      const events = eventsManager.getEventsInRange(2025, 2, 1, 2025, 2, 5);
      const jan30Event = events.find(e => e.event.id === 'month-boundary-event');
      expect(jan30Event).toBeDefined();
      expect(jan30Event?.year).toBe(2025);
      expect(jan30Event?.month).toBe(1);
      expect(jan30Event?.day).toBe(30);
    });
  });
});
