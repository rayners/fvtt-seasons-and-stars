/**
 * PF2e Weekday Fix Test Suite
 *
 * This test investigates and fixes the weekday calculation mismatch
 * between S&S and PF2e World Clock.
 *
 * Issue: For date 4712/10/21, PF2e shows "Sunday" but S&S shows "Toilday"
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../src/types/calendar';
import * as fs from 'fs';
import * as path from 'path';

describe('PF2e Weekday Fix Investigation', () => {
  let golarionEngine: CalendarEngine;
  let golarionCalendar: SeasonsStarsCalendar;

  beforeEach((): void => {
    const calendarPath = path.join('packages/core/calendars', 'golarion-pf2e.json');
    const calendarData = JSON.parse(fs.readFileSync(calendarPath, 'utf8'));
    golarionCalendar = calendarData;
    golarionEngine = new CalendarEngine(calendarData);
  });

  test('🔍 Analyze weekday mapping for problematic date', (): void => {
    // The problematic date from user report
    const testDate = { year: 4712, month: 10, day: 21 }; // Lamashan 21, 4712 AR

    // Verify calendar weekday configuration
    expect(golarionCalendar.weekdays).toHaveLength(7);
    expect(golarionCalendar.weekdays[0].name).toBe('Moonday');
    expect(golarionCalendar.weekdays[6].name).toBe('Sunday');

    const calculatedWeekday = golarionEngine.calculateWeekday(
      testDate.year,
      testDate.month,
      testDate.day
    );

    // Find Sunday in our weekday array
    const sundayIndex = golarionCalendar.weekdays.findIndex(w => w.name === 'Sunday');
    expect(sundayIndex).toBe(6); // Sunday should be at index 6

    // Check that the calculated weekday is Sunday (verifies fix is working)
    expect(golarionCalendar.weekdays[calculatedWeekday]?.name).toBe('Sunday');

    // Verify the calculation and any differences
    expect(typeof calculatedWeekday).toBe('number');
    expect(calculatedWeekday).toBeGreaterThanOrEqual(0);
    expect(calculatedWeekday).toBeLessThan(7);
    expect(golarionCalendar.weekdays[calculatedWeekday]?.name).toBe('Sunday');
  });

  test('🔍 Test multiple dates to confirm weekday pattern', (): void => {
    // Test several dates to see if there's a consistent offset
    const testDates = [
      { year: 4712, month: 10, day: 21, expectedWeekday: 'Sunday' },
      { year: 4712, month: 10, day: 22, expectedWeekday: 'Moonday' }, // Next day should be Moonday
      { year: 4712, month: 10, day: 20, expectedWeekday: 'Starday' }, // Previous day should be Starday
    ];

    let consistentOffset: number | null = null;

    testDates.forEach(testDate => {
      const calculatedWeekday = golarionEngine.calculateWeekday(
        testDate.year,
        testDate.month,
        testDate.day
      );
      const calculatedWeekdayName = golarionCalendar.weekdays[calculatedWeekday]?.name;

      if (testDate.expectedWeekday) {
        const expectedIndex = golarionCalendar.weekdays.findIndex(
          w => w.name === testDate.expectedWeekday
        );
        const offset = expectedIndex - calculatedWeekday;

        if (consistentOffset === null) {
          consistentOffset = offset;
        } else {
          expect(consistentOffset).toBe(offset); // Should be consistent
        }

        expect(calculatedWeekdayName).toBe(testDate.expectedWeekday);
      }

      expect(typeof calculatedWeekday).toBe('number');
      expect(calculatedWeekday).toBeGreaterThanOrEqual(0);
      expect(calculatedWeekday).toBeLessThan(7);
    });
  });

  test('🔧 Test proposed weekday fix', (): void => {
    // Based on the pattern we found, let's test if adjusting the calculation fixes it
    const testDate = { year: 4712, month: 10, day: 21 };
    const originalWeekday = golarionEngine.calculateWeekday(
      testDate.year,
      testDate.month,
      testDate.day
    );
    const expectedSundayIndex = golarionCalendar.weekdays.findIndex(w => w.name === 'Sunday');

    expect(expectedSundayIndex).toBe(6); // Sunday should be at index 6
    expect(golarionCalendar.weekdays[originalWeekday]?.name).toBe('Sunday');

    const offset = expectedSundayIndex - originalWeekday;

    // Test the fix by manually adjusting
    let adjustedWeekday = originalWeekday + offset;
    if (adjustedWeekday >= golarionCalendar.weekdays.length) {
      adjustedWeekday -= golarionCalendar.weekdays.length;
    } else if (adjustedWeekday < 0) {
      adjustedWeekday += golarionCalendar.weekdays.length;
    }

    expect(adjustedWeekday).toBe(expectedSundayIndex);
    expect(golarionCalendar.weekdays[adjustedWeekday]?.name).toBe('Sunday');
  });

  test('🔍 Investigate epoch day calculation', (): void => {
    // Check what weekday the epoch date (2700/1/1) calculates to
    const epochWeekday = golarionEngine.calculateWeekday(golarionCalendar.year.epoch, 1, 1);

    // Verify epoch configuration
    expect(golarionCalendar.year.epoch).toBe(2700);
    expect(typeof golarionCalendar.year.startDay).toBe('number');
    expect(golarionCalendar.year.startDay).toBeGreaterThanOrEqual(0);
    expect(golarionCalendar.year.startDay).toBeLessThan(7);

    // Verify epoch calculation
    expect(typeof epochWeekday).toBe('number');
    expect(epochWeekday).toBeGreaterThanOrEqual(0);
    expect(epochWeekday).toBeLessThan(7);
    expect(golarionCalendar.weekdays[epochWeekday]).toBeDefined();
  });

  test('🔍 Compare with known PF2e calendar expectations', (): void => {
    // Test if PF2e might be using a different weekday offset
    // For 4712/10/21, if PF2e says "Sunday", that's index 6 in our array
    const testDate = { year: 4712, month: 10, day: 21 };
    const ssWeekday = golarionEngine.calculateWeekday(testDate.year, testDate.month, testDate.day);
    const pf2eWeekday = 6; // Sunday index

    // Verify weekday mapping
    expect(golarionCalendar.weekdays).toHaveLength(7);
    expect(golarionCalendar.weekdays[6].name).toBe('Sunday');
    expect(golarionCalendar.weekdays[0].name).toBe('Moonday');

    const difference = pf2eWeekday - ssWeekday;

    // Verify calculations
    expect(typeof ssWeekday).toBe('number');
    expect(ssWeekday).toBeGreaterThanOrEqual(0);
    expect(ssWeekday).toBeLessThan(7);
    expect(golarionCalendar.weekdays[ssWeekday]?.name).toBe('Sunday');
    expect(difference).toBe(0); // Should be no difference with the fix
  });
});
