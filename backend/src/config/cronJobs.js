const cron = require('node-cron');
const profitService = require('../services/profitService');
const commissionService = require('../services/commissionService');

const initCronJobs = () => {
  console.log('Cron jobs scheduled');

  // Daily profit calculation at 00:01 AM every day
  cron.schedule('1 0 * * *', async () => {
    console.log('Running scheduled job: Daily Profit Calculation');
    try {
      await profitService.calculateDailyProfits();
    } catch (err) {
      console.error('Scheduled daily profit error:', err);
    }
  });

  // Monthly Leadership & Performance Reward distribution at 01:00 AM on 1st of every month
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

module.exports = initCronJobs;
