const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('./src/models/User');
    const Transaction = require('./src/models/Transaction');
    
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║          REVERTING: Muhammad Hussain Backfill                     ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    
    // Find Muhammad Hussain
    const hussain = await User.findOne({ name: { $regex: 'Muhammad.*Hussein|Muhammad.*Hussain|Muhammadhussain', $options: 'i' } })
      .select('_id name wallet');
    
    if (!hussain) {
      console.log('❌ Muhammad Hussain not found');
      process.exit(1);
    }
    
    console.log(`User: ${hussain.name}`);
    console.log(`Current Wallet ROI: $${hussain.wallet?.roi || 0}`);
    console.log(`Current Wallet Commission: $${hussain.wallet?.commission || 0}\n`);
    
    // Find the backfill transaction
    const backfillTxn = await Transaction.findOne({
      userId: hussain._id,
      type: 'adjustment',
      description: { $regex: 'Backfill earnings' }
    }).sort({ createdAt: -1 });
    
    if (!backfillTxn) {
      console.log('❌ Backfill transaction not found');
      process.exit(1);
    }
    
    const roiAmount = backfillTxn.metadata?.roiAmount || 0;
    const commissionAmount = backfillTxn.metadata?.commissionAmount || 0;
    
    console.log(`Backfill transaction found:`);
    console.log(`  ROI to remove: $${roiAmount.toFixed(2)}`);
    console.log(`  Commission to remove: $${commissionAmount.toFixed(2)}`);
    console.log(`  Total to remove: $${(roiAmount + commissionAmount).toFixed(2)}\n`);
    
    // Revert wallet
    await User.findByIdAndUpdate(hussain._id, {
      $inc: {
        'wallet.roi': -roiAmount,
        'wallet.commission': -commissionAmount,
        totalRoiEarned: -roiAmount,
        totalEarned: -(roiAmount + commissionAmount)
      }
    });
    
    console.log('✓ Reverted wallet amounts\n');
    
    // Delete the backfill transaction
    await Transaction.deleteOne({ _id: backfillTxn._id });
    
    console.log('✓ Deleted backfill transaction record\n');
    
    // Fetch updated wallet
    const updated = await User.findById(hussain._id).select('wallet');
    
    console.log(`Updated Wallet ROI: $${updated.wallet?.roi || 0}`);
    console.log(`Updated Wallet Commission: $${updated.wallet?.commission || 0}\n`);
    
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ REVERT COMPLETE                               ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    
    console.log(`Muhammad Hussain's wallet has been restored to pre-backfill state.\n`);
    
    process.exit(0);
  } catch(e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
