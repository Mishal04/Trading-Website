const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    const zubairiId = '6aa710bb6efbe2df22e4b15d';
    const user = await User.findById(zubairiId);
    
    console.log('User: Muhammad Zubair');
    console.log('Direct Count:', user?.directCount);
    console.log('Current Commission Wallet:', user?.wallet?.commission || 0);
    
    // Check profit-based commissions today
    const today = new Date('2026-10-15');
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const txs = await Transaction.find({
      userId: zubairiId,
      date: { $gte: today, $lt: tomorrow },
      type: 'commission',
      description: { $regex: 'profit' }
    });
    
    console.log(`\nProfit-Based Commissions Today: ${txs.length}`);
    let total = 0;
    txs.forEach((tx, i) => {
      console.log(`${i+1}. $${tx.amount} - ${tx.description}`);
      total += tx.amount;
    });
    
    console.log(`\nTotal New Commissions: $${total.toFixed(2)}`);
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
