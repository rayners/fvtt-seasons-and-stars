// Debug script to understand the off-by-1 issue
// Test the calculation logic manually

console.log('=== DEBUGGING YEAR CALCULATION ===');

// Test case: world created on January 1, 2025, worldTime = 0
const worldCreationTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;
const worldCreationDate = new Date(worldCreationTimestamp * 1000);
const worldCreationYear = worldCreationDate.getFullYear();

console.log('World Creation Timestamp:', worldCreationTimestamp);
console.log('World Creation Date:', worldCreationDate.toISOString());
console.log('World Creation Year:', worldCreationYear);

const calendarEpoch = 2700;
const expectedResult = worldCreationYear + calendarEpoch;

console.log('Calendar Epoch:', calendarEpoch);
console.log('Expected Result:', expectedResult, '(', worldCreationYear, '+', calendarEpoch, ')');

// This should be 4725 (2025 + 2700)
console.log('Should be 4725:', expectedResult === 4725);

// Let's also test the issue mentioned in the GitHub issue
console.log('\n=== GITHUB ISSUE ANALYSIS ===');
console.log('GitHub Issue: S&S shows 6749, PF2e shows 4725');
console.log('Difference:', 6749 - 4725, 'years');
console.log('Analysis: If current implementation shows 6749,');
console.log('  and our new implementation shows 4724,');
console.log('  then we improved by', 6749 - 4724, 'years');
console.log('  but still need +1 year to match PF2e');
