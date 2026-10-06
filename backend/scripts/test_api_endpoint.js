require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const User = require('../src/models/User');

(async () => {
  try {
    console.log('=== Testing Network API Endpoint ===\n');
    
    // Connect to DB
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Get a user with referrals and generate an admin JWT token
    const userWithReferral = await User.findOne({ referredBy: { $ne: null } });
    const adminUser = await User.findOne({ accountType: 'admin' });
    
    if (!userWithReferral) {
      console.log('No users with referrals found');
      mongoose.disconnect();
      return;
    }
    
    if (!adminUser) {
      console.log('No admin user found');
      mongoose.disconnect();
      return;
    }
    
    const userId = userWithReferral._id.toString();
    const adminId = adminUser._id.toString();
    
    // Generate JWT token for admin
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: adminId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    
    console.log('Admin User:', adminUser.email);
    console.log('Test User:', userWithReferral.email);
    console.log('Test User ID:', userId);
    console.log('');
    
    // Call the API endpoint
    try {
      const response = await axios.get(
        `http://localhost:5000/api/admin/users/${userId}/upline-downline`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✓ API Response Status:', response.status);
      console.log('');
      console.log('Upline (Parent):');
      if (response.data.data.upline.parent) {
        const p = response.data.data.upline.parent;
        console.log(`  ${p.email} (${p.firstName} ${p.lastName})`);
      } else {
        console.log('  None (root user)');
      }
      
      console.log('');
      console.log('Ancestor Chain:', response.data.data.upline.ancestors.length);
      response.data.data.upline.ancestors.forEach((a, i) => {
        console.log(`  ${i + 1}. ${a.email} (${a.firstName} ${a.lastName})`);
      });
      
      console.log('');
      console.log('Direct Referrals:', response.data.data.downline.directReferrals.length);
      response.data.data.downline.directReferrals.slice(0, 3).forEach(ref => {
        console.log(`  - ${ref.email} (${ref.firstName} ${ref.lastName})`);
      });
      if (response.data.data.downline.directReferrals.length > 3) {
        console.log(`  ... and ${response.data.data.downline.directReferrals.length - 3} more`);
      }
      
      console.log('');
      console.log('Total Team Size:', response.data.data.downline.teamSize);
      console.log('');
      console.log('✓ Network API endpoint working correctly');
      
    } catch (error) {
      if (error.response) {
        console.error('API Error:', error.response.status, error.response.data);
      } else {
        console.error('Request Error:', error.message);
      }
    }
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
