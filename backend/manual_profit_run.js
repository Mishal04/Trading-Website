const profitService = require('./src/services/profitService');

(async () => {
  try {
    console.log('Starting Daily Profit Calculation...');
    const result = await profitService.calculateDailyProfits();
    console.log('\n✅ Completed!');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
