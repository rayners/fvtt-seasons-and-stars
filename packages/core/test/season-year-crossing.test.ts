/**
 * Tests for year-crossing season support in bridge-integration
 * Verifies that seasons can properly span year boundaries (e.g., December-February winter)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SeasonsStarsIntegration } from '../src/core/bridge-integration';

interface MockCalendar {
  id: string;
  seasons?: any[];
  months?: any[];
}

interface MockCalendarManager {
  getActiveCalendar: () => MockCalendar;
  getCalendar: (id?: string) => MockCalendar | undefined;
}

describe('Season Info with Year-Crossing Support', () => {
  let integration: SeasonsStarsIntegration;
  let mockCalendarManager: MockCalendarManager;

  beforeEach(() => {
    (SeasonsStarsIntegration as any).instance = null;
  });

  it('should handle calendars with no seasons defined', () => {
    mockCalendarManager = {
      getActiveCalendar: () => ({
        id: 'no-seasons',
        seasons: undefined,
      }),
      getCalendar: () => undefined,
    };

    integration = new (SeasonsStarsIntegration as any)(mockCalendarManager);

    const winterDate = { month: 12, day: 25 } as any;
    const seasonInfo = integration.api.getSeasonInfo(winterDate);

    expect(seasonInfo.name).toBe('Winter');
    expect(seasonInfo.icon).toBe('winter');
  });

  it('should handle simple non-crossing seasons', () => {
    mockCalendarManager = {
      getActiveCalendar: () => ({
        id: 'simple-seasons',
        seasons: [
          { name: 'Spring', startMonth: 3, endMonth: 5, icon: 'spring' },
          { name: 'Summer', startMonth: 6, endMonth: 8, icon: 'summer' },
          { name: 'Autumn', startMonth: 9, endMonth: 11, icon: 'fall' },
          { name: 'Winter', startMonth: 12, endMonth: 2, icon: 'winter' },
        ],
      }),
      getCalendar: () => undefined,
    };

    integration = new (SeasonsStarsIntegration as any)(mockCalendarManager);

    const springDate = { month: 4, day: 15 } as any;
    const springInfo = integration.api.getSeasonInfo(springDate);
    expect(springInfo.name).toBe('Spring');
    expect(springInfo.icon).toBe('spring');

    const summerDate = { month: 7, day: 1 } as any;
    const summerInfo = integration.api.getSeasonInfo(summerDate);
    expect(summerInfo.name).toBe('Summer');
    expect(summerInfo.icon).toBe('summer');
  });

  it('should handle year-crossing winter season (Dec-Feb)', () => {
    mockCalendarManager = {
      getActiveCalendar: () => ({
        id: 'crossing-winter',
        seasons: [
          { name: 'Spring', startMonth: 3, endMonth: 5, icon: 'spring' },
          { name: 'Summer', startMonth: 6, endMonth: 8, icon: 'summer' },
          { name: 'Autumn', startMonth: 9, endMonth: 11, icon: 'fall' },
          { name: 'Winter', startMonth: 12, endMonth: 2, icon: 'winter' },
        ],
      }),
      getCalendar: () => undefined,
    };

    integration = new (SeasonsStarsIntegration as any)(mockCalendarManager);

    const decemberDate = { month: 12, day: 25 } as any;
    const decemberInfo = integration.api.getSeasonInfo(decemberDate);
    expect(decemberInfo.name).toBe('Winter');
    expect(decemberInfo.icon).toBe('winter');

    const januaryDate = { month: 1, day: 15 } as any;
    const januaryInfo = integration.api.getSeasonInfo(januaryDate);
    expect(januaryInfo.name).toBe('Winter');
    expect(januaryInfo.icon).toBe('winter');

    const februaryDate = { month: 2, day: 28 } as any;
    const februaryInfo = integration.api.getSeasonInfo(februaryDate);
    expect(februaryInfo.name).toBe('Winter');
    expect(februaryInfo.icon).toBe('winter');

    const marchDate = { month: 3, day: 1 } as any;
    const marchInfo = integration.api.getSeasonInfo(marchDate);
    expect(marchInfo.name).toBe('Spring');
  });

  it('should handle Warhammer-style year-crossing season (months 10-1)', () => {
    mockCalendarManager = {
      getActiveCalendar: () => ({
        id: 'warhammer',
        seasons: [
          { name: 'Spring', startMonth: 2, endMonth: 4, icon: 'spring' },
          { name: 'Summer', startMonth: 5, endMonth: 7, icon: 'summer' },
          { name: 'Autumn', startMonth: 8, endMonth: 9, icon: 'fall' },
          { name: 'Winter', startMonth: 10, endMonth: 1, icon: 'winter' },
        ],
      }),
      getCalendar: () => undefined,
    };

    integration = new (SeasonsStarsIntegration as any)(mockCalendarManager);

    const month10 = { month: 10, day: 1 } as any;
    expect(integration.api.getSeasonInfo(month10).name).toBe('Winter');

    const month11 = { month: 11, day: 15 } as any;
    expect(integration.api.getSeasonInfo(month11).name).toBe('Winter');

    const month12 = { month: 12, day: 31 } as any;
    expect(integration.api.getSeasonInfo(month12).name).toBe('Winter');

    const month1 = { month: 1, day: 20 } as any;
    expect(integration.api.getSeasonInfo(month1).name).toBe('Winter');

    const month2 = { month: 2, day: 1 } as any;
    expect(integration.api.getSeasonInfo(month2).name).toBe('Spring');
  });

  it('should include description when provided in season definition', () => {
    mockCalendarManager = {
      getActiveCalendar: () => ({
        id: 'with-description',
        seasons: [
          {
            name: 'Winter',
            startMonth: 12,
            endMonth: 2,
            icon: 'winter',
            description: 'The harsh season of survival',
          },
        ],
      }),
      getCalendar: () => undefined,
    };

    integration = new (SeasonsStarsIntegration as any)(mockCalendarManager);

    const winterDate = { month: 1, day: 15 } as any;
    const seasonInfo = integration.api.getSeasonInfo(winterDate);

    expect(seasonInfo.description).toBe('The harsh season of survival');
  });

  it('should use default icon if season has no icon defined', () => {
    mockCalendarManager = {
      getActiveCalendar: () => ({
        id: 'no-icon',
        seasons: [{ name: 'Winter Season', startMonth: 12, endMonth: 2 }],
      }),
      getCalendar: () => undefined,
    };

    integration = new (SeasonsStarsIntegration as any)(mockCalendarManager);

    const winterDate = { month: 1, day: 15 } as any;
    const seasonInfo = integration.api.getSeasonInfo(winterDate);

    expect(seasonInfo.icon).toBe('winter');
  });

  it('should handle endMonth defaulting to startMonth for single-month seasons', () => {
    mockCalendarManager = {
      getActiveCalendar: () => ({
        id: 'single-month',
        seasons: [{ name: 'Monsoon', startMonth: 7, icon: 'rain' }],
      }),
      getCalendar: () => undefined,
    };

    integration = new (SeasonsStarsIntegration as any)(mockCalendarManager);

    const julyDate = { month: 7, day: 15 } as any;
    const seasonInfo = integration.api.getSeasonInfo(julyDate);
    expect(seasonInfo.name).toBe('Monsoon');

    const augustDate = { month: 8, day: 1 } as any;
    const fallbackInfo = integration.api.getSeasonInfo(augustDate);
    expect(fallbackInfo.name).not.toBe('Monsoon');
  });

  it('should use calendarId parameter if provided', () => {
    const calendar1 = {
      id: 'calendar1',
      seasons: [{ name: 'Season1', startMonth: 1, endMonth: 12, icon: 's1' }],
    };

    const calendar2 = {
      id: 'calendar2',
      seasons: [{ name: 'Season2', startMonth: 1, endMonth: 12, icon: 's2' }],
    };

    mockCalendarManager = {
      getActiveCalendar: () => calendar1,
      getCalendar: (id?: string) => (id === 'calendar2' ? calendar2 : calendar1),
    };

    integration = new (SeasonsStarsIntegration as any)(mockCalendarManager);

    const date = { month: 5, day: 15 } as any;

    const defaultInfo = integration.api.getSeasonInfo(date);
    expect(defaultInfo.name).toBe('Season1');

    const explicitInfo = integration.api.getSeasonInfo(date, 'calendar2');
    expect(explicitInfo.name).toBe('Season2');
  });

  it('should handle edge case: month at exact season boundaries', () => {
    mockCalendarManager = {
      getActiveCalendar: () => ({
        id: 'boundary-test',
        seasons: [
          { name: 'Season A', startMonth: 1, endMonth: 3, icon: 'a' },
          { name: 'Season B', startMonth: 4, endMonth: 6, icon: 'b' },
        ],
      }),
      getCalendar: () => undefined,
    };

    integration = new (SeasonsStarsIntegration as any)(mockCalendarManager);

    expect(integration.api.getSeasonInfo({ month: 3, day: 31 } as any).name).toBe('Season A');
    expect(integration.api.getSeasonInfo({ month: 4, day: 1 } as any).name).toBe('Season B');
    expect(integration.api.getSeasonInfo({ month: 6, day: 30 } as any).name).toBe('Season B');
  });

  it('should fallback to default seasons for months not covered by definitions', () => {
    mockCalendarManager = {
      getActiveCalendar: () => ({
        id: 'partial-coverage',
        seasons: [{ name: 'Only Summer', startMonth: 6, endMonth: 8, icon: 'summer' }],
      }),
      getCalendar: () => undefined,
    };

    integration = new (SeasonsStarsIntegration as any)(mockCalendarManager);

    const summerDate = { month: 7, day: 15 } as any;
    expect(integration.api.getSeasonInfo(summerDate).name).toBe('Only Summer');

    const winterDate = { month: 12, day: 25 } as any;
    const fallbackInfo = integration.api.getSeasonInfo(winterDate);
    expect(fallbackInfo.name).toBe('Winter');
  });

  it('should return first matching season when overlapping (season order matters)', () => {
    mockCalendarManager = {
      getActiveCalendar: () => ({
        id: 'overlapping',
        seasons: [
          { name: 'Early Year', startMonth: 1, endMonth: 2, icon: 'winter' },
          { name: 'Mid Year', startMonth: 3, endMonth: 9, icon: 'summer' },
          { name: 'Late Year', startMonth: 10, endMonth: 12, icon: 'fall' },
          { name: 'Year Crossing', startMonth: 11, endMonth: 1, icon: 'special' },
        ],
      }),
      getCalendar: () => undefined,
    };

    integration = new (SeasonsStarsIntegration as any)(mockCalendarManager);

    const nov = { month: 11, day: 15 } as any;
    const novInfo = integration.api.getSeasonInfo(nov);
    expect(novInfo.name).toBe('Late Year');

    const jan = { month: 1, day: 5 } as any;
    const janInfo = integration.api.getSeasonInfo(jan);
    expect(janInfo.name).toBe('Early Year');
  });

  it('should handle seasons with startDay for mid-month boundaries', () => {
    mockCalendarManager = {
      getActiveCalendar: () => ({
        id: 'mid-month-seasons',
        seasons: [
          { name: 'Vernal', startMonth: 3, startDay: 15, endMonth: 5, icon: 'spring' },
          { name: 'Estival', startMonth: 6, startDay: 15, endMonth: 9, icon: 'summer' },
        ],
        months: [
          { days: 31 },
          { days: 28 },
          { days: 31 },
          { days: 30 },
          { days: 31 },
          { days: 30 },
          { days: 31 },
          { days: 31 },
          { days: 30 },
          { days: 31 },
          { days: 30 },
          { days: 31 },
        ],
      }),
      getCalendar: () => undefined,
    };

    integration = new (SeasonsStarsIntegration as any)(mockCalendarManager);

    const beforeSpring = { month: 3, day: 14 } as any;
    expect(integration.api.getSeasonInfo(beforeSpring).name).toBe('Spring');

    const startOfSpring = { month: 3, day: 15 } as any;
    expect(integration.api.getSeasonInfo(startOfSpring).name).toBe('Vernal');

    const midSpring = { month: 4, day: 20 } as any;
    expect(integration.api.getSeasonInfo(midSpring).name).toBe('Vernal');

    const beforeSummer = { month: 6, day: 14 } as any;
    expect(integration.api.getSeasonInfo(beforeSummer).name).toBe('Summer');

    const startOfSummer = { month: 6, day: 15 } as any;
    expect(integration.api.getSeasonInfo(startOfSummer).name).toBe('Estival');
  });

  it('should handle year-crossing seasons with startDay', () => {
    mockCalendarManager = {
      getActiveCalendar: () => ({
        id: 'year-crossing-startday',
        seasons: [
          { name: 'Frost', startMonth: 12, startDay: 15, endMonth: 2, icon: 'winter' },
          { name: 'Bloom', startMonth: 3, endMonth: 5, icon: 'spring' },
        ],
        months: [
          { days: 31 },
          { days: 28 },
          { days: 31 },
          { days: 30 },
          { days: 31 },
          { days: 30 },
          { days: 31 },
          { days: 31 },
          { days: 30 },
          { days: 31 },
          { days: 30 },
          { days: 31 },
        ],
      }),
      getCalendar: () => undefined,
    };

    integration = new (SeasonsStarsIntegration as any)(mockCalendarManager);

    const beforeWinter = { month: 12, day: 14 } as any;
    expect(integration.api.getSeasonInfo(beforeWinter).name).toBe('Winter');

    const startOfWinter = { month: 12, day: 15 } as any;
    expect(integration.api.getSeasonInfo(startOfWinter).name).toBe('Frost');

    const lateDecember = { month: 12, day: 31 } as any;
    expect(integration.api.getSeasonInfo(lateDecember).name).toBe('Frost');

    const january = { month: 1, day: 15 } as any;
    expect(integration.api.getSeasonInfo(january).name).toBe('Frost');

    const endOfWinter = { month: 2, day: 28 } as any;
    expect(integration.api.getSeasonInfo(endOfWinter).name).toBe('Frost');

    const startOfSpring = { month: 3, day: 1 } as any;
    expect(integration.api.getSeasonInfo(startOfSpring).name).toBe('Bloom');
  });

  it('should default startDay to 1 when not specified', () => {
    mockCalendarManager = {
      getActiveCalendar: () => ({
        id: 'no-startday',
        seasons: [{ name: 'Spring', startMonth: 3, endMonth: 5, icon: 'spring' }],
        months: Array(12).fill({ days: 30 }),
      }),
      getCalendar: () => undefined,
    };

    integration = new (SeasonsStarsIntegration as any)(mockCalendarManager);

    const firstDay = { month: 3, day: 1 } as any;
    expect(integration.api.getSeasonInfo(firstDay).name).toBe('Spring');
  });
});
