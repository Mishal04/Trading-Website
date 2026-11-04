/**
 * Check Muhammad Mosa's downline - why Level 2 shows $0 investment
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');
const Investment = require('./src/models/Investment');
const InvestorInvestment = require('./src/models/InvestorInvestment');

async function checkMosaDownline() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('CHECKING MUHAMMAD MOSA DOWNLINE ISSUE');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Find Muhammad Mosa
    const mosa = await User.findOne({ email: 'muhammadmosa9012@gmail.com' })
      .select('_id name email directCount ancestorPath')
      .populate('ancestorPath', '_id name email');

    if (!mosa) {
      console.log('❌ Muhammad Mosa not found\n');
      return;
    }

    console.log(`👤 Muhammad Mosa (${mosa.email})`);
    console.log(`   ID: ${mosa._id}`);
    console.log(`   Direct Count: ${mosa.directCount}`);
    console.log(`   Ancestor Path Length: ${mosa.ancestorPath?.length}\n`);

    // Get all direct referrals (Level 1)
    const level1 = await User.find({ referredBy: mosa._id })
      .select('_id name email wallet totalInvested directCount');

    console.log(`📊 LEVEL 1 DOWNLINE (${level1.length}):`);
    level1.forEach((user, i) => {
      console.log(`   ${i + 1}. ${user.name} (${user.email})`);
      console.log(`      Wallet Capital: $${user.wallet?.capital || 0}`);
      console.log(`      Total Invested: $${user.totalInvested}`);
      console.log(`      Direct Count: ${user.directCount}`);
    });

    // Get Level 2 (referrals of Level 1)
    console.log(`\n📊 LEVEL 2 DOWNLINE:`);
    const level2Users = [];
    
    for (const level1User of level1) {
      const level2 = await User.find({ referredBy: level1User._id })
        .select('_id name email wallet totalInvested directCount referredBy');
      
      if (level2.length > 0) {
        console.log(`\n   Under ${level1User.name}:`);
        for (const user of level2) {
          console.log(`     └─ ${user.name} (${user.email})`);
          console.log(`        ID: ${user._id}`);
          console.log(`        Wallet Capital: $${user.wallet?.capital || 0}`);
          console.log(`        Total Invested: $${user.totalInvested}`);
          console.log(`        Referred By: ${user.referredBy}`);
          level2Users.push(user);
        }
      }
    }

    // Check the three specific users
    console.log(`\n${'─'.repeat(60)}`);
    console.log('CHECKING THE THREE USERS:');
    console.log('─'.repeat(60));

    const targetEmails = ['anti9574@gmil.com', 'zk979159@gmail.com', 'zaghamalikhan6@gmail.com'];

    for (const email of targetEmails) {
      console.log(`\n📧 ${email}`);
      
      const user = await User.findOne({ email })
        .select('_id name email referredBy wallet totalInvested');
      
      if (!user) {
        console.log('   ❌ Not found');
        continue;
      }

      // Find referrer
      const referrer1 = await User.findById(user.referredBy)
        .select('_id name email referredBy');

      console.log(`   L1 Referrer: ${referrer1.name} (${referrer1.email})`);
      
      if (referrer1.referredBy) {
        const referrer2 = await User.findById(referrer1.referredBy)
          .select('_id name email');
        console.log(`   L2 Referrer: ${referrer2.name} (${referrer2.email})`);
        
        if (referrer2._id.toString() === mosa._id.toString()) {
          console.log(`   ✓ IS ON MOSA'S LEVEL 2`);
          console.log(`   Wallet Capital: $${user.wallet?.capital || 0}`);
          console.log(`   Total Invested: $${user.totalInvested}`);
        }
      }
    }

    // Check the downline calculation logic
    console.log(`\n${'═'.repeat(60)}`);
    console.log('ANALYZING DOWNLINE CALCULATION:');
    console.log('═'.repeat(60));

    // Simulate what the API does
    console.log('\nChecking downline investments calculation...\n');

    const allDownline = [];
    
    // Get all level 1
    for (const l1 of level1) {
      allDownline.push({ level: 1, user: l1 });
      
      // Get all level 2
      const l2Users = await User.find({ referredBy: l1._id })
        .select('_id name email wallet totalInvested');
      
      for (const l2 of l2Users) {
        allDownline.push({ level: 2, user: l2 });
      }
    }

    console.log(`Total downline users found: ${allDownline.length}`);
    
    let totalCapital = 0;
    let totalInvested = 0;

    for (const item of allDownline) {
      const capital = item.user.wallet?.capital || 0;
      const invested = item.user.totalInvested || 0;
      
      totalCapital += capital;
      totalInvested += invested;

      if (capital > 0 || invested > 0) {
        console.log(`L${item.level}: ${item.user.name} - Capital: $${capital}, Invested: $${invested}`);
      }
    }

    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total Downline Capital: $${totalCapital}`);
    console.log(`   Total Downline Invested: $${totalInvested}`);

    console.log('\n═══════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

checkMosaDownline();
