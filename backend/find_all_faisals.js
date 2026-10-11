const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test');
    
    const faisals = await User.find({ name: { $regex: 'faisal', $options: 'i' } });
    console.log('\nFound ' + faisals.length + ' users with name containing "faisal":\n');
    
    faisals.forEach((f, i) => {
      console.log((i+1) + '. ' + f.name);
      console.log('   Email: ' + f.email);
      console.log('   Investment: $' + (f.totalInvested || 0).toFixed(2));
      console.log('   directCount: ' + (f.directCount || 0));
      console.log('   unlockedLevels: ' + (f.unlockedLevels || 0));
      console.log();
    });
    
  } finally {
    process.exit(0);
  }
})();
