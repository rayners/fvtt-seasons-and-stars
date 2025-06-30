// Debug large time value calculation
console.log('=== DEBUGGING LARGE TIME VALUE ===');

// From the test: 100 years in seconds
const largeWorldTime = 365 * 24 * 60 * 60 * 100; // 100 years in seconds
console.log('Large WorldTime (100 years in seconds):', largeWorldTime);

// Convert to days
const secondsPerDay = 24 * 60 * 60; // 86400
const totalDays = Math.floor(largeWorldTime / secondsPerDay);
console.log('Total Days:', totalDays);
console.log('Days per year (365):', 365);
console.log('Years (totalDays / 365):', totalDays / 365);
console.log('Years (integer):', Math.floor(totalDays / 365));

// Expected calculation:
// Start: 4725 (world created 2025 + epoch 2700)
// Add: 100 years
// Result: 4825

console.log('\nExpected calculation:');
console.log('Base year: 4725');
console.log('Years to add: 100');
console.log('Expected result: 4825');
console.log('Actual result from test: 4824');
console.log('Difference: 1 year short');

// The issue might be that we're using 365 days per year
// but the actual calendar year length might be different
console.log('\nCalendar year analysis:');
console.log('Standard year: 365 days');
console.log('Leap year: 366 days');
console.log('Over 100 years, leap years add ~25 extra days');
console.log('This could cause the off-by-1 issue');

// Test with exact 365.25 average
const averageDaysPerYear = 365.25;
const yearsExact = totalDays / averageDaysPerYear;
console.log('Years with leap year average (365.25):', yearsExact);
console.log('Years floored:', Math.floor(yearsExact));
