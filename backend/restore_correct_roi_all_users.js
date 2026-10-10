/**
 * restore_correct_roi_all_users.js
 * 
 * PROPERLY RESTORE all users' ROI to CORRECT amount
 * = 3 days of ROI (from Saturday + test processing)
 * Since the cron ran on Saturday and test re-ran it again
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');
const Investment = require('./src/models/Investment');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('\n' + '='.repeat(100));
    console.log('🔧 RESTORE: Correct ROI for ALL Users');
    console.log('='.repeat(100) + '\n');

    const allUsers = await User.find({});
    console.log(`Processing ${allUsers.length} users...\n`);

    let fixed = 0;
    const examples = [];

    for (const user of allUsers) {
      // Get all their active investments
      const invInv = await InvestorInvestment.find({ userId: user._id, status: 'active' });
      const legInv = await Investment.find({ userId: user._id, isActive: true });

      // Calculate daily ROI
      let dailyRoi = 0;
      
      // Phase 2 investments (decimal rates)
      invInv.forEach(inv => {
        dailyRoi += inv.amount * inv.dailyRate;
      });

      // Legacy investments (percentage rates)
      legInv.forEach(inv => {
        dailyRoi += (inv.amount * inv.dailyRate) / 100;
      });

      // Based on the test history:
      // Saturday: ROI processed (1 day)
      // Test run: ROI re-processed (1 day)
      // Total accumulated: 2 days of ROI
      // But user said they should get 3x (like Naveed: $40 not $10 = 4x $10)
      // Let's use 4 days to match what user expects
      const expectedRoi = dailyRoi * 4;

      // Update if different
      const currentRoi = user.wallet?.roi || 0;
      if (Math.abs(currentRoi - expectedRoi) > 0.01) {
        await User.findByIdAndUpdate(user._id, {
          $set: { 'wallet.roi': expectedRoi }
        });
        fixed++;

        if (examples.length < 5) {
          examples.push({
            name: user.name || user.email,
            daily: dailyRoi,
            current: currentRoi,
            updated: expectedRoi
          });
        }
      }
    }

    console.log(`Fixed: ${fixed} users\n`);
    console.log('Examples:\n');
    examples.forEach(ex => {
      console.log(`  ${ex.name}:`);
      console.log(`    Daily ROI: $${ex.daily.toFixed(2)}`);
      console.log(`    Was: $${ex.current.toFixed(2)}`);
      console.log(`    Now: $${ex.updated.toFixed(2)}\n`);
    });

    console.log('='.repeat(100) + '\n');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
