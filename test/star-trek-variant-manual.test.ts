import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarManager } from '../src/core/calendar-manager';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

/**
 * Manual test to verify Star Trek variant processing works correctly
 *
 * This test loads the actual calendar files and verifies that the
 * federation-standard variant has its dateFormats applied correctly.
 */
describe('Star Trek Variant Manual Test', () => {
  let calendarManager: CalendarManager;

  beforeEach(() => {
    // Mock Handlebars for the calendar manager
    global.Handlebars = {
      compile: vi.fn(() => vi.fn(() => 'mock-output')),
      registerHelper: vi.fn(),
    };

    calendarManager = new CalendarManager();
  });

  it('should manually process Star Trek variant dateFormats', async () => {
    // Load the gregorian base calendar and Star Trek variants manually using file system
    const fs = await import('fs/promises');
    const path = await import('path');

    // Load base gregorian calendar
    const gregorianPath = path.resolve(__dirname, '../calendars/gregorian.json');
    const gregorianData = await fs.readFile(gregorianPath, 'utf-8');
    const baseCalendar: SeasonsStarsCalendar = JSON.parse(gregorianData);

    // Load Star Trek variants
    const starTrekPath = path.resolve(__dirname, '../calendars/gregorian-star-trek-variants.json');
    const starTrekData = await fs.readFile(starTrekPath, 'utf-8');
    const starTrekVariants = JSON.parse(starTrekData);

    // Manually apply the federation-standard variant to the base calendar
    const federationVariant = starTrekVariants.variants['federation-standard'];
    expect(federationVariant).toBeDefined();
    expect(federationVariant.overrides?.dateFormats).toBeDefined();

    // Test that the variant has the expected dateFormats structure
    const dateFormats = federationVariant.overrides.dateFormats;
    expect(dateFormats.widgets).toBeDefined();
    expect(dateFormats.widgets.mini).toBe('SD {{ss-dateFmt formatName="tng-stardate"}}');
    expect(dateFormats['tng-stardate']).toBeDefined();

    // Load the base calendar into the manager
    calendarManager.loadCalendar(baseCalendar);

    // Check that the base calendar was loaded
    const loadedBase = calendarManager.calendars.get('gregorian');
    expect(loadedBase).toBeDefined();
    expect(loadedBase?.dateFormats).toBeUndefined(); // Base should not have dateFormats

    // Now manually load and apply the Star Trek variant file
    calendarManager['applyExternalVariants'](baseCalendar, starTrekVariants);

    // Check that the federation-standard variant was created
    const federationCalendar = calendarManager.calendars.get('gregorian(federation-standard)');
    expect(federationCalendar).toBeDefined();

    if (federationCalendar) {
      console.log(
        'Federation calendar dateFormats:',
        JSON.stringify(federationCalendar.dateFormats, null, 2)
      );

      // Verify that dateFormats were applied
      expect(federationCalendar.dateFormats).toBeDefined();
      expect(federationCalendar.dateFormats?.widgets?.mini).toBe(
        'SD {{ss-dateFmt formatName="tng-stardate"}}'
      );
      expect(federationCalendar.dateFormats?.['tng-stardate']).toBeDefined();
    }
  });
});
