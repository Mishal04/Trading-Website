const mongoose = require('mongoose');
require('dotenv').config();
const CronLock = require('./src/models/CronLock');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    console.log('\n🗑️  Deleting Oct 15 lock...\n');
    
    const result = await CronLock.deleteOne({
      jobName: 'dailyProfits',
      dateKey: '2026-10-15'
    });
    
    console.log(`✅ Deleted: ${result.deletedCount} lock(s)`);
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
