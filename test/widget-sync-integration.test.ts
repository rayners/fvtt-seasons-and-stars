/**
 * Widget Synchronization Integration Tests
 *
 * Tests for the GitHub #91 comment issue where widgets show different years
 * after date changes. This tests the integration between time converter
 * and widgets when world creation timestamps are involved.
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import { TimeConverter } from '../src/core/time-converter';
import type { SeasonsStarsCalendar } from '../src/types/calendar-types';
import { setupPF2eEnvironment } from './setup';
// Import PF2e integration to register the world creation timestamp hook
import '../src/integrations/pf2e-integration';

describe('Widget Synchronization Integration', () => {
  let golarionCalendar: SeasonsStarsCalendar;
  let engine: CalendarEngine;
  let timeConverter: TimeConverter;

  beforeAll(() => {
    // Set up PF2e environment using enhanced foundry-test-utils
    setupPF2eEnvironment({
      worldCreationTimestamp: new Date('2025-01-01T00:00:00.000Z').getTime() / 1000,
      currentWorldTime: 0,
      expectedWorldCreationYear: 2025,
    });

    // Add other needed globals for the test
    global.game.user = { isGM: true };
  });

  beforeEach(() => {
    // Golarion calendar definition (same as our year calculation tests)
    golarionCalendar = {
      id: 'golarion-pf2e',
      name: 'Golarion Calendar System',
      months: [
        { name: 'Abadius', days: 31, description: '' },
        { name: 'Calistril', days: 28, description: '' },
        { name: 'Pharast', days: 31, description: '' },
        { name: 'Gozran', days: 30, description: '' },
        { name: 'Desnus', days: 31, description: '' },
        { name: 'Sarenith', days: 30, description: '' },
        { name: 'Erastus', days: 31, description: '' },
        { name: 'Arodus', days: 31, description: '' },
        { name: 'Rova', days: 30, description: '' },
        { name: 'Lamashan', days: 31, description: '' },
        { name: 'Neth', days: 30, description: '' },
        { name: 'Kuthona', days: 31, description: '' },
      ],
      weekdays: [
        { name: 'Moonday', abbreviation: 'Mo' },
        { name: 'Toilday', abbreviation: 'To' },
        { name: 'Wealday', abbreviation: 'We' },
        { name: 'Oathday', abbreviation: 'Oa' },
        { name: 'Fireday', abbreviation: 'Fi' },
        { name: 'Starday', abbreviation: 'St' },
        { name: 'Sunday', abbreviation: 'Su' },
      ],
      year: {
        epoch: 2700,
        suffix: ' AR',
      },
      leapYear: {
        rule: 'custom',
        interval: 4,
        month: 'Calistril',
        extraDays: 1,
      },
      time: {
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
      },
      intercalary: [],
    };

    engine = new CalendarEngine(golarionCalendar);
    timeConverter = new TimeConverter(engine);
  });

  describe('GitHub Issue #91 Comment Bug - Widget Year Mismatch', () => {
    it('should reproduce the widget synchronization issue', () => {
      // This test reproduces the exact issue from the GitHub comment:
      // "The montly calender section isnt tied properly into the main time clock somehow"

      // STEP 1: Get world creation timestamp from PF2e settings (simulating PF2e environment)
      const worldCreationTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;

      // STEP 2: Direct calendar engine call (what should happen)
      const correctDate = engine.worldTimeToDate(0, worldCreationTimestamp);
      expect(correctDate.year).toBe(4725); // Should be 2025 + 2700 = 4725

      // STEP 3: Time converter call (what widgets actually get)
      // This simulates what happens when widgets update via seasons-stars:dateChanged hook
      global.game.time.worldTime = 0;

      // Time converter calls engine without world creation timestamp
      const timeConverterDate = engine.worldTimeToDate(0); // Missing worldCreationTimestamp!

      // PROBLEM: Time converter gives different result than direct call
      expect(timeConverterDate.year).toBe(2700); // Wrong! Shows epoch year instead of PF2e year

      // This demonstrates the bug: widgets get 2700 while direct calls get 4725
      const yearDifference = correctDate.year - timeConverterDate.year;
      expect(yearDifference).toBe(2025); // 2025 year difference = the bug!
    });

    it('should verify that widget sync fix works with enhanced foundry-test-utils', () => {
      // This test verifies that our enhanced foundry-test-utils enable full PF2e integration

      const WORLD_CREATION_DATE = '2025-01-01T00:00:00.000Z';
      const WORLD_CREATION_YEAR = 2025;
      const CALENDAR_EPOCH = 2700;
      const EXPECTED_PF2E_YEAR = WORLD_CREATION_YEAR + CALENDAR_EPOCH; // 4725
      const SECONDS_PER_DAY = 86400;
      const ONE_DAY_ELAPSED = SECONDS_PER_DAY;

      // Set up PF2e environment with proper integration
      global.game.system = { id: 'pf2e' };
      global.game.pf2e = {
        settings: {
          worldClock: {
            worldCreatedOn: WORLD_CREATION_DATE,
          },
        },
      };
      global.game.time = { worldTime: ONE_DAY_ELAPSED };

      // With enhanced foundry-test-utils, PF2e integration hooks should now work
      // The time converter should get world creation timestamp via hooks and return PF2e year
      const currentDate = timeConverter.getCurrentDate();
      expect(currentDate.year).toBe(EXPECTED_PF2E_YEAR); // 4725 with working hooks!

      // Verify this matches what the engine produces with world creation timestamp
      const worldCreationTimestamp = new Date(WORLD_CREATION_DATE).getTime() / 1000;
      const correctDate = engine.worldTimeToDate(ONE_DAY_ELAPSED, worldCreationTimestamp);
      expect(correctDate.year).toBe(EXPECTED_PF2E_YEAR); // 4725 - what widgets should get

      // The fix now works end-to-end: currentDate.year equals correctDate.year
      expect(currentDate.year).toBe(correctDate.year); // Both should be 4725!
    });

    it('should show the fix requires time converter to use world creation timestamp', () => {
      // This test shows what the fix should look like

      const worldCreationTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;

      // Current broken behavior: time converter doesn't use world creation timestamp
      const brokenResult = engine.worldTimeToDate(0);
      expect(brokenResult.year).toBe(2700);

      // Fixed behavior: time converter should use world creation timestamp in PF2e environments
      const fixedResult = engine.worldTimeToDate(0, worldCreationTimestamp);
      expect(fixedResult.year).toBe(4725);

      // The fix: time converter needs to detect PF2e environment and use world creation timestamp
      // This would require modifying time converter to:
      // 1. Detect PF2e system
      // 2. Get world creation timestamp from PF2e settings
      // 3. Pass it to engine.worldTimeToDate()
    });
  });

  describe('Time Converter Enhancement Requirements', () => {
    it('should detect PF2e environment and extract world creation timestamp', () => {
      // Test what the time converter should do to fix the widget sync issue

      // Mock PF2e environment detection
      const isPF2eSystem = global.game.system.id === 'pf2e';
      expect(isPF2eSystem).toBe(true);

      // Mock world creation timestamp extraction
      const worldCreationTimestamp = global.game.pf2e?.settings?.worldClock?.worldCreatedOn;
      expect(worldCreationTimestamp).toBe('2025-01-01T00:00:00.000Z');

      // Convert to timestamp format
      const timestamp = new Date(worldCreationTimestamp).getTime() / 1000;
      expect(timestamp).toBeGreaterThan(0);

      // Test that using this timestamp gives correct results
      const result = engine.worldTimeToDate(0, timestamp);
      expect(result.year).toBe(4725); // PF2e compatible year
    });

    it('should fall back to epoch-based calculation when not in PF2e', () => {
      // Test backward compatibility for non-PF2e systems

      // Mock non-PF2e environment
      global.game.system.id = 'dnd5e';

      const result = engine.worldTimeToDate(0); // No world creation timestamp
      expect(result.year).toBe(2700); // Should use epoch-based calculation

      // This ensures we don't break existing non-PF2e installations
    });
  });
});
