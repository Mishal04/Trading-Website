const mongoose = require('mongoose');
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const user = await User.findOne({ name: 'Ansar mehmood' }).select('name wallet');
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    
    console.log('ANSAR MEHMOOD');
    console.log('════════════════════════════════════════════');
    console.log(`Wallet Profit: $${user.wallet?.profit || 0}`);
    console.log(`Wallet Commission: $${user.wallet?.commission || 0}`);
    console.log(`Wallet Capital: $${user.wallet?.capital || 0}`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const transactions = await Transaction.find({
      userId: user._id,
      createdAt: { $gte: today }
    }).sort({ createdAt: -1 });
    
    console.log(`\nTransactions (today):`);
    let totalProfit = 0;
    transactions.forEach(t => {
      console.log(`  ${t.type.toUpperCase()} +$${t.amount.toFixed(2)} | ${t.description}`);
      if (t.type === 'profit') totalProfit += t.amount;
    });
    
    console.log(`\nTotal Profit from Transactions: $${totalProfit.toFixed(2)}`);
    console.log(`Wallet Profit: $${user.wallet?.profit || 0}`);
    console.log(`\n⚠️  MISMATCH: Transactions show $${totalProfit.toFixed(2)} but wallet shows $${user.wallet?.profit || 0}`);
    
    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
