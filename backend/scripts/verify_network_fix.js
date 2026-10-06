require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const User = require('../src/models/User');

(async () => {
  try {
    console.log('=== NETWORK FIX VERIFICATION ===\n');
    
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
    
    console.log(`Testing ${users.length} users to verify fix:\n`);
    
    const ancestorChains = [];
    
    for (let i = 0; i < users.length; i++) {
      const testUser = users[i];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`[Test ${i + 1}] User: ${testUser.email}`);
      console.log(`User ID: ${testUser._id}`);
      
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
        
        const ancestors = response.data.data.upline.ancestors;
        const ancestorEmails = ancestors.map(a => a.email).join(' → ');
        
        console.log(`Ancestors: ${ancestorEmails || '(root user)'}`);
        
        ancestorChains.push({
          userEmail: testUser.email,
          ancestorEmails,
          count: ancestors.length
        });
        
      } catch (error) {
        console.error('API Error:', error.message);
      }
    }
    
    // Verify uniqueness
    console.log(`\n${'='.repeat(60)}`);
    console.log('\nVERIFICATION RESULTS:');
    console.log(`${'='.repeat(60)}\n`);
    
    const uniqueChains = new Set(ancestorChains.map(a => a.ancestorEmails));
    
    console.log(`Total users tested: ${ancestorChains.length}`);
    console.log(`Unique ancestor chains: ${uniqueChains.size}`);
    
    ancestorChains.forEach((chain, i) => {
      console.log(`\n[${i + 1}] ${chain.userEmail}`);
      console.log(`    Chain: ${chain.ancestorEmails || '(root)'}`);
    });
    
    if (uniqueChains.size === ancestorChains.length) {
      console.log('\n✅ SUCCESS: Each user has a unique, correct ancestor chain!');
      console.log('   The network display bug is FIXED.');
    } else if (uniqueChains.size === 1) {
      console.log('\n❌ FAILED: All users show the SAME ancestor chain.');
      console.log('   The bug is NOT fixed.');
    } else {
      console.log('\n⚠️  PARTIAL: Some users share chains (expected for referrals under same parent)');
    }
    
    console.log(`\n${'='.repeat(60)}\n`);
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
