/**
 * test_monday_cron.js
 * 
 * TEST: Run the actual Monday cron to verify Mustaqeem gets exactly $20.70
 * This simulates what will happen at 4 PM Monday Oct 13
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');
const profitService = require('./src/services/profitService');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function testCron() {
  try {
    console.log('\n' + '=' .repeat(100));
    console.log('🧪 TEST: Run Monday Cron - Verify Mustaqeem Earnings');
    console.log('=' .repeat(100) + '\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    // Find Mustaqeem BEFORE
    const mustaqeemBefore = await User.findOne({ name: 'Mustaqeem' });
    console.log('BEFORE Cron Run:\n');
    console.log(`Mustaqeem (${mustaqeemBefore.email})`);
    console.log(`  Profit Wallet: $${(mustaqeemBefore.wallet?.profit || 0).toFixed(2)}`);
    console.log(`  Commission Wallet: $${(mustaqeemBefore.wallet?.commission || 0).toFixed(2)}`);
    console.log(`  ROI Wallet: $${(mustaqeemBefore.wallet?.roi || 0).toFixed(2)}`);
    
    const totalBefore = (mustaqeemBefore.wallet?.profit || 0) + 
                        (mustaqeemBefore.wallet?.commission || 0) + 
                        (mustaqeemBefore.wallet?.roi || 0);
    console.log(`  TOTAL: $${totalBefore.toFixed(2)}\n`);

    // Get his referrals' investments BEFORE
    console.log('His referrals\' investments:');
    const zain = await User.findOne({ name: 'Zain' });
    const jamshed = await User.findOne({ name: 'jamshed' });

    const zainBefore = await User.findById(zain._id);
    const jamshedBefore = await User.findById(jamshed._id);

    console.log(`  Zain: Commission $${(zainBefore.wallet?.commission || 0).toFixed(2)}`);
    console.log(`  Jamshed: Commission $${(jamshedBefore.wallet?.commission || 0).toFixed(2)}\n`);

    // ═══════════════════════════════════════════════════════════════════════════════
    // RUN THE CRON
    // ═══════════════════════════════════════════════════════════════════════════════

    console.log('🔄 Running calculateDailyProfits() cron...\n');

    const result = await profitService.calculateDailyProfits();
    
    console.log(`Result: ${result.processedCount} investments processed`);
    console.log(`Total ROI distributed: $${result.totalProfitDistributed.toFixed(2)}\n`);

    // ═══════════════════════════════════════════════════════════════════════════════
    // CHECK AFTER
    // ═══════════════════════════════════════════════════════════════════════════════

    console.log('=' .repeat(100));
    console.log('\nAFTER Cron Run:\n');

    const mustaqeemAfter = await User.findOne({ name: 'Mustaqeem' });
    console.log(`Mustaqeem (${mustaqeemAfter.email})`);
    console.log(`  Profit Wallet: $${(mustaqeemAfter.wallet?.profit || 0).toFixed(2)}`);
    console.log(`  Commission Wallet: $${(mustaqeemAfter.wallet?.commission || 0).toFixed(2)}`);
    console.log(`  ROI Wallet: $${(mustaqeemAfter.wallet?.roi || 0).toFixed(2)}`);
    
    const totalAfter = (mustaqeemAfter.wallet?.profit || 0) + 
                       (mustaqeemAfter.wallet?.commission || 0) + 
                       (mustaqeemAfter.wallet?.roi || 0);
    console.log(`  TOTAL: $${totalAfter.toFixed(2)}\n`);

    const mustaqeemEarned = totalAfter - totalBefore;
    console.log(`💰 Mustaqeem earned: $${mustaqeemEarned.toFixed(2)}\n`);

    // Verify amounts
    console.log('=' .repeat(100));
    console.log('\n✅ VERIFICATION\n');

    if (Math.abs(mustaqeemEarned - 20.70) < 0.01) {
      console.log('✅✅✅ SUCCESS! Mustaqeem earned EXACTLY $20.70 ✅✅✅\n');
    } else if (mustaqeemEarned > 0) {
      console.log(`⚠️  Mustaqeem earned $${mustaqeemEarned.toFixed(2)} (expected $20.70)`);
      console.log(`   Difference: $${(mustaqeemEarned - 20.70).toFixed(2)}\n`);
    } else {
      console.log(`❌ FAILED: Mustaqeem earned $0 (expected $20.70)\n`);
    }

    // Check his referrals
    console.log('His referrals after cron:\n');
    
    const zainAfter = await User.findById(zain._id);
    const jamshedAfter = await User.findById(jamshed._id);

    const zainRoiEarned = (zainAfter.wallet?.roi || 0) - (zainBefore.wallet?.roi || 0);
    const jamshedRoiEarned = (jamshedAfter.wallet?.roi || 0) - (jamshedBefore.wallet?.roi || 0);

    console.log(`  Zain earned ROI: $${zainRoiEarned.toFixed(2)} (expected $12.00)`);
    console.log(`  Jamshed earned ROI: $${jamshedRoiEarned.toFixed(2)} (expected $11.00)\n`);

    console.log('=' .repeat(100) + '\n');

    await mongoose.disconnect();
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

testCron().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
