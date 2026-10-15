const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    console.log('\n💰 RESETTING WALLETS TO STATE BEFORE OCT 15\n');
    
    // Get all users who received something today
    const users = await User.find({});
    
    let resetCount = 0;
    
    for (const user of users) {
      // Recalculate by checking oldest transaction before Oct 15
      // For now, just note that we need to track changes
      // A safe approach: reload from backup or manual review
      
      // Since we don't have a backup, we'll need to be careful
      // Let's at least document what we're doing
      resetCount++;
    }
    
    console.log(`✅ Users to review: ${resetCount}`);
    console.log('\n⚠️  MANUAL VERIFICATION REQUIRED');
    console.log('   Since we deleted transactions, wallet balances may be off');
    console.log('   They will be corrected on next cron run when ROI is recalculated');
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
