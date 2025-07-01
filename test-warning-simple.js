/**
 * Simple test script to trigger the seasons warning
 * Copy this into the Foundry console to test the warning functionality
 */

console.log('=== Testing Seasons Warning ===');

// First, ensure we have a calendar loaded without seasons
// Let's try to find one of the calendars that doesn't have seasons
const calendarsWithoutSeasons = ['traveller-imperial', 'eberron', 'starfinder-absalom-station'];

async function testWarning() {
  if (!game.seasonsStars?.manager) {
    console.error('S&S not loaded');
    return;
  }

  const manager = game.seasonsStars.manager;

  // Find a calendar without seasons
  let testCalendar = null;
  for (const calId of calendarsWithoutSeasons) {
    const cal = manager.getCalendar(calId);
    if (cal) {
      console.log(`Found calendar ${calId}:`, cal);
      if (!cal.seasons || cal.seasons.length === 0) {
        console.log(`✓ Calendar ${calId} has no seasons - perfect for testing`);
        testCalendar = calId;
        break;
      } else {
        console.log(`✗ Calendar ${calId} has ${cal.seasons.length} seasons`);
      }
    }
  }

  if (!testCalendar) {
    console.log("No calendar without seasons found. Let's check current calendar.");
    const current = manager.getActiveCalendar();
    if (current && (!current.seasons || current.seasons.length === 0)) {
      testCalendar = current.id;
      console.log(`✓ Current calendar ${current.id} has no seasons`);
    } else {
      console.log(`Current calendar has ${current?.seasons?.length || 0} seasons`);
      console.log("Let's test with current calendar anyway...");
      testCalendar = current?.id;
    }
  }

  if (!testCalendar) {
    console.error('Could not find a test calendar');
    return;
  }

  // Switch to the test calendar
  console.log(`\n=== Switching to calendar: ${testCalendar} ===`);
  await manager.setActiveCalendar(testCalendar);

  // Check warning state
  console.log('Warning state after calendar switch:', game.seasonsStars.getSeasonsWarningState());

  // Test getSeasonInfo to trigger warning
  const currentDate = manager.getCurrentDate();
  console.log('Current date:', currentDate);

  if (currentDate && game.seasonsStars.api.getSeasonInfo) {
    console.log('\n=== Calling getSeasonInfo (should trigger warning) ===');
    try {
      const result = game.seasonsStars.api.getSeasonInfo(currentDate);
      console.log('getSeasonInfo result:', result);
      console.log('Warning state after getSeasonInfo:', game.seasonsStars.getSeasonsWarningState());

      // Call again - should NOT warn again
      console.log('\n=== Calling getSeasonInfo again (should NOT warn) ===');
      const result2 = game.seasonsStars.api.getSeasonInfo(currentDate);
      console.log('getSeasonInfo result 2:', result2);
      console.log('Warning state after second call:', game.seasonsStars.getSeasonsWarningState());
    } catch (error) {
      console.error('Error calling getSeasonInfo:', error);
    }
  }
}

// Run the test
testWarning().catch(console.error);
