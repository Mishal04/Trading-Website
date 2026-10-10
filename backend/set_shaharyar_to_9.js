const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const User = require('./src/models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('\n' + '='.repeat(100));
    console.log('🔧 FIX: Set Shaharyar ROI to $9.00');
    console.log('='.repeat(100) + '\n');

    const shaharyar = await User.findOne({ name: { $regex: 'shaharyar|sharyar', $options: 'i' } });

    console.log(`Shaharyar: ${shaharyar.name} (${shaharyar.email})\n`);

    console.log(`Before:\n`);
    console.log(`  ROI Wallet: $${(shaharyar.wallet?.roi || 0).toFixed(2)}\n`);

    // Set to $9.00
    await User.findByIdAndUpdate(shaharyar._id, {
      $set: { 'wallet.roi': 9.00 }
    });

    const updated = await User.findById(shaharyar._id);

    console.log(`After:\n`);
    console.log(`  ROI Wallet: $${(updated.wallet?.roi || 0).toFixed(2)}\n`);

    console.log('✅ Shaharyar ROI set to $9.00\n');
    console.log('='.repeat(100) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
