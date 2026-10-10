const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const User = require('./src/models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('\n' + '='.repeat(100));
    console.log('🔧 FIX: Set Anees ROI to $1.00');
    console.log('='.repeat(100) + '\n');

    const anees = await User.findOne({ name: { $regex: 'anees', $options: 'i' } });

    console.log(`Anees: ${anees.name} (${anees.email})\n`);
    console.log(`Before: ROI = $${(anees.wallet?.roi || 0).toFixed(2)}\n`);

    // Set to $1.00 (one day only - Oct 9)
    await User.findByIdAndUpdate(anees._id, {
      $set: { 'wallet.roi': 1.00 }
    });

    const updated = await User.findById(anees._id);

    console.log(`After: ROI = $${(updated.wallet?.roi || 0).toFixed(2)}\n`);
    console.log('✅ Anees ROI corrected to $1.00\n');
    console.log('='.repeat(100) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
