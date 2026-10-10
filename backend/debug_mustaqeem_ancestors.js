/**
 * debug_mustaqeem_ancestors.js
 * 
 * Check if Mustaqeem is properly set as ancestor for his direct referrals
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const InvestorInvestment = require('../src/models/InvestorInvestment');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function debugAncestors() {
  try {
    console.log('=' .repeat(120));
    console.log('🔍 DEBUG: Mustaqeem\'s Ancestor Path and Direct Referrals');
    console.log('=' .repeat(120) + '\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    // Find Mustaqeem
    const mustaqeem = await User.findOne({
      $or: [
        { firstName: 'Mustaqeem' },
        { email: { $regex: 'mustaq', $options: 'i' } }
      ]
    });

    if (!mustaqeem) {
      console.log('❌ Mustaqeem not found\n');
      process.exit(1);
    }

    console.log('Mustaqeem Profile:');
    console.log(`  ID: ${mustaqeem._id}`);
    console.log(`  Name: ${mustaqeem.firstName} ${mustaqeem.lastName}`);
    console.log(`  Email: ${mustaqeem.email}`);
    console.log(`  Direct Count: ${mustaqeem.directCount}`);
    console.log(`  Ancestor Path: ${mustaqeem.ancestorPath?.map(id => id.toString()).join(' -> ') || 'NONE'}\n`);

    // Find his direct referrals (children)
    console.log('Finding direct referrals (parentId = Mustaqeem)...\n');
    
    const directReferrals = await User.find({ parentId: mustaqeem._id });

    console.log(`Found ${directReferrals.length} direct referrals:\n`);

    for (const ref of directReferrals) {
      console.log(`  ${ref.firstName} ${ref.lastName} (${ref.email})`);
      console.log(`    ID: ${ref._id}`);
      console.log(`    Parent ID: ${ref.parentId}`);
      console.log(`    Ancestor Path: ${ref.ancestorPath?.map(id => id.toString()).join(' -> ') || 'NONE'}`);
      
      // Check if Mustaqeem is in their ancestor path
      const isMustaqeemAncestor = ref.ancestorPath?.some(id => id.toString() === mustaqeem._id.toString());
      console.log(`    ✅ Mustaqeem in path? ${isMustaqeemAncestor ? 'YES' : 'NO'}\n`);

      // Find their active investments
      const invs = await InvestorInvestment.find({
        userId: ref._id,
        status: 'active'
      });

      if (invs.length > 0) {
        console.log(`    Active Investments: ${invs.length}`);
        invs.forEach(inv => {
          console.log(`      • $${inv.amount} @ ${(inv.dailyRate * 100).toFixed(2)}%`);
        });
      } else {
        console.log(`    Active Investments: NONE`);
      }
      console.log();
    }

    console.log('=' .repeat(120));
    console.log('\n🔍 COMMISSION CALCULATION TEST:\n');

    // Simulate commission distribution
    const constants = require('./config/constants');
    const LEVEL_RATES = constants.LEVEL_RATES;

    console.log(`Mustaqeem's direct count: ${mustaqeem.directCount}`);
    
    if (mustaqeem.directCount > 0) {
      let payoutLevel;
      if (mustaqeem.directCount >= 10) {
        payoutLevel = 1;
      } else {
        payoutLevel = 22 - (mustaqeem.directCount * 2);
      }
      
      const ratePercent = LEVEL_RATES[payoutLevel - 1];
      console.log(`  Payout Level: L${payoutLevel}`);
      console.log(`  Commission Rate: ${ratePercent}%\n`);

      // Simulate each referral's investment getting processed
      for (const ref of directReferrals) {
        const invs = await InvestorInvestment.find({
          userId: ref._id,
          status: 'active'
        });

        console.log(`When ${ref.firstName}'s investments are processed:\n`);

        for (const inv of invs) {
          const baseAmount = inv.amount;
          const commission = (baseAmount * ratePercent) / 100;

          console.log(`  Investment: $${inv.amount}`);
          console.log(`    Commission to L${payoutLevel}: $${commission.toFixed(2)}`);
          
          // Check if Mustaqeem would receive this
          const isMustaqeemAncestor = ref.ancestorPath?.some(id => id.toString() === mustaqeem._id.toString());
          if (isMustaqeemAncestor) {
            console.log(`    ✅ Mustaqeem (ancestor) receives: $${commission.toFixed(2)}`);
          } else {
            console.log(`    ❌ Mustaqeem NOT in ancestor path - NO COMMISSION`);
          }
          console.log();
        }
      }
    } else {
      console.log('  ❌ NO DIRECT REFERRALS - no commissions to calculate\n');
    }

    console.log('=' .repeat(120) + '\n');
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

debugAncestors().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
