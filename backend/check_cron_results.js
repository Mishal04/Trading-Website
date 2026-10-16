const mongoose = require('mongoose');
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(100));
    console.log('CRON EXECUTION RESULTS');
    console.log('═'.repeat(100) + '\n');

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check today's transactions
    const todayTxs = await Transaction.find({
      createdAt: { $gte: startOfToday }
    });

    const roiTxs = todayTxs.filter(t => t.type === 'profit');
    const commTxs = todayTxs.filter(t => t.type === 'commission');

    let totalRoi = 0, totalComm = 0;
    roiTxs.forEach(t => totalRoi += t.amount);
    commTxs.forEach(t => totalComm += t.amount);

    console.log('TODAY\'S TRANSACTIONS:');
    console.log(`  ROI Transactions: ${roiTxs.length}`);
    console.log(`  Total ROI: $${totalRoi.toFixed(2)}`);
    console.log(`  Commission Transactions: ${commTxs.length}`);
    console.log(`  Total Commissions: $${totalComm.toFixed(2)}`);
    console.log(`  TOTAL: $${(totalRoi + totalComm).toFixed(2)}\n`);

    // Check user wallets
    const usersWithProfit = await User.find({ 'wallet.profit': { $gt: 0 } }).select('name email wallet');
    const usersWithComm = await User.find({ 'wallet.commission': { $gt: 0 } }).select('name email wallet');

    let totalUserProfit = 0, totalUserComm = 0;
    usersWithProfit.forEach(u => totalUserProfit += u.wallet.profit);
    usersWithComm.forEach(u => totalUserComm += u.wallet.commission);

    console.log('USERS WITH EARNINGS:');
    console.log(`  Users with profit > 0: ${usersWithProfit.length}`);
    console.log(`  Total profit in wallets: $${totalUserProfit.toFixed(2)}`);
    console.log(`  Users with commission > 0: ${usersWithComm.length}`);
    console.log(`  Total commissions in wallets: $${totalUserComm.toFixed(2)}\n`);

    console.log('═'.repeat(100));
    console.log('SAMPLE USERS WITH EARNINGS:');
    console.log('═'.repeat(100) + '\n');

    const sampleProfit = usersWithProfit.slice(0, 10);
    sampleProfit.forEach((u, i) => {
      console.log(`${i + 1}. ${u.name.padEnd(30)} Profit: $${(u.wallet?.profit || 0).toFixed(2).padEnd(10)} Commission: $${(u.wallet?.commission || 0).toFixed(2)}`);
    });

    console.log('\n' + '═'.repeat(100) + '\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    mongoose.connection.close();
    process.exit(1);
  }
})();
