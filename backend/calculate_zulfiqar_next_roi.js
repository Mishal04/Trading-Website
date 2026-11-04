const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(100));
    console.log('ZULFIQAR (fk634760@gmail.com) - NEXT ROI CALCULATION');
    console.log('═'.repeat(100) + '\n');

    const zulfiqar = await User.findOne({ email: 'fk634760@gmail.com' })
      .populate('ancestorPath', '_id name email wallet directCount');

    if (!zulfiqar) {
      console.log('❌ User not found');
      mongoose.connection.close();
      process.exit(1);
    }

    console.log(`User: ${zulfiqar.name} (${zulfiqar.email})\n`);

    // Current state
    const capital = zulfiqar.wallet?.capital || 0;
    const currentProfit = zulfiqar.wallet?.profit || 0;
    const currentComm = zulfiqar.wallet?.commission || 0;

    console.log('CURRENT WALLET STATE:');
    console.log(`  wallet.capital: $${capital}`);
    console.log(`  wallet.profit: $${currentProfit}`);
    console.log(`  wallet.commission: $${currentComm}\n`);

    if (capital <= 0) {
      console.log('⚠️ No capital - no ROI will be earned\n');
      mongoose.connection.close();
      process.exit(0);
    }

    // Calculate next ROI
    const dailyRate = capital >= 10000 ? 0.0125 : 0.01; // 1.25% for $10k+, 1% otherwise
    const dailyRoi = capital * dailyRate;

    console.log('═'.repeat(100));
    console.log('NEXT CRON RUN - ROI EARNINGS');
    console.log('═'.repeat(100) + '\n');

    console.log(`Capital: $${capital}`);
    console.log(`Daily Rate: ${(dailyRate * 100).toFixed(2)}%`);
    console.log(`Daily ROI: $${capital} × ${(dailyRate * 100).toFixed(2)}% = $${dailyRoi.toFixed(4)}`);
    console.log(`\nROI Credit: wallet.profit`);
    console.log(`\nAFTER NEXT CRON RUN:`);
    console.log(`  wallet.capital: $${capital} (UNCHANGED)`);
    console.log(`  wallet.profit: $${(currentProfit + dailyRoi).toFixed(4)} (was $${currentProfit}, +$${dailyRoi.toFixed(4)})`);
    console.log(`  wallet.commission: Depends on downline ROI\n`);

    // Commission calculation if has uplines
    const LEVEL_RATES = require('./config/constants').LEVEL_RATES;
    console.log('═'.repeat(100));
    console.log('COMMISSION FROM HIS DOWNLINE ROI');
    console.log('═'.repeat(100) + '\n');

    if (!zulfiqar.ancestorPath || zulfiqar.ancestorPath.length === 0) {
      console.log('No uplines - Zulfiqar will not earn commissions from his own ROI\n');
    } else {
      console.log(`Upline chain: ${zulfiqar.ancestorPath.length} levels\n`);
      console.log('His uplines will earn commissions from his $' + dailyRoi.toFixed(4) + ' ROI:\n');
      
      let totalCommFromHim = 0;
      console.log('Level | Upline Name'.padEnd(35) + ' Rate (%)'.padEnd(12) + ' Commission');
      console.log('─'.repeat(100));
      
      for (let i = 0; i < Math.min(zulfiqar.ancestorPath.length, 21); i++) {
        const upline = zulfiqar.ancestorPath[i];
        const level = i + 1;
        const rate = LEVEL_RATES[level] || 0;
        const comm = (dailyRoi * rate) / 100;
        totalCommFromHim += comm;
        
        console.log(
          `L${level}`.padEnd(7) +
          (upline?.name || 'Unknown').substring(0, 28).padEnd(35) +
          `${rate.toFixed(2)}%`.padEnd(12) +
          `$${comm.toFixed(4)}`
        );
      }
      console.log('─'.repeat(100));
      console.log('Total commissions PAID OUT to uplines:'.padEnd(45) + `$${totalCommFromHim.toFixed(4)}\n`);
    }

    console.log('═'.repeat(100));
    console.log('SUMMARY - ZULFIQAR\'S NEXT ROI');
    console.log('═'.repeat(100));
    console.log(`\n✓ ROI earned: $${dailyRoi.toFixed(4)}`);
    console.log(`✓ ROI credit to: wallet.profit`);
    console.log(`✓ New profit balance: $${(currentProfit + dailyRoi).toFixed(4)}`);
    console.log(`✓ Source: wallet.capital ONLY (1% daily rate)`);
    console.log(`✓ No Plan A double-counting\n`);
    console.log('═'.repeat(100) + '\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    mongoose.connection.close();
    process.exit(1);
  }
})();
