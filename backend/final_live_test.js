const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const profitService = require('./src/services/profitService');
    const CommissionLog = require('./src/models/CommissionLog');
    const CronLock = require('./src/models/CronLock');
    
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    console.log('═'.repeat(100));
    console.log('FINAL LIVE TEST - Commission Execution');
    console.log('═'.repeat(100));
    
    // Clear today's lock
    await CronLock.deleteMany({ jobName: 'dailyProfits', dateKey });
    console.log('✓ Cleared lock\n');
    
    const commBefore = await CommissionLog.countDocuments({ commissionType: 'level' });
    console.log(`BEFORE: ${commBefore} level commissions`);
    
    console.log(`\n⏳ Running calculateDailyProfits()...\n`);
    const result = await profitService.calculateDailyProfits();
    
    const commAfter = await CommissionLog.countDocuments({ commissionType: 'level' });
    console.log(`\nAFTER: ${commAfter} level commissions (+${commAfter - commBefore})`);
    console.log(`Result: Processed ${result.processedCount}, Distributed $${result.totalProfitDistributed.toFixed(4)}`);
    
    if (commAfter > commBefore) {
      console.log(`\n✅ SUCCESS! New commissions created!\n`);
      
      const newLogs = await CommissionLog.find({ 
        commissionType: 'level',
        createdAt: { $gt: new Date(Date.now() - 600000) }
      }).populate('recipientId', 'name email').populate('sourceUserId', 'name').sort({ level: 1 });
      
      const byLevel = {};
      newLogs.forEach(log => {
        if (!byLevel[log.level]) byLevel[log.level] = [];
        byLevel[log.level].push(log);
      });
      
      console.log('Commissions by Level:\n');
      Object.keys(byLevel).sort((a, b) => Number(a) - Number(b)).forEach(level => {
        const records = byLevel[level];
        const rates = [...new Set(records.map(r => r.rate))];
        console.log(`L${level}: ${records.length} records, Rates: [${rates.join(', ')}]`);
        records.slice(0, 1).forEach(log => {
          console.log(`  Sample: ${log.recipientId?.name} ← ${log.sourceUserId?.name}, Rate=${log.rate}%, Amt=$${log.commissionAmount}`);
        });
      });
    } else {
      console.log(`\n❌ NO NEW COMMISSIONS`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
