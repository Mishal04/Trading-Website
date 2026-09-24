const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const connectDB = require('../src/config/database');
const Investment = require('../src/models/Investment');
const Transaction = require('../src/models/Transaction');
const User = require('../src/models/User');

async function runCorrection() {
  try {
    await connectDB();
    console.log('='.repeat(80));
    console.log('DUPLICATE PROFIT CORRECTION SCRIPT — EXECUTION START');
    console.log('='.repeat(80));

    // ── STEP 1: Identify all duplicates and affected records ─────────────────
    const investments = await Investment.find({}).sort({ createdAt: 1 });
    
    const duplicateGroups = [];
    const duplicateTxIds = [];
    const affectedInvestmentIds = new Set();
    const affectedUserIds = new Set();
    const userOverCreditMap = new Map(); // userId -> totalOverCredit
    const investmentReductionMap = new Map(); // investmentId -> totalOverCredit

    for (const inv of investments) {
      const profitTxs = await Transaction.find({
        type: 'profit',
        referenceId: inv._id
      }).sort({ date: 1, createdAt: 1 });

      if (profitTxs.length <= 1) continue;

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

      for (const [key, txList] of groups.entries()) {
        if (txList.length > 1) {
          const [dayKey, amountStr] = key.split('_');
          const legitimateTx = txList[0];
          const duplicates = txList.slice(1);
          const duplicateAmount = duplicates.reduce((sum, t) => sum + t.amount, 0);

          affectedInvestmentIds.add(String(inv._id));
          affectedUserIds.add(String(inv.userId));

          const invIdStr = String(inv._id);
          investmentReductionMap.set(
            invIdStr,
            (investmentReductionMap.get(invIdStr) || 0) + duplicateAmount
          );

          const userIdStr = String(inv.userId);
          userOverCreditMap.set(
            userIdStr,
            (userOverCreditMap.get(userIdStr) || 0) + duplicateAmount
          );

          duplicates.forEach(d => duplicateTxIds.push(d._id));

          duplicateGroups.push({
            investmentId: inv._id,
            userId: inv.userId,
            dayKey,
            amount: Number(amountStr),
            legitimateTxId: legitimateTx._id,
            duplicateTxIds: duplicates.map(d => d._id),
            duplicateAmount
          });
        }
      }
    }

    console.log(`Found ${affectedUserIds.size} affected users, ${affectedInvestmentIds.size} investments, ${duplicateTxIds.length} duplicate transactions to delete.`);

    // ── STEP 2: Pre-Correction Backup Export ─────────────────────────────────
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilePath = path.join(backupDir, `pre_correction_backup_${timestamp}.json`);

    const usersBefore = await User.find({ _id: { $in: Array.from(affectedUserIds) } });
    const investmentsBefore = await Investment.find({ _id: { $in: Array.from(affectedInvestmentIds) } });
    const duplicateTxsBefore = await Transaction.find({ _id: { $in: duplicateTxIds } });

    const backupData = {
      createdAt: new Date().toISOString(),
      affectedUserCount: affectedUserIds.size,
      affectedInvestmentCount: affectedInvestmentIds.size,
      duplicateTxCount: duplicateTxIds.length,
      users: usersBefore,
      investments: investmentsBefore,
      duplicateTransactions: duplicateTxsBefore,
      duplicateGroups
    };

    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2));
    console.log(`\n✓ Full pre-correction backup successfully saved to:\n  ${backupFilePath}\n`);

    // ── STEP 3: Execute Wallet Balances Deductions ───────────────────────────
    console.log('--- Processing User Wallet Balance Adjustments ---');
    const userAdjustmentsAudit = [];

    for (const user of usersBefore) {
      const userIdStr = String(user._id);
      const overCredit = userOverCreditMap.get(userIdStr) || 0;
      const initialProfitBalance = user.wallet ? user.wallet.profit : 0;
      const initialTotalEarned = user.totalProfitEarned || 0;

      let balanceAdjusted = false;
      let finalProfitBalance = initialProfitBalance;
      let finalTotalEarned = initialTotalEarned;

      // Rule: Deduct only if balance is > 0 (13 users). If 0 (3 users), leave untouched.
      if (initialProfitBalance > 0 && initialProfitBalance >= overCredit) {
        finalProfitBalance = Number((initialProfitBalance - overCredit).toFixed(4));
        finalTotalEarned = Number((initialTotalEarned - overCredit).toFixed(4));

        await User.findByIdAndUpdate(user._id, {
          $set: {
            'wallet.profit': finalProfitBalance,
            totalProfitEarned: finalTotalEarned
          }
        });
        balanceAdjusted = true;
        console.log(`  [DEDUCTED] User ${user.name} (${user.email}): -$${overCredit.toFixed(4)} | Old Balance: $${initialProfitBalance.toFixed(4)} -> New Balance: $${finalProfitBalance.toFixed(4)}`);
      } else {
        console.log(`  [UNTOUCHED] User ${user.name || 'Unknown'} (${user.email || userIdStr}): Balance $${initialProfitBalance.toFixed(4)} (Zero/Insufficient — leaving untouched as per rule 2)`);
      }

      userAdjustmentsAudit.push({
        userId: user._id,
        name: user.name || 'Unknown',
        email: user.email || 'N/A',
        initialProfitBalance,
        initialTotalEarned,
        overCreditAmount: overCredit,
        balanceAdjusted,
        finalProfitBalance,
        finalTotalEarned
      });
    }

    // ── STEP 4: Correct Investment Documents' totalProfitEarned ──────────────
    console.log('\n--- Correcting Investment totalProfitEarned Fields ---');
    const investmentAdjustmentsAudit = [];

    for (const inv of investmentsBefore) {
      const invIdStr = String(inv._id);
      const overCredit = investmentReductionMap.get(invIdStr) || 0;
      const initialTotalProfitEarned = inv.totalProfitEarned || 0;
      const finalTotalProfitEarned = Math.max(0, Number((initialTotalProfitEarned - overCredit).toFixed(4)));

      await Investment.findByIdAndUpdate(inv._id, {
        $set: {
          totalProfitEarned: finalTotalProfitEarned
        }
      });

      console.log(`  [INVESTMENT UPDATED] ID: ${inv._id} (${inv.packageName}, $${inv.amount}): Old totalProfitEarned: $${initialTotalProfitEarned} -> New: $${finalTotalProfitEarned} (-$${overCredit})`);

      investmentAdjustmentsAudit.push({
        investmentId: inv._id,
        userId: inv.userId,
        amount: inv.amount,
        packageName: inv.packageName,
        initialTotalProfitEarned,
        deductedAmount: overCredit,
        finalTotalProfitEarned
      });
    }

    // ── STEP 5: Delete Duplicate Transaction Records (All 16 Users) ─────────
    console.log('\n--- Deleting Duplicate Transaction Records ---');
    const deleteResult = await Transaction.deleteMany({ _id: { $in: duplicateTxIds } });
    console.log(`  ✓ Successfully deleted ${deleteResult.deletedCount} duplicate transaction records.`);

    // ── STEP 6: Write Permanent Audit Log ────────────────────────────────────
    const logsDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const auditLogPath = path.join(logsDir, `profit_correction_audit_${timestamp}.json`);
    const auditSummary = {
      executedAt: new Date().toISOString(),
      executedBy: 'Antigravity / Lead Developer',
      description: 'Permanent audit record for duplicate daily profit resolution & cleanup.',
      summaryTotals: {
        totalAffectedUsers: affectedUserIds.size,
        usersBalanceDeducted: userAdjustmentsAudit.filter(u => u.balanceAdjusted).length,
        usersUntouchedZeroBalance: userAdjustmentsAudit.filter(u => !u.balanceAdjusted).length,
        totalInvestmentsCorrected: investmentAdjustmentsAudit.length,
        totalDuplicateTransactionsDeleted: deleteResult.deletedCount,
        backupFile: backupFilePath
      },
      userAdjustments: userAdjustmentsAudit,
      investmentAdjustments: investmentAdjustmentsAudit,
      deletedTransactions: duplicateTxsBefore.map(t => ({
        id: t._id,
        userId: t.userId,
        referenceId: t.referenceId,
        amount: t.amount,
        date: t.date,
        description: t.description
      }))
    };

    fs.writeFileSync(auditLogPath, JSON.stringify(auditSummary, null, 2));
    console.log(`\n✓ Permanent audit log written to:\n  ${auditLogPath}`);

    // ── STEP 7: Post-Correction Verification ────────────────────────────────
    console.log('\n' + '='.repeat(80));
    console.log('POST-CORRECTION VERIFICATION REPORT');
    console.log('='.repeat(80));

    const remainingDuplicateCheck = await Transaction.find({ _id: { $in: duplicateTxIds } });
    console.log(`Remaining duplicate transactions in DB: ${remainingDuplicateCheck.length} (Expected: 0)`);

    const usersAfter = await User.find({ _id: { $in: Array.from(affectedUserIds) } }).select('name email wallet totalProfitEarned');
    console.log('\nFinal User Balances:');
    usersAfter.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.name || 'Unknown'} (${u.email || u._id}) | Profit Balance: $${u.wallet ? u.wallet.profit : 'N/A'} | Total Profit Earned: $${u.totalProfitEarned}`);
    });

    console.log('='.repeat(80));
    console.log('CORRECTION COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));

    process.exit(0);
  } catch (err) {
    console.error('Fatal error executing correction:', err);
    process.exit(1);
  }
}

runCorrection();
