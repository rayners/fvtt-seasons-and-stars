/**
 * Tests for CalendarValidator enhanced error messages
 */

import { describe, it, expect } from 'vitest';
import { CalendarValidator } from '../src/core/calendar-validator';

describe('CalendarValidator - Enhanced Error Messages', () => {
  describe('Additional Properties Detection', () => {
    it('should list unexpected root properties by name', async () => {
      const invalidCalendar = {
        id: 'test-calendar',
        translations: {
          en: {
            label: 'Test Calendar',
          },
        },
        months: [{ name: 'January', days: 31 }],
        weekdays: [{ name: 'Monday' }],
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 60,
        },
        unexpectedProperty: 'should not be here',
        anotherBadProp: 'also invalid',
      };

      const result = await CalendarValidator.validate(invalidCalendar);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      const errorText = result.errors.join(' ');
      expect(errorText).toContain('unexpectedProperty');
      expect(errorText).toContain('anotherBadProp');
    });

    it('should detect case-sensitivity error with learyear vs leapYear', async () => {
      const invalidCalendar = {
        id: 'test-calendar',
        translations: {
          en: {
            label: 'Test Calendar',
          },
        },
        months: [{ name: 'January', days: 31 }],
        weekdays: [{ name: 'Monday' }],
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 60,
        },
        learyear: {
          rule: 'gregorian',
          month: 'January',
          extraDays: 1,
        },
      };

      const result = await CalendarValidator.validate(invalidCalendar);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      const errorText = result.errors.join(' ');
      expect(errorText).toContain('learyear');
      expect(errorText.toLowerCase()).toContain('leapyear');
      expect(errorText).toContain('did you mean');
    });

    it('should suggest correction for intercalery vs intercalary', async () => {
      const invalidCalendar = {
        id: 'test-calendar',
        translations: {
          en: {
            label: 'Test Calendar',
          },
        },
        months: [{ name: 'January', days: 31 }],
        weekdays: [{ name: 'Monday' }],
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 60,
        },
        intercalery: [],
      };

      const result = await CalendarValidator.validate(invalidCalendar);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      const errorText = result.errors.join(' ');
      expect(errorText).toContain('intercalery');
      expect(errorText.toLowerCase()).toContain('intercalary');
    });

    it('should suggest correction for weakdays vs weekdays', async () => {
      const invalidCalendar = {
        id: 'test-calendar',
        translations: {
          en: {
            label: 'Test Calendar',
          },
        },
        months: [{ name: 'January', days: 31 }],
        weakdays: [{ name: 'Monday' }],
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 60,
        },
      };

      const result = await CalendarValidator.validate(invalidCalendar);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      const errorText = result.errors.join(' ');
      expect(errorText).toContain('weakdays');
      expect(errorText.toLowerCase()).toContain('weekdays');
    });

    it('should handle multiple unexpected properties at once', async () => {
      const invalidCalendar = {
        id: 'test-calendar',
        translations: {
          en: {
            label: 'Test Calendar',
          },
        },
        months: [{ name: 'January', days: 31 }],
        weekdays: [{ name: 'Monday' }],
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 60,
        },
        learyear: { rule: 'none' },
        intercalery: [],
        extraField: 'value',
      };

      const result = await CalendarValidator.validate(invalidCalendar);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      const errorText = result.errors.join(' ');
      expect(errorText).toContain('learyear');
      expect(errorText).toContain('intercalery');
      expect(errorText).toContain('extraField');
    });

    it('should provide helpful message for completely unknown property', async () => {
      const invalidCalendar = {
        id: 'test-calendar',
        translations: {
          en: {
            label: 'Test Calendar',
          },
        },
        months: [{ name: 'January', days: 31 }],
        weekdays: [{ name: 'Monday' }],
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 60,
        },
        completelyRandomField: 'not in schema at all',
      };

      const result = await CalendarValidator.validate(invalidCalendar);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      const errorText = result.errors.join(' ');
      expect(errorText).toContain('completelyRandomField');
      expect(errorText.toLowerCase()).toMatch(/unexpected|not.*allowed|invalid/i);
    });
  });

  describe('Nested Properties', () => {
    it('should handle unexpected properties in nested objects', async () => {
      const invalidCalendar = {
        id: 'test-calendar',
        translations: {
          en: {
            label: 'Test Calendar',
            invalidTranslationField: 'should not be here',
          },
        },
        months: [{ name: 'January', days: 31 }],
        weekdays: [{ name: 'Monday' }],
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 60,
        },
      };

      const result = await CalendarValidator.validate(invalidCalendar);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      const errorText = result.errors.join(' ');
      expect(errorText).toContain('invalidTranslationField');
    });
  });

  describe('Valid Calendars', () => {
    it('should not show extra property errors for valid calendars', async () => {
      const validCalendar = {
        id: 'test-calendar',
        translations: {
          en: {
            label: 'Test Calendar',
          },
        },
        months: [{ name: 'January', days: 31 }],
        weekdays: [{ name: 'Monday' }],
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 60,
        },
        leapYear: {
          rule: 'gregorian',
          month: 'January',
          extraDays: 1,
        },
        intercalary: [],
      };

      const result = await CalendarValidator.validate(validCalendar);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Nested Path Handling (P1 Bug)', () => {
    it('should not misreport valid nested properties when an invalid property exists', async () => {
      const calendarWithInvalidMonthProperty = {
        id: 'test-calendar',
        translations: {
          en: {
            label: 'Test Calendar',
          },
        },
        months: [
          {
            name: 'January',
            days: 31,
            invalidMonthProp: 'this is wrong',
          },
        ],
        weekdays: [{ name: 'Monday' }],
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 60,
        },
      };

      const result = await CalendarValidator.validate(calendarWithInvalidMonthProperty);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      const errorText = result.errors.join(' ');
      expect(errorText).toContain('invalidMonthProp');
      expect(errorText).not.toContain('name');
      expect(errorText).not.toContain('days');
    });

    it('should fallback to generic message for truly unhandled nested paths', async () => {
      const calendarWithInvalidSeasonProperty = {
        id: 'test-calendar',
        translations: {
          en: {
            label: 'Test Calendar',
          },
        },
        months: [{ name: 'January', days: 31 }],
        weekdays: [{ name: 'Monday' }],
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 60,
        },
        seasons: [
          {
            name: 'Spring',
            startMonth: 'January',
            unknownSeasonField: 'invalid',
          },
        ],
      };

      const result = await CalendarValidator.validate(calendarWithInvalidSeasonProperty);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      const errorText = result.errors.join(' ');
      expect(errorText).toMatch(/must NOT have additional properties/i);
    });
  });
});
