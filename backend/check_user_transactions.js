const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    console.log('\n🔍 CHECKING USER TRANSACTIONS\n');
    console.log('Enter username or email to check. Common users:');
    console.log('  - Muhammadhussain');
    console.log('  - IRFAN Ramay');
    console.log('  - Muhammad Shahansha');
    console.log('  - Dr Sajjad Naru\n');
    
    // For demo, check IRFAN Ramay
    const name = 'IRFAN Ramay';
    const user = await User.findOne({ name });
    
    if (!user) {
      console.log(`❌ User "${name}" not found`);
      process.exit(0);
    }
    
    console.log(`✅ Found: ${user.name} (${user.email})`);
    console.log(`   Wallet Commission: $${(user.wallet?.commission || 0).toFixed(2)}`);
    console.log(`   Total Earned: $${(user.totalEarned || 0).toFixed(2)}\n`);
    
    // Check all Oct 15 transactions
    const today = new Date('2026-10-15');
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const txs = await Transaction.find({
      userId: user._id,
      date: { $gte: today, $lt: tomorrow }
    }).sort({ date: -1 });
    
    console.log(`Oct 15 Transactions: ${txs.length}\n`);
    
    if (txs.length === 0) {
      console.log('❌ NO TRANSACTIONS FOUND FOR TODAY');
    } else {
      txs.forEach((tx, i) => {
        console.log(`${i+1}. ${tx.type.toUpperCase()}`);
        console.log(`   Amount: $${tx.amount}`);
        console.log(`   Description: ${tx.description}`);
        console.log(`   Status: ${tx.status}`);
        console.log(`   Date: ${tx.date.toISOString()}\n`);
      });
    }
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
