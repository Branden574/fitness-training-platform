console.log('🧪 Testing Progress API Date Logic');
console.log('=====================================');

// Simulate the database entry (as stored in UTC)
const existingDbEntry = new Date('2025-09-23T12:00:00.000Z');
console.log('\n📅 Existing database entry:');
console.log('  UTC:', existingDbEntry.toISOString());
console.log('  Local:', existingDbEntry.toLocaleDateString());

// Simulate user selecting 9/24/2025
const userSelectedDate = '2025-09-24';
console.log('\n👤 User selects date:', userSelectedDate);

// OLD WAY (causing the conflict)
const oldWayDate = new Date(userSelectedDate);
const oldYear = oldWayDate.getFullYear();
const oldMonth = String(oldWayDate.getMonth() + 1).padStart(2, '0');
const oldDay = String(oldWayDate.getDate()).padStart(2, '0');
const oldLocalDateString = `${oldYear}-${oldMonth}-${oldDay}`;
const oldNormalizedDate = new Date(oldLocalDateString + 'T12:00:00.000Z');

console.log('\n❌ OLD WAY (buggy):');
console.log('  Parsed date:', oldWayDate);
console.log('  Local string:', oldWayDate.toLocaleDateString());
console.log('  Normalized date:', oldNormalizedDate.toISOString());
console.log('  Would match existing?', oldNormalizedDate.toISOString() === existingDbEntry.toISOString());

// NEW WAY (fixed)
const [year, month, day] = userSelectedDate.split('-').map(Number);
const newWayDate = new Date(year, month - 1, day);
const newYear = newWayDate.getFullYear();
const newMonth = String(newWayDate.getMonth() + 1).padStart(2, '0');
const newDay = String(newWayDate.getDate()).padStart(2, '0');
const newLocalDateString = `${newYear}-${newMonth}-${newDay}`;
const newNormalizedDate = new Date(newLocalDateString + 'T12:00:00.000Z');

console.log('\n✅ NEW WAY (fixed):');
console.log('  Parsed date:', newWayDate);
console.log('  Local string:', newWayDate.toLocaleDateString());
console.log('  Normalized date:', newNormalizedDate.toISOString());
console.log('  Would match existing?', newNormalizedDate.toISOString() === existingDbEntry.toISOString());

console.log('\n🎯 COMPARISON:');
console.log('  Old normalized date:', oldNormalizedDate.toISOString());
console.log('  New normalized date:', newNormalizedDate.toISOString());
console.log('  Different dates?', oldNormalizedDate.toISOString() !== newNormalizedDate.toISOString());

console.log('\n✅ Fix should resolve the conflict issue!');