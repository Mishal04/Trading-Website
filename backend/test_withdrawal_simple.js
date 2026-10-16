const mongoose = require('mongoose');
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(80));
    console.log('WITHDRAWAL EFFECT TEST');
    console.log('═'.repeat(80) + '\n');

    // Pick a user with upline and capital: Naru786 (has multiple referrals)
    const testUserName = 'Naru786';
    const testUser = await User.findOne({ name: testUserName })
      .populate('ancestorPath', '_id name email');
    
    if (!testUser) {
      console.log(`❌ User ${testUserName} not found`);
      process.exit(1);
    }

    if (!testUser.ancestorPath || testUser.ancestorPath.length === 0) {
      console.log(`❌ ${testUserName} has no upline`);
      process.exit(1);
    }

    const l1Upline = testUser.ancestorPath[0];

    console.log(`Test User: ${testUser.name}`);
    console.log(`Capital: $${testUser.wallet?.capital || 0}`);
    console.log(`L1 Upline: ${l1Upline.name}\n`);

    // BEFORE withdrawal - get today's transactions
    const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    
    const beforeROI = await Transaction.findOne({
      userId: testUser._id,
      type: 'profit',
      createdAt: { $gte: startOfToday }
    });

    const beforeROIAmount = beforeROI?.amount || 0;
    
    const beforeComm = await Transaction.find({
      userId: l1Upline._id,
      type: 'commission',
      createdAt: { $gte: startOfToday },
      description: { $regex: testUser.name }
    });

    let beforeCommAmount = 0;
    beforeComm.forEach(tx => beforeCommAmount += tx.amount);

    console.log('BEFORE WITHDRAWAL (Current State):');
    console.log(`  ${testUser.name} wallet.capital: $${testUser.wallet?.capital || 0}`);
    console.log(`  ${testUser.name} today's ROI: $${beforeROIAmount.toFixed(2)}`);
    console.log(`  ${l1Upline.name} L1 commission from ${testUser.name}: $${beforeCommAmount.toFixed(2)}\n`);

    // WITHDRAW 50% of capital
    const beforeCapital = testUser.wallet?.capital || 0;
    const withdrawAmount = Math.floor(beforeCapital / 2);
    
    if (withdrawAmount <= 0) {
      console.log(`❌ ${testUserName} has no capital to withdraw`);
      process.exit(1);
    }

    console.log(`SIMULATING WITHDRAWAL: -$${withdrawAmount}`);
    console.log(`  Capital: $${beforeCapital} → $${beforeCapital - withdrawAmount}\n`);
    
    await User.findByIdAndUpdate(testUser._id, {
      $inc: { 'wallet.capital': -withdrawAmount }
    });

    // Calculate expected values
    const afterCapital = beforeCapital - withdrawAmount;
    const currentRate = 0.01; // 1% daily
    const expectedNewROI = afterCapital * currentRate;
    const expectedNewComm = expectedNewROI * 0.25; // L1 is 25%

    console.log('EXPECTED AFTER RUNNING JOB AGAIN:');
    console.log(`  ${testUser.name} new daily ROI: $${expectedNewROI.toFixed(2)}`);
    console.log(`  ${l1Upline.name} L1 commission: $${expectedNewComm.toFixed(2)}`);
    console.log(`  Change: ROI decreased by $${(beforeROIAmount - expectedNewROI).toFixed(2)}, Comm by $${(beforeCommAmount - expectedNewComm).toFixed(2)}\n`);

    console.log('═'.repeat(80));
    console.log('Next: Run the daily profit job');
    console.log('  node reset_today_and_rerun.js');
    console.log('  node manual_profit_run.js --force');
    console.log('═'.repeat(80) + '\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
