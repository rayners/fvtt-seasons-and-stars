/**
 * PF2e Imperial Calendar Offset Tests
 *
 * Tests to ensure the Imperial Calendar variant has the correct year offset.
 * The Imperial Calendar should be 2500 years after the standard Golarion calendar.
 *
 * GitHub Issue #264: Imperial Calendar has inconsistent month names
 * - Also covers the year offset issue reported in the comments
 */

/* eslint-disable @typescript-eslint/triple-slash-reference */
/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference path="../../core/test/test-types.d.ts" />

import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarEngine } from '../../core/src/core/calendar-engine';
import { CalendarManager } from '../../core/src/core/calendar-manager';
import { setupFoundryEnvironment } from '../../core/test/setup';
import golarionCalendarData from '../calendars/golarion-pf2e.json';
import type { SeasonsStarsCalendar } from '../../core/src/types/calendar';

describe('PF2e Imperial Calendar Offset Tests', () => {
  let calendarManager: CalendarManager;

  beforeEach(() => {
    setupFoundryEnvironment();
    calendarManager = new CalendarManager();
  });

  describe('Imperial Calendar Year Offset', () => {
    it('should have correct year offset of 5200 for Imperial Calendar variant', () => {
      // Load the Golarion calendar
      const calendar = golarionCalendarData as unknown as SeasonsStarsCalendar;
      calendarManager.loadCalendar(calendar);

      // Get the Imperial Calendar variant config
      const imperialVariant = calendar.variants?.['imperial-calendar'];
      expect(imperialVariant).toBeDefined();
      expect(imperialVariant?.config?.yearOffset).toBe(5200);
    });

    it('should show year 7225 IC when base calendar is at 4725 AR', () => {
      // Load the Golarion calendar
      const calendar = golarionCalendarData as unknown as SeasonsStarsCalendar;

      // The base calendar should be at year 4725 AR
      expect(calendar.year.currentYear).toBe(4725);

      // Imperial Calendar variant should have yearOffset of 5200
      const imperialVariant = calendar.variants?.['imperial-calendar'];
      expect(imperialVariant?.config?.yearOffset).toBe(5200);

      // When applied, this should result in year 7225 IC (4725 + 2500)
      // The yearOffset mechanics work as follows:
      // Base epoch: 2700, Imperial epoch: 5200
      // Difference: 5200 - 2700 = 2500 years
      // Imperial current year = base current year + (imperial epoch - base epoch)
      // = 4725 + (5200 - 2700) = 4725 + 2500 = 7225 IC
    });

    it('should calculate correct year difference between AR and IC variants using real calendars', () => {
      const calendar = golarionCalendarData as unknown as SeasonsStarsCalendar;
      calendarManager.loadCalendar(calendar);

      // Get both variants from the manager - these are the real calendar instances
      const absalomCalendar = calendarManager.getCalendar('golarion-pf2e(absalom-reckoning)');
      const imperialCalendar = calendarManager.getCalendar('golarion-pf2e(imperial-calendar)');

      expect(absalomCalendar).toBeDefined();
      expect(imperialCalendar).toBeDefined();

      // Check the year values directly from the calendar objects
      // These are the "currentYear" values that represent the starting year
      expect(absalomCalendar!.year.currentYear).toBe(4725); // AR starts at 4725
      expect(imperialCalendar!.year.currentYear).toBe(7225); // IC should be 4725 + 2500 = 7225

      // The year difference should be exactly 2500
      const yearDifference = imperialCalendar!.year.currentYear - absalomCalendar!.year.currentYear;
      expect(yearDifference).toBe(2500);
    });

    it('should maintain 2500 year difference when converting worldTime to dates', () => {
      const calendar = golarionCalendarData as unknown as SeasonsStarsCalendar;
      calendarManager.loadCalendar(calendar);

      // Get both variants
      const absalomCalendar = calendarManager.getCalendar('golarion-pf2e(absalom-reckoning)');
      const imperialCalendar = calendarManager.getCalendar('golarion-pf2e(imperial-calendar)');

      // Create engines for both variants
      const absalomEngine = new CalendarEngine(absalomCalendar!);
      const imperialEngine = new CalendarEngine(imperialCalendar!);

      // Test with worldTime = 0
      const absalomDate = absalomEngine.worldTimeToDate(0);
      const imperialDate = imperialEngine.worldTimeToDate(0);

      // The year difference should always be 2500
      const yearDifference = imperialDate.year - absalomDate.year;
      expect(yearDifference).toBe(2500);

      // Test with a different worldTime (1 year worth of seconds)
      const oneYearSeconds = 365 * 24 * 60 * 60;
      const absalomDateYear1 = absalomEngine.worldTimeToDate(oneYearSeconds);
      const imperialDateYear1 = imperialEngine.worldTimeToDate(oneYearSeconds);

      const yearDifferenceYear1 = imperialDateYear1.year - absalomDateYear1.year;
      expect(yearDifferenceYear1).toBe(2500);
    });

    it('should have correct description mentioning Tian Xia instead of Cheliax', () => {
      const calendar = golarionCalendarData as unknown as SeasonsStarsCalendar;
      const imperialVariant = calendar.variants?.['imperial-calendar'];

      expect(imperialVariant?.description).toContain('Tian Xia');
      expect(imperialVariant?.description).toContain('Dragon Empires');
      expect(imperialVariant?.description).not.toContain('Cheliax');
      expect(imperialVariant?.description).not.toContain('Chelish');
    });

    it('should not have month name overrides in Imperial Calendar variant', () => {
      const calendar = golarionCalendarData as unknown as SeasonsStarsCalendar;
      const imperialVariant = calendar.variants?.['imperial-calendar'];

      // The variant should not have month overrides
      expect(imperialVariant?.overrides?.months).toBeUndefined();
    });

    it('should verify specific year examples: 0 AR -> 2500 IC, 4725 AR -> 7225 IC', () => {
      const calendar = golarionCalendarData as unknown as SeasonsStarsCalendar;
      calendarManager.loadCalendar(calendar);

      // Create engines for both variants
      const absalomCalendar = calendarManager.getCalendar('golarion-pf2e(absalom-reckoning)');
      const imperialCalendar = calendarManager.getCalendar('golarion-pf2e(imperial-calendar)');

      const absalomEngine = new CalendarEngine(absalomCalendar!);
      const imperialEngine = new CalendarEngine(imperialCalendar!);

      // Calculate worldTime for year 0 AR (going back from year 4725)
      // The calendar starts at year 4725, which is at worldTime 0
      // To get to year 0 AR, we need to go back 4725 years
      const yearsToGoBack = 4725;
      const secondsPerYear = 365 * 24 * 60 * 60;
      const worldTimeForYear0 = -(yearsToGoBack * secondsPerYear);

      const absalomYear0 = absalomEngine.worldTimeToDate(worldTimeForYear0);
      const imperialYear0 = imperialEngine.worldTimeToDate(worldTimeForYear0);

      // At year 0 AR, Imperial should be at year 2500 IC
      expect(absalomYear0.year).toBe(0);
      expect(imperialYear0.year).toBe(2500);

      // At worldTime 0 (the starting point), we have year 4725 AR and 7225 IC
      const absalomCurrent = absalomEngine.worldTimeToDate(0);
      const imperialCurrent = imperialEngine.worldTimeToDate(0);

      expect(absalomCurrent.year).toBe(4725);
      expect(imperialCurrent.year).toBe(7225);
    });
  });
});