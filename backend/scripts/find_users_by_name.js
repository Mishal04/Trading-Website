require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    
    // Search for users containing these names
    const users = await User.find({
      $or: [
        { name: { $regex: /anees/i } },
        { email: { $regex: /anees/i } },
        { name: { $regex: /shaharyar|sherya/i } },
        { email: { $regex: /shaharyar|sherya/i } }
      ]
    }).select('name email wallet');
    
    console.log('Found users:');
    users.forEach(u => {
      console.log(`  ${u.name} - ${u.email}`);
    });
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
