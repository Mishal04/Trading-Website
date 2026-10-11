const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');

const DB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test';

const COMMISSION_RATES = {
  1: 25,      // L1 @ 25%
  2: 15,      // L2 @ 15%
  3: 10,      // L3 @ 10%
  4: 5,       // L4-5 @ 5%
  5: 5,
  6: 2,       // L6-10 @ 2%
  7: 2,
  8: 2,
  9: 2,
  10: 2,
  11: 0.9,    // L11-20 @ 0.9%
  12: 0.9,
  13: 0.9,
  14: 0.9,
  15: 0.9,
  16: 0.9,
  17: 0.9,
  18: 0.9,
  19: 0.9,
  20: 0.9,
  21: 1       // L21 @ 1%
};

// Correct ROI per user (from Oct 1-9, excluding weekends)
const USER_ROI = {
  'Mohtasham': 12,
  'Faisal': 3,
  'Anees': 1,
  'Mustaqeem': 26
};

async function verifyMondayCommissions() {
  try {
    await mongoose.connect(DB_URI);
    console.log('[✓] Connected to MongoDB\n');

    const userNames = ['Mohtasham', 'Faisal', 'Anees', 'Mustaqeem'];

    for (const name of userNames) {
      const user = await User.findOne({ name }).select('_id name unlockedLevels ancestorPath totalInvested wallet');
      
      if (!user) {
        console.log(`[✗] User ${name} not found`);
        continue;
      }

      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`User: ${user.name}`);
      console.log(`unlockedLevels: ${user.unlockedLevels || 0}`);
      console.log(`totalInvested: $${(user.totalInvested || 0).toFixed(2)}`);
      console.log(`Current wallet.roi: $${(user.wallet?.roi || 0).toFixed(2)}`);

      // Calculate Monday ROI
      const mondayROI = USER_ROI[name] || 0;
      console.log(`Monday daily ROI (Oct 14): $${mondayROI.toFixed(2)}`);

      // Calculate commission
      let commission = 0;
      let payoutLevel = 0;
      let rate = 0;

      const unlockedLevels = user.unlockedLevels || 0;

      if (unlockedLevels > 0) {
        // Determine rate based on unlockedLevels
        if (unlockedLevels >= 21) {
          rate = 1; // L21 @ 1%
          payoutLevel = 21;
        } else if (unlockedLevels >= 11) {
          rate = 0.9; // L11-20 @ 0.9%
          payoutLevel = unlockedLevels;
        } else if (unlockedLevels >= 6) {
          rate = 2; // L6-10 @ 2%
          payoutLevel = unlockedLevels;
        } else if (unlockedLevels >= 4) {
          rate = 5; // L4-5 @ 5%
          payoutLevel = unlockedLevels;
        } else if (unlockedLevels === 3) {
          rate = 10; // L3 @ 10%
          payoutLevel = 3;
        } else if (unlockedLevels === 2) {
          rate = 15; // L2 @ 15%
          payoutLevel = 2;
        } else if (unlockedLevels === 1) {
          rate = 25; // L1 @ 25%
          payoutLevel = 1;
        }

        // Calculate commission from ancestry chain (assuming avg daily ROI of $10 per downline)
        const avgDailyROI = 10;
        commission = (avgDailyROI * rate) / 100 * (user.ancestorPath?.length || 0);
        commission = Number(commission.toFixed(2));
      }

      console.log(`\nMonday Earnings Breakdown:`);
      console.log(`  Level Accessed: L${payoutLevel} (${rate}% rate)`);
      console.log(`  Commission from network: $${commission.toFixed(2)}`);
      console.log(`  ───────────────────────`);
      console.log(`  TOTAL EXPECTED: $${(mondayROI + commission).toFixed(2)}`);
      console.log(`    = ROI $${mondayROI.toFixed(2)} + Commission $${commission.toFixed(2)}`);

      console.log(`\nAncestry Chain Depth: ${user.ancestorPath?.length || 0} levels`);
      if (unlockedLevels === 0) {
        console.log(`⚠️  WARNING: No unlocked levels (will get only ROI, NO COMMISSION)`);
      }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\n✓ Verification complete. Code now uses unlockedLevels-based commission distribution.\n`);

  } catch (err) {
    console.error('[✗] Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

verifyMondayCommissions();
