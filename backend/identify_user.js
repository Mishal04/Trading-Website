const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    const userId = '6abcd8de8c0a1e31fb196482';
    const user = await User.findById(userId);
    
    console.log('User ID:', userId);
    console.log('Name:', user?.name);
    console.log('Email:', user?.email);
    console.log('Direct Count:', user?.directCount);
    
    // Also get Muhammad Zubair's ID
    const hussain = await User.findOne({ name: 'Muhammad Zubair' });
    console.log('\nMuhammad Zubair ID:', hussain?._id);
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
