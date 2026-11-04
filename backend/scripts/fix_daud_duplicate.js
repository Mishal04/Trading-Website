/**
 * fix_daud_duplicate.js
 * 
 * Remove $20 from Daud Ahmad's wallet (got $20 twice, should be $160 instead of $180)
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

async function fixDaudDuplicate() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    console.log('=' .repeat(100));
    console.log('🔧 FIXING: Daud Ahmad duplicate $20 payment');
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
    console.log(`Total ROI Earned: $${daud.totalRoiEarned || 0}\n`);

    // Remove $20
    const newRoiAmount = (daud.wallet.roi || 0) - 20;
    const newTotalRoiEarned = (daud.totalRoiEarned || 0) - 20;

    await User.findByIdAndUpdate(daud._id, {
      $set: {
        'wallet.roi': newRoiAmount,
        totalRoiEarned: newTotalRoiEarned
      }
    });

    // Create reversal transaction
    await Transaction.create({
      userId: daud._id,
      type: 'admin_deposit',
      amount: -20,
      status: 'completed',
      description: 'CORRECTION: Removed duplicate $20 payment (received twice by mistake)'
    });

    console.log('✅ Correction applied:\n');
    console.log(`   Removed: -$20.00`);
    console.log(`   New ROI wallet: $${newRoiAmount}`);
    console.log(`   New Total ROI Earned: $${newTotalRoiEarned}`);
    console.log(`\n💰 Daud Ahmad's ROI is now correct at $${newRoiAmount}\n`);

    console.log('=' .repeat(100));
    console.log('✅ CORRECTION COMPLETE\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

fixDaudDuplicate().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
