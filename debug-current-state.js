/**
 * Debug current state to see why warnings aren't appearing
 * Run this in Foundry console with debug mode enabled
 */

console.log('=== Seasons Warning Debug (Debug Mode Enabled) ===');

if (!game.seasonsStars) {
  console.error('❌ S&S not loaded');
} else {
  // Current state
  const manager = game.seasonsStars.manager;
  const calendar = manager?.getActiveCalendar();
  const currentDate = manager?.getCurrentDate();
  const warningState = game.seasonsStars.getSeasonsWarningState?.();

  console.log('Current State:');
  console.log('- Active Calendar:', calendar?.id, calendar?.name);
  console.log('- Current Date:', currentDate);
  console.log('- Warning State:', warningState);
  console.log('- Has Seasons:', calendar?.seasons ? `Yes (${calendar.seasons.length})` : 'No');

  if (calendar?.seasons) {
    console.log(
      '- Season Names:',
      calendar.seasons.map(s => s.name)
    );
  }

  // Test what happens when we call getSeasonInfo directly
  console.log('\n=== Testing getSeasonInfo directly ===');
  if (currentDate && game.seasonsStars.api?.getSeasonInfo) {
    console.log('Calling getSeasonInfo with current date...');
    console.log('Warning state BEFORE:', game.seasonsStars.getSeasonsWarningState?.());

    try {
      const result = game.seasonsStars.api.getSeasonInfo(currentDate);
      console.log('Result:', result);
      console.log('Warning state AFTER:', game.seasonsStars.getSeasonsWarningState?.());

      // Try again to see if it's suppressed
      console.log('\n--- Calling again (should be suppressed if no seasons) ---');
      const result2 = game.seasonsStars.api.getSeasonInfo(currentDate);
      console.log('Result 2:', result2);
      console.log('Warning state AFTER 2nd call:', game.seasonsStars.getSeasonsWarningState?.());
    } catch (error) {
      console.error('Error calling getSeasonInfo:', error);
    }
  }

  // Check if there are any calendars without seasons we can test with
  console.log('\n=== Available Calendars ===');
  const allCalendars = manager?.getAllCalendars() || [];
  allCalendars.forEach(cal => {
    const hasSeasons = cal.seasons && cal.seasons.length > 0;
    console.log(
      `- ${cal.id}: ${cal.name} - Seasons: ${hasSeasons ? `Yes (${cal.seasons.length})` : 'No'}`
    );
  });

  // Find a calendar without seasons for testing
  const calendarWithoutSeasons = allCalendars.find(cal => !cal.seasons || cal.seasons.length === 0);
  if (calendarWithoutSeasons) {
    console.log(`\n✓ Found calendar without seasons: ${calendarWithoutSeasons.id}`);
    console.log('To test warning with this calendar, run:');
    console.log(
      `await game.seasonsStars.manager.setActiveCalendar('${calendarWithoutSeasons.id}')`
    );
    console.log('Then call getSeasonInfo again');
  } else {
    console.log("\n❓ All loaded calendars have seasons - that's why you're not seeing warnings!");
  }
}
