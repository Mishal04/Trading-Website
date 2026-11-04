const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(80));
    console.log('SET KHALID PROFIT BALANCE TO $4.00');
    console.log('═'.repeat(80) + '\n');

    const khalid = await User.findOne({ email: 'khalid2970935@gmail.com' });
    if (!khalid) {
      console.log('❌ User not found');
      mongoose.connection.close();
      process.exit(1);
    }

    console.log(`User: ${khalid.name} (${khalid.email})\n`);

    const oldProfit = khalid.wallet?.profit || 0;
    console.log(`Current wallet.profit: $${oldProfit}`);

    // Set to $4.00
    await User.findByIdAndUpdate(khalid._id, {
      $set: {
        'wallet.profit': 4
      }
    });

    const updatedKhalid = await User.findById(khalid._id).select('wallet');
    console.log(`Updated wallet.profit: $${updatedKhalid.wallet?.profit || 0}\n`);

    console.log('═'.repeat(80));
    console.log('FINAL WALLET STATE');
    console.log('═'.repeat(80));
    console.log(`wallet.capital: $${updatedKhalid.wallet?.capital || 0}`);
    console.log(`wallet.profit: $${updatedKhalid.wallet?.profit || 0}`);
    console.log(`wallet.commission: $${updatedKhalid.wallet?.commission || 0}`);
    console.log('═'.repeat(80) + '\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    mongoose.connection.close();
    process.exit(1);
  }
})();
