import { describe, it, expect } from 'vitest';
import { SimpleCalendarConverter } from '../src/simple-calendar-converter';
import type { SimpleCalendarData } from '../src/simple-calendar-types';

describe('SimpleCalendarConverter', () => {
  describe('format detection', () => {
    it('should detect Simple Calendar format with exportVersion', () => {
      const data = {
        exportVersion: 2,
        calendars: [],
      };

      expect(SimpleCalendarConverter.isSimpleCalendarFormat(data)).toBe(true);
    });

    it('should detect Simple Calendar format with calendars array', () => {
      const data = {
        calendars: [{ id: 'test', name: 'Test' }],
      };

      expect(SimpleCalendarConverter.isSimpleCalendarFormat(data)).toBe(true);
    });

    it('should not detect S&S format as Simple Calendar', () => {
      const data = {
        id: 'test',
        translations: {},
        months: [],
        weekdays: [],
      };

      expect(SimpleCalendarConverter.isSimpleCalendarFormat(data)).toBe(false);
    });

    it('should not detect invalid data as Simple Calendar', () => {
      expect(SimpleCalendarConverter.isSimpleCalendarFormat(null)).toBe(false);
      expect(SimpleCalendarConverter.isSimpleCalendarFormat(undefined)).toBe(false);
      expect(SimpleCalendarConverter.isSimpleCalendarFormat('string')).toBe(false);
      expect(SimpleCalendarConverter.isSimpleCalendarFormat(123)).toBe(false);
      expect(SimpleCalendarConverter.isSimpleCalendarFormat([])).toBe(false);
    });
  });

  describe('basic conversion', () => {
    it('should convert minimal Simple Calendar data', () => {
      const scData: SimpleCalendarData = {
        id: 'test-calendar',
        name: 'Test Calendar',
        months: [
          { name: 'January', numberOfDays: 31 },
          { name: 'February', numberOfDays: 28 },
        ],
        weekdays: [{ name: 'Monday' }, { name: 'Tuesday' }],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.calendar.id).toBe('test-calendar');
      expect(result.calendar.translations.en.label).toBe('Test Calendar');
      expect(result.calendar.months).toHaveLength(2);
      expect(result.calendar.months[0].name).toBe('January');
      expect(result.calendar.months[0].days).toBe(31);
      expect(result.calendar.weekdays).toHaveLength(2);
      expect(result.warnings).toEqual([]);
    });

    it('should convert calendar with description', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        description: 'A test calendar',
        months: [],
        weekdays: [],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.calendar.translations.en.description).toBe('A test calendar');
    });

    it('should sanitize calendar ID', () => {
      const scData: SimpleCalendarData = {
        id: 'Test Calendar!!123',
        name: 'Test',
        months: [],
        weekdays: [],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.calendar.id).toBe('test-calendar-123');
    });
  });

  describe('year conversion', () => {
    it('should convert year configuration', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        currentDate: { year: 2024 },
        years: {
          yearZero: 0,
          prefix: 'Year ',
          postfix: ' CE',
        },
        months: [],
        weekdays: [],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.calendar.year.epoch).toBe(0);
      expect(result.calendar.year.currentYear).toBe(2024);
      expect(result.calendar.year.prefix).toBe('Year ');
      expect(result.calendar.year.suffix).toBe(' CE');
    });

    it('should warn about unsupported year names', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        years: {
          yearNames: ['Dragon', 'Tiger', 'Rabbit'],
          yearNamingRule: 'repeat',
        },
        months: [],
        weekdays: [],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0].property).toBe('yearNames');
      expect(result.warnings[1].property).toBe('yearNamingRule');
    });
  });

  describe('month conversion', () => {
    it('should convert months with abbreviations', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [
          {
            name: 'January',
            abbreviation: 'Jan',
            numberOfDays: 31,
            description: 'First month',
          },
        ],
        weekdays: [],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.calendar.months[0]).toEqual({
        name: 'January',
        abbreviation: 'Jan',
        days: 31,
        description: 'First month',
      });
    });

    it('should generate abbreviation if missing', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [{ name: 'January', numberOfDays: 31 }],
        weekdays: [],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.calendar.months[0].abbreviation).toBe('Jan');
    });

    it('should filter out intercalary months from main months', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [
          { name: 'January', numberOfDays: 31 },
          { name: 'Midwinter', numberOfDays: 1, intercalary: true },
          { name: 'February', numberOfDays: 28 },
        ],
        weekdays: [],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.calendar.months).toHaveLength(2);
      expect(result.calendar.months[0].name).toBe('January');
      expect(result.calendar.months[1].name).toBe('February');
    });

    it('should warn about per-month leap year days', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [
          {
            name: 'February',
            numberOfDays: 28,
            numberOfLeapYearDays: 29,
          },
        ],
        weekdays: [],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].property).toBe('numberOfLeapYearDays');
    });

    it('should warn about per-month starting weekday', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [
          {
            name: 'January',
            numberOfDays: 31,
            startingWeekday: 3,
          },
        ],
        weekdays: [],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].property).toBe('startingWeekday');
    });
  });

  describe('weekday conversion', () => {
    it('should convert weekdays with descriptions', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [],
        weekdays: [
          {
            name: 'Monday',
            abbreviation: 'Mon',
            description: 'First day of week',
          },
        ],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.calendar.weekdays[0]).toEqual({
        name: 'Monday',
        abbreviation: 'Mon',
        description: 'First day of week',
      });
    });

    it('should generate abbreviation if missing', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [],
        weekdays: [{ name: 'Monday' }],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.calendar.weekdays[0].abbreviation).toBe('Mon');
    });
  });

  describe('leap year conversion', () => {
    it('should convert leap year with rule', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [{ name: 'February', numberOfDays: 28 }],
        weekdays: [],
        leapYear: {
          rule: 'gregorian',
          customMod: 4,
          months: [0],
        },
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.calendar.leapYear.rule).toBe('gregorian');
      expect(result.calendar.leapYear.interval).toBe(4);
      expect(result.calendar.leapYear.month).toBe('February');
      expect(result.calendar.leapYear.extraDays).toBe(1);
    });

    it('should use "none" for missing leap year config', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [],
        weekdays: [],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.calendar.leapYear.rule).toBe('none');
    });

    it('should warn about multiple leap year months', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [
          { name: 'January', numberOfDays: 31 },
          { name: 'February', numberOfDays: 28 },
        ],
        weekdays: [],
        leapYear: {
          rule: 'custom',
          months: [0, 1],
        },
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].property).toBe('months');
    });
  });

  describe('intercalary conversion', () => {
    it('should convert intercalary months', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [
          { name: 'January', numberOfDays: 31 },
          {
            name: 'Midwinter',
            numberOfDays: 1,
            intercalary: true,
            intercalaryInclude: true,
            description: 'A special day',
          },
          { name: 'February', numberOfDays: 28 },
        ],
        weekdays: [],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.calendar.intercalary).toHaveLength(1);
      expect(result.calendar.intercalary[0]).toEqual({
        name: 'Midwinter',
        days: 1,
        countsForWeekdays: true,
        description: 'A special day',
        after: 'January',
      });
    });

    it('should handle intercalary that does not count for weekdays', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [
          { name: 'January', numberOfDays: 31 },
          {
            name: 'Midwinter',
            numberOfDays: 1,
            intercalary: true,
            intercalaryInclude: false,
          },
        ],
        weekdays: [],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.calendar.intercalary[0].countsForWeekdays).toBe(false);
    });
  });

  describe('time conversion', () => {
    it('should convert time configuration', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [],
        weekdays: [],
        time: {
          hoursInDay: 24,
          minutesInHour: 60,
          secondsInMinute: 60,
        },
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.calendar.time).toEqual({
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      });
    });

    it('should use defaults for missing time config', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [],
        weekdays: [],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.calendar.time).toEqual({
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      });
    });

    it('should warn about game time ratio', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [],
        weekdays: [],
        time: {
          gameTimeRatio: 2,
        },
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].property).toBe('gameTimeRatio');
    });

    it('should warn about clock pause settings', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [],
        weekdays: [],
        time: {
          unifyGameAndClockPause: true,
        },
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].property).toBe('unifyGameAndClockPause');
    });

    it('should warn about update frequency', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [],
        weekdays: [],
        time: {
          updateFrequency: 1,
        },
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].property).toBe('updateFrequency');
    });
  });

  describe('season conversion', () => {
    it('should convert seasons', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [],
        weekdays: [],
        seasons: [
          {
            name: 'Spring',
            description: 'Season of growth',
            startingMonth: 2,
            startingDay: 1,
            icon: 'spring',
            color: '#00FF00',
          },
        ],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.calendar.seasons).toHaveLength(1);
      expect(result.calendar.seasons[0]).toEqual({
        name: 'Spring',
        description: 'Season of growth',
        startMonth: 3,
        icon: 'spring',
        color: '#00FF00',
      });
    });

    it('should warn about sunrise/sunset times', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [],
        weekdays: [],
        seasons: [
          {
            name: 'Spring',
            startingMonth: 0,
            sunriseTimes: [6, 7, 8],
            sunsetTimes: [18, 19, 20],
          },
        ],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].property).toBe('sunriseTimes/sunsetTimes');
    });
  });

  describe('moon conversion', () => {
    it('should convert moons with phases', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [],
        weekdays: [],
        moons: [
          {
            name: 'Luna',
            description: 'The moon',
            cycleLength: 29.53,
            firstNewMoon: {
              year: 2024,
              month: 0,
              day: 11,
            },
            phases: [
              { name: 'New Moon', length: 1, singleDay: true, icon: 'new' },
              { name: 'Waxing Crescent', length: 6, singleDay: false, icon: 'waxing-crescent' },
            ],
            color: '#FFFFFF',
          },
        ],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.calendar.moons).toHaveLength(1);
      expect(result.calendar.moons[0].name).toBe('Luna');
      expect(result.calendar.moons[0].cycleLength).toBe(29.53);
      expect(result.calendar.moons[0].firstNewMoon).toEqual({
        year: 2024,
        month: 1,
        day: 11,
      });
      expect(result.calendar.moons[0].phases).toHaveLength(2);
      expect(result.calendar.moons[0].color).toBe('#FFFFFF');
      expect(result.calendar.moons[0].translations.en.description).toBe('The moon');
    });

    it('should warn about cycle day adjust', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [],
        weekdays: [],
        moons: [
          {
            name: 'Luna',
            cycleLength: 29.53,
            cycleDayAdjust: 0.5,
          },
        ],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].property).toBe('cycleDayAdjust');
    });

    it('should warn about reference time', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [],
        weekdays: [],
        moons: [
          {
            name: 'Luna',
            cycleLength: 29.53,
            referenceTime: 1234567890,
          },
        ],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].property).toBe('referenceTime');
    });
  });

  describe('deterministic conversion', () => {
    it('should produce same output for same input', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [
          { name: 'January', numberOfDays: 31 },
          { name: 'February', numberOfDays: 28 },
        ],
        weekdays: [{ name: 'Monday' }, { name: 'Tuesday' }],
      };

      const converter1 = new SimpleCalendarConverter();
      const result1 = converter1.convert(scData);

      const converter2 = new SimpleCalendarConverter();
      const result2 = converter2.convert(scData);

      expect(JSON.stringify(result1.calendar)).toBe(JSON.stringify(result2.calendar));
      expect(JSON.stringify(result1.warnings)).toBe(JSON.stringify(result2.warnings));
    });
  });
});
