/**
 * Script: Find Ijaz in database
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

async function findIjaz() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trading-platform');
    console.log('✓ Connected to MongoDB\n');

    // Search for users with "ijaz" in name or email
    const users = await User.find({
      $or: [
        { name: { $regex: 'ijaz', $options: 'i' } },
        { email: { $regex: 'ijaz', $options: 'i' } }
      ]
    }).select('name email directCount totalInvested referrerId createdAt').lean();

    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('SEARCH RESULTS FOR "IJAZ"');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    if (users.length === 0) {
      console.log('❌ No users found with "ijaz" in name or email\n');
      console.log('Showing all users in database:\n');
      
      const allUsers = await User.find().select('name email directCount totalInvested role').lean().limit(20);
      allUsers.forEach((u, idx) => {
        console.log(`${idx + 1}. ${u.name} (${u.email}) - Role: ${u.role}, Directs: ${u.directCount || 0}`);
      });
    } else {
      console.log(`✓ Found ${users.length} user(s):\n`);
      users.forEach((u, idx) => {
        console.log(`${idx + 1}. Name: ${u.name}`);
        console.log(`   Email: ${u.email}`);
        console.log(`   Direct Count: ${u.directCount || 0}`);
        console.log(`   Total Investment: $${u.totalInvested || 0}`);
        console.log(`   Referrer ID: ${u.referrerId || 'None (Root)'}`);
        console.log(`   Joined: ${new Date(u.createdAt).toLocaleDateString()}\n`);
      });
    }

    console.log('═'.repeat(70) + '\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

findIjaz();
