/**
 * Regression test for bug #548: Cannot switch to next intercalary day if more than one exists after the same month
 *
 * This test verifies that when a calendar has multiple intercalary days after the same month,
 * users can select and switch between them correctly.
 *
 * Example: Forgotten Realms Calendar of Harptos has:
 * - Midsummer (always after Flamerule)
 * - Shieldmeet (leap years only, also after Flamerule)
 *
 * The bug was that selecting Shieldmeet would incorrectly bounce back to Midsummer.
 */

import { describe, it, expect } from 'vitest';
import { CalendarEngine } from '../../../src/core/calendar-engine';
import { CalendarDate } from '../../../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';

describe('Multiple Intercalary Days After Same Month', () => {
  const testCalendar: SeasonsStarsCalendar = {
    id: 'test-multiple-intercalary',
    translations: {
      en: {
        label: 'Test Calendar with Multiple Intercalary Days',
        description: 'Calendar for testing multiple intercalary days after the same month',
      },
    },
    year: {
      epoch: 1000,
      currentYear: 1492,
      prefix: '',
      suffix: ' DR',
      startDay: 0,
    },
    leapYear: {
      rule: 'custom',
      interval: 4,
    },
    months: [
      { name: 'Hammer', abbreviation: 'Ham', days: 30 },
      { name: 'Alturiak', abbreviation: 'Alt', days: 30 },
      { name: 'Ches', abbreviation: 'Che', days: 30 },
      { name: 'Tarsakh', abbreviation: 'Tar', days: 30 },
      { name: 'Mirtul', abbreviation: 'Mir', days: 30 },
      { name: 'Kythorn', abbreviation: 'Kyt', days: 30 },
      { name: 'Flamerule', abbreviation: 'Fla', days: 30 },
      { name: 'Eleasis', abbreviation: 'Ele', days: 30 },
      { name: 'Eleint', abbreviation: 'Eli', days: 30 },
      { name: 'Marpenoth', abbreviation: 'Mar', days: 30 },
      { name: 'Uktar', abbreviation: 'Ukt', days: 30 },
      { name: 'Nightal', abbreviation: 'Nig', days: 30 },
    ],
    weekdays: [
      { name: '1st', abbreviation: '1s' },
      { name: '2nd', abbreviation: '2n' },
      { name: '3rd', abbreviation: '3r' },
      { name: '4th', abbreviation: '4t' },
      { name: '5th', abbreviation: '5t' },
      { name: '6th', abbreviation: '6t' },
      { name: '7th', abbreviation: '7t' },
      { name: '8th', abbreviation: '8t' },
      { name: '9th', abbreviation: '9t' },
      { name: '10th', abbreviation: '10' },
    ],
    intercalary: [
      {
        name: 'Midwinter',
        after: 'Hammer',
        leapYearOnly: false,
        countsForWeekdays: false,
      },
      {
        name: 'Greengrass',
        after: 'Tarsakh',
        leapYearOnly: false,
        countsForWeekdays: false,
      },
      {
        name: 'Midsummer',
        after: 'Flamerule',
        leapYearOnly: false,
        countsForWeekdays: false,
      },
      {
        name: 'Shieldmeet',
        after: 'Flamerule',
        leapYearOnly: true,
        countsForWeekdays: false,
      },
      {
        name: 'Higharvestide',
        after: 'Eleint',
        leapYearOnly: false,
        countsForWeekdays: false,
      },
      {
        name: 'Feast of the Moon',
        after: 'Uktar',
        leapYearOnly: false,
        countsForWeekdays: false,
      },
    ],
    time: {
      hoursInDay: 24,
      minutesInHour: 60,
      secondsInMinute: 60,
    },
  };

  it('should correctly round-trip Midsummer (first intercalary after Flamerule)', () => {
    const engine = new CalendarEngine(testCalendar);

    const midsummerDate = new CalendarDate(
      {
        year: 1492,
        month: 7, // Flamerule
        day: 1,
        weekday: 0,
        intercalary: 'Midsummer',
        time: { hour: 12, minute: 0, second: 0 },
      },
      testCalendar
    );

    // Convert to world time and back
    const worldTime = engine.dateToWorldTime(midsummerDate);
    const roundTrip = engine.worldTimeToDate(worldTime);

    expect(roundTrip.year).toBe(1492);
    expect(roundTrip.month).toBe(7);
    expect(roundTrip.intercalary).toBe('Midsummer');
  });

  it('should correctly round-trip Shieldmeet (second intercalary after Flamerule)', () => {
    const engine = new CalendarEngine(testCalendar);

    const shieldmeetDate = new CalendarDate(
      {
        year: 1492,
        month: 7, // Flamerule
        day: 1,
        weekday: 0,
        intercalary: 'Shieldmeet',
        time: { hour: 12, minute: 0, second: 0 },
      },
      testCalendar
    );

    // Convert to world time and back
    const worldTime = engine.dateToWorldTime(shieldmeetDate);
    const roundTrip = engine.worldTimeToDate(worldTime);

    expect(roundTrip.year).toBe(1492);
    expect(roundTrip.month).toBe(7);
    expect(roundTrip.intercalary).toBe('Shieldmeet');
  });

  it('should maintain distinct world times for Midsummer and Shieldmeet', () => {
    const engine = new CalendarEngine(testCalendar);

    const midsummerDate = new CalendarDate(
      {
        year: 1492,
        month: 7,
        day: 1,
        weekday: 0,
        intercalary: 'Midsummer',
        time: { hour: 0, minute: 0, second: 0 },
      },
      testCalendar
    );

    const shieldmeetDate = new CalendarDate(
      {
        year: 1492,
        month: 7,
        day: 1,
        weekday: 0,
        intercalary: 'Shieldmeet',
        time: { hour: 0, minute: 0, second: 0 },
      },
      testCalendar
    );

    const midsummerWorldTime = engine.dateToWorldTime(midsummerDate);
    const shieldmeetWorldTime = engine.dateToWorldTime(shieldmeetDate);

    // Shieldmeet should come after Midsummer (1 day = 86400 seconds)
    expect(shieldmeetWorldTime).toBeGreaterThan(midsummerWorldTime);
    expect(shieldmeetWorldTime - midsummerWorldTime).toBe(86400);
  });

  it('should correctly handle day-after relationship between consecutive intercalary days', () => {
    const engine = new CalendarEngine(testCalendar);

    // Start with Midsummer
    const midsummerDate = new CalendarDate(
      {
        year: 1492,
        month: 7,
        day: 1,
        weekday: 0,
        intercalary: 'Midsummer',
        time: { hour: 0, minute: 0, second: 0 },
      },
      testCalendar
    );

    // Add 1 day to get to Shieldmeet
    const nextDay = engine.addDays(midsummerDate, 1);

    expect(nextDay.year).toBe(1492);
    expect(nextDay.month).toBe(7);
    expect(nextDay.intercalary).toBe('Shieldmeet');
  });

  it('should correctly handle navigation from last regular day of Flamerule through both intercalary days', () => {
    const engine = new CalendarEngine(testCalendar);

    // Start with last day of Flamerule
    const lastDayFlamerule = new CalendarDate(
      {
        year: 1492,
        month: 7,
        day: 30,
        weekday: 0,
        time: { hour: 0, minute: 0, second: 0 },
      },
      testCalendar
    );

    // Add 1 day -> should get Midsummer
    const day1 = engine.addDays(lastDayFlamerule, 1);
    expect(day1.intercalary).toBe('Midsummer');

    // Add 1 more day -> should get Shieldmeet
    const day2 = engine.addDays(day1, 1);
    expect(day2.intercalary).toBe('Shieldmeet');

    // Add 1 more day -> should get first day of Eleasis
    const day3 = engine.addDays(day2, 1);
    expect(day3.intercalary).toBeUndefined();
    expect(day3.month).toBe(8); // Eleasis
    expect(day3.day).toBe(1);
  });

  it('should handle non-leap years correctly (Shieldmeet should not appear)', () => {
    const engine = new CalendarEngine(testCalendar);

    // 1493 is not a leap year (1492 was)
    const lastDayFlamerule = new CalendarDate(
      {
        year: 1493,
        month: 7,
        day: 30,
        weekday: 0,
        time: { hour: 0, minute: 0, second: 0 },
      },
      testCalendar
    );

    // Add 1 day -> should get Midsummer
    const day1 = engine.addDays(lastDayFlamerule, 1);
    expect(day1.intercalary).toBe('Midsummer');

    // Add 1 more day -> should skip Shieldmeet and go to first day of Eleasis
    const day2 = engine.addDays(day1, 1);
    expect(day2.intercalary).toBeUndefined();
    expect(day2.month).toBe(8); // Eleasis
    expect(day2.day).toBe(1);
  });
});
