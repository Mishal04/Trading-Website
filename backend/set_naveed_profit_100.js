const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(80));
    console.log('SET NAVEED ANJUM PROFIT BALANCE TO $100.00');
    console.log('═'.repeat(80) + '\n');

    const naveed = await User.findOne({ name: 'Naveed Anjum' });
    if (!naveed) {
      console.log('❌ User not found');
      mongoose.connection.close();
      process.exit(1);
    }

    console.log(`User: ${naveed.name} (${naveed.email})\n`);

    const oldProfit = naveed.wallet?.profit || 0;
    console.log(`Current wallet.profit: $${oldProfit}`);

    // Set to $100.00
    await User.findByIdAndUpdate(naveed._id, {
      $set: {
        'wallet.profit': 100
      }
    });

    const updatedNaveed = await User.findById(naveed._id).select('wallet');
    console.log(`Updated wallet.profit: $${updatedNaveed.wallet?.profit || 0}\n`);

    console.log('═'.repeat(80));
    console.log('FINAL WALLET STATE');
    console.log('═'.repeat(80));
    console.log(`wallet.capital: $${updatedNaveed.wallet?.capital || 0}`);
    console.log(`wallet.profit: $${updatedNaveed.wallet?.profit || 0}`);
    console.log(`wallet.commission: $${updatedNaveed.wallet?.commission || 0}`);
    console.log('═'.repeat(80) + '\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    mongoose.connection.close();
    process.exit(1);
  }
})();
