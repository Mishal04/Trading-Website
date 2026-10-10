/**
 * set_daud_profit_to_160.js
 * 
 * Set Daud Ahmad's profit wallet to exactly $160
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

async function setDaudProfit() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    console.log('=' .repeat(100));
    console.log('🔧 SET: Daud Ahmad Profit Balance to $160');
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
    console.log(`Current Total Profit Earned: $${daud.totalProfitEarned || 0}\n`);

    // Set profit wallet to exactly $160
    await User.findByIdAndUpdate(daud._id, {
      $set: {
        'wallet.profit': 160
      }
    });

    console.log('✅ Updated:\n');
    console.log(`   Profit wallet: $160\n`);

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

setDaudProfit().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
