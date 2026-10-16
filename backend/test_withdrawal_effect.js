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

    // Pick a user who has active capital and received ROI today
    const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    
    const roiTx = await Transaction.findOne({
      type: 'profit',
      createdAt: { $gte: startOfToday }
    }).sort({ createdAt: -1 });

    if (!roiTx) {
      console.log('❌ No ROI transactions found today. Run the daily job first.');
      process.exit(1);
    }

    const testUser = await User.findById(roiTx.userId)
      .select('_id name email wallet ancestorPath');
    
    if (!testUser || !testUser.ancestorPath || testUser.ancestorPath.length === 0) {
      console.log('❌ Selected user has no upline. Skipping test.');
      process.exit(1);
    }

    const l1Upline = await User.findById(testUser.ancestorPath[0])
      .select('_id name email');

    console.log(`Test User: ${testUser.name}`);
    console.log(`L1 Upline: ${l1Upline.name}\n`);

    // BEFORE withdrawal
    console.log('BEFORE WITHDRAWAL:');
    console.log(`  ${testUser.name} wallet.capital: $${testUser.wallet?.capital || 0}`);
    
    const beforeROI = await Transaction.findOne({
      userId: testUser._id,
      type: 'profit',
      createdAt: { $gte: startOfToday }
    }).sort({ createdAt: -1 });

    const beforeROIAmount = beforeROI?.amount || 0;
    console.log(`  ${testUser.name} today's ROI: $${beforeROIAmount.toFixed(2)}`);

    const beforeCommTx = await Transaction.findOne({
      userId: l1Upline._id,
      type: 'commission',
      createdAt: { $gte: startOfToday },
      description: { $regex: testUser.name }
    });

    const beforeCommAmount = beforeCommTx?.amount || 0;
    console.log(`  ${l1Upline.name} L1 commission from ${testUser.name}: $${beforeCommAmount.toFixed(2)}\n`);

    // WITHDRAW 50% of capital
    const withdrawAmount = Math.floor((testUser.wallet?.capital || 0) / 2);
    
    if (withdrawAmount <= 0) {
      console.log('❌ User has no capital to withdraw');
      process.exit(1);
    }

    console.log(`Simulating withdrawal: -$${withdrawAmount}`);
    
    await User.findByIdAndUpdate(testUser._id, {
      $inc: { 'wallet.capital': -withdrawAmount }
    });

    // Get updated capital
    const updatedUser = await User.findById(testUser._id).select('wallet');
    const newCapital = updatedUser.wallet?.capital || 0;
    console.log(`  New capital: $${newCapital}\n`);

    // Calculate expected ROI
    const beforeCapital = beforeROIAmount / 0.01; // ROI was 1% of capital
    const expectedNewROI = newCapital * 0.01;
    const expectedNewComm = expectedNewROI * 0.25; // L1 is 25%

    console.log('EXPECTED AFTER RUNNING JOB AGAIN:');
    console.log(`  ${testUser.name} new daily ROI: $${expectedNewROI.toFixed(2)} (was $${beforeROIAmount.toFixed(2)})`);
    console.log(`  ${l1Upline.name} L1 commission: $${expectedNewComm.toFixed(2)} (was $${beforeCommAmount.toFixed(2)})\n`);

    console.log('═'.repeat(80));
    console.log('Now run: node manual_profit_run.js --force');
    console.log('═'.repeat(80) + '\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
