require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const constants = require('../config/constants');

async function test() {
  try {
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/trading-system';
    await mongoose.connect(dbUri);
    
    console.log('\n=== CHECKING WHO HAS DIRECT REFERRALS ===\n');
    
    // Find users who are direct referrals of someone
    const referredUsers = await User.find({ referredBy: { $ne: null } })
      .select('name referredBy directCount _id')
      .populate('referredBy', 'name directCount')
      .limit(10)
      .lean();
    
    referredUsers.forEach(u => {
      if (u.referredBy) {
        console.log(`${u.name}`);
        console.log(`  ├─ Referred by: ${u.referredBy.name}`);
        console.log(`  ├─ Referrer's directCount: ${u.referredBy.directCount || 0}`);
        console.log(`  ├─ Referrer's currentLevel: ${constants.getCurrentCommissionLevel(u.referredBy.directCount || 0)}`);
        console.log(`  └─ This user's directCount: ${u.directCount || 0}\n`);
      }
    });
    
    // Now test what the API should return
    console.log('\n=== TEST WHAT API RETURNS FOR A REFERRER ===\n');
    
    const referrer = await User.findOne({ directCount: { $gt: 0 } }).select('_id name directCount referredBy').lean();
    if (!referrer) {
      console.log('No referrer found');
      await mongoose.disconnect();
      return;
    }
    
    console.log(`Referrer: ${referrer.name} (directCount=${referrer.directCount})\n`);
    
    // Get their direct referrals
    const directRefs = await User.find({ referredBy: referrer._id })
      .select('name directCount _id')
      .lean();
    
    console.log(`Direct referrals of ${referrer.name}:`);
    directRefs.forEach((ref, i) => {
      const currentLevel = constants.getCurrentCommissionLevel(ref.directCount || 0);
      console.log(`${i+1}. ${ref.name}: directCount=${ref.directCount || 0}, currentLevel=${currentLevel}`);
    });
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
