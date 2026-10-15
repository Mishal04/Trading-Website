const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    console.log('\n💰 REVERSING OCT 15 WALLET CHANGES\n');
    
    // Get all users
    const users = await User.find({});
    
    console.log(`Processing ${users.length} users...\n`);
    
    let reversedCount = 0;
    
    for (const user of users) {
      // Check if this user had any Oct 14 transactions (to know baseline)
      const oct14Start = new Date('2026-10-14T00:00:00.000Z');
      const oct14End = new Date('2026-10-15T00:00:00.000Z');
      
      const oct14Txs = await Transaction.find({
        userId: user._id,
        date: { $gte: oct14Start, $lt: oct14End }
      });
      
      // If user had transactions on Oct 14, their wallets should reflect Oct 14 state
      // For safety, we can't automatically revert without knowing the exact amounts
      // So we'll just reset to a known safe state or leave as-is
      
      reversedCount++;
    }
    
    console.log(`⚠️  WARNING: Cannot safely reverse wallet amounts`);
    console.log(`\nReason:`);
    console.log(`  - Transactions are deleted, but wallet amounts remain`);
    console.log(`  - We don't know the exact amounts from before Oct 15`);
    console.log(`  - Automatically reversing could cause incorrect balances`);
    
    console.log(`\n❌ NEED MANUAL ACTION:`);
    console.log(`  Option 1: Restore from database backup (if available)`);
    console.log(`  Option 2: Run Oct 15 commissions AGAIN to recreate transactions`);
    console.log(`  Option 3: Manually adjust wallet amounts (risky)`);
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
