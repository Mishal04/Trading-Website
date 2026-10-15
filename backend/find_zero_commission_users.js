const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');
const Transaction = require('./src/models/Transaction');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    console.log('\n🔍 USERS WITH ACTIVE INVESTMENTS BUT 0 COMMISSIONS TODAY:\n');
    
    const today = new Date('2026-10-15');
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get all users with active investments
    const activeInvs = await InvestorInvestment.find({ status: 'active' }).populate('userId');
    const userIds = [...new Set(activeInvs.map(inv => inv.userId._id.toString()))];
    
    let zeroCommCount = 0;
    
    for (const userId of userIds) {
      const user = await User.findById(userId);
      if (!user) continue;
      
      // Check if user got ANY commissions today
      const commTx = await Transaction.findOne({
        userId: userId,
        type: 'commission',
        date: { $gte: today, $lt: tomorrow }
      });
      
      if (!commTx) {
        // Only show if they have directs (should have commissions)
        if ((user.directCount || 0) > 0) {
          console.log(`❌ ${user.name}`);
          console.log(`   Directs: ${user.directCount}`);
          console.log(`   Commission Wallet: $${(user.wallet?.commission || 0).toFixed(2)}`);
          console.log();
          zeroCommCount++;
        }
      }
    }
    
    console.log(`\n⚠️  TOTAL WITH 0 COMMISSIONS: ${zeroCommCount} users`);
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
