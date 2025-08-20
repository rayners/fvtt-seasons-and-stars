/**
 * Canonical Hours Calendar Integration Tests
 * Tests the integration of canonical hours with calendar system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import { DateFormatter } from '../src/core/date-formatter';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

/* eslint-disable @typescript-eslint/no-non-null-assertion */

// Mock calendar with canonical hours for testing
const mockCanonicalHoursCalendar: SeasonsStarsCalendar = {
  id: 'test-canonical',
  translations: { en: { label: 'Test Canonical Calendar' } },
  year: { epoch: 0, currentYear: 2024, prefix: '', suffix: '', startDay: 0 },
  leapYear: { rule: 'none' },
  months: [{ name: 'January', days: 31 }],
  weekdays: [{ name: 'Sunday' }],
  intercalary: [],
  time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
  canonicalHours: [
    { name: "Strange's Bells", startHour: 3, endHour: 6, startMinute: 0, endMinute: 0 },
    { name: "Dawn's Call", startHour: 9, endHour: 11, startMinute: 0, endMinute: 0 },
    {
      name: 'Very Long Canonical Hour Name',
      startHour: 12,
      endHour: 13,
      startMinute: 0,
      endMinute: 0,
    },
  ],
};

describe('Canonical Hours Calendar Integration', () => {
  let calendarEngine: CalendarEngine;
  let dateFormatter: DateFormatter;

  // Silence unused variable warning - needed for test setup
  void dateFormatter;

  beforeEach(() => {
    calendarEngine = new CalendarEngine(mockCanonicalHoursCalendar);
    dateFormatter = new DateFormatter(mockCanonicalHoursCalendar);
  });

  describe('Calendar Loading with Canonical Hours', () => {
    it('should load calendar with canonical hours correctly', () => {
      const calendar = calendarEngine.getCalendar();
      expect(calendar.canonicalHours).toBeDefined();
      expect(calendar.canonicalHours).toHaveLength(3);
    });

    it('should preserve canonical hour properties', () => {
      const canonicalHours = calendarEngine.getCalendar().canonicalHours;
      expect(canonicalHours).toBeDefined();

      const strangesBells = canonicalHours?.find(h => h.name === "Strange's Bells");
      expect(strangesBells).toBeDefined();
      expect(strangesBells?.startHour).toBe(3);
      expect(strangesBells?.endHour).toBe(6);
    });
  });

  describe('DateFormatter with Canonical Hours', () => {
    it("should find canonical hour during Strange's Bells period", () => {
      // Test the findCanonicalHour method directly
      const canonicalHours = mockCanonicalHoursCalendar.canonicalHours!;
      const result = (DateFormatter as any).findCanonicalHour(
        canonicalHours,
        4, // hour
        30, // minute
        mockCanonicalHoursCalendar
      );

      expect(result).not.toBeNull();
      expect(result?.name).toBe("Strange's Bells");
    });

    it('should return null outside canonical periods', () => {
      // Test the findCanonicalHour method directly for time outside periods
      const canonicalHours = mockCanonicalHoursCalendar.canonicalHours!;
      const result = (DateFormatter as any).findCanonicalHour(
        canonicalHours,
        7, // hour
        30, // minute
        mockCanonicalHoursCalendar
      );

      expect(result).toBeNull();
    });

    it('should handle midnight wraparound canonical hours', () => {
      // Create canonical hours with night watch spanning midnight
      const nightWatchHours = [
        { name: 'Night Watch', startHour: 23, endHour: 2, startMinute: 0, endMinute: 0 },
      ];

      // Test late night (23:30)
      let result = (DateFormatter as any).findCanonicalHour(
        nightWatchHours,
        23, // hour
        30, // minute
        mockCanonicalHoursCalendar
      );
      expect(result?.name).toBe('Night Watch');

      // Test early morning (01:30)
      result = (DateFormatter as any).findCanonicalHour(
        nightWatchHours,
        1, // hour
        30, // minute
        mockCanonicalHoursCalendar
      );
      expect(result?.name).toBe('Night Watch');
    });

    it('should handle minute precision in canonical hours', () => {
      // Create canonical hours with precise minute boundaries
      const preciseHours = [
        { name: 'High Sun', startHour: 12, endHour: 12, startMinute: 30, endMinute: 45 },
      ];

      // Test just inside the period (12:35)
      let result = (DateFormatter as any).findCanonicalHour(
        preciseHours,
        12, // hour
        35, // minute
        mockCanonicalHoursCalendar
      );
      expect(result?.name).toBe('High Sun');

      // Test exactly at end time (should be outside)
      result = (DateFormatter as any).findCanonicalHour(
        preciseHours,
        12, // hour
        45, // minute
        mockCanonicalHoursCalendar
      );
      expect(result).toBeNull(); // Should be outside the range
    });

    it("should find Dawn's Call during the correct period", () => {
      // Test during Dawn's Call period (9-11)
      const canonicalHours = mockCanonicalHoursCalendar.canonicalHours!;
      const result = (DateFormatter as any).findCanonicalHour(
        canonicalHours,
        10, // hour
        0, // minute
        mockCanonicalHoursCalendar
      );

      expect(result?.name).toBe("Dawn's Call");
    });
  });

  describe('Widget compatibility with canonical hours', () => {
    it('should provide canonical hour data for widgets', () => {
      // Verify that calendar has canonical hours for widget use
      const canonicalHours = mockCanonicalHoursCalendar.canonicalHours;
      expect(canonicalHours).toBeDefined();
      expect(canonicalHours).toHaveLength(3);

      const strangesBells = canonicalHours?.find(h => h.name === "Strange's Bells");
      expect(strangesBells).toBeDefined();
      expect(strangesBells?.startHour).toBe(3);
      expect(strangesBells?.endHour).toBe(6);
    });

    it('should handle times outside canonical periods for widgets', () => {
      // Test a time that falls outside any canonical period
      const canonicalHours = mockCanonicalHoursCalendar.canonicalHours!;
      const result = (DateFormatter as any).findCanonicalHour(
        canonicalHours,
        8, // hour
        0, // minute
        mockCanonicalHoursCalendar
      );

      expect(result).toBeNull(); // No canonical hour at 8:00
    });

    it('should work with different time structures', () => {
      // Test with a calendar that has different minutes per hour
      const differentTimeCalendar = {
        ...mockCanonicalHoursCalendar,
        time: { hoursInDay: 20, minutesInHour: 50, secondsInMinute: 60 },
        canonicalHours: [
          { name: 'Alien Hour', startHour: 5, endHour: 8, startMinute: 0, endMinute: 0 },
        ],
      };

      const result = (DateFormatter as any).findCanonicalHour(
        differentTimeCalendar.canonicalHours,
        6, // hour
        25, // minute (in 50-minute hour system)
        differentTimeCalendar
      );

      expect(result?.name).toBe('Alien Hour');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty canonical hours array', () => {
      const emptyCanonicalHours: any[] = [];
      const result = (DateFormatter as any).findCanonicalHour(
        emptyCanonicalHours,
        12, // hour
        0, // minute
        mockCanonicalHoursCalendar
      );

      expect(result).toBeNull();
    });

    it('should handle undefined canonical hours', () => {
      const calendarWithoutCanonical = {
        ...mockCanonicalHoursCalendar,
        canonicalHours: undefined,
      };

      const result = (DateFormatter as any).findCanonicalHour(
        undefined,
        12, // hour
        0, // minute
        calendarWithoutCanonical
      );

      expect(result).toBeNull();
    });

    it('should handle boundary times correctly', () => {
      const canonicalHours = mockCanonicalHoursCalendar.canonicalHours!;

      // Test exactly at start time (should be included)
      let result = (DateFormatter as any).findCanonicalHour(
        canonicalHours,
        3, // hour
        0, // minute
        mockCanonicalHoursCalendar
      );
      expect(result?.name).toBe("Strange's Bells");

      // Test exactly at end time (should be excluded)
      result = (DateFormatter as any).findCanonicalHour(
        canonicalHours,
        6, // hour
        0, // minute
        mockCanonicalHoursCalendar
      );
      expect(result).toBeNull();
    });
  });
});
