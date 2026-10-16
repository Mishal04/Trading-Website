const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require('./src/models/User');
  const Transaction = require('./src/models/Transaction');
  
  // Find Muhammad Shahansha
  const user = await User.findOne({ name: { $regex: 'Muhammad.*Shahansha', $options: 'i' } })
    .select('_id name wallet createdAt');
  
  if (!user) {
    console.log('User not found');
    process.exit(1);
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`User: ${user.name}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('Database Wallet:');
  console.log(`  wallet.profit:     $${user.wallet?.profit || 0}`);
  console.log(`  wallet.roi:        $${user.wallet?.roi || 0}`);
  console.log(`  wallet.commission: $${user.wallet?.commission || 0}`);
  console.log(`  wallet.capital:    $${user.wallet?.capital || 0}\n`);
  
  // Check today's profit transactions
  const today = new Date('2026-10-16');
  const tomorrow = new Date('2026-10-17');
  
  const profitTxns = await Transaction.find({
    userId: user._id,
    type: 'profit',
    createdAt: { $gte: today, $lt: tomorrow }
  }).lean();
  
  console.log(`Profit Transactions Today (${profitTxns.length}):`);
  for (const txn of profitTxns) {
    console.log(`   ${txn.createdAt.toISOString()}: +$${txn.amount.toFixed(2)} - ${txn.description}`);
  }
  
  console.log('\n');
  process.exit(0);
})();
