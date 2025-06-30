// Debug the date parsing issue
console.log('=== DATE PARSING DEBUG ===');

const timestamp1 = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;
const timestamp2 = new Date('2025-01-01').getTime() / 1000;

console.log('Method 1 - ISO with Z:');
console.log("  String: '2025-01-01T00:00:00.000Z'");
console.log('  Timestamp:', timestamp1);
console.log('  Date back:', new Date(timestamp1 * 1000).toISOString());
console.log('  Year:', new Date(timestamp1 * 1000).getFullYear());

console.log('\nMethod 2 - Date only:');
console.log("  String: '2025-01-01'");
console.log('  Timestamp:', timestamp2);
console.log('  Date back:', new Date(timestamp2 * 1000).toISOString());
console.log('  Year:', new Date(timestamp2 * 1000).getFullYear());

console.log('\nDirect timestamp test:');
const testTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;
console.log('Timestamp:', testTimestamp);
console.log('UTC Date:', new Date(testTimestamp * 1000).toISOString());
console.log('UTC Year:', new Date(testTimestamp * 1000).getUTCFullYear());
console.log('Local Year:', new Date(testTimestamp * 1000).getFullYear());

// Manual timestamp for Jan 1, 2025 00:00:00 UTC
const jan1_2025_utc = Date.UTC(2025, 0, 1, 0, 0, 0) / 1000;
console.log('\nManual UTC timestamp for Jan 1, 2025:');
console.log('Timestamp:', jan1_2025_utc);
console.log('UTC Date:', new Date(jan1_2025_utc * 1000).toISOString());
console.log('UTC Year:', new Date(jan1_2025_utc * 1000).getUTCFullYear());
