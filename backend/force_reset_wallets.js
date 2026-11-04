const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('FORCING RESET ALL WALLETS TO $0');
    console.log('════════════════════════════════════════════');
    
    const result = await User.updateMany(
      {},
      {
        $set: {
          'wallet.profit': 0,
          'wallet.commission': 0
        }
      }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} users`);
    console.log(`   wallet.profit → $0`);
    console.log(`   wallet.commission → $0`);
    
    // Verify
    const users = await User.find({
      $or: [
        { 'wallet.profit': { $gt: 0 } },
        { 'wallet.commission': { $gt: 0 } }
      ]
    }).select('name wallet').limit(5);
    
    if (users.length === 0) {
      console.log(`\n✅ VERIFIED: All wallets are $0`);
    } else {
      console.log(`\n⚠️  Found ${users.length} users still with balance:`);
      users.forEach(u => {
        console.log(`   ${u.name}: profit=$${u.wallet?.profit}, commission=$${u.wallet?.commission}`);
      });
    }
    
    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
