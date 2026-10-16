const mongoose = require('mongoose');
const Transaction = require('./src/models/Transaction');
const CronLock = require('./src/models/CronLock');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const txDel = await Transaction.deleteMany({ createdAt: { $gte: startOfToday } });
    const lockDel = await CronLock.deleteMany({ jobName: 'dailyProfits', dateKey });
    
    console.log(`✓ Deleted ${txDel.deletedCount} transactions`);
    console.log(`✓ Deleted ${lockDel.deletedCount} locks`);
    
    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
