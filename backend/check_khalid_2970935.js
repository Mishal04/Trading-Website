const mongoose = require('mongoose');
const User = require('./src/models/User');
const Investment = require('./src/models/Investment');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(100));
    console.log('KHALID (khalid2970935@gmail.com) - NEW SYSTEM CALCULATION');
    console.log('═'.repeat(100) + '\n');

    const khalid = await User.findOne({ email: 'khalid2970935@gmail.com' })
      .populate('ancestorPath', '_id name email wallet directCount');

    if (!khalid) {
      console.log('❌ User not found');
      mongoose.connection.close();
      process.exit(1);
    }

    console.log(`User: ${khalid.name} (${khalid.email})\n`);

    // Current balances
    const capital = khalid.wallet?.capital || 0;
    const currentProfit = khalid.wallet?.profit || 0;
    const currentComm = khalid.wallet?.commission || 0;
    const currentRoi = khalid.wallet?.roi || 0;

    console.log('CURRENT WALLET STATE:');
    console.log(`  wallet.capital: $${capital}`);
    console.log(`  wallet.profit: $${currentProfit}`);
    console.log(`  wallet.commission: $${currentComm}`);
    console.log(`  wallet.roi (old field): $${currentRoi}`);
    console.log('');

    // Check investments
    const invs = await Investment.find({
      userId: khalid._id,
      status: 'active',
      isActive: true
    });

    console.log(`Active Investments (Plan A): ${invs.length}`);
    invs.forEach((inv, i) => {
      console.log(`  ${i + 1}. $${inv.amount}`);
    });
    console.log('');

    // Calculate new system ROI
    if (capital <= 0) {
      console.log('⚠️ No capital - no ROI will be earned');
      mongoose.connection.close();
      process.exit(0);
    }

    const dailyRate = 0.01; // 1% for $100-$999
    const dailyRoi = capital * dailyRate;

    console.log('═'.repeat(100));
    console.log('NEW SYSTEM: TODAY\'S EARNINGS');
    console.log('═'.repeat(100) + '\n');

    console.log(`Capital: $${capital}`);
    console.log(`Daily Rate: 1.00% (for $100-$999 range)`);
    console.log(`Daily ROI: $${capital} × 1% = $${dailyRoi.toFixed(4)}`);
    console.log(`ROI Credit: wallet.profit\n`);

    // Commission calculation
    const LEVEL_RATES = require('./config/constants').LEVEL_RATES;
    console.log('Commissions from today\'s ROI ($' + dailyRoi.toFixed(4) + '):');
    
    let totalComm = 0;
    if (khalid.ancestorPath && khalid.ancestorPath.length > 0) {
      console.log('\nLevel | Upline'.padEnd(35) + ' Rate (%)'.padEnd(12) + ' Commission');
      console.log('─'.repeat(100));
      for (let i = 0; i < Math.min(khalid.ancestorPath.length, 21); i++) {
        const upline = khalid.ancestorPath[i];
        const level = i + 1;
        const rate = LEVEL_RATES[level] || 0;
        const comm = (dailyRoi * rate) / 100;
        totalComm += comm;
        console.log(
          `L${level}`.padEnd(7) +
          (upline?.name || 'Unknown').substring(0, 28).padEnd(35) +
          `${rate.toFixed(2)}%`.padEnd(12) +
          `$${comm.toFixed(4)}`
        );
      }
      console.log('─'.repeat(100));
      console.log('TOTAL COMMISSIONS:'.padEnd(45) + `$${totalComm.toFixed(4)}\n`);
    } else {
      console.log('No uplines - no commissions\n');
    }

    console.log('═'.repeat(100));
    console.log('AFTER TODAY\'S CRON RUN:');
    console.log('═'.repeat(100));
    console.log(`\nwallet.capital: $${capital} (UNCHANGED)`);
    console.log(`wallet.profit: $${(currentProfit + dailyRoi).toFixed(4)} (was $${currentProfit}, +$${dailyRoi.toFixed(4)})`);
    console.log(`wallet.commission: Updates based on new commission from his downline ROI`);
    console.log(`\n✓ SINGLE ROI SOURCE: wallet.capital only`);
    console.log(`✓ NO DOUBLE ROI: Plan A InvestorInvestment disabled`);
    console.log('═'.repeat(100) + '\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    mongoose.connection.close();
    process.exit(1);
  }
})();
