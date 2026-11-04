/**
 * fix_negative_roi_balances.js
 * 
 * Fix any users with negative ROI balances (from reversal script)
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

async function fixNegative() {
  try {
    console.log('=' .repeat(100));
    console.log('🔧 FIX: Negative ROI Balances');
    console.log('=' .repeat(100) + '\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    // Find users with negative ROI
    const negativeUsers = await User.find({
      'wallet.roi': { $lt: 0 }
    });

    console.log(`Found ${negativeUsers.length} users with negative ROI\n`);

    if (negativeUsers.length === 0) {
      console.log('✅ No negative balances found!\n');
      await mongoose.disconnect();
      return;
    }

    console.log('Fixing:\n');
    for (const user of negativeUsers) {
      console.log(`${user.name}:`);
      console.log(`  Before: ROI = $${user.wallet.roi.toFixed(2)}`);
      
      await User.findByIdAndUpdate(user._id, {
        $set: { 'wallet.roi': 0 }
      });
      
      console.log(`  After: ROI = $0.00 ✅\n`);
    }

    console.log('=' .repeat(100));
    console.log(`✅ COMPLETE - Fixed ${negativeUsers.length} users\n`);

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixNegative().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
