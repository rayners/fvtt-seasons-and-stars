/**
 * Test to check if we need to reload the module to get the latest functions
 */

console.log('=== Module Reload Check ===');

// Check if the functions are available now
console.log('Before any action:');
console.log('resetSeasonsWarningState:', typeof game.seasonsStars?.resetSeasonsWarningState);
console.log('getSeasonsWarningState:', typeof game.seasonsStars?.getSeasonsWarningState);
console.log('setSeasonsWarningState:', typeof game.seasonsStars?.setSeasonsWarningState);

if (!game.seasonsStars?.resetSeasonsWarningState) {
  console.log('\n❌ Functions not available. You need to:');
  console.log(
    "1. Make sure you've copied the latest dist/module.js to your Foundry modules folder"
  );
  console.log('2. Refresh the browser (F5) to reload the module');
  console.log('3. Or restart Foundry');
  console.log(
    '\nThe functions are compiled into the module but not available in your current session.'
  );
} else {
  console.log('\n✅ Functions are available! Testing...');

  // Test the functionality
  console.log('Initial state:', game.seasonsStars.getSeasonsWarningState());

  game.seasonsStars.setSeasonsWarningState(true);
  console.log('After setting true:', game.seasonsStars.getSeasonsWarningState());

  game.seasonsStars.resetSeasonsWarningState();
  console.log('After reset:', game.seasonsStars.getSeasonsWarningState());

  // Now test the actual warning suppression
  console.log('\n=== Testing Warning Suppression ===');
  const currentDate = game.seasonsStars.manager.getCurrentDate();

  console.log('Warning state before getSeasonInfo:', game.seasonsStars.getSeasonsWarningState());
  const result1 = game.seasonsStars.api.getSeasonInfo(currentDate);
  console.log('Warning state after 1st call:', game.seasonsStars.getSeasonsWarningState());

  console.log('Calling getSeasonInfo again (should be suppressed)...');
  const result2 = game.seasonsStars.api.getSeasonInfo(currentDate);
  console.log('Warning state after 2nd call:', game.seasonsStars.getSeasonsWarningState());

  console.log('\n✅ Test complete!');
}
