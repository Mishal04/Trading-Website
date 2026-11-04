const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('Testing manual wallet update...\n');

    // Find a user
    const user = await User.findOne({ name: 'Sonia kanwal' });
    console.log(`Found: ${user.name}`);
    console.log(`Before: wallet.profit = $${user.wallet?.profit || 0}\n`);

    // Try to update
    const result = await User.findByIdAndUpdate(
      user._id,
      {
        $inc: {
          'wallet.profit': 125
        }
      },
      { new: true }
    ).select('wallet');

    console.log(`After: wallet.profit = $${result.wallet?.profit || 0}\n`);

    // Verify by reading again
    const verify = await User.findById(user._id).select('wallet');
    console.log(`Verify: wallet.profit = $${verify.wallet?.profit || 0}\n`);

    if (verify.wallet?.profit === 125) {
      console.log('✅ Update successful!');
    } else {
      console.log('❌ Update failed - wallet not persisted');
    }

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    mongoose.connection.close();
    process.exit(1);
  }
})();
