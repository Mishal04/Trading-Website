/**
 * Script: Check Ijaz's Direct Referrals
 * 
 * Query the database to find all users that Ijaz has referred
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

// Connect to MongoDB
async function checkIjazReferrals() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trading-platform');
    console.log('✓ Connected to MongoDB\n');

    // Find Ijaz
    const ijaz = await User.findOne({ name: 'Ijaz' }).lean();
    
    if (!ijaz) {
      console.log('❌ Ijaz not found in database');
      process.exit(1);
    }

    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('IJAZ\'S REFERRAL INFORMATION');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    console.log(`User: ${ijaz.name}`);
    console.log(`Email: ${ijaz.email}`);
    console.log(`ID: ${ijaz._id}`);
    console.log(`Direct Count: ${ijaz.directCount || 0}`);
    console.log(`Total Team Count: ${ijaz.totalTeamCount || 0}\n`);

    // Find all users who have Ijaz as their referrer
    const referrals = await User.find({ 
      referrerId: ijaz._id 
    }).select('name email directCount totalInvested createdAt isVerified isActive').lean();

    console.log('─'.repeat(70));
    console.log();

    if (referrals.length === 0) {
      console.log('❌ No direct referrals found');
    } else {
      console.log(`✓ Found ${referrals.length} direct referral(s):\n`);
      
      referrals.forEach((ref, idx) => {
        console.log(`${idx + 1}. ${ref.name}`);
        console.log(`   Email: ${ref.email}`);
        console.log(`   Investment: $${ref.totalInvested || 0}`);
        console.log(`   Direct Count: ${ref.directCount || 0}`);
        console.log(`   Status: ${ref.isActive ? '✓ Active' : '✗ Inactive'} | ${ref.isVerified ? '✓ Verified' : '✗ Not Verified'}`);
        console.log(`   Joined: ${new Date(ref.createdAt).toLocaleDateString()}\n`);
      });

      // Summary
      console.log('─'.repeat(70));
      console.log();
      console.log('SUMMARY:\n');
      const totalInvestment = referrals.reduce((sum, ref) => sum + (ref.totalInvested || 0), 0);
      const totalDirectCount = referrals.reduce((sum, ref) => sum + (ref.directCount || 0), 0);
      
      console.log(`Total Direct Referrals: ${referrals.length}`);
      console.log(`Combined Direct Investment: $${totalInvestment}`);
      console.log(`Combined Their Directs: ${totalDirectCount}`);
    }

    console.log('\n' + '═'.repeat(70) + '\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkIjazReferrals();
