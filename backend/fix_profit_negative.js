const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require('./src/models/User');
  
  // Find Muhammad Shahansha
  const user = await User.findOne({ name: { $regex: 'Muhammad.*Shahansha', $options: 'i' } })
    .select('_id name wallet');
  
  if (!user) {
    console.log('User not found');
    process.exit(1);
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`Fixing: ${user.name}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('Before:');
  console.log(`  wallet.profit: $${user.wallet?.profit || 0}`);
  console.log(`  wallet.roi:    $${user.wallet?.roi || 0}\n`);
  
  // The wallet should show: wallet.roi (today's + past ROI) + wallet.profit (achievement rewards)
  // But wallet.profit is negative. Set it to 0 since achievement rewards haven't been paid yet.
  
  const negativeProfitAmount = Math.abs(user.wallet?.profit || 0);
  
  await User.findByIdAndUpdate(user._id, {
    $set: {
      'wallet.profit': 0
    }
  });
  
  console.log('After:');
  console.log(`  wallet.profit: $0 (cleared negative)`);
  console.log(`  wallet.roi:    $${user.wallet?.roi || 0}`);
  console.log(`  Total Profit Balance: $${(user.wallet?.roi || 0)}\n`);
  
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('✅ Fixed: wallet.profit set to $0');
  console.log('✅ Dashboard will now show: $' + (user.wallet?.roi || 0).toFixed(2) + ' (Profit Balance)\n');
  
  process.exit(0);
})();
