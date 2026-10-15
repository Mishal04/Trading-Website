const mongoose = require('mongoose');
require('dotenv').config();
const CronLock = require('./src/models/CronLock');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    console.log('🔧 FORCE CLEARING ALL STUCK LOCKS...\n');
    
    // Delete ALL running locks (they're stuck)
    const result = await CronLock.deleteMany({
      jobName: 'dailyProfits',
      status: 'running'
    });
    
    console.log(`✅ Deleted ${result.deletedCount} stuck 'running' lock(s)\n`);
    
    // Verify
    const remaining = await CronLock.find({ jobName: 'dailyProfits' }).sort({ createdAt: -1 }).limit(3);
    console.log('Remaining locks:');
    remaining.forEach((lock, i) => {
      console.log(`  ${i+1}. Status: ${lock.status}, Created: ${lock.createdAt}`);
    });
    
    console.log('\n🚀 Ready for next execution');
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
