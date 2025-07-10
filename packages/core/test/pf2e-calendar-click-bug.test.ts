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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import type { SeasonsStarsCalendar } from '../src/types/calendar';
import golarionCalendar from '../calendars/golarion-pf2e.json';

// Mock Foundry game object with PF2e world clock settings
const mockPF2eGame = () => {
  const worldCreatedOn = '2025-07-04T12:00:00.000Z'; // Today's date in real world
  const initialWorldTime = 0; // Fresh world

  global.game = {
    system: { id: 'pf2e' },
    time: {
      worldTime: initialWorldTime,
      advance: vi.fn((seconds: number) => {
        global.game.time.worldTime += seconds;
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
    calendar = golarionCalendar as SeasonsStarsCalendar;
    engine = new CalendarEngine(calendar);
  });

  it('demonstrates the bug: S&S calendar click causes PF2e year jump', () => {
    // Setup PF2e environment
    const { worldCreatedOn, initialWorldTime } = mockPF2eGame();

    console.log('\n=== PF2e Calendar Click Bug Demonstration ===');

    // STEP 1: Initial state - both systems should show same date
    console.log('\nSTEP 1: Initial state');
    console.log(`Real world creation date: ${worldCreatedOn}`);
    console.log(`Game worldTime: ${initialWorldTime}`);

    // S&S calculates date from worldTime WITHOUT PF2e integration (the bug)
    const initialSSDate = engine.worldTimeToDate(initialWorldTime);
    console.log(
      `S&S shows (without PF2e integration): ${initialSSDate.year}/${initialSSDate.month}/${initialSSDate.day}`
    );

    // S&S calculates date WITH PF2e integration (the fix)
    const worldCreatedOnTimestamp = Math.floor(new Date(worldCreatedOn).getTime() / 1000);
    const initialSSDateFixed = engine.worldTimeToDate(initialWorldTime, worldCreatedOnTimestamp);
    console.log(
      `S&S shows (with PF2e integration): ${initialSSDateFixed.year}/${initialSSDateFixed.month}/${initialSSDateFixed.day}`
    );

    // PF2e calculates date using worldCreatedOn + worldTime
    const worldCreatedOnDate = new Date(worldCreatedOn);
    const pf2eDateTime = new Date(worldCreatedOnDate.getTime() + initialWorldTime * 1000);
    const pf2eYear = pf2eDateTime.getUTCFullYear() + 2700; // AR year offset
    const pf2eMonth = pf2eDateTime.getUTCMonth() + 1;
    const pf2eDay = pf2eDateTime.getUTCDate();
    console.log(`PF2e shows: ${pf2eYear}/${pf2eMonth}/${pf2eDay}`);

    // Demonstrate the bug: S&S without integration has massive year gap
    const bugYearGap = Math.abs(pf2eYear - initialSSDate.year);
    console.log(`Year gap WITHOUT integration: ${bugYearGap} years`);
    expect(bugYearGap).toBe(2025); // Exact bug reproduction

    // Demonstrate the fix: S&S with integration matches PF2e
    const fixedYearGap = Math.abs(pf2eYear - initialSSDateFixed.year);
    console.log(`Year gap WITH integration: ${fixedYearGap} years`);
    expect(fixedYearGap).toBe(0); // Exact fix verification

    console.log('\n=== DEMONSTRATION COMPLETE ===');
    console.log('The fix ensures S&S uses PF2e worldCreationTimestamp for proper date alignment!');
  });

  it('identifies the root cause: epoch vs real-time interpretation mismatch', () => {
    const { worldCreatedOn } = mockPF2eGame();

    console.log('\n=== Root Cause Analysis ===');

    // The problem: S&S uses epoch-based calculation
    const epochYear = calendar.year?.epoch || 0;
    console.log(`S&S calendar epoch year: ${epochYear}`);
    console.log(`S&S interprets worldTime=0 as year ${epochYear} + calculated days`);

    // PF2e uses real-world date + offset
    const worldCreatedOnDate = new Date(worldCreatedOn);
    const pf2eBaseYear = worldCreatedOnDate.getUTCFullYear() + 2700;
    console.log(
      `PF2e interprets worldTime=0 as ${worldCreatedOnDate.toISOString().split('T')[0]} (year ${pf2eBaseYear})`
    );

    // The fundamental mismatch
    const yearGap = Math.abs(pf2eBaseYear - epochYear);
    console.log(`Fundamental year gap between systems: ${yearGap} years`);

    expect(yearGap).toBeGreaterThan(1000); // Confirms the mismatch

    console.log('\nROOT CAUSE: Different worldTime interpretations');
    console.log('- S&S: worldTime=0 → epoch-based calendar calculation');
    console.log('- PF2e: worldTime=0 → real-world creation date + 0 seconds');
  });

  it('shows the fix approach: S&S should align with PF2e worldTime interpretation', () => {
    const { worldCreatedOn } = mockPF2eGame();

    console.log('\n=== Fix Approach ===');

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

    console.log(
      `S&S with PF2e interpretation: ${pf2eCompatibleDate.year}/${pf2eCompatibleDate.month}/${pf2eCompatibleDate.day}`
    );
    console.log(`PF2e native calculation: ${pf2eYear}/${pf2eMonth}/${pf2eDay}`);

    // With the fix, dates should match
    expect(pf2eCompatibleDate.year).toBe(pf2eYear);
    expect(pf2eCompatibleDate.month).toBe(pf2eMonth);
    expect(pf2eCompatibleDate.day).toBe(pf2eDay);

    console.log('\nFIX CONFIRMED: S&S aligns with PF2e when using worldCreationTimestamp');
  });
});
