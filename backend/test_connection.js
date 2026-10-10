const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    console.log('Connecting to:', process.env.MONGODB_URI ? 'MONGODB_URI set' : 'NO URI');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected');

    const User = require('./src/models/User');
    const count = await User.countDocuments();
    console.log(`Total users: ${count}`);

    const users = await User.find().select('name email directCount').limit(5);
    console.log('\nSample users:');
    users.forEach(u => {
      console.log(`  ${u.name || 'NO NAME'} (${u.email}) - ${u.directCount} directs`);
    });

    // Try to find anyone with Mustaqeem
    const mustaqeem = await User.findOne({ 
      $or: [
        { name: { $regex: 'mustaq', $options: 'i' } },
        { email: { $regex: 'mustaq', $options: 'i' } }
      ]
    }).select('name email directCount referredBy');

    if (mustaqeem) {
      console.log(`\n✅ Found Mustaqeem: ${mustaqeem.name} (${mustaqeem.email})`);
      console.log(`   DirectCount: ${mustaqeem.directCount}`);
      console.log(`   ReferredBy: ${mustaqeem.referredBy}`);
    } else {
      console.log('\n❌ Mustaqeem not found');
    }

    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
