/**
 * Check if the functions are available as direct imports
 */

console.log('=== Module Exports Debug ===');

// Check if they're available on window.SeasonsStars
console.log('window.SeasonsStars exists:', !!window.SeasonsStars);
if (window.SeasonsStars) {
  console.log('window.SeasonsStars keys:', Object.keys(window.SeasonsStars));
}

// Try to access the functions directly by importing the module
console.log('\nTrying to find the functions in the global scope...');

// Since they're exported functions, they might be available somewhere
// Let's check if they exist in the built module
console.log('Looking for resetSeasonsWarningState in global scope...');
if (typeof resetSeasonsWarningState !== 'undefined') {
  console.log('✓ resetSeasonsWarningState found in global scope');
} else {
  console.log('✗ resetSeasonsWarningState not in global scope');
}

// Check if we can manually add them to game.seasonsStars
console.log('\nAttempting manual function access...');

// The functions should be in the module scope, let's see if we can access the module state
// This is a bit hacky but will help us understand what's happening
console.log('Current module state investigation needed...');
console.log('We need to check the actual module compilation.');
