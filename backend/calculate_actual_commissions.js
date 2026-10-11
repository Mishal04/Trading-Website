const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');

const DB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test';

// Monday Oct 14 expected daily ROI (per user, Oct 1-9 calculations)
const USER_ROI = {
  'Mohtasham': 12,
  'Faisal': 3,
  'Anees': 1,
  'Mustaqeem': 26
};

async function calculateActualCommissions() {
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
      console.log(`Current wallet.commission: $${(user.wallet?.commission || 0).toFixed(2)}`);

      // Monday daily ROI (fixed)
      const mondayROI = USER_ROI[name] || 0;
      console.log(`\nMonday daily ROI (Oct 14): $${mondayROI.toFixed(2)}`);

      // Get actual downline investments to calculate real commission
      const downline = await User.find({ ancestorPath: user._id }).select('_id name totalInvested');
      console.log(`Downline count: ${downline.length} users`);

      // Calculate commission based on downline ROI
      let totalCommission = 0;
      const unlockedLevels = user.unlockedLevels || 0;

      if (unlockedLevels > 0 && downline.length > 0) {
        let rate = 0;
        let payoutLevel = 0;

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

        console.log(`\nCommission Structure:`);
        console.log(`  Level: L${payoutLevel} (${rate}% rate)`);
        console.log(`  Based on unlockedLevels field`);

        // Calculate: For each downline, their daily ROI * commission rate
        for (const downlineUser of downline) {
          // Get their daily ROI (use wallet.roi / days as proxy)
          const dailyROI = (downlineUser.totalInvested || 0) * 0.01; // Approx 1% daily
          const downlineCommission = (dailyROI * rate) / 100;
          totalCommission += downlineCommission;
        }

        totalCommission = Number(totalCommission.toFixed(2));
      }

      console.log(`\n Monday Earnings Breakdown:`);
      console.log(`  Daily ROI: $${mondayROI.toFixed(2)}`);
      console.log(`  Commission from ${downline.length} downline users: $${totalCommission.toFixed(2)}`);
      console.log(`  ───────────────────────`);
      console.log(`  TOTAL EXPECTED: $${(mondayROI + totalCommission).toFixed(2)}`);

      if (unlockedLevels === 0) {
        console.log(`\n  ⚠️  WARNING: No unlocked levels → NO COMMISSION will be paid`);
      }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\n✓ Verification complete.\n`);

  } catch (err) {
    console.error('[✗] Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

calculateActualCommissions();
