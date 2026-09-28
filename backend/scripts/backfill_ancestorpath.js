/**
 * Backfill ancestorPath for legacy users who have referredBy set but empty ancestorPath
 * This fixes the tree structure issue where L2+ members showed as L1
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function backfillAncestorPath() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('═'.repeat(70));
    console.log('BACKFILL ANCESTORPATH FOR LEGACY USERS');
    console.log('═'.repeat(70) + '\n');

    // Find all users with referredBy set but empty ancestorPath
    const legacyUsers = await User.find({
      referredBy: { $exists: true, $ne: null },
      $or: [
        { ancestorPath: { $size: 0 } },
        { ancestorPath: null }
      ]
    }).select('_id name email referredBy ancestorPath createdAt');

    console.log(`Found ${legacyUsers.length} legacy users needing ancestorPath backfill\n`);

    if (legacyUsers.length === 0) {
      console.log('✓ No legacy users found. ancestorPath is already populated.\n');
      await mongoose.connection.close();
      process.exit(0);
    }

    let fixed = 0;
    let errors = 0;

    for (const user of legacyUsers) {
      try {
        // Fetch the referrer
        const referrer = await User.findById(user.referredBy).select('_id ancestorPath');
        
        if (!referrer) {
          console.log(`⚠️  User ${user.name}: referrer not found (ID: ${user.referredBy})`);
          errors++;
          continue;
        }

        // Build new ancestorPath: [referrer._id, ...referrer.ancestorPath]
        const newAncestorPath = [referrer._id, ...(referrer.ancestorPath || [])].slice(0, 25);

        // Update the user
        await User.findByIdAndUpdate(user._id, {
          ancestorPath: newAncestorPath
        });

        console.log(`✓ ${user.name} (${user.email})`);
        console.log(`  Old ancestorPath: []`);
        console.log(`  New ancestorPath: [${newAncestorPath.map(id => id.toString().slice(0, 8)).join(', ')}]`);
        fixed++;
      } catch (err) {
        console.log(`❌ Error fixing ${user.name}: ${err.message}`);
        errors++;
      }
    }

    console.log('\n' + '═'.repeat(70));
    console.log('BACKFILL SUMMARY');
    console.log('═'.repeat(70) + '\n');

    console.log(`Fixed: ${fixed}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total: ${legacyUsers.length}\n`);

    if (fixed === legacyUsers.length) {
      console.log('✅ All legacy users have been fixed!\n');
    }

    await mongoose.connection.close();
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

backfillAncestorPath();
