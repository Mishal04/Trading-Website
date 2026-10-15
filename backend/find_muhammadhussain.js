const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    console.log('🔍 Searching for Muhammadhussain\n');
    
    // Search by name variations
    const variations = [
      'muhammadhussain',
      'Muhammadhussain',
      'Muhammad Hussain',
      'Muhammad hussain',
      'hussain'
    ];
    
    for (const name of variations) {
      const users = await User.find({ name: { $regex: name, $options: 'i' } }).select('_id name email directCount');
      if (users.length > 0) {
        console.log(`Found with "${name}":`);
        users.forEach(u => {
          console.log(`  ID: ${u._id}`);
          console.log(`  Name: ${u.name}`);
          console.log(`  Directs: ${u.directCount}`);
          console.log();
        });
      }
    }
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
