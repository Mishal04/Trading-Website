const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(100));
    console.log('SIMULATING NEW WALLET.PROFIT-ONLY ROI SYSTEM');
    console.log('═'.repeat(100) + '\n');

    // Get all users with capital > 0
    const users = await User.find({
      'wallet.capital': { $gt: 0 },
      isActive: true
    }).select('_id name email wallet ancestorPath')
      .populate('ancestorPath', '_id name email wallet directCount')
      .sort({ 'wallet.capital': -1 })
      .limit(20);

    console.log(`Found ${users.length} top users with active capital\n`);

    // Helper function to get daily rate based on investment amount
    const getDailyRateByAmount = (amount) => {
      if (amount >= 10000) return 0.0125;  // 1.25% for $10k+
      if (amount >= 6000) return 0.01;    // 1% for $6k-$9k
      if (amount >= 1000) return 0.01;    // 1% for $1k-$5k
      if (amount >= 100) return 0.01;     // 1% for $100-$900
      return 0;
    };

    let totalRoiToDistribute = 0;
    const simulationData = [];

    for (const user of users) {
      const capitalAmount = user.wallet?.capital || 0;
      const dailyRate = getDailyRateByAmount(capitalAmount);
      const dailyRoi = Number((capitalAmount * dailyRate).toFixed(4));

      totalRoiToDistribute += dailyRoi;

      simulationData.push({
        name: user.name,
        email: user.email,
        capital: capitalAmount,
        dailyRate: (dailyRate * 100).toFixed(2),
        dailyRoi: dailyRoi,
        uplineCount: user.ancestorPath?.length || 0
      });
    }

    console.log('USER SIMULATION - TODAY\'S ROI CALCULATIONS:\n');
    console.log('Name'.padEnd(25) + ' Capital'.padEnd(12) + ' Rate'.padEnd(8) + ' Daily ROI'.padEnd(12) + ' Uplines');
    console.log('─'.repeat(100));

    simulationData.forEach(u => {
      console.log(
        u.name.substring(0, 24).padEnd(25) +
        `$${u.capital.toFixed(2)}`.padEnd(12) +
        `${u.dailyRate}%`.padEnd(8) +
        `$${u.dailyRoi.toFixed(4)}`.padEnd(12) +
        u.uplineCount
      );
    });

    console.log('─'.repeat(100));
    console.log('Total Daily ROI to Distribute:'.padEnd(45) + `$${totalRoiToDistribute.toFixed(2)}\n`);

    // Now simulate commission distribution for the top user
    if (simulationData.length > 0) {
      const topUser = users[0];
      const topUserRoi = simulationData[0].dailyRoi;
      
      console.log('═'.repeat(100));
      console.log(`COMMISSION SIMULATION FOR: ${topUser.name} (${topUser.email})`);
      console.log('═'.repeat(100) + '\n');
      console.log(`Daily ROI Earned: $${topUserRoi.toFixed(4)}`);
      console.log(`Upline Chain: ${topUser.ancestorPath?.length || 0} levels\n`);

      const LEVEL_RATES = require('./config/constants').LEVEL_RATES;
      
      console.log('Level | Upline Name'.padEnd(30) + ' Rate (%)'.padEnd(12) + ' Commission');
      console.log('─'.repeat(100));

      let totalCommissions = 0;

      if (topUser.ancestorPath && topUser.ancestorPath.length > 0) {
        for (let i = 0; i < Math.min(topUser.ancestorPath.length, 21); i++) {
          const upline = topUser.ancestorPath[i];
          const level = i + 1;
          const ratePercent = LEVEL_RATES[level] || 0;
          const commission = Number(((topUserRoi * ratePercent) / 100).toFixed(4));

          totalCommissions += commission;

          const uplineName = upline?.name || 'Unknown';
          console.log(
            `L${level}`.padEnd(6) +
            uplineName.substring(0, 28).padEnd(30) +
            `${ratePercent.toFixed(2)}%`.padEnd(12) +
            `$${commission.toFixed(4)}`
          );
        }
      }

      console.log('─'.repeat(100));
      console.log('Total Commissions from this user\'s ROI:'.padEnd(45) + `$${totalCommissions.toFixed(4)}\n`);

      console.log('═'.repeat(100));
      console.log('SUMMARY FOR THIS USER');
      console.log('═'.repeat(100));
      console.log(`\nCapital Balance: $${topUser.wallet?.capital || 0}`);
      console.log(`Daily ROI Credit to wallet.profit: $${topUserRoi.toFixed(4)}`);
      console.log(`Commissions paid to uplines: $${totalCommissions.toFixed(4)}`);
      console.log(`\nAFTER TODAY'S RUN:`);
      console.log(`  wallet.capital: $${topUser.wallet?.capital || 0} (unchanged)`);
      console.log(`  wallet.profit: $${(topUserRoi).toFixed(4)} (from ROI)`);
      console.log(`  wallet.commission: Not affected by ROI (separate earnings)`);
    }

    console.log('\n' + '═'.repeat(100));
    console.log('KEY POINTS:');
    console.log('═'.repeat(100));
    console.log('✓ ONLY wallet.capital ROI is calculated (Plan A InvestorInvestment disabled)');
    console.log('✓ ROI credits to wallet.profit (NOT wallet.roi)');
    console.log('✓ Each user gets ONE ROI transaction per day');
    console.log('✓ Commissions are calculated from the ROI amount and paid to uplines');
    console.log('✓ No more double-ROI (Plan A + wallet.capital both counting)');
    console.log('═'.repeat(100) + '\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    mongoose.connection.close();
    process.exit(1);
  }
})();
