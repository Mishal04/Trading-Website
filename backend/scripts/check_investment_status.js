const mongoose = require('mongoose');
require('dotenv').config();

const Investment = require('../src/models/Investment');
const InvestorInvestment = require('../src/models/InvestorInvestment');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Check all statuses
    const legacyByStatus = await Investment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const planByStatus = await InvestorInvestment.aggregate([
      { $match: { userId: { $ne: null } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    console.log('Legacy Investment statuses:');
    legacyByStatus.forEach(s => console.log(`  ${s._id}: ${s.count}`));

    console.log('\nPlan A/B Investment statuses:');
    planByStatus.forEach(s => console.log(`  ${s._id}: ${s.count}`));

    // Sample some pending/active
    const pendingLegacy = await Investment.find({ status: 'pending' }).limit(5);
    const activeLegacy = await Investment.find({ status: 'active' }).limit(5);

    console.log(`\nPending legacy: ${pendingLegacy.length}`);
    console.log(`Active legacy: ${activeLegacy.length}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
