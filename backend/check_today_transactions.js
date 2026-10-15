const mongoose = require('mongoose');
require('dotenv').config();
const Transaction = require('./src/models/Transaction');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    console.log('🔍 Transactions Created Today (Oct 15)\n');
    
    // Get today's transactions for commission type
    const today = new Date('2026-10-15');
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const txs = await Transaction.find({
      date: { $gte: today, $lt: tomorrow },
      type: 'commission',
      description: { $regex: 'profit' }  // profit-based commissions
    }).sort({ date: -1 });
    
    console.log(`Found ${txs.length} profit-based commission transactions\n`);
    
    if (txs.length === 0) {
      console.log('❌ No profit-based transactions found');
      console.log('\nChecking ALL transactions from today:');
      
      const allTxs = await Transaction.find({
        date: { $gte: today, $lt: tomorrow }
      }).sort({ date: -1 }).limit(10);
      
      allTxs.forEach((tx, i) => {
        console.log(`${i+1}. Type: ${tx.type}, Amount: $${tx.amount}, User: ${tx.userId}`);
      });
    } else {
      txs.forEach((tx, i) => {
        console.log(`${i+1}. User: ${tx.userId}`);
        console.log(`   Amount: $${tx.amount}`);
        console.log(`   Description: ${tx.description}\n`);
      });
    }
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
