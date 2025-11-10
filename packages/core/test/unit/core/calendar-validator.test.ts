/**
 * Tests for CalendarValidator enhanced error messages
 */

import { describe, it, expect } from 'vitest';
import { CalendarValidator } from '../../../src/core/calendar-validator';
import { DateFormatter } from '../../../src/core/date-formatter';

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

  describe('Intercalary Day Validation', () => {
    describe('Schema Validation - After vs Before', () => {
      it('should accept intercalary days with "after" property', async () => {
        const calendarWithAfter = {
          id: 'test-intercalary-after',
          translations: {
            en: {
              label: 'Test Calendar',
            },
          },
          months: [
            { name: 'January', days: 31 },
            { name: 'February', days: 28 },
          ],
          weekdays: [{ name: 'Monday' }],
          time: {
            hoursInDay: 24,
            minutesInHour: 60,
            secondsInMinute: 60,
          },
          intercalary: [
            {
              name: 'Mid-Year Day',
              after: 'January',
              days: 1,
            },
          ],
        };

        const result = await CalendarValidator.validate(calendarWithAfter);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept intercalary days with "before" property', async () => {
        const calendarWithBefore = {
          id: 'test-intercalary-before',
          translations: {
            en: {
              label: 'Test Calendar',
            },
          },
          months: [
            { name: 'January', days: 31 },
            { name: 'February', days: 28 },
          ],
          weekdays: [{ name: 'Monday' }],
          time: {
            hoursInDay: 24,
            minutesInHour: 60,
            secondsInMinute: 60,
          },
          intercalary: [
            {
              name: 'New Year Day',
              before: 'January',
              days: 1,
            },
          ],
        };

        const result = await CalendarValidator.validate(calendarWithBefore);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject intercalary days with both "after" and "before"', async () => {
        const calendarWithBoth = {
          id: 'test-intercalary-both',
          translations: {
            en: {
              label: 'Test Calendar',
            },
          },
          months: [
            { name: 'January', days: 31 },
            { name: 'February', days: 28 },
          ],
          weekdays: [{ name: 'Monday' }],
          time: {
            hoursInDay: 24,
            minutesInHour: 60,
            secondsInMinute: 60,
          },
          intercalary: [
            {
              name: 'Confused Day',
              after: 'January',
              before: 'February',
              days: 1,
            },
          ],
        };

        const result = await CalendarValidator.validate(calendarWithBoth);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should reject intercalary days with neither "after" nor "before"', async () => {
        const calendarWithNeither = {
          id: 'test-intercalary-neither',
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
          intercalary: [
            {
              name: 'Lost Day',
              days: 1,
            },
          ],
        };

        const result = await CalendarValidator.validate(calendarWithNeither);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('Cross-Reference Validation', () => {
      it('should error when "after" references non-existent month', async () => {
        const calendarWithInvalidAfter = {
          id: 'test-invalid-after',
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
          intercalary: [
            {
              name: 'Mystery Day',
              after: 'NonexistentMonth',
              days: 1,
            },
          ],
        };

        const result = await CalendarValidator.validate(calendarWithInvalidAfter);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);

        const errorText = result.errors.join(' ');
        expect(errorText).toContain('Intercalary day');
        expect(errorText).toContain('NonexistentMonth');
        expect(errorText).toMatch(/references non-existent month/i);
      });

      it('should error when "before" references non-existent month', async () => {
        const calendarWithInvalidBefore = {
          id: 'test-invalid-before',
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
          intercalary: [
            {
              name: 'New Year Day',
              before: 'NonexistentMonth',
              days: 1,
            },
          ],
        };

        const result = await CalendarValidator.validate(calendarWithInvalidBefore);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);

        const errorText = result.errors.join(' ');
        expect(errorText).toContain('Intercalary day');
        expect(errorText).toContain('NonexistentMonth');
        expect(errorText).toMatch(/references non-existent month/i);
      });

      it('should validate multiple intercalary days with mixed "after" and "before"', async () => {
        const calendarWithMixed = {
          id: 'test-mixed-intercalary',
          translations: {
            en: {
              label: 'Test Calendar',
            },
          },
          months: [
            { name: 'Spring', days: 30 },
            { name: 'Summer', days: 31 },
            { name: 'Autumn', days: 30 },
            { name: 'Winter', days: 31 },
          ],
          weekdays: [{ name: 'Day1' }, { name: 'Day2' }],
          time: {
            hoursInDay: 24,
            minutesInHour: 60,
            secondsInMinute: 60,
          },
          intercalary: [
            {
              name: 'New Year Day',
              before: 'Spring',
              days: 1,
            },
            {
              name: 'Mid-Summer Festival',
              after: 'Summer',
              days: 2,
            },
            {
              name: 'Harvest Day',
              after: 'Autumn',
              days: 1,
            },
          ],
        };

        const result = await CalendarValidator.validate(calendarWithMixed);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should report all invalid intercalary references', async () => {
        const calendarWithMultipleInvalid = {
          id: 'test-multiple-invalid',
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
          intercalary: [
            {
              name: 'Day 1',
              after: 'BadMonth1',
              days: 1,
            },
            {
              name: 'Day 2',
              before: 'BadMonth2',
              days: 1,
            },
            {
              name: 'Day 3',
              after: 'January', // This one is valid
              days: 1,
            },
          ],
        };

        const result = await CalendarValidator.validate(calendarWithMultipleInvalid);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(2);

        const errorText = result.errors.join(' ');
        expect(errorText).toContain('BadMonth1');
        expect(errorText).toContain('BadMonth2');
        expect(errorText).not.toContain('Day 3');
      });
    });
  });
});

