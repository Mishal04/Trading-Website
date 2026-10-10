const cron = require('node-cron');
const profitService = require('../services/profitService');
const commissionService = require('../services/commissionService');

/**
 * Check if current time is within Dubai withdrawal window (before 12 AM Dubai time)
 * If after 12 AM Dubai time, withdrawal is queued for next day
 * @returns {boolean}
 */
const isWithinDubaiWithdrawalWindow = () => {
  const dubaiTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' });
  const dubaiDate = new Date(dubaiTime);
  const hour = dubaiDate.getHours();
  
  // Withdrawal window: 00:00 to 11:59 (before noon Dubai time)
  return hour < 12;
};

/**
 * Check if current time is within Dubai trading window (during trading hours)
 * @returns {boolean}
 */
const isWithinDubaiTradingWindow = () => {
  const dubaiTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' });
  const dubaiDate = new Date(dubaiTime);
  const dayOfWeek = dubaiDate.getDay();
  const hour = dubaiDate.getHours();
  
  // Trading: Mon-Thu (1-4) 9 AM - 6 PM, Friday (5) 9 AM - 2 PM
  if (dayOfWeek >= 1 && dayOfWeek <= 4) {
    return hour >= 9 && hour < 18;
  }
  if (dayOfWeek === 5) {
    return hour >= 9 && hour < 14;
  }
  return false; // Closed on Sat-Sun
};

const initCronJobs = () => {
  console.log('Cron jobs scheduled');

  // Daily ROI calculation at 16:00 (4 PM) Pakistan time, Monday-Friday only
  // ROI is credited every day; level commissions are skipped on Sat/Sun within the job
  // Using Asia/Karachi timezone to ensure exact 4 PM Pakistan time
  cron.schedule('0 16 * * 1-5', async () => {
    console.log('🕐 Running scheduled job: Daily ROI Calculation (16:00 Pakistan time, Mon-Fri)');
    console.log(`   Current server time: ${new Date().toISOString()}`);
    try {
      const result = await profitService.calculateDailyProfits();
      console.log(`✅ Daily ROI job completed. Processed: ${result?.processedCount || 0} investments, Distributed: $${result?.totalProfitDistributed || 0}`);
    } catch (err) {
      console.error('❌ Scheduled daily ROI error:', err);
    }
  }, { timezone: 'Asia/Karachi' });

  // Monthly Leadership & Performance Reward distribution at 01:00 AM UTC on 1st of every month
  cron.schedule('0 1 1 * *', async () => {
    console.log('Running scheduled job: Monthly Commission Pools Distribution');
    try {
      await commissionService.distributeLeadershipSalary();
      await commissionService.distributePerformanceReward();
    } catch (err) {
      console.error('Scheduled monthly pool error:', err);
    }
  });
};

module.exports = {
  initCronJobs,
  isWithinDubaiWithdrawalWindow,
  isWithinDubaiTradingWindow
};
