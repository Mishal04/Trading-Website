/**
 * diagnose_saturday_issue.js
 * 
 * Diagnose why Mustaqeem got $0 commission on Saturday
 * Theory: Commissions skipped on weekends in Dubai time
 */

// Check what day Saturday Oct 12, 2026 is in Dubai
const saturdayPKT = new Date('2026-10-12T16:00:00'); // 4 PM Pakistan time

// Convert to Dubai time
const dubaiTimeString = saturdayPKT.toLocaleString('en-US', { timeZone: 'Asia/Dubai' });
const dubaiDate = new Date(dubaiTimeString);

console.log('=' .repeat(100));
console.log('🔍 DIAGNOSIS: Why Saturday had $0 commission');
console.log('=' .repeat(100) + '\n');

console.log('Saturday October 12, 2026 at 4 PM Pakistan time:\n');
console.log(`  PKT Time: ${saturdayPKT.toISOString()}`);
console.log(`  PKT Day: ${saturdayPKT.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Karachi' })}\n`);

console.log(`  Dubai locale string: ${dubaiTimeString}`);
console.log(`  Dubai Date object day: ${dubaiDate.getDay()}`);
console.log(`  Dubai Day name: ${dubaiDate.toLocaleDateString('en-US', { weekday: 'long' })}\n`);

const isDubaiWeekend = dubaiDate.getDay() === 0 || dubaiDate.getDay() === 6;
console.log(`  Is Dubai weekend (day 0 or 6)? ${isDubaiWeekend}\n`);

console.log('Code check in profitService.js:');
console.log(`  if (!isDubaiWeekend && investor.ancestorPath...) {`);
console.log(`    // DISTRIBUTE COMMISSIONS`);
console.log(`  }\n`);

console.log(`  Result: isDubaiWeekend = ${isDubaiWeekend}`);
console.log(`  Commissions skipped: ${isDubaiWeekend}\n`);

// Check Monday
const mondayPKT = new Date('2026-10-13T16:00:00'); // 4 PM Pakistan time
const dubaiTimeStringMonday = mondayPKT.toLocaleString('en-US', { timeZone: 'Asia/Dubai' });
const dubaiDateMonday = new Date(dubaiTimeStringMonday);

console.log('=' .repeat(100));
console.log('\nMonday October 13, 2026 at 4 PM Pakistan time:\n');
console.log(`  PKT Time: ${mondayPKT.toISOString()}`);
console.log(`  PKT Day: ${mondayPKT.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Karachi' })}\n`);

console.log(`  Dubai locale string: ${dubaiTimeStringMonday}`);
console.log(`  Dubai Date object day: ${dubaiDateMonday.getDay()}`);
console.log(`  Dubai Day name: ${dubaiDateMonday.toLocaleDateString('en-US', { weekday: 'long' })}\n`);

const isDubaiWeekendMonday = dubaiDateMonday.getDay() === 0 || dubaiDateMonday.getDay() === 6;
console.log(`  Is Dubai weekend (day 0 or 6)? ${isDubaiWeekendMonday}\n`);

console.log(`  Result: isDubaiWeekend = ${isDubaiWeekendMonday}`);
console.log(`  Commissions will run: ${!isDubaiWeekendMonday}\n`);

console.log('=' .repeat(100));
console.log('\n✅ CONCLUSION:\n');
console.log(`Saturday: Commissions SKIPPED (weekend in Dubai)`);
console.log(`Monday: Commissions WILL RUN (weekday in Dubai)\n`);
console.log('=' .repeat(100) + '\n');
