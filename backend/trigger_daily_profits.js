const mongoose = require('mongoose');
require('dotenv').config();
const profitService = require('./src/services/profitService');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    console.log('\n' + '═'.repeat(70));
    console.log('🚀 TRIGGERING DAILY PROFIT CALCULATION (Via profitService)');
    console.log('═'.repeat(70) + '\n');
    
    const result = await profitService.calculateDailyProfits();
    
    console.log('\n' + '═'.repeat(70));
    console.log('✅ EXECUTION COMPLETE');
    console.log('═'.repeat(70));
    console.log(`Processed: ${result.processedCount} investments`);
    console.log(`Distributed: $${result.totalProfitDistributed.toFixed(2)}`);
    console.log('═'.repeat(70) + '\n');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
