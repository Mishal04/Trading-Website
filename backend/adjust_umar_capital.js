const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('./src/models/User');
    
    // Find Umar shah
    const user = await User.findOne({ name: { $regex: 'Umar.*shah', $options: 'i' } })
      .select('_id name email wallet');
    
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`Adjusting: ${user.name}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('Before:');
    console.log(`  Capital Balance: $${user.wallet?.capital || 0}`);
    console.log(`  Profit Balance: $${user.wallet?.profit || 0}`);
    console.log(`  Commission Balance: $${user.wallet?.commission || 0}\n`);
    
    // Set capital to exactly $1,000
    const currentCapital = user.wallet?.capital || 0;
    const targetCapital = 1000;
    const difference = currentCapital - targetCapital;
    
    await User.findByIdAndUpdate(user._id, {
      $set: {
        'wallet.capital': targetCapital
      }
    });
    
    console.log('After:');
    console.log(`  Capital Balance: $${targetCapital}`);
    console.log(`  Change: -$${difference} (from $${currentCapital})`);
    console.log(`  Profit Balance: $${user.wallet?.profit || 0} (unchanged)`);
    console.log(`  Commission Balance: $${user.wallet?.commission || 0} (unchanged)\n`);
    
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`✅ Updated: Umar shah's capital set to $${targetCapital}\n`);
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
