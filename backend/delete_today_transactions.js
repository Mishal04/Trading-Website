const mongoose = require('mongoose');
const Transaction = require('./src/models/Transaction');
const CronLock = require('./src/models/CronLock');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    console.log('═'.repeat(80));
    console.log(`DELETING TODAY'S TRANSACTIONS & RESETTING WALLETS (${dateKey})`);
    console.log('═'.repeat(80) + '\n');
    
    // Get all today's transactions to see what we're deleting
    const todayTx = await Transaction.find({
      createdAt: { $gte: startOfToday }
    }).select('type amount userId description createdAt');
    
    console.log(`Found ${todayTx.length} transactions from today:\n`);
    
    let roiCount = 0, commCount = 0, totalRoi = 0, totalComm = 0;
    todayTx.forEach(tx => {
      if (tx.type === 'profit') {
        roiCount++;
        totalRoi += tx.amount;
      } else if (tx.type === 'commission') {
        commCount++;
        totalComm += tx.amount;
      }
    });
    
    console.log(`  ROI Transactions: ${roiCount} (total $${totalRoi.toFixed(2)})`);
    console.log(`  Commission Transactions: ${commCount} (total $${totalComm.toFixed(2)})`);
    console.log(`\n`);
    
    // Delete transactions
    const txDel = await Transaction.deleteMany({
      createdAt: { $gte: startOfToday }
    });
    console.log(`✓ Deleted ${txDel.deletedCount} transaction(s)\n`);
    
    // Delete locks
    const lockDel = await CronLock.deleteMany({
      jobName: 'dailyProfits',
      dateKey
    });
    console.log(`✓ Deleted ${lockDel.deletedCount} lock(s)\n`);
    
    // Reset wallet.profit and wallet.commission (but keep wallet.capital intact!)
    const userUpdate = await User.updateMany(
      {},
      [
        {
          $set: {
            'wallet.profit': 0,
            'wallet.commission': 0
          }
        }
      ]
    );
    console.log(`✓ Reset wallet.profit & wallet.commission for all users\n`);
    
    console.log('═'.repeat(80));
    console.log('CLEANUP COMPLETE - Ready to re-run cron');
    console.log('═'.repeat(80) + '\n');
    
    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    mongoose.connection.close();
    process.exit(1);
  }
})();
