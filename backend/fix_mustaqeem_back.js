const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const User = require('./src/models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('\n' + '='.repeat(100));
    console.log('🔧 CORRECT: Set Mustaqeem ROI back to $26.00');
    console.log('='.repeat(100) + '\n');

    const mustaqeem = await User.findOne({ name: 'Mustaqeem' });

    // Mustaqeem has $2,600 investment @ 1% = $26 daily ROI
    const correctRoi = 26.00;

    console.log(`Mustaqeem: ${mustaqeem.email}\n`);

    console.log(`Before:\n`);
    console.log(`  ROI: $${(mustaqeem.wallet?.roi || 0).toFixed(2)}\n`);

    // Set ROI to correct amount
    await User.findByIdAndUpdate(mustaqeem._id, {
      $set: {
        'wallet.roi': correctRoi
      }
    });

    const updated = await User.findById(mustaqeem._id);

    console.log(`After:\n`);
    console.log(`  ROI: $${(updated.wallet?.roi || 0).toFixed(2)}\n`);

    console.log('✅ Mustaqeem is now correct: $26.00 (one day ROI from $2,600 @ 1%)\n');
    console.log('='.repeat(100) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
