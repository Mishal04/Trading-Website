const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    console.log('🔍 Checking Muhammadhussain (Muhammad Zubair) Status\n');
    
    const user = await User.findOne({ name: 'Muhammad Zubair' });
    
    if (!user) {
      console.log('❌ User not found');
      process.exit(0);
    }
    
    console.log('USER: Muhammad Zubair');
    console.log('  Direct Count:', user.directCount);
    console.log('  Wallet Commission:', user.wallet?.commission || 0);
    console.log('  Total Earned:', user.totalEarned || 0);
    
    // Check commission transactions
    const commissions = await Transaction.find({ 
      userId: user._id, 
      type: 'commission'
    }).sort({ date: -1 }).limit(30);
    
    console.log('\nRecent Commission Transactions:', commissions.length);
    let total = 0;
    commissions.slice(0, 10).forEach((tx, i) => {
      console.log(`  ${i+1}. $${tx.amount} - ${tx.description}`);
      total += tx.amount;
    });
    
    if (commissions.length > 10) {
      console.log(`  ... and ${commissions.length - 10} more`);
      commissions.forEach(tx => total += tx.amount);
    }
    
    console.log(`\n💰 TOTAL COMMISSION TODAY: $${total.toFixed(2)}`);
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
