const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(80));
    console.log('SET ZULFIQAR PROFIT BALANCE TO $5.00');
    console.log('═'.repeat(80) + '\n');

    const zulfiqar = await User.findOne({ email: 'fk634760@gmail.com' });
    if (!zulfiqar) {
      console.log('❌ User not found');
      mongoose.connection.close();
      process.exit(1);
    }

    console.log(`User: ${zulfiqar.name} (${zulfiqar.email})\n`);

    const oldProfit = zulfiqar.wallet?.profit || 0;
    console.log(`Current wallet.profit: $${oldProfit}`);

    // Set to $5.00
    await User.findByIdAndUpdate(zulfiqar._id, {
      $set: {
        'wallet.profit': 5
      }
    });

    const updatedZulfiqar = await User.findById(zulfiqar._id).select('wallet');
    console.log(`Updated wallet.profit: $${updatedZulfiqar.wallet?.profit || 0}\n`);

    console.log('═'.repeat(80));
    console.log('FINAL WALLET STATE');
    console.log('═'.repeat(80));
    console.log(`wallet.capital: $${updatedZulfiqar.wallet?.capital || 0}`);
    console.log(`wallet.profit: $${updatedZulfiqar.wallet?.profit || 0}`);
    console.log(`wallet.commission: $${updatedZulfiqar.wallet?.commission || 0}`);
    console.log('═'.repeat(80) + '\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    mongoose.connection.close();
    process.exit(1);
  }
})();
