const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('Searching for users with capital around $100...\n');
    
    // Search for users with capital between $95-$105
    const users = await User.find({
      'wallet.capital': { $gte: 95, $lte: 105 }
    }).select('name email wallet').sort({ 'wallet.capital': -1 });

    console.log(`Found ${users.length} users with capital ~$100:\n`);
    users.forEach(u => {
      console.log(`${u.name.padEnd(30)} Capital: $${(u.wallet?.capital || 0).toFixed(2).padEnd(8)} Profit: $${(u.wallet?.profit || 0).toFixed(2)}`);
    });

    // Also search for all Khalid variations
    console.log('\n\nAll Khalid users:\n');
    const khalids = await User.find({
      name: { $regex: 'khalid', $options: 'i' }
    }).select('name email wallet');

    khalids.forEach(u => {
      console.log(`${u.name.padEnd(30)} Capital: $${(u.wallet?.capital || 0).toFixed(2).padEnd(8)} Profit: $${(u.wallet?.profit || 0).toFixed(2)}`);
    });

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
