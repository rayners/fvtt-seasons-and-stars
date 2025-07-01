/**
 * Debug script to check if the warning state functions are properly exposed
 */

console.log('=== Function Exposure Debug ===');

console.log('game.seasonsStars exists:', !!game.seasonsStars);
console.log('game.seasonsStars keys:', Object.keys(game.seasonsStars || {}));

console.log('\nChecking warning state functions:');
console.log('resetSeasonsWarningState:', typeof game.seasonsStars?.resetSeasonsWarningState);
console.log('getSeasonsWarningState:', typeof game.seasonsStars?.getSeasonsWarningState);
console.log('setSeasonsWarningState:', typeof game.seasonsStars?.setSeasonsWarningState);

// Test calling them directly
console.log('\nTesting function calls:');
try {
  if (game.seasonsStars?.getSeasonsWarningState) {
    console.log('getSeasonsWarningState():', game.seasonsStars.getSeasonsWarningState());
  } else {
    console.log('getSeasonsWarningState function not available');
  }

  if (game.seasonsStars?.setSeasonsWarningState) {
    console.log('Setting warning state to true...');
    game.seasonsStars.setSeasonsWarningState(true);
    console.log(
      'getSeasonsWarningState() after setting:',
      game.seasonsStars.getSeasonsWarningState()
    );
  } else {
    console.log('setSeasonsWarningState function not available');
  }

  if (game.seasonsStars?.resetSeasonsWarningState) {
    console.log('Resetting warning state...');
    game.seasonsStars.resetSeasonsWarningState();
    console.log(
      'getSeasonsWarningState() after reset:',
      game.seasonsStars.getSeasonsWarningState()
    );
  } else {
    console.log('resetSeasonsWarningState function not available');
  }
} catch (error) {
  console.error('Error testing functions:', error);
}

// Now test getSeasonInfo again to see if it respects the warning state
console.log('\n=== Testing getSeasonInfo with manual state control ===');
if (game.seasonsStars?.setSeasonsWarningState && game.seasonsStars?.getSeasonsWarningState) {
  console.log('Setting warning state to false manually...');
  game.seasonsStars.setSeasonsWarningState(false);
  console.log('Warning state:', game.seasonsStars.getSeasonsWarningState());

  console.log('Calling getSeasonInfo (should warn)...');
  const result1 = game.seasonsStars.api.getSeasonInfo(game.seasonsStars.manager.getCurrentDate());
  console.log('Warning state after 1st call:', game.seasonsStars.getSeasonsWarningState());

  console.log('Calling getSeasonInfo again (should NOT warn)...');
  const result2 = game.seasonsStars.api.getSeasonInfo(game.seasonsStars.manager.getCurrentDate());
  console.log('Warning state after 2nd call:', game.seasonsStars.getSeasonsWarningState());
}
