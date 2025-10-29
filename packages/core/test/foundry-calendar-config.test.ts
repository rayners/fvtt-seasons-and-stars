/**
 * Tests for Foundry Calendar Config Converter
 */

import { describe, it, expect } from 'vitest';
import { convertToFoundryCalendarConfig } from '../src/core/foundry-calendar-config';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

describe('convertToFoundryCalendarConfig', () => {
  it('should convert a basic Gregorian calendar', () => {
    const calendar: SeasonsStarsCalendar = {
      id: 'gregorian',
      translations: {
        en: {
          label: 'Gregorian Calendar',
          description: 'Standard Gregorian calendar',
        },
      },
      year: {
        epoch: 0,
        currentYear: 2024,
        prefix: '',
        suffix: ' AD',
        startDay: 6, // Saturday (0-indexed)
      },
      leapYear: {
        rule: 'gregorian',
      },
      months: [
        { name: 'January', abbreviation: 'Jan', days: 31 },
        { name: 'February', abbreviation: 'Feb', days: 28 },
        { name: 'March', abbreviation: 'Mar', days: 31 },
        { name: 'April', abbreviation: 'Apr', days: 30 },
        { name: 'May', abbreviation: 'May', days: 31 },
        { name: 'June', abbreviation: 'Jun', days: 30 },
        { name: 'July', abbreviation: 'Jul', days: 31 },
        { name: 'August', abbreviation: 'Aug', days: 31 },
        { name: 'September', abbreviation: 'Sep', days: 30 },
        { name: 'October', abbreviation: 'Oct', days: 31 },
        { name: 'November', abbreviation: 'Nov', days: 30 },
        { name: 'December', abbreviation: 'Dec', days: 31 },
      ],
      weekdays: [
        { name: 'Sunday', abbreviation: 'Sun' },
        { name: 'Monday', abbreviation: 'Mon' },
        { name: 'Tuesday', abbreviation: 'Tue' },
        { name: 'Wednesday', abbreviation: 'Wed' },
        { name: 'Thursday', abbreviation: 'Thu' },
        { name: 'Friday', abbreviation: 'Fri' },
        { name: 'Saturday', abbreviation: 'Sat' },
      ],
      intercalary: [],
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      },
    };

    const result = convertToFoundryCalendarConfig(calendar);

    expect(result.name).toBe('Gregorian Calendar');
    expect(result.description).toBe('Standard Gregorian calendar');
    expect(result.years.yearZero).toBe(0);
    expect(result.years.firstWeekday).toBe(6);
    expect(result.days.weekdays).toEqual([
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ]);
    expect(result.days.yearLength).toBe(365);
    expect(result.months?.months).toHaveLength(12);
    expect(result.months?.months[0]).toEqual({
      name: 'January',
      abbreviation: 'Jan',
      ordinal: 1,
      days: 31,
    });
    expect(result.time?.hoursInDay).toBe(24);
    expect(result.time?.minutesInHour).toBe(60);
    expect(result.time?.secondsInMinute).toBe(60);
  });

  it('should handle calendars with intercalary days', () => {
    const calendar: SeasonsStarsCalendar = {
      id: 'harptos',
      translations: {
        en: {
          label: 'Calendar of Harptos',
          description: 'Faerûn calendar',
        },
      },
      year: {
        epoch: -700,
        currentYear: 1492,
        prefix: '',
        suffix: ' DR',
        startDay: 0,
      },
      leapYear: {
        rule: 'none',
      },
      months: [
        { name: 'Hammer', days: 30 },
        { name: 'Alturiak', days: 30 },
        { name: 'Ches', days: 30 },
        { name: 'Tarsakh', days: 30 },
        { name: 'Mirtul', days: 30 },
        { name: 'Kythorn', days: 30 },
        { name: 'Flamerule', days: 30 },
        { name: 'Eleasis', days: 30 },
        { name: 'Eleint', days: 30 },
        { name: 'Marpenoth', days: 30 },
        { name: 'Uktar', days: 30 },
        { name: 'Nightal', days: 30 },
      ],
      weekdays: [
        { name: 'Firstday' },
        { name: 'Seconday' },
        { name: 'Thirdday' },
        { name: 'Fourthday' },
        { name: 'Fifthday' },
        { name: 'Sixthday' },
        { name: 'Seventhday' },
        { name: 'Eighthday' },
        { name: 'Ninthday' },
        { name: 'Tenthday' },
      ],
      intercalary: [
        { name: 'Midwinter', leapYearOnly: false, after: 'Hammer', days: 1 },
        { name: 'Greengrass', leapYearOnly: false, after: 'Tarsakh', days: 1 },
        { name: 'Midsummer', leapYearOnly: false, after: 'Flamerule', days: 1 },
        { name: 'Highharvestide', leapYearOnly: false, after: 'Eleint', days: 1 },
        { name: 'The Feast of the Moon', leapYearOnly: false, after: 'Uktar', days: 1 },
      ],
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      },
    };

    const result = convertToFoundryCalendarConfig(calendar);

    expect(result.name).toBe('Calendar of Harptos');
    // Year length should include 12 months (30 days each) + 5 intercalary days
    expect(result.days.yearLength).toBe(360 + 5);
    expect(result.months?.months).toHaveLength(12);
  });

  it('should handle calendars with seasons', () => {
    const calendar: SeasonsStarsCalendar = {
      id: 'test-seasons',
      translations: {
        en: {
          label: 'Test Calendar with Seasons',
        },
      },
      year: {
        epoch: 0,
        currentYear: 1,
        prefix: '',
        suffix: '',
        startDay: 0,
      },
      leapYear: {
        rule: 'none',
      },
      months: [
        { name: 'Month1', days: 30 },
        { name: 'Month2', days: 30 },
        { name: 'Month3', days: 30 },
        { name: 'Month4', days: 30 },
      ],
      weekdays: [{ name: 'Day1' }, { name: 'Day2' }, { name: 'Day3' }],
      intercalary: [],
      seasons: [
        { name: 'Spring', startMonth: 1, startDay: 1 },
        { name: 'Summer', startMonth: 2 },
        { name: 'Fall', startMonth: 3, startDay: 15 },
        { name: 'Winter', startMonth: 4 },
      ],
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      },
    };

    const result = convertToFoundryCalendarConfig(calendar);

    expect(result.seasons).not.toBeNull();
    expect(result.seasons?.seasons).toHaveLength(4);
    expect(result.seasons?.seasons[0]).toEqual({
      name: 'Spring',
      startMonth: 1,
      startDay: 1,
    });
    expect(result.seasons?.seasons[1]).toEqual({
      name: 'Summer',
      startMonth: 2,
      startDay: 1,
    });
    expect(result.seasons?.seasons[2]).toEqual({
      name: 'Fall',
      startMonth: 3,
      startDay: 15,
    });
  });

  it('should handle calendars without seasons', () => {
    const calendar: SeasonsStarsCalendar = {
      id: 'no-seasons',
      translations: {
        en: {
          label: 'Calendar Without Seasons',
        },
      },
      year: {
        epoch: 0,
        currentYear: 1,
        prefix: '',
        suffix: '',
        startDay: 0,
      },
      leapYear: {
        rule: 'none',
      },
      months: [{ name: 'Month1', days: 30 }],
      weekdays: [{ name: 'Day1' }],
      intercalary: [],
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      },
    };

    const result = convertToFoundryCalendarConfig(calendar);

    expect(result.seasons).toBeNull();
  });

  it('should generate abbreviations for months without them', () => {
    const calendar: SeasonsStarsCalendar = {
      id: 'no-abbrev',
      translations: {
        en: {
          label: 'Test Calendar',
        },
      },
      year: {
        epoch: 0,
        currentYear: 1,
        prefix: '',
        suffix: '',
        startDay: 0,
      },
      leapYear: {
        rule: 'none',
      },
      months: [
        { name: 'January', days: 30 }, // No abbreviation
        { name: 'February', abbreviation: 'Feb', days: 30 }, // Has abbreviation
      ],
      weekdays: [{ name: 'Day1' }],
      intercalary: [],
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      },
    };

    const result = convertToFoundryCalendarConfig(calendar);

    expect(result.months?.months[0].abbreviation).toBe('Jan');
    expect(result.months?.months[1].abbreviation).toBe('Feb');
  });

  it('should use fallback description when none provided', () => {
    const calendar: SeasonsStarsCalendar = {
      id: 'no-description',
      translations: {
        en: {
          label: 'Test Calendar',
          // No description
        },
      },
      year: {
        epoch: 0,
        currentYear: 1,
        prefix: '',
        suffix: '',
        startDay: 0,
      },
      leapYear: {
        rule: 'none',
      },
      months: [{ name: 'Month1', days: 30 }],
      weekdays: [{ name: 'Day1' }],
      intercalary: [],
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      },
    };

    const result = convertToFoundryCalendarConfig(calendar);

    expect(result.description).toBe('Calendar for world time tracking');
  });

  it('should handle non-standard time configurations', () => {
    const calendar: SeasonsStarsCalendar = {
      id: 'custom-time',
      translations: {
        en: {
          label: 'Custom Time Calendar',
        },
      },
      year: {
        epoch: 0,
        currentYear: 1,
        prefix: '',
        suffix: '',
        startDay: 0,
      },
      leapYear: {
        rule: 'none',
      },
      months: [{ name: 'Month1', days: 30 }],
      weekdays: [{ name: 'Day1' }],
      intercalary: [],
      time: {
        hoursInDay: 20,
        minutesInHour: 100,
        secondsInMinute: 100,
      },
    };

    const result = convertToFoundryCalendarConfig(calendar);

    expect(result.time?.hoursInDay).toBe(20);
    expect(result.time?.minutesInHour).toBe(100);
    expect(result.time?.secondsInMinute).toBe(100);
  });
});
