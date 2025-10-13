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

    it('should generate default ID when both id and name are missing', () => {
      const scData: Partial<SimpleCalendarData> = {
        months: [],
        weekdays: [],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData as SimpleCalendarData);

      expect(result.calendar.id).toBe('imported-calendar');
      expect(result.calendar.translations.en.label).toBe('Imported Calendar');
    });

    it('should use filename for ID when both id and name are missing', () => {
      const scData: Partial<SimpleCalendarData> = {
        months: [],
        weekdays: [],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData as SimpleCalendarData, 'harptos.json');

      expect(result.calendar.id).toBe('harptos');
      expect(result.calendar.translations.en.label).toBe('Harptos');
    });

    it('should capitalize filename for label with proper word separation', () => {
      const scData: Partial<SimpleCalendarData> = {
        months: [],
        weekdays: [],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData as SimpleCalendarData, 'dark-sun.json');

      expect(result.calendar.id).toBe('dark-sun');
      expect(result.calendar.translations.en.label).toBe('Dark Sun');
    });

    it('should prefer calendar data over filename', () => {
      const scData: SimpleCalendarData = {
        id: 'my-calendar',
        name: 'My Calendar',
        months: [],
        weekdays: [],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData, 'ignored.json');

      expect(result.calendar.id).toBe('my-calendar');
      expect(result.calendar.translations.en.label).toBe('My Calendar');
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

    it('should handle intercalary day at first position using before', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [
          {
            name: 'NewYear',
            numberOfDays: 1,
            intercalary: true,
          },
          { name: 'January', numberOfDays: 31 },
          { name: 'February', numberOfDays: 28 },
        ],
        weekdays: [],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.calendar.intercalary).toHaveLength(1);
      expect(result.calendar.intercalary[0].name).toBe('NewYear');
      // Should use 'before' since there's no preceding regular month
      expect(result.calendar.intercalary[0].before).toBe('January');
      expect(result.calendar.intercalary[0].after).toBeUndefined();
    });

    it('should handle intercalary day surrounded by other intercalary days', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [
          { name: 'January', numberOfDays: 31 },
          {
            name: 'FirstIntercalary',
            numberOfDays: 1,
            intercalary: true,
          },
          {
            name: 'SecondIntercalary',
            numberOfDays: 1,
            intercalary: true,
          },
          { name: 'February', numberOfDays: 28 },
        ],
        weekdays: [],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.calendar.intercalary).toHaveLength(2);

      const first = result.calendar.intercalary.find((i: any) => i.name === 'FirstIntercalary');
      expect(first?.after).toBe('January');

      const second = result.calendar.intercalary.find((i: any) => i.name === 'SecondIntercalary');
      // Should still find January via backwards search
      expect(second?.after).toBe('January');
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
    it('should convert seasons with proper month mapping', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [
          { name: 'January', numberOfDays: 31 },
          { name: 'February', numberOfDays: 28 },
          { name: 'March', numberOfDays: 31 },
        ],
        weekdays: [],
        seasons: [
          {
            name: 'Spring',
            description: 'Season of growth',
            startingMonth: 2, // March (index 2)
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
        startMonth: 3, // Month number 3 (March)
        endMonth: 3,
        icon: 'spring',
      });
      // Color should generate a warning
      expect(result.warnings.some((w: any) => w.property === 'color')).toBe(true);
    });

    it('should warn about sunrise/sunset times', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [{ name: 'January', numberOfDays: 31 }],
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

    it('should handle season starting on intercalary month at end of calendar', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [
          { name: 'Month1', numberOfDays: 30 },
          { name: 'Month2', numberOfDays: 30 },
          { name: 'EndIntercalary', numberOfDays: 1, intercalary: true },
        ],
        weekdays: [],
        seasons: [
          { name: 'Winter', startingMonth: 2 }, // Intercalary at end
        ],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      // Should map backwards to Month2 (the last regular month)
      expect(result.calendar.seasons[0].startMonth).toBe(2);
      expect(
        result.warnings.some(
          (w: any) => w.path.includes('seasons') && w.property === 'startingMonth'
        )
      ).toBe(true);
    });

    it('should handle season starting on intercalary month in middle of calendar', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [
          { name: 'Month1', numberOfDays: 30 },
          { name: 'MiddleIntercalary', numberOfDays: 1, intercalary: true },
          { name: 'Month2', numberOfDays: 30 },
        ],
        weekdays: [],
        seasons: [
          { name: 'Spring', startingMonth: 1 }, // Intercalary in middle
        ],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      // Should map forward to Month2
      expect(result.calendar.seasons[0].startMonth).toBe(2);
      expect(
        result.warnings.some(
          (w: any) => w.path.includes('seasons') && w.property === 'startingMonth'
        )
      ).toBe(true);
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

    it('should respect explicit singleDay false even for length 1 phases', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [],
        weekdays: [],
        moons: [
          {
            name: 'Luna',
            cycleLength: 29.53,
            phases: [
              { name: 'New Moon', length: 1, singleDay: false, icon: 'new' },
              { name: 'Full Moon', length: 1, singleDay: true, icon: 'full' },
            ],
          },
        ],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.calendar.moons[0].phases[0].singleDay).toBe(false);
      expect(result.calendar.moons[0].phases[1].singleDay).toBe(true);
    });

    it('should default singleDay to true for length 1 phases when not specified', () => {
      const scData: SimpleCalendarData = {
        id: 'test',
        name: 'Test',
        months: [],
        weekdays: [],
        moons: [
          {
            name: 'Luna',
            cycleLength: 29.53,
            phases: [
              { name: 'New Moon', length: 1, icon: 'new' },
              { name: 'Waxing', length: 7, icon: 'waxing' },
            ],
          },
        ],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      expect(result.calendar.moons[0].phases[0].singleDay).toBe(true);
      expect(result.calendar.moons[0].phases[1].singleDay).toBe(false);
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

  describe('complex calendar with intercalary days', () => {
    it('should correctly convert Harptos-style calendar with intercalary months and seasons', () => {
      const scData: SimpleCalendarData = {
        id: 'harptos',
        name: 'Harptos',
        months: [
          { name: 'Hammer', numberOfDays: 30, intercalary: false },
          { name: 'Midwinter', numberOfDays: 1, intercalary: true },
          { name: 'Alturiak', numberOfDays: 30, intercalary: false },
          { name: 'Ches', numberOfDays: 30, intercalary: false },
          { name: 'Tarsakh', numberOfDays: 30, intercalary: false },
          { name: 'Greengrass', numberOfDays: 1, intercalary: true },
          { name: 'Mirtul', numberOfDays: 30, intercalary: false },
          { name: 'Kythorn', numberOfDays: 30, intercalary: false },
          { name: 'Flamerule', numberOfDays: 30, intercalary: false },
          { name: 'Midsummer', numberOfDays: 1, intercalary: true },
          { name: 'Shieldmeet', numberOfDays: 0, numberOfLeapYearDays: 1, intercalary: true },
          { name: 'Eleasis', numberOfDays: 30, intercalary: false },
          { name: 'Eleint', numberOfDays: 30, intercalary: false },
        ],
        weekdays: [{ name: '1st' }],
        seasons: [
          { name: 'Spring', startingMonth: 2 }, // Alturiak (index 2, month #2)
          { name: 'Summer', startingMonth: 7 }, // Kythorn (index 7, month #6)
        ],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(scData);

      // Regular months should exclude intercalary
      expect(result.calendar.months).toHaveLength(9);
      expect(result.calendar.months[0].name).toBe('Hammer');
      expect(result.calendar.months[1].name).toBe('Alturiak');

      // Intercalary days should be correctly positioned
      expect(result.calendar.intercalary).toHaveLength(4);

      const midwinter = result.calendar.intercalary.find((i: any) => i.name === 'Midwinter');
      expect(midwinter?.after).toBe('Hammer');

      const greengrass = result.calendar.intercalary.find((i: any) => i.name === 'Greengrass');
      expect(greengrass?.after).toBe('Tarsakh');

      const midsummer = result.calendar.intercalary.find((i: any) => i.name === 'Midsummer');
      expect(midsummer?.after).toBe('Flamerule');

      const shieldmeet = result.calendar.intercalary.find((i: any) => i.name === 'Shieldmeet');
      expect(shieldmeet?.after).toBe('Flamerule');
      expect(shieldmeet?.leapYearOnly).toBe(true);
      expect(shieldmeet?.days).toBe(1);

      // Seasons should map to correct month numbers
      expect(result.calendar.seasons).toHaveLength(2);
      expect(result.calendar.seasons[0].name).toBe('Spring');
      expect(result.calendar.seasons[0].startMonth).toBe(2); // Alturiak is month #2
      expect(result.calendar.seasons[1].name).toBe('Summer');
      expect(result.calendar.seasons[1].startMonth).toBe(6); // Kythorn is month #6
    });
  });

  describe('full export format detection', () => {
    it('should detect and handle full Simple Calendar export with globalConfig and permissions', () => {
      const fullExport = {
        exportVersion: 2,
        globalConfig: {
          secondsInCombatRound: 6,
          calendarsSameTimestamp: false,
          syncCalendars: true,
          showNotesFolder: true,
        },
        permissions: [{ player: false, trustedPlayer: false, assistantGameMaster: false }],
        calendars: [
          {
            id: 'default',
            name: 'SA',
            currentDate: { year: 592, month: 6, day: 27, seconds: 39762 },
            general: {
              gameWorldTimeIntegration: 'mixed',
              showClock: true,
              noteDefaultVisibility: true,
              postNoteRemindersOnFoundryLoad: true,
              pf2eSync: false,
              dateFormat: { date: 'MMMM DD, YYYY', time: 'HH:mm:ss', monthYear: 'MMMM YYYYYYYY' },
              chatTime: 'MMM DD, YYYY HH:mm',
              compactViewOptions: { controlLayout: 'full' },
            },
            leapYear: {
              rule: 'none',
            },
            months: [
              { name: 'Hammer', abbreviation: 'Ham', numberOfDays: 30 },
              { name: 'Alturiak', abbreviation: 'Alt', numberOfDays: 30 },
            ],
            weekdays: [
              { name: 'Sunday', abbreviation: 'Sun' },
              { name: 'Monday', abbreviation: 'Mon' },
            ],
            time: {
              hoursInDay: 24,
              minutesInHour: 60,
              secondsInMinute: 60,
            },
          },
        ],
        notes: [],
      };

      expect(SimpleCalendarConverter.isSimpleCalendarFormat(fullExport)).toBe(true);
    });

    it('should convert calendar from full export format', () => {
      const fullExport = {
        exportVersion: 2,
        globalConfig: {
          secondsInCombatRound: 6,
        },
        calendars: [
          {
            id: 'default',
            name: 'SA',
            months: [
              { name: 'Hammer', abbreviation: 'Ham', numberOfDays: 30 },
              { name: 'Alturiak', abbreviation: 'Alt', numberOfDays: 30 },
            ],
            weekdays: [
              { name: 'Sunday', abbreviation: 'Sun' },
              { name: 'Monday', abbreviation: 'Mon' },
            ],
          },
        ],
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(fullExport.calendars[0]);

      expect(result.calendar.id).toBe('default');
      expect(result.calendar.translations.en.label).toBe('SA');
      expect(result.calendar.months).toHaveLength(2);
      expect(result.calendar.months[0].name).toBe('Hammer');
      expect(result.calendar.months[0].days).toBe(30);
      expect(result.calendar.weekdays).toHaveLength(2);
    });
  });

  describe('single calendar wrapper format', () => {
    it('should detect single calendar wrapped in {"calendar": {...}}', () => {
      const singleCalendarExport = {
        calendar: {
          id: 'harptos',
          name: 'Harptos Calendar',
          months: [{ name: 'Hammer', abbreviation: 'Ham', numberOfDays: 30 }],
          weekdays: [{ name: '1st', abbreviation: '1s' }],
        },
      };

      expect(SimpleCalendarConverter.isSimpleCalendarFormat(singleCalendarExport)).toBe(true);
    });

    it('should detect predefined calendar format with currentDate', () => {
      const predefinedFormat = {
        calendar: {
          currentDate: { year: 1495, month: 0, day: 0 },
          general: {
            gameWorldTimeIntegration: 'mixed',
          },
          months: [{ name: 'Hammer', numberOfDays: 30 }],
          weekdays: [{ name: 'Monday' }],
        },
      };

      expect(SimpleCalendarConverter.isSimpleCalendarFormat(predefinedFormat)).toBe(true);
    });

    it('should not detect S&S format as Simple Calendar', () => {
      const ssSingleCalendar = {
        calendar: {
          id: 'test',
          translations: { en: { label: 'Test' } },
          year: { epoch: 0 },
          // S&S format doesn't have currentDate or general
        },
      };

      // This should still be detected because it has 'calendar' property
      // The converter will handle it appropriately
      expect(SimpleCalendarConverter.isSimpleCalendarFormat(ssSingleCalendar)).toBe(false);
    });

    it('should convert from single calendar wrapper format', () => {
      const singleCalendarExport = {
        calendar: {
          id: 'harptos',
          name: 'Harptos',
          months: [
            { name: 'Hammer', abbreviation: 'Ham', numberOfDays: 30 },
            { name: 'Alturiak', abbreviation: 'Alt', numberOfDays: 30 },
          ],
          weekdays: [
            { name: '1st', abbreviation: '1s' },
            { name: '2nd', abbreviation: '2n' },
          ],
          time: {
            hoursInDay: 24,
            minutesInHour: 60,
            secondsInMinute: 60,
          },
        },
      };

      const converter = new SimpleCalendarConverter();
      const result = converter.convert(singleCalendarExport.calendar);

      expect(result.calendar.id).toBe('harptos');
      expect(result.calendar.translations.en.label).toBe('Harptos');
      expect(result.calendar.months).toHaveLength(2);
      expect(result.calendar.weekdays).toHaveLength(2);
    });
  });
});
