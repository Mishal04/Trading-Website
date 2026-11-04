/**
 * fix_daud_200_to_160.js
 * 
 * Remove $40 from Daud Ahmad's profit wallet
 * From $200 to $160
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

async function fixDaudProfit() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    console.log('=' .repeat(100));
    console.log('🔧 FIX: Daud Ahmad Profit Balance $200 → $160');
    console.log('=' .repeat(100) + '\n');

    // Find Daud Ahmad
    const daud = await User.findOne({ name: 'Daud Ahmad' });
    
    if (!daud) {
      console.log('❌ Daud Ahmad not found');
      process.exit(1);
    }

    console.log(`Found: ${daud.name}`);
    console.log(`Email: ${daud.email}`);
    console.log(`Current Profit wallet: $${daud.wallet.profit || 0}\n`);

    // Set profit wallet to exactly $160
    await User.findByIdAndUpdate(daud._id, {
      $set: {
        'wallet.profit': 160
      }
    });

    console.log('✅ Updated:\n');
    console.log(`   Profit wallet: $160 (removed $40)\n`);

    console.log('=' .repeat(100));
    console.log('✅ COMPLETE\n');
    console.log(`Daud Ahmad's Profit Balance is now: $160\n`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

fixDaudProfit().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
