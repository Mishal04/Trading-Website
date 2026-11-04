/**
 * Check what referrers see in their downline
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');
const Investment = require('./src/models/Investment');
const InvestorInvestment = require('./src/models/InvestorInvestment');

async function checkDownlineView() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('CHECKING DOWNLINE VIEWS FOR REFERRERS');
    console.log('═══════════════════════════════════════════════════════════\n');

    // The referrers
    const referrerEmails = [
      'alishoka234@gmail.com',  // Shokut - refers M Yasir
      'fk6005806@gmail.com'     // Farhankhan - refers Zeeshan Khan & Zagham Alikhan
    ];

    for (const referrerEmail of referrerEmails) {
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`👤 REFERRER: ${referrerEmail}`);
      console.log('═'.repeat(60));

      const referrer = await User.findOne({ email: referrerEmail })
        .select('_id name email directCount wallet');

      if (!referrer) {
        console.log(`❌ Referrer not found\n`);
        continue;
      }

      console.log(`Name: ${referrer.name}`);
      console.log(`ID: ${referrer._id}`);
      console.log(`Direct Count: ${referrer.directCount}`);
      console.log(`Wallet Capital: $${referrer.wallet?.capital || 0}`);
      console.log(`Wallet Commission: $${referrer.wallet?.commission || 0}`);

      // Get direct referrals
      const directs = await User.find({ referredBy: referrer._id })
        .select('_id name email wallet totalInvested');

      console.log(`\n📊 DIRECT DOWNLINE (${directs.length}):`);
      
      for (const direct of directs) {
        console.log(`\n  └─ ${direct.name} (${direct.email})`);
        console.log(`     ID: ${direct._id}`);
        console.log(`     Wallet Capital: $${direct.wallet?.capital || 0}`);
        console.log(`     Total Invested: $${direct.totalInvested}`);

        // Check investments
        const investments = await InvestorInvestment.find({ userId: direct._id })
          .select('amount status plan createdAt');
        
        console.log(`     Plan Investments: ${investments.length}`);
        if (investments.length > 0) {
          investments.forEach(inv => {
            console.log(`       • $${inv.amount} Plan ${inv.plan} - ${inv.status} (${inv.createdAt.toLocaleDateString()})`);
          });
        }
      }

      console.log('\n');
    }

    // Now check what happens when we calculate commissions
    console.log('\n' + '═'.repeat(60));
    console.log('CHECKING COMMISSION CALCULATION');
    console.log('═'.repeat(60));

    // Check if the new users' capital is being used
    const newUsers = await User.find({
      email: { $in: ['anti9574@gmil.com', 'zk979159@gmail.com', 'zaghamalikhan6@gmail.com'] }
    }).select('_id name email wallet');

    console.log('\nNew Users Capital Status:');
    for (const user of newUsers) {
      console.log(`  ${user.name}: wallet.capital = $${user.wallet?.capital || 0}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('CHECK COMPLETE');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

checkDownlineView();
