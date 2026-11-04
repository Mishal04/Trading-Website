const mongoose = require('mongoose');
const CronLock = require('./src/models/CronLock');
const Transaction = require('./src/models/Transaction');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    console.log('═'.repeat(80));
    console.log('RESETTING TODAY\'S DATA FOR CLEAN TEST');
    console.log('═'.repeat(80) + '\n');
    
    // Delete today's locks
    const lockDel = await CronLock.deleteMany({
      jobName: 'dailyProfits',
      dateKey
    });
    console.log(`✓ Deleted ${lockDel.deletedCount} lock(s)\n`);
    
    // Delete today's transactions (ROI + Commissions)
    const txDel = await Transaction.deleteMany({
      createdAt: { $gte: startOfToday }
    });
    console.log(`✓ Deleted ${txDel.deletedCount} transaction(s)\n`);
    
    // Reset all wallets to remove today's ROI/commission
    const userUpdate = await User.updateMany(
      {},
      {
        $set: {
          'wallet.roi': 0,
          'wallet.commission': 0
        }
      }
    );
    console.log(`✓ Reset ROI/Commission wallets for ${userUpdate.modifiedCount} users\n`);
    
    console.log('═'.repeat(80));
    console.log('NOW RUNNING: node manual_profit_run.js --force');
    console.log('═'.repeat(80) + '\n');
    
    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
