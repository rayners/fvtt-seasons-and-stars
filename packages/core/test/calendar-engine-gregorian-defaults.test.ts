import { describe, it, expect, vi } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import { Logger } from '../src/core/logger';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

describe('CalendarEngine Gregorian fallbacks', () => {
  it('supplies Gregorian defaults for missing sections', () => {
    const warn = vi.spyOn(Logger, 'warn').mockImplementation(() => {});

    const incomplete: Partial<SeasonsStarsCalendar> = {
      id: 'incomplete',
      translations: { en: { label: 'Incomplete' } },
    } as any;

    const engine = new CalendarEngine(incomplete as SeasonsStarsCalendar);
    const calendar = (engine as any).calendar as SeasonsStarsCalendar;

    expect(calendar.time.hoursInDay).toBe(24);
    expect(calendar.months.length).toBe(12);
    expect(calendar.weekdays.length).toBe(7);
    expect(calendar.year.startDay).toBe(6);
    expect(calendar.leapYear.rule).toBe('gregorian');
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });

  it('allows explicit empty leapYear to override defaults', () => {
    const calendar: SeasonsStarsCalendar = {
      id: 'no-leap',
      translations: { en: { label: 'No Leap' } },
      year: { epoch: 0, currentYear: 1, prefix: '', suffix: '', startDay: 0 },
      leapYear: { rule: 'none' },
      months: [{ name: 'Jan', days: 31 }],
      weekdays: [{ name: 'Day' }],
      intercalary: [],
      time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
    };

    const engine = new CalendarEngine(calendar);
    const merged = (engine as any).calendar as SeasonsStarsCalendar;

    expect(merged.leapYear).toEqual({ rule: 'none' });
  });
});
