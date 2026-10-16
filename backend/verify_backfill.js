const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require('./src/models/User');
  const Transaction = require('./src/models/Transaction');
  
  const hussain = await User.findOne({ name: { $regex: 'Muhammad.*Hussein|Muhammad.*Hussain|Muhammadhussain', $options: 'i' } })
    .select('_id name wallet createdAt');
  
  if (hussain) {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`User: ${hussain.name}`);
    console.log(`Join Date: ${hussain.createdAt.toISOString().split('T')[0]}`);
    console.log(`─────────────────────────────────────────────────────────────`);
    console.log(`Wallet ROI:        $${hussain.wallet?.roi?.toFixed(2) || '0.00'}`);
    console.log(`Wallet Commission: $${hussain.wallet?.commission?.toFixed(2) || '0.00'}`);
    console.log(`Wallet Capital:    $${hussain.wallet?.capital?.toFixed(2) || '0.00'}`);
    console.log(`Wallet Profit:     $${hussain.wallet?.profit?.toFixed(2) || '0.00'}`);
    console.log(`═══════════════════════════════════════════════════════════════`);
    
    // Get latest backfill transaction
    const backfillTxn = await Transaction.findOne({
      userId: hussain._id,
      type: 'adjustment',
      description: { $regex: 'Backfill earnings' }
    }).sort({ createdAt: -1 });
    
    if (backfillTxn) {
      console.log('\n✅ Backfill Transaction Created:');
      console.log(`   Amount: $${backfillTxn.amount.toFixed(2)}`);
      console.log(`   Date: ${backfillTxn.createdAt.toISOString()}`);
      console.log(`   ROI:        $${backfillTxn.metadata?.roiAmount?.toFixed(2)}`);
      console.log(`   Commission: $${backfillTxn.metadata?.commissionAmount?.toFixed(2)}`);
      console.log(`   Period: ${backfillTxn.metadata?.periodStart?.split('T')[0]} to ${backfillTxn.metadata?.periodEnd?.split('T')[0]}`);
    }
    
    // Show recent transactions
    const recentTxns = await Transaction.find({ userId: hussain._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('type amount description createdAt');
    
    console.log('\n📊 Recent Transactions:');
    for (const txn of recentTxns) {
      const date = txn.createdAt.toISOString().split('T')[0];
      console.log(`   ${date}: ${txn.type.padEnd(15)} $${txn.amount.toFixed(2).padStart(10)}`);
    }
    
    console.log('\n');
  } else {
    console.log('User not found');
  }
  
  process.exit(0);
})();
