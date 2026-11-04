const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(80));
    console.log('SET ANEES PROFIT BALANCE TO $6.00');
    console.log('═'.repeat(80) + '\n');

    const anees = await User.findOne({ email: 'asadmehmood5142@gmail.com' });
    if (!anees) {
      console.log('❌ User not found');
      mongoose.connection.close();
      process.exit(1);
    }

    console.log(`User: ${anees.name} (${anees.email})\n`);

    const oldProfit = anees.wallet?.profit || 0;
    console.log(`Current wallet.profit: $${oldProfit}`);

    // Set to $6.00
    await User.findByIdAndUpdate(anees._id, {
      $set: {
        'wallet.profit': 6
      }
    });

    const updatedAnees = await User.findById(anees._id).select('wallet');
    console.log(`Updated wallet.profit: $${updatedAnees.wallet?.profit || 0}\n`);

    console.log('═'.repeat(80));
    console.log('FINAL WALLET STATE');
    console.log('═'.repeat(80));
    console.log(`wallet.capital: $${updatedAnees.wallet?.capital || 0}`);
    console.log(`wallet.profit: $${updatedAnees.wallet?.profit || 0}`);
    console.log(`wallet.commission: $${updatedAnees.wallet?.commission || 0}`);
    console.log('═'.repeat(80) + '\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    mongoose.connection.close();
    process.exit(1);
  }
})();
