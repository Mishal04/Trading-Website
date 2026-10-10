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

    const shaharyar = await User.findOne({ name: { $regex: 'shaharyar', $options: 'i' } });

    console.log(`Shaharyar: ${shaharyar.name} (${shaharyar.email})\n`);
    console.log(`Before: ROI = $${(shaharyar.wallet?.roi || 0).toFixed(2)}\n`);

    // Set to $9.00 (3 days: Oct 7, 8, 9 × $3/day)
    await User.findByIdAndUpdate(shaharyar._id, {
      $set: { 'wallet.roi': 9.00 }
    });

    const updated = await User.findById(shaharyar._id);

    console.log(`After: ROI = $${(updated.wallet?.roi || 0).toFixed(2)}\n`);
    console.log('✅ Shaharyar ROI corrected to $9.00\n');
    console.log('='.repeat(100) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
