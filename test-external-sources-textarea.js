/**
 * Test script for External Calendar Sources Textarea
 *
 * Copy and paste this into the Foundry console to test the textarea functionality
 */

// Test 1: Basic module availability
console.log('Testing External Calendar Sources...');

// Check if the module is loaded
if (!game.seasonsStars) {
  console.error('❌ Seasons & Stars module not loaded');
} else {
  console.log('✅ Seasons & Stars module loaded');
}

// Test 2: Check if the setting is registered
const setting = game.settings.settings.get('seasons-and-stars.externalCalendarSourcesList');
if (setting) {
  console.log('✅ externalCalendarSourcesList setting is registered:', setting);
} else {
  console.error('❌ externalCalendarSourcesList setting not found');
}

// Test 3: Try adding some example sources
try {
  const exampleSources = `# Example external calendar sources
https://raw.githubusercontent.com/example/calendars/main/fantasy.json
github:username/calendar-repo/calendars/homebrew.json
module:community-calendars/calendars/greyhawk.json
local:data/calendars/my-calendar.json`;

  console.log('Setting example external sources...');
  game.settings.set('seasons-and-stars', 'externalCalendarSourcesList', exampleSources);
  console.log('✅ Example sources set successfully');
} catch (error) {
  console.error('❌ Failed to set example sources:', error);
}

// Test 4: Check current external sources
setTimeout(() => {
  try {
    const currentSources = game.settings.get('seasons-and-stars', 'externalCalendarSources');
    console.log('Current parsed external sources:', currentSources);

    const textareaContent = game.settings.get('seasons-and-stars', 'externalCalendarSourcesList');
    console.log('Current textarea content:', textareaContent);
  } catch (error) {
    console.error('❌ Failed to get current sources:', error);
  }
}, 1000);

console.log(`
📋 How to use External Calendar Sources:

**Method 1: Module Settings UI**
1. Go to Game Settings → Configure Settings
2. Find "Seasons & Stars" in the module list
3. Look for "External Calendar Sources" textarea
4. Paste your sources (one per line) using these formats:

**Supported Formats:**
- HTTPS URLs: https://example.com/calendar.json
- GitHub: github:username/repo/path/calendar.json
- Module: module:module-name/calendars/calendar.json
- Local: local:data/calendars/calendar.json

**Method 2: Console Command**
game.settings.set('seasons-and-stars', 'externalCalendarSourcesList', 'your\\nsources\\nhere');

**Features:**
- One source per line
- Comments supported (lines starting with # or //)
- Automatic parsing into internal format
- Changes require world reload to take effect
- Copy/paste friendly for sharing configurations
`);
