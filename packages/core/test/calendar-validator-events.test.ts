/**
 * Tests for CalendarValidator event validation
 *
 * Ensures that the calendar validator properly validates event definitions
 * in calendar JSON for use with the calendar builder and other tools.
 */

import { describe, it, expect } from 'vitest';
import { CalendarValidator } from '../src/core/calendar-validator';

describe('CalendarValidator - Events Support', () => {
  const baseCalendar = {
    id: 'test-calendar',
    translations: {
      en: {
        label: 'Test Calendar',
      },
    },
    months: [
      { name: 'January', days: 31 },
      { name: 'February', days: 28 },
    ],
    weekdays: [{ name: 'Monday' }, { name: 'Tuesday' }],
    time: {
      hoursInDay: 24,
      minutesInHour: 60,
      secondsInMinute: 60,
    },
  };

  describe('Valid Event Definitions', () => {
    it('should accept calendar with valid fixed event', async () => {
      const calendar = {
        ...baseCalendar,
        events: [
          {
            id: 'new-year',
            name: "New Year's Day",
            description: 'Celebration of the start of the new year',
            recurrence: { type: 'fixed', month: 1, day: 1 },
            visibility: 'player-visible',
            color: '#4CAF50',
            icon: 'fas fa-champagne-glasses',
          },
        ],
      };

      const result = await CalendarValidator.validate(calendar);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept calendar with ordinal event', async () => {
      const calendar = {
        ...baseCalendar,
        events: [
          {
            id: 'us-thanksgiving',
            name: 'Thanksgiving (US)',
            description: 'Fourth Thursday of November',
            recurrence: {
              type: 'ordinal',
              month: 11,
              occurrence: 4,
              weekday: 3,
            },
          },
        ],
      };

      const result = await CalendarValidator.validate(calendar);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept calendar with interval event', async () => {
      const calendar = {
        ...baseCalendar,
        events: [
          {
            id: 'olympic-games',
            name: 'Summer Olympic Games',
            description: 'International multi-sport event',
            recurrence: {
              type: 'interval',
              intervalYears: 4,
              anchorYear: 2024,
              month: 7,
              day: 26,
            },
          },
        ],
      };

      const result = await CalendarValidator.validate(calendar);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept calendar with event startTime and duration', async () => {
      const calendar = {
        ...baseCalendar,
        events: [
          {
            id: 'midnight-feast',
            name: 'Midnight Feast',
            recurrence: { type: 'fixed', month: 1, day: 1 },
            startTime: '23:30:00',
            duration: '2h',
          },
        ],
      };

      const result = await CalendarValidator.validate(calendar);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept calendar with event year range', async () => {
      const calendar = {
        ...baseCalendar,
        events: [
          {
            id: 'limited-event',
            name: 'Limited Time Event',
            recurrence: { type: 'fixed', month: 1, day: 1 },
            startYear: 2020,
            endYear: 2030,
          },
        ],
      };

      const result = await CalendarValidator.validate(calendar);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept calendar with event exceptions', async () => {
      const calendar = {
        ...baseCalendar,
        events: [
          {
            id: 'holiday',
            name: 'Holiday',
            recurrence: { type: 'fixed', month: 1, day: 1 },
            exceptions: [
              { year: 2020, type: 'skip' },
              { year: 2021, type: 'move', moveToMonth: 1, moveToDay: 2 },
            ],
          },
        ],
      };

      const result = await CalendarValidator.validate(calendar);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept calendar with event translations', async () => {
      const calendar = {
        ...baseCalendar,
        events: [
          {
            id: 'new-year',
            name: "New Year's Day",
            recurrence: { type: 'fixed', month: 1, day: 1 },
            translations: {
              en: {
                name: "New Year's Day",
                description: 'Start of the new year',
              },
              es: {
                name: 'Año Nuevo',
                description: 'Inicio del año nuevo',
              },
            },
          },
        ],
      };

      const result = await CalendarValidator.validate(calendar);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept calendar with gm-only event', async () => {
      const calendar = {
        ...baseCalendar,
        events: [
          {
            id: 'secret-event',
            name: 'Secret Plot Unfolds',
            description: 'Players should not know about this',
            recurrence: { type: 'fixed', month: 1, day: 15 },
            visibility: 'gm-only',
          },
        ],
      };

      const result = await CalendarValidator.validate(calendar);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Invalid Event Definitions', () => {
    it('should reject event missing required id', async () => {
      const calendar = {
        ...baseCalendar,
        events: [
          {
            name: 'Event Name',
            recurrence: { type: 'fixed', month: 1, day: 1 },
          },
        ],
      };

      const result = await CalendarValidator.validate(calendar);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject event missing required name', async () => {
      const calendar = {
        ...baseCalendar,
        events: [
          {
            id: 'test-event',
            recurrence: { type: 'fixed', month: 1, day: 1 },
          },
        ],
      };

      const result = await CalendarValidator.validate(calendar);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject event missing required recurrence', async () => {
      const calendar = {
        ...baseCalendar,
        events: [
          {
            id: 'test-event',
            name: 'Test Event',
          },
        ],
      };

      const result = await CalendarValidator.validate(calendar);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject event with invalid recurrence type', async () => {
      const calendar = {
        ...baseCalendar,
        events: [
          {
            id: 'test-event',
            name: 'Test Event',
            recurrence: { type: 'invalid-type', month: 1, day: 1 },
          },
        ],
      };

      const result = await CalendarValidator.validate(calendar);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject event with invalid visibility', async () => {
      const calendar = {
        ...baseCalendar,
        events: [
          {
            id: 'test-event',
            name: 'Test Event',
            recurrence: { type: 'fixed', month: 1, day: 1 },
            visibility: 'invalid-visibility',
          },
        ],
      };

      const result = await CalendarValidator.validate(calendar);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject event with invalid color format', async () => {
      const calendar = {
        ...baseCalendar,
        events: [
          {
            id: 'test-event',
            name: 'Test Event',
            recurrence: { type: 'fixed', month: 1, day: 1 },
            color: 'red', // Should be hex format #RRGGBB
          },
        ],
      };

      const result = await CalendarValidator.validate(calendar);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject event with invalid startTime format', async () => {
      const calendar = {
        ...baseCalendar,
        events: [
          {
            id: 'test-event',
            name: 'Test Event',
            recurrence: { type: 'fixed', month: 1, day: 1 },
            startTime: '25:00:00', // Invalid hour
          },
        ],
      };

      const result = await CalendarValidator.validate(calendar);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject event with invalid duration format', async () => {
      const calendar = {
        ...baseCalendar,
        events: [
          {
            id: 'test-event',
            name: 'Test Event',
            recurrence: { type: 'fixed', month: 1, day: 1 },
            duration: '2 hours', // Should be like '2h'
          },
        ],
      };

      const result = await CalendarValidator.validate(calendar);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject event with extra unexpected properties', async () => {
      const calendar = {
        ...baseCalendar,
        events: [
          {
            id: 'test-event',
            name: 'Test Event',
            recurrence: { type: 'fixed', month: 1, day: 1 },
            unexpectedProperty: 'should not be here',
          },
        ],
      };

      const result = await CalendarValidator.validate(calendar);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Calendar Builder Integration', () => {
    it('should accept empty events array', async () => {
      const calendar = {
        ...baseCalendar,
        events: [],
      };

      const result = await CalendarValidator.validate(calendar);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept calendar without events property', async () => {
      const calendar = { ...baseCalendar };

      const result = await CalendarValidator.validate(calendar);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept multiple events in calendar', async () => {
      const calendar = {
        ...baseCalendar,
        events: [
          {
            id: 'event-1',
            name: 'Event One',
            recurrence: { type: 'fixed', month: 1, day: 1 },
          },
          {
            id: 'event-2',
            name: 'Event Two',
            recurrence: { type: 'fixed', month: 2, day: 14 },
          },
          {
            id: 'event-3',
            name: 'Event Three',
            recurrence: { type: 'ordinal', month: 11, occurrence: 4, weekday: 3 },
          },
        ],
      };

      const result = await CalendarValidator.validate(calendar);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
