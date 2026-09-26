const cron = require('node-cron');
const profitService = require('../services/profitService');
const commissionService = require('../services/commissionService');

/**
 * Helper function to check if commission can be credited in Dubai timezone
 * Dubai timezone: UTC+4 (no DST)
 * BLOCKED: Saturday & Sunday (no commissions on weekends)
 * ALLOWED: Monday-Friday, 9 PM - 12 AM ONLY (21:00 - 23:59 Dubai time)
 * 
 * This means commissions are only credited during weekday evenings in Dubai,
 * never on weekends.
 */
function isWithinDubaiTradingWindow() {
  // Create Dubai time
  const dubaiTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
  
  const dayOfWeek = dubaiTime.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const hours = dubaiTime.getHours();
  const minutes = dubaiTime.getMinutes();

  // BLOCKED: Don't credit on Saturday (6) or Sunday (0)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    console.log(`[Dubai Commission Check] Day: ${dayOfWeek} (weekend), Hours: ${hours}:${String(minutes).padStart(2, '0')} — BLOCKED (no commissions on weekends)`);
    return false;
  }

  // ALLOWED: Monday-Friday (1-5) within 9 PM - 12 AM window
  const isWithinCreditHours = (hours === 21 || hours === 22 || hours === 23);

  console.log(`[Dubai Commission Check] Day: ${dayOfWeek} (weekday), Hours: ${hours}:${String(minutes).padStart(2, '0')}, WithinWindow: ${isWithinCreditHours} — ${isWithinCreditHours ? 'ALLOWED' : 'BLOCKED'}`);
  
  return isWithinCreditHours;
}

/**
 * Helper function to check if withdrawal request can be processed TODAY
 * Dubai timezone: UTC+4 (no DST)
 * Cutoff: 12 AM (midnight) Dubai time
 * 
 * - Requests submitted before 12 AM (00:00-23:59) are processed same day
 * - Requests submitted after 12 AM (00:00-00:59, technically next calendar day start) 
 *   are queued for next day processing
 * - NOTE: This only checks the HOUR cutoff, not the full minute. 
 *   In practice, if it's 00:xx (midnight hour), queue for next day.
 *   Otherwise, process today.
 */
function isWithinDubaiWithdrawalWindow() {
  // Create Dubai time
  const dubaiTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
  
  const hours = dubaiTime.getHours();
  
  // If it's 00:xx (midnight hour), withdrawal will be processed next day
  // Otherwise, it's processed same day
  const processesToday = hours !== 0;

  console.log(`[Dubai Withdrawal Check] Hours: ${hours}:00 — ${processesToday ? 'SAME DAY' : 'NEXT DAY'}`);
  
  return processesToday;
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
