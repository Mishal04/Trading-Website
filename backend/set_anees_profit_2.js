const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('./src/models/User');
    
    // Find Anees Bijarani
    const user = await User.findOne({ name: { $regex: 'Anees.*Bijarani', $options: 'i' } })
      .select('_id name email wallet');
    
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`Updating: ${user.name}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('Before:');
    console.log(`  Email: ${user.email}`);
    console.log(`  Capital: $${user.wallet?.capital || 0}`);
    console.log(`  Profit: $${user.wallet?.profit || 0}\n`);
    
    const currentProfit = user.wallet?.profit || 0;
    const targetProfit = 2;
    const change = targetProfit - currentProfit;
    
    // Set profit to $2
    await User.findByIdAndUpdate(user._id, {
      $set: {
        'wallet.profit': targetProfit
      },
      $inc: {
        totalRoiEarned: change,
        totalEarned: change
      }
    });
    
    console.log('After:');
    console.log(`  Profit: $${targetProfit}`);
    console.log(`  Change: ${change > 0 ? '+' : ''}$${change}\n`);
    
    // Verify
    const updated = await User.findById(user._id).select('wallet');
    console.log('Verified in DB:');
    console.log(`  Profit: $${updated.wallet?.profit || 0}\n`);
    
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`✅ Set ${user.name} profit to $${targetProfit}\n`);
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
