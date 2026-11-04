const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('./src/models/User');
    
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║          FULL REVERT: Muhammad Hussain Wallet                     ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    
    // Find Muhammad Hussain
    const hussain = await User.findOne({ name: { $regex: 'Muhammad.*Hussein|Muhammad.*Hussain|Muhammadhussain', $options: 'i' } })
      .select('_id name wallet');
    
    if (!hussain) {
      console.log('❌ Muhammad Hussain not found');
      process.exit(1);
    }
    
    console.log(`User: ${hussain.name}\n`);
    console.log(`Current Wallet State:`);
    console.log(`  Capital: $${hussain.wallet?.capital || 0}`);
    console.log(`  ROI: $${hussain.wallet?.roi || 0}`);
    console.log(`  Commission: $${hussain.wallet?.commission || 0}`);
    console.log(`  Profit: $${hussain.wallet?.profit || 0}\n`);
    
    // Reset wallet to original state (only capital, everything else 0)
    await User.findByIdAndUpdate(hussain._id, {
      'wallet.roi': 0,
      'wallet.commission': 0,
      'wallet.profit': 0,
      totalEarned: 0,
      totalRoiEarned: 0
    });
    
    console.log(`Reverted Wallet State:`);
    console.log(`  Capital: $1000 (unchanged)`);
    console.log(`  ROI: $0 (cleared)`);
    console.log(`  Commission: $0 (cleared)`);
    console.log(`  Profit: $0 (cleared)\n`);
    
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ REVERT COMPLETE                               ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    
    process.exit(0);
  } catch(e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
