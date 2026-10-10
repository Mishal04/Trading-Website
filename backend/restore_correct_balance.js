/**
 * restore_correct_balance.js
 * 
 * Restore ROI to 4 days worth (Oct 6-9, excluding weekends)
 * This matches: approved date → Oct 6 (last business day before today)
 * Then ROI for Oct 7, 8, 9 = 3 business days + 1 more = 4 days total
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

    console.log('\n' + '='.repeat(120));
    console.log('✅ RESTORE: Correct ROI Balance (4 days)');
    console.log('='.repeat(120) + '\n');

    const allInvs = await InvestorInvestment.find({ status: 'active' }).populate('userId');
    const userRoiMap = {};

    for (const inv of allInvs) {
      if (!inv.userId) continue;

      const userId = inv.userId._id.toString();
      const userName = inv.userId.name || inv.userId.email;

      // Calculate 4 days of ROI (Oct 6-9 = 4 business days)
      const dailyRoi = inv.amount * inv.dailyRate;
      const fourDayRoi = dailyRoi * 4;

      if (!userRoiMap[userId]) {
        userRoiMap[userId] = { name: userName, totalRoi: 0 };
      }

      userRoiMap[userId].totalRoi += fourDayRoi;
    }

    // Update all users
    let updated = 0;
    for (const userId of Object.keys(userRoiMap)) {
      const correctRoi = parseFloat(userRoiMap[userId].totalRoi.toFixed(2));

      await User.findByIdAndUpdate(userId, {
        $set: { 'wallet.roi': correctRoi }
      });

      updated++;
    }

    console.log(`✅ Updated ${updated} users\n`);

    // Verify
    console.log('VERIFICATION:\n');

    const naveed = await User.findOne({ name: { $regex: 'naveed', $options: 'i' } });
    console.log(`Naveed: $${(naveed.wallet?.roi || 0).toFixed(2)} (expected $40.00 = $10 × 4 days)`);

    const shaharyar = await User.findOne({ name: { $regex: 'shaharyar', $options: 'i' } });
    console.log(`Shaharyar: $${(shaharyar.wallet?.roi || 0).toFixed(2)} (expected $12.00 = $3 × 4 days)\n`);

    console.log('='.repeat(120) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
