import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CalendarValidator } from '../src/core/calendar-validator';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

const baseCalendar: SeasonsStarsCalendar = {
  id: 'base-calendar',
  translations: {
    en: {
      label: 'Base Calendar',
      description: 'Validation base calendar',
      setting: 'Test',
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
  months: [{ name: 'Alpha', days: 30 }],
  weekdays: [{ name: 'Day 1' }],
  intercalary: [],
  time: {
    hoursInDay: 24,
    minutesInHour: 60,
    secondsInMinute: 60,
  },
};

beforeEach(() => {
  process.env.SEASONS_AND_STARS_VALIDATE_SOURCES = 'true';
});

afterEach(() => {
  delete process.env.SEASONS_AND_STARS_VALIDATE_SOURCES;
  vi.restoreAllMocks();
});

describe('CalendarValidator source verification', () => {
  it('verifies url sources with HEAD requests', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));

    const result = await CalendarValidator.validate({
      ...baseCalendar,
      id: 'calendar-with-url',
      sources: ['https://example.com/calendar-source'],
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe('https://example.com/calendar-source');
    expect((fetchSpy.mock.calls[0][1] as RequestInit).method).toBe('HEAD');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('reports an error when a source url cannot be verified', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));

    const result = await CalendarValidator.validate({
      ...baseCalendar,
      id: 'calendar-with-invalid-url',
      sources: ['https://invalid.example.com/missing-resource'],
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "sources[0]: Unable to verify URL 'https://invalid.example.com/missing-resource' (HTTP status 404)"
    );
  });

  it('records a warning when the verification request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network failure'));

    const result = await CalendarValidator.validate({
      ...baseCalendar,
      id: 'calendar-with-unreachable-source',
      sources: ['https://offline.example.com/source'],
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toContain(
      "sources[0]: Unable to confirm URL 'https://offline.example.com/source' (network failure)"
    );
  });

  it('ignores bibliographic citations provided by users', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockResolvedValue(new Response(null, { status: 200 }));

    const result = await CalendarValidator.validate({
      ...baseCalendar,
      id: 'calendar-with-citation',
      sources: [
        {
          citation: 'User supplied reference',
          notes: 'Provided during manual verification',
        },
      ],
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
