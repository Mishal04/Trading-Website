/**
 * fix_daud_roi_to_zero.js
 * 
 * Remove $40 from Daud Ahmad's ROI wallet
 * His profit wallet is $160 (correct), but ROI wallet has $40 that's being shown as "Daily returns"
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

async function fixDaudROI() {
  try {
    console.log('=' .repeat(100));
    console.log('🔧 FIX: Daud Ahmad ROI Wallet $40 → $0');
    console.log('=' .repeat(100) + '\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    // Find Daud Ahmad
    const daud = await User.findOne({ name: 'Daud Ahmad' });
    
    if (!daud) {
      console.log('❌ Daud Ahmad not found');
      process.exit(1);
    }

    console.log(`Found: ${daud.name}`);
    console.log(`Email: ${daud.email}`);
    console.log(`Current wallet state:`);
    console.log(`  Profit: $${daud.wallet.profit}`);
    console.log(`  ROI: $${daud.wallet.roi}`);
    console.log(`  Total shown to user: $${(daud.wallet.profit + daud.wallet.roi)}\n`);

    // Set ROI wallet to 0
    await User.findByIdAndUpdate(daud._id, {
      $set: {
        'wallet.roi': 0
      }
    });

    const updated = await User.findById(daud._id);
    console.log('✅ Updated:\n');
    console.log(`  Profit: $${updated.wallet.profit}`);
    console.log(`  ROI: $${updated.wallet.roi}`);
    console.log(`  Total shown to user: $${(updated.wallet.profit + updated.wallet.roi)}\n`);

    console.log('=' .repeat(100));
    console.log('✅ COMPLETE\n');
    console.log(`Daud Ahmad's Profit Balance is now: $${updated.wallet.profit} (no daily returns stacking)\n`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

fixDaudROI().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
