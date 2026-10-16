const mongoose = require('mongoose');
const User = require('./src/models/User');
const Investment = require('./src/models/Investment');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(100));
    console.log('KHALID SIMULATION: OLD SYSTEM vs NEW SYSTEM');
    console.log('═'.repeat(100) + '\n');

    // Find Khalid
    const khalid = await User.findOne({ name: 'M Khalid' })
      .populate('ancestorPath', '_id name email wallet directCount');

    if (!khalid) {
      console.log('❌ Khalid not found');
      mongoose.connection.close();
      process.exit(1);
    }

    console.log(`User: ${khalid.name} (${khalid.email})\n`);

    // Get Khalid's current balances
    const currentCapital = khalid.wallet?.capital || 0;
    const currentProfit = khalid.wallet?.profit || 0;
    const currentCommission = khalid.wallet?.commission || 0;
    const currentRoi = khalid.wallet?.roi || 0;

    console.log('CURRENT BALANCES:');
    console.log(`  wallet.capital: $${currentCapital}`);
    console.log(`  wallet.profit: $${currentProfit}`);
    console.log(`  wallet.commission: $${currentCommission}`);
    console.log(`  wallet.roi (old field): $${currentRoi}`);
    console.log('');

    // Get Khalid's investments
    const khalidCapitalInvestments = await Investment.find({
      userId: khalid._id,
      status: 'active',
      isActive: true
    });

    console.log(`Active Investments (Plan A): ${khalidCapitalInvestments.length}`);
    khalidCapitalInvestments.forEach((inv, idx) => {
      console.log(`  ${idx + 1}. Amount: $${inv.amount}, Status: ${inv.status}`);
    });
    console.log('');

    // Calculate OLD SYSTEM (double ROI issue)
    console.log('═'.repeat(100));
    console.log('OLD SYSTEM (DOUBLE ROI - BROKEN):');
    console.log('═'.repeat(100) + '\n');

    // From Plan A investments
    let planARoi = 0;
    khalidCapitalInvestments.forEach(inv => {
      const rate = 0.01; // 1% daily
      planARoi += inv.amount * rate;
    });

    // From wallet.capital
    const walletRoi = currentCapital * 0.01; // 1% daily

    console.log(`Plan A ROI (1% on $${khalidCapitalInvestments.reduce((s, i) => s + i.amount, 0)}): $${planARoi.toFixed(4)}`);
    console.log(`Wallet ROI (1% on $${currentCapital}): $${walletRoi.toFixed(4)}`);
    console.log(`TOTAL OLD: $${(planARoi + walletRoi).toFixed(4)} (DOUBLE!)\n`);

    // Calculate commissions for old system
    const LEVEL_RATES = require('./config/constants').LEVEL_RATES;
    console.log(`Commission from OLD system ROI ($${(planARoi + walletRoi).toFixed(4)}):`);
    
    let oldCommTotal = 0;
    if (khalid.ancestorPath && khalid.ancestorPath.length > 0) {
      for (let i = 0; i < Math.min(khalid.ancestorPath.length, 10); i++) {
        const upline = khalid.ancestorPath[i];
        const level = i + 1;
        const rate = LEVEL_RATES[level] || 0;
        const comm = ((planARoi + walletRoi) * rate) / 100;
        oldCommTotal += comm;
        console.log(`  L${level} ${upline?.name || 'Unknown'}: $${comm.toFixed(4)}`);
      }
    }
    console.log(`  TOTAL COMMISSIONS (OLD): $${oldCommTotal.toFixed(4)}\n`);

    // Calculate NEW SYSTEM (wallet.capital only)
    console.log('═'.repeat(100));
    console.log('NEW SYSTEM (WALLET.PROFIT ONLY - FIXED):');
    console.log('═'.repeat(100) + '\n');

    const newSystemRoi = currentCapital * 0.01; // 1% daily from wallet.capital ONLY
    console.log(`Wallet ROI (1% on $${currentCapital}): $${newSystemRoi.toFixed(4)}`);
    console.log(`Plan A ROI: DISABLED (no more double ROI)\n`);

    // Calculate commissions for new system
    console.log(`Commission from NEW system ROI ($${newSystemRoi.toFixed(4)}):`);
    
    let newCommTotal = 0;
    if (khalid.ancestorPath && khalid.ancestorPath.length > 0) {
      for (let i = 0; i < Math.min(khalid.ancestorPath.length, 10); i++) {
        const upline = khalid.ancestorPath[i];
        const level = i + 1;
        const rate = LEVEL_RATES[level] || 0;
        const comm = (newSystemRoi * rate) / 100;
        newCommTotal += comm;
        console.log(`  L${level} ${upline?.name || 'Unknown'}: $${comm.toFixed(4)}`);
      }
    }
    console.log(`  TOTAL COMMISSIONS (NEW): $${newCommTotal.toFixed(4)}\n`);

    // Summary
    console.log('═'.repeat(100));
    console.log('SUMMARY - WHAT KHALID GETS TODAY:');
    console.log('═'.repeat(100) + '\n');

    console.log('OLD SYSTEM (Broken - Double ROI):');
    console.log(`  ROI: $${(planARoi + walletRoi).toFixed(4)}`);
    console.log(`  Commissions to Uplines: $${oldCommTotal.toFixed(4)}\n`);

    console.log('NEW SYSTEM (Fixed - wallet.capital only):');
    console.log(`  ROI Credit to wallet.profit: $${newSystemRoi.toFixed(4)}`);
    console.log(`  Commissions to Uplines: $${newCommTotal.toFixed(4)}\n`);

    console.log('DIFFERENCE:');
    console.log(`  ROI Reduction: $${(planARoi).toFixed(4)} (stopped double-counting Plan A)`);
    console.log(`  Commission Reduction: $${(oldCommTotal - newCommTotal).toFixed(4)}`);
    console.log(`  Total Reduction: $${(planARoi + oldCommTotal - newCommTotal).toFixed(4)}\n`);

    console.log('═'.repeat(100));
    console.log('AFTER TODAY\'S RUN (NEW SYSTEM):');
    console.log('═'.repeat(100));
    console.log(`wallet.capital: $${currentCapital} (UNCHANGED)`);
    console.log(`wallet.profit: $${(currentProfit + newSystemRoi).toFixed(4)} (+$${newSystemRoi.toFixed(4)} from ROI)`);
    console.log(`wallet.commission: Updates from new commission structure`);
    console.log(`wallet.roi: DEPRECATED (no longer used - read from wallet.profit)`);
    console.log('═'.repeat(100) + '\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    mongoose.connection.close();
    process.exit(1);
  }
})();
