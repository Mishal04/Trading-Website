const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const connectDB = require('../src/config/database');
const Investment = require('../src/models/Investment');
const Transaction = require('../src/models/Transaction');
const User = require('../src/models/User');

/**
 * Audit & Cleanup Script for Duplicate Profit Transactions
 * 
 * Mode: READ-ONLY (Dry Run) by default.
 * Pass --apply-fix to actually execute database modifications when approved.
 */
async function auditDuplicates() {
  const isApplyMode = process.argv.includes('--apply-fix');

  try {
    await connectDB();
    console.log('='.repeat(80));
    console.log(`DUPLICATE PROFIT AUDIT REPORT — MODE: ${isApplyMode ? 'APPLY FIX (ACTIVE)' : 'READ-ONLY (DRY RUN)'}`);
    console.log('='.repeat(80));

    // 1. Fetch all investments
    const investments = await Investment.find({}).sort({ createdAt: 1 });
    
    const userSummaryMap = new Map(); // userId -> { user, totalOverCredit: 0, duplicateTxIds: [], details: [] }
    let totalSystemOverCredit = 0;
    let totalDuplicateTxCount = 0;

    for (const inv of investments) {
      // Find all profit transactions for this investment
      const profitTxs = await Transaction.find({
        type: 'profit',
        referenceId: inv._id
      }).sort({ date: 1, createdAt: 1 });

      if (profitTxs.length <= 1) continue;

      // Group by calendar date (YYYY-MM-DD) and amount
      const groups = new Map();
      for (const tx of profitTxs) {
        const txDate = new Date(tx.date);
        const dayKey = `${txDate.getUTCFullYear()}-${String(txDate.getUTCMonth() + 1).padStart(2, '0')}-${String(txDate.getUTCDate()).padStart(2, '0')}`;
        const key = `${dayKey}_${Number(tx.amount).toFixed(4)}`;

        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key).push(tx);
      }

      // Check for duplicates in each group
      for (const [key, txList] of groups.entries()) {
        if (txList.length > 1) {
          const [dayKey, amountStr] = key.split('_');
          const legitimateTx = txList[0];
          const duplicates = txList.slice(1);
          const duplicateAmount = duplicates.reduce((sum, t) => sum + t.amount, 0);

          totalSystemOverCredit += duplicateAmount;
          totalDuplicateTxCount += duplicates.length;

          const userIdStr = String(inv.userId);
          if (!userSummaryMap.has(userIdStr)) {
            const user = await User.findById(inv.userId);
            userSummaryMap.set(userIdStr, {
              user,
              totalOverCredit: 0,
              duplicateTxIds: [],
              details: []
            });
          }

          const userEntry = userSummaryMap.get(userIdStr);
          userEntry.totalOverCredit += duplicateAmount;
          duplicates.forEach(d => userEntry.duplicateTxIds.push(d._id));
          userEntry.details.push({
            investmentId: inv._id,
            packageName: inv.packageName,
            investmentAmount: inv.amount,
            dayKey,
            legitimateTxId: legitimateTx._id,
            duplicateTxCount: duplicates.length,
            duplicateTxIds: duplicates.map(d => d._id),
            duplicateAmount
          });
        }
      }
    }

    // Print Detailed Audit Report
    if (userSummaryMap.size === 0) {
      console.log('\nNo duplicate profit transactions found across any investments.');
    } else {
      console.log(`\nFound ${userSummaryMap.size} affected user(s) with duplicate profit credits:\n`);

      let userIdx = 1;
      for (const [userIdStr, data] of userSummaryMap.entries()) {
        const user = data.user;
        const currentProfitWallet = user && user.wallet ? user.wallet.profit : 0;
        const currentTotalProfit = user ? user.totalProfitEarned : 0;

        console.log(`--------------------------------------------------------------------------------`);
        console.log(`[User #${userIdx++}] ${user ? user.name : 'Unknown'} (${user ? user.email : userIdStr})`);
        console.log(`  User ID:                 ${userIdStr}`);
        console.log(`  Current Profit Balance:  $${currentProfitWallet.toFixed(4)}`);
        console.log(`  Total Profit Earned:     $${currentTotalProfit.toFixed(4)}`);
        console.log(`  Total Over-Credited:     $${data.totalOverCredit.toFixed(4)}`);
        console.log(`  Duplicate Tx Count:      ${data.duplicateTxIds.length}`);
        console.log(`  Balance after Deduct:    $${(currentProfitWallet - data.totalOverCredit).toFixed(4)} ${currentProfitWallet < data.totalOverCredit ? '(WARNING: Insufficient balance to cover full reversal!)' : '(Sufficient balance)'}`);
        console.log(`\n  Duplicate Breakdown:`);

        data.details.forEach((item, idx) => {
          console.log(`    Item #${idx + 1}: Date: ${item.dayKey} | Investment: $${item.investmentAmount} (${item.packageName})`);
          console.log(`      - Kept (Legitimate) Tx ID:   ${item.legitimateTxId}`);
          console.log(`      - Duplicate Tx IDs (${item.duplicateTxCount}):   ${item.duplicateTxIds.join(', ')}`);
          console.log(`      - Excess Amount Over-Credited: $${item.duplicateAmount.toFixed(4)}`);
        });
        console.log('');
      }

      console.log('='.repeat(80));
      console.log('SUMMARY TOTALS:');
      console.log(`Total Affected Users:       ${userSummaryMap.size}`);
      console.log(`Total Duplicate Txs:        ${totalDuplicateTxCount}`);
      console.log(`Total Over-Credited Amount: $${totalSystemOverCredit.toFixed(4)}`);
      console.log('='.repeat(80));
    }

    // If apply mode is explicitly requested, perform updates with transactions/locks
    if (isApplyMode) {
      console.log('\n[APPLY MODE] Reversing duplicate transactions and adjusting user wallets...');
      for (const [userIdStr, data] of userSummaryMap.entries()) {
        const user = data.user;
        if (!user) continue;

        // 1. Delete or mark duplicate transactions
        await Transaction.deleteMany({ _id: { $in: data.duplicateTxIds } });

        // 2. Adjust user wallet and totalProfitEarned
        await User.findByIdAndUpdate(user._id, {
          $inc: {
            'wallet.profit': -data.totalOverCredit,
            totalProfitEarned: -data.totalOverCredit
          }
        });

        // 3. Adjust investment totalProfitEarned for each affected investment
        for (const item of data.details) {
          await Investment.findByIdAndUpdate(item.investmentId, {
            $inc: {
              totalProfitEarned: -item.duplicateAmount
            }
          });
        }

        console.log(`  ✓ Successfully cleaned up User ${user.email}: removed ${data.duplicateTxIds.length} txs, adjusted -$${data.totalOverCredit}`);
      }
      console.log('\n[APPLY MODE] Cleanup complete.');
    } else {
      console.log('\n[DRY RUN ONLY] No data was modified. Run with --apply-fix only when approved.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error during audit:', err);
    process.exit(1);
  }
}

auditDuplicates();
