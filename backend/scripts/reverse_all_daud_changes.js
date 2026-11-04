/**
 * reverse_all_daud_changes.js
 * 
 * Reverse ALL changes made to Daud Ahmad
 * Restore to original state before any fixes
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

async function reverseAllDaudChanges() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    console.log('=' .repeat(100));
    console.log('⏮️  REVERSING: ALL changes to Daud Ahmad');
    console.log('=' .repeat(100) + '\n');

    // Find Daud Ahmad
    const daud = await User.findOne({ name: 'Daud Ahmad' });
    
    if (!daud) {
      console.log('❌ Daud Ahmad not found');
      process.exit(1);
    }

    console.log(`Found: ${daud.name}`);
    console.log(`Email: ${daud.email}`);
    console.log(`Current Profit wallet: $${daud.wallet.profit || 0}`);
    console.log(`Current ROI wallet: $${daud.wallet.roi || 0}\n`);

    // Delete ALL adjustment transactions we created
    console.log('📋 Deleting adjustment transactions...\n');

    const deleted = await Transaction.deleteMany({
      userId: daud._id,
      description: {
        $in: [
          'ADJUSTMENT: Removed $20 duplicate payment',
          'CORRECTION: Removed duplicate $20 payment (received twice by mistake)',
          'Daily ROI (100.0000%) from Phase 1 (Plan A) investment $2000'
        ]
      }
    });

    console.log(`  ✅ Deleted ${deleted.deletedCount} adjustment transactions\n`);

    // Restore profit wallet to $180
    console.log('💰 Restoring profit wallet to $180...\n');

    await User.findByIdAndUpdate(daud._id, {
      $set: {
        'wallet.profit': 180
      }
    });

    console.log('✅ Restored:\n');
    console.log(`   Profit wallet: $180 (restored)\n`);

    console.log('=' .repeat(100));
    console.log('✅ REVERSAL COMPLETE\n');
    console.log(`Daud Ahmad's data has been restored to original state\n`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

reverseAllDaudChanges().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
