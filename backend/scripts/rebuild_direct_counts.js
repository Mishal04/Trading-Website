/**
 * rebuild_direct_counts.js
 * 
 * Rebuild all users' directCount from actual referral structure
 * This ensures directCount matches actual children
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function rebuildDirectCounts() {
  try {
    console.log('\n' + '=' .repeat(100));
    console.log('🔄 REBUILD: Direct Counts from Actual Referral Structure');
    console.log('=' .repeat(100) + '\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    // Get all users
    const allUsers = await User.find({}).select('_id firstName email parentId directCount');
    console.log(`Found ${allUsers.length} total users\n`);

    let updated = 0;
    let incorrect = 0;
    const issues = [];

    // For each user, count their actual direct children and update if different
    for (const user of allUsers) {
      try {
        // Count actual direct children (users with this user as parentId)
        const actualDirectCount = await User.countDocuments({ parentId: user._id });
        const currentDirectCount = user.directCount || 0;

        if (actualDirectCount !== currentDirectCount) {
          console.log(`⚠️  ${user.firstName} (${user.email})`);
          console.log(`   Current directCount: ${currentDirectCount}`);
          console.log(`   Actual direct children: ${actualDirectCount}`);

          if (actualDirectCount > 0) {
            // Update to actual count
            await User.findByIdAndUpdate(user._id, {
              $set: { directCount: actualDirectCount }
            });
            console.log(`   ✅ Updated to: ${actualDirectCount}\n`);
            updated++;
            incorrect++;
          } else {
            // Reset to 0
            await User.findByIdAndUpdate(user._id, {
              $set: { directCount: 0 }
            });
            console.log(`   ✅ Reset to: 0\n`);
            updated++;
            incorrect++;
          }
        }
      } catch (err) {
        issues.push(`Error updating ${user.firstName}: ${err.message}`);
      }
    }

    console.log('=' .repeat(100));
    console.log('\n📊 SUMMARY\n');
    console.log(`Total users: ${allUsers.length}`);
    console.log(`Users with wrong directCount: ${incorrect}`);
    console.log(`Users updated: ${updated}\n`);

    if (issues.length > 0) {
      console.log('⚠️  Issues:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    }

    console.log('=' .repeat(100) + '\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

rebuildDirectCounts().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
