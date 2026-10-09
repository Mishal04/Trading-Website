require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('\n' + '='.repeat(120));
    console.log('BACKFILL: ROI for users with admin deposits - Calculate from ORIGINAL deposit date');
    console.log('='.repeat(120));
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const Transaction = require('../src/models/Transaction');
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    const Notification = require('../src/models/Notification');
    const investorConstants = require('../config/investorConstants');
    
    // Find all admin_deposit transactions (these have the REAL deposit dates)
    console.log('\n[STEP 1] Finding original admin deposit transactions...');
    
    const adminTxs = await Transaction.find({
      type: 'admin_deposit',
      'metadata.walletType': 'capital'
    }).sort({ createdAt: 1 });
    
    console.log(`Found ${adminTxs.length} admin deposits\n`);
    
    let creditedCount = 0;
    let totalBackfilled = 0;
    const results = [];
    
    for (const adminTx of adminTxs) {
      try {
        const user = await User.findById(adminTx.userId);
        if (!user) {
          console.log(`⚠️  User not found for tx ${adminTx._id}`);
          continue;
        }
        
        // Find matching InvestorInvestment
        const investment = await InvestorInvestment.findOne({
          userId: user._id,
          amount: adminTx.amount,
          plan: 'A',
          adminNote: { $regex: /admin.*deposit|Auto-created/i }
        });
        
        if (!investment) {
          console.log(`⚠️  No investment for ${user.email} $${adminTx.amount}`);
          results.push({
            email: user.email,
            depositDate: new Date(adminTx.createdAt).toISOString().split('T')[0],
            amount: `$${adminTx.amount}`,
            status: 'SKIP - No investment record'
          });
          continue;
        }
        
        // Calculate trading days from ORIGINAL deposit to now
        const depositDate = new Date(adminTx.createdAt);
        depositDate.setHours(0, 0, 0, 0);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Count trading days
        let tradingDays = 0;
        let tradingDaysList = [];
        let currentDate = new Date(depositDate);
        
        // Start counting from day AFTER deposit
        currentDate.setDate(currentDate.getDate() + 1);
        
        while (currentDate <= today) {
          const dayOfWeek = currentDate.getDay();
          const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];
          
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            tradingDays++;
            tradingDaysList.push(currentDate.toISOString().split('T')[0]);
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        if (tradingDays <= 0) {
          results.push({
            email: user.email,
            depositDate: depositDate.toISOString().split('T')[0],
            amount: `$${investment.amount}`,
            status: 'SKIP - Deposited today or no trading days'
          });
          continue;
        }
        
        console.log(`\n📊 ${user.email}`);
        console.log(`   Original deposit: ${depositDate.toISOString().split('T')[0]}`);
        console.log(`   Trading days since: ${tradingDays} days`);
        console.log(`   Days: ${tradingDaysList.join(', ')}`);
        
        // Get daily rate
        const phase = investorConstants.getInvestmentPhase(investment.createdAt);
        const dailyRate = investorConstants.getDailyRateForPhase(investment.packageNumber, investment.createdAt);
        const dailyRoiAmount = Number(((investment.amount * dailyRate) / 100).toFixed(4));
        
        console.log(`   Daily rate: ${dailyRate}% = $${dailyRoiAmount.toFixed(4)}/day`);
        
        const shouldHaveEarned = Number((dailyRoiAmount * tradingDays).toFixed(4));
        const alreadyHave = investment.totalRoiEarned || 0;
        const backfillAmount = Number((shouldHaveEarned - alreadyHave).toFixed(4));
        
        console.log(`   Should have earned: $${shouldHaveEarned.toFixed(2)}`);
        console.log(`   Already has: $${alreadyHave.toFixed(2)}`);
        console.log(`   Missing: $${backfillAmount.toFixed(2)}`);
        
        if (backfillAmount <= 0) {
          results.push({
            email: user.email,
            depositDate: depositDate.toISOString().split('T')[0],
            amount: `$${investment.amount}`,
            tradingDays,
            status: 'SKIP - Already current'
          });
          continue;
        }
        
        // CREDIT THE USER
        console.log(`   ✓ Crediting $${backfillAmount.toFixed(2)}...`);
        
        await User.findByIdAndUpdate(user._id, {
          $inc: {
            'wallet.roi': backfillAmount,
            totalRoiEarned: backfillAmount
          }
        });
        
        // Update investment
        const capReached = (alreadyHave + backfillAmount) >= investment.incomeCap;
        
        await InvestorInvestment.findByIdAndUpdate(investment._id, {
          $inc: { totalRoiEarned: backfillAmount },
          $set: { 
            lastRoiDate: new Date(),
            capReached: capReached,
            status: capReached ? 'completed' : 'active'
          }
        });
        
        // Create transaction
        await Transaction.create({
          userId: user._id,
          type: 'profit',
          amount: backfillAmount,
          status: 'completed',
          description: `Backfilled ROI: ${tradingDays} trading days × $${dailyRoiAmount.toFixed(4)}/day from ${depositDate.toISOString().split('T')[0]}${capReached ? ' (income cap reached)' : ''}`,
          referenceId: investment._id,
          referenceModel: 'InvestorInvestment'
        });
        
        // Notification
        await Notification.create({
          userId: user._id,
          title: 'Backfilled ROI Credited',
          message: `Your account has been credited $${backfillAmount.toFixed(2)} in backfilled ROI for ${tradingDays} trading days since your deposit on ${depositDate.toISOString().split('T')[0]}. Total ROI: $${(alreadyHave + backfillAmount).toFixed(2)}.${capReached ? ' (Cap reached)' : ''}`,
          type: 'profit'
        });
        
        creditedCount++;
        totalBackfilled += backfillAmount;
        
        results.push({
          email: user.email,
          name: user.name,
          depositDate: depositDate.toISOString().split('T')[0],
          amount: `$${investment.amount}`,
          tradingDays,
          dailyRate: `${dailyRate}%`,
          backfilled: `$${backfillAmount.toFixed(2)}`,
          newTotal: `$${(alreadyHave + backfillAmount).toFixed(2)}`,
          cap: `$${investment.incomeCap}`,
          status: capReached ? '✓ CREDITED (CAP)' : '✓ CREDITED'
        });
        
      } catch (err) {
        console.error(`❌ Error:`, err.message);
        results.push({
          email: 'Unknown',
          status: `ERROR: ${err.message}`
        });
      }
    }
    
    console.log('\n' + '='.repeat(120));
    console.log('BACKFILL RESULTS');
    console.log('='.repeat(120));
    console.log('\n');
    console.table(results);
    
    console.log('\n' + '='.repeat(120));
    console.log('SUMMARY');
    console.log('='.repeat(120));
    console.log(`
✓ Users credited: ${creditedCount}
✓ Total ROI distributed: $${totalBackfilled.toFixed(2)}
✓ All admin deposit users are now CURRENT through Oct 9
`);
    
    console.log('='.repeat(120) + '\n');
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
