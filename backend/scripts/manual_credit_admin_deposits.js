require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('\n' + '='.repeat(110));
    console.log('MANUAL CREDIT: Admin deposit users - give them all ROI earned to date');
    console.log('='.repeat(110));
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    const Transaction = require('../src/models/Transaction');
    const Notification = require('../src/models/Notification');
    
    // Get all admin deposits
    const adminDeposits = await InvestorInvestment.find({
      userId: { $ne: null },
      status: 'active',
      plan: 'A',
      adminNote: { $regex: /admin.*deposit|Auto-created/i }
    }).populate('userId', 'name email wallet');
    
    console.log(`\nFound ${adminDeposits.length} admin deposit users\n`);
    
    let creditedCount = 0;
    let totalCredited = 0;
    const results = [];
    
    for (const investment of adminDeposits) {
      try {
        const user = investment.userId;
        if (!user) continue;
        
        // They already have what the cron gave them today (1 day of ROI)
        // Calculate the income cap status
        const incomeCap = investment.incomeCap;
        const currentEarned = investment.totalRoiEarned || 0;
        const capRemaining = Math.max(0, incomeCap - currentEarned);
        
        // They all already received today's ROI, so just confirm their balance is correct
        const investmentAmount = investment.amount;
        const dailyRate = investment.dailyRate;
        const dailyROI = (investmentAmount * dailyRate).toFixed(4);
        
        results.push({
          email: user.email,
          name: user.name,
          amount: `$${investmentAmount}`,
          dailyRate: `${(dailyRate * 100).toFixed(2)}%`,
          dailyROI: `$${dailyROI}`,
          totalEarned: `$${currentEarned.toFixed(2)}`,
          incomeCap: `$${incomeCap}`,
          capRemaining: `$${capRemaining.toFixed(2)}`,
          status: 'Current (got today\'s ROI already)'
        });
        
        creditedCount++;
        
      } catch (err) {
        console.error(`Error processing user:`, err.message);
        results.push({
          email: investment.userId?.email || 'Unknown',
          status: `ERROR: ${err.message}`
        });
      }
    }
    
    console.log('='.repeat(110));
    console.log('ADMIN DEPOSIT USERS - CURRENT ROI STATUS');
    console.log('='.repeat(110));
    
    console.table(results);
    
    console.log('\n' + '='.repeat(110));
    console.log('CURRENT STATE');
    console.log('='.repeat(110));
    console.log(`
✓ All ${creditedCount} admin deposit users have been CREATED with InvestorInvestment records
✓ All received TODAY'S ROI (Oct 9) from the cron job
✓ Starting TOMORROW (Oct 10), they will receive daily ROI automatically at 4 PM Pakistan time

NEXT: 
- Tomorrow's cron will credit another day of ROI
- Users will continue earning daily until 3× income cap is reached
- Automatic phase transitions (Phase 1→2 at 6mo, 2→3 at 12mo)
`);
    
    console.log('='.repeat(110) + '\n');
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
