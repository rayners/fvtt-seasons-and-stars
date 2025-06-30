// Calculate what 100 actual calendar years should be in seconds
// accounting for leap years in the Golarion calendar

console.log('=== CALCULATING 100 ACTUAL CALENDAR YEARS ===');

// Golarion calendar uses Gregorian leap year rules (every 4 years, except centuries not divisible by 400)
// Starting from year 4725, let's calculate 100 years of actual calendar days

let totalDays = 0;
let startYear = 4725;
let endYear = startYear + 100;

// Simple leap year function (matches Golarion calendar)
function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function getYearLength(year) {
  return isLeapYear(year) ? 366 : 365;
}

console.log('Calculating from year', startYear, 'to', endYear);

for (let year = startYear; year < endYear; year++) {
  const yearLength = getYearLength(year);
  totalDays += yearLength;
  if (isLeapYear(year)) {
    console.log(`Year ${year}: ${yearLength} days (leap year)`);
  }
}

console.log('\nResults:');
console.log('Total days for 100 calendar years:', totalDays);
console.log('Average days per year:', totalDays / 100);
console.log('Seconds per day:', 24 * 60 * 60);
console.log('Total seconds for 100 calendar years:', totalDays * 24 * 60 * 60);

console.log('\nComparison:');
console.log(
  'Test uses (365 * 100 years):',
  365 * 100,
  'days =',
  365 * 100 * 24 * 60 * 60,
  'seconds'
);
console.log(
  'Actual 100 years should be:',
  totalDays,
  'days =',
  totalDays * 24 * 60 * 60,
  'seconds'
);
console.log('Difference:', totalDays - 365 * 100, 'days');

// Let's also verify what our current test value gives us
const testWorldTime = 365 * 24 * 60 * 60 * 100;
const testDays = testWorldTime / (24 * 60 * 60);
console.log('\nCurrent test verification:');
console.log('Test worldTime represents:', testDays, 'days');
console.log('Which is approximately:', testDays / 365.25, 'years (365.25 average)');

// Calculate exact years with leap year accounting
let remainingDays = testDays;
let yearsCalculated = 0;
let testYear = 4725;

while (remainingDays >= getYearLength(testYear)) {
  remainingDays -= getYearLength(testYear);
  yearsCalculated++;
  testYear++;
}

console.log('Exact calendar calculation for test value:');
console.log('Years calculated:', yearsCalculated);
console.log('Remaining days:', remainingDays);
console.log('Final year:', 4725 + yearsCalculated);
