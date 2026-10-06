require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const User = require('../src/models/User');

(async () => {
  try {
    console.log('=== Testing Network Data for Multiple Users ===\n');
    
    // Connect to DB
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Get admin user and token
    const adminUser = await User.findOne({ accountType: 'admin' });
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: adminUser._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    
    // Get 3 different users with referrals
    const users = await User.find({ referredBy: { $ne: null } }).limit(3);
    
    console.log(`Testing with ${users.length} users:\n`);
    
    for (const testUser of users) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`User: ${testUser.email}`);
      console.log(`User ID: ${testUser._id}`);
      console.log(`referredBy: ${testUser.referredBy}`);
      console.log(`ancestorPath length: ${testUser.ancestorPath?.length || 0}`);
      
      try {
        const response = await axios.get(
          `http://localhost:5000/api/admin/users/${testUser._id}/upline-downline`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`\n✓ API Response received`);
        
        // Log ancestors
        const ancestors = response.data.data.upline.ancestors;
        console.log(`\nAncestors (${ancestors.length}):`);
        ancestors.forEach((a, i) => {
          console.log(`  ${i + 1}. ${a.email}`);
        });
        
        // Log direct referrals
        const referrals = response.data.data.downline.directReferrals;
        console.log(`\nDirect Referrals (${referrals.length}):`);
        referrals.slice(0, 3).forEach(r => {
          console.log(`  - ${r.email}`);
        });
        if (referrals.length > 3) {
          console.log(`  ... and ${referrals.length - 3} more`);
        }
        
      } catch (error) {
        console.error('API Error:', error.message);
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('\n✓ Test complete\n');
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
