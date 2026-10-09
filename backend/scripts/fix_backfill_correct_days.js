require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('\n' + '='.repeat(120));
    console.log('FIX: Correct backfill ROI - based on actual account creation date');
    console.log('='.repeat(120));
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    const Transaction = require('../src/models/Transaction');
    const investorConstants = require('../config/investorConstants');
    
    // Users and their correct backfill days
    const corrections = [
      { email: 'asadmehmood5142@gmail.com', name: 'Anees', created: '2026-10-08', amount: 100, reason: 'Joined Oct 8 - only Oct 9 ROI' },
      { email: 'mishi@gmail.com', name: 'mishi', created: '2026-10-01', amount: 100, reason: 'Joined Oct 1 - Oct 2-9 = 6 trading days' },
      { email: 'billajutt161@gmail.com', name: 'Nabeel', created: '2026-10-01', amount: 500, reason: 'Joined Oct 1 - Oct 2-9 = 6 trading days' },
      { email: 'najummalik97@gmail.com', name: 'Najum Malik', created: '2026-10-01', amount: 1000, reason: 'Joined Oct 1 - Oct 2-9 = 6 trading days' },
      { email: 'imranstudiobrw@gmail.com', name: 'Muhammad imran', created: '2026-10-01', amount: 1000, reason: 'Joined Oct 1 - Oct 2-9 = 6 trading days' },
      { email: 'softwareengineer724@gmail.com', name: 'Maryam', created: '2026-10-01', amount: 11, reason: 'Joined Oct 1 - Oct 2-9 = 6 trading days' },
      { email: 'iqzain099@gmail.com', name: 'Fakhar', created: '2026-10-01', amount: 200, reason: 'Joined Oct 1 - Oct 2-9 = 6 trading days' },
      { email: 'meoa35587@gmail.com', name: 'Muhammad Akram', created: '2026-10-02', amount: 300, reason: 'Joined Oct 2 - Oct 3-9 = 5 trading days (Fri-Wed)' },
      { email: 'sherkhanrajput4@gmail.com', name: 'Sherkhan', created: '2026-10-02', amount: 300, reason: 'Joined Oct 2 - Oct 3-9 = 5 trading days' },
      { email: 'rizwanshahid1994@gmail.com', name: 'Rizwan', created: '2026-10-04', amount: 1000, reason: 'Joined Oct 4 - Oct 5-9 = 4 trading days (Fri-Wed)' },
      { email: 'stomahelp96@gmail.com', name: 'Muhammad Rizwan', created: '2026-10-05', amount: 500, reason: 'Joined Oct 5 - Oct 6-9 = 3 trading days' },
      { email: 'sheezshah7@gmail.com', name: 'Shahnawaz', created: '2026-10-05', amount: 500, reason: 'Joined Oct 5 - Oct 6-9 = 3 trading days' },
      { email: 'marwaboutique786@gmail.com', name: 'Rizwan Shahid', created: '2026-10-05', amount: 1000, reason: 'Joined Oct 5 - Oct 6-9 = 3 trading days' },
      { email: 'leader.luqman.2018@gmail.com', name: 'Muhammad Luqman', created: '2026-10-05', amount: 1000, reason: 'Joined Oct 5 - Oct 6-9 = 3 trading days' },
      { email: 'hugeindustriesskt@gmail.com', name: 'Naveed', created: '2026-10-05', amount: 1000, reason: 'Joined Oct 5 - Oct 6-9 = 3 trading days' },
      { email: 'mariagull519@gmail.com', name: 'Rumaisa', created: '2026-09-15', amount: 500, reason: 'Joined Sep 15 - old user, check if deposited Oct 5' },
      { email: 'orhanahmed11@gmail.com', name: 'Daud Ahmad', created: '2026-09-30', amount: 2000, reason: 'Joined Sep 30 - old user, check if deposited Oct 5' },
      { email: 'shahansha13115@gmail.com', name: 'Muhammad Shahansha', created: '2026-09-30', amount: 500, reason: 'Joined Sep 30 - old user, check if deposited Oct 5' },
    ];
    
    console.log('\nCalculating correct backfill per user:\n');
    
    const results = [];
    
    for (const user of corrections) {
      try {
        const userDoc = await User.findOne({ email: user.email });
        const inv = await InvestorInvestment.findOne({ userId: userDoc._id, amount: user.amount, plan: 'A' });
        
        if (!inv) {
          console.log(`⚠️  ${user.email} - No investment found`);
          continue;
        }
        
        // Calculate correct trading days from creation date to Oct 9
        const createdDate = new Date(user.created);
        createdDate.setHours(0, 0, 0, 0);
        
        // Start from day AFTER creation
        let tradingDaysCorrect = 0;
        let daysList = [];
        let currentDate = new Date(createdDate);
        currentDate.setDate(currentDate.getDate() + 1);
        
        const today = new Date('2026-10-09');
        today.setHours(0, 0, 0, 0);
        
        while (currentDate <= today) {
          const dayOfWeek = currentDate.getDay();
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            tradingDaysCorrect++;
            daysList.push(currentDate.toISOString().split('T')[0]);
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        const dailyRate = investorConstants.getDailyRateForPhase(inv.packageNumber, inv.createdAt);
        const dailyROI = Number(((user.amount * dailyRate) / 100).toFixed(4));
        
        const correctTotal = Number((dailyROI * tradingDaysCorrect).toFixed(4));
        const currentROI = inv.totalRoiEarned || 0;
        const excess = Number((currentROI - correctTotal).toFixed(4));
        
        // They already got Oct 9 ROI, so subtract 1 day if they earned it
        const excessToRemove = excess;
        
        results.push({
          email: user.email,
          name: user.name,
          created: user.created,
          amount: user.amount,
          correctDays: tradingDaysCorrect,
          days: daysList.join(', '),
          dailyRate: `${dailyRate}%`,
          correctTotal: `$${correctTotal.toFixed(2)}`,
          currentHas: `$${currentROI.toFixed(2)}`,
          excess: `$${excessToRemove.toFixed(2)}`,
          needsFix: excessToRemove > 0 ? 'YES' : 'NO'
        });
        
      } catch (err) {
        console.error(`Error for ${user.email}:`, err.message);
      }
    }
    
    console.log('='.repeat(120));
    console.log('ANALYSIS - Who needs fixing:');
    console.log('='.repeat(120));
    console.table(results);
    
    console.log('\n' + '='.repeat(120));
    console.log('ACTION NEEDED:');
    console.log('='.repeat(120));
    const needFix = results.filter(r => r.needsFix === 'YES');
    console.log(`\n${needFix.length} users need corrections:\n`);
    needFix.forEach(r => {
      console.log(`• ${r.name} (${r.email}): Remove $${r.excess}`);
    });
    
    console.log('\n');
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
