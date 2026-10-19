/**
 * Check if Farhankhan is on Mosa's downline
 * And trace the exact path of the three users
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');

async function checkConnection() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('TRACING REFERRAL CHAIN');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Find Farhankhan
    const farhankhan = await User.findOne({ email: 'fk6005806@gmail.com' })
      .select('_id name email referredBy');

    console.log(`👤 Farhankhan (fk6005806@gmail.com)`);
    console.log(`   ID: ${farhankhan._id}`);
    console.log(`   Referred By ID: ${farhankhan.referredBy}`);

    // Find who referred Farhankhan
    if (farhankhan.referredBy) {
      const referrer = await User.findById(farhankhan.referredBy)
        .select('_id name email referredBy');
      
      console.log(`\n   L1 Referrer: ${referrer.name} (${referrer.email})`);
      console.log(`      ID: ${referrer._id}`);
      console.log(`      Referred By: ${referrer.referredBy}`);

      if (referrer.referredBy) {
        const l2Referrer = await User.findById(referrer.referredBy)
          .select('_id name email');
        
        console.log(`\n   L2 Referrer: ${l2Referrer.name} (${l2Referrer.email})`);
        console.log(`      ID: ${l2Referrer._id}`);

        // Check if this is Muhammad Mosa
        const mosa = await User.findOne({ email: 'muhammadmosa9012@gmail.com' })
          .select('_id');

        if (l2Referrer._id.toString() === mosa._id.toString()) {
          console.log(`\n   ✓ Farhankhan IS on Mosa's Level 2! (2 levels deep)`);
        } else {
          console.log(`\n   ❌ Farhankhan is NOT on Mosa's level 2`);
          console.log(`      Mosa ID: ${mosa._id}`);
          console.log(`      L2 ID: ${l2Referrer._id}`);
        }
      }
    }

    // Now trace the three users
    console.log(`\n${'═'.repeat(60)}`);
    console.log('TRACING THE THREE USERS:');
    console.log('═'.repeat(60));

    const targetEmails = ['anti9574@gmil.com', 'zk979159@gmail.com', 'zaghamalikhan6@gmail.com'];
    const mosa = await User.findOne({ email: 'muhammadmosa9012@gmail.com' })
      .select('_id name');

    for (const email of targetEmails) {
      console.log(`\n📧 ${email}`);
      
      const user = await User.findOne({ email })
        .select('_id name referredBy');
      
      if (!user) {
        console.log('   ❌ Not found');
        continue;
      }

      let current = user;
      let depth = 0;
      let path = [{ name: current.name, email: email }];

      // Walk up the chain
      while (current.referredBy && depth < 15) {
        const parent = await User.findById(current.referredBy)
          .select('_id name email referredBy');
        
        if (!parent) break;

        path.push({ name: parent.name, email: parent.email, id: parent._id.toString() });
        
        // Check if we found Mosa
        if (parent._id.toString() === mosa._id.toString()) {
          console.log(`   ✓ Found at depth ${depth + 1}`);
          console.log(`\n   CHAIN:`);
          for (let i = 0; i < path.length; i++) {
            const prefix = i === 0 ? '   └─ ' : i < path.length - 1 ? '      ↓ ' : '      ↓ ✓ ';
            console.log(`${prefix} ${path[i].name} (${path[i].email})`);
          }
          break;
        }

        current = parent;
        depth++;
      }

      if (current.referredBy && depth >= 15) {
        console.log(`   ⚠️  Chain too deep (>15 levels)`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

checkConnection();
