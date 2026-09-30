const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../src/models/User');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find mustafa
    const mustafa = await User.findOne({ name: 'mustafa' });
    
    if (!mustafa) {
      console.log('mustafa not found');
      process.exit(1);
    }
    
    console.log('mustafa ID:', mustafa._id);
    console.log('mustafa directCount:', mustafa.directCount);
    
    // Find all users referred by mustafa
    const referrals = await User.find({ referredBy: mustafa._id }).select('name referredBy');
    
    console.log('\nReferrals:');
    referrals.forEach((ref, idx) => {
      console.log(`  ${idx + 1}. ${ref.name}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
