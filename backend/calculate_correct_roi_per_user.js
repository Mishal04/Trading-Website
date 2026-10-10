/**
 * calculate_correct_roi_per_user.js
 * 
 * PRECISE CALCULATION:
 * For each user, calculate ROI from investment approval date to Oct 9, 2026
 * Exclude Saturdays and Sundays
 * ROI starts the day AFTER investment is approved
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

    console.log('\n' + '='.repeat(120));
    console.log('🔧 PRECISE ROI CALCULATION: From Approval Date to Oct 9, Excluding Weekends');
    console.log('='.repeat(120) + '\n');

    // Oct 9, 2026 is a Wednesday
    const endDate = new Date('2026-10-09T23:59:59');

    // Get all active investments
    const allInvs = await InvestorInvestment.find({ status: 'active' }).populate('userId');

    console.log(`Processing ${allInvs.length} investments...\n`);

    const userRoiMap = {}; // Map of userId -> total correct ROI

    for (const inv of allInvs) {
      if (!inv.userId) continue;

      const userId = inv.userId._id.toString();
      const userName = inv.userId.name || inv.userId.email;

      // Get transactions to find approval date
      const approvalTrans = await Transaction.findOne({
        userId: inv.userId._id,
        referenceId: inv._id,
        type: { $in: ['investment', 'deposit'] },
        status: 'completed'
      }).sort({ createdAt: 1 });

      if (!approvalTrans) {
        console.log(`⚠️  No approval transaction found for ${userName}'s investment $${inv.amount}`);
        continue;
      }

      const approvalDate = new Date(approvalTrans.createdAt);
      
      // ROI starts from the next day (first business day after approval)
      const roiStartDate = new Date(approvalDate);
      roiStartDate.setDate(roiStartDate.getDate() + 1);

      // Count business days (Mon-Fri only) from roiStartDate to Oct 9
      let businessDaysCount = 0;
      let currentDate = new Date(roiStartDate);

      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        // 0 = Sunday, 6 = Saturday
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          businessDaysCount++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Calculate ROI for this investment
      const dailyRoi = inv.amount * inv.dailyRate;
      const totalRoiForThisInv = dailyRoi * businessDaysCount;

      if (!userRoiMap[userId]) {
        userRoiMap[userId] = {
          name: userName,
          totalRoi: 0,
          investments: []
        };
      }

      userRoiMap[userId].totalRoi += totalRoiForThisInv;
      userRoiMap[userId].investments.push({
        amount: inv.amount,
        dailyRate: (inv.dailyRate * 100).toFixed(2),
        approvalDate: approvalDate.toLocaleDateString(),
        roiStartDate: roiStartDate.toLocaleDateString(),
        businessDays: businessDaysCount,
        dailyRoi: dailyRoi.toFixed(2),
        totalRoi: totalRoiForThisInv.toFixed(2)
      });
    }

    // Show examples
    console.log('Examples of calculations:\n');
    let count = 0;
    for (const userId of Object.keys(userRoiMap)) {
      if (count >= 5) break;
      
      const user = userRoiMap[userId];
      console.log(`${user.name}:`);
      user.investments.forEach(inv => {
        console.log(`  Investment: $${inv.amount} @ ${inv.dailyRate}%`);
        console.log(`  Approved: ${inv.approvalDate}`);
        console.log(`  ROI started: ${inv.roiStartDate}`);
        console.log(`  Business days counted: ${inv.businessDays}`);
        console.log(`  Daily ROI: $${inv.dailyRoi}`);
        console.log(`  Total ROI: $${inv.totalRoi}`);
      });
      console.log(`  TOTAL CORRECT ROI: $${user.totalRoi.toFixed(2)}\n`);
      count++;
    }

    // Now update all users
    console.log('\n' + '='.repeat(120));
    console.log('\n🔧 UPDATING ALL USERS...\n');

    let updated = 0;
    for (const userId of Object.keys(userRoiMap)) {
      const correctRoi = userRoiMap[userId].totalRoi;
      
      await User.findByIdAndUpdate(userId, {
        $set: { 'wallet.roi': correctRoi }
      });
      
      updated++;
    }

    console.log(`✅ Updated ${updated} users\n`);

    console.log('='.repeat(120));
    console.log('\n✅ PRECISE ROI CALCULATION COMPLETE\n');
    console.log('='.repeat(120) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
