const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('./src/models/User');
    
    // Find by exact email (asifsaab1233@gmail.com - without the extra 3)
    const user = await User.findOne({ email: 'asifsaab1233@gmail.com' })
      .select('_id name email wallet');
    
    if (!user) {
      console.log('User not found with email: asifsaab1233@gmail.com');
      process.exit(1);
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`Resetting: ${user.name}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('Before:');
    console.log(`  Email: ${user.email}`);
    console.log(`  Capital: $${user.wallet?.capital || 0}`);
    console.log(`  Profit: $${user.wallet?.profit || 0}`);
    console.log(`  Commission: $${user.wallet?.commission || 0}\n`);
    
    const currentProfit = user.wallet?.profit || 0;
    
    // Reset profit to $0
    await User.findByIdAndUpdate(user._id, {
      $set: {
        'wallet.profit': 0
      },
      $inc: {
        totalRoiEarned: -currentProfit,
        totalEarned: -currentProfit
      }
    });
    
    console.log('After:');
    console.log(`  Profit: $0`);
    console.log(`  Removed: -$${currentProfit}\n`);
    
    // Verify
    const updated = await User.findById(user._id).select('wallet');
    console.log('Verified in DB:');
    console.log(`  Profit: $${updated.wallet?.profit || 0}\n`);
    
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`✅ Reset asifsaab1233@gmail.com profit to $0\n`);
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
