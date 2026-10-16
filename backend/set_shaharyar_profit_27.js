const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(80));
    console.log('SET SHAHARYAR PROFIT BALANCE TO $27.00');
    console.log('═'.repeat(80) + '\n');

    const shaharyar = await User.findOne({ name: 'Shaharyar' });
    if (!shaharyar) {
      console.log('❌ User not found');
      mongoose.connection.close();
      process.exit(1);
    }

    console.log(`User: ${shaharyar.name} (${shaharyar.email})\n`);

    const oldProfit = shaharyar.wallet?.profit || 0;
    console.log(`Current wallet.profit: $${oldProfit}`);

    // Set to $27.00
    await User.findByIdAndUpdate(shaharyar._id, {
      $set: {
        'wallet.profit': 27
      }
    });

    const updatedShaharyar = await User.findById(shaharyar._id).select('wallet');
    console.log(`Updated wallet.profit: $${updatedShaharyar.wallet?.profit || 0}\n`);

    console.log('═'.repeat(80));
    console.log('FINAL WALLET STATE');
    console.log('═'.repeat(80));
    console.log(`wallet.capital: $${updatedShaharyar.wallet?.capital || 0}`);
    console.log(`wallet.profit: $${updatedShaharyar.wallet?.profit || 0}`);
    console.log(`wallet.commission: $${updatedShaharyar.wallet?.commission || 0}`);
    console.log('═'.repeat(80) + '\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    mongoose.connection.close();
    process.exit(1);
  }
})();
