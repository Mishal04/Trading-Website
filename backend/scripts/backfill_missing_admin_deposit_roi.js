require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('\n' + '='.repeat(120));
    console.log('BACKFILL: ROI for admin deposits made BEFORE Oct 9 (missed daily ROI)');
    console.log('='.repeat(120));
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const Transaction = require('../src/models/Transaction');
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    const Notification = require('../src/models/Notification');
    const investorConstants = require('../config/investorConstants');
    
    // Step 1: Find admin deposits made BEFORE Oct 9
    console.log('\n[1/6] Finding admin deposits made before Oct 9...');
    
    const adminDepositTxs = await Transaction.find({
      type: 'admin_deposit',
      'metadata.walletType': 'capital',
      createdAt: { $lt: new Date('2026-10-09T00:00:00Z') }
    }).sort({ createdAt: 1 });
    
    console.log(`Found ${adminDepositTxs.length} admin deposits before Oct 9\n`);
    
    if (adminDepositTxs.length === 0) {
      console.log('✓ No pre-Oct 9 deposits found\n');
      mongoose.disconnect();
      return;
    }
    
    // Step 2-6: Process each deposit
    let creditedUsers = 0;
    let totalBackfilled = 0;
    const results = [];
    
    for (const tx of adminDepositTxs) {
      try {
        const user = await User.findById(tx.userId);
        if (!user) {
          console.log(`⚠️  User not found for tx ${tx._id}`);
          continue;
        }
        
        // Find the corresponding InvestorInvestment
        const investment = await InvestorInvestment.findOne({
          userId: user._id,
          amount: tx.amount,
          plan: 'A',
          adminNote: { $regex: /admin.*deposit|Auto-created/i }
        });
        
        if (!investment) {
          console.log(`⚠️  No InvestorInvestment found for ${user.email} ($${tx.amount})`);
          results.push({
            email: user.email,
            name: user.name,
            depositDate: tx.createdAt.toISOString().split('T')[0],
            amount: `$${tx.amount}`,
            status: 'SKIP - No investment record'
          });
          continue;
        }
        
        // Calculate missing days
        const depositDate = new Date(tx.createdAt);
        depositDate.setHours(0, 0, 0, 0);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Count trading days (Mon-Fri only, cron runs these days)
        let tradingDays = 0;
        let currentDate = new Date(depositDate);
        
        while (currentDate < today) {
          const dayOfWeek = currentDate.getDay();
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            tradingDays++;
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        if (tradingDays <= 0) {
          results.push({
            email: user.email,
            name: user.name,
            depositDate: tx.createdAt.toISOString().split('T')[0],
            amount: `$${tx.amount}`,
            status: 'SKIP - No trading days passed'
          });
          continue;
        }
        
        // Step 2: Calculate daily rate and missing ROI
        console.log(`\n[2/6] ${user.email} - Calculating missing ROI...`);
        
        const phase = investorConstants.getInvestmentPhase(investment.createdAt);
        const dailyRate = investorConstants.getDailyRateForPhase(investment.packageNumber, investment.createdAt);
        const dailyRoiAmount = Number(((investment.amount * dailyRate) / 100).toFixed(4));
        
        // They already got today's ROI (Oct 9), so missing = total - 1 day
        const shouldHaveEarned = Number((dailyRoiAmount * tradingDays).toFixed(4));
        const alreadyHave = investment.totalRoiEarned || 0;
        const backfillAmount = Number((shouldHaveEarned - alreadyHave).toFixed(4));
        
        console.log(`   Deposit: ${depositDate.toISOString().split('T')[0]} | Amount: $${investment.amount}`);
        console.log(`   Trading days: ${tradingDays} | Daily ROI: $${dailyRoiAmount.toFixed(4)}`);
        console.log(`   Should have: $${shouldHaveEarned.toFixed(2)} | Already has: $${alreadyHave.toFixed(2)}`);
        console.log(`   Missing: $${backfillAmount.toFixed(2)}`);
        
        if (backfillAmount <= 0) {
          results.push({
            email: user.email,
            name: user.name,
            depositDate: tx.createdAt.toISOString().split('T')[0],
            amount: `$${investment.amount}`,
            status: 'SKIP - Already current'
          });
          continue;
        }
        
        // Step 3: Credit to wallet
        console.log(`[3/6] Crediting wallet for ${user.email}...`);
        
        await User.findByIdAndUpdate(user._id, {
          $inc: {
            'wallet.roi': backfillAmount,
            totalRoiEarned: backfillAmount
          }
        });
        
        // Step 3: Update investment record
        const capReached = (alreadyHave + backfillAmount) >= investment.incomeCap;
        
        await InvestorInvestment.findByIdAndUpdate(investment._id, {
          $inc: { totalRoiEarned: backfillAmount },
          $set: { 
            lastRoiDate: new Date(),
            capReached: capReached,
            status: capReached ? 'completed' : 'active'
          }
        });
        
        // Step 4: Create transaction record
        console.log(`[4/6] Creating transaction for ${user.email}...`);
        
        await Transaction.create({
          userId: user._id,
          type: 'profit',
          amount: backfillAmount,
          status: 'completed',
          description: `Backfilled ROI: ${tradingDays} trading days × $${dailyRoiAmount.toFixed(4)}/day (${dailyRate}% daily) from ${depositDate.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}${capReached ? ' (income cap reached)' : ''}`,
          referenceId: investment._id,
          referenceModel: 'InvestorInvestment'
        });
        
        // Step 5: Send notification
        console.log(`[5/6] Sending notification to ${user.email}...`);
        
        await Notification.create({
          userId: user._id,
          title: 'Backfilled ROI Credited',
          message: `Your account has been credited $${backfillAmount.toFixed(2)} in backfilled ROI for ${tradingDays} trading days (deposited ${depositDate.toISOString().split('T')[0]}). Total ROI earned: $${(alreadyHave + backfillAmount).toFixed(2)}.${capReached ? ' (Income cap reached)' : ''}`,
          type: 'profit'
        });
        
        // Tracking
        creditedUsers++;
        totalBackfilled += backfillAmount;
        
        results.push({
          email: user.email,
          name: user.name,
          depositDate: tx.createdAt.toISOString().split('T')[0],
          amount: `$${investment.amount}`,
          tradingDays: tradingDays,
          dailyRate: `${dailyRate}%`,
          backfilled: `$${backfillAmount.toFixed(2)}`,
          alreadyHad: `$${alreadyHave.toFixed(2)}`,
          newTotal: `$${(alreadyHave + backfillAmount).toFixed(2)}`,
          incomeCap: `$${investment.incomeCap}`,
          status: capReached ? 'CREDITED (CAP REACHED)' : 'CREDITED'
        });
        
        console.log(`✓ Credited $${backfillAmount.toFixed(2)} to ${user.email}`);
        
      } catch (err) {
        console.error(`❌ Error processing deposit:`, err.message);
        results.push({
          email: 'Unknown',
          status: `ERROR: ${err.message}`
        });
      }
    }
    
    // Step 6: Verify and report
    console.log('\n[6/6] Verification complete\n');
    console.log('='.repeat(120));
    console.log('BACKFILL RESULTS');
    console.log('='.repeat(120));
    
    console.log('\n');
    console.table(results);
    
    console.log('\n' + '='.repeat(120));
    console.log('SUMMARY');
    console.log('='.repeat(120));
    console.log(`
✓ Users credited: ${creditedUsers}
✓ Total ROI distributed: $${totalBackfilled.toFixed(2)}
✓ Deposits processed: ${adminDepositTxs.length}

All admin deposit users are now CURRENT with their daily ROI through Oct 9.
Starting tomorrow, they will receive daily ROI automatically at 4 PM Pakistan time.
`);
    
    console.log('='.repeat(120) + '\n');
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
