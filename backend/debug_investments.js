const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const InvestorInvestment = require('./src/models/InvestorInvestment');
const User = require('./src/models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('\n🔍 Debugging InvestorInvestment records\n');

    // Find all active investments
    const allInvestments = await InvestorInvestment.find({ status: 'active' });
    console.log(`Total active investments: ${allInvestments.length}\n`);

    // Check Zain and Jamshed's investments
    const zain = await User.findOne({ name: 'Zain' });
    const jamshed = await User.findOne({ name: 'jamshed' });

    console.log('Zain\'s investments:');
    const zainInvs = await InvestorInvestment.find({ userId: zain._id });
    console.log(`  Total: ${zainInvs.length}`);
    zainInvs.forEach(inv => {
      console.log(`  Amount: $${inv.amount}, Status: ${inv.status}, LastRoiDate: ${inv.lastRoiDate}`);
      console.log(`    CreatedAt: ${inv.createdAt}`);
      console.log(`    DailyRate: ${inv.dailyRate}`);
      
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      console.log(`    LastRoiDate < startOfToday? ${inv.lastRoiDate < startOfToday}`);
    });

    console.log('\nJamshed\'s investments:');
    const jamshedInvs = await InvestorInvestment.find({ userId: jamshed._id });
    console.log(`  Total: ${jamshedInvs.length}`);
    jamshedInvs.forEach(inv => {
      console.log(`  Amount: $${inv.amount}, Status: ${inv.status}, LastRoiDate: ${inv.lastRoiDate}`);
      console.log(`    CreatedAt: ${inv.createdAt}`);
      console.log(`    DailyRate: ${inv.dailyRate}`);
      
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      console.log(`    LastRoiDate < startOfToday? ${inv.lastRoiDate < startOfToday}`);
    });

    console.log('\nCheck what would qualify:');
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const qualify = await InvestorInvestment.find({
      userId: { $ne: null },
      status: 'active',
      lastRoiDate: { $lt: startOfToday }
    });

    console.log(`Investments with lastRoiDate < today: ${qualify.length}\n`);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
