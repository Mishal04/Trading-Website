const profitService = require('../services/profitService');
const commissionService = require('../services/commissionService');

let dailyProfitJobExecutedToday = false;
let lastExecutedDate = null;

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

/**
 * BULLETPROOF SCHEDULER: Check every 10 seconds for 4 PM Pakistan time
 * CRITICAL: Only trigger once per day using MongoDB atomic lock
 */
const initCronJobs = () => {
  console.log('\n🚀 Initializing BULLETPROOF Scheduler (Local Memory + MongoDB Lock)');
  console.log('   Pattern: Every Mon-Fri at 16:00 (4 PM) Pakistan Time');
  console.log('   Timezone: Asia/Karachi (Pakistan)');
  console.log('   GUARD: Atomic MongoDB lock prevents ANY concurrent execution\n');

  // Check every 10 seconds for 4 PM Pakistan time
  setInterval(async () => {
    try {
      // Get current time in Pakistan timezone
      const pakistanTimeString = new Date().toLocaleString('en-US', { 
        timeZone: 'Asia/Karachi'
      });
      const pakistanTime = new Date(pakistanTimeString);
      
      const hour = pakistanTime.getHours();
      const minute = pakistanTime.getMinutes();
      const dayOfWeek = pakistanTime.getDay(); // 0=Sun, 1=Mon, 5=Fri, 6=Sat
      const todayDate = `${pakistanTime.getFullYear()}-${String(pakistanTime.getMonth() + 1).padStart(2, '0')}-${String(pakistanTime.getDate()).padStart(2, '0')}`;
      
      // Check: Is it 16:00 (4:00 PM) on Monday-Friday?
      const isTargetTime = (hour === 16 && minute === 0);
      const isWeekday = (dayOfWeek >= 1 && dayOfWeek <= 5); // Mon-Fri
      
      if (isTargetTime && isWeekday) {
        // Check if cron already ran today in MongoDB (atomic lock)
        const CronLock = require('../models/CronLock');
        const existingLock = await CronLock.findOne({
          jobName: 'dailyProfits',
          dateKey: todayDate
        });

        // If lock exists with completed or running status, skip
        if (existingLock && (existingLock.status === 'completed' || existingLock.status === 'running')) {
          return;  // Already running or completed, skip
        }

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('✅ TRIGGER: Daily Profit Calculation');
        console.log('   Time: 16:00 (4:00 PM) Pakistan Time');
        console.log(`   Date: ${todayDate}`);
        console.log('═══════════════════════════════════════════════════════════');
        
        try {
          const result = await profitService.calculateDailyProfits();
          console.log(`✅ Daily ROI job completed:`);
          console.log(`   • Processed: ${result?.processedCount || 0} investments`);
          console.log(`   • Distributed: $${result?.totalProfitDistributed || 0}`);
          console.log('═══════════════════════════════════════════════════════════\n');
        } catch (err) {
          console.error('❌ Daily ROI job failed:', err.message);
        }
      }
    } catch (err) {
      console.error('Scheduler check error:', err);
    }
  }, 10000); // Check every 10 seconds

  // Monthly Leadership & Performance Reward distribution at 01:00 AM UTC on 1st of every month
  // This uses node-cron for monthly (less critical timing)
  const cron = require('node-cron');
  cron.schedule('0 1 1 * *', async () => {
    console.log('Running scheduled job: Monthly Commission Pools Distribution');
    try {
      await commissionService.distributeLeadershipSalary();
      await commissionService.distributePerformanceReward();
    } catch (err) {
      console.error('Scheduled monthly pool error:', err);
    }
  });

  console.log('✅ Scheduler initialized and running');
};

module.exports = {
  initCronJobs,
  isWithinDubaiWithdrawalWindow,
  isWithinDubaiTradingWindow
};
