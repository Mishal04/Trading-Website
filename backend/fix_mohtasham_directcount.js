const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const User = require('./src/models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('\n' + '='.repeat(100));
    console.log('🔧 FIX: Mohtasham DirectCount');
    console.log('='.repeat(100) + '\n');

    const mohtasham = await User.findOne({ name: { $regex: 'mohtasham', $options: 'i' } });

    console.log(`Found: ${mohtasham.name}`);
    console.log(`Current directCount: ${mohtasham.directCount}\n`);

    // Count actual directs
    const actualCount = await User.countDocuments({ referredBy: mohtasham._id });
    console.log(`Actual direct children: ${actualCount}\n`);

    // Update
    await User.findByIdAndUpdate(mohtasham._id, {
      $set: { directCount: actualCount }
    });

    const updated = await User.findById(mohtasham._id);
    console.log(`✅ Updated directCount to: ${updated.directCount}\n`);
    console.log('='.repeat(100) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
