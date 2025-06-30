/**
 * Debug script to understand the exact behavior of calendar engine
 * with world creation timestamps
 */

import { CalendarEngine } from './src/core/calendar-engine.js';

// Test calendar matching PF2e Golarion setup
const golarionCalendar = {
  id: 'golarion-pf2e',
  name: 'Golarion Calendar System',
  months: [
    { name: 'Abadius', days: 31, description: '' },
    { name: 'Calistril', days: 28, description: '' },
    { name: 'Pharast', days: 31, description: '' },
    { name: 'Gozran', days: 30, description: '' },
    { name: 'Desnus', days: 31, description: '' },
    { name: 'Sarenith', days: 30, description: '' },
    { name: 'Erastus', days: 31, description: '' },
    { name: 'Arodus', days: 31, description: '' },
    { name: 'Rova', days: 30, description: '' },
    { name: 'Lamashan', days: 31, description: '' },
    { name: 'Neth', days: 30, description: '' },
    { name: 'Kuthona', days: 31, description: '' },
  ],
  weekdays: [
    { name: 'Moonday', abbreviation: 'Mo' },
    { name: 'Toilday', abbreviation: 'To' },
    { name: 'Wealday', abbreviation: 'We' },
    { name: 'Oathday', abbreviation: 'Oa' },
    { name: 'Fireday', abbreviation: 'Fi' },
    { name: 'Starday', abbreviation: 'St' },
    { name: 'Sunday', abbreviation: 'Su' },
  ],
  year: {
    epoch: 2700,
    suffix: ' AR',
  },
  leapYear: {
    rule: 'custom',
    interval: 4,
    month: 'Calistril',
    extraDays: 1,
  },
  time: {
    hoursInDay: 24,
    minutesInHour: 60,
    secondsInMinute: 60,
  },
  intercalary: [],
};

const engine = new CalendarEngine(golarionCalendar);
const worldCreationTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;

console.log('=== DEBUG: Calendar Engine World Creation Timestamp Behavior ===\n');

// Test 1: Basic behavior
console.log('1. Basic worldTime=0 test:');
const basic = engine.worldTimeToDate(0, worldCreationTimestamp);
console.log(`   worldTime=0 -> Year: ${basic.year}, Month: ${basic.month}, Day: ${basic.day}`);

// Test 2: +31 days advancement
console.log('\n2. +31 days advancement:');
const plus31Days = engine.worldTimeToDate(86400 * 31, worldCreationTimestamp);
console.log(
  `   worldTime=86400*31 -> Year: ${plus31Days.year}, Month: ${plus31Days.month}, Day: ${plus31Days.day}`
);

// Test 3: +365 days advancement
console.log('\n3. +365 days advancement:');
const plus365Days = engine.worldTimeToDate(86400 * 365, worldCreationTimestamp);
console.log(
  `   worldTime=86400*365 -> Year: ${plus365Days.year}, Month: ${plus365Days.month}, Day: ${plus365Days.day}`
);

// Test 4: Multi-year calculation
console.log('\n4. Multi-year calculation:');
const year1Length = engine.getYearLength(4725);
const year2Length = engine.getYearLength(4726);
console.log(`   Year 4725 length: ${year1Length} days`);
console.log(`   Year 4726 length: ${year2Length} days`);
const twoYearsInSeconds = (year1Length + year2Length) * 24 * 60 * 60;
const twoYearsResult = engine.worldTimeToDate(twoYearsInSeconds, worldCreationTimestamp);
console.log(
  `   Two years (${twoYearsInSeconds} seconds) -> Year: ${twoYearsResult.year}, Month: ${twoYearsResult.month}, Day: ${twoYearsResult.day}`
);

// Test 5: Round-trip test
console.log('\n5. Round-trip test:');
const originalDate = { year: 4725, month: 6, day: 15, weekday: 0 };
console.log(
  `   Original: Year ${originalDate.year}, Month ${originalDate.month}, Day ${originalDate.day}`
);
const worldTime = engine.dateToWorldTime(originalDate, worldCreationTimestamp);
console.log(`   -> worldTime: ${worldTime}`);
const roundTrip = engine.worldTimeToDate(worldTime, worldCreationTimestamp);
console.log(
  `   -> Round-trip: Year ${roundTrip.year}, Month ${roundTrip.month}, Day ${roundTrip.day}`
);

// Test 6: Invalid timestamp handling
console.log('\n6. Invalid timestamp handling:');
const invalidResults = [NaN, Infinity, -Infinity].map(invalid => {
  const result = engine.worldTimeToDate(0, invalid);
  return `${invalid} -> Year: ${result.year}`;
});
console.log(`   Invalid timestamps: ${invalidResults.join(', ')}`);

console.log('\n=== END DEBUG ===');
