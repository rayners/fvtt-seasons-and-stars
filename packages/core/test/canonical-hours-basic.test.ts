/**
 * Basic Canonical Hours Tests
 */

import { describe, it, expect } from 'vitest';
import { DateFormatter } from '../src/core/date-formatter';
import type { SeasonsStarsCalendar, CalendarCanonicalHour } from '../src/types/calendar';

describe('Canonical Hours - Basic Logic', () => {
  const mockCalendar: SeasonsStarsCalendar = {
    id: 'test-calendar',
    translations: { en: { label: 'Test Calendar' } },
    year: { epoch: 0, currentYear: 2024, prefix: '', suffix: '', startDay: 0 },
    leapYear: { rule: 'none' },
    months: [{ name: 'January', days: 31 }],
    weekdays: [{ name: 'Sunday' }],
    intercalary: [],
    time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
  };

  const testCanonicalHours: CalendarCanonicalHour[] = [
    { name: "Strange's Bells", startHour: 3, endHour: 6, startMinute: 0, endMinute: 0 },
    { name: "Dawn's Call", startHour: 9, endHour: 11, startMinute: 0, endMinute: 0 },
    { name: 'High Sun', startHour: 12, endHour: 13, startMinute: 0, endMinute: 30 },
  ];

  describe('findCanonicalHour', () => {
    it('should find matching canonical hour within range', () => {
      const result = DateFormatter.findCanonicalHour(testCanonicalHours, 4, 30, mockCalendar);
      expect(result?.name).toBe("Strange's Bells");
    });

    it('should return null when time is outside all ranges', () => {
      const result = DateFormatter.findCanonicalHour(testCanonicalHours, 7, 30, mockCalendar);
      expect(result).toBeNull();
    });

    it('should handle exact start time (inclusive)', () => {
      const result = DateFormatter.findCanonicalHour(testCanonicalHours, 3, 0, mockCalendar);
      expect(result?.name).toBe("Strange's Bells");
    });

    it('should handle exact end time (exclusive)', () => {
      const result = DateFormatter.findCanonicalHour(testCanonicalHours, 6, 0, mockCalendar);
      expect(result).toBeNull();
    });

    it('should handle minute precision', () => {
      const result = DateFormatter.findCanonicalHour(testCanonicalHours, 13, 15, mockCalendar);
      expect(result?.name).toBe('High Sun');

      const resultAfter = DateFormatter.findCanonicalHour(testCanonicalHours, 13, 30, mockCalendar);
      expect(resultAfter).toBeNull();
    });

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

    it('should return null for empty canonical hours array', () => {
      const result = DateFormatter.findCanonicalHour([], 4, 30, mockCalendar);
      expect(result).toBeNull();
    });
  });

  describe('midnight wraparound', () => {
    const wraparoundHours: CalendarCanonicalHour[] = [
      { name: 'Night Watch', startHour: 23, endHour: 2, startMinute: 0, endMinute: 0 },
    ];

    it('should handle midnight wraparound - late night', () => {
      const result = DateFormatter.findCanonicalHour(wraparoundHours, 23, 30, mockCalendar);
      expect(result?.name).toBe('Night Watch');
    });

    it('should handle midnight wraparound - early morning', () => {
      const result = DateFormatter.findCanonicalHour(wraparoundHours, 1, 30, mockCalendar);
      expect(result?.name).toBe('Night Watch');
    });

    it('should not match times outside wraparound range', () => {
      const result = DateFormatter.findCanonicalHour(wraparoundHours, 3, 0, mockCalendar);
      expect(result).toBeNull();
    });
  });
});
