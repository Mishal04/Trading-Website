const mongoose = require('mongoose');
require('dotenv').config();
const profitService = require('./src/services/profitService');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    console.log('🚀 MANUALLY TRIGGERING DAILY PROFIT CALCULATION\n');
    console.log('═'.repeat(70));
    
    const result = await profitService.calculateDailyProfits();
    
    console.log('\n✅ EXECUTION COMPLETE');
    console.log('═'.repeat(70));
    console.log(`Processed: ${result.processedCount} investments`);
    console.log(`Distributed: $${result.totalProfitDistributed.toFixed(2)}`);
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
