const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');

(async () => {
  try {
    console.log('\n' + '='.repeat(100));
    console.log('🔧 FIX: Setting up Mustaqeem for Monday commissions');
    console.log('='.repeat(100) + '\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');

    // Find Mustaqeem
    const mustaqeem = await User.findOne({ name: 'Mustaqeem' });
    if (!mustaqeem) {
      console.log('❌ Mustaqeem not found');
      process.exit(1);
    }

    console.log(`Found: ${mustaqeem.name} (${mustaqeem.email})`);
    console.log(`ID: ${mustaqeem._id}\n`);

    // Find who referred others to Mustaqeem (his direct referrals)
    const directReferrals = await User.find({ referredBy: mustaqeem._id });
    
    console.log(`Current directCount: ${mustaqeem.directCount}`);
    console.log(`Users who have Mustaqeem as referrer: ${directReferrals.length}\n`);

    if (directReferrals.length > 0) {
      console.log('Direct referrals:\n');
      directReferrals.forEach((ref, idx) => {
        console.log(`  [${idx + 1}] ${ref.name} (${ref.email})`);
        console.log(`      ID: ${ref._id}`);
      });
      console.log();

      // Check their investments
      console.log('Checking their investments:\n');
      for (const ref of directReferrals) {
        const invs = await InvestorInvestment.find({
          userId: ref._id,
          status: 'active'
        });
        console.log(`  ${ref.name}: ${invs.length} active investments`);
        invs.forEach(inv => {
          console.log(`    • $${inv.amount} @ ${(inv.dailyRate * 100).toFixed(2)}%`);
        });
      }
      console.log();

      // Fix directCount
      console.log(`🔧 Updating Mustaqeem's directCount from ${mustaqeem.directCount} to ${directReferrals.length}...\n`);
      
      await User.findByIdAndUpdate(mustaqeem._id, {
        $set: { directCount: directReferrals.length }
      });

      const updated = await User.findById(mustaqeem._id);
      console.log(`✅ Updated directCount to: ${updated.directCount}\n`);

      // Verify ancestor paths
      console.log('Verifying ancestor paths:\n');
      for (const ref of directReferrals) {
        const updated = await User.findById(ref._id);
        const hasAncestor = updated.ancestorPath?.some(id => id.toString() === mustaqeem._id.toString());
        console.log(`  ${ref.name}: ${hasAncestor ? '✅' : '❌'} in ancestorPath`);
        
        if (!hasAncestor) {
          console.log(`    Adding to ancestorPath...`);
          const newPath = [mustaqeem._id, ...(updated.ancestorPath || [])].slice(0, 25);
          await User.findByIdAndUpdate(ref._id, {
            $set: { ancestorPath: newPath }
          });
          console.log(`    ✅ Updated\n`);
        }
      }
    } else {
      console.log('⚠️  No direct referrals found for Mustaqeem\n');
    }

    // Summary
    console.log('='.repeat(100));
    console.log('\n📊 FINAL STATUS\n');

    const updatedMustaqeem = await User.findById(mustaqeem._id);
    console.log(`Mustaqeem's directCount: ${updatedMustaqeem.directCount}`);

    if (updatedMustaqeem.directCount > 0) {
      const LEVEL_RATES = [25, 5, 5, 2, 2, 2, 2, 2, 2, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 1];
      
      let payoutLevel;
      if (updatedMustaqeem.directCount >= 10) {
        payoutLevel = 1;
      } else {
        payoutLevel = 22 - (updatedMustaqeem.directCount * 2);
      }

      const rate = LEVEL_RATES[payoutLevel - 1];
      console.log(`Commission Level: L${payoutLevel} @ ${rate}%\n`);

      // Calculate expected earnings
      let totalCommissions = 0;
      const refs = await User.find({ referredBy: mustaqeem._id });
      for (const ref of refs) {
        const invs = await InvestorInvestment.find({
          userId: ref._id,
          status: 'active'
        });
        for (const inv of invs) {
          const comm = (inv.amount * rate) / 100;
          totalCommissions += comm;
        }
      }

      console.log(`✅ MONDAY 4 PM EARNINGS: $${totalCommissions.toFixed(2)}\n`);
    }

    console.log('='.repeat(100) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
