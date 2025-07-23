/**
 * Utility to load calendar files from various packages for testing
 */
import * as fs from 'fs';
import * as path from 'path';
import type { SeasonsStarsCalendar } from '../../src/types/calendar';

/**
 * Load a calendar file by name, checking multiple package locations
 */
export function loadTestCalendar(fileName: string): SeasonsStarsCalendar {
  // Check if the calendar is in the core package first
  const coreCalendarPath = path.join('packages/core/calendars', fileName);
  if (fs.existsSync(coreCalendarPath)) {
    const calendarData = JSON.parse(fs.readFileSync(coreCalendarPath, 'utf8'));
    return calendarData;
  }

  // Try test fixtures (symlinks to external packages)
  const fixturesPath = path.join(__dirname, '..', 'fixtures', 'calendars', fileName);
  if (fs.existsSync(fixturesPath)) {
    const calendarData = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));
    return calendarData;
  }

  // Try the fantasy pack
  const fantasyPackCalendarPath = path.join('packages/fantasy-pack/calendars', fileName);
  if (fs.existsSync(fantasyPackCalendarPath)) {
    const calendarData = JSON.parse(fs.readFileSync(fantasyPackCalendarPath, 'utf8'));
    return calendarData;
  }

  // Try the pf2e pack
  const pf2ePackCalendarPath = path.join('packages/pf2e-pack/calendars', fileName);
  if (fs.existsSync(pf2ePackCalendarPath)) {
    const calendarData = JSON.parse(fs.readFileSync(pf2ePackCalendarPath, 'utf8'));
    return calendarData;
  }

  // Try the scifi pack
  const scifiPackCalendarPath = path.join('packages/scifi-pack/calendars', fileName);
  if (fs.existsSync(scifiPackCalendarPath)) {
    const calendarData = JSON.parse(fs.readFileSync(scifiPackCalendarPath, 'utf8'));
    return calendarData;
  }

  // Try the test-module pack
  const testModuleCalendarPath = path.join('packages/test-module/calendars', fileName);
  if (fs.existsSync(testModuleCalendarPath)) {
    const calendarData = JSON.parse(fs.readFileSync(testModuleCalendarPath, 'utf8'));
    return calendarData;
  }

  throw new Error(`Calendar file not found: ${fileName}`);
}

/**
 * Get the absolute path to a calendar file (for tests that need the path directly)
 */
export function getTestCalendarPath(fileName: string): string {
  // Check if the calendar is in the core package first
  const coreCalendarPath = path.join('packages/core/calendars', fileName);
  if (fs.existsSync(coreCalendarPath)) {
    return path.resolve(coreCalendarPath);
  }

  // Try test fixtures (symlinks to external packages)
  const fixturesPath = path.join(__dirname, '..', 'fixtures', 'calendars', fileName);
  if (fs.existsSync(fixturesPath)) {
    return path.resolve(fixturesPath);
  }

  // Try the fantasy pack
  const fantasyPackCalendarPath = path.join('packages/fantasy-pack/calendars', fileName);
  if (fs.existsSync(fantasyPackCalendarPath)) {
    return path.resolve(fantasyPackCalendarPath);
  }

  // Try the pf2e pack
  const pf2ePackCalendarPath = path.join('packages/pf2e-pack/calendars', fileName);
  if (fs.existsSync(pf2ePackCalendarPath)) {
    return path.resolve(pf2ePackCalendarPath);
  }

  // Try the scifi pack
  const scifiPackCalendarPath = path.join('packages/scifi-pack/calendars', fileName);
  if (fs.existsSync(scifiPackCalendarPath)) {
    return path.resolve(scifiPackCalendarPath);
  }

  // Try the test-module pack
  const testModuleCalendarPath = path.join('packages/test-module/calendars', fileName);
  if (fs.existsSync(testModuleCalendarPath)) {
    return path.resolve(testModuleCalendarPath);
  }

  throw new Error(`Calendar file not found: ${fileName}`);
}
