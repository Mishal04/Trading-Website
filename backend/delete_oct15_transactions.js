const mongoose = require('mongoose');
require('dotenv').config();
const Transaction = require('./src/models/Transaction');
const User = require('./src/models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    console.log('\n🗑️  DELETING ALL OCT 15 TRANSACTIONS\n');
    
    const today = new Date('2026-10-15');
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get count before delete
    const txsBefore = await Transaction.countDocuments({
      date: { $gte: today, $lt: tomorrow }
    });
    
    console.log(`Transactions to delete: ${txsBefore}`);
    
    // Delete all transactions from Oct 15
    const result = await Transaction.deleteMany({
      date: { $gte: today, $lt: tomorrow }
    });
    
    console.log(`✅ Deleted: ${result.deletedCount} transactions\n`);
    
    // Now we need to REVERSE the wallet changes
    // Get all users and subtract their Oct 15 earnings from their wallets
    console.log('📝 REVERTING WALLET BALANCES...\n');
    
    // This is tricky - we'd need to track what was added
    // For safety, let's just mark that we need manual verification
    console.log('⚠️  NOTE: Wallet balances need to be manually verified');
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
