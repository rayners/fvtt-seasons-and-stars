/**
 * Test for PF2e Calendar Click Bug
 *
 * This test demonstrates the issue where clicking on a date in the S&S calendar grid
 * sets the date correctly in S&S, but causes PF2e to jump ahead around 2000 years.
 *
 * The bug occurs because:
 * 1. User clicks a date in S&S calendar (e.g., Jan 15, 4725 AR)
 * 2. S&S converts this to worldTime using epoch-based calculation
 * 3. PF2e reads the new worldTime and calculates year using real-world date + offset
 * 4. This causes a massive year jump due to epoch/real-time interpretation mismatch
 */

/* eslint-disable @typescript-eslint/triple-slash-reference */
/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference path="../../core/test/test-types.d.ts" />

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarEngine } from '../../core/src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../../core/src/types/calendar';
import golarionCalendar from '../calendars/golarion-pf2e.json';

// Mock Foundry game object with PF2e world clock settings
const mockPF2eGame = (): { worldCreatedOn: string; initialWorldTime: number } => {
  const worldCreatedOn = '2025-07-04T12:00:00.000Z'; // Today's date in real world
  const initialWorldTime = 0; // Fresh world

  (globalThis as any).game = {
    system: { id: 'pf2e' },
    time: {
      worldTime: initialWorldTime,
      advance: vi.fn((seconds: number) => {
        (globalThis as any).game.time.worldTime += seconds;
      }),
    },
    pf2e: {
      settings: {
        worldClock: {
          worldCreatedOn,
          dateTheme: 'AR', // Absalom Reckoning
        },
      },
    },
    modules: new Map([['pf2e', { active: true }]]),
    settings: {
      get: vi.fn(),
      set: vi.fn(),
    },
  } as any;

  return { worldCreatedOn, initialWorldTime };
};

describe('PF2e Calendar Click Bug', () => {
  let engine: CalendarEngine;
  let calendar: SeasonsStarsCalendar;

  beforeEach(() => {
    calendar = golarionCalendar as unknown as SeasonsStarsCalendar;
    engine = new CalendarEngine(calendar);
  });

  it('demonstrates the bug: S&S calendar click causes PF2e year jump', () => {
    // Setup PF2e environment
    const { worldCreatedOn, initialWorldTime } = mockPF2eGame();

    // STEP 1: Initial state - both systems should show same date

    // PF2e calculates date using worldCreatedOn + worldTime
    const worldCreatedOnDate = new Date(worldCreatedOn);
    const pf2eDateTime = new Date(worldCreatedOnDate.getTime() + initialWorldTime * 1000);
    const pf2eYear = pf2eDateTime.getUTCFullYear() + 2700; // AR year offset

    // S&S calculates date from worldTime WITHOUT PF2e integration (the bug)
    const initialSSDate = engine.worldTimeToDate(initialWorldTime);
    // Verify S&S without integration shows epoch year
    expect(initialSSDate.year).toBe(2700); // Should be epoch year without integration

    // S&S calculates date WITH PF2e integration (the fix)
    const worldCreatedOnTimestamp = Math.floor(new Date(worldCreatedOn).getTime() / 1000);
    const initialSSDateFixed = engine.worldTimeToDate(initialWorldTime, worldCreatedOnTimestamp);
    // Verify S&S with integration shows PF2e-compatible year
    expect(initialSSDateFixed.year).toBe(pf2eYear); // Should match PF2e year with integration
    const pf2eMonth = pf2eDateTime.getUTCMonth() + 1;
    const pf2eDay = pf2eDateTime.getUTCDate();
    // Verify PF2e calculation matches expected date
    expect(pf2eYear).toBe(4725); // Expected PF2e year for 2025 + 2700 offset
    expect(pf2eMonth).toBe(7); // July
    expect(pf2eDay).toBe(4); // July 4th

    // Demonstrate the bug: S&S without integration has massive year gap
    const bugYearGap = Math.abs(pf2eYear - initialSSDate.year);
    expect(bugYearGap).toBe(2025); // Exact bug reproduction - 2025 year difference

    // Demonstrate the fix: S&S with integration matches PF2e
    const fixedYearGap = Math.abs(pf2eYear - initialSSDateFixed.year);
    expect(fixedYearGap).toBe(0); // Exact fix verification - no year gap with integration
  });

  it('identifies the root cause: epoch vs real-time interpretation mismatch', () => {
    const { worldCreatedOn } = mockPF2eGame();

    // The problem: S&S uses epoch-based calculation
    const epochYear = calendar.year?.epoch || 0;
    expect(epochYear).toBe(2700); // S&S calendar epoch year

    // PF2e uses real-world date + offset
    const worldCreatedOnDate = new Date(worldCreatedOn);
    const pf2eBaseYear = worldCreatedOnDate.getUTCFullYear() + 2700;
    expect(pf2eBaseYear).toBe(4725); // PF2e year for 2025 + 2700 offset

    // The fundamental mismatch
    const yearGap = Math.abs(pf2eBaseYear - epochYear);
    expect(yearGap).toBeGreaterThan(1000); // Confirms massive year mismatch between systems
  });

  it('shows the fix approach: S&S should align with PF2e worldTime interpretation', () => {
    const { worldCreatedOn } = mockPF2eGame();

    // S&S should interpret worldTime like PF2e does
    const worldCreatedOnTimestamp = Math.floor(new Date(worldCreatedOn).getTime() / 1000);

    // Use S&S engine with PF2e-compatible interpretation
    const pf2eCompatibleDate = engine.worldTimeToDate(0, worldCreatedOnTimestamp);

    // PF2e calculation for comparison
    const worldCreatedOnDate = new Date(worldCreatedOn);
    const pf2eDateTime = new Date(worldCreatedOnDate.getTime());
    const pf2eYear = pf2eDateTime.getUTCFullYear() + 2700;
    const pf2eMonth = pf2eDateTime.getUTCMonth() + 1;
    const pf2eDay = pf2eDateTime.getUTCDate();

    // With the fix, dates should match
    expect(pf2eCompatibleDate.year).toBe(pf2eYear);
    expect(pf2eCompatibleDate.month).toBe(pf2eMonth);
    expect(pf2eCompatibleDate.day).toBe(pf2eDay);
  });
});
