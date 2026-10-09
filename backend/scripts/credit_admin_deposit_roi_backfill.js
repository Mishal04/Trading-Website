require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('\n' + '='.repeat(100));
    console.log('CREDIT: Backfill ROI for all admin deposit users who missed daily ROI');
    console.log('='.repeat(100));
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    const Transaction = require('../src/models/Transaction');
    const Notification = require('../src/models/Notification');
    const investorConstants = require('../config/investorConstants');
    
    // Find all admin deposits created via backfill (they have small ROI amounts, created Oct 9)
    const adminDeposits = await InvestorInvestment.find({
      userId: { $ne: null },
      status: 'active',
      plan: 'A',
      adminNote: { $regex: /admin.*deposit|Auto-created investment/i }
    }).populate('userId', 'name email wallet');
    
    console.log(`\nFound ${adminDeposits.length} admin deposit users to credit\n`);
    
    if (adminDeposits.length === 0) {
      console.log('✓ No admin deposits found\n');
      mongoose.disconnect();
      return;
    }
    
    let totalCredited = 0;
    const results = [];
    
    for (const investment of adminDeposits) {
      try {
        const user = investment.userId;
        if (!user) continue;
        
        // Calculate what they should have earned so far (from creation to today)
        const createdDate = new Date(investment.createdAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Count trading days (no weekends, cron runs Mon-Fri)
        let tradingDays = 0;
        let currentDate = new Date(createdDate);
        currentDate.setHours(0, 0, 0, 0);
        
        while (currentDate < today) {
          const dayOfWeek = currentDate.getDay();
          // Cron runs Mon-Fri only (1-5)
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            tradingDays++;
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        if (tradingDays === 0) {
          results.push({
            email: user.email,
            name: user.name,
            amount: investment.amount,
            status: 'SKIPPED - No trading days yet'
          });
          continue;
        }
        
        // Get daily rate for Phase 1 (current phase for Oct 9 investments)
        const phase = investorConstants.getInvestmentPhase(createdDate);
        const dailyRate = investorConstants.getDailyRateForPhase(investment.packageNumber, createdDate);
        const dailyRoiAmount = Number(((investment.amount * dailyRate) / 100).toFixed(4));
        
        // Calculate what they SHOULD have earned
        const shouldHaveEarned = Number((dailyRoiAmount * tradingDays).toFixed(4));
        
        // How much they're missing (totalRoiEarned is only from cron, not backfilled yet)
        const alreadyHave = investment.totalRoiEarned || 0;
        const backfillAmount = Number((shouldHaveEarned - alreadyHave).toFixed(4));
        
        if (backfillAmount <= 0) {
          results.push({
            email: user.email,
            name: user.name,
            amount: investment.amount,
            status: `SKIPPED - Already has $${alreadyHave}`
          });
          continue;
        }
        
        // Check if this would exceed income cap
        const projectedTotal = alreadyHave + backfillAmount;
        const capReached = projectedTotal >= investment.incomeCap;
        
        // Credit to wallet
        await User.findByIdAndUpdate(user._id, {
          $inc: {
            'wallet.roi': backfillAmount,
            totalRoiEarned: backfillAmount
          }
        });
        
        // Update investment record
        await InvestorInvestment.findByIdAndUpdate(investment._id, {
          $inc: { totalRoiEarned: backfillAmount },
          $set: { 
            lastRoiDate: new Date(),
            capReached: capReached,
            status: capReached ? 'completed' : 'active'
          }
        });
        
        // Create transaction for backfill
        await Transaction.create({
          userId: user._id,
          type: 'profit',
          amount: backfillAmount,
          status: 'completed',
          description: `Backfilled ROI: ${tradingDays} trading days × $${dailyRoiAmount.toFixed(4)}/day (Phase ${phase}, ${dailyRate}% daily) from ${createdDate.toDateString()}${capReached ? ' (income cap reached)' : ''}`,
          referenceId: investment._id,
          referenceModel: 'InvestorInvestment'
        });
        
        // Notify user
        await Notification.create({
          userId: user._id,
          title: 'Backfilled ROI Credited',
          message: `Your account has been credited $${backfillAmount.toFixed(2)} in backfilled ROI for ${tradingDays} trading days. Total ROI earned: $${projectedTotal.toFixed(2)}.${capReached ? ' (Income cap reached)' : ''}`,
          type: 'profit'
        });
        
        results.push({
          email: user.email,
          name: user.name,
          amount: investment.amount,
          tradingDays,
          dailyRate: `${dailyRate}%`,
          dailyRoiAmount: `$${dailyRoiAmount.toFixed(4)}`,
          backfillAmount: `$${backfillAmount.toFixed(2)}`,
          alreadyHave: `$${alreadyHave.toFixed(2)}`,
          newTotal: `$${projectedTotal.toFixed(2)}`,
          incomeCap: `$${investment.incomeCap}`,
          capReached: capReached ? '✓ YES' : '✗ No',
          status: 'CREDITED'
        });
        
        totalCredited += backfillAmount;
        
      } catch (err) {
        console.error(`Error processing user ${investment.userId?.email}:`, err.message);
        results.push({
          email: investment.userId?.email || 'Unknown',
          name: investment.userId?.name || 'Unknown',
          status: `ERROR: ${err.message}`
        });
      }
    }
    
    console.log('\n' + '='.repeat(100));
    console.log('BACKFILL RESULTS');
    console.log('='.repeat(100));
    
    // Print table
    console.log('\n');
    console.table(results);
    
    console.log('\n' + '='.repeat(100));
    console.log('SUMMARY');
    console.log('='.repeat(100));
    const credited = results.filter(r => r.status === 'CREDITED').length;
    const skipped = results.filter(r => r.status?.includes('SKIPPED')).length;
    const errors = results.filter(r => r.status?.includes('ERROR')).length;
    
    console.log(`✓ Credited: ${credited} users`);
    console.log(`- Skipped: ${skipped} users`);
    console.log(`- Errors: ${errors} users`);
    console.log(`\nTotal ROI distributed: $${totalCredited.toFixed(2)}`);
    
    console.log('\n✅ BACKFILL COMPLETE\n');
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
