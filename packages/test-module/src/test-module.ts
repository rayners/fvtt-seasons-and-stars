/**
 * Test Seasons & Stars - Main Module Entry Point
 * Testing, diagnostic, and development tools for Seasons & Stars
 */

import './quench-tests';

// Test calendar loading functions
const TEST_CALENDAR_PATH = 'modules/test-seasons-and-stars/calendars';

async function loadTestCalendar(name) {
  const response = await fetch(`${TEST_CALENDAR_PATH}/${name}.json`);
  if (!response.ok) {
    throw new Error(`Test calendar '${name}' not found`);
  }
  return await response.json();
}

async function loadDiagnosticCalendar() {
  return loadTestCalendar('diagnostic-simple');
}

// Global export for module initialization
globalThis.testSeasonsStars = {
  loadTestCalendar,
  loadDiagnosticCalendar
};