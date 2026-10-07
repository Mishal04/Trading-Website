require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('=== Checking Sajjad Root Status ===\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    
    // Find Sajjad
    const sajjad = await User.findOne({ email: 'sajjadnaru2005@gmail.com' });
    
    if (!sajjad) {
      console.log('❌ User not found');
      mongoose.disconnect();
      return;
    }
    
    console.log('👤 SAJJAD PROFILE');
    console.log('='.repeat(70));
    console.log(`Email: ${sajjad.email}`);
    console.log(`Name: ${sajjad.name}`);
    console.log(`User ID: ${sajjad._id}`);
    console.log(`Created: ${sajjad.createdAt}`);
    console.log('');
    
    // Check if root (no upline)
    console.log('🔗 UPLINE STATUS');
    console.log('='.repeat(70));
    console.log(`referredBy: ${sajjad.referredBy || 'NULL (ROOT USER) ✓'}`);
    console.log(`ancestorPath: ${sajjad.ancestorPath?.length || 0} ancestors`);
    
    if (!sajjad.referredBy) {
      console.log('\n✅ SAJJAD IS THE ROOT USER');
    }
    
    // Check direct referrals
    console.log('\n📊 DIRECT REFERRALS');
    console.log('='.repeat(70));
    
    const directReferrals = await User.find({ referredBy: sajjad._id })
      .select('email name createdAt totalInvested')
      .sort({ createdAt: -1 });
    
    console.log(`Total direct referrals: ${directReferrals.length}`);
    
    if (directReferrals.length > 0) {
      directReferrals.slice(0, 5).forEach((ref, i) => {
        console.log(`\n[${i + 1}] ${ref.email}`);
        console.log(`    Name: ${ref.name}`);
        console.log(`    Total Invested: $${ref.totalInvested || 0}`);
      });
      if (directReferrals.length > 5) {
        console.log(`\n... and ${directReferrals.length - 5} more`);
      }
    }
    
    // Check total downline
    const allDescendants = await User.find({ ancestorPath: { $in: [sajjad._id] } });
    console.log(`\nTotal downline (all descendants): ${allDescendants.length}`);
    
    // Check how many users have him in ancestorPath
    const usersWithSajjadAsAncestor = await User.countDocuments({ 
      ancestorPath: { $in: [sajjad._id] } 
    });
    
    console.log('\n📈 NETWORK IMPACT');
    console.log('='.repeat(70));
    console.log(`Users with Sajjad in ancestorPath: ${usersWithSajjadAsAncestor}`);
    console.log('\nThis means Sajjad is in the upline of ${usersWithSajjadAsAncestor} users');
    console.log('(He appears in their Network tab as root ancestor)');
    
    console.log('\n');
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
