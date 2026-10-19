/**
 * Check referrals and investments for specific users
 * Investigates why investments aren't showing on downline
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');
const Investment = require('./src/models/Investment');
const InvestorInvestment = require('./src/models/InvestorInvestment');

async function checkUserReferrals() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('CHECKING REFERRALS AND INVESTMENTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const emailsToCheck = [
      'anti9574@gmil.com',
      'zk979159@gmail.com',
      'zaghamalikhan6@gmail.com'
    ];

    for (const email of emailsToCheck) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`📧 USER: ${email}`);
      console.log('─'.repeat(60));

      // Find the user
      const user = await User.findOne({ email }).select('_id name email referredBy wallet totalInvested directCount');
      
      if (!user) {
        console.log(`❌ User not found: ${email}\n`);
        continue;
      }

      console.log(`✓ Found: ${user.name || 'N/A'}`);
      console.log(`  User ID: ${user._id}`);
      console.log(`  Direct Count: ${user.directCount}`);
      console.log(`  Total Invested: $${user.totalInvested}`);
      console.log(`  Wallet Capital: $${user.wallet?.capital || 0}`);

      // Check who referred this user
      if (user.referredBy) {
        const referrer = await User.findById(user.referredBy).select('name email');
        console.log(`\n  📍 REFERRED BY: ${referrer.name || 'N/A'} (${referrer.email})`);
        console.log(`     Referrer ID: ${user.referredBy}`);
      } else {
        console.log(`\n  📍 REFERRED BY: NONE (Root user or not set)`);
      }

      // Check investments
      const investments = await Investment.find({ userId: user._id }).select('amount status createdAt');
      const investorInvestments = await InvestorInvestment.find({ userId: user._id }).select('amount status createdAt plan');

      console.log(`\n  💰 INVESTMENTS:`);
      console.log(`     Regular Investments: ${investments.length}`);
      if (investments.length > 0) {
        investments.forEach((inv, i) => {
          console.log(`       ${i + 1}. $${inv.amount} - Status: ${inv.status} (${inv.createdAt.toLocaleDateString()})`);
        });
      }

      console.log(`     Plan Investments: ${investorInvestments.length}`);
      if (investorInvestments.length > 0) {
        investorInvestments.forEach((inv, i) => {
          console.log(`       ${i + 1}. $${inv.amount} Plan ${inv.plan} - Status: ${inv.status} (${inv.createdAt.toLocaleDateString()})`);
        });
      }

      // Check if they're in referrer's downline
      if (user.referredBy) {
        const referrer = await User.findById(user.referredBy)
          .select('_id name ancestorPath')
          .populate('ancestorPath', '_id');

        console.log(`\n  📊 REFERRER'S INFO:`);
        console.log(`     Ancestor Path Length: ${referrer.ancestorPath?.length || 0}`);

        // Get referrer's direct referrals
        const directReferrals = await User.find({ referredBy: user.referredBy }).select('name email');
        console.log(`     Direct Referrals Count: ${directReferrals.length}`);
        
        // Check if this user is in the list
        const isInDirect = directReferrals.some(u => u._id.equals(user._id));
        console.log(`     ${isInDirect ? '✓' : '❌'} User is in direct referrals list`);
      }

      console.log();
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

checkUserReferrals();
