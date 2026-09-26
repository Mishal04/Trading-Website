const cron = require('node-cron');
const profitService = require('../services/profitService');
const commissionService = require('../services/commissionService');

/**
 * Helper function to check if it's a trading day and within trading hours in Dubai timezone
 * Dubai timezone: UTC+4 (no DST)
 * Trading window: Saturday-Sunday, 9 PM - 12 AM (21:00 - 00:00)
 */
function isWithinDubaiTradingWindow() {
  // Create Dubai time
  const dubaiTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
  
  const dayOfWeek = dubaiTime.getDay(); // 0=Sunday, 6=Saturday
  const hours = dubaiTime.getHours();
  const minutes = dubaiTime.getMinutes();

  // Check if Saturday (6) or Sunday (0)
  const isTradingDay = dayOfWeek === 0 || dayOfWeek === 6;
  
  // Check if within 21:00 - 23:59 (9 PM - 12 AM)
  const isWithinTradingHours = (hours === 21 || hours === 22 || hours === 23);

  console.log(`[Dubai TZ Check] Day: ${dayOfWeek}, Hours: ${hours}:${String(minutes).padStart(2, '0')}, Trading Day: ${isTradingDay}, Trading Hours: ${isWithinTradingHours}`);
  
  return isTradingDay && isWithinTradingHours;
}

/**
 * Helper function to check if current time is within Dubai withdrawal window
 * Withdrawal window: Saturday-Sunday, 9 PM - 12 AM Dubai time only
 */
function isWithinDubaiWithdrawalWindow() {
  // Create Dubai time
  const dubaiTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
  
  const dayOfWeek = dubaiTime.getDay();
  const hours = dubaiTime.getHours();

  // Check if Saturday (6) or Sunday (0)
  const isTradingDay = dayOfWeek === 0 || dayOfWeek === 6;
  
  // Check if within 21:00 - 23:59 (9 PM - 12 AM)
  const isWithinTradingHours = (hours === 21 || hours === 22 || hours === 23);

  return isTradingDay && isWithinTradingHours;
}

const initCronJobs = () => {
  console.log('Cron jobs scheduled (Dubai timezone enabled)');

  // Daily profit calculation at 00:01 AM UTC every day
  // Note: The actual profit distribution only proceeds if within Dubai trading window (Sat-Sun, 9 PM-12 AM)
  cron.schedule('1 0 * * *', async () => {
    console.log('Running scheduled job: Daily Profit Calculation (checking Dubai timezone...)');
    try {
      if (isWithinDubaiTradingWindow()) {
        console.log('✓ Within Dubai trading window — proceeding with daily profit calculation');
        await profitService.calculateDailyProfits();
      } else {
        console.log('✗ Outside Dubai trading window — skipping daily profit calculation');
      }
    } catch (err) {
      console.error('Scheduled daily profit error:', err);
    }
  });

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
  isWithinDubaiTradingWindow,
  isWithinDubaiWithdrawalWindow
};
