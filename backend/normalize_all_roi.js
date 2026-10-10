/**
 * normalize_all_roi.js
 * 
 * Normalize all users' ROI to exactly one day's worth
 * ROI = sum of (investment amount * daily rate) for all active investments
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('\n' + '='.repeat(100));
    console.log('🔄 NORMALIZE: All Users\' ROI to One Day Only');
    console.log('='.repeat(100) + '\n');

    // Get all users with active investments
    const usersWithInvs = await User.find({}).select('_id name email wallet');

    let corrected = 0;
    let unchanged = 0;

    for (const user of usersWithInvs) {
      // Calculate what their ROI should be (one day only)
      const invs = await InvestorInvestment.find({
        userId: user._id,
        status: 'active'
      });

      const expectedRoi = invs.reduce((sum, inv) => sum + (inv.amount * inv.dailyRate), 0);

      const currentRoi = user.wallet?.roi || 0;

      if (Math.abs(currentRoi - expectedRoi) > 0.01) {
        // Needs correction
        await User.findByIdAndUpdate(user._id, {
          $set: { 'wallet.roi': expectedRoi }
        });
        corrected++;

        if (corrected <= 5) {
          console.log(`✅ ${user.name || user.email}: $${currentRoi.toFixed(2)} → $${expectedRoi.toFixed(2)}`);
        }
      } else {
        unchanged++;
      }
    }

    if (corrected > 5) {
      console.log(`✅ ... and ${corrected - 5} more users`);
    }

    console.log(`\n✅ Corrected: ${corrected} users`);
    console.log(`✅ Already correct: ${unchanged} users\n`);

    console.log('='.repeat(100));
    console.log('\n✅ ALL USERS\' ROI NORMALIZED TO ONE DAY ONLY\n');
    console.log('='.repeat(100) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
