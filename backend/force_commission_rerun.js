#!/usr/bin/env node
/**
 * FORCE COMMISSION RERUN
 * 
 * Delete all commissions from today and re-run Phase 2 manually
 */

const mongoose = require('mongoose');
const Transaction = require('./src/models/Transaction');
const User = require('./src/models/User');
const Notification = require('./src/models/Notification');
const CommissionLog = require('./src/models/CommissionLog');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    console.log('═'.repeat(80));
    console.log('FORCE COMMISSION RERUN - PHASE 2 ONLY');
    console.log('═'.repeat(80) + '\n');

    // Step 1: Delete all commissions from today
    console.log('Step 1: Deleting old commissions from today...');
    const delComm = await Transaction.deleteMany({
      type: 'commission',
      createdAt: { $gte: startOfToday }
    });
    console.log(`  Deleted: ${delComm.deletedCount} transactions\n`);

    // Step 2: Delete commission notifications
    const delNotif = await Notification.deleteMany({
      type: 'commission',
      createdAt: { $gte: startOfToday }
    });
    console.log(`  Deleted: ${delNotif.deletedCount} notifications\n`);

    // Step 3: Reset commission wallets
    console.log('Step 2: Resetting commission wallets...');
    const updateWallets = await User.updateMany(
      {},
      { $set: { 'wallet.commission': 0 } }
    );
    console.log(`  Reset: ${updateWallets.modifiedCount} wallets\n`);

    // Step 4: Get all investors who earned ROI today
    console.log('Step 3: Finding investors with ROI...');
    const roiTransactions = await Transaction.find({
      type: 'profit',
      createdAt: { $gte: startOfToday }
    });

    const investorIds = [...new Set(roiTransactions.map(tx => tx.userId.toString()))];
    console.log(`  Found: ${investorIds.length} investors with ROI\n`);

    // Step 5: Load those investors and calculate commissions
    console.log('Step 4: Calculating commissions for all investors...');

    const LEVEL_RATES = require('./config/constants').LEVEL_RATES;
    let totalPaid = 0;
    let commissionsCreated = 0;

    for (const investorIdStr of investorIds) {
      try {
        const investor = await User.findById(investorIdStr)
          .select('_id name email ancestorPath')
          .populate('ancestorPath', '_id name totalInvested wallet');

        if (!investor || !investor.ancestorPath || investor.ancestorPath.length === 0) {
          continue;
        }

        // Sum ROI from all transactions for this investor today
        const roiTxs = roiTransactions.filter(tx => tx.userId.toString() === investorIdStr);
        const totalRoi = roiTxs.reduce((sum, tx) => sum + tx.amount, 0);

        if (totalRoi <= 0) continue;

        // Pay commissions up the ancestorPath
        for (let posIndex = 0; posIndex < investor.ancestorPath.length; posIndex++) {
          const level = posIndex + 1;
          if (level > 21) break;

          const upline = investor.ancestorPath[posIndex];
          if (!upline) continue;

          // Load full upline for eligibility check
          const fullUpline = await User.findById(upline._id)
            .select('name isActive totalInvested wallet');

          if (!fullUpline || !fullUpline.isActive) continue;
          if ((fullUpline.totalInvested || 0) <= 0 && (fullUpline.wallet?.capital || 0) <= 0) continue;

          const rate = LEVEL_RATES[level];
          if (!rate || rate <= 0) continue;

          const comm = Number(((totalRoi * rate) / 100).toFixed(4));
          if (comm <= 0) continue;

          // Credit commission
          await User.findByIdAndUpdate(upline._id, {
            $inc: {
              'wallet.commission': comm,
              totalEarned: comm
            }
          });

          // Create transaction
          await Transaction.create({
            userId: upline._id,
            type: 'commission',
            amount: comm,
            status: 'completed',
            description: `L${level} commission (${rate.toFixed(2)}%) from ${investor.name}'s $${totalRoi.toFixed(4)} daily ROI`,
            level,
            referenceId: investor._id,
            referenceModel: 'User'
          });

          // Create notification
          await Notification.create({
            userId: upline._id,
            title: 'Commission Received',
            message: `You earned $${comm.toFixed(2)} in Level ${level} commission!`,
            type: 'commission'
          });

          totalPaid += comm;
          commissionsCreated++;
        }

      } catch (err) {
        console.error(`Error processing investor ${investorIdStr}:`, err.message);
      }
    }

    console.log(`  Created: ${commissionsCreated} commissions`);
    console.log(`  Total Paid: $${totalPaid.toFixed(2)}\n`);

    console.log('═'.repeat(80));
    console.log('PHASE 2 RERUN COMPLETE');
    console.log('═'.repeat(80) + '\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
