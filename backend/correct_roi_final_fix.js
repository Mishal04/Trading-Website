/**
 * correct_roi_final_fix.js
 * 
 * Shaharyar example:
 * Approved Oct 6 (Tue) 14:19
 * ROI starts Oct 7 (Wed) 00:00
 * ROI runs: Oct 7, 8, 9 (3 business days)
 * = 3 × $3.00 = $9.00
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
    console.log('✅ CORRECT ROI - FINAL FIX');
    console.log('='.repeat(120) + '\n');

    const endDate = new Date('2026-10-09T23:59:59');

    function countBusinessDays(startDate, endDate) {
      // Count business days INCLUSIVE of both start and end
      let count = 0;
      let current = new Date(startDate);
      current.setHours(0, 0, 0, 0);

      endDate.setHours(23, 59, 59, 999);

      while (current <= endDate) {
        const dayOfWeek = current.getDay();
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

      // Get approval date
      const approvalDate = new Date(inv.createdAt);
      approvalDate.setHours(0, 0, 0, 0);

      // ROI starts NEXT calendar day
      let roiStartDate = new Date(approvalDate);
      roiStartDate.setDate(roiStartDate.getDate() + 1);

      // If start date is weekend, move to next Monday
      while (roiStartDate.getDay() === 0 || roiStartDate.getDay() === 6) {
        roiStartDate.setDate(roiStartDate.getDate() + 1);
      }

      // If roi start > Oct 9, skip
      if (roiStartDate > endDate) {
        continue;
      }

      // Count business days
      const businessDays = countBusinessDays(roiStartDate, new Date(endDate));

      const dailyRoi = inv.amount * inv.dailyRate;
      const totalRoi = dailyRoi * businessDays;

      if (!userRoiMap[userId]) {
        userRoiMap[userId] = { name: userName, totalRoi: 0, invs: [] };
      }

      userRoiMap[userId].totalRoi += totalRoi;
      userRoiMap[userId].invs.push({
        amount: inv.amount,
        daily: dailyRoi,
        approvalDate: approvalDate.toLocaleDateString(),
        roiStartDate: roiStartDate.toLocaleDateString(),
        days: businessDays,
        total: totalRoi
      });
    }

    // Show examples
    console.log('EXAMPLES:\n');

    // Shaharyar - should be $9
    for (const userId of Object.keys(userRoiMap)) {
      const user = userRoiMap[userId];
      if (user.name.toLowerCase().includes('shaharyar')) {
        console.log(`${user.name}:`);
        user.invs.forEach(inv => {
          console.log(`  Amount: $${inv.amount}`);
          console.log(`  Approved: ${inv.approvalDate}`);
          console.log(`  ROI starts: ${inv.roiStartDate}`);
          console.log(`  Business days: ${inv.days} × $${inv.daily.toFixed(2)} = $${inv.total.toFixed(2)}`);
        });
        console.log(`  TOTAL: $${user.totalRoi.toFixed(2)} (expected $9.00)\n`);
      }
    }

    // Naveed
    for (const userId of Object.keys(userRoiMap)) {
      const user = userRoiMap[userId];
      if (user.name.toLowerCase().includes('naveed')) {
        console.log(`${user.name}:`);
        user.invs.forEach(inv => {
          console.log(`  Amount: $${inv.amount}`);
          console.log(`  Approved: ${inv.approvalDate}`);
          console.log(`  ROI starts: ${inv.roiStartDate}`);
          console.log(`  Business days: ${inv.days} × $${inv.daily.toFixed(2)} = $${inv.total.toFixed(2)}`);
        });
        console.log(`  TOTAL: $${user.totalRoi.toFixed(2)}\n`);
      }
    }

    // Update
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

    console.log(`✅ Updated ${updated} users with correct ROI\n`);
    console.log('='.repeat(120) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
