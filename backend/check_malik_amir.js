const mongoose = require('mongoose');
const User = require('./src/models/User');
const Investment = require('./src/models/Investment');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(100));
    console.log('MALIK AMIR - INVESTMENT vs CAPITAL MISMATCH');
    console.log('═'.repeat(100) + '\n');

    const malik = await User.findOne({ email: 'malikamir1163@gmail.com' });
    if (!malik) {
      console.log('❌ User not found');
      mongoose.connection.close();
      process.exit(1);
    }

    console.log(`User: ${malik.name} (${malik.email})\n`);

    // Check wallet
    console.log('WALLET STATE:');
    console.log(`  wallet.capital: $${malik.wallet?.capital || 0}`);
    console.log(`  wallet.profit: $${malik.wallet?.profit || 0}`);
    console.log(`  wallet.commission: $${malik.wallet?.commission || 0}\n`);

    // Check active investments
    const activeInvs = await Investment.find({
      userId: malik._id,
      status: 'active',
      isActive: true
    });

    console.log(`Active Investments (Plan A): ${activeInvs.length}`);
    let totalInvested = 0;
    activeInvs.forEach((inv, i) => {
      console.log(`  ${i + 1}. Amount: $${inv.amount}, Status: ${inv.status}, Created: ${new Date(inv.createdAt).toLocaleString()}`);
      totalInvested += inv.amount;
    });
    console.log(`  Total Active Capital: $${totalInvested}\n`);

    // Check pending investments
    const pendingInvs = await Investment.find({
      userId: malik._id,
      status: 'pending'
    });

    console.log(`Pending Investments: ${pendingInvs.length}`);
    pendingInvs.forEach((inv, i) => {
      console.log(`  ${i + 1}. Amount: $${inv.amount}, Status: ${inv.status}, Created: ${new Date(inv.createdAt).toLocaleString()}`);
    });
    console.log('');

    // Check all investments
    const allInvs = await Investment.find({
      userId: malik._id
    }).sort({ createdAt: -1 });

    console.log(`All Investments (including inactive): ${allInvs.length}`);
    let totalAll = 0;
    allInvs.forEach((inv, i) => {
      console.log(`  ${i + 1}. Amount: $${inv.amount}, Status: ${inv.status}, isActive: ${inv.isActive}, Created: ${new Date(inv.createdAt).toLocaleString()}`);
      totalAll += inv.amount;
    });
    console.log(`  Total All: $${totalAll}\n`);

    console.log('═'.repeat(100));
    console.log('SUMMARY');
    console.log('═'.repeat(100));
    console.log(`\nDownline shows: $600 (Invested)`);
    console.log(`wallet.capital: $${malik.wallet?.capital || 0}`);
    console.log(`Active Investments: $${totalInvested}`);
    console.log(`All Investments: $${totalAll}`);
    console.log(`\n💡 The $600 is likely from:`);
    if (totalAll >= 600) {
      console.log(`   → Total of all investments (active + pending + inactive)`);
    }
    if (totalInvested > 0) {
      console.log(`   → Active investments should count as wallet.capital`);
      if (malik.wallet?.capital !== totalInvested) {
        console.log(`   ⚠️ MISMATCH: wallet.capital ($${malik.wallet?.capital}) ≠ active investments ($${totalInvested})`);
      }
    }
    console.log('═'.repeat(100) + '\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    mongoose.connection.close();
    process.exit(1);
  }
})();
