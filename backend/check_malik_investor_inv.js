const mongoose = require('mongoose');
const User = require('./src/models/User');
const Investment = require('./src/models/Investment');
const InvestorInvestment = require('./src/models/InvestorInvestment');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(100));
    console.log('MALIK AMIR - CHECK ALL INVESTMENT SOURCES');
    console.log('═'.repeat(100) + '\n');

    const malik = await User.findOne({ email: 'malikamir1163@gmail.com' });
    if (!malik) {
      console.log('❌ User not found');
      mongoose.connection.close();
      process.exit(1);
    }

    console.log(`User: ${malik.name} (${malik.email}) - ID: ${malik._id}\n`);

    // Check Investment collection
    const investments = await Investment.find({ userId: malik._id });
    console.log(`Investment records: ${investments.length}`);
    investments.forEach((inv, i) => {
      console.log(`  ${i + 1}. Amount: $${inv.amount}, Status: ${inv.status}, isActive: ${inv.isActive}`);
    });
    console.log('');

    // Check InvestorInvestment collection
    const investorInvs = await InvestorInvestment.find({ userId: malik._id });
    console.log(`InvestorInvestment records: ${investorInvs.length}`);
    investorInvs.forEach((inv, i) => {
      console.log(`  ${i + 1}. Amount: $${inv.amount}, Status: ${inv.status}, Package: ${inv.package}`);
    });
    console.log('');

    // Check wallet.capital
    console.log(`wallet.capital: $${malik.wallet?.capital || 0}\n`);

    // Sum them up
    const invTotal = investments.filter(i => i.status === 'active').reduce((s, i) => s + i.amount, 0);
    const invInvTotal = investorInvs.filter(i => i.status === 'active').reduce((s, i) => s + i.amount, 0);
    const capitalTotal = malik.wallet?.capital || 0;

    console.log('═'.repeat(100));
    console.log('TOTALS');
    console.log('═'.repeat(100));
    console.log(`Investment (active): $${invTotal}`);
    console.log(`InvestorInvestment (active): $${invInvTotal}`);
    console.log(`wallet.capital: $${capitalTotal}`);
    console.log(`TOTAL: $${invTotal + invInvTotal + capitalTotal}`);
    console.log(`\nDownline shows: $600`);
    console.log('═'.repeat(100) + '\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    mongoose.connection.close();
    process.exit(1);
  }
})();
