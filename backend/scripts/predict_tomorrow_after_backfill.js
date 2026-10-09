require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('\n' + '='.repeat(120));
    console.log('TOMORROW\'S ROI: What all admin deposit users will earn (Oct 10, 4 PM Pakistan time)');
    console.log('='.repeat(120));
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    const investorConstants = require('../config/investorConstants');
    
    // Get all admin deposits
    const adminDeposits = await InvestorInvestment.find({
      userId: { $ne: null },
      status: 'active',
      plan: 'A',
      adminNote: { $regex: /admin.*deposit|Auto-created/i }
    }).populate('userId', 'name email wallet').sort({ amount: -1 });
    
    console.log(`\nAnalyzing ${adminDeposits.length} users\n`);
    
    let grandTotalTomorrow = 0;
    const results = [];
    
    for (const investment of adminDeposits) {
      try {
        const user = investment.userId;
        if (!user) continue;
        
        // Calculate tomorrow's ROI
        const dailyRate = investorConstants.getDailyRateForPhase(investment.packageNumber, investment.createdAt);
        const tomorrowROI = Number(((investment.amount * dailyRate) / 100).toFixed(4));
        
        const currentWalletROI = user.wallet.roi || 0;
        const currentInvestmentROI = investment.totalRoiEarned || 0;
        
        const newWalletROI = Number((currentWalletROI + tomorrowROI).toFixed(2));
        const newInvestmentROI = Number((currentInvestmentROI + tomorrowROI).toFixed(2));
        
        // Check if cap will be reached
        const capReached = newInvestmentROI >= investment.incomeCap;
        
        results.push({
          email: user.email,
          name: user.name,
          amount: `$${investment.amount}`,
          dailyRate: `${dailyRate}%`,
          today: `$${currentWalletROI}`,
          tomorrow: `$${tomorrowROI.toFixed(4)}`,
          newTotal: `$${newWalletROI}`,
          cap: `$${investment.incomeCap}`,
          capReached: capReached ? '⚠️ YES' : '✗ No',
          status: capReached ? 'LAST DAY' : 'CONTINUE'
        });
        
        grandTotalTomorrow += tomorrowROI;
        
      } catch (err) {
        console.error(`Error:`, err.message);
      }
    }
    
    console.log('='.repeat(120));
    console.log('TOMORROW\'S EARNINGS BY USER');
    console.log('='.repeat(120));
    console.log('\n');
    console.table(results);
    
    console.log('\n' + '='.repeat(120));
    console.log('HIGHLIGHTS');
    console.log('='.repeat(120));
    
    // Find top earners
    const sorted = [...results].sort((a, b) => {
      const aVal = parseFloat(a.tomorrow);
      const bVal = parseFloat(b.tomorrow);
      return bVal - aVal;
    });
    
    console.log(`\n🏆 TOP 5 EARNERS TOMORROW:`);
    sorted.slice(0, 5).forEach((user, idx) => {
      console.log(`   ${idx + 1}. ${user.name} (${user.email}): ${user.tomorrow}`);
    });
    
    console.log(`\n💰 GRAND TOTAL DISTRIBUTED TOMORROW: $${grandTotalTomorrow.toFixed(2)}`);
    console.log(`   (All 18 users combined earning for Oct 10)\n`);
    
    console.log('='.repeat(120));
    console.log('WHAT HAPPENS AT 4 PM PAKISTAN TIME (OCT 10)');
    console.log('='.repeat(120));
    console.log(`
1. Cron job runs automatically
2. For EACH active InvestorInvestment:
   ✓ Detect current phase (Phase 1 for Oct 9 investments)
   ✓ Get daily rate for that phase (1% for all)
   ✓ Calculate: amount × rate = daily ROI
   ✓ Check if would exceed 3× income cap
   ✓ Credit to wallet.roi
   ✓ Create profit transaction
   ✓ Send "ROI Credited" notification

3. ALL 18 USERS earn their daily ROI automatically
   - No manual intervention needed
   - Continues daily Mon-Fri

4. EXAMPLE - Naveed:
   Current wallet: $40
   Tomorrow: +$10 (1% of $1000)
   New wallet: $50
`);
    
    console.log('='.repeat(120) + '\n');
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
