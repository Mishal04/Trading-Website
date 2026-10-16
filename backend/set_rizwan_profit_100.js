const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(80));
    console.log('SET RIZWAN SHAHID PROFIT BALANCE TO $100.00');
    console.log('═'.repeat(80) + '\n');

    const rizwan = await User.findOne({ name: 'Rizwan Shahid' });
    if (!rizwan) {
      console.log('❌ User not found');
      mongoose.connection.close();
      process.exit(1);
    }

    console.log(`User: ${rizwan.name} (${rizwan.email})\n`);

    const oldProfit = rizwan.wallet?.profit || 0;
    console.log(`Current wallet.profit: $${oldProfit}`);

    // Set to $100.00
    await User.findByIdAndUpdate(rizwan._id, {
      $set: {
        'wallet.profit': 100
      }
    });

    const updatedRizwan = await User.findById(rizwan._id).select('wallet');
    console.log(`Updated wallet.profit: $${updatedRizwan.wallet?.profit || 0}\n`);

    console.log('═'.repeat(80));
    console.log('FINAL WALLET STATE');
    console.log('═'.repeat(80));
    console.log(`wallet.capital: $${updatedRizwan.wallet?.capital || 0}`);
    console.log(`wallet.profit: $${updatedRizwan.wallet?.profit || 0}`);
    console.log(`wallet.commission: $${updatedRizwan.wallet?.commission || 0}`);
    console.log('═'.repeat(80) + '\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    mongoose.connection.close();
    process.exit(1);
  }
})();
