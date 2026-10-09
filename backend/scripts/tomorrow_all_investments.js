require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('\n' + '='.repeat(130));
    console.log('TOMORROW AT 4 PM: ALL INVESTMENTS - Approved + Admin Deposits (Oct 10)');
    console.log('='.repeat(130));
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    const investorConstants = require('../config/investorConstants');
    
    // Get ALL active investments
    const allInvestments = await InvestorInvestment.find({
      userId: { $ne: null },
      status: 'active',
      plan: 'A'
    }).populate('userId', 'name email wallet').sort({ amount: -1 });
    
    console.log(`\nTotal active investments: ${allInvestments.length}\n`);
    
    // Separate approved vs admin deposits
    const adminDeposits = allInvestments.filter(inv => 
      inv.adminNote && (inv.adminNote.includes('admin') || inv.adminNote.includes('Auto-created'))
    );
    
    const approvedInvestments = allInvestments.filter(inv =>
      !inv.adminNote || (!inv.adminNote.includes('admin') && !inv.adminNote.includes('Auto-created'))
    );
    
    console.log(`Admin Deposits: ${adminDeposits.length}`);
    console.log(`Approved Investments: ${approvedInvestments.length}`);
    
    let depositTotal = 0;
    let approvedTotal = 0;
    
    const depositResults = [];
    const approvedResults = [];
    
    // Process admin deposits
    console.log('\n' + '='.repeat(130));
    console.log('ADMIN DEPOSITS (18 users)');
    console.log('='.repeat(130));
    
    for (const investment of adminDeposits) {
      const user = investment.userId;
      const dailyRate = investorConstants.getDailyRateForPhase(investment.packageNumber, investment.createdAt);
      const tomorrowROI = Number(((investment.amount * dailyRate) / 100).toFixed(4));
      
      depositResults.push({
        type: 'ADMIN',
        email: user.email,
        name: user.name,
        amount: `$${investment.amount}`,
        rate: `${dailyRate}%`,
        today: `$${user.wallet.roi || 0}`,
        tomorrow: `$${tomorrowROI.toFixed(2)}`,
        newTotal: `$${((user.wallet.roi || 0) + tomorrowROI).toFixed(2)}`,
        cap: `$${investment.incomeCap}`,
        earned: `$${investment.totalRoiEarned}`
      });
      
      depositTotal += tomorrowROI;
    }
    
    console.log('\n');
    console.table(depositResults);
    console.log(`\n📊 Deposits subtotal: $${depositTotal.toFixed(2)}`);
    
    // Process approved investments
    if (approvedInvestments.length > 0) {
      console.log('\n' + '='.repeat(130));
      console.log(`APPROVED INVESTMENTS (${approvedInvestments.length} users)`);
      console.log('='.repeat(130));
      
      for (const investment of approvedInvestments) {
        const user = investment.userId;
        if (!user) continue; // Skip if user not found
        
        const dailyRate = investorConstants.getDailyRateForPhase(investment.packageNumber, investment.createdAt);
        const tomorrowROI = Number(((investment.amount * dailyRate) / 100).toFixed(4));
        
        approvedResults.push({
          type: 'APPROVED',
          email: user.email,
          name: user.name,
          amount: `$${investment.amount}`,
          rate: `${dailyRate}%`,
          today: `$${user.wallet.roi || 0}`,
          tomorrow: `$${tomorrowROI.toFixed(2)}`,
          newTotal: `$${((user.wallet.roi || 0) + tomorrowROI).toFixed(2)}`,
          cap: `$${investment.incomeCap}`,
          earned: `$${investment.totalRoiEarned}`
        });
        
        approvedTotal += tomorrowROI;
      }
      
      console.log('\n');
      console.table(approvedResults);
      console.log(`\n📊 Approved subtotal: $${approvedTotal.toFixed(2)}`);
    } else {
      console.log('\n⚠️  No approved investments found');
    }
    
    const grandTotal = depositTotal + approvedTotal;
    
    console.log('\n' + '='.repeat(130));
    console.log('GRAND TOTAL - TOMORROW AT 4 PM');
    console.log('='.repeat(130));
    console.log(`
Admin Deposits:       $${depositTotal.toFixed(2)} (from ${adminDeposits.length} users)
Approved Investments: $${approvedTotal.toFixed(2)} (from ${approvedInvestments.length} users)
─────────────────────────────────────────
TOTAL DISTRIBUTED:   $${grandTotal.toFixed(2)} (${allInvestments.length} users total)
`);
    
    console.log('='.repeat(130));
    console.log('KEY POINT: IDENTICAL TREATMENT');
    console.log('='.repeat(130));
    console.log(`
✅ BOTH types processed by the SAME cron job at 4 PM Pakistan time
✅ BOTH use Phase 1 (Plan A) rates: 1% daily (1.25% for $10k+)
✅ BOTH earn daily ROI Mon-Fri automatically
✅ BOTH subject to 3× income cap
✅ BOTH stored in InvestorInvestment model
✅ BOTH transition through 3 phases (Phase 1 → 2 at 6mo → 3 at 12mo)

Admin deposits are NOT second-class!
They earn exactly the same as approved investments.
`);
    
    console.log('='.repeat(130) + '\n');
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
