/**
 * fix_daud_profit_180_to_160.js
 * 
 * Remove $20 from Daud Ahmad's profit wallet
 * From $180 to $160
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

async function fixDaudProfit() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    console.log('=' .repeat(100));
    console.log('🔧 FIX: Daud Ahmad Profit Balance $180 → $160');
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

    // Remove $20 from profit wallet
    const newProfitAmount = (daud.wallet.profit || 0) - 20;
    const newTotalProfitEarned = (daud.totalProfitEarned || 0) - 20;

    await User.findByIdAndUpdate(daud._id, {
      $set: {
        'wallet.profit': newProfitAmount,
        totalProfitEarned: newTotalProfitEarned
      }
    });

    // Create transaction record
    await Transaction.create({
      userId: daud._id,
      type: 'admin_deposit',
      amount: -20,
      status: 'completed',
      description: 'ADJUSTMENT: Removed $20 duplicate payment'
    });

    console.log('✅ Updated:\n');
    console.log(`   Removed: -$20`);
    console.log(`   Profit wallet: $${newProfitAmount} (from $${daud.wallet.profit})`);
    console.log(`   Total Profit Earned: $${newTotalProfitEarned}\n`);

    console.log('=' .repeat(100));
    console.log('✅ COMPLETE\n');
    console.log(`Daud Ahmad's Profit Balance is now: $${newProfitAmount}\n`);

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
