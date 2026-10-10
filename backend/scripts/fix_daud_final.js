/**
 * fix_daud_final.js
 * 
 * Fix Daud Ahmad's ROI wallet to $160 and remove the correction transactions
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function fixDaudFinal() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    console.log('=' .repeat(100));
    console.log('🔧 FINAL FIX: Set Daud Ahmad ROI to $160 and clean up transactions');
    console.log('=' .repeat(100) + '\n');

    // Find Daud Ahmad
    const daud = await User.findOne({ name: 'Daud Ahmad' });
    
    if (!daud) {
      console.log('❌ Daud Ahmad not found');
      process.exit(1);
    }

    console.log(`Found: ${daud.name}`);
    console.log(`Email: ${daud.email}`);
    console.log(`Current ROI wallet: $${daud.wallet.roi || 0}`);
    console.log(`Current Total ROI Earned: $${daud.totalRoiEarned || 0}\n`);

    // Delete the two transactions
    console.log('📋 Deleting correction transactions...\n');
    
    const deleted = await Transaction.deleteMany({
      userId: daud._id,
      description: {
        $in: [
          'CORRECTION: Removed duplicate $20 payment (received twice by mistake)',
          'Daily ROI (100.0000%) from Phase 1 (Plan A) investment $2000'
        ]
      }
    });

    console.log(`  ✅ Deleted ${deleted.deletedCount} transactions\n`);

    // Set ROI wallet to $160
    console.log('💰 Setting ROI wallet to $160...\n');

    const newTotalRoiEarned = (daud.totalRoiEarned || 0) + 20;

    await User.findByIdAndUpdate(daud._id, {
      $set: {
        'wallet.roi': 160,
        totalRoiEarned: newTotalRoiEarned
      }
    });

    console.log('✅ Updated:\n');
    console.log(`   ROI wallet: $160`);
    console.log(`   Total ROI Earned: $${newTotalRoiEarned}\n`);

    console.log('=' .repeat(100));
    console.log('✅ FINAL FIX COMPLETE\n');
    console.log(`Daud Ahmad's ROI is now: $160\n`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

fixDaudFinal().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
