const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('./src/models/User');
    const InvestorInvestment = require('./src/models/InvestorInvestment');
    const constants = require('./config/constants');
    
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║     SIMULATE EXACTLY WHAT HAPPENS AT 4 PM FOR MUHAMMADHUSSAIN     ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    
    const now = new Date();
    
    // Find Muhammad Hussain
    const hussain = await User.findOne({ name: { $regex: 'Muhammad.*Hussein|Muhammad.*Hussain', $options: 'i' } })
      .select('_id name email wallet ancestorPath')
      .populate('ancestorPath', '_id name email wallet ancestorPath');
    
    if (!hussain) {
      console.log('Not found');
      process.exit(1);
    }
    
    console.log(`USER: ${hussain.name}\n`);
    
    // Helper function from profitService
    const getDailyRateForInvestment = (amount, investmentStartDate) => {
      const startDate = new Date(investmentStartDate);
      const monthsElapsed = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
      
      if (monthsElapsed < 6) {
        if (amount >= 10000) return 0.0125;
        return 0.01;
      }
      if (monthsElapsed < 12) {
        if (amount >= 10000) return 0.01;
        return 0.0075;
      }
      return 0.09 / 12 / 30;
    };
    
    // PHASE 1: Calculate Hussein's own ROI
    console.log('PHASE 1: HUSSAIN\'S OWN ROI\n');
    
    let hussainROI = 0;
    
    // His wallet.capital
    const hussainWallet = hussain.wallet?.capital || 0;
    if (hussainWallet > 0) {
      let dailyRate;
      if (hussainWallet >= 10000) {
        dailyRate = 0.0125;
      } else {
        dailyRate = 0.01;
      }
      const roi = hussainWallet * dailyRate;
      hussainROI += roi;
      console.log(`wallet.capital: $${hussainWallet} × ${(dailyRate*100).toFixed(2)}% = $${roi.toFixed(4)}`);
    }
    
    // His InvestorInvestment
    const hussainApprovedInvs = await InvestorInvestment.find({
      userId: hussain._id,
      status: 'active',
      approvedBy: { $ne: null }
    }).select('amount startDate plan').lean();
    
    for (const inv of hussainApprovedInvs) {
      const dailyRate = getDailyRateForInvestment(inv.amount, inv.startDate);
      const roi = inv.amount * dailyRate;
      hussainROI += roi;
      console.log(`InvestorInvestment (${inv.plan}): $${inv.amount} × ${(dailyRate*100).toFixed(4)}% = $${roi.toFixed(4)}`);
    }
    
    console.log(`Total Hussain's ROI: $${hussainROI.toFixed(4)}\n`);
    
    // PHASE 2: Calculate commissions from downline
    console.log('PHASE 2: COMMISSIONS FROM DOWNLINE\n');
    
    // Get downline
    const downline = await User.find({
      ancestorPath: hussain._id
    }).select('_id name ancestorPath wallet')
      .populate('ancestorPath', '_id');
    
    const LEVEL_RATES = constants.LEVEL_RATES;
    let totalCommissions = 0;
    let processedCount = 0;
    
    for (const member of downline) {
      // Find what level this member is
      if (!member.ancestorPath) continue;
      
      const levelIdx = member.ancestorPath.findIndex(id => id._id.toString() === hussain._id.toString());
      if (levelIdx === -1) continue;
      
      const level = levelIdx + 1;
      if (level > 21) continue;
      
      // Calculate this member's ROI
      let memberROI = 0;
      
      const memberWallet = member.wallet?.capital || 0;
      if (memberWallet > 0) {
        let dailyRate;
        if (memberWallet >= 10000) {
          dailyRate = 0.0125;
        } else {
          dailyRate = 0.01;
        }
        memberROI += memberWallet * dailyRate;
      }
      
      const memberApprovedInvs = await InvestorInvestment.find({
        userId: member._id,
        status: 'active',
        approvedBy: { $ne: null }
      }).select('amount startDate').lean();
      
      for (const inv of memberApprovedInvs) {
        const dailyRate = getDailyRateForInvestment(inv.amount, inv.startDate);
        memberROI += inv.amount * dailyRate;
      }
      
      if (memberROI <= 0) continue;
      
      // Calculate Hussain's commission
      const rate = LEVEL_RATES[level];
      if (!rate || rate <= 0) continue;
      
      const commission = (memberROI * rate) / 100;
      totalCommissions += commission;
      processedCount++;
      
      if (processedCount <= 15) {
        console.log(`L${level}: ${member.name} → ROI $${memberROI.toFixed(4)} × ${rate}% = $${commission.toFixed(4)}`);
      }
    }
    
    if (processedCount > 15) {
      console.log(`... and ${processedCount - 15} more members`);
    }
    
    console.log(`\nTotal from downline: $${totalCommissions.toFixed(4)}\n`);
    
    // FINAL
    console.log('═══════════════════════════════════════════════════════════════════════\n');
    console.log(`HUSSAIN'S EARNINGS AT 4 PM:\n`);
    console.log(`Own ROI:           $${hussainROI.toFixed(2)}`);
    console.log(`Commissions:       $${totalCommissions.toFixed(2)}`);
    console.log(`─────────────────────────────────`);
    console.log(`TOTAL:             $${(hussainROI + totalCommissions).toFixed(2)}`);
    
    process.exit(0);
  } catch(e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
