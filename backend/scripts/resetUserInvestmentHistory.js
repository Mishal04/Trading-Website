/**
 * Reset all user investment history
 * - Deletes all investments (Investment, InvestorInvestment)
 * - Deletes all transactions
 * - Deletes all withdrawals
 * - Deletes all commissions & logs
 * - Resets user wallet and financial stats
 * 
 * KEEPS:
 * - User login accounts
 * - User profiles (name, email, password)
 * - Referral codes
 * - Team structure (if you want to keep it)
 * 
 * Run: node scripts/resetUserInvestmentHistory.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  const User = require('../src/models/User');
  const Investment = require('../src/models/Investment');
  const InvestorInvestment = require('../src/models/InvestorInvestment');
  const Transaction = require('../src/models/Transaction');
  const Withdrawal = require('../src/models/Withdrawal');
  const CommissionLog = require('../src/models/CommissionLog');
  const Notification = require('../src/models/Notification');

  try {
    console.log('Starting investment history reset...\n');

    // 1. Delete all investments
    const invResult = await Investment.deleteMany({});
    console.log(`✓ Deleted ${invResult.deletedCount} Investment records`);

    // 2. Delete all investor investments (Phase 2)
    const invInvResult = await InvestorInvestment.deleteMany({});
    console.log(`✓ Deleted ${invInvResult.deletedCount} InvestorInvestment records`);

    // 3. Delete all transactions
    const txResult = await Transaction.deleteMany({});
    console.log(`✓ Deleted ${txResult.deletedCount} Transaction records`);

    // 4. Delete all withdrawals
    const wtResult = await Withdrawal.deleteMany({});
    console.log(`✓ Deleted ${wtResult.deletedCount} Withdrawal records`);

    // 5. Delete all commission logs
    const comResult = await CommissionLog.deleteMany({});
    console.log(`✓ Deleted ${comResult.deletedCount} CommissionLog records`);

    // 6. Delete investment-related notifications
    const notifResult = await Notification.deleteMany({
      $or: [
        { type: 'investment' },
        { type: 'commission' },
        { type: 'profit' },
        { type: 'withdrawal' }
      ]
    });
    console.log(`✓ Deleted ${notifResult.deletedCount} related Notifications`);

    // 7. Reset all users' financial stats
    const userUpdateResult = await User.updateMany(
      {},
      {
        $set: {
          totalInvested: 0,
          totalEarned: 0,
          totalProfitEarned: 0,
          'wallet.capital': 0,
          'wallet.profit': 0,
          'wallet.commission': 0,
          investmentLevel: 'basic',
          directCount: 0,
          unlockedLevels: 0,
          teamBusiness: { strongTeam: 0, otherTeam: 0, total: 0 },
          networkAccessGranted: false,
          networkerAccessGrantedAt: null,
          networkerAccessGrantedBy: null
        },
        $unset: {
          commissions: 1,
          ancestorPath: 1,
          directReferrals: 1
        }
      }
    );
    console.log(`✓ Reset financial stats for ${userUpdateResult.modifiedCount} users`);

    console.log('\n=== RESET COMPLETE ===');
    console.log('\nWhat was deleted:');
    console.log('  ✗ All investments');
    console.log('  ✗ All transactions');
    console.log('  ✗ All withdrawals');
    console.log('  ✗ All commission logs');
    console.log('  ✗ All related notifications');
    console.log('  ✗ All financial data (wallets, caps, earnings)');
    
    console.log('\nWhat was kept:');
    console.log('  ✓ User login accounts');
    console.log('  ✓ User profiles (name, email, password)');
    console.log('  ✓ Referral codes');
    console.log('  ✓ Last login timestamps');

    console.log('\nTotal records affected:');
    console.log(`  ${invResult.deletedCount + invInvResult.deletedCount + txResult.deletedCount + wtResult.deletedCount + comResult.deletedCount + notifResult.deletedCount} records deleted`);
    console.log(`  ${userUpdateResult.modifiedCount} users reset`);

  } catch (err) {
    console.error('Error during reset:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
