const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const InvestorInvestment = require('./src/models/InvestorInvestment');
const User = require('./src/models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('\n' + '=' .repeat(100));
    console.log('🔄 RESET: Investment LastRoiDate to Yesterday');
    console.log('=' .repeat(100) + '\n');

    // Get Zain and Jamshed
    const zain = await User.findOne({ name: 'Zain' });
    const jamshed = await User.findOne({ name: 'jamshed' });

    console.log('BEFORE:\n');
    
    let zainBefore = await InvestorInvestment.findOne({ userId: zain._id });
    console.log(`Zain: lastRoiDate = ${zainBefore.lastRoiDate}`);

    let jamshedBefore = await InvestorInvestment.findOne({ userId: jamshed._id });
    console.log(`Jamshed: lastRoiDate = ${jamshedBefore.lastRoiDate}\n`);

    // Reset to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    console.log(`Setting lastRoiDate to yesterday: ${yesterday}\n`);

    await InvestorInvestment.updateMany(
      { userId: { $in: [zain._id, jamshed._id] }, status: 'active' },
      { $set: { lastRoiDate: yesterday } }
    );

    console.log('AFTER:\n');

    let zainAfter = await InvestorInvestment.findOne({ userId: zain._id });
    console.log(`Zain: lastRoiDate = ${zainAfter.lastRoiDate}`);

    let jamshedAfter = await InvestorInvestment.findOne({ userId: jamshed._id });
    console.log(`Jamshed: lastRoiDate = ${jamshedAfter.lastRoiDate}\n`);

    console.log('=' .repeat(100) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
