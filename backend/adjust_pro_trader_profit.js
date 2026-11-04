const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('./src/models/User');
    
    // Find Pro trader
    const user = await User.findOne({ name: { $regex: 'Pro.*trader', $options: 'i' } })
      .select('_id name email wallet');
    
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`Adjusting: ${user.name}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('Before:');
    console.log(`  Profit Balance: $${user.wallet?.profit || 0}`);
    console.log(`  Commission Balance: $${user.wallet?.commission || 0}\n`);
    
    // Reduce profit from $300 to $190 (decrease by $110)
    const reduction = 110;
    const newProfit = (user.wallet?.profit || 0) - reduction;
    
    await User.findByIdAndUpdate(user._id, {
      $set: {
        'wallet.profit': newProfit
      },
      $inc: {
        totalRoiEarned: -reduction,
        totalEarned: -reduction
      }
    });
    
    console.log('After:');
    console.log(`  Profit Balance: $${newProfit}`);
    console.log(`  Reduction: -$${reduction}`);
    console.log(`  Commission Balance: $${user.wallet?.commission || 0} (unchanged)\n`);
    
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`✅ Updated: Pro trader's profit reduced from $${user.wallet?.profit} to $${newProfit}\n`);
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
