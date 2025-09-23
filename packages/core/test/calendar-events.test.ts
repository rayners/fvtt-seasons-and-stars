/**
 * Tests for Calendar Events functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import { CalendarValidator } from '../src/core/calendar-validator';
import type { SeasonsStarsCalendar, CalendarEvent, CalendarEventRecurrence } from '../src/types/calendar';

// Test calendar with events
const testCalendarWithEvents: SeasonsStarsCalendar = {
  id: 'test-with-events',
  translations: {
    en: {
      label: 'Test Calendar with Events',
      description: 'Test calendar featuring events',
      setting: 'Test',
    },
  },
  year: {
    epoch: 2024,
    currentYear: 2024,
    prefix: '',
    suffix: ' CE',
    startDay: 1, // Monday
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
      id: 'groundhog-day',
      name: 'Groundhog Day',
      description: 'Groundhog emerges to predict weather',
      recurrence: {
        type: 'fixed',
        month: 2, // February
        day: 2,
      },
    },
    {
      id: 'labor-day',
      name: 'Labor Day',
      description: 'A day to honor workers',
      recurrence: {
        type: 'ordinal',
        month: 9, // September
        weekday: 1, // Monday
        ordinal: 1, // First Monday
      },
    },
    {
      id: 'thanksgiving',
      name: 'Thanksgiving',
      description: 'Day of giving thanks',
      recurrence: {
        type: 'ordinal',
        month: 11, // November
        weekday: 4, // Thursday
        ordinal: 4, // Fourth Thursday
      },
    },
    {
      id: 'tax-day',
      name: 'Tax Day',
      description: 'Deadline for tax filing',
      recurrence: {
        type: 'monthly',
        day: 15, // 15th of every month
      },
    },
    {
      id: 'leap-year-day',
      name: 'Leap Year Day',
      description: 'Extra day in leap years',
      recurrence: {
        type: 'fixed',
        month: 2, // February
        day: 29,
        leapYearOnly: true,
      },
    },
    {
      id: 'centennial',
      name: 'Centennial Celebration',
      description: 'Occurs every 100 years',
      recurrence: {
        type: 'interval',
        startYear: 2000,
        interval: 100,
        month: 1,
        day: 1,
      },
    },
  ],
};

describe('Calendar Events - Basic Structure', () => {
  it('should validate calendar with events property', async () => {
    const result = await CalendarValidator.validate(testCalendarWithEvents);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should parse calendar with events without errors', () => {
    const engine = new CalendarEngine(testCalendarWithEvents);
    expect(engine).toBeDefined();
    expect(engine.calendar.events).toBeDefined();
    expect(engine.calendar.events).toHaveLength(6);
  });

  it('should have correct event properties', () => {
    const engine = new CalendarEngine(testCalendarWithEvents);
    const groundhogDay = engine.calendar.events?.[0];

    expect(groundhogDay?.id).toBe('groundhog-day');
    expect(groundhogDay?.name).toBe('Groundhog Day');
    expect(groundhogDay?.description).toBe('Groundhog emerges to predict weather');
    expect(groundhogDay?.recurrence).toBeDefined();
  });
});

describe('Calendar Events - Fixed Date Recurrence', () => {
  let engine: CalendarEngine;

  beforeEach(() => {
    engine = new CalendarEngine(testCalendarWithEvents);
  });

  it('should identify Groundhog Day on February 2nd', () => {
    const events = engine.getEventsForDate({ year: 2024, month: 2, day: 2 });
    expect(events).toHaveLength(2); // Groundhog Day + monthly Tax Day
    expect(events.some(e => e.id === 'groundhog-day')).toBe(true);
  });

  it('should not have Groundhog Day on other days', () => {
    const events = engine.getEventsForDate({ year: 2024, month: 2, day: 3 });
    expect(events.some(e => e.id === 'groundhog-day')).toBe(false);
  });

  it('should have Groundhog Day every year', () => {
    const events2025 = engine.getEventsForDate({ year: 2025, month: 2, day: 2 });
    const events2026 = engine.getEventsForDate({ year: 2026, month: 2, day: 2 });

    expect(events2025.some(e => e.id === 'groundhog-day')).toBe(true);
    expect(events2026.some(e => e.id === 'groundhog-day')).toBe(true);
  });
});

describe('Calendar Events - Ordinal Weekday Recurrence', () => {
  let engine: CalendarEngine;

  beforeEach(() => {
    engine = new CalendarEngine(testCalendarWithEvents);
  });

  it('should identify Labor Day on first Monday of September 2024', () => {
    // In 2024, September 1st is a Sunday, so first Monday is September 2nd
    const events = engine.getEventsForDate({ year: 2024, month: 9, day: 2 });
    expect(events.some(e => e.id === 'labor-day')).toBe(true);
  });

  it('should identify Thanksgiving on fourth Thursday of November 2024', () => {
    // In 2024, November starts on Friday, so fourth Thursday is November 28th
    const events = engine.getEventsForDate({ year: 2024, month: 11, day: 28 });
    expect(events.some(e => e.id === 'thanksgiving')).toBe(true);
  });

  it('should calculate Labor Day correctly for different years', () => {
    // 2025: September 1st is Monday, so Labor Day is September 1st
    const events2025 = engine.getEventsForDate({ year: 2025, month: 9, day: 1 });
    expect(events2025.some(e => e.id === 'labor-day')).toBe(true);

    // 2026: September 1st is Tuesday, so first Monday is September 7th
    const events2026 = engine.getEventsForDate({ year: 2026, month: 9, day: 7 });
    expect(events2026.some(e => e.id === 'labor-day')).toBe(true);
  });
});

describe('Calendar Events - Monthly Recurrence', () => {
  let engine: CalendarEngine;

  beforeEach(() => {
    engine = new CalendarEngine(testCalendarWithEvents);
  });

  it('should have Tax Day on the 15th of every month', () => {
    const jan15 = engine.getEventsForDate({ year: 2024, month: 1, day: 15 });
    const feb15 = engine.getEventsForDate({ year: 2024, month: 2, day: 15 });
    const mar15 = engine.getEventsForDate({ year: 2024, month: 3, day: 15 });

    expect(jan15.some(e => e.id === 'tax-day')).toBe(true);
    expect(feb15.some(e => e.id === 'tax-day')).toBe(true);
    expect(mar15.some(e => e.id === 'tax-day')).toBe(true);
  });

  it('should not have Tax Day on other days', () => {
    const jan14 = engine.getEventsForDate({ year: 2024, month: 1, day: 14 });
    const jan16 = engine.getEventsForDate({ year: 2024, month: 1, day: 16 });

    expect(jan14.some(e => e.id === 'tax-day')).toBe(false);
    expect(jan16.some(e => e.id === 'tax-day')).toBe(false);
  });
});

describe('Calendar Events - Leap Year Events', () => {
  let engine: CalendarEngine;

  beforeEach(() => {
    engine = new CalendarEngine(testCalendarWithEvents);
  });

  it('should have Leap Year Day on February 29th in leap years', () => {
    // 2024 is a leap year
    const events2024 = engine.getEventsForDate({ year: 2024, month: 2, day: 29 });
    expect(events2024.some(e => e.id === 'leap-year-day')).toBe(true);

    // 2028 is a leap year
    const events2028 = engine.getEventsForDate({ year: 2028, month: 2, day: 29 });
    expect(events2028.some(e => e.id === 'leap-year-day')).toBe(true);
  });

  it('should not have Leap Year Day in non-leap years', () => {
    // 2025 is not a leap year - February 29th doesn't exist
    const events2025 = engine.getEventsForDate({ year: 2025, month: 2, day: 28 });
    expect(events2025.some(e => e.id === 'leap-year-day')).toBe(false);

    // 2027 is not a leap year
    const events2027 = engine.getEventsForDate({ year: 2027, month: 2, day: 28 });
    expect(events2027.some(e => e.id === 'leap-year-day')).toBe(false);
  });
});

describe('Calendar Events - Interval Recurrence', () => {
  let engine: CalendarEngine;

  beforeEach(() => {
    engine = new CalendarEngine(testCalendarWithEvents);
  });

  it('should have Centennial on correct years', () => {
    // 2000 is a centennial year
    const events2000 = engine.getEventsForDate({ year: 2000, month: 1, day: 1 });
    expect(events2000.some(e => e.id === 'centennial')).toBe(true);

    // 2100 is a centennial year
    const events2100 = engine.getEventsForDate({ year: 2100, month: 1, day: 1 });
    expect(events2100.some(e => e.id === 'centennial')).toBe(true);
  });

  it('should not have Centennial on non-interval years', () => {
    // 2024 is not a centennial year
    const events2024 = engine.getEventsForDate({ year: 2024, month: 1, day: 1 });
    expect(events2024.some(e => e.id === 'centennial')).toBe(false);

    // 2050 is not a centennial year
    const events2050 = engine.getEventsForDate({ year: 2050, month: 1, day: 1 });
    expect(events2050.some(e => e.id === 'centennial')).toBe(false);
  });
});

describe('Calendar Events - Event Modification', () => {
  let engine: CalendarEngine;

  beforeEach(() => {
    const modifiedCalendar = { ...testCalendarWithEvents };
    engine = new CalendarEngine(modifiedCalendar);
  });

  it('should allow adding new events at runtime', () => {
    const newEvent: CalendarEvent = {
      id: 'new-year',
      name: "New Year's Day",
      description: 'First day of the year',
      recurrence: {
        type: 'fixed',
        month: 1,
        day: 1,
      },
    };

    engine.addEvent(newEvent);
    const events = engine.getEventsForDate({ year: 2024, month: 1, day: 1 });
    expect(events.some(e => e.id === 'new-year')).toBe(true);
  });

  it('should allow removing events at runtime', () => {
    engine.removeEvent('groundhog-day');
    const events = engine.getEventsForDate({ year: 2024, month: 2, day: 2 });
    expect(events.some(e => e.id === 'groundhog-day')).toBe(false);
  });

  it('should allow modifying events at runtime', () => {
    const modifiedEvent: CalendarEvent = {
      id: 'tax-day',
      name: 'Modified Tax Day',
      description: 'Now only once a year',
      recurrence: {
        type: 'fixed',
        month: 4,
        day: 15,
      },
    };

    engine.updateEvent(modifiedEvent);

    // Should not be on January 15th anymore
    const jan15 = engine.getEventsForDate({ year: 2024, month: 1, day: 15 });
    expect(jan15.some(e => e.id === 'tax-day')).toBe(false);

    // Should be on April 15th
    const apr15 = engine.getEventsForDate({ year: 2024, month: 4, day: 15 });
    const taxEvent = apr15.find(e => e.id === 'tax-day');
    expect(taxEvent).toBeDefined();
    expect(taxEvent?.name).toBe('Modified Tax Day');
  });

  it('should merge external event sources', () => {
    const externalEvents: CalendarEvent[] = [
      {
        id: 'external-1',
        name: 'External Event',
        description: 'From external source',
        recurrence: {
          type: 'fixed',
          month: 6,
          day: 15,
        },
      },
    ];

    engine.mergeExternalEvents(externalEvents);
    const events = engine.getEventsForDate({ year: 2024, month: 6, day: 15 });
    expect(events.some(e => e.id === 'external-1')).toBe(true);
  });
});

describe('Calendar Events - Query Functions', () => {
  let engine: CalendarEngine;

  beforeEach(() => {
    engine = new CalendarEngine(testCalendarWithEvents);
  });

  it('should get all events for a specific month', () => {
    const februaryEvents = engine.getEventsForMonth({ year: 2024, month: 2 });

    // Should include Groundhog Day (Feb 2), Tax Day (Feb 15), and Leap Year Day (Feb 29)
    expect(februaryEvents).toHaveLength(3);
    expect(februaryEvents.some(e => e.event.id === 'groundhog-day')).toBe(true);
    expect(februaryEvents.some(e => e.event.id === 'tax-day')).toBe(true);
    expect(februaryEvents.some(e => e.event.id === 'leap-year-day')).toBe(true);
  });

  it('should get all events for a specific year', () => {
    const yearEvents = engine.getEventsForYear(2024);

    // Should include all recurring events for the year
    expect(yearEvents.length).toBeGreaterThan(0);

    // Tax Day appears 12 times (monthly)
    const taxDayCount = yearEvents.filter(e => e.event.id === 'tax-day').length;
    expect(taxDayCount).toBe(12);

    // Fixed annual events appear once
    const groundhogCount = yearEvents.filter(e => e.event.id === 'groundhog-day').length;
    expect(groundhogCount).toBe(1);
  });

  it('should get next occurrence of an event', () => {
    const currentDate = { year: 2024, month: 1, day: 20 };
    const nextGroundhog = engine.getNextEventOccurrence('groundhog-day', currentDate);

    expect(nextGroundhog).toBeDefined();
    expect(nextGroundhog?.year).toBe(2024);
    expect(nextGroundhog?.month).toBe(2);
    expect(nextGroundhog?.day).toBe(2);
  });

  it('should get previous occurrence of an event', () => {
    const currentDate = { year: 2024, month: 3, day: 1 };
    const prevGroundhog = engine.getPreviousEventOccurrence('groundhog-day', currentDate);

    expect(prevGroundhog).toBeDefined();
    expect(prevGroundhog?.year).toBe(2024);
    expect(prevGroundhog?.month).toBe(2);
    expect(prevGroundhog?.day).toBe(2);
  });
});