// ========================================
// JSON Syntax Validation Tests
// ========================================
describe('Calendar JSON Syntax Validation', () => {
  let formatter: DateFormatter;
  let mockCalendar: SeasonsStarsCalendar;
  let mockDate: CalendarDate;

  beforeEach(() => {
    // Reset Handlebars helpers before each test
    DateFormatter.resetHelpersForTesting();

    mockCalendar = {
      id: 'test-calendar',
      name: 'Test Calendar',
      months: [{ name: 'January', abbreviation: 'Jan', days: 31 }],
      weekdays: [
        { name: 'Sunday', abbreviation: 'Sun' },
        { name: 'Monday', abbreviation: 'Mon' },
      ],
      year: { prefix: '', suffix: '' },
      time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
    } as SeasonsStarsCalendar;

    mockDate = {
      year: 2024,
      month: 1,
      day: 15,
      weekday: 0,
      time: { hour: 14, minute: 30, second: 45 },
    } as CalendarDate;

    formatter = new DateFormatter(mockCalendar);
  });

  describe('Template Syntax Validation', () => {
    it('should handle invalid helper syntax gracefully', () => {
      // Test with invalid helper syntax that should cause compilation to fail
      const invalidTemplate = '{{ss-hour format="unclosed-quote}}:{{ss-minute format="pad"}}';

      // This should handle the error gracefully and fall back to basic format
      const result = formatter.format(mockDate, invalidTemplate);

      // Should fall back to basic format when template compilation fails
      expect(result).toContain('Sunday'); // Basic format includes weekday
      expect(result).toContain('15th'); // Basic format includes ordinal
      expect(result).toContain('January'); // Basic format includes month name
      expect(result).toContain('2024'); // Basic format includes year
    });

    it('should succeed with correct double quote syntax', () => {
      // GREEN: This should work with proper double quotes and correct helper syntax
      const validTemplate =
        '{{ss-hour format="pad"}}:{{ss-minute format="pad"}}:{{ss-second format="pad"}} UTC';

      const result = formatter.format(mockDate, validTemplate);

      expect(result).toBe('14:30:45 UTC');
    });

    it('should handle missing helper parameters gracefully', () => {
      // Test template with old-style helper syntax (missing required parameters)
      const oldStyleTemplate = '{{ss-hour:pad}}:{{ss-minute:pad}}:{{ss-second:pad}} UTC';

      // This should fall back to basic format since helpers won't find their parameters
      const result = formatter.format(mockDate, oldStyleTemplate);

      // Should fall back to basic format
      expect(result).toContain('Sunday');
      expect(result).toContain('15th');
      expect(result).toContain('January');
    });
  });

  describe('Real Calendar File Validation', () => {
    it('should handle single quote syntax errors in templates', () => {
      // Test calendar with actually problematic syntax (unclosed quote)
      const calendarWithSingleQuotes: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          // This would cause a real Handlebars compilation error (unclosed quote)
          'bad-time':
            "{{ss-hour format='pad}}:{{ss-minute format='pad'}}:{{ss-second format='pad'}} UTC",
        },
      };

      const formatterWithBadCalendar = new DateFormatter(calendarWithSingleQuotes);

      // Should handle the compilation error gracefully and fall back to basic format
      const result = formatterWithBadCalendar.formatNamed(mockDate, 'bad-time');

      // Should fall back to basic format due to syntax error
      expect(result).toContain('Sunday'); // Basic format includes weekday
      expect(result).toContain('15th'); // Basic format includes ordinal
      expect(result).toContain('January'); // Basic format includes month
      expect(result).toContain('2024'); // Basic format includes year
    });

    it('should successfully compile corrected double quote syntax', () => {
      // Test calendar with correct double quote syntax (after fix)
      const calendarWithDoubleQuotes: SeasonsStarsCalendar = {
        ...mockCalendar,
        dateFormats: {
          // This should compile and execute successfully
          'good-time':
            '{{ss-hour format="pad"}}:{{ss-minute format="pad"}}:{{ss-second format="pad"}} UTC',
        },
      };

      const formatterWithGoodCalendar = new DateFormatter(calendarWithDoubleQuotes);

      // Should compile and execute the template successfully
      const result = formatterWithGoodCalendar.formatNamed(mockDate, 'good-time');

      // Should produce the expected formatted result
      expect(result).toBe('14:30:45 UTC');
    });
  });
});
