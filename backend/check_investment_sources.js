const mongoose = require('mongoose');
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');
require('dotenv').config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Check M Khalid
    const mkhalid = await User.findOne({ name: 'M Khalid', email: 'khalidmalik9919@gmail.com' })
      .select('name wallet totalInvested');

    console.log(`M Khalid:`);
    console.log(`  wallet.capital: $${mkhalid.wallet?.capital || 0}`);
    console.log(`  totalInvested: $${mkhalid.totalInvested || 0}`);

    const invInv = await InvestorInvestment.find({ userId: mkhalid._id, status: 'active' });
    console.log(`  InvestorInvestment active: $${invInv.reduce((s, i) => s + i.amount, 0)} (${invInv.length} records)`);
    invInv.forEach(inv => console.log(`    - $${inv.amount}`));

    console.log();

    // Check Muhammad Sajid Iqbal
    const msiqbal = await User.findOne({ name: 'Muhammad Sajid Iqbal', email: 'raixaab@gmail.com' })
      .select('name wallet totalInvested');

    console.log(`Muhammad Sajid Iqbal:`);
    console.log(`  wallet.capital: $${msiqbal.wallet?.capital || 0}`);
    console.log(`  totalInvested: $${msiqbal.totalInvested || 0}`);

    const invInv2 = await InvestorInvestment.find({ userId: msiqbal._id, status: 'active' });
    console.log(`  InvestorInvestment active: $${invInv2.reduce((s, i) => s + i.amount, 0)} (${invInv2.length} records)`);
    invInv2.forEach(inv => console.log(`    - $${inv.amount}`));

    mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err);
    mongoose.connection.close();
    process.exit(1);
  }
}

check();
