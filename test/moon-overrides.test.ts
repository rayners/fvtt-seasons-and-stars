/**
 * Tests for moon property overrides in calendar variants
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarManager } from '../src/core/calendar-manager';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

describe('Moon Overrides in Calendar Variants', () => {
  let manager: CalendarManager;

  beforeEach(() => {
    manager = new CalendarManager();
  });

  it('should override moons property with empty array', () => {
    const baseCalendar: SeasonsStarsCalendar = {
      id: 'test-calendar',
      translations: {
        en: { label: 'Test Calendar', description: 'Test calendar with moons' },
      },
      year: { epoch: 0, currentYear: 2024, prefix: '', suffix: '', startDay: 0 },
      leapYear: { rule: 'none' },
      months: [{ name: 'TestMonth', days: 30 }],
      weekdays: [{ name: 'TestDay' }],
      intercalary: [],
      moons: [
        {
          name: 'TestMoon',
          cycleLength: 30,
          firstNewMoon: { year: 1, month: 1, day: 1 },
          phases: [
            { name: 'New Moon', length: 15, singleDay: false, icon: 'new-moon' },
            { name: 'Full Moon', length: 15, singleDay: false, icon: 'full-moon' },
          ],
        },
      ],
      time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
      variants: {
        'no-moons': {
          name: 'No Moons Variant',
          description: 'Variant without moons',
          overrides: {
            moons: [],
          },
        },
      },
    };

    manager.loadCalendar(baseCalendar);

    // Base calendar should have moons
    const base = manager.getCalendar('test-calendar');
    expect(base?.moons).toHaveLength(1);
    expect(base?.moons?.[0].name).toBe('TestMoon');

    // Variant should have no moons
    const variant = manager.getCalendar('test-calendar(no-moons)');
    expect(variant?.moons).toHaveLength(0);
  });

  it('should override moons with different moon configuration', () => {
    const baseCalendar: SeasonsStarsCalendar = {
      id: 'test-calendar-2',
      translations: {
        en: { label: 'Test Calendar 2', description: 'Test calendar with different moons' },
      },
      year: { epoch: 0, currentYear: 2024, prefix: '', suffix: '', startDay: 0 },
      leapYear: { rule: 'none' },
      months: [{ name: 'TestMonth', days: 30 }],
      weekdays: [{ name: 'TestDay' }],
      intercalary: [],
      moons: [
        {
          name: 'EarthMoon',
          cycleLength: 29,
          firstNewMoon: { year: 1, month: 1, day: 1 },
          phases: [
            { name: 'New Moon', length: 14, singleDay: false, icon: 'new-moon' },
            { name: 'Full Moon', length: 15, singleDay: false, icon: 'full-moon' },
          ],
        },
      ],
      time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
      variants: {
        'different-moons': {
          name: 'Different Moons Variant',
          description: 'Variant with different moons',
          overrides: {
            moons: [
              {
                name: 'AlienMoon1',
                cycleLength: 15,
                firstNewMoon: { year: 1, month: 1, day: 1 },
                phases: [
                  { name: 'New Moon', length: 8, singleDay: false, icon: 'new-moon' },
                  { name: 'Full Moon', length: 7, singleDay: false, icon: 'full-moon' },
                ],
              },
              {
                name: 'AlienMoon2',
                cycleLength: 45,
                firstNewMoon: { year: 1, month: 1, day: 10 },
                phases: [
                  { name: 'New Moon', length: 22, singleDay: false, icon: 'new-moon' },
                  { name: 'Full Moon', length: 23, singleDay: false, icon: 'full-moon' },
                ],
              },
            ],
          },
        },
      },
    };

    manager.loadCalendar(baseCalendar);

    // Base calendar should have Earth moon
    const base = manager.getCalendar('test-calendar-2');
    expect(base?.moons).toHaveLength(1);
    expect(base?.moons?.[0].name).toBe('EarthMoon');

    // Variant should have alien moons
    const variant = manager.getCalendar('test-calendar-2(different-moons)');
    expect(variant?.moons).toHaveLength(2);
    expect(variant?.moons?.[0].name).toBe('AlienMoon1');
    expect(variant?.moons?.[1].name).toBe('AlienMoon2');
  });
});
