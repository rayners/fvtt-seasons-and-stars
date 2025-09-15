import { describe, it, expect } from 'vitest';
import Handlebars from 'handlebars';
import { DateFormatter } from '../src/core/date-formatter';
import type { SeasonsStarsCalendar, CalendarDate as ICalendarDate } from '../src/types/calendar';

// Use REAL Handlebars for template execution
(global as any).Handlebars = Handlebars;

describe('Intercalary format recursion', () => {
  it('should fallback to base format when intercalary format references it', () => {
    DateFormatter.resetHelpersForTesting();

    const calendar: SeasonsStarsCalendar = {
      id: 'test',
      name: 'Test',
      months: [{ name: 'Month', days: 30 }],
      weekdays: [{ name: 'Day' }],
      year: { prefix: '', suffix: '' },
      time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
      dateFormats: {
        short: '{{ss-day}}',
        'short-intercalary': '{{ss-dateFmt "short"}}',
      },
    };

    const formatter = new DateFormatter(calendar);

    const intercalaryDate: ICalendarDate = {
      year: 1,
      month: 1,
      day: 1,
      weekday: 0,
      intercalary: 'Festival',
    };

    const result = formatter.formatNamed(intercalaryDate, 'short');
    expect(result).toBe('1');
  });
});
