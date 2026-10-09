require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('\n' + '='.repeat(120));
    console.log('MANUAL BACKFILL: Users with admin deposits who missed ROI');
    console.log('='.repeat(120));
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    const Transaction = require('../src/models/Transaction');
    const Notification = require('../src/models/Notification');
    const investorConstants = require('../config/investorConstants');
    
    // Based on the UI evidence, we know:
    // Naveed: $1000 deposit Oct 5, only got $10 ROI (1 day)
    // Should have: 5 trading days (Mon Oct 6, Tue Oct 7, Wed Oct 8, Thu Oct 9, Fri Oct 9 - wait let me recalc)
    // Oct 5 = Sunday (no trading)
    // Oct 6 = Monday (trading day 1)
    // Oct 7 = Tuesday (trading day 2)
    // Oct 8 = Wednesday (trading day 3)
    // Oct 9 = Thursday (trading day 4)
    // So 4 trading days total, but already got 1, so missing 3 days = $30
    
    // Find all admin deposits that might be missing ROI
    const adminDeposits = await InvestorInvestment.find({
      userId: { $ne: null },
      status: 'active',
      plan: 'A',
      adminNote: { $regex: /admin.*deposit|Auto-created/i }
    }).populate('userId', 'name email');
    
    console.log(`\nAnalyzing ${adminDeposits.length} admin deposits...\n`);
    
    let creditedCount = 0;
    let totalBackfilled = 0;
    const results = [];
    
    for (const investment of adminDeposits) {
      try {
        const user = investment.userId;
        if (!user) continue;
        
        const createdDate = new Date(investment.createdAt);
        
        // Calculate expected days based on investment creation
        // Admin deposits were created on Oct 9, but they represent deposits made earlier
        // For Oct 9 created investments: 1 trading day already credited (Oct 9 itself)
        
        // But we need to look at user.wallet.roi vs investment.totalRoiEarned
        // If wallet is $10 but investment totalRoiEarned is also $10, they got only 1 day
        
        // Check if this looks like an old deposit
        const dailyRate = investorConstants.getDailyRateForPhase(investment.packageNumber, investment.createdAt);
        const expectedDailyROI = Number(((investment.amount * dailyRate) / 100).toFixed(4));
        
        const currentROI = investment.totalRoiEarned || 0;
        
        // If they only got 1 day of ROI, they likely deposited earlier
        if (currentROI === expectedDailyROI) {
          console.log(`\n📊 ${user.email} - Likely missed ROI`);
          console.log(`   Amount: $${investment.amount}`);
          console.log(`   Daily rate: ${dailyRate}%`);
          console.log(`   Has: $${currentROI} (looks like 1 day only)`);
          
          // Calculate Oct 5-9 trading days
          // Oct 5 = Sun (no), Oct 6 = Mon (yes), Oct 7 = Tue (yes), Oct 8 = Wed (yes), Oct 9 = Thu (yes)
          // That's 4 trading days from Oct 6-9
          // Already got 1 = missing 3
          
          const missingDays = 3; // Oct 6, 7, 8 were missed
          const backfillAmount = Number((expectedDailyROI * missingDays).toFixed(4));
          
          console.log(`   Missing: ${missingDays} days × $${expectedDailyROI.toFixed(4)} = $${backfillAmount.toFixed(2)}`);
          
          // Credit
          await User.findByIdAndUpdate(user._id, {
            $inc: {
              'wallet.roi': backfillAmount,
              totalRoiEarned: backfillAmount
            }
          });
          
          // Update investment
          await InvestorInvestment.findByIdAndUpdate(investment._id, {
            $inc: { totalRoiEarned: backfillAmount }
          });
          
          // Create transaction
          await Transaction.create({
            userId: user._id,
            type: 'profit',
            amount: backfillAmount,
            status: 'completed',
            description: `Backfilled ROI: ${missingDays} missed trading days × $${expectedDailyROI.toFixed(4)}/day (Oct 6-8)`,
            referenceId: investment._id,
            referenceModel: 'InvestorInvestment'
          });
          
          // Notification
          await Notification.create({
            userId: user._id,
            title: 'Backfilled ROI Credited',
            message: `Your account has been credited $${backfillAmount.toFixed(2)} in backfilled ROI for 3 missed trading days. Total ROI: $${(currentROI + backfillAmount).toFixed(2)}.`,
            type: 'profit'
          });
          
          creditedCount++;
          totalBackfilled += backfillAmount;
          
          results.push({
            email: user.email,
            amount: `$${investment.amount}`,
            dailyRate: `${dailyRate}%`,
            alreadyHad: `$${currentROI.toFixed(2)}`,
            backfilled: `$${backfillAmount.toFixed(2)}`,
            newTotal: `$${(currentROI + backfillAmount).toFixed(2)}`,
            status: '✓ CREDITED'
          });
          
          console.log(`   ✓ Credited $${backfillAmount.toFixed(2)}`);
        }
        
      } catch (err) {
        console.error(`Error:`, err.message);
        results.push({
          email: 'Unknown',
          status: `ERROR: ${err.message}`
        });
      }
    }
    
    console.log('\n' + '='.repeat(120));
    console.log('RESULTS');
    console.log('='.repeat(120));
    console.log('\n');
    console.table(results);
    
    console.log('\n' + '='.repeat(120));
    console.log('SUMMARY');
    console.log('='.repeat(120));
    console.log(`
✓ Users credited: ${creditedCount}
✓ Total ROI backfilled: $${totalBackfilled.toFixed(2)}
`);
    
    console.log('='.repeat(120) + '\n');
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
