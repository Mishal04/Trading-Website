const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('\n' + '='.repeat(100));
    console.log('DEBUG: User ROI Calculations\n');

    // Mustaqeem
    const mustaqeem = await User.findOne({ name: 'Mustaqeem' });
    console.log('MUSTAQEEM:\n');
    const mustaqeemInvs = await InvestorInvestment.find({ userId: mustaqeem._id, status: 'active' });
    mustaqeemInvs.forEach(inv => {
      console.log(`  Investment: $${inv.amount}`);
      console.log(`  Created: ${inv.createdAt}`);
      console.log(`  Daily Rate: ${inv.dailyRate}`);
    });

    // Shaharyar
    const shaharyar = await User.findOne({ name: { $regex: 'shaharyar', $options: 'i' } });
    console.log('\nSHAHARYAR:\n');
    const shaharyarInvs = await InvestorInvestment.find({ userId: shaharyar._id, status: 'active' });
    shaharyarInvs.forEach(inv => {
      console.log(`  Investment: $${inv.amount}`);
      console.log(`  Created: ${inv.createdAt}`);
      console.log(`  Daily Rate: ${inv.dailyRate}`);
    });

    // Naveed
    const naveed = await User.findOne({ name: { $regex: 'naveed', $options: 'i' } });
    console.log('\nNAVEED:\n');
    const naveedInvs = await InvestorInvestment.find({ userId: naveed._id, status: 'active' });
    naveedInvs.forEach(inv => {
      console.log(`  Investment: $${inv.amount}`);
      console.log(`  Created: ${inv.createdAt}`);
      console.log(`  Daily Rate: ${inv.dailyRate}`);
    });

    console.log('\n' + '='.repeat(100) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
