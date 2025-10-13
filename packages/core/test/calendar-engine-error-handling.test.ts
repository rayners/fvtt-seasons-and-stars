/**
 * Ensure CalendarManager handles CalendarEngine creation errors gracefully
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock CalendarEngine to throw an error when instantiated
vi.mock('../src/core/calendar-engine', () => {
  return {
    CalendarEngine: vi.fn().mockImplementation(() => {
      throw new Error('engine failure');
    }),
  };
});

import { CalendarManager } from '../src/core/calendar-manager';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

describe('CalendarManager engine error handling', () => {
  let manager: CalendarManager;

  beforeEach(() => {
    vi.clearAllMocks();
    global.game = {
      i18n: { lang: 'en' },
      settings: { get: vi.fn(), set: vi.fn() },
      modules: { get: vi.fn() },
    } as any;
    global.Hooks = { callAll: vi.fn(), on: vi.fn(), once: vi.fn() } as any;

    manager = new CalendarManager();
  });

  it('should return false when CalendarEngine construction fails', () => {
    const calendar: SeasonsStarsCalendar = {
      id: 'test-cal',
      translations: { en: { label: 'Test Calendar' } },
      year: { epoch: 0, currentYear: 1, prefix: '', suffix: '', startDay: 1 },
      months: [{ name: 'Jan', days: 31 }],
      weekdays: [{ name: 'Day' }],
      intercalary: [],
      time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
    };

    expect(manager.loadCalendar(calendar)).toBe(false);
  });
});
