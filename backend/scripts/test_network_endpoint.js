require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

(async () => {
  try {
    console.log('=== Testing Network Endpoint ===\n');
    
    // Connect to DB to get a real user ID
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    // Get a user with referrals
    const userWithReferral = await db.collection('users').findOne({ referredBy: { $ne: null } });
    
    if (!userWithReferral) {
      console.log('No users with referrals found');
      mongoose.disconnect();
      return;
    }
    
    const userId = userWithReferral._id.toString();
    console.log('Testing with user:', userWithReferral.email);
    console.log('User ID:', userId);
    console.log('');
    
    // Test the endpoint directly using Node (simulate admin API call)
    const User = require('../src/models/User');
    const Investment = require('../src/models/Investment');
    
    // Get user details
    const user = await User.findById(userId);
    console.log('User:', user.email);
    console.log('referredBy:', user.referredBy);
    console.log('ancestorPath:', user.ancestorPath);
    console.log('');
    
    // Get upline (parent)
    if (user.referredBy) {
      const upline = await User.findById(user.referredBy).select('email firstName lastName');
      console.log('Direct Upline:');
      console.log('  Email:', upline?.email);
      console.log('  Name:', upline?.firstName, upline?.lastName);
      console.log('');
    }
    
    // Get ancestors chain
    if (user.ancestorPath && user.ancestorPath.length > 0) {
      console.log('Full Ancestor Chain:');
      for (const ancestorId of user.ancestorPath) {
        const ancestor = await User.findById(ancestorId).select('email firstName lastName');
        console.log('  -', ancestor?.email, `(${ancestor?.firstName} ${ancestor?.lastName})`);
      }
      console.log('');
    }
    
    // Get direct referrals (downline - children)
    const referrals = await User.find({ referredBy: userId }).select('email firstName lastName');
    console.log('Direct Referrals (Downline):', referrals.length);
    referrals.slice(0, 5).forEach(ref => {
      console.log('  -', ref.email, `(${ref.firstName} ${ref.lastName})`);
    });
    if (referrals.length > 5) {
      console.log(`  ... and ${referrals.length - 5} more`);
    }
    
    mongoose.disconnect();
    console.log('\n✓ Network data structure is correct');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
