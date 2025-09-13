/**
 * Ensure calendars without a leapYear section still validate and load
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarManager } from '../src/core/calendar-manager';
import { CalendarValidator } from '../src/core/calendar-validator';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

const calendarWithoutLeapYear: SeasonsStarsCalendar = {
  id: 'leapless',
  translations: { en: { label: 'Leapless Calendar' } },
  year: { epoch: 0, currentYear: 1, prefix: '', suffix: '', startDay: 0 },
  months: [{ name: 'Jan', days: 31 }],
  weekdays: [{ name: 'Day' }],
  intercalary: [],
  time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
};

describe('calendar with no leapYear section', () => {
  let manager: CalendarManager;

  beforeEach(() => {
    global.game = {
      i18n: { lang: 'en' },
      settings: { get: vi.fn(), set: vi.fn() },
      modules: { get: vi.fn() },
    } as any;
    global.Hooks = { callAll: vi.fn(), on: vi.fn(), once: vi.fn() } as any;

    manager = new CalendarManager();
  });

  it('validates against the schema', async () => {
    const result = await CalendarValidator.validate(calendarWithoutLeapYear);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('loads successfully', () => {
    expect(manager.loadCalendar(calendarWithoutLeapYear)).toBe(true);
  });
});
