const mongoose = require('mongoose');
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');
const Transaction = require('./src/models/Transaction');
const CronLock = require('./src/models/CronLock');
const { calculateDailyProfits } = require('./src/services/profitService');

require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(80));
    console.log('TESTING COMPLETE FLOW: Investment → Daily ROI → 21-Level Commission');
    console.log('═'.repeat(80));

    // Test Case 1: M Khalid (approved InvestorInvestment only)
    console.log('\n✓ TEST CASE 1: M Khalid ($5,000 approved InvestorInvestment)');
    const mkhalid = await User.findOne({ name: 'M Khalid' })
      .select('_id name wallet totalInvested ancestorPath')
      .populate('ancestorPath', '_id name');
    
    if (!mkhalid) {
      console.log('  ❌ M Khalid not found');
    } else {
      console.log(`  Before: wallet.roi=$${mkhalid.wallet?.roi || 0}, upline levels=${mkhalid.ancestorPath?.length || 0}`);
      
      const invInv = await InvestorInvestment.findOne({ userId: mkhalid._id, amount: 5000 });
      if (invInv) {
        console.log(`  Investment: $${invInv.amount}, status=${invInv.status}, approvedBy=${invInv.approvedBy ? 'YES' : 'NO'}`);
      }
    }

    // Test Case 2: M Kszhalid (mixed: one approved, one not)
    console.log('\n✓ TEST CASE 2: M Kszhalid (mixed approved/unapproved)');
    const kszhalid = await User.findOne({ name: 'M Kszhalid' })
      .select('_id name wallet totalInvested ancestorPath')
      .populate('ancestorPath', '_id name');
    
    if (!kszhalid) {
      console.log('  ❌ M Kszhalid not found');
    } else {
      console.log(`  Before: wallet.roi=$${kszhalid.wallet?.roi || 0}`);
      
      const invInvs = await InvestorInvestment.find({ userId: kszhalid._id });
      invInvs.forEach(inv => {
        console.log(`    - $${inv.amount}, status=${inv.status}, approvedBy=${inv.approvedBy ? 'YES' : 'NO'}`);
      });
    }

    // Test Case 3: User with wallet.capital
    console.log('\n✓ TEST CASE 3: User with wallet.capital (admin deposit)');
    const walletUser = await User.findOne({ 'wallet.capital': { $gt: 0 } })
      .select('_id name wallet ancestorPath')
      .populate('ancestorPath', '_id name');
    
    if (walletUser) {
      console.log(`  User: ${walletUser.name}`);
      console.log(`  Before: wallet.capital=$${walletUser.wallet?.capital}, wallet.roi=$${walletUser.wallet?.roi || 0}`);
    }

    // Run Phase 1 + Phase 2
    console.log('\n' + '═'.repeat(80));
    console.log('RUNNING Daily Profit Calculation (Phase 1 + Phase 2)');
    console.log('═'.repeat(80));

    const result = await calculateDailyProfits();

    console.log('\n' + '═'.repeat(80));
    console.log('RESULTS');
    console.log('═'.repeat(80));
    console.log(`  Investments Processed: ${result.processedCount}`);
    console.log(`  Total ROI Distributed: $${result.totalProfitDistributed.toFixed(2)}`);
    console.log(`  Investors with Commissions: ${result.investorsWithCommissions}`);

    // Verify results
    console.log('\n' + '═'.repeat(80));
    console.log('VERIFICATION');
    console.log('═'.repeat(80));

    // Check M Khalid received ROI
    const mkhalidAfter = await User.findOne({ name: 'M Khalid' });
    console.log(`\n✓ M Khalid After:`);
    console.log(`  wallet.roi=$${mkhalidAfter.wallet?.roi.toFixed(2)}`);
    console.log(`  Expected: $50 (from $5000 × 1% Phase 1)`);
    console.log(`  Status: ${mkhalidAfter.wallet?.roi > 0 ? '✅ PASS' : '❌ FAIL'}`);

    // Check upline received commission
    if (mkhalid && mkhalid.ancestorPath && mkhalid.ancestorPath.length > 0) {
      const l1upline = mkhalid.ancestorPath[0];
      const l1After = await User.findById(l1upline._id);
      const l1CommTx = await Transaction.findOne({
        userId: l1upline._id,
        type: 'commission',
        createdAt: { $gte: new Date(new Date().toDateString()) }
      });
      
      console.log(`\n✓ L1 Upline (${l1upline.name}) After:`);
      console.log(`  wallet.commission=$${l1After.wallet?.commission.toFixed(2)}`);
      console.log(`  Expected: $12.50+ (25% of M Khalid's ROI)`);
      console.log(`  Status: ${l1CommTx ? '✅ PASS' : '⚠️  CHECK'}`);
    }

    // Check CronLock
    const locks = await CronLock.find({ jobName: 'dailyProfits' }).sort({ createdAt: -1 }).limit(5);
    console.log(`\n✓ CronLock Status:`);
    console.log(`  Total locks: ${locks.length}`);
    locks.forEach(lock => {
      console.log(`    - ${lock.dateKey}: ${lock.status} (${lock.instanceId})`);
    });

    console.log('\n' + '═'.repeat(80));
    console.log('TEST COMPLETE');
    console.log('═'.repeat(80) + '\n');

    process.exit(0);
  } catch(e) {
    console.error('Test Error:', e.message);
    console.error(e);
    process.exit(1);
  }
})();
