/**
 * COMPLETE RESET & CRON RUN
 * 1. Reset all users' wallets to $0 (profit, commission, totalRoiEarned, totalInvested)
 * 2. Delete today's transactions and cron locks
 * 3. Run the cron profit calculation
 * 4. Verify wallet updates
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');
const CronLock = require('./src/models/CronLock');
const profitService = require('./src/services/profitService');

async function resetWallets() {
  console.log('\n========== STEP 1: RESETTING ALL WALLETS ==========\n');
  
  try {
    // Get today's date
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // Reset all users
    const result = await User.updateMany(
      { accountType: 'user' },
      {
        $set: {
          'wallet.profit': 0,
          'wallet.commission': 0,
          totalRoiEarned: 0,
          totalInvested: 0
        }
      }
    );

    console.log(`✓ Reset ${result.modifiedCount} users' wallets to $0`);
    console.log(`  - wallet.profit: $0`);
    console.log(`  - wallet.commission: $0`);
    console.log(`  - totalRoiEarned: $0`);
    console.log(`  - totalInvested: $0\n`);

    // Delete today's transactions
    const transResult = await Transaction.deleteMany({
      createdAt: { $gte: startOfToday, $lt: endOfToday }
    });
    console.log(`✓ Deleted ${transResult.deletedCount} transactions from today\n`);

    // Delete today's cron locks
    const lockResult = await CronLock.deleteMany({
      dateKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    });
    console.log(`✓ Deleted ${lockResult.deletedCount} cron locks from today\n`);

    return true;
  } catch (err) {
    console.error('❌ Error resetting wallets:', err.message);
    throw err;
  }
}

async function runCron() {
  console.log('\n========== STEP 2: RUNNING CRON PROFIT CALCULATION ==========\n');
  
  try {
    const result = await profitService.calculateDailyProfits();
    
    console.log('\n✓ Cron completed successfully');
    console.log(`  - Investments processed: ${result.processedCount}`);
    console.log(`  - ROI distributed: $${result.totalProfitDistributed.toFixed(2)}`);
    console.log(`  - Investors processed: ${result.investorsWithCommissions}\n`);

    return result;
  } catch (err) {
    console.error('❌ Error running cron:', err.message);
    throw err;
  }
}

async function verifyResults() {
  console.log('\n========== STEP 3: VERIFYING WALLET UPDATES ==========\n');
  
  try {
    // Get users with non-zero wallets
    const usersWithProfit = await User.find({
      'wallet.profit': { $gt: 0 },
      accountType: 'user'
    }).select('name email wallet').sort({ 'wallet.profit': -1 }).limit(10);

    const usersWithCommission = await User.find({
      'wallet.commission': { $gt: 0 },
      accountType: 'user'
    }).select('name email wallet').sort({ 'wallet.commission': -1 }).limit(10);

    console.log(`\n📊 Top 10 users with wallet.profit:\n`);
    if (usersWithProfit.length === 0) {
      console.log('  None found (might still be processing)\n');
    } else {
      usersWithProfit.forEach((u, i) => {
        console.log(`  ${i + 1}. ${u.name} - $${u.wallet.profit.toFixed(2)}`);
      });
    }

    console.log(`\n📊 Top 10 users with wallet.commission:\n`);
    if (usersWithCommission.length === 0) {
      console.log('  None found (might still be processing)\n');
    } else {
      usersWithCommission.forEach((u, i) => {
        console.log(`  ${i + 1}. ${u.name} - $${u.wallet.commission.toFixed(2)}`);
      });
    }

    // Get today's transactions
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const profitTransactions = await Transaction.find({
      type: 'profit',
      createdAt: { $gte: startOfToday }
    }).countDocuments();

    const commissionTransactions = await Transaction.find({
      type: 'commission',
      createdAt: { $gte: startOfToday }
    }).countDocuments();

    console.log(`📈 Today's transactions created:\n`);
    console.log(`  - Profit transactions: ${profitTransactions}`);
    console.log(`  - Commission transactions: ${commissionTransactions}\n`);

  } catch (err) {
    console.error('❌ Error verifying results:', err.message);
    throw err;
  }
}

async function main() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   COMPLETE RESET & CRON RUN - WALLET VERIFICATION          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('\n✓ Connected to database\n');

    // Step 1: Reset wallets
    await resetWallets();

    // Step 2: Run cron
    const cronResult = await runCron();

    // Step 3: Verify results
    await verifyResults();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ RESET & CRON RUN COMPLETE                             ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.\n');
  }
}

main();
