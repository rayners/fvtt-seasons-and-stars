/**
 * Multi-Moon Calendar Tests
 * Tests for real calendar data with multiple moons
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import { CalendarDate } from '../src/core/calendar-date';

// Import calendar data
import exandrianCalendar from '../calendars/exandrian.json';
import gregorianCalendar from '../calendars/gregorian.json';

describe('Multi-Moon Calendar Integration', () => {
  describe('Exandrian Calendar (Critical Role)', () => {
    let engine: CalendarEngine;

    beforeEach(() => {
      engine = new CalendarEngine(exandrianCalendar as any);
    });

    it('should have Catha and Ruidus moons configured', () => {
      const moons = engine.getAllMoons();

      expect(moons).toHaveLength(2);
      expect(moons.map(m => m.name)).toEqual(['Catha', 'Ruidus']);

      // Catha - regular moon
      const catha = moons.find(m => m.name === 'Catha')!;
      expect(catha.cycleLength).toBe(33);
      expect(catha.color).toBe('#e0e0e0');
      expect(catha.phases).toHaveLength(8);

      // Ruidus - irregular moon
      const ruidus = moons.find(m => m.name === 'Ruidus')!;
      expect(ruidus.cycleLength).toBe(328);
      expect(ruidus.color).toBe('#800020');
      expect(ruidus.phases).toHaveLength(8);
    });

    it('should calculate different phases for Catha and Ruidus', () => {
      const testDate = new CalendarDate(
        {
          year: 812,
          month: 2,
          day: 15,
          weekday: 0,
        },
        exandrianCalendar as any
      );

      const moonPhases = engine.getMoonPhaseInfo(testDate);

      expect(moonPhases).toHaveLength(2);

      const cathaPhase = moonPhases.find(mp => mp.moon.name === 'Catha')!;
      const ruidusPhase = moonPhases.find(mp => mp.moon.name === 'Ruidus')!;

      // They should be in different phases since they have different cycles
      expect(cathaPhase.phase.name).toBeDefined();
      expect(ruidusPhase.phase.name).toBeDefined();

      // Verify phase indexes are valid
      expect(cathaPhase.phaseIndex).toBeGreaterThanOrEqual(0);
      expect(cathaPhase.phaseIndex).toBeLessThan(8);
      expect(ruidusPhase.phaseIndex).toBeGreaterThanOrEqual(0);
      expect(ruidusPhase.phaseIndex).toBeLessThan(8);
    });

    it('should handle filtering by moon name', () => {
      const testDate = new CalendarDate(
        {
          year: 812,
          month: 3,
          day: 1,
          weekday: 0,
        },
        exandrianCalendar as any
      );

      const cathaOnly = engine.getMoonPhaseInfo(testDate, 'Catha');
      const ruidusOnly = engine.getMoonPhaseInfo(testDate, 'Ruidus');

      expect(cathaOnly).toHaveLength(1);
      expect(cathaOnly[0].moon.name).toBe('Catha');

      expect(ruidusOnly).toHaveLength(1);
      expect(ruidusOnly[0].moon.name).toBe('Ruidus');
    });

    it('should calculate Catha phases correctly (33-day cycle)', () => {
      // Test Catha reference date
      const referenceDate = new CalendarDate(
        {
          year: 812,
          month: 1,
          day: 1,
          weekday: 0,
        },
        exandrianCalendar as any
      );

      const cathaPhases = engine.getMoonPhaseInfo(referenceDate, 'Catha');

      expect(cathaPhases[0].phase.name).toBe('New Moon');
      expect(cathaPhases[0].phaseIndex).toBe(0);
      expect(cathaPhases[0].dayInPhase).toBe(0);
    });

    it('should show Ruidus has longer phases (41-day phases)', () => {
      const testDate = new CalendarDate(
        {
          year: 812,
          month: 1,
          day: 15,
          weekday: 0,
        },
        exandrianCalendar as any
      );

      const ruidusPhases = engine.getMoonPhaseInfo(testDate, 'Ruidus');

      // Ruidus phases are 41 days long each
      expect(ruidusPhases[0].phase.length).toBe(41);
      expect(ruidusPhases[0].phase.singleDay).toBe(false);
    });
  });

  describe('Gregorian Calendar with Luna', () => {
    let engine: CalendarEngine;

    beforeEach(() => {
      engine = new CalendarEngine(gregorianCalendar as any);
    });

    it('should have Luna moon configured', () => {
      const moons = engine.getAllMoons();

      expect(moons).toHaveLength(1);
      expect(moons[0].name).toBe('Luna');
      expect(moons[0].cycleLength).toBe(29.53059);
      expect(moons[0].color).toBe('#f0f0f0');
      expect(moons[0].phases).toHaveLength(8);
    });

    it('should calculate Earth lunar phases correctly', () => {
      // Test the reference new moon date
      const referenceDate = new CalendarDate(
        {
          year: 2024,
          month: 1,
          day: 11,
          weekday: 0,
        },
        gregorianCalendar as any
      );

      const lunaPhases = engine.getMoonPhaseInfo(referenceDate);

      expect(lunaPhases[0].phase.name).toBe('New Moon');
      expect(lunaPhases[0].phaseIndex).toBe(0);
      expect(lunaPhases[0].dayInPhase).toBe(0);
    });

    it('should progress through standard lunar phases', () => {
      const testDates = [
        { day: 11, expectedPhase: 'New Moon' },
        { day: 12, expectedPhase: 'Waxing Crescent' },
        { day: 18, expectedPhase: 'Waxing Crescent' },
        { day: 19, expectedPhase: 'First Quarter' },
        { day: 26, expectedPhase: 'Full Moon' },
      ];

      testDates.forEach(({ day, expectedPhase }) => {
        const date = new CalendarDate(
          {
            year: 2024,
            month: 1,
            day: day,
            weekday: 0,
          },
          gregorianCalendar as any
        );

        const moonPhases = engine.getMoonPhaseInfo(date);
        expect(moonPhases[0].phase.name).toBe(expectedPhase);
      });
    });
  });

  describe('Cross-Calendar Moon Comparison', () => {
    it('should handle different moon configurations', () => {
      const exandrianEngine = new CalendarEngine(exandrianCalendar as any);
      const gregorianEngine = new CalendarEngine(gregorianCalendar as any);

      const exandrianMoons = exandrianEngine.getAllMoons();
      const gregorianMoons = gregorianEngine.getAllMoons();

      // Exandria has two moons
      expect(exandrianMoons).toHaveLength(2);
      expect(exandrianMoons.map(m => m.name)).toEqual(['Catha', 'Ruidus']);

      // Earth has one moon
      expect(gregorianMoons).toHaveLength(1);
      expect(gregorianMoons[0].name).toBe('Luna');

      // Different cycle lengths
      expect(exandrianMoons[0].cycleLength).toBe(33); // Catha
      expect(exandrianMoons[1].cycleLength).toBe(328); // Ruidus
      expect(gregorianMoons[0].cycleLength).toBe(29.53059); // Luna
    });

    it('should demonstrate multi-moon vs single-moon behavior', () => {
      const exandrianEngine = new CalendarEngine(exandrianCalendar as any);
      const gregorianEngine = new CalendarEngine(gregorianCalendar as any);

      // Same relative date in both calendars
      const exandrianDate = new CalendarDate(
        {
          year: 812,
          month: 2,
          day: 1,
          weekday: 0,
        },
        exandrianCalendar as any
      );

      const gregorianDate = new CalendarDate(
        {
          year: 2024,
          month: 2,
          day: 1,
          weekday: 0,
        },
        gregorianCalendar as any
      );

      const exandrianPhases = exandrianEngine.getMoonPhaseInfo(exandrianDate);
      const gregorianPhases = gregorianEngine.getMoonPhaseInfo(gregorianDate);

      // Exandria returns two moon phases
      expect(exandrianPhases).toHaveLength(2);

      // Earth returns one moon phase
      expect(gregorianPhases).toHaveLength(1);

      // All phases should be valid
      exandrianPhases.forEach(phase => {
        expect(phase.phase.name).toBeDefined();
        expect(phase.phaseIndex).toBeGreaterThanOrEqual(0);
        expect(phase.phaseIndex).toBeLessThan(8);
      });

      gregorianPhases.forEach(phase => {
        expect(phase.phase.name).toBeDefined();
        expect(phase.phaseIndex).toBeGreaterThanOrEqual(0);
        expect(phase.phaseIndex).toBeLessThan(8);
      });
    });
  });

  describe('Real Calendar Integration Tests', () => {
    it('should handle calendar loading and moon calculations', () => {
      // Test that the JSON calendar data loads correctly
      expect(exandrianCalendar.moons).toBeDefined();
      expect(exandrianCalendar.moons).toHaveLength(2);

      expect(gregorianCalendar.moons).toBeDefined();
      expect(gregorianCalendar.moons).toHaveLength(1);

      // Test that engines can be created
      const exandrianEngine = new CalendarEngine(exandrianCalendar as any);
      const gregorianEngine = new CalendarEngine(gregorianCalendar as any);

      expect(exandrianEngine.getAllMoons()).toHaveLength(2);
      expect(gregorianEngine.getAllMoons()).toHaveLength(1);
    });

    it('should validate moon phase totals equal cycle lengths', () => {
      // Test Exandrian moons
      const exandrianEngine = new CalendarEngine(exandrianCalendar as any);
      const exandrianMoons = exandrianEngine.getAllMoons();

      exandrianMoons.forEach(moon => {
        const totalPhaseLength = moon.phases.reduce((sum, phase) => sum + phase.length, 0);
        expect(totalPhaseLength).toBeCloseTo(moon.cycleLength, 2);
      });

      // Test Gregorian moon
      const gregorianEngine = new CalendarEngine(gregorianCalendar as any);
      const gregorianMoons = gregorianEngine.getAllMoons();

      gregorianMoons.forEach(moon => {
        const totalPhaseLength = moon.phases.reduce((sum, phase) => sum + phase.length, 0);
        expect(totalPhaseLength).toBeCloseTo(moon.cycleLength, 2);
      });
    });
  });
});
