require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const constants = require('../config/constants');

async function test() {
  try {
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/trading-system';
    await mongoose.connect(dbUri);
    
    console.log('\n=== Checking All Users directCount ===\n');
    
    // Get all users
    const users = await User.find({}).select('name directCount _id').lean();
    console.log(`Total users: ${users.length}\n`);
    
    users.forEach(u => {
      const dc = u.directCount || 0;
      const currentLevel = constants.getCurrentCommissionLevel(dc);
      console.log(`${u.name.padEnd(30)} directCount=${String(dc).padEnd(2)} currentLevel=${currentLevel || 'null'}`);
    });
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
