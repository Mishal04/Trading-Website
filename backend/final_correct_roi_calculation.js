/**
 * final_correct_roi_calculation.js
 * 
 * FINAL CORRECT CALCULATION
 * ROI = business days from (approval date + 1) to Oct 9
 * Exclude Saturdays (Oct 5, 12) and Sundays (Oct 6, 13)
 * 
 * Business days Sep 27 - Oct 9:
 * Sep 27 (Sun) - no (weekend)
 * Sep 28 (Mon) - yes
 * Sep 29 (Tue) - yes
 * Sep 30 (Wed) - yes
 * Oct 1 (Thu) - yes
 * Oct 2 (Fri) - yes
 * Oct 3 (Sat) - no (weekend)
 * Oct 4 (Sun) - no (weekend)
 * Oct 5 (Mon) - yes
 * Oct 6 (Tue) - yes
 * Oct 7 (Wed) - yes
 * Oct 8 (Thu) - yes
 * Oct 9 (Fri) - yes
 * Total: 10 business days
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
    console.log('✅ FINAL CORRECT ROI CALCULATION');
    console.log('='.repeat(120) + '\n');

    const endDate = new Date('2026-10-09');

    function countBusinessDays(startDate, endDate) {
      let count = 0;
      let current = new Date(startDate);

      while (current <= endDate) {
        const dayOfWeek = current.getDay();
        // 0 = Sun, 6 = Sat
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          count++;
        }
        current.setDate(current.getDate() + 1);
      }
      return count;
    }

    const allInvs = await InvestorInvestment.find({ status: 'active' }).populate('userId');
    const userRoiMap = {};

    for (const inv of allInvs) {
      if (!inv.userId) continue;

      const userId = inv.userId._id.toString();
      const userName = inv.userId.name || inv.userId.email;

      // Approval date = createdAt
      const approvalDate = new Date(inv.createdAt);
      
      // ROI starts NEXT business day
      let roiStartDate = new Date(approvalDate);
      roiStartDate.setDate(roiStartDate.getDate() + 1);

      // Skip to next business day if it's a weekend
      while (roiStartDate.getDay() === 0 || roiStartDate.getDay() === 6) {
        roiStartDate.setDate(roiStartDate.getDate() + 1);
      }

      // If roi start is after Oct 9, no ROI
      if (roiStartDate > endDate) {
        continue;
      }

      // Count business days from roiStartDate to Oct 9
      const businessDays = countBusinessDays(roiStartDate, endDate);

      const dailyRoi = inv.amount * inv.dailyRate;
      const totalRoi = dailyRoi * businessDays;

      if (!userRoiMap[userId]) {
        userRoiMap[userId] = { name: userName, totalRoi: 0, invs: [] };
      }

      userRoiMap[userId].totalRoi += totalRoi;
      userRoiMap[userId].invs.push({
        amount: inv.amount,
        daily: dailyRoi,
        days: businessDays,
        total: totalRoi
      });
    }

    // Show examples
    console.log('Examples:\n');
    
    // Shaharyar
    for (const userId of Object.keys(userRoiMap)) {
      const user = userRoiMap[userId];
      if (user.name.includes('Shaharyar') || user.name.includes('shaharyar')) {
        console.log(`${user.name}:`);
        user.invs.forEach(inv => {
          console.log(`  $${inv.amount} @ ${(inv.daily).toFixed(2)}/day × ${inv.days} days = $${inv.total.toFixed(2)}`);
        });
        console.log(`  TOTAL: $${user.totalRoi.toFixed(2)} (should be $9.00)\n`);
      }
    }

    // Naveed
    for (const userId of Object.keys(userRoiMap)) {
      const user = userRoiMap[userId];
      if (user.name.includes('Naveed') || user.name.includes('naveed')) {
        console.log(`${user.name}:`);
        user.invs.forEach(inv => {
          console.log(`  $${inv.amount} @ ${(inv.daily).toFixed(2)}/day × ${inv.days} days = $${inv.total.toFixed(2)}`);
        });
        console.log(`  TOTAL: $${user.totalRoi.toFixed(2)}\n`);
      }
    }

    // Mustaqeem
    for (const userId of Object.keys(userRoiMap)) {
      const user = userRoiMap[userId];
      if (user.name === 'Mustaqeem') {
        console.log(`${user.name}:`);
        user.invs.forEach(inv => {
          console.log(`  $${inv.amount} @ ${(inv.daily).toFixed(2)}/day × ${inv.days} days = $${inv.total.toFixed(2)}`);
        });
        console.log(`  TOTAL: $${user.totalRoi.toFixed(2)} (created Oct 9, no ROI yet)\n`);
      }
    }

    // Update all
    console.log('='.repeat(120));
    console.log('\n🔧 UPDATING ALL USERS...\n');

    let updated = 0;
    for (const userId of Object.keys(userRoiMap)) {
      const correctRoi = parseFloat(userRoiMap[userId].totalRoi.toFixed(2));
      await User.findByIdAndUpdate(userId, {
        $set: { 'wallet.roi': correctRoi }
      });
      updated++;
    }

    console.log(`✅ Updated ${updated} users\n`);
    console.log('='.repeat(120) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
