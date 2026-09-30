/**
 * Script: Get Ijaz's Direct Referrals Details
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

async function getIjazReferrals() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trading-platform');

    // Find ijaz (lowercase)
    const ijaz = await User.findOne({ name: 'ijaz' }).lean();
    
    if (!ijaz) {
      console.log('❌ ijaz not found');
      process.exit(1);
    }

    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('IJAZ DIRECT REFERRALS - DETAILED ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    console.log(`User Profile:`);
    console.log(`  Name: ${ijaz.name}`);
    console.log(`  Email: ${ijaz.email}`);
    console.log(`  Investment: $${ijaz.totalInvested || 0}`);
    console.log(`  Direct Referrals: ${ijaz.directCount || 0}`);
    console.log(`  ID: ${ijaz._id}\n`);

    // Get referrals using referredBy field
    const referrals = await User.find({ 
      referredBy: ijaz._id 
    }).select('name email totalInvested directCount createdAt isVerified isActive').lean();

    console.log('─'.repeat(70));
    console.log();

    if (referrals.length === 0) {
      console.log('❌ No direct referrals found');
    } else {
      console.log(`✓ DIRECT REFERRALS: ${referrals.length}\n`);
      
      referrals.forEach((ref, idx) => {
        console.log(`${idx + 1}. ${ref.name}`);
        console.log(`   Email: ${ref.email}`);
        console.log(`   Investment: $${ref.totalInvested || 0}`);
        console.log(`   Their Directs: ${ref.directCount || 0}`);
        console.log(`   Verified: ${ref.isVerified ? '✓ Yes' : '✗ No'}`);
        console.log(`   Active: ${ref.isActive ? '✓ Yes' : '✗ No'}`);
        console.log(`   Joined: ${new Date(ref.createdAt).toLocaleDateString()}\n`);
      });

      console.log('─'.repeat(70));
      console.log();
      
      // Calculate total
      const totalInvest = referrals.reduce((sum, r) => sum + (r.totalInvested || 0), 0);
      console.log('SUMMARY:');
      console.log(`  Total Referrals: ${referrals.length}`);
      console.log(`  Combined Investment: $${totalInvest}`);
      console.log(`  Average Per Referral: $${(totalInvest / referrals.length).toFixed(2)}`);
    }

    console.log('\n' + '═'.repeat(70) + '\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getIjazReferrals();
