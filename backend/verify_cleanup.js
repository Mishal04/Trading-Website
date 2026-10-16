const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require('./src/models/User');
  const Transaction = require('./src/models/Transaction');
  
  const today = new Date('2026-10-16');
  const tomorrow = new Date('2026-10-17');
  
  const profitTxns = await Transaction.countDocuments({
    type: 'profit',
    createdAt: { $gte: today, $lt: tomorrow }
  });
  
  const commissionTxns = await Transaction.countDocuments({
    type: 'commission',
    createdAt: { $gte: today, $lt: tomorrow }
  });
  
  const shahansha = await User.findOne({ name: { $regex: 'Muhammad.*Shahansha', $options: 'i' } });
  
  console.log('\n✅ CLEANUP VERIFICATION:\n');
  console.log('Today\'s Transactions:');
  console.log(`  Profit transactions: ${profitTxns}`);
  console.log(`  Commission transactions: ${commissionTxns}`);
  console.log(`\nMuhammad Shahansha Wallet:`);
  console.log(`  Profit: $${shahansha.wallet?.profit || 0}`);
  console.log(`  Commission: $${shahansha.wallet?.commission || 0}`);
  console.log(`  Total: $${((shahansha.wallet?.profit || 0) + (shahansha.wallet?.commission || 0)).toFixed(2)}\n`);
  
  process.exit(0);
})();
