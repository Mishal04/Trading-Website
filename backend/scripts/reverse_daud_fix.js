/**
 * reverse_daud_fix.js
 * 
 * Reverse all changes made to Daud Ahmad
 * - Restore ROI wallet to $40
 * - Restore Total ROI Earned to $200.60
 * - Restore deleted transactions
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

async function reverseDaudFix() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    console.log('=' .repeat(100));
    console.log('⏮️  REVERSING: All changes to Daud Ahmad');
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

    // Restore original values
    console.log('📋 Restoring original wallet values...\n');

    await User.findByIdAndUpdate(daud._id, {
      $set: {
        'wallet.roi': 40,
        totalRoiEarned: 200.60
      }
    });

    console.log('✅ Restored:\n');
    console.log(`   ROI wallet: $40`);
    console.log(`   Total ROI Earned: $200.60\n`);

    // Restore the deleted transactions
    console.log('📋 Restoring deleted transactions...\n');

    const transactionsToRestore = [
      {
        userId: daud._id,
        type: 'admin_deposit',
        amount: -20,
        status: 'completed',
        description: 'CORRECTION: Removed duplicate $20 payment (received twice by mistake)',
        createdAt: new Date(Date.now() - 10 * 60000) // 10 minutes ago
      },
      {
        userId: daud._id,
        type: 'profit',
        amount: 20,
        status: 'completed',
        description: 'Daily ROI (100.0000%) from Phase 1 (Plan A) investment $2000',
        createdAt: new Date(Date.now() - 15 * 60000) // 15 minutes ago
      }
    ];

    const created = await Transaction.insertMany(transactionsToRestore);

    console.log(`  ✅ Restored ${created.length} transactions\n`);

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

reverseDaudFix().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
