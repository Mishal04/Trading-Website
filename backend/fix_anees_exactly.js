const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const User = require('./src/models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('\n' + '='.repeat(100));
    console.log('🔧 FIX: Set Anees Profit to Exactly $1.00');
    console.log('='.repeat(100) + '\n');

    const anees = await User.findOne({ name: { $regex: 'anees', $options: 'i' } });

    console.log(`Before:\n`);
    console.log(`  Profit: $${(anees.wallet?.profit || 0).toFixed(2)}`);
    console.log(`  ROI: $${(anees.wallet?.roi || 0).toFixed(2)}\n`);

    // Set ROI to $1.00 (one day of ROI: $100 @ 1% = $1.00)
    await User.findByIdAndUpdate(anees._id, {
      $set: {
        'wallet.roi': 1.00
      }
    });

    const updated = await User.findById(anees._id);

    console.log(`After:\n`);
    console.log(`  Profit: $${(updated.wallet?.profit || 0).toFixed(2)}`);
    console.log(`  ROI: $${(updated.wallet?.roi || 0).toFixed(2)}\n`);

    console.log('✅ Anees is now corrected to normal\n');
    console.log('='.repeat(100) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
