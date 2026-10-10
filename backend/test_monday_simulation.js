/**
 * test_monday_simulation.js
 * 
 * Simulate Monday by temporarily patching Date to return Monday
 * Then run the cron to verify commissions work
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const User = require('./src/models/User');
const CronLock = require('./src/models/CronLock');
const profitService = require('./src/services/profitService');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('\n' + '=' .repeat(100));
    console.log('🧪 SIMULATION: Monday Cron (Simulating Monday Oct 13)');
    console.log('=' .repeat(100) + '\n');

    // Clear lock
    await CronLock.deleteMany({});

    // Get Mustaqeem BEFORE
    const mustaqeemBefore = await User.findOne({ name: 'Mustaqeem' });
    const beforeTotal = (mustaqeemBefore.wallet?.profit || 0) + 
                        (mustaqeemBefore.wallet?.commission || 0) + 
                        (mustaqeemBefore.wallet?.roi || 0);

    console.log('BEFORE Simulation:\n');
    console.log(`Mustaqeem Total: $${beforeTotal.toFixed(2)}`);
    console.log(`  Profit: $${(mustaqeemBefore.wallet?.profit || 0).toFixed(2)}`);
    console.log(`  Commission: $${(mustaqeemBefore.wallet?.commission || 0).toFixed(2)}`);
    console.log(`  ROI: $${(mustaqeemBefore.wallet?.roi || 0).toFixed(2)}\n`);

    // Monkey-patch Date.prototype to simulate Monday Oct 13, 2026 at 4 PM
    console.log('Simulating Monday Oct 13, 2026...\n');
    
    const OriginalDate = global.Date;
    const MondayDate = new OriginalDate('2026-10-13T16:00:00+05:00'); // 4 PM Pakistan time

    global.Date = class extends OriginalDate {
      constructor(...args) {
        if (args.length === 0) {
          // Simulate current time as Monday
          super(MondayDate.getTime());
        } else {
          super(...args);
        }
      }

      static now() {
        return MondayDate.getTime();
      }
    };

    // Copy static methods
    Object.setPrototypeOf(global.Date, OriginalDate);
    for (const key in OriginalDate) {
      if (key !== 'prototype') {
        global.Date[key] = OriginalDate[key];
      }
    }

    // Verify date patch
    const testDate = new Date();
    const dubaiTime = new Date(testDate.toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
    console.log(`Simulated Dubai time day: ${dubaiTime.getDay()} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dubaiTime.getDay()]})`);
    console.log(`Is weekend in Dubai? ${dubaiTime.getDay() === 0 || dubaiTime.getDay() === 6}\n`);

    // Run cron
    console.log('Running calculateDailyProfits()...\n');
    const result = await profitService.calculateDailyProfits();

    console.log(`Processed: ${result.processedCount} investments`);
    console.log(`ROI distributed: $${result.totalProfitDistributed.toFixed(2)}\n`);

    // Restore Date
    global.Date = OriginalDate;

    // Check AFTER
    const mustaqeemAfter = await User.findOne({ name: 'Mustaqeem' });
    const afterTotal = (mustaqeemAfter.wallet?.profit || 0) + 
                       (mustaqeemAfter.wallet?.commission || 0) + 
                       (mustaqeemAfter.wallet?.roi || 0);

    const earned = afterTotal - beforeTotal;

    console.log('AFTER Simulation:\n');
    console.log(`Mustaqeem Total: $${afterTotal.toFixed(2)}`);
    console.log(`  Profit: $${(mustaqeemAfter.wallet?.profit || 0).toFixed(2)}`);
    console.log(`  Commission: $${(mustaqeemAfter.wallet?.commission || 0).toFixed(2)}`);
    console.log(`  ROI: $${(mustaqeemAfter.wallet?.roi || 0).toFixed(2)}`);
    console.log(`\n💰 Earned: $${earned.toFixed(2)}\n`);

    console.log('=' .repeat(100));
    console.log('\n✅ VERIFICATION\n');

    if (earned >= 20.65 && earned <= 20.75) {
      console.log(`✅✅✅ SUCCESS! Mustaqeem earned $${earned.toFixed(2)} (expected $20.70) ✅✅✅`);
      console.log(`\nThis confirms that on MONDAY 4 PM, Mustaqeem WILL receive $20.70 in commissions!\n`);
    } else if (earned > 0) {
      console.log(`⚠️  Mustaqeem earned $${earned.toFixed(2)} (expected $20.70)`);
      const breakdown = earned - 23; // 23 is the ROI that should go to others
      console.log(`  Commission portion: $${breakdown.toFixed(2)}\n`);
    } else {
      console.log(`❌ Mustaqeem earned $0 - commissions still not working\n`);
    }

    console.log('=' .repeat(100) + '\n');

    await mongoose.disconnect();
    process.exit(0);

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
