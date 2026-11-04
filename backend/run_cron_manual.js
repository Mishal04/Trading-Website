const mongoose = require('mongoose');
const profitService = require('./src/services/profitService');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(100));
    console.log('RUNNING DAILY PROFIT CRON MANUALLY');
    console.log('═'.repeat(100) + '\n');

    const result = await profitService.calculateDailyProfits();

    console.log('═'.repeat(100));
    console.log('CRON EXECUTION COMPLETE');
    console.log('═'.repeat(100));
    console.log(`\nProcessedCount: ${result.processedCount}`);
    console.log(`Total Profit Distributed: $${result.totalProfitDistributed.toFixed(2)}`);
    console.log(`Investors with Commissions: ${result.investorsWithCommissions}`);
    console.log('═'.repeat(100) + '\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    console.error(e.stack);
    mongoose.connection.close();
    process.exit(1);
  }
})();
