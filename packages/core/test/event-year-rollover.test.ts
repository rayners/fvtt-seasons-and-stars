/**
 * Tests for Event Year Rollover Edge Case
 *
 * Verifies that events with afterDay recurrence correctly handle year boundaries.
 * When an event in December rolls to January, it should appear in the NEXT year's January.
 *
 * Bug: Event on December 32 (doesn't exist) with afterDay would return January 1
 * but with the SAME year, causing the event to appear in January of the wrong year.
 *
 * Fix: Added yearOffset field to OccurrenceResult to track year boundary crossings.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import { EventsManager } from '../src/core/events-manager';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Test calendar with event that rolls from December to January
const testCalendar: SeasonsStarsCalendar = {
  id: 'test-calendar',
  translations: {
    en: {
      label: 'Test Calendar',
      description: 'Calendar for testing year rollover',
    },
  },
  year: {
    epoch: 0,
    currentYear: 2023,
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
    { name: 'April', days: 30 },
    { name: 'May', days: 31 },
    { name: 'June', days: 30 },
    { name: 'July', days: 31 },
    { name: 'August', days: 31 },
    { name: 'September', days: 30 },
    { name: 'October', days: 31 },
    { name: 'November', days: 30 },
    { name: 'December', days: 31 }, // Last month
  ],
  weekdays: [{ name: 'Monday' }, { name: 'Tuesday' }],
  intercalary: [],
  time: {
    hoursInDay: 24,
    minutesInHour: 60,
    secondsInMinute: 60,
  },
  events: [
    // Event that should roll from December 2023 to January 2024
    {
      id: 'rollover-event',
      name: 'New Year Rollover',
      description: 'Event that crosses year boundary',
      recurrence: {
        type: 'fixed',
        month: 12, // December
        day: 32, // Doesn't exist (December only has 31 days)
        ifDayNotExists: 'afterDay', // Should roll to January 1 of NEXT year
      },
      visibility: 'player-visible',
    },
    // Control: normal event that doesn't roll over
    {
      id: 'normal-event',
      name: 'Normal February Event',
      description: 'Event that rolls within same year',
      recurrence: {
        type: 'fixed',
        month: 2, // February
        day: 30, // Doesn't exist (February only has 28 days)
        ifDayNotExists: 'afterDay', // Should roll to March 1 of SAME year
      },
      visibility: 'player-visible',
    },
  ],
};

describe('Event Year Rollover', () => {
  let calendarEngine: CalendarEngine;
  let eventsManager: EventsManager;

  beforeEach(() => {
    calendarEngine = new CalendarEngine(testCalendar);
    eventsManager = new EventsManager(testCalendar, calendarEngine);
  });

  describe('December to January Year Boundary', () => {
    it('should NOT appear in December of origin year', () => {
      // Check December 31, 2023 - event should NOT appear here
      const dec2023 = eventsManager.getEventsForDate(2023, 12, 31);
      expect(dec2023.find(e => e.event.id === 'rollover-event')).toBeUndefined();
    });

    it('should appear on January 1 every year (from previous December)', () => {
      // Event recurs every year, so January 1, 2023 comes from December 2022
      const jan2023 = eventsManager.getEventsForDate(2023, 1, 1);
      const event = jan2023.find(e => e.event.id === 'rollover-event');

      expect(event).toBeDefined();
      expect(event?.year).toBe(2023);
      expect(event?.month).toBe(1);
      expect(event?.day).toBe(1);
    });

    it('should appear in January of NEXT year', () => {
      // Check January 1, 2024 - event SHOULD appear here
      const jan2024 = eventsManager.getEventsForDate(2024, 1, 1);
      const event = jan2024.find(e => e.event.id === 'rollover-event');

      expect(event).toBeDefined();
      expect(event?.year).toBe(2024);
      expect(event?.month).toBe(1);
      expect(event?.day).toBe(1);
    });

    it('should appear every year on January 1', () => {
      // Event should occur on January 1 every year (after rolling from December)
      const jan2024 = eventsManager.getEventsForDate(2024, 1, 1);
      const jan2025 = eventsManager.getEventsForDate(2025, 1, 1);
      const jan2026 = eventsManager.getEventsForDate(2026, 1, 1);

      expect(jan2024.find(e => e.event.id === 'rollover-event')).toBeDefined();
      expect(jan2025.find(e => e.event.id === 'rollover-event')).toBeDefined();
      expect(jan2026.find(e => e.event.id === 'rollover-event')).toBeDefined();
    });
  });

  describe('Mid-Year Rollover (Control)', () => {
    it('should appear in March of SAME year', () => {
      // Control: February 30 -> March 1 should be SAME year
      const mar2023 = eventsManager.getEventsForDate(2023, 3, 1);
      const event = mar2023.find(e => e.event.id === 'normal-event');

      expect(event).toBeDefined();
      expect(event?.year).toBe(2023);
      expect(event?.month).toBe(3);
      expect(event?.day).toBe(1);
    });

    it('should NOT appear in March of NEXT year', () => {
      // Control: Should NOT roll to next year
      const mar2024 = eventsManager.getEventsForDate(2024, 3, 1);
      const event = mar2024.find(e => e.event.id === 'normal-event');

      // Event SHOULD appear (it recurs every year)
      expect(event).toBeDefined();
      // But verify it's 2024's occurrence, not a rollover from 2023
      expect(event?.year).toBe(2024);
    });
  });

  describe('Year Range Filtering', () => {
    it('should respect startYear with year rollover', () => {
      const calendarWithStartYear: SeasonsStarsCalendar = {
        ...testCalendar,
        events: [
          {
            id: 'limited-rollover',
            name: 'Limited Rollover Event',
            description: 'Only occurs from 2025 onwards',
            recurrence: {
              type: 'fixed',
              month: 12,
              day: 32,
              ifDayNotExists: 'afterDay',
            },
            visibility: 'player-visible',
            startYear: 2025, // Only from 2025 onwards
          },
        ],
      };

      const engine = new CalendarEngine(calendarWithStartYear);
      const manager = new EventsManager(calendarWithStartYear, engine);

      // Should NOT appear in January 2024 (before startYear)
      const jan2024 = manager.getEventsForDate(2024, 1, 1);
      expect(jan2024.find(e => e.event.id === 'limited-rollover')).toBeUndefined();

      // Should NOT appear in January 2025 (rollover from December 2024, before startYear)
      const jan2025 = manager.getEventsForDate(2025, 1, 1);
      expect(jan2025.find(e => e.event.id === 'limited-rollover')).toBeUndefined();

      // SHOULD appear in January 2026 (rollover from December 2025, which is >= startYear)
      const jan2026 = manager.getEventsForDate(2026, 1, 1);
      expect(jan2026.find(e => e.event.id === 'limited-rollover')).toBeDefined();
    });

    it('should respect endYear with year rollover', () => {
      const calendarWithEndYear: SeasonsStarsCalendar = {
        ...testCalendar,
        events: [
          {
            id: 'expiring-rollover',
            name: 'Expiring Rollover Event',
            description: 'Only occurs until 2024',
            recurrence: {
              type: 'fixed',
              month: 12,
              day: 32,
              ifDayNotExists: 'afterDay',
            },
            visibility: 'player-visible',
            endYear: 2024, // Only until 2024
          },
        ],
      };

      const engine = new CalendarEngine(calendarWithEndYear);
      const manager = new EventsManager(calendarWithEndYear, engine);

      // SHOULD appear in January 2024 (rollover from December 2023, which is <= endYear)
      const jan2024 = manager.getEventsForDate(2024, 1, 1);
      expect(jan2024.find(e => e.event.id === 'expiring-rollover')).toBeDefined();

      // SHOULD appear in January 2025 (rollover from December 2024, which is <= endYear)
      const jan2025 = manager.getEventsForDate(2025, 1, 1);
      expect(jan2025.find(e => e.event.id === 'expiring-rollover')).toBeDefined();

      // Should NOT appear in January 2026 (rollover from December 2025, which is > endYear)
      const jan2026 = manager.getEventsForDate(2026, 1, 1);
      expect(jan2026.find(e => e.event.id === 'expiring-rollover')).toBeUndefined();
    });
  });
});
