const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const luqman = await User.findOne({ name: 'Muhammad Luqman' });
    const LEVEL_RATES = [0, 0.25, 0.20, 0.18, 0.16, 0.14, 0.12, 0.10, 0.02, 0.018, 0.016, 0.014, 0.012, 0.011, 0.010, 0.009, 0.009, 0.009, 0.009, 0.008, 0.009, 0.009];
    
    console.log('======== MUHAMMAD LUQMAN - DAILY EARNINGS ========\n');
    
    // ========== PART 1: OWN INVESTMENT ROI ==========
    console.log('PART 1: OWN INVESTMENT ROI');
    console.log('-------------------------------------------\n');
    
    const ownCapital = luqman.wallet && luqman.wallet.capital ? luqman.wallet.capital : 0;
    console.log('Own Capital: $' + ownCapital);
    
    // Determine tier
    let tier, tierRange, dailyRate;
    if (ownCapital >= 10000) {
      tier = 4;
      tierRange = '$10,000+';
      dailyRate = 1.50;
    } else if (ownCapital >= 6000) {
      tier = 3;
      tierRange = '$6,000-$9,000';
      dailyRate = 1.25;
    } else if (ownCapital >= 1000) {
      tier = 2;
      tierRange = '$1,000-$5,000';
      dailyRate = 1.00;
    } else {
      tier = 1;
      tierRange = '$100-$900';
      dailyRate = 0.75;
    }
    
    console.log('Investment Tier: Tier ' + tier + ' (' + tierRange + ')');
    console.log('Daily Rate: ' + dailyRate + '%');
    console.log('');
    console.log('Formula: Daily ROI = (Capital × Daily Rate) / 100');
    console.log('Calculation:');
    console.log('  = ($' + ownCapital + ' × ' + dailyRate + ') / 100');
    console.log('  = $' + (ownCapital * dailyRate) + ' / 100');
    
    const ownROI = (ownCapital * dailyRate) / 100;
    console.log('  = $' + ownROI.toFixed(4));
    
    console.log('');
    console.log('OWN ROI TOMORROW: $' + ownROI.toFixed(2) + ' (credited to wallet.profit)');
    
    // ========== PART 2: COMMISSION FROM DIRECTS ==========
    console.log('\n\nPART 2: COMMISSION FROM NETWORK');
    console.log('-------------------------------------------\n');
    
    const directCount = luqman.directCount || 0;
    console.log('Direct Referrals Count: ' + directCount);
    
    // Calculate payout level
    const payoutLevel = Math.max(1, 22 - (directCount * 2));
    console.log('');
    console.log('Payout Level Calculation:');
    console.log('  Formula: Max(1, 22 - (directCount × 2))');
    console.log('  = Max(1, 22 - (' + directCount + ' × 2))');
    console.log('  = Max(1, ' + (22 - directCount * 2) + ')');
    console.log('  = L' + payoutLevel);
    
    const commissionRate = LEVEL_RATES[payoutLevel];
    console.log('');
    console.log('Commission Rate at L' + payoutLevel + ': ' + (commissionRate * 100).toFixed(2) + '%');
    
    // Get directs
    const directs = await User.find({ referredBy: luqman._id }).select('name wallet');
    console.log('');
    console.log('Direct Referrals Details:');
    
    let totalCommission = 0;
    let activeDirects = 0;
    
    directs.forEach((d, idx) => {
      const directCapital = d.wallet && d.wallet.capital ? d.wallet.capital : 0;
      const directComm = (directCapital * commissionRate);
      
      if (directCapital > 0) {
        activeDirects++;
        totalCommission += directComm;
        console.log('\n  Direct ' + (idx + 1) + ': ' + d.name);
        console.log('    Capital Invested: $' + directCapital);
        console.log('    Daily Commission = ($' + directCapital + ' × ' + (commissionRate * 100).toFixed(2) + '%) / 100');
        console.log('                     = $' + directComm.toFixed(4));
      } else {
        console.log('\n  Direct ' + (idx + 1) + ': ' + d.name);
        console.log('    Capital Invested: $0 [INACTIVE - NO INVESTMENT]');
        console.log('    Daily Commission: $0');
      }
    });
    
    console.log('\n');
    console.log('Active Directs Contributing: ' + activeDirects + ' of ' + directs.length);
    console.log('');
    console.log('Total Commission Calculation:');
    let commCalc = '';
    let first = true;
    directs.forEach((d) => {
      const directCapital = d.wallet && d.wallet.capital ? d.wallet.capital : 0;
      if (directCapital > 0) {
        if (!first) commCalc += ' + ';
        commCalc += '$' + (directCapital * commissionRate).toFixed(2);
        first = false;
      }
    });
    console.log('  = ' + (commCalc || '$0'));
    console.log('  = $' + totalCommission.toFixed(2));
    console.log('');
    console.log('COMMISSION TOMORROW: $' + totalCommission.toFixed(2) + ' (credited to wallet.commission)');
    
    // ========== PART 3: TOTAL ==========
    console.log('\n\nPART 3: TOTAL DAILY INCOME TOMORROW');
    console.log('-------------------------------------------\n');
    
    const totalDaily = ownROI + totalCommission;
    
    console.log('Own Investment ROI:       $' + ownROI.toFixed(2));
    console.log('Network Commission:       $' + totalCommission.toFixed(2));
    console.log('                          -----------');
    console.log('TOTAL TOMORROW:           $' + totalDaily.toFixed(2));
    
    // ========== WALLET UPDATE ==========
    console.log('\n\nWALLET STATUS UPDATE');
    console.log('-------------------------------------------\n');
    
    const currentProfit = luqman.wallet && luqman.wallet.profit ? luqman.wallet.profit : 0;
    const currentCommission = luqman.wallet && luqman.wallet.commission ? luqman.wallet.commission : 0;
    
    console.log('Current (before cron):');
    console.log('  wallet.profit:     $' + currentProfit.toFixed(2));
    console.log('  wallet.commission: $' + currentCommission.toFixed(2));
    
    console.log('');
    console.log('After Oct 14 Cron Run:');
    const newProfit = currentProfit + ownROI;
    const newCommission = currentCommission + totalCommission;
    console.log('  wallet.profit:     $' + currentProfit.toFixed(2) + ' + $' + ownROI.toFixed(2) + ' = $' + newProfit.toFixed(2));
    console.log('  wallet.commission: $' + currentCommission.toFixed(2) + ' + $' + totalCommission.toFixed(2) + ' = $' + newCommission.toFixed(2));
    
    // ========== PROJECTIONS ==========
    console.log('\n\nEARNINGS PROJECTIONS');
    console.log('-------------------------------------------\n');
    
    console.log('Daily:     $' + totalDaily.toFixed(2));
    console.log('7 days:    $' + (totalDaily * 7).toFixed(2));
    console.log('14 days:   $' + (totalDaily * 14).toFixed(2));
    console.log('30 days:   $' + (totalDaily * 30).toFixed(2));
    console.log('90 days:   $' + (totalDaily * 90).toFixed(2));
    console.log('365 days:  $' + (totalDaily * 365).toFixed(2));
    
    console.log('\n\n========================================');
    console.log('SUMMARY: Muhammad Luqman earns $' + totalDaily.toFixed(2) + ' daily');
    console.log('========================================\n');
    
    mongoose.connection.close();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
})();
