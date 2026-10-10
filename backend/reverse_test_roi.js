/**
 * reverse_test_roi.js
 * 
 * REVERSE the extra ROI that was added today during testing
 * The test run processed ROI twice, so we need to remove one day's worth
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');
const Transaction = require('./src/models/Transaction');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('\n' + '='.repeat(100));
    console.log('🔄 REVERSE: Extra ROI from Test Run');
    console.log('='.repeat(100) + '\n');

    // Find all active investments
    const allInvs = await InvestorInvestment.find({ status: 'active' });
    console.log(`Found ${allInvs.length} active investments\n`);

    let totalRemoving = 0;
    const userRemovalMap = {};

    // Calculate one day ROI for each
    for (const inv of allInvs) {
      const dailyRoi = inv.amount * inv.dailyRate;
      
      const userId = inv.userId.toString();
      if (!userRemovalMap[userId]) {
        userRemovalMap[userId] = {
          totalToRemove: 0,
          investmentCount: 0
        };
      }

      userRemovalMap[userId].totalToRemove += dailyRoi;
      userRemovalMap[userId].investmentCount++;
      totalRemoving += dailyRoi;
    }

    console.log(`Removing one day's ROI from all users...\n`);
    console.log(`Total to remove: $${totalRemoving.toFixed(2)}\n`);

    // Remove ROI from each user
    let usersFixed = 0;
    for (const userId of Object.keys(userRemovalMap)) {
      const removal = userRemovalMap[userId];

      const user = await User.findById(userId);
      if (!user) continue;

      // Remove from wallet
      await User.findByIdAndUpdate(userId, {
        $inc: {
          'wallet.roi': -removal.totalToRemove,
          totalRoiEarned: -removal.totalToRemove
        }
      });

      usersFixed++;

      if (usersFixed <= 5) {
        console.log(`✅ Removed $${removal.totalToRemove.toFixed(2)} from ${user.name || user.email}`);
      }
    }

    if (usersFixed > 5) {
      console.log(`✅ ... and ${usersFixed - 5} more users`);
    }

    console.log(`\n✅ Fixed ${usersFixed} users\n`);

    console.log('='.repeat(100));
    console.log('\n✅ REVERSAL COMPLETE\n');
    console.log(`All users\' ROI wallets have been corrected back to normal.\n`);

    console.log('='.repeat(100) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
