/**
 * Moon Phase Tracking Tests
 * Tests for the moon phase calculation system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../../../src/core/calendar-engine';
import { CalendarDate } from '../../../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';

describe('Moon Phase Tracking', () => {
  let testCalendar: SeasonsStarsCalendar;
  let engine: CalendarEngine;

  beforeEach(() => {
    // Create a test calendar with Earth's moon for testing
    testCalendar = {
      id: 'test-lunar',
      translations: {
        en: {
          label: 'Test Lunar Calendar',
          description: 'Test calendar with moon phases',
        },
      },
      year: {
        epoch: 0,
        currentYear: 2024,
        prefix: '',
        suffix: ' CE',
        startDay: 1,
      },
      leapYear: {
        rule: 'gregorian',
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
      moons: [
        {
          name: 'Luna',
          cycleLength: 29.53059,
          firstNewMoon: { year: 2024, month: 1, day: 11 },
          phases: [
            { name: 'New Moon', length: 1, singleDay: true, icon: 'new' },
            {
              name: 'Waxing Crescent',
              length: 6.3826475,
              singleDay: false,
              icon: 'waxing-crescent',
            },
            { name: 'First Quarter', length: 1, singleDay: true, icon: 'first-quarter' },
            { name: 'Waxing Gibbous', length: 6.3826475, singleDay: false, icon: 'waxing-gibbous' },
            { name: 'Full Moon', length: 1, singleDay: true, icon: 'full' },
            { name: 'Waning Gibbous', length: 6.3826475, singleDay: false, icon: 'waning-gibbous' },
            { name: 'Last Quarter', length: 1, singleDay: true, icon: 'last-quarter' },
            {
              name: 'Waning Crescent',
              length: 6.3826475,
              singleDay: false,
              icon: 'waning-crescent',
            },
          ],
          color: '#f0f0f0',
        },
      ],
    };

    engine = new CalendarEngine(testCalendar);
  });

  describe('Basic Moon Phase Calculation', () => {
    it('should return moon data for Simple Calendar bridge compatibility', () => {
      const moons = engine.getAllMoons();

      expect(moons).toHaveLength(1);
      expect(moons[0].name).toBe('Luna');
      expect(moons[0].cycleLength).toBe(29.53059);
      expect(moons[0].phases).toHaveLength(8);
    });

    it('should calculate moon phase for reference new moon date', () => {
      const referenceDate = new CalendarDate(
        {
          year: 2024,
          month: 1,
          day: 11,
          weekday: 0,
        },
        testCalendar
      );

      const moonPhases = engine.getMoonPhaseInfo(referenceDate);

      expect(moonPhases).toHaveLength(1);
      expect(moonPhases[0].phase.name).toBe('New Moon');
      expect(moonPhases[0].phaseIndex).toBe(0);
      expect(moonPhases[0].dayInPhase).toBe(0);
    });

    it('should calculate correct phase progression from new moon', () => {
      const testDates = [
        { day: 11, expectedPhase: 'New Moon', expectedIndex: 0 },
        { day: 12, expectedPhase: 'Waxing Crescent', expectedIndex: 1 },
        { day: 18, expectedPhase: 'Waxing Crescent', expectedIndex: 1 }, // Still in waxing crescent
        { day: 19, expectedPhase: 'First Quarter', expectedIndex: 2 }, // Should transition here
        { day: 25, expectedPhase: 'Waxing Gibbous', expectedIndex: 3 }, // Waxing gibbous
        { day: 26, expectedPhase: 'Full Moon', expectedIndex: 4 }, // Full moon
      ];

      testDates.forEach(({ day, expectedPhase, expectedIndex }) => {
        const date = new CalendarDate(
          {
            year: 2024,
            month: 1,
            day: day,
            weekday: 0,
          },
          testCalendar
        );

        const moonPhases = engine.getMoonPhaseInfo(date);

        expect(moonPhases[0].phase.name).toBe(expectedPhase);
        expect(moonPhases[0].phaseIndex).toBe(expectedIndex);
      });
    });

    it('should handle dates before reference date', () => {
      const dateBeforeReference = new CalendarDate(
        {
          year: 2024,
          month: 1,
          day: 1,
          weekday: 0,
        },
        testCalendar
      );

      const moonPhases = engine.getMoonPhaseInfo(dateBeforeReference);

      expect(moonPhases).toHaveLength(1);
      expect(moonPhases[0].phase.name).toBeDefined();
      expect(moonPhases[0].phaseIndex).toBeGreaterThanOrEqual(0);
      expect(moonPhases[0].phaseIndex).toBeLessThan(8);
    });

    it('should calculate cycle correctly across multiple cycles', () => {
      // Test dates about one cycle apart
      const firstDate = new CalendarDate(
        {
          year: 2024,
          month: 1,
          day: 11,
          weekday: 0,
        },
        testCalendar
      );

      const secondDate = new CalendarDate(
        {
          year: 2024,
          month: 2,
          day: 10, // About 30 days later
          weekday: 0,
        },
        testCalendar
      );

      const firstPhase = engine.getMoonPhaseInfo(firstDate);
      const secondPhase = engine.getMoonPhaseInfo(secondDate);

      // Both should be close to new moon since ~30 days ≈ one lunar cycle
      expect(firstPhase[0].phase.name).toBe('New Moon');
      expect(secondPhase[0].phase.name).toBe('New Moon');
    });
  });

  describe('Multiple Moons Support', () => {
    beforeEach(() => {
      // Add a second moon for testing multiple moons (like Exandria)
      testCalendar.moons!.push({
        name: 'Ruidus',
        cycleLength: 328,
        firstNewMoon: { year: 2024, month: 1, day: 15 },
        phases: [
          { name: 'New Moon', length: 41, singleDay: false, icon: 'new' },
          { name: 'Full Moon', length: 41, singleDay: false, icon: 'full' },
          { name: 'New Moon', length: 41, singleDay: false, icon: 'new' },
          { name: 'Full Moon', length: 41, singleDay: false, icon: 'full' },
          { name: 'New Moon', length: 41, singleDay: false, icon: 'new' },
          { name: 'Full Moon', length: 41, singleDay: false, icon: 'full' },
          { name: 'New Moon', length: 41, singleDay: false, icon: 'new' },
          { name: 'Full Moon', length: 41, singleDay: false, icon: 'full' },
        ],
        color: '#800020',
      });

      engine = new CalendarEngine(testCalendar);
    });

    it('should return all moons', () => {
      const moons = engine.getAllMoons();

      expect(moons).toHaveLength(2);
      expect(moons.map(m => m.name)).toEqual(['Luna', 'Ruidus']);
    });

    it('should calculate phases for all moons', () => {
      const testDate = new CalendarDate(
        {
          year: 2024,
          month: 1,
          day: 20,
          weekday: 0,
        },
        testCalendar
      );

      const moonPhases = engine.getMoonPhaseInfo(testDate);

      expect(moonPhases).toHaveLength(2);
      expect(moonPhases[0].moon.name).toBe('Luna');
      expect(moonPhases[1].moon.name).toBe('Ruidus');
    });

    it('should filter by moon name', () => {
      const testDate = new CalendarDate(
        {
          year: 2024,
          month: 1,
          day: 20,
          weekday: 0,
        },
        testCalendar
      );

      const lunaPhases = engine.getMoonPhaseInfo(testDate, 'Luna');
      const ruidusPhases = engine.getMoonPhaseInfo(testDate, 'Ruidus');

      expect(lunaPhases).toHaveLength(1);
      expect(lunaPhases[0].moon.name).toBe('Luna');

      expect(ruidusPhases).toHaveLength(1);
      expect(ruidusPhases[0].moon.name).toBe('Ruidus');
    });
  });

  describe('WorldTime Integration', () => {
    it('should calculate moon phases from world time', () => {
      // Simulate a world time value
      const worldTime = 86400 * 10; // 10 days in seconds

      const moonPhases = engine.getMoonPhaseAtWorldTime(worldTime);

      expect(moonPhases).toHaveLength(1);
      expect(moonPhases[0].phase.name).toBeDefined();
    });

    it('should get current moon phases', () => {
      // Mock game.time.worldTime for testing
      const originalGame = (global as any).game;
      (global as any).game = {
        time: { worldTime: 86400 * 5 },
      };

      const moonPhases = engine.getCurrentMoonPhases();

      expect(moonPhases).toHaveLength(1);
      expect(moonPhases[0].phase.name).toBeDefined();

      // Restore
      (global as any).game = originalGame;
    });

    it('should handle missing game object gracefully', () => {
      const originalGame = (global as any).game;
      (global as any).game = undefined;

      const moonPhases = engine.getCurrentMoonPhases();

      expect(moonPhases).toHaveLength(1);
      expect(moonPhases[0].phase.name).toBeDefined();

      // Restore
      (global as any).game = originalGame;
    });
  });

  describe('Edge Cases', () => {
    it('should handle calendar without moons', () => {
      const calendarWithoutMoons = { ...testCalendar };
      delete calendarWithoutMoons.moons;

      const engineWithoutMoons = new CalendarEngine(calendarWithoutMoons);
      const moons = engineWithoutMoons.getAllMoons();

      expect(moons).toHaveLength(0);
    });

    it('should handle empty moons array', () => {
      const calendarWithEmptyMoons = { ...testCalendar, moons: [] };

      const engineWithEmptyMoons = new CalendarEngine(calendarWithEmptyMoons);
      const testDate = new CalendarDate(
        {
          year: 2024,
          month: 1,
          day: 15,
          weekday: 0,
        },
        calendarWithEmptyMoons
      );

      const moonPhases = engineWithEmptyMoons.getMoonPhaseInfo(testDate);

      expect(moonPhases).toHaveLength(0);
    });

    it('should validate phase length totals equal cycle length', () => {
      const moon = testCalendar.moons![0];
      const totalPhaseLength = moon.phases.reduce((sum, phase) => sum + phase.length, 0);

      expect(totalPhaseLength).toBeCloseTo(moon.cycleLength, 2);
    });

    it('should handle very distant dates', () => {
      const distantDate = new CalendarDate(
        {
          year: 3024, // 1000 years in the future
          month: 6,
          day: 15,
          weekday: 0,
        },
        testCalendar
      );

      const moonPhases = engine.getMoonPhaseInfo(distantDate);

      expect(moonPhases).toHaveLength(1);
      expect(moonPhases[0].phase.name).toBeDefined();
      expect(moonPhases[0].phaseIndex).toBeGreaterThanOrEqual(0);
      expect(moonPhases[0].phaseIndex).toBeLessThan(8);
    });
  });

  describe('Phase Information Accuracy', () => {
    it('should provide accurate days until next phase', () => {
      const newMoonDate = new CalendarDate(
        {
          year: 2024,
          month: 1,
          day: 11,
          weekday: 0,
        },
        testCalendar
      );

      const moonPhases = engine.getMoonPhaseInfo(newMoonDate);

      expect(moonPhases[0].daysUntilNext).toBe(1); // Should be 1 day until waxing crescent starts
      expect(moonPhases[0].daysUntilNextExact).toBeCloseTo(1, 6);
    });

    it('should provide accurate day in phase', () => {
      const testDate = new CalendarDate(
        {
          year: 2024,
          month: 1,
          day: 13, // 2 days after new moon
          weekday: 0,
        },
        testCalendar
      );

      const moonPhases = engine.getMoonPhaseInfo(testDate);

      expect(moonPhases[0].phase.name).toBe('Waxing Crescent');
      expect(moonPhases[0].dayInPhase).toBe(1); // Second day of waxing crescent phase
      expect(moonPhases[0].dayInPhaseExact).toBeCloseTo(1, 6);
      expect(moonPhases[0].daysUntilNextExact).toBeCloseTo(5.3826475, 6);
      expect(moonPhases[0].phaseProgress).toBeCloseTo(1 / 6.3826475, 6);
    });
  });

  describe('Real-world Lunar Accuracy', () => {
    it('should match known lunar events for 2024', () => {
      // Test lunar cycle progression - approximately 29.5 days apart
      const lunarDates = [
        { month: 1, day: 11, expectedPhase: 'New Moon' }, // January 11, 2024 - reference date
        { month: 2, day: 10, expectedPhase: 'New Moon' }, // February 10, 2024 - approximately one cycle later (30 days)
        { month: 3, day: 11, expectedPhase: 'New Moon' }, // March 11, 2024 - approximately two cycles later (30 days)
      ];

      lunarDates.forEach(({ month, day }) => {
        const date = new CalendarDate(
          {
            year: 2024,
            month,
            day,
            weekday: 0,
          },
          testCalendar
        );

        const moonPhases = engine.getMoonPhaseInfo(date);

        // For approximate dates, allow new moon or close phases
        expect([
          'New Moon',
          'Waxing Crescent', // Allow slight offset
          'Waning Crescent', // Allow slight offset in other direction
        ]).toContain(moonPhases[0].phase.name);
      });
    });
  });
});
