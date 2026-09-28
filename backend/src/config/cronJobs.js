const cron = require('node-cron');
const profitService = require('../services/profitService');
const commissionService = require('../services/commissionService');

const initCronJobs = () => {
  console.log('Cron jobs scheduled (Asia/Dubai timezone)');

  // Daily ROI calculation at 21:00 Dubai time, Monday-Friday only
  // ROI is credited every day; level commissions are skipped on Sat/Sun within the job
  cron.schedule('0 21 * * 1-5', async () => {
    console.log('Running scheduled job: Daily ROI Calculation (21:00 Dubai time, Mon-Fri)');
    try {
      await profitService.calculateDailyProfits();
    } catch (err) {
      console.error('Scheduled daily ROI error:', err);
    }
  }, { timezone: 'Asia/Dubai' });

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
  initCronJobs
};
