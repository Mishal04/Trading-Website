require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('=== Checking Orhan Referrals ===\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    
    // Find Orhan
    const orhan = await User.findOne({ email: 'orhanahmed11@gmail.com' });
    
    if (!orhan) {
      console.log('❌ User not found');
      mongoose.disconnect();
      return;
    }
    
    console.log('👤 ORHAN\'S PROFILE');
    console.log('='.repeat(70));
    console.log(`Email: ${orhan.email}`);
    console.log(`Name: ${orhan.name}`);
    console.log(`User ID: ${orhan._id}`);
    console.log(`Created: ${orhan.createdAt}`);
    console.log('');
    
    // Check direct referrals (users who have orhan as their referrer)
    console.log('📊 DIRECT REFERRALS (Users referred BY Orhan)');
    console.log('='.repeat(70));
    
    const directReferrals = await User.find({ referredBy: orhan._id })
      .select('email name createdAt wallet totalInvested isActive')
      .sort({ createdAt: -1 });
    
    console.log(`Total direct referrals: ${directReferrals.length}`);
    
    if (directReferrals.length === 0) {
      console.log('❌ Orhan has NOT referred anyone yet');
    } else {
      console.log('\nReferrals:');
      directReferrals.forEach((ref, i) => {
        console.log(`\n[${i + 1}] ${ref.email}`);
        console.log(`    Name: ${ref.name}`);
        console.log(`    Joined: ${ref.createdAt.toDateString()}`);
        console.log(`    Status: ${ref.isActive ? '✓ Active' : '✗ Inactive'}`);
        console.log(`    Total Invested: $${ref.totalInvested || 0}`);
        console.log(`    Wallet: $${(ref.wallet?.capital || 0) + (ref.wallet?.profit || 0) + (ref.wallet?.commission || 0) + (ref.wallet?.roi || 0)}`);
      });
    }
    
    // Check total downline (all descendants)
    console.log('\n\n📈 TOTAL DOWNLINE (All descendants)');
    console.log('='.repeat(70));
    
    const allDescendants = await User.find({ ancestorPath: { $in: [orhan._id] } });
    console.log(`Total downline: ${allDescendants.length}`);
    
    // Check if Orhan has upline
    console.log('\n\n🔗 UPLINE (Orhan\'s referrer)');
    console.log('='.repeat(70));
    
    if (orhan.referredBy) {
      const upline = await User.findById(orhan.referredBy).select('email name');
      console.log(`Referred by: ${upline?.email} (${upline?.name})`);
      
      // Check Orhan's position in the tree
      if (orhan.ancestorPath && orhan.ancestorPath.length > 0) {
        console.log(`Ancestor chain length: ${orhan.ancestorPath.length}`);
        const ancestors = await User.find({ _id: { $in: orhan.ancestorPath } })
          .select('email name')
          .sort({ _id: -1 });
        console.log('\nAncestor chain (root to parent):');
        ancestors.forEach((anc, i) => {
          console.log(`  ${i + 1}. ${anc.email}`);
        });
      }
    } else {
      console.log('Orhan is a ROOT USER (no upline)');
    }
    
    console.log('\n\n📌 SUMMARY');
    console.log('='.repeat(70));
    
    if (directReferrals.length === 0) {
      console.log('❌ Orhan has NOT earned any commission yet');
      console.log('   (No direct referrals = No commission)');
    } else {
      const totalInvested = directReferrals.reduce((sum, ref) => sum + (ref.totalInvested || 0), 0);
      console.log(`✅ Orhan has ${directReferrals.length} direct referral(s)`);
      console.log(`   Total invested by referrals: $${totalInvested}`);
      console.log(`   Total downline: ${allDescendants.length}`);
    }
    
    console.log('');
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
