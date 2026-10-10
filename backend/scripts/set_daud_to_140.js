/**
 * set_daud_to_140.js
 * 
 * Set Daud Ahmad's profit balance to exactly $140
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

async function setDaudTo140() {
  try {
    console.log('=' .repeat(100));
    console.log('🔧 FIX: Set Daud Ahmad Profit to $140');
    console.log('=' .repeat(100) + '\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const daud = await User.findOne({ name: 'Daud Ahmad' });
    
    if (!daud) {
      console.log('❌ Daud Ahmad not found');
      process.exit(1);
    }

    console.log('Before:');
    console.log(`  Profit wallet: $${daud.wallet.profit}`);
    console.log(`  ROI wallet: $${daud.wallet.roi}`);
    console.log(`  Total shown: $${daud.wallet.profit + daud.wallet.roi}\n`);

    // Set profit to exactly 140
    await User.findByIdAndUpdate(daud._id, {
      $set: {
        'wallet.profit': 140
      }
    });

    const updated = await User.findById(daud._id);
    console.log('After:');
    console.log(`  Profit wallet: $${updated.wallet.profit}`);
    console.log(`  ROI wallet: $${updated.wallet.roi}`);
    console.log(`  Total shown: $${updated.wallet.profit + updated.wallet.roi}\n`);

    console.log('=' .repeat(100));
    console.log('✅ COMPLETE\n');
    console.log(`Daud Ahmad's Profit Balance is now: $${updated.wallet.profit}\n`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

setDaudTo140().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
