const mongoose = require('mongoose');
require('dotenv').config();
const CronLock = require('./src/models/CronLock');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    console.log('🔍 Checking CronLock status...\n');
    
    const locks = await CronLock.find().sort({ createdAt: -1 }).limit(5);
    
    if (locks.length === 0) {
      console.log('✅ No locks found - system is clean');
    } else {
      locks.forEach((lock, i) => {
        console.log(`Lock ${i+1}:`);
        console.log(`  Job: ${lock.jobName}`);
        console.log(`  Status: ${lock.status}`);
        console.log(`  Date: ${lock.date}`);
        console.log(`  Created: ${lock.createdAt}`);
        console.log(`  Released: ${lock.releasedAt}`);
        console.log();
      });
    }
    
    // Delete stuck locks from today (2026-10-15)
    const today = new Date('2026-10-15');
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log('\n🗑️  Clearing stuck locks from today...\n');
    
    const result = await CronLock.deleteMany({
      date: { $gte: today, $lt: tomorrow },
      status: { $in: ['running', 'pending'] }
    });
    
    console.log(`✅ Deleted ${result.deletedCount} stuck lock(s)\n`);
    console.log('🚀 System ready for next cron run');
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
