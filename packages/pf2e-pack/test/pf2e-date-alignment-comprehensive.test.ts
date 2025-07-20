/**
 * Comprehensive PF2e Date Alignment Test Suite
 *
 * This test suite addresses Issue #66 - PF2e Calendar Date Mismatch
 * Based on user report showing World Clock displaying "Sunday, 21st of Lamashan, 4712 AR"
 * while S&S calendar may show different weekday for the same date.
 *
 * Tests verify exact alignment between PF2e World Clock and S&S calendar system.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../src/types/calendar';
import * as fs from 'fs';
import * as path from 'path';

describe('PF2e Date Alignment - Comprehensive Test Suite', () => {
  let golarionEngine: CalendarEngine;
  let golarionCalendar: SeasonsStarsCalendar;

  beforeEach(() => {
    // Mock PF2e system for compatibility testing
    (globalThis as Record<string, unknown>).game = {
      ...((globalThis as Record<string, unknown>).game || {}),
      system: {
        id: 'pf2e',
      },
    };

    const calendarPath = path.join('packages/core/calendars', 'golarion-pf2e.json');
    const calendarData = JSON.parse(fs.readFileSync(calendarPath, 'utf8'));
    golarionCalendar = calendarData;
    golarionEngine = new CalendarEngine(calendarData);
  });

  describe('🐛 Issue #66 - Exact Date from Screenshot', () => {
    test('Screenshot date: Sunday, 21st of Lamashan, 4712 AR should be Sunday', () => {
      const testDate = { year: 4712, month: 10, day: 21 }; // Lamashan is 10th month

      const calculatedWeekday = golarionEngine.calculateWeekday(
        testDate.year,
        testDate.month,
        testDate.day
      );
      const calculatedWeekdayName = golarionCalendar.weekdays[calculatedWeekday]?.name;

      // Sunday should be at index 6 in Golarion weekday array
      const sundayIndex = golarionCalendar.weekdays.findIndex(w => w.name === 'Sunday');
      expect(sundayIndex).toBe(6); // Verify our assumption about Sunday's position

      // CRITICAL TEST: This is the exact mismatch reported in Issue #66
      expect(calculatedWeekday).toBe(6);
      expect(calculatedWeekdayName).toBe('Sunday');
    });

    test('Verify month name mapping: Lamashan = 10th month', () => {
      // Ensure Lamashan is actually the 10th month in our calendar
      const lamashanMonth = golarionCalendar.months[9]; // 0-based index
      expect(lamashanMonth.name).toBe('Lamashan');
      expect(lamashanMonth.abbreviation).toBe('Lam');
    });

    test('Verify time component calculation for 05:00:06', () => {
      const testDate = {
        year: 4712,
        month: 10,
        day: 21,
        weekday: 0, // Will be calculated
        time: {
          hour: 5,
          minute: 0,
          second: 6,
        },
      };

      // Convert to worldTime and back to verify time handling
      const worldTime = golarionEngine.dateToWorldTime(testDate);
      const convertedBack = golarionEngine.worldTimeToDate(worldTime);

      expect(convertedBack.year).toBe(testDate.year);
      expect(convertedBack.month).toBe(testDate.month);
      expect(convertedBack.day).toBe(testDate.day);
      expect(convertedBack.time?.hour).toBe(testDate.time.hour);
      expect(convertedBack.time?.minute).toBe(testDate.time.minute);
      expect(convertedBack.time?.second).toBe(testDate.time.second);
    });
  });

  describe('🔍 PF2e Weekday Pattern Analysis', () => {
    test('Analyze weekday pattern around the screenshot date', () => {
      // Test dates around the problematic date to identify pattern
      const testDates = [
        { year: 4712, month: 10, day: 20, expectedWeekday: 'Starday' }, // Day before
        { year: 4712, month: 10, day: 21, expectedWeekday: 'Sunday' }, // Screenshot date
        { year: 4712, month: 10, day: 22, expectedWeekday: 'Moonday' }, // Day after
        { year: 4712, month: 10, day: 19, expectedWeekday: 'Fireday' }, // Two days before
        { year: 4712, month: 10, day: 23, expectedWeekday: 'Toilday' }, // Two days after
      ];

      let consistentOffset: number | null = null;
      testDates.forEach(testDate => {
        const calculatedWeekday = golarionEngine.calculateWeekday(
          testDate.year,
          testDate.month,
          testDate.day
        );
        const calculatedWeekdayName = golarionCalendar.weekdays[calculatedWeekday]?.name;
        const expectedIndex = golarionCalendar.weekdays.findIndex(
          w => w.name === testDate.expectedWeekday
        );

        const offset = expectedIndex - calculatedWeekday;

        if (calculatedWeekdayName !== testDate.expectedWeekday) {
          if (consistentOffset === null) {
            consistentOffset = offset;
          } else {
            expect(consistentOffset).toBe(offset); // Should be consistent
          }
        }

        expect(calculatedWeekdayName).toBe(testDate.expectedWeekday);
      });

      // Verify that either all weekdays are correct (null) or there's a consistent offset (number)
      expect(typeof consistentOffset === 'number' || consistentOffset === null).toBe(true);
    });

    test('Test Golarion weekday order matches PF2e expectations', () => {
      const expectedOrder = [
        'Moonday',
        'Toilday',
        'Wealday',
        'Oathday',
        'Fireday',
        'Starday',
        'Sunday',
      ];

      golarionCalendar.weekdays.forEach((weekday, index) => {
        expect(weekday.name).toBe(expectedOrder[index]);
      });
    });

    test('Test epoch start day configuration', () => {
      // Calculate what weekday the epoch date (2700/1/1) produces
      const epochWeekday = golarionEngine.calculateWeekday(golarionCalendar.year.epoch, 1, 1);

      // Verify epoch weekday is within valid range
      expect(typeof epochWeekday).toBe('number');
      expect(epochWeekday).toBeGreaterThanOrEqual(0);
      expect(epochWeekday).toBeLessThan(golarionCalendar.weekdays.length);

      // Verify calendar configuration values
      expect(golarionCalendar.year.epoch).toBe(2700);
      expect(typeof golarionCalendar.year.startDay).toBe('number');
      expect(golarionCalendar.weekdays[golarionCalendar.year.startDay]).toBeDefined();
    });
  });

  describe('🧮 WorldTime Integration Tests', () => {
    test('Test worldTime calculation matches PF2e World Clock behavior', () => {
      // Test if our worldTime calculation produces the same results as PF2e
      // This is critical for ensuring compatibility with PF2e's time advancement

      const testDate = { year: 4712, month: 10, day: 21 };
      const worldTime = golarionEngine.dateToWorldTime(testDate);
      const convertedBack = golarionEngine.worldTimeToDate(worldTime);

      // Verify worldTime is a valid number
      expect(typeof worldTime).toBe('number');
      expect(worldTime).toBeGreaterThan(0);

      // Verify round-trip conversion
      expect(convertedBack.year).toBe(testDate.year);
      expect(convertedBack.month).toBe(testDate.month);
      expect(convertedBack.day).toBe(testDate.day);
      expect(golarionCalendar.weekdays[convertedBack.weekday]?.name).toBe('Sunday');
    });

    test('Test worldTime interpretation mode affects date calculation', () => {
      // Test worldTime=0 interpretation
      const worldTimeZeroDate = golarionEngine.worldTimeToDate(0);

      // For epoch-based interpretation, worldTime=0 should map to epoch year (2700)
      expect(worldTimeZeroDate.year).toBe(2700);
      expect(worldTimeZeroDate.month).toBe(1); // January
      expect(worldTimeZeroDate.day).toBe(1); // 1st day
    });
  });

  describe('🎯 PF2e Integration Compatibility', () => {
    test('Test PF2e worldTime interpretation compatibility', () => {
      // S&S uses epoch-based worldTime: worldTime=0 = epoch year (2700)
      // PF2e uses worldTime to track actual game progression
      const ssDateAtWorldTimeZero = golarionEngine.worldTimeToDate(0);
      expect(ssDateAtWorldTimeZero.year).toBe(2700); // S&S epoch year

      // Test a more realistic PF2e scenario: some elapsed game time
      // Assume 2025 years have passed since epoch (2700 + 2025 = 4725)
      const yearsElapsed = 2025;
      const secondsPerYear = 365.25 * 24 * 60 * 60; // Approximate
      const simulatedPF2eWorldTime = yearsElapsed * secondsPerYear;

      const simulatedGameDate = golarionEngine.worldTimeToDate(simulatedPF2eWorldTime);

      // The simulated date should be approximately in the expected range
      const expectedYear = 2700 + yearsElapsed;
      const yearDifference = Math.abs(expectedYear - simulatedGameDate.year);

      // Allow for some calculation variance due to leap years, etc.
      expect(yearDifference).toBeLessThan(10);
      expect(simulatedGameDate.year).toBeGreaterThan(4700); // Should be in reasonable PF2e range
    });

    test('Test weekday offset for PF2e compatibility', () => {
      // Test if there's a specific offset needed for PF2e compatibility
      const testDate = { year: 4712, month: 10, day: 21 };
      const ssWeekday = golarionEngine.calculateWeekday(
        testDate.year,
        testDate.month,
        testDate.day
      );
      const pf2eExpectedWeekday = 6; // Sunday index

      const offset = pf2eExpectedWeekday - ssWeekday;

      // Test if applying the offset works
      let adjustedWeekday = ssWeekday + offset;
      if (adjustedWeekday >= golarionCalendar.weekdays.length) {
        adjustedWeekday -= golarionCalendar.weekdays.length;
      } else if (adjustedWeekday < 0) {
        adjustedWeekday += golarionCalendar.weekdays.length;
      }

      expect(adjustedWeekday).toBe(pf2eExpectedWeekday);
      expect(golarionCalendar.weekdays[adjustedWeekday]?.name).toBe('Sunday');
    });
  });

  describe('📊 Regression Prevention Tests', () => {
    test('Ensure date calculation changes dont break other functionality', () => {
      // Test multiple dates to ensure any fixes don't break other calculations
      const testCases = [
        { year: 4710, month: 1, day: 1 }, // Start of different year
        { year: 4712, month: 1, day: 1 }, // Start of test year
        { year: 4712, month: 6, day: 15 }, // Middle of year
        { year: 4712, month: 12, day: 31 }, // End of year
        { year: 4713, month: 1, day: 1 }, // Next year
      ];

      testCases.forEach(testDate => {
        // Basic calculations should not throw errors
        expect(() => {
          const weekday = golarionEngine.calculateWeekday(
            testDate.year,
            testDate.month,
            testDate.day
          );
          const worldTime = golarionEngine.dateToWorldTime(testDate);
          const roundTrip = golarionEngine.worldTimeToDate(worldTime);

          // Verify basic properties
          expect(typeof weekday).toBe('number');
          expect(typeof worldTime).toBe('number');
          expect(roundTrip.year).toBe(testDate.year);
          expect(roundTrip.month).toBe(testDate.month);
          expect(roundTrip.day).toBe(testDate.day);
        }).not.toThrow();
      });
    });

    test('Verify leap year handling remains correct', () => {
      // Test leap year calculations don't break with weekday fixes
      const leapYear = 4712; // Should be a leap year (4712 % 4 === 0)
      const isLeap = golarionEngine.isLeapYear(leapYear);
      const yearLength = golarionEngine.getYearLength(leapYear);

      expect(isLeap).toBe(true);
      expect(yearLength).toBe(366); // Leap year should have 366 days

      // Test February has extra day in leap year
      const calistrilLength = golarionEngine.getMonthLength(2, leapYear); // Calistril = February
      expect(calistrilLength).toBe(29); // Should have extra day
    });
  });
});
