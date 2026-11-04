const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('./src/models/User');
    
    // Find Asif Hussain
    const user = await User.findOne({ name: { $regex: 'Asif.*Hussain', $options: 'i' } })
      .select('_id name email wallet');
    
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`Adjusting: ${user.name}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('Before:');
    console.log(`  Capital Balance: $${user.wallet?.capital || 0}`);
    console.log(`  Profit Balance: $${user.wallet?.profit || 0}`);
    console.log(`  Commission Balance: $${user.wallet?.commission || 0}\n`);
    
    // Set profit to exactly $190
    const targetProfit = 190;
    const currentProfit = user.wallet?.profit || 0;
    const increase = targetProfit - currentProfit;
    
    await User.findByIdAndUpdate(user._id, {
      $set: {
        'wallet.profit': targetProfit
      },
      $inc: {
        totalRoiEarned: increase,
        totalEarned: increase
      }
    });
    
    console.log('After:');
    console.log(`  Capital Balance: $${user.wallet?.capital || 0} (unchanged)`);
    console.log(`  Profit Balance: $${targetProfit}`);
    console.log(`  Change: +$${increase} (from $${currentProfit})`);
    console.log(`  Commission Balance: $${user.wallet?.commission || 0} (unchanged)\n`);
    
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`✅ Updated: Asif Hussain's profit set to $${targetProfit}\n`);
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
