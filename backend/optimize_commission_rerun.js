#!/usr/bin/env node
/**
 * OPTIMIZED COMMISSION RERUN
 * 
 * Uses aggregation instead of populate for better performance
 */

const mongoose = require('mongoose');
const Transaction = require('./src/models/Transaction');
const User = require('./src/models/User');
const Notification = require('./src/models/Notification');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    console.log('═'.repeat(80));
    console.log('OPTIMIZED COMMISSION RERUN');
    console.log('═'.repeat(80) + '\n');

    // Delete old commissions
    console.log('Cleaning up old commissions...');
    await Transaction.deleteMany({
      type: 'commission',
      createdAt: { $gte: startOfToday }
    });

    // Get ROI transactions
    console.log('Loading ROI transactions...');
    const roiTransactions = await Transaction.find({
      type: 'profit',
      createdAt: { $gte: startOfToday }
    }).select('userId amount -_id').lean();

    // Group by investor
    const roiByInvestor = {};
    roiTransactions.forEach(tx => {
      const id = tx.userId.toString();
      roiByInvestor[id] = (roiByInvestor[id] || 0) + tx.amount;
    });

    const investorIds = Object.keys(roiByInvestor);
    console.log(`Found ${investorIds.length} investors with ROI\n`);

    // Load ALL needed users in bulk
    console.log('Loading users and ancestry data...');
    const allUserIds = new Set(investorIds);

    // Add all ancestors
    for (const invId of investorIds) {
      const investor = await User.findById(invId).select('ancestorPath').lean();
      if (investor?.ancestorPath) {
        investor.ancestorPath.forEach(id => allUserIds.add(id.toString()));
      }
    }

    // Load all at once
    const userMap = new Map();
    const allUsers = await User.find({
      _id: { $in: Array.from(allUserIds) }
    }).select('_id name email isActive totalInvested wallet').lean();

    allUsers.forEach(u => userMap.set(u._id.toString(), u));

    console.log(`Loaded ${allUsers.length} users\n`);

    // Process commissions
    console.log('Processing commissions...\n');

    const LEVEL_RATES = require('./config/constants').LEVEL_RATES;
    let totalCommissions = 0;
    let totalCommissionAmount = 0;
    const processingTime = Date.now();

    for (const investorIdStr of investorIds) {
      const investor = await User.findById(investorIdStr).select('_id name ancestorPath').lean();
      if (!investor?.ancestorPath || investor.ancestorPath.length === 0) continue;

      const totalRoi = roiByInvestor[investorIdStr];
      if (totalRoi <= 0) continue;

      // Pay up the chain
      for (let posIdx = 0; posIdx < investor.ancestorPath.length && posIdx < 21; posIdx++) {
        const level = posIdx + 1;
        const uplineId = investor.ancestorPath[posIdx].toString();
        const upline = userMap.get(uplineId);

        if (!upline || !upline.isActive) continue;
        if ((upline.totalInvested || 0) <= 0 && (upline.wallet?.capital || 0) <= 0) continue;

        const rate = LEVEL_RATES[level];
        if (!rate || rate <= 0) continue;

        const comm = Number(((totalRoi * rate) / 100).toFixed(4));
        if (comm <= 0) continue;

        // Credit
        await User.findByIdAndUpdate(uplineId, {
          $inc: {
            'wallet.commission': comm,
            totalEarned: comm
          }
        });

        await Transaction.create({
          userId: uplineId,
          type: 'commission',
          amount: comm,
          status: 'completed',
          description: `L${level} commission (${rate.toFixed(2)}%) from ${investor.name}'s $${totalRoi.toFixed(4)} daily ROI`,
          level,
          referenceId: investor._id,
          referenceModel: 'User'
        });

        await Notification.create({
          userId: uplineId,
          title: 'Commission Received',
          message: `You earned $${comm.toFixed(2)} in Level ${level} commission!`,
          type: 'commission'
        });

        totalCommissionAmount += comm;
        totalCommissions++;
      }

      if (investorIds.indexOf(investorIdStr) % 20 === 0) {
        console.log(`  Processing... ${investorIds.indexOf(investorIdStr)}/${investorIds.length}`);
      }
    }

    const elapsed = (Date.now() - processingTime) / 1000;

    console.log('\n' + '═'.repeat(80));
    console.log('COMMISSION RERUN COMPLETE');
    console.log('═'.repeat(80));
    console.log(`  Investors: ${investorIds.length}`);
    console.log(`  Commissions: ${totalCommissions}`);
    console.log(`  Total Paid: $${totalCommissionAmount.toFixed(2)}`);
    console.log(`  Time: ${elapsed.toFixed(1)}s\n`);

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
