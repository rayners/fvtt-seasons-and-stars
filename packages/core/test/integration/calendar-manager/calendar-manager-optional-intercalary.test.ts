import { describe, it, expect } from 'vitest';
import { CalendarManager } from '../../../src/core/calendar-manager';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';

describe('CalendarManager optional intercalary handling', () => {
  it('loads calendars missing the intercalary section', () => {
    const calendar: SeasonsStarsCalendar = {
      id: 'shardcount-calendar',
      translations: {
        en: { label: 'Shardcount Calendar', description: 'Test', setting: 'Veylaris' },
      },
      year: { epoch: 0, currentYear: 413, prefix: '', suffix: ' S.F', startDay: 0 },
      leapYear: { rule: 'none' },
      months: [{ name: 'Dawnsheer', days: 30 }],
      weekdays: [{ name: 'Shardaen' }],
      time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
      moons: [],
    } as SeasonsStarsCalendar;

    const manager = new CalendarManager();
    const result = manager.loadCalendar(calendar);

    expect(result).toBe(true);
    expect(manager.engines.has('shardcount-calendar')).toBe(true);
  });
});
