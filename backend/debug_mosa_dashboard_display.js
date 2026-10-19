/**
 * Debug: Check exactly what dashboard should display for Muhammad Mosa
 * Simulate the getDownline API response
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');

async function debugDashboardDisplay() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('DEBUG: Muhammad Mosa Dashboard Display');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Find Muhammad Mosa
    const mosa = await User.findOne({ email: 'muhammadmosa9012@gmail.com' })
      .select('_id name email wallet directCount');

    if (!mosa) {
      console.log('❌ Muhammad Mosa not found\n');
      return;
    }

    console.log(`👤 Muhammad Mosa`);
    console.log(`   Wallet Capital: $${mosa.wallet?.capital || 0}`);
    console.log(`   Wallet Profit: $${mosa.wallet?.profit || 0}`);
    console.log(`   Wallet Commission: $${mosa.wallet?.commission || 0}`);
    console.log(`   Direct Count: ${mosa.directCount}\n`);

    // Simulate getDownline query - find all users with Mosa in ancestorPath
    const byAncestorPath = await User.find({ ancestorPath: mosa._id })
      .select('_id name email wallet directCount ancestorPath referredBy')
      .lean();

    console.log(`📊 Users with Mosa in ancestorPath: ${byAncestorPath.length}\n`);

    // Check the three specific users
    const targetEmails = ['anti9574@gmil.com', 'zk979159@gmail.com', 'zaghamalikhan6@gmail.com'];
    
    console.log(`Checking for the three users:\n`);
    for (const email of targetEmails) {
      const user = byAncestorPath.find(u => u.email === email.toLowerCase());
      if (user) {
        // Calculate level
        const idx = user.ancestorPath.findIndex(id => id.toString() === mosa._id.toString());
        const level = idx !== -1 ? idx + 1 : 1;
        
        console.log(`✓ ${email}`);
        console.log(`  Level: ${level}`);
        console.log(`  Wallet Capital: $${user.wallet?.capital || 0}`);
        console.log(`  Wallet Profit: $${user.wallet?.profit || 0}`);
        console.log();
      } else {
        console.log(`❌ ${email} NOT FOUND in ancestorPath\n`);
      }
    }

    // Calculate what dashboard should show
    console.log(`${'─'.repeat(60)}`);
    console.log('WHAT DASHBOARD SHOULD CALCULATE:\n');

    let totalCapital = 0;
    let totalInvested = 0;
    let userCount = 0;

    for (const user of byAncestorPath) {
      const capital = user.wallet?.capital || 0;
      if (capital > 0) {
        totalCapital += capital;
        userCount++;
        console.log(`${user.name}: $${capital}`);
      }
    }

    console.log(`\n📈 TOTALS:`);
    console.log(`   Total Users with Capital: ${userCount}`);
    console.log(`   Total Capital (Downline): $${totalCapital}`);
    console.log(`   Should Display: $${totalCapital}\n`);

    // Check if the issue is in the query itself
    console.log(`${'─'.repeat(60)}`);
    console.log('CHECKING QUERY LOGIC:\n');

    // Test the exact query from getDownline
    console.log(`Query: find({ ancestorPath: ${mosa._id} })`);
    console.log(`Expected matches: ${byAncestorPath.length}`);

    // Double check: are the three users actually in there?
    console.log(`\nDouble checking three users in query result:`);
    targetEmails.forEach(email => {
      const found = byAncestorPath.some(u => u.email === email);
      console.log(`  ${email}: ${found ? '✓ FOUND' : '❌ NOT FOUND'}`);
    });

    // Check if wallet data exists
    console.log(`\n${'─'.repeat(60)}`);
    console.log('CHECKING WALLET DATA:\n');

    for (const email of targetEmails) {
      const user = await User.findOne({ email }).select('wallet');
      if (user) {
        console.log(`${email}:`);
        console.log(`  wallet.capital: ${user.wallet?.capital}`);
        console.log(`  wallet.profit: ${user.wallet?.profit}`);
        console.log(`  wallet object: ${JSON.stringify(user.wallet)}`);
        console.log();
      }
    }

    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

debugDashboardDisplay();
