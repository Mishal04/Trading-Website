const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(80));
    console.log('SET SARFRAZ KHAN PROFIT BALANCE TO $4.00');
    console.log('═'.repeat(80) + '\n');

    const sarfraz = await User.findOne({ email: 'frazkhanpolo.45@gmail.com' });
    if (!sarfraz) {
      console.log('❌ User not found');
      mongoose.connection.close();
      process.exit(1);
    }

    console.log(`User: ${sarfraz.name} (${sarfraz.email})\n`);

    const oldProfit = sarfraz.wallet?.profit || 0;
    console.log(`Current wallet.profit: $${oldProfit}`);

    // Set to $4.00
    await User.findByIdAndUpdate(sarfraz._id, {
      $set: {
        'wallet.profit': 4
      }
    });

    const updatedSarfraz = await User.findById(sarfraz._id).select('wallet');
    console.log(`Updated wallet.profit: $${updatedSarfraz.wallet?.profit || 0}\n`);

    console.log('═'.repeat(80));
    console.log('FINAL WALLET STATE');
    console.log('═'.repeat(80));
    console.log(`wallet.capital: $${updatedSarfraz.wallet?.capital || 0}`);
    console.log(`wallet.profit: $${updatedSarfraz.wallet?.profit || 0}`);
    console.log(`wallet.commission: $${updatedSarfraz.wallet?.commission || 0}`);
    console.log('═'.repeat(80) + '\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    mongoose.connection.close();
    process.exit(1);
  }
})();
