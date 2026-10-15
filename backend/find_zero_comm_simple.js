const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    console.log('\n🔍 USERS WITH DIRECTS BUT 0 COMMISSIONS TODAY:\n');
    
    const today = new Date('2026-10-15');
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get all users with direct referrals
    const usersWithDirects = await User.find({ directCount: { $gt: 0 } }).select('name directCount _id');
    
    console.log(`Checking ${usersWithDirects.length} users with directs...\n`);
    
    let zeroCommCount = 0;
    
    for (const user of usersWithDirects) {
      // Check if got commissions today
      const commTx = await Transaction.findOne({
        userId: user._id,
        type: 'commission',
        date: { $gte: today, $lt: tomorrow }
      });
      
      if (!commTx) {
        console.log(`❌ ${user.name} - ${user.directCount} directs, 0 commissions`);
        zeroCommCount++;
      }
    }
    
    console.log(`\n⚠️  TOTAL: ${zeroCommCount} users with directs but 0 commissions today`);
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
