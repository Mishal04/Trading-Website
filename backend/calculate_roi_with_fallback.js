/**
 * calculate_roi_with_fallback.js
 * 
 * Calculate ROI from approval date (or createdAt as fallback) to Oct 9, 2026
 * Exclude weekends
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
    console.log('🔧 CALCULATE ROI: From Approval to Oct 9 (with Fallback)');
    console.log('='.repeat(120) + '\n');

    const endDate = new Date('2026-10-09T23:59:59');
    const allInvs = await InvestorInvestment.find({ status: 'active' }).populate('userId');

    const userRoiMap = {};

    for (const inv of allInvs) {
      if (!inv.userId) continue;

      const userId = inv.userId._id.toString();
      const userName = inv.userId.name || inv.userId.email;

      // Try to get approval date from transaction first
      let approvalDate = null;
      
      const approvalTrans = await Transaction.findOne({
        userId: inv.userId._id,
        referenceId: inv._id,
        type: { $in: ['investment', 'deposit'] },
        status: 'completed'
      }).sort({ createdAt: 1 });

      if (approvalTrans) {
        approvalDate = new Date(approvalTrans.createdAt);
      } else {
        // Fallback to investment createdAt
        approvalDate = new Date(inv.createdAt);
      }

      // ROI starts next day
      const roiStartDate = new Date(approvalDate);
      roiStartDate.setDate(roiStartDate.getDate() + 1);

      // Count business days
      let businessDaysCount = 0;
      let currentDate = new Date(roiStartDate);

      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          businessDaysCount++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Calculate ROI
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
        dailyRate: inv.dailyRate,
        approvalDate: approvalDate.toLocaleDateString(),
        businessDays: businessDaysCount,
        totalRoi: totalRoiForThisInv
      });
    }

    // Show examples
    console.log('Sample calculations:\n');
    let exampleCount = 0;
    for (const userId of Object.keys(userRoiMap)) {
      if (exampleCount >= 3) break;
      
      const user = userRoiMap[userId];
      console.log(`${user.name}:`);
      user.investments.forEach(inv => {
        console.log(`  $${inv.amount} @ ${(inv.dailyRate * 100).toFixed(2)}% approved ${inv.approvalDate}`);
        console.log(`  Business days: ${inv.businessDays} × $${(inv.amount * inv.dailyRate).toFixed(2)} = $${inv.totalRoi.toFixed(2)}`);
      });
      console.log(`  TOTAL CORRECT ROI: $${user.totalRoi.toFixed(2)}\n`);
      exampleCount++;
    }

    // Update all users
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

    // Verify specific users
    console.log('='.repeat(120));
    console.log('\nVERIFYING SPECIFIC USERS:\n');

    const shaharyar = await User.findOne({ name: { $regex: 'shaharyar', $options: 'i' } });
    console.log(`Shaharyar: ROI = $${(shaharyar.wallet?.roi || 0).toFixed(2)} (should be $9.00)\n`);

    const naveed = await User.findOne({ name: { $regex: 'naveed', $options: 'i' } });
    console.log(`Naveed: ROI = $${(naveed.wallet?.roi || 0).toFixed(2)}\n`);

    const mustaqeem = await User.findOne({ name: 'Mustaqeem' });
    console.log(`Mustaqeem: ROI = $${(mustaqeem.wallet?.roi || 0).toFixed(2)}\n`);

    console.log('='.repeat(120) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
