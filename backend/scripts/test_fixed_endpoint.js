require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('=== Testing Fixed Network Endpoint ===\n');
    
    // Connect to DB
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    
    // Get a user with referrals
    const userWithReferral = await User.findOne({ referredBy: { $ne: null } });
    
    if (!userWithReferral) {
      console.log('No users with referrals found');
      mongoose.disconnect();
      return;
    }
    
    const userId = userWithReferral._id;
    console.log('Testing with user:', userWithReferral.email);
    console.log('User ID:', userId);
    console.log('');
    
    // Get the user
    const user = await User.findById(userId);
    
    let uplineData = {
      parent: null,
      ancestors: []
    };

    // Get direct parent (upline)
    if (user.referredBy) {
      const parent = await User.findById(user.referredBy).select('firstName lastName email referralCode totalInvested wallet isActive');
      uplineData.parent = parent;
    }

    // Get full ancestor chain
    if (user.ancestorPath && user.ancestorPath.length > 0) {
      const ancestors = await User.find({
        _id: { $in: user.ancestorPath }
      }).select('firstName lastName email referralCode totalInvested wallet isActive');
      
      // Sort ancestors by their position in ancestorPath (oldest first)
      uplineData.ancestors = user.ancestorPath.map(ancestorId => 
        ancestors.find(a => a._id.toString() === ancestorId.toString())
      ).filter(Boolean);
    }

    // Get direct referrals (downline)
    const directReferrals = await User.find({ 
      referredBy: userId 
    }).select('firstName lastName email referralCode totalInvested wallet isActive');

    // Count total team size
    const allDescendants = await User.find({
      ancestorPath: { $in: [userId] }
    });
    
    const teamSize = allDescendants.length;

    // Log results
    console.log('=== Upline Data ===');
    console.log('Direct Parent:', uplineData.parent ? `${uplineData.parent.email}` : 'None');
    console.log('Ancestor Chain:', uplineData.ancestors.length, 'ancestors');
    uplineData.ancestors.forEach((a, i) => {
      console.log(`  ${i + 1}. ${a.email} (${a.firstName} ${a.lastName})`);
    });
    
    console.log('');
    console.log('=== Downline Data ===');
    console.log('Direct Referrals:', directReferrals.length);
    directReferrals.slice(0, 3).forEach(ref => {
      console.log(`  - ${ref.email} (${ref.firstName} ${ref.lastName})`);
    });
    if (directReferrals.length > 3) {
      console.log(`  ... and ${directReferrals.length - 3} more`);
    }
    console.log('Total Team Size:', teamSize);
    
    console.log('\n✓ Network endpoint test passed');
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
