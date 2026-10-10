const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const User = require('./src/models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('\n' + '='.repeat(100));
    console.log('🔧 FIX: Remove Extra ROI from Mustaqeem');
    console.log('='.repeat(100) + '\n');

    const mustaqeem = await User.findOne({ name: 'Mustaqeem' });

    console.log(`Mustaqeem: ${mustaqeem.email}\n`);

    console.log(`Before:\n`);
    console.log(`  Profit: $${(mustaqeem.wallet?.profit || 0).toFixed(2)}`);
    console.log(`  ROI: $${(mustaqeem.wallet?.roi || 0).toFixed(2)}`);
    console.log(`  Commission: $${(mustaqeem.wallet?.commission || 0).toFixed(2)}\n`);

    // Set ROI to $0 (no ROI should be processed on Saturday)
    await User.findByIdAndUpdate(mustaqeem._id, {
      $set: {
        'wallet.roi': 0.00
      }
    });

    const updated = await User.findById(mustaqeem._id);

    console.log(`After:\n`);
    console.log(`  Profit: $${(updated.wallet?.profit || 0).toFixed(2)}`);
    console.log(`  ROI: $${(updated.wallet?.roi || 0).toFixed(2)}`);
    console.log(`  Commission: $${(updated.wallet?.commission || 0).toFixed(2)}\n`);

    console.log('✅ Mustaqeem ROI removed - Now showing correct balance\n');
    console.log('='.repeat(100) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
