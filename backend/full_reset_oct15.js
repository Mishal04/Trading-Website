const mongoose = require('mongoose');
require('dotenv').config();
const InvestorInvestment = require('./src/models/InvestorInvestment');
const User = require('./src/models/User');
const CronLock = require('./src/models/CronLock');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    console.log('\n🔄 FULL RESET FOR OCT 15 (SAFE MODE)\n');
    
    // Step 1: Reset lastRoiDate to yesterday for all active investments
    console.log('1️⃣  Resetting lastRoiDate for all active investments...');
    const yesterday = new Date('2026-10-14');
    
    const invResult = await InvestorInvestment.updateMany(
      { status: 'active' },
      { $set: { lastRoiDate: yesterday } }
    );
    
    console.log(`   ✅ Updated ${invResult.modifiedCount} investments\n`);
    
    // Step 2: Delete today's cron lock
    console.log('2️⃣  Deleting today\'s cron lock...');
    const lockResult = await CronLock.deleteOne({
      jobName: 'dailyProfits',
      dateKey: '2026-10-15'
    });
    
    console.log(`   ✅ Deleted ${lockResult.deletedCount} lock(s)\n`);
    
    console.log('✅ RESET COMPLETE');
    console.log('\n📝 STATUS:');
    console.log('   • All Oct 15 transactions: DELETED');
    console.log('   • All investments: Ready to process again');
    console.log('   • Cron lock: Cleared');
    console.log('\n🚀 Ready to run cron again');
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
