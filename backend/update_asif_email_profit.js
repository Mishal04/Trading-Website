const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('./src/models/User');
    
    // Find by exact email
    const user = await User.findOne({ email: 'asifsaab12333@gmail.com' })
      .select('_id name email wallet');
    
    if (!user) {
      console.log('User not found with email: asifsaab12333@gmail.com');
      process.exit(1);
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`Updating: ${user.name}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('Before:');
    console.log(`  Email: ${user.email}`);
    console.log(`  Capital: $${user.wallet?.capital || 0}`);
    console.log(`  Profit: $${user.wallet?.profit || 0}`);
    console.log(`  Commission: $${user.wallet?.commission || 0}\n`);
    
    // Set profit to $190
    const targetProfit = 190;
    const currentProfit = user.wallet?.profit || 0;
    const change = targetProfit - currentProfit;
    
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
    console.log(`✅ Updated asifsaab12333@gmail.com profit to $${targetProfit}\n`);
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
