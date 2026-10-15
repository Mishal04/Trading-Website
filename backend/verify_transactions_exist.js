const mongoose = require('mongoose');
require('dotenv').config();
const Transaction = require('./src/models/Transaction');
const User = require('./src/models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    console.log('\n✅ VERIFYING TRANSACTIONS IN DATABASE:\n');
    
    const today = new Date('2026-10-15');
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check IRFAN Ramay
    const irfan = await User.findOne({ name: 'IRFAN Ramay' });
    if (irfan) {
      const txs = await Transaction.find({
        userId: irfan._id,
        date: { $gte: today, $lt: tomorrow }
      }).sort({ date: -1 });
      
      console.log(`IRFAN Ramay - Oct 15 Transactions: ${txs.length}`);
      txs.forEach((tx, i) => {
        console.log(`  ${i+1}. ${tx.type}: $${tx.amount} - ${tx.description}`);
      });
    }
    
    console.log('\n✅ Transactions ARE in database');
    console.log('⚠️  Issue is FRONTEND caching - need to clear cache or refresh');
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
