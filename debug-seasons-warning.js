/**
 * Debug script to test seasons warning functionality
 * Copy and paste this into the Foundry console to test warnings manually
 */

console.log('=== Seasons & Stars Warning Debug ===');

// Check if S&S is loaded
if (!game.seasonsStars) {
  console.error('Seasons & Stars is not loaded!');
} else {
  console.log('✓ Seasons & Stars is loaded');

  // Check if API is available
  if (!game.seasonsStars.api) {
    console.error('S&S API is not available!');
  } else {
    console.log('✓ S&S API is available');

    // Check if getSeasonInfo exists
    if (!game.seasonsStars.api.getSeasonInfo) {
      console.error('getSeasonInfo method is not available!');
    } else {
      console.log('✓ getSeasonInfo method is available');

      // Check current calendar
      const calendar = game.seasonsStars.manager?.getActiveCalendar();
      console.log('Current calendar:', calendar?.id, calendar?.name);

      if (calendar) {
        console.log('Calendar has seasons:', calendar.seasons ? 'Yes' : 'No');
        if (calendar.seasons) {
          console.log('Number of seasons:', calendar.seasons.length);
          console.log(
            'Seasons:',
            calendar.seasons.map(s => s.name)
          );
        }

        // Test getSeasonInfo with current date
        const currentDate = game.seasonsStars.manager?.getCurrentDate();
        console.log('Current date:', currentDate);

        if (currentDate) {
          console.log('\n=== Testing getSeasonInfo ===');

          // Check current warning state
          console.log(
            'Current warning state:',
            game.seasonsStars.getSeasonsWarningState
              ? game.seasonsStars.getSeasonsWarningState()
              : 'Function not available'
          );

          try {
            const seasonInfo = game.seasonsStars.api.getSeasonInfo(currentDate);
            console.log('Season info result:', seasonInfo);

            // Check warning state after call
            console.log(
              'Warning state after call:',
              game.seasonsStars.getSeasonsWarningState
                ? game.seasonsStars.getSeasonsWarningState()
                : 'Function not available'
            );
          } catch (error) {
            console.error('Error calling getSeasonInfo:', error);
          }
        }
      }
    }
  }
}

// Check debug mode settings
const debugMode = game.settings.get('seasons-and-stars', 'debugMode');
console.log('Debug mode enabled:', debugMode);

const showNotifications = game.settings.get('seasons-and-stars', 'showNotifications');
console.log('Show notifications enabled:', showNotifications);

// Check if exposed functions are available
console.log('\n=== Exposed Warning Functions ===');
console.log(
  'resetSeasonsWarningState available:',
  typeof game.seasonsStars?.resetSeasonsWarningState
);
console.log('getSeasonsWarningState available:', typeof game.seasonsStars?.getSeasonsWarningState);
console.log('setSeasonsWarningState available:', typeof game.seasonsStars?.setSeasonsWarningState);
