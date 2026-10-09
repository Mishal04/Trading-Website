require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const Transaction = require('../src/models/Transaction');
    const User = require('../src/models/User');
    
    // Find admin deposits (capital wallet deposits)
    const adminDepositTransactions = await Transaction.find({
      type: 'admin_deposit',
      'metadata.walletType': 'capital'
    }).sort({ createdAt: -1 }).limit(20);
    
    console.log('\nAdmin Deposit Transactions (Capital Wallet):\n');
    
    for (const tx of adminDepositTransactions) {
      const user = await User.findById(tx.userId).select('email name');
      const date = new Date(tx.createdAt);
      console.log(`${user?.email}: $${tx.amount} on ${date.toISOString().split('T')[0]}`);
    }
    
    console.log(`\nToday's date: ${new Date().toISOString().split('T')[0]}`);
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
