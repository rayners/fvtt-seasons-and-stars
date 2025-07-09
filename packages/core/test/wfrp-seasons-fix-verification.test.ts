/**
 * Verification test for WFRP seasons fix (Issue #83)
 * Tests that the WFRP calendar now has seasons to prevent infinite loop
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

describe('WFRP Seasons Fix Verification (Issue #83)', () => {
  let warhammerData: SeasonsStarsCalendar;

  it('should load WFRP calendar successfully', () => {
    const warhammerPath = resolve(
      __dirname,
      '../../../packages/fantasy-pack/calendars/warhammer.json'
    );
    warhammerData = JSON.parse(readFileSync(warhammerPath, 'utf8'));

    expect(warhammerData.id).toBe('warhammer');
    expect(warhammerData.translations.en.label).toBe('Imperial Calendar (Warhammer Fantasy)');
  });

  it('should have seasons property defined', () => {
    expect(warhammerData.seasons).toBeDefined();
    expect(Array.isArray(warhammerData.seasons)).toBe(true);
    expect(warhammerData.seasons!.length).toBeGreaterThan(0);
  });

  it('should have exactly 4 seasons', () => {
    expect(warhammerData.seasons).toHaveLength(4);

    const seasonNames = warhammerData.seasons!.map(s => s.name);
    expect(seasonNames).toEqual(['Spring', 'Summer', 'Autumn', 'Winter']);
  });

  it('should have properly configured season month ranges', () => {
    const seasons = warhammerData.seasons!;

    // Spring: Jahrdrung(2), Pflugzeit(3), Sigmarzeit(4)
    expect(seasons[0].startMonth).toBe(2);
    expect(seasons[0].endMonth).toBe(4);

    // Summer: Sommerzeit(5), Vorgeheim(6), Nachgeheim(7)
    expect(seasons[1].startMonth).toBe(5);
    expect(seasons[1].endMonth).toBe(7);

    // Autumn: Erntezeit(8), Brauzeit(9)
    expect(seasons[2].startMonth).toBe(8);
    expect(seasons[2].endMonth).toBe(9);

    // Winter: Kaldezeit(10), Ulriczeit(11), Vorhexen(12), Nachexen(1)
    expect(seasons[3].startMonth).toBe(10);
    expect(seasons[3].endMonth).toBe(1); // Crosses year boundary
  });

  it('should have valid icons for all seasons', () => {
    const seasons = warhammerData.seasons!;
    const expectedIcons = ['spring', 'summer', 'fall', 'winter'];

    seasons.forEach((season, index) => {
      expect(season.icon).toBe(expectedIcons[index]);
    });
  });

  it('should provide proper season coverage for all months', () => {
    const seasons = warhammerData.seasons!;

    // Test each month gets assigned to a season
    for (let month = 1; month <= 12; month++) {
      const season = seasons.find(s => {
        if (s.startMonth! <= s.endMonth!) {
          return month >= s.startMonth! && month <= s.endMonth!;
        } else {
          // Handle winter crossing year boundary
          return month >= s.startMonth! || month <= s.endMonth!;
        }
      });

      expect(season).toBeDefined();
      console.log(`Month ${month}: ${season!.name}`);
    }
  });

  it('should prevent the "No seasons found" warning that caused infinite loop', () => {
    // This test simulates the condition that was causing the error loop
    const calendar = warhammerData;

    // Check the exact condition from module.ts line 961-964
    const hasValidSeasons = !!(calendar && calendar.seasons && calendar.seasons.length > 0);

    expect(hasValidSeasons).toBe(true);
    console.log('✅ WFRP calendar now passes season validation');
    console.log('✅ getSeasonInfo() will no longer trigger warning loop');
  });
});
