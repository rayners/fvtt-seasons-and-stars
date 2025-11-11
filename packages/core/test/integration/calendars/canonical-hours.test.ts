/**
 * Comprehensive Canonical Hours Tests
 * Tests the findCanonicalHour helper function with various scenarios
 */

import { describe, it, expect } from 'vitest';
import { DateFormatter } from '../../../src/core/date-formatter';
import type { SeasonsStarsCalendar, CalendarCanonicalHour } from '../../../src/types/calendar';

/* eslint-disable @typescript-eslint/no-non-null-assertion */

describe('Canonical Hours - Comprehensive Tests', () => {
  const mockCalendar: SeasonsStarsCalendar = {
    id: 'test-calendar',
    translations: { en: { label: 'Test Calendar' } },
    year: { epoch: 0, currentYear: 2024, prefix: '', suffix: '', startDay: 0 },
    leapYear: { rule: 'none' },
    months: [{ name: 'January', days: 31 }],
    weekdays: [{ name: 'Sunday' }],
    intercalary: [],
    time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
    canonicalHours: [
      { name: "Strange's Bells", startHour: 3, endHour: 6, startMinute: 0, endMinute: 0 },
      { name: "Dawn's Call", startHour: 9, endHour: 11, startMinute: 0, endMinute: 0 },
      { name: 'High Sun', startHour: 12, endHour: 13, startMinute: 0, endMinute: 30 },
      { name: 'Night Watch', startHour: 23, endHour: 2, startMinute: 0, endMinute: 0 },
    ],
  };

  const testCanonicalHours: CalendarCanonicalHour[] = [
    { name: "Strange's Bells", startHour: 3, endHour: 6, startMinute: 0, endMinute: 0 },
    { name: "Dawn's Call", startHour: 9, endHour: 11, startMinute: 0, endMinute: 0 },
    { name: 'High Sun', startHour: 12, endHour: 13, startMinute: 0, endMinute: 30 },
  ];

  describe('findCanonicalHour - Basic Functionality', () => {
    it('should find matching canonical hour within range', () => {
      const result = DateFormatter.findCanonicalHour(testCanonicalHours, 4, 30, mockCalendar);
      expect(result?.name).toBe("Strange's Bells");
    });

    it('should find canonical hour within standard range', () => {
      const result = DateFormatter.findCanonicalHour(
        mockCalendar.canonicalHours!,
        4,
        30,
        mockCalendar
      );
      expect(result?.name).toBe("Strange's Bells");
    });

    it('should return null when time is outside all ranges', () => {
      const result = DateFormatter.findCanonicalHour(testCanonicalHours, 7, 30, mockCalendar);
      expect(result).toBeNull();
    });

    it('should return null for time outside all ranges', () => {
      const result = DateFormatter.findCanonicalHour(
        mockCalendar.canonicalHours!,
        7,
        30,
        mockCalendar
      );
      expect(result).toBeNull();
    });

    it("should find Dawn's Call during the correct period", () => {
      const result = DateFormatter.findCanonicalHour(
        mockCalendar.canonicalHours!,
        10,
        0,
        mockCalendar
      );
      expect(result?.name).toBe("Dawn's Call");
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle exact start time (inclusive)', () => {
      const result = DateFormatter.findCanonicalHour(testCanonicalHours, 3, 0, mockCalendar);
      expect(result?.name).toBe("Strange's Bells");
    });

    it('should handle exact start time (inclusive) - calendar version', () => {
      const result = DateFormatter.findCanonicalHour(
        mockCalendar.canonicalHours!,
        3,
        0,
        mockCalendar
      );
      expect(result?.name).toBe("Strange's Bells");
    });

    it('should handle exact end time (exclusive)', () => {
      const result = DateFormatter.findCanonicalHour(testCanonicalHours, 6, 0, mockCalendar);
      expect(result).toBeNull();
    });

    it('should not find canonical hour at exact end time (exclusive)', () => {
      const result = DateFormatter.findCanonicalHour(
        mockCalendar.canonicalHours!,
        13,
        30,
        mockCalendar
      );
      expect(result).toBeNull();
    });
  });

  describe('Minute Precision', () => {
    it('should handle minute precision', () => {
      const result = DateFormatter.findCanonicalHour(testCanonicalHours, 13, 15, mockCalendar);
      expect(result?.name).toBe('High Sun');

      const resultAfter = DateFormatter.findCanonicalHour(testCanonicalHours, 13, 30, mockCalendar);
      expect(resultAfter).toBeNull();
    });

    it('should find canonical hour with minute precision', () => {
      const result = DateFormatter.findCanonicalHour(
        mockCalendar.canonicalHours!,
        13,
        15,
        mockCalendar
      );
      expect(result?.name).toBe('High Sun');
    });
  });

  describe('Different Time Systems', () => {
    it('should work with different minutesInHour', () => {
      const calendar50Min = {
        ...mockCalendar,
        time: { hoursInDay: 24, minutesInHour: 50, secondsInMinute: 60 },
      };
      const canonicalHours = [
        { name: 'Test Hour', startHour: 3, endHour: 4, startMinute: 0, endMinute: 0 },
      ];

      const result = DateFormatter.findCanonicalHour(canonicalHours, 3, 25, calendar50Min);
      expect(result?.name).toBe('Test Hour');
    });

    it('should work with different minutes per hour', () => {
      const calendar50Min = {
        ...mockCalendar,
        time: { hoursInDay: 24, minutesInHour: 50, secondsInMinute: 60 },
      };

      const canonicalHours = [
        { name: 'Test Hour', startHour: 3, endHour: 4, startMinute: 0, endMinute: 0 },
      ];

      // Test within range with 50-minute hours
      const result = DateFormatter.findCanonicalHour(canonicalHours, 3, 25, calendar50Min);
      expect(result?.name).toBe('Test Hour');
    });
  });

  describe('Midnight Wraparound', () => {
    const wraparoundHours: CalendarCanonicalHour[] = [
      { name: 'Night Watch', startHour: 23, endHour: 2, startMinute: 0, endMinute: 0 },
    ];

    it('should handle midnight wraparound - late night', () => {
      const result = DateFormatter.findCanonicalHour(wraparoundHours, 23, 30, mockCalendar);
      expect(result?.name).toBe('Night Watch');
    });

    it('should handle midnight wraparound - late night (calendar version)', () => {
      const result = DateFormatter.findCanonicalHour(
        mockCalendar.canonicalHours!,
        23,
        30,
        mockCalendar
      );
      expect(result?.name).toBe('Night Watch');
    });

    it('should handle midnight wraparound - early morning', () => {
      const result = DateFormatter.findCanonicalHour(wraparoundHours, 1, 30, mockCalendar);
      expect(result?.name).toBe('Night Watch');
    });

    it('should handle midnight wraparound - early morning (calendar version)', () => {
      const result = DateFormatter.findCanonicalHour(
        mockCalendar.canonicalHours!,
        1,
        30,
        mockCalendar
      );
      expect(result?.name).toBe('Night Watch');
    });

    it('should not match times outside wraparound range', () => {
      const result = DateFormatter.findCanonicalHour(wraparoundHours, 3, 0, mockCalendar);
      expect(result).toBeNull();
    });

    it('should handle complex ranges without conflicts', () => {
      // Night Watch ends at 2:00, Strange's Bells starts at 3:00
      // Test 2:30 should not match anything
      const result = DateFormatter.findCanonicalHour(
        mockCalendar.canonicalHours!,
        2,
        30,
        mockCalendar
      );
      expect(result).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should return null for empty canonical hours array', () => {
      const result = DateFormatter.findCanonicalHour([], 4, 30, mockCalendar);
      expect(result).toBeNull();
    });

    it('should handle empty canonical hours array', () => {
      const result = DateFormatter.findCanonicalHour([], 12, 0, mockCalendar);
      expect(result).toBeNull();
    });

    it('should handle undefined canonical hours', () => {
      const result = DateFormatter.findCanonicalHour(undefined as any, 12, 0, mockCalendar);
      expect(result).toBeNull();
    });

    it('should handle calendar without canonical hours property', () => {
      const calendarWithoutCanonical = { ...mockCalendar };
      delete calendarWithoutCanonical.canonicalHours;

      const result = DateFormatter.findCanonicalHour([], 12, 0, calendarWithoutCanonical);
      expect(result).toBeNull();
    });
  });

  describe('Performance with Multiple Ranges', () => {
    it('should find first matching range when multiple could match', () => {
      const overlappingHours: CalendarCanonicalHour[] = [
        { name: 'First Match', startHour: 10, endHour: 14, startMinute: 0, endMinute: 0 },
        { name: 'Second Match', startHour: 12, endHour: 16, startMinute: 0, endMinute: 0 },
      ];

      const result = DateFormatter.findCanonicalHour(overlappingHours, 13, 0, mockCalendar);
      expect(result?.name).toBe('First Match');
    });
  });
});
