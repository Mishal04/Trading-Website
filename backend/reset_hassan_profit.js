const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('./src/models/User');
    const Transaction = require('./src/models/Transaction');
    
    // Find Hassan mehar
    const user = await User.findOne({ name: { $regex: 'Hassan.*mehar', $options: 'i' } })
      .select('_id name email wallet');
    
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`Resetting: ${user.name}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('Before:');
    console.log(`  Email: ${user.email}`);
    console.log(`  Profit Balance: $${user.wallet?.profit || 0}\n`);
    
    const currentProfit = user.wallet?.profit || 0;
    
    // Find and delete the two ROI transactions
    const today = new Date('2026-10-16');
    const tomorrow = new Date('2026-10-17');
    
    const roiTxns = await Transaction.find({
      userId: user._id,
      type: 'profit',
      createdAt: { $gte: today, $lt: tomorrow },
      description: { $regex: 'Daily ROI' }
    });
    
    console.log(`Found ${roiTxns.length} Daily ROI transactions to delete:`);
    
    let totalToRemove = 0;
    for (const txn of roiTxns) {
      console.log(`  - ${txn.description}: +$${txn.amount}`);
      totalToRemove += txn.amount;
    }
    
    console.log('\nDeleting transactions...');
    await Transaction.deleteMany({
      userId: user._id,
      type: 'profit',
      createdAt: { $gte: today, $lt: tomorrow },
      description: { $regex: 'Daily ROI' }
    });
    
    console.log(`✓ Deleted ${roiTxns.length} transactions\n`);
    
    // Reset profit wallet to $0
    console.log('Resetting profit balance to $0...');
    await User.findByIdAndUpdate(user._id, {
      $set: {
        'wallet.profit': 0
      },
      $inc: {
        totalRoiEarned: -currentProfit,
        totalEarned: -currentProfit
      }
    });
    
    console.log(`✓ Profit reset from $${currentProfit} to $0\n`);
    
    // Verify
    const updated = await User.findById(user._id).select('wallet');
    const remainingTxns = await Transaction.countDocuments({
      userId: user._id,
      type: 'profit'
    });
    
    console.log('After:');
    console.log(`  Profit Balance: $${updated.wallet?.profit || 0}`);
    console.log(`  Remaining profit transactions in DB: ${remainingTxns}\n`);
    
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`✅ Reset ${user.name}:`);
    console.log(`   - Profit: $${currentProfit} → $0`);
    console.log(`   - Deleted: ${roiTxns.length} Daily ROI transactions\n`);
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
