/**
 * Quick debug script to check S&S settings and enable debug mode
 * Run this in Foundry console to see current settings and enable debugging
 */

console.log('=== Seasons & Stars Debug Settings ===');

if (!game.seasonsStars) {
  console.error('❌ Seasons & Stars not loaded!');
} else {
  console.log('✅ Seasons & Stars loaded');

  // Check current settings
  const debugMode = game.settings.get('seasons-and-stars', 'debugMode');
  const showNotifications = game.settings.get('seasons-and-stars', 'showNotifications');
  const activeCalendar = game.settings.get('seasons-and-stars', 'activeCalendar');

  console.log('Current Settings:');
  console.log('- Debug Mode:', debugMode);
  console.log('- Show Notifications:', showNotifications);
  console.log('- Active Calendar:', activeCalendar);

  // Check if current calendar has seasons
  const calendar = game.seasonsStars.manager?.getActiveCalendar();
  if (calendar) {
    console.log('Active Calendar Info:');
    console.log('- Name:', calendar.name);
    console.log('- ID:', calendar.id);
    console.log('- Has Seasons:', calendar.seasons ? 'Yes' : 'No');
    if (calendar.seasons) {
      console.log('- Season Count:', calendar.seasons.length);
      console.log('- Seasons:', calendar.seasons.map(s => s.name).join(', '));
    }
  } else {
    console.log('❌ No active calendar');
  }

  // Check warning state
  if (game.seasonsStars.getSeasonsWarningState) {
    console.log('Warning State:', game.seasonsStars.getSeasonsWarningState());
  }

  console.log('\n=== Enable Debug Mode ===');
  console.log('To see the missing seasons warnings, run:');
  console.log("game.settings.set('seasons-and-stars', 'debugMode', true)");

  console.log('\n=== Test Warning ===');
  console.log('To test the warning, run:');
  console.log('game.seasonsStars.api.getSeasonInfo(game.seasonsStars.manager.getCurrentDate())');
}